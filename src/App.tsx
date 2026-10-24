import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  BarChart3,
  BookOpen,
  Briefcase,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileText,
  GraduationCap,
  History,
  LayoutDashboard,
  Menu,
  Settings,
  Shield,
  Sliders,
  X,
} from 'lucide-react';
import {
  ActivityLog,
  AppPage,
  AssessmentAttempt,
  JobRole,
  LearningResource,
  LearningRoadmapDoc,
  LoginPortalRole,
  ProgressSnapshot,
  ResourceChunk,
  ResumeRecord,
  RoleRequirement,
  SkillDefinition,
  StudentSkillEntry,
  UserAccount,
} from './types';
import {
  SEED_JOB_ROLES,
  SEED_LEARNING_RESOURCES,
  SEED_RESOURCE_CHUNKS,
  SEED_ROLE_REQUIREMENTS,
  SEED_SKILLS,
} from './data/seedCatalog';
import { evaluateSkillGapForRole } from './services/skillEngine';
import {
  adminSaveJobRole,
  adminSaveLearningResourceAndChunks,
  adminSaveSkillAndRequirement,
  adminUpdatePermittedStudentInfo,
  auth,
  checkIsUserAdmin,
  ensureUserAccount,
  formatFriendlyError,
  grantAdminAccessToUid,
  logSystemActivity,
  recordProgressSnapshot,
  saveAssessmentAttempt,
  saveStudentRoadmap,
  seedCatalogToFirestore,
  signInWithGoogle,
  signOutUser,
  subscribeActivityLogsForAdmin,
  subscribeAllProgressForAdmin,
  subscribeAllUsersForAdmin,
  subscribeCatalogChunks,
  subscribeCatalogJobRoles,
  subscribeCatalogRequirements,
  subscribeCatalogResources,
  subscribeCatalogSkills,
  subscribeCurrentUserAccount,
  subscribeStudentAssessments,
  subscribeStudentProgress,
  subscribeStudentResumes,
  subscribeStudentRoadmaps,
  updateRoadmapTaskCompletion,
  updateStudentProfile,
  uploadPdfToStorageAndSaveResume,
} from './lib/firebase';
import { AuthPage, LandingPage, OnboardingPage } from './pages/PublicAuthPages';
import {
  ProfileSettingsPage,
  ProgressHistoryPage,
  StudentDashboardPage,
} from './pages/StudentOverviewPages';
import { CareerSelectionPage, ResumeAnalysisPage } from './pages/ResumeAndCareerPages';
import { LearningRoadmapPage, SkillGapAnalysisPage } from './pages/GapAndRoadmapPages';
import { AssessmentPage } from './pages/AssessmentPage';
import {
  AdminDashboardPage,
  AdminJobRolesPage,
  AdminResourcesPage,
} from './pages/AdminPages';

const PORTAL_ROLE_STORAGE_KEY = 'skillgaprag_portal_role';

const PAGE_TITLES: Record<AppPage, string> = {
  [AppPage.LANDING]: 'Overview',
  [AppPage.LOGIN]: 'Sign In',
  [AppPage.REGISTER]: 'Student Registration',
  [AppPage.ONBOARDING]: 'Student Onboarding',
  [AppPage.STUDENT_DASHBOARD]: 'Student Dashboard',
  [AppPage.RESUME_ANALYSIS]: 'Resume Analysis',
  [AppPage.CAREER_SELECTION]: 'Career Role Selection',
  [AppPage.SKILL_GAP_ANALYSIS]: 'Skill-Gap Matrix',
  [AppPage.LEARNING_ROADMAP]: 'RAG Learning Roadmap',
  [AppPage.ASSESSMENT]: 'Practical Assessment',
  [AppPage.PROGRESS_HISTORY]: 'Progress & Reassessment History',
  [AppPage.PROFILE_SETTINGS]: 'Profile Settings',
  [AppPage.ADMIN_DASHBOARD]: 'Administrator Analytics',
  [AppPage.ADMIN_ROLES]: 'Job-Role Rubric Management',
  [AppPage.ADMIN_RESOURCES]: 'RAG Knowledge Base Management',
};

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [portalRole, setPortalRole] = useState<LoginPortalRole>(() => {
    try {
      return sessionStorage.getItem(PORTAL_ROLE_STORAGE_KEY) === 'admin' ? 'admin' : 'student';
    } catch {
      return 'student';
    }
  });

  const [currentPage, setCurrentPage] = useState<AppPage>(AppPage.LANDING);
  const [preselectedSkillId, setPreselectedSkillId] = useState<string | undefined>(undefined);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [globalBanner, setGlobalBanner] = useState<string | null>(null);

  // Student & Catalog State
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [roles, setRoles] = useState<JobRole[]>(SEED_JOB_ROLES);
  const [rolesFromFirestore, setRolesFromFirestore] = useState(false);
  const [skillsCatalog, setSkillsCatalog] = useState<SkillDefinition[]>(SEED_SKILLS);
  const [requirements, setRequirements] = useState<RoleRequirement[]>(SEED_ROLE_REQUIREMENTS);
  const [resources, setResources] = useState<LearningResource[]>(SEED_LEARNING_RESOURCES);
  const [resourcesFromFirestore, setResourcesFromFirestore] = useState(false);
  const [chunks, setChunks] = useState<ResourceChunk[]>(SEED_RESOURCE_CHUNKS);

  // Student Private Collections
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [assessments, setAssessments] = useState<AssessmentAttempt[]>([]);
  const [roadmaps, setRoadmaps] = useState<LearningRoadmapDoc[]>([]);
  const [progressHistory, setProgressHistory] = useState<ProgressSnapshot[]>([]);

  // Admin Collections
  const [allUsers, setAllUsers] = useState<UserAccount[]>([]);
  const [allProgress, setAllProgress] = useState<ProgressSnapshot[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  // 1. Auth Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const ensured = await ensureUserAccount(user);
          setAccount(ensured);
          const adminFlag = await checkIsUserAdmin(user);
          setIsAdmin(adminFlag);

          let savedPortal: LoginPortalRole = 'student';
          try {
            savedPortal =
              sessionStorage.getItem(PORTAL_ROLE_STORAGE_KEY) === 'admin' ? 'admin' : 'student';
          } catch {
            savedPortal = 'student';
          }

          setCurrentPage((prev) => {
            if (
              prev === AppPage.LANDING ||
              prev === AppPage.LOGIN ||
              prev === AppPage.REGISTER
            ) {
              if (savedPortal === 'admin' && adminFlag) {
                return AppPage.ADMIN_DASHBOARD;
              }
              return ensured.onboardingCompleted
                ? AppPage.STUDENT_DASHBOARD
                : AppPage.ONBOARDING;
            }
            return prev;
          });
        } catch (err) {
          setGlobalBanner(formatFriendlyError(err, 'Failed to initialize profile.'));
        }
      } else {
        setAccount(null);
        setIsAdmin(false);
        setResumes([]);
        setAssessments([]);
        setRoadmaps([]);
        setProgressHistory([]);
        setAllUsers([]);
        setAllProgress([]);
        setActivityLogs([]);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // 2. Authenticated Student & Catalog Listeners
  useEffect(() => {
    if (!authReady || !firebaseUser) return;

    const uid = firebaseUser.uid;
    const unsubs = [
      subscribeCurrentUserAccount(uid, (acc) => {
        if (acc) setAccount(acc);
      }),
      subscribeCatalogJobRoles(isAdmin, (r, fromFs) => {
        setRoles(r);
        setRolesFromFirestore(fromFs);
      }),
      subscribeCatalogSkills(isAdmin, (s) => setSkillsCatalog(s)),
      subscribeCatalogRequirements(isAdmin, (reqs) => setRequirements(reqs)),
      subscribeCatalogResources(isAdmin, (res, fromFs) => {
        setResources(res);
        setResourcesFromFirestore(fromFs);
      }),
      subscribeCatalogChunks(isAdmin, (ch) => setChunks(ch)),
      subscribeStudentResumes(uid, (list) => setResumes(list)),
      subscribeStudentAssessments(uid, (list) => setAssessments(list)),
      subscribeStudentRoadmaps(uid, (list) => setRoadmaps(list)),
      subscribeStudentProgress(uid, (list) => setProgressHistory(list)),
    ];

    return () => unsubs.forEach((fn) => fn());
  }, [authReady, firebaseUser, isAdmin]);

  // 3. Admin-Only Listeners
  useEffect(() => {
    if (!authReady || !firebaseUser || !isAdmin) return;
    const unsubs = [
      subscribeAllUsersForAdmin((list) => setAllUsers(list)),
      subscribeAllProgressForAdmin((list) => setAllProgress(list)),
      subscribeActivityLogsForAdmin((list) => setActivityLogs(list)),
    ];
    return () => unsubs.forEach((fn) => fn());
  }, [authReady, firebaseUser, isAdmin]);

  const activeStudentRoles = useMemo(() => roles.filter((r) => r.active), [roles]);

  const selectedRole: JobRole = useMemo(() => {
    const found =
      roles.find((r) => r.id === account?.selectedRoleId) ||
      activeStudentRoles[0] ||
      SEED_JOB_ROLES[0];
    return found;
  }, [roles, activeStudentRoles, account?.selectedRoleId]);

  const currentEvaluation = useMemo(() => {
    return evaluateSkillGapForRole(
      selectedRole,
      requirements,
      account?.confirmedSkills || []
    );
  }, [selectedRole, requirements, account?.confirmedSkills]);

  const activeRoadmap = useMemo(() => {
    return roadmaps.find((r) => r.roleId === selectedRole.id) || null;
  }, [roadmaps, selectedRole.id]);

  const navigateTo = (page: AppPage, skillId?: string) => {
    if (skillId) {
      setPreselectedSkillId(skillId);
    }
    setCurrentPage(page);
    setMobileSidebarOpen(false);
    setAuthError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openPortalAuth = (mode: 'login' | 'register', targetPortalRole: LoginPortalRole) => {
    setPortalRole(targetPortalRole);
    try {
      sessionStorage.setItem(PORTAL_ROLE_STORAGE_KEY, targetPortalRole);
    } catch {
      // ignore storage errors
    }
    setAuthError(null);
    setCurrentPage(mode === 'register' ? AppPage.REGISTER : AppPage.LOGIN);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoogleAuth = async (
    chosenPortalRole: LoginPortalRole,
    prefill?: {
      institution: string;
      degreeProgram: string;
      graduationYear: number;
    }
  ) => {
    setAuthBusy(true);
    setAuthError(null);
    setGlobalBanner(null);
    try {
      try {
        sessionStorage.setItem(PORTAL_ROLE_STORAGE_KEY, chosenPortalRole);
      } catch {
        // ignore
      }
      const user = await signInWithGoogle();
      const acc = await ensureUserAccount(user);
      if (prefill && (!acc.institution || !acc.onboardingCompleted)) {
        await updateStudentProfile(user.uid, {
          displayName: acc.displayName,
          institution: prefill.institution || acc.institution,
          degreeProgram: prefill.degreeProgram || acc.degreeProgram,
          graduationYear: prefill.graduationYear || acc.graduationYear,
          weeklyStudyHours: acc.weeklyStudyHours,
          preferredDurationWeeks: acc.preferredDurationWeeks,
          selectedRoleId: acc.selectedRoleId,
          onboardingCompleted: acc.onboardingCompleted,
          confirmedSkills: acc.confirmedSkills,
        });
      }
      const adminFlag = await checkIsUserAdmin(user);
      setIsAdmin(adminFlag);

      if (chosenPortalRole === 'admin') {
        if (adminFlag) {
          setCurrentPage(AppPage.ADMIN_DASHBOARD);
        } else {
          setGlobalBanner(
            `Signed in as Student. Your account (${user.email || user.uid}) does not currently have Administrator privileges in /admins. An existing administrator can grant access to UID "${user.uid}" from the Admin Console.`
          );
          setCurrentPage(acc.onboardingCompleted ? AppPage.STUDENT_DASHBOARD : AppPage.ONBOARDING);
        }
      } else {
        setCurrentPage(acc.onboardingCompleted ? AppPage.STUDENT_DASHBOARD : AppPage.ONBOARDING);
      }
    } catch (err) {
      setAuthError(formatFriendlyError(err, 'Google authentication failed.'));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleRecordSnapshot = async (
    reason: string,
    overrideEval = currentEvaluation
  ) => {
    if (!firebaseUser) return;
    setActionBusy(true);
    try {
      await recordProgressSnapshot(firebaseUser.uid, {
        roleId: overrideEval.roleId,
        roleTitle: overrideEval.roleTitle,
        skillMatchScore: overrideEval.skillMatchScore,
        earnedWeightedPoints: overrideEval.earnedWeightedPoints,
        totalWeightedPoints: overrideEval.totalWeightedPoints,
        meetsCount: overrideEval.meetsCount,
        needsImprovementCount: overrideEval.needsImprovementCount,
        missingCount: overrideEval.missingCount,
        requiresAssessmentCount: overrideEval.requiresAssessmentCount,
        missingSkillNames: overrideEval.missingSkillNames,
        skillBreakdown: overrideEval.items.map((i) => ({
          skillId: i.skillId,
          skillName: i.skillName,
          requiredProficiency: i.requiredProficiency,
          currentProficiency: i.currentProficiency,
          verifiedByAssessment: i.verifiedByAssessment,
          status: i.status,
        })),
        triggerReason: reason,
        recordedAtIso: new Date().toISOString(),
      });
    } finally {
      setActionBusy(false);
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-panel rounded-2xl px-6 py-4 text-sm text-slate-700 font-medium">
          Initializing SkillGapRAG Workspace...
        </div>
      </div>
    );
  }

  // Unauthenticated Public / Auth Views
  if (!firebaseUser || !account) {
    if (currentPage === AppPage.LOGIN) {
      return (
        <AuthPage
          mode="login"
          initialPortalRole={portalRole}
          authBusy={authBusy}
          authError={authError}
          onGoogleAuth={handleGoogleAuth}
          onNavigate={navigateTo}
        />
      );
    }
    if (currentPage === AppPage.REGISTER) {
      return (
        <AuthPage
          mode="register"
          initialPortalRole={portalRole}
          authBusy={authBusy}
          authError={authError}
          onGoogleAuth={handleGoogleAuth}
          onNavigate={navigateTo}
        />
      );
    }
    return (
      <LandingPage
        roles={activeStudentRoles}
        requirements={requirements}
        onNavigate={navigateTo}
        onOpenPortalAuth={openPortalAuth}
      />
    );
  }

  // Student Onboarding Flow
  if (currentPage === AppPage.ONBOARDING) {
    return (
      <div className="min-h-screen">
        <header className="flex items-center justify-between gap-8 px-6 lg:px-12 py-4 glass-topbar sticky top-0 z-20">
          <span className="text-lg font-bold tracking-tight text-slate-900">SkillGapRAG</span>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <button
                type="button"
                onClick={() => navigateTo(AppPage.ADMIN_DASHBOARD)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg glass-btn-secondary whitespace-nowrap"
              >
                Open Admin Console
              </button>
            )}
            <button
              type="button"
              onClick={() => navigateTo(AppPage.STUDENT_DASHBOARD)}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap"
            >
              Skip to Dashboard →
            </button>
          </div>
        </header>
        <OnboardingPage
          account={account}
          roles={activeStudentRoles}
          skillsCatalog={skillsCatalog}
          saving={actionBusy}
          onCompleteOnboarding={async (updated) => {
            setActionBusy(true);
            try {
              await updateStudentProfile(firebaseUser.uid, {
                ...updated,
                onboardingCompleted: true,
              });
              const targetRole =
                roles.find((r) => r.id === updated.selectedRoleId) || selectedRole;
              const evalSnap = evaluateSkillGapForRole(
                targetRole,
                requirements,
                updated.confirmedSkills
              );
              await handleRecordSnapshot('Completed student profile onboarding', evalSnap);
              navigateTo(AppPage.RESUME_ANALYSIS);
            } finally {
              setActionBusy(false);
            }
          }}
        />
      </div>
    );
  }

  // Sidebar Navigation Definition
  const studentNavItems: { page: AppPage; label: string; icon: React.ReactNode }[] = [
    {
      page: AppPage.STUDENT_DASHBOARD,
      label: 'Dashboard Overview',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      page: AppPage.RESUME_ANALYSIS,
      label: '02 · Resume Analysis',
      icon: <FileText className="w-4 h-4" />,
    },
    {
      page: AppPage.CAREER_SELECTION,
      label: '03 · Career Selection',
      icon: <Briefcase className="w-4 h-4" />,
    },
    {
      page: AppPage.SKILL_GAP_ANALYSIS,
      label: '04 · Skill-Gap Matrix',
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      page: AppPage.LEARNING_ROADMAP,
      label: '05 · Learning Roadmap',
      icon: <BookOpen className="w-4 h-4" />,
    },
    {
      page: AppPage.ASSESSMENT,
      label: '06 · Assessments',
      icon: <ClipboardCheck className="w-4 h-4" />,
    },
    {
      page: AppPage.PROGRESS_HISTORY,
      label: 'Progress History',
      icon: <History className="w-4 h-4" />,
    },
    {
      page: AppPage.PROFILE_SETTINGS,
      label: '01 · Profile Settings',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  const adminNavItems: { page: AppPage; label: string; icon: React.ReactNode }[] = [
    {
      page: AppPage.ADMIN_DASHBOARD,
      label: '01 · Admin Analytics',
      icon: <Shield className="w-4 h-4" />,
    },
    {
      page: AppPage.ADMIN_ROLES,
      label: '02 · Job-Role Rubric',
      icon: <Sliders className="w-4 h-4" />,
    },
    {
      page: AppPage.ADMIN_RESOURCES,
      label: '03 · RAG Knowledge Base',
      icon: <Database className="w-4 h-4" />,
    },
  ];

  const isViewingAdminSection =
    currentPage === AppPage.ADMIN_DASHBOARD ||
    currentPage === AppPage.ADMIN_ROLES ||
    currentPage === AppPage.ADMIN_RESOURCES;

  const studentWorkflowSteps = [
    {
      step: '01',
      label: 'Profile',
      page: AppPage.PROFILE_SETTINGS,
      done: Boolean(account.onboardingCompleted),
    },
    {
      step: '02',
      label: 'Resume Skills',
      page: AppPage.RESUME_ANALYSIS,
      done: resumes.length > 0 || account.confirmedSkills.length > 0,
    },
    {
      step: '03',
      label: 'Target Role',
      page: AppPage.CAREER_SELECTION,
      done: Boolean(account.selectedRoleId),
    },
    {
      step: '04',
      label: 'Gap Matrix',
      page: AppPage.SKILL_GAP_ANALYSIS,
      done: progressHistory.length > 0,
    },
    {
      step: '05',
      label: 'RAG Roadmap',
      page: AppPage.LEARNING_ROADMAP,
      done: Boolean(activeRoadmap && activeRoadmap.tasks.length > 0),
    },
    {
      step: '06',
      label: 'Verify & Track',
      page: AppPage.ASSESSMENT,
      done: assessments.length > 0,
    },
  ];

  return (
    <div className="min-h-screen text-slate-900 flex">
      {/* Desktop Frosted Glass Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 glass-sidebar sticky top-0 h-screen">
        <div className="px-6 py-4 border-b border-slate-200/70 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigateTo(AppPage.STUDENT_DASHBOARD)}
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap"
          >
            SkillGapRAG
          </button>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
            {isAdmin ? 'Admin+User' : 'Student'}
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <div className="space-y-1">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Student Career Flow
            </p>
            {studentNavItems.map((item) => {
              const active = currentPage === item.page;
              return (
                <button
                  key={item.page}
                  type="button"
                  onClick={() => navigateTo(item.page)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
                    active
                      ? 'glass-btn-obsidian'
                      : 'text-slate-600 hover:bg-white/75 hover:text-slate-900'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {isAdmin && (
            <div className="space-y-1 pt-3 border-t border-slate-200/70">
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Administrator Console
              </p>
              {adminNavItems.map((item) => {
                const active = currentPage === item.page;
                return (
                  <button
                    key={item.page}
                    type="button"
                    onClick={() => navigateTo(item.page)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
                      active
                        ? 'glass-btn-primary'
                        : 'text-slate-600 hover:bg-white/75 hover:text-slate-900'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-slate-200/70 space-y-2 glass-well border-x-0 border-b-0">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-900 truncate">{account.displayName}</p>
            <p className="text-[11px] text-slate-500 truncate">
              {isAdmin ? 'Administrator & Student' : 'Student Account'} · {selectedRole.title}
            </p>
          </div>
          <div className="flex items-center justify-between text-xs pt-1">
            <button
              type="button"
              onClick={() => navigateTo(AppPage.ONBOARDING)}
              className="text-slate-600 hover:text-slate-900 font-medium"
            >
              Onboarding
            </button>
            <button
              type="button"
              onClick={async () => {
                await signOutUser();
                setCurrentPage(AppPage.LANDING);
              }}
              className="text-red-700 hover:underline font-semibold"
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Glass Sidebar Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/35 backdrop-blur-xs"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative w-72 max-w-full glass-sidebar h-full flex flex-col z-10">
            <div className="px-5 py-4 border-b border-slate-200/70 flex items-center justify-between">
              <span className="text-lg font-bold text-slate-900">SkillGapRAG</span>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {studentNavItems.map((item) => (
                <button
                  key={item.page}
                  type="button"
                  onClick={() => navigateTo(item.page)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-xl ${
                    currentPage === item.page
                      ? 'glass-btn-obsidian'
                      : 'text-slate-700 hover:bg-white/80'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
              {isAdmin && (
                <div className="pt-3 mt-3 border-t border-slate-200/70 space-y-1">
                  {adminNavItems.map((item) => (
                    <button
                      key={item.page}
                      type="button"
                      onClick={() => navigateTo(item.page)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-xl ${
                        currentPage === item.page
                          ? 'glass-btn-primary'
                          : 'text-slate-700 hover:bg-white/80'
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* SaaS Top Bar Contract: Breadcrumb Left + 1-2 Actions Right */}
        <header className="flex items-center justify-between gap-6 px-6 lg:px-10 py-3.5 glass-topbar sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 rounded-md"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-sm text-slate-500 truncate">
              <span className="font-medium text-slate-700">
                {isViewingAdminSection ? 'Admin Console' : 'Student Workspace'}
              </span>
              <span className="mx-2" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-slate-900">
                {PAGE_TITLES[currentPage]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {isAdmin && (
              <button
                type="button"
                onClick={() =>
                  navigateTo(
                    isViewingAdminSection ? AppPage.STUDENT_DASHBOARD : AppPage.ADMIN_DASHBOARD
                  )
                }
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl glass-btn-secondary inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                {isViewingAdminSection ? (
                  <>
                    <GraduationCap className="w-3.5 h-3.5 text-blue-700" />
                    <span>Switch to Student View</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-3.5 h-3.5 text-slate-800" />
                    <span>Admin Console</span>
                  </>
                )}
              </button>
            )}

            {!isViewingAdminSection && (
              <button
                type="button"
                onClick={() => navigateTo(AppPage.ASSESSMENT)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl glass-btn-obsidian whitespace-nowrap shrink-0"
              >
                Verify Skill ({currentEvaluation.skillMatchScore}%)
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 max-w-6xl w-full mx-auto px-6 lg:px-10 py-8">
          {globalBanner && (
            <div className="mb-6 p-3.5 rounded-xl glass-alert-warn text-xs flex items-center justify-between gap-4">
              <span>{globalBanner}</span>
              <button
                type="button"
                onClick={() => setGlobalBanner(null)}
                className="font-semibold underline shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Guided 6-Step Student Workflow Pipeline */}
          {!isViewingAdminSection && (
            <nav
              aria-label="Student workflow steps"
              className="mb-8 glass-panel rounded-2xl p-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5"
            >
              {studentWorkflowSteps.map((s) => {
                const isCurrent =
                  currentPage === s.page ||
                  (s.page === AppPage.ASSESSMENT && currentPage === AppPage.PROGRESS_HISTORY);
                return (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => navigateTo(s.page)}
                    className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-left transition-all ${
                      isCurrent
                        ? 'glass-btn-obsidian'
                        : 'hover:bg-white/80 text-slate-700'
                    }`}
                  >
                    <div className="min-w-0">
                      <span
                        className={`block text-[10px] font-mono tabular-nums ${
                          isCurrent ? 'text-slate-300' : 'text-slate-400'
                        }`}
                      >
                        STEP {s.step}
                      </span>
                      <span className="block text-xs font-semibold truncate">{s.label}</span>
                    </div>
                    {s.done && (
                      <CheckCircle2
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isCurrent ? 'text-emerald-400' : 'text-emerald-600'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          )}

          {/* Guided 3-Module Administrator Governance Pipeline */}
          {isViewingAdminSection && isAdmin && (
            <nav
              aria-label="Administrator workflow modules"
              className="mb-8 glass-panel rounded-2xl p-2 grid grid-cols-1 sm:grid-cols-3 gap-1.5"
            >
              {[
                {
                  step: '01',
                  label: 'Cohort & System Analytics',
                  page: AppPage.ADMIN_DASHBOARD,
                },
                {
                  step: '02',
                  label: 'Job-Role & Weight Rubrics',
                  page: AppPage.ADMIN_ROLES,
                },
                {
                  step: '03',
                  label: 'RAG Knowledge Base & Vectors',
                  page: AppPage.ADMIN_RESOURCES,
                },
              ].map((m) => {
                const isCurrent = currentPage === m.page;
                return (
                  <button
                    key={m.step}
                    type="button"
                    onClick={() => navigateTo(m.page)}
                    className={`flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl text-left transition-all ${
                      isCurrent
                        ? 'glass-btn-primary'
                        : 'hover:bg-white/80 text-slate-700'
                    }`}
                  >
                    <div className="min-w-0">
                      <span
                        className={`block text-[10px] font-mono tabular-nums ${
                          isCurrent ? 'text-blue-100' : 'text-slate-400'
                        }`}
                      >
                        ADMIN MODULE {m.step}
                      </span>
                      <span className="block text-xs font-semibold truncate">{m.label}</span>
                    </div>
                  </button>
                );
              })}
            </nav>
          )}

          {/* Active Page Views */}
          {currentPage === AppPage.STUDENT_DASHBOARD && (
            <StudentDashboardPage
              account={account}
              selectedRole={selectedRole}
              evaluation={currentEvaluation}
              latestResume={resumes[0] || null}
              activeRoadmap={activeRoadmap}
              assessments={assessments}
              progressHistory={progressHistory}
              onNavigate={navigateTo}
            />
          )}

          {currentPage === AppPage.RESUME_ANALYSIS && (
            <ResumeAnalysisPage
              account={account}
              latestResume={resumes[0] || null}
              skillsCatalog={skillsCatalog}
              onSaveExtractedResumeAndConfirmSkills={async (params) => {
                await uploadPdfToStorageAndSaveResume(firebaseUser.uid, params.file, {
                  fileName: params.fileName,
                  mimeType: params.mimeType,
                  fileSizeBytes: params.fileSizeBytes,
                  extractedText: params.extractedText,
                  extractedSkills: params.extractedSkills,
                  projects: params.projects,
                  certificates: params.certificates,
                  experienceSummary: params.experienceSummary,
                });
                await updateStudentProfile(firebaseUser.uid, {
                  displayName: account.displayName,
                  institution: account.institution,
                  degreeProgram: account.degreeProgram,
                  graduationYear: account.graduationYear,
                  weeklyStudyHours: account.weeklyStudyHours,
                  preferredDurationWeeks: account.preferredDurationWeeks,
                  selectedRoleId: account.selectedRoleId,
                  onboardingCompleted: true,
                  confirmedSkills: params.confirmedSkills,
                });
                const updatedEval = evaluateSkillGapForRole(
                  selectedRole,
                  requirements,
                  params.confirmedSkills
                );
                await handleRecordSnapshot(
                  `Confirmed ${params.confirmedSkills.length} skills from resume`,
                  updatedEval
                );
                await logSystemActivity(
                  firebaseUser.uid,
                  account.displayName,
                  'student',
                  'resume_confirmed',
                  `Confirmed ${params.confirmedSkills.length} extracted technical skills`
                );
              }}
              onNavigate={navigateTo}
            />
          )}

          {currentPage === AppPage.CAREER_SELECTION && (
            <CareerSelectionPage
              account={account}
              roles={activeStudentRoles}
              requirements={requirements}
              savingRole={actionBusy}
              onSelectRole={async (roleId) => {
                setActionBusy(true);
                try {
                  await updateStudentProfile(firebaseUser.uid, {
                    displayName: account.displayName,
                    institution: account.institution,
                    degreeProgram: account.degreeProgram,
                    graduationYear: account.graduationYear,
                    weeklyStudyHours: account.weeklyStudyHours,
                    preferredDurationWeeks: account.preferredDurationWeeks,
                    selectedRoleId: roleId,
                    onboardingCompleted: account.onboardingCompleted,
                    confirmedSkills: account.confirmedSkills,
                  });
                  const roleObj = roles.find((r) => r.id === roleId) || selectedRole;
                  const nextEval = evaluateSkillGapForRole(
                    roleObj,
                    requirements,
                    account.confirmedSkills
                  );
                  await handleRecordSnapshot(
                    `Selected target career role: ${roleObj.title}`,
                    nextEval
                  );
                  await logSystemActivity(
                    firebaseUser.uid,
                    account.displayName,
                    'student',
                    'role_selected',
                    `Selected target career role: ${roleObj.title}`
                  );
                } finally {
                  setActionBusy(false);
                }
              }}
              onNavigate={navigateTo}
            />
          )}

          {currentPage === AppPage.SKILL_GAP_ANALYSIS && (
            <SkillGapAnalysisPage
              selectedRole={selectedRole}
              evaluation={currentEvaluation}
              progressHistory={progressHistory}
              recordingSnapshot={actionBusy}
              onRecordSnapshot={handleRecordSnapshot}
              onNavigate={navigateTo}
            />
          )}

          {currentPage === AppPage.LEARNING_ROADMAP && (
            <LearningRoadmapPage
              account={account}
              selectedRole={selectedRole}
              evaluation={currentEvaluation}
              activeRoadmap={activeRoadmap}
              chunks={chunks}
              onSaveGeneratedRoadmap={async (newRoadmap) => {
                await saveStudentRoadmap(firebaseUser.uid, newRoadmap);
                await logSystemActivity(
                  firebaseUser.uid,
                  account.displayName,
                  'student',
                  'roadmap_generated',
                  `Generated RAG learning roadmap for ${newRoadmap.roleTitle} (${newRoadmap.tasks.length} tasks)`
                );
              }}
              onToggleTask={async (roadmapDoc, taskId) => {
                const updatedTasks = roadmapDoc.tasks.map((t) =>
                  t.id === taskId
                    ? {
                        ...t,
                        completed: !t.completed,
                        completedAtIso: !t.completed ? new Date().toISOString() : '',
                      }
                    : t
                );
                await updateRoadmapTaskCompletion(roadmapDoc, updatedTasks);
              }}
              onNavigate={navigateTo}
            />
          )}

          {currentPage === AppPage.ASSESSMENT && (
            <AssessmentPage
              selectedRole={selectedRole}
              evaluation={currentEvaluation}
              skillsCatalog={skillsCatalog}
              initialSkillId={preselectedSkillId}
              submitting={actionBusy}
              onCompleteAssessment={async (params) => {
                setActionBusy(true);
                const previousMatchScore = currentEvaluation.skillMatchScore;
                try {
                  const completedIso = new Date().toISOString();
                  await saveAssessmentAttempt(firebaseUser.uid, {
                    skillId: params.skillId,
                    skillName: params.skillName,
                    difficulty: params.difficulty,
                    totalQuestions: params.totalQuestions,
                    correctAnswers: params.correctAnswers,
                    scorePercent: params.scorePercent,
                    verifiedProficiency: params.verifiedProficiency,
                    questionReviews: params.questionReviews,
                    completedAtIso: completedIso,
                  });

                  const existingIdx = account.confirmedSkills.findIndex(
                    (s) => s.skillId === params.skillId
                  );
                  const nextSkills: StudentSkillEntry[] = [...account.confirmedSkills];
                  if (existingIdx >= 0) {
                    const prevEntry = nextSkills[existingIdx];
                    const bestVerifiedLevel = prevEntry.verifiedByAssessment
                      ? (Math.max(
                          prevEntry.proficiency,
                          params.verifiedProficiency
                        ) as 0 | 1 | 2 | 3 | 4)
                      : params.verifiedProficiency;
                    nextSkills[existingIdx] = {
                      ...prevEntry,
                      proficiency: bestVerifiedLevel,
                      verifiedByAssessment: true,
                      source: 'assessment',
                      evidenceNote: `Verified via ${params.difficulty} assessment (${params.scorePercent}%)`,
                      lastAssessedIso: completedIso,
                    };
                  } else {
                    nextSkills.push({
                      skillId: params.skillId,
                      skillName: params.skillName,
                      category: params.category,
                      proficiency: params.verifiedProficiency,
                      verifiedByAssessment: true,
                      source: 'assessment',
                      evidenceNote: `Verified via ${params.difficulty} assessment (${params.scorePercent}%)`,
                      lastAssessedIso: completedIso,
                    });
                  }

                  await updateStudentProfile(firebaseUser.uid, {
                    displayName: account.displayName,
                    institution: account.institution,
                    degreeProgram: account.degreeProgram,
                    graduationYear: account.graduationYear,
                    weeklyStudyHours: account.weeklyStudyHours,
                    preferredDurationWeeks: account.preferredDurationWeeks,
                    selectedRoleId: account.selectedRoleId,
                    onboardingCompleted: account.onboardingCompleted,
                    confirmedSkills: nextSkills,
                  });

                  const newEval = evaluateSkillGapForRole(
                    selectedRole,
                    requirements,
                    nextSkills
                  );
                  await handleRecordSnapshot(
                    `Verified ${params.skillName} (${params.difficulty} quiz: ${params.scorePercent}%)`,
                    newEval
                  );
                  await logSystemActivity(
                    firebaseUser.uid,
                    account.displayName,
                    'student',
                    'assessment_completed',
                    `Completed practical assessment on ${params.skillName}`
                  );

                  return {
                    previousMatchScore,
                    newMatchScore: newEval.skillMatchScore,
                  };
                } finally {
                  setActionBusy(false);
                }
              }}
              onNavigate={navigateTo}
            />
          )}

          {currentPage === AppPage.PROGRESS_HISTORY && (
            <ProgressHistoryPage
              selectedRole={selectedRole}
              evaluation={currentEvaluation}
              progressHistory={progressHistory}
              assessments={assessments}
              recordingSnapshot={actionBusy}
              onRecordSnapshot={handleRecordSnapshot}
              onNavigate={navigateTo}
            />
          )}

          {currentPage === AppPage.PROFILE_SETTINGS && (
            <ProfileSettingsPage
              account={account}
              userEmail={firebaseUser.email}
              skillsCatalog={skillsCatalog}
              saving={actionBusy}
              onSaveProfile={async (updates) => {
                setActionBusy(true);
                try {
                  await updateStudentProfile(firebaseUser.uid, {
                    ...updates,
                    selectedRoleId: account.selectedRoleId,
                    onboardingCompleted: account.onboardingCompleted,
                  });
                } finally {
                  setActionBusy(false);
                }
              }}
              onNavigate={navigateTo}
              onSignOut={async () => {
                await signOutUser();
                setCurrentPage(AppPage.LANDING);
              }}
            />
          )}

          {/* Role-Enforced Admin Views */}
          {isViewingAdminSection && !isAdmin && (
            <div className="glass-panel rounded-2xl p-8 text-center space-y-3">
              <p className="text-base font-bold text-slate-900">
                Administrator Permission Required
              </p>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                Your account (UID: <span className="font-mono">{firebaseUser.uid}</span>) is registered as a Student. Administrator operations are restricted by both backend checks and Cloud Firestore security rules.
              </p>
              <button
                type="button"
                onClick={() => navigateTo(AppPage.STUDENT_DASHBOARD)}
                className="px-4 py-2 text-xs font-semibold rounded-xl glass-btn-obsidian"
              >
                Return to Student Dashboard
              </button>
            </div>
          )}

          {isAdmin && currentPage === AppPage.ADMIN_DASHBOARD && (
            <AdminDashboardPage
              allUsers={allUsers}
              roles={roles}
              rolesFromFirestore={rolesFromFirestore}
              resourcesFromFirestore={resourcesFromFirestore}
              chunks={chunks}
              allProgress={allProgress}
              activityLogs={activityLogs}
              seeding={actionBusy}
              onSeedCatalog={async () => {
                setActionBusy(true);
                try {
                  await seedCatalogToFirestore(firebaseUser.uid, account.displayName);
                } finally {
                  setActionBusy(false);
                }
              }}
              onUpdateStudentPermittedInfo={adminUpdatePermittedStudentInfo}
              onGrantAdmin={async (targetUid) => {
                await grantAdminAccessToUid(targetUid, firebaseUser.uid);
              }}
              onNavigate={navigateTo}
            />
          )}

          {isAdmin && currentPage === AppPage.ADMIN_ROLES && (
            <AdminJobRolesPage
              roles={roles}
              skillsCatalog={skillsCatalog}
              requirements={requirements}
              rolesFromFirestore={rolesFromFirestore}
              onSeedCatalog={() =>
                seedCatalogToFirestore(firebaseUser.uid, account.displayName)
              }
              onSaveRole={(role, isNew) =>
                adminSaveJobRole(role, isNew, firebaseUser.uid, account.displayName)
              }
              onSaveSkillAndRequirement={(sk, req) =>
                adminSaveSkillAndRequirement(sk, req, firebaseUser.uid, account.displayName)
              }
            />
          )}

          {isAdmin && currentPage === AppPage.ADMIN_RESOURCES && (
            <AdminResourcesPage
              resources={resources}
              chunks={chunks}
              resourcesFromFirestore={resourcesFromFirestore}
              onSeedCatalog={() =>
                seedCatalogToFirestore(firebaseUser.uid, account.displayName)
              }
              onSaveResourceAndChunks={(resource) =>
                adminSaveLearningResourceAndChunks(
                  resource,
                  firebaseUser.uid,
                  account.displayName
                )
              }
            />
          )}
        </main>
      </div>
    </div>
  );
}
