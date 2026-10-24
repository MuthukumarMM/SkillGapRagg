import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Database,
  FileText,
  GraduationCap,
  Lock,
  Shield,
  ShieldCheck,
  Target,
} from 'lucide-react';
import {
  AppPage,
  JobRole,
  LoginPortalRole,
  PROFICIENCY_LABELS,
  ProficiencyLevel,
  RoleRequirement,
  SkillDefinition,
  StudentSkillEntry,
  UserAccount,
} from '../types';
import { formatFriendlyError } from '../lib/firebase';

interface LandingPageProps {
  roles: JobRole[];
  requirements: RoleRequirement[];
  onNavigate: (page: AppPage) => void;
  onOpenPortalAuth: (mode: 'login' | 'register', portalRole: LoginPortalRole) => void;
}

const WORKFLOW_STAGES = [
  {
    step: '01',
    title: 'Academic Profile & Study Cadence',
    actor: 'Student Workspace · /users/{uid}',
    input: 'Institution, degree specialization, graduation year, and weekly study hours (1–80 hrs/wk).',
    mechanism: 'Initializes an owner-scoped academic record in Cloud Firestore and calibrates roadmap pacing.',
    output: 'Baseline student profile ready for resume parsing and weighted role comparison.',
  },
  {
    step: '02',
    title: 'PDF Resume Upload & Factual Skill Extraction',
    actor: 'Resume Engine · /resumes/{uid_latest}',
    input: 'Student PDF resume (up to 5 MB) or built-in sample resume text.',
    mechanism:
      'Extracts verbatim text via unpdf and maps technical skills, projects, and certificates without inventing credentials or treating absent keywords as inability.',
    output: 'Editable skill table synced to confirmed profile skills with conservative L1–L3 estimates.',
  },
  {
    step: '03',
    title: 'Target Career Role & Weighted Rubric Selection',
    actor: 'Role Catalog · /jobRoles & /roleRequirements',
    input: 'Selection among Java Developer, Python Developer, Data Analyst, or custom admin tracks.',
    mechanism: 'Loads active competency targets (Levels 1–4) and importance weights (1–5) managed live by admins.',
    output: 'Live side-by-side alignment preview across every required technical skill.',
  },
  {
    step: '04',
    title: 'Transparent Weighted Skill-Gap Matrix',
    actor: 'Comparison Service · /progress snapshots',
    input: 'Confirmed student skills compared against target role requirements.',
    mechanism:
      'Computes (Earned Weighted Points ÷ Total Weighted Points) × 100 and caps unverified self-reports at 80% provisional credit.',
    output: 'Per-skill classification (Meets, Needs Improvement, Requires Assessment, Missing) + trend chart.',
  },
  {
    step: '05',
    title: 'Dense Vector RAG Learning Roadmap',
    actor: 'RAG Pipeline · /resourceChunks & /roadmaps',
    input: 'Actionable skill gaps + student weekly study hours and preferred duration.',
    mechanism:
      'Retrieves curated documentation chunks via cosine similarity (gemini-embedding-2-preview / TF-IDF vector index) and synthesizes cited weekly modules.',
    output: 'Interactive week-by-week study checklist with explicit source citations and corpus coverage notices.',
  },
  {
    step: '06',
    title: 'Practical Assessment & Reassessment Loop',
    actor: 'Verification Engine · /assessments & /progress',
    input: 'Scenario-based multiple-choice diagnostic quizzes across Beginner, Intermediate, and Advanced tiers.',
    mechanism:
      'Grades technical answers objectively, converts provisional skills into verified proficiency (up to L4), and recalculates Skill Match Score.',
    output: 'Verified skill status, question-by-question explanations, and longitudinal progress charts.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  roles,
  requirements,
  onNavigate,
  onOpenPortalAuth,
}) => {
  const [previewRoleId, setPreviewRoleId] = useState<string>(roles[0]?.id || 'role_java_developer');
  const [activeStageIdx, setActiveStageIdx] = useState<number>(0);

  const activeRole = roles.find((r) => r.id === previewRoleId) || roles[0];
  const roleReqs = requirements.filter((r) => r.roleId === activeRole?.id && r.active).slice(0, 5);
  const activeStage = WORKFLOW_STAGES[activeStageIdx] || WORKFLOW_STAGES[0];

  return (
    <div className="min-h-screen text-slate-900 flex flex-col">
      {/* Strict 3-Zone Glass Top Bar */}
      <header className="flex items-center justify-between gap-8 px-6 lg:px-12 py-4 glass-topbar sticky top-0 z-30">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onNavigate(AppPage.LANDING);
          }}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          SkillGapRAG
        </a>

        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          <a
            href="#workflow"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Working Flow
          </a>
          <a
            href="#portals"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Login Portals
          </a>
          <a
            href="#benchmarks"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Role Rubrics
          </a>
          <button
            type="button"
            onClick={() => onOpenPortalAuth('login', 'student')}
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Sign In
          </button>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => onOpenPortalAuth('register', 'student')}
            className="px-4 py-2 text-sm font-semibold rounded-lg glass-btn-obsidian whitespace-nowrap shrink-0"
          >
            Get Started
          </button>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* Hero Split */}
        <section className="max-w-7xl mx-auto px-6 lg:px-12 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
              <p className="text-xs font-semibold tracking-wide uppercase text-blue-700">
                Career Intelligence &amp; Retrieval-Augmented Skill Diagnostics
              </p>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-tight max-w-xl">
                Diagnose real skill gaps, study cited sources, and verify mastery.
              </h1>
              <p className="text-base text-slate-600 leading-relaxed max-w-xl">
                SkillGapRAG extracts technical evidence from your PDF resume, evaluates proficiency against weighted career rubrics, retrieves curated documentation via semantic RAG embeddings, and validates progress through practical assessments.
              </p>
              <div className="flex flex-wrap items-center gap-3.5 pt-1">
                <button
                  type="button"
                  onClick={() => onOpenPortalAuth('login', 'student')}
                  className="px-5 py-2.5 text-sm font-semibold rounded-lg glass-btn-primary inline-flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  Student Portal Sign In
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenPortalAuth('login', 'admin')}
                  className="px-5 py-2.5 text-sm font-semibold rounded-lg glass-btn-secondary inline-flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  <Shield className="w-4 h-4 text-slate-700" />
                  Administrator Portal
                </button>
              </div>
              <div className="pt-1 text-xs text-slate-500 flex flex-wrap items-center gap-2">
                <span>Transparent Weighted Formula</span>
                <span aria-hidden="true">·</span>
                <span>Owner-Isolated Resumes</span>
                <span aria-hidden="true">·</span>
                <span>Citation-Grounded Gemini RAG</span>
              </div>
            </div>

            {/* Interactive Glass Rubric Explorer */}
            <div className="lg:col-span-6 glass-panel rounded-2xl p-6 sm:p-7 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      Live Role Rubric Explorer
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Illustrative benchmark · Inspect target proficiencies &amp; importance weights
                    </p>
                  </div>
                  <div className="flex items-center gap-1 p-1 glass-well rounded-lg">
                    {roles.slice(0, 3).map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setPreviewRoleId(r.id)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                          r.id === activeRole?.id
                            ? 'bg-white text-slate-900 shadow-xs font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {r.title.replace(' Developer', '')}
                      </button>
                    ))}
                  </div>
                </div>

                {activeRole && (
                  <div className="py-4 space-y-4">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {activeRole.description}
                    </p>
                    <div className="glass-well rounded-xl divide-y divide-slate-200/70 px-4">
                      {roleReqs.map((req) => (
                        <div
                          key={req.id}
                          className="py-2.5 flex items-center justify-between gap-4 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate">{req.skillName}</p>
                            <p className="text-xs text-slate-500">
                              {req.category} · Target {PROFICIENCY_LABELS[req.requiredProficiency]}
                            </p>
                          </div>
                          <div className="text-right font-mono tabular-nums text-xs font-medium text-slate-700 shrink-0">
                            Weight {req.importanceWeight}/5
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
                <span className="font-mono tabular-nums">
                  Match Score = (Earned Weighted Pts ÷ Total Weighted Pts) × 100
                </span>
                <button
                  type="button"
                  onClick={() => onOpenPortalAuth('register', 'student')}
                  className="font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0"
                >
                  Start Student Evaluation →
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive 6-Stage End-to-End Working Flow Section */}
        <section id="workflow" className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
          <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-1.5 max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  End-to-End System Architecture
                </p>
                <h2 className="text-2xl font-bold text-slate-900">
                  Clear 6-Stage Connected Working Flow
                </h2>
                <p className="text-sm text-slate-600">
                  Every stage writes real state to Cloud Firestore and feeds directly into the next stage—from initial PDF resume parsing through objective quiz verification. Select any stage below to inspect how it works.
                </p>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-500 shrink-0">
                Stage {activeStage.step} of 06 Selected
              </span>
            </div>

            {/* 6-Step Selector Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {WORKFLOW_STAGES.map((st, idx) => {
                const selected = idx === activeStageIdx;
                return (
                  <button
                    key={st.step}
                    type="button"
                    onClick={() => setActiveStageIdx(idx)}
                    className={`p-3.5 rounded-xl text-left transition-all ${
                      selected
                        ? 'glass-panel-active'
                        : 'glass-well hover:bg-white/80 text-slate-700'
                    }`}
                  >
                    <span
                      className={`block text-[11px] font-mono tabular-nums font-semibold ${
                        selected ? 'text-blue-700' : 'text-slate-500'
                      }`}
                    >
                      STEP {st.step}
                    </span>
                    <span className="block text-xs font-semibold text-slate-900 mt-1 leading-snug">
                      {st.title.split('&')[0].trim()}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Stage Mechanism-to-Outcome Inspector */}
            <div className="glass-well rounded-xl p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-4 space-y-1.5">
                <p className="text-xs font-mono tabular-nums text-blue-700 font-semibold">
                  STAGE {activeStage.step} · {activeStage.actor}
                </p>
                <h3 className="text-lg font-bold text-slate-900">{activeStage.title}</h3>
              </div>

              <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
                <div className="space-y-1">
                  <p className="font-semibold text-slate-900">1. Stage Input</p>
                  <p className="text-slate-600 leading-relaxed">{activeStage.input}</p>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-slate-900">2. Engine / AI Mechanism</p>
                  <p className="text-slate-600 leading-relaxed">{activeStage.mechanism}</p>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-slate-900">3. Persisted Output</p>
                  <p className="text-slate-600 leading-relaxed">{activeStage.output}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Explicit Login Types Section: User (Student) vs Administrator */}
        <section id="portals" className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
          <div className="space-y-8">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                Role-Based Access Control (RBAC)
              </p>
              <h2 className="text-2xl font-bold text-slate-900">
                Two Dedicated Login Portals: Student &amp; Administrator
              </h2>
              <p className="text-sm text-slate-600">
                Permissions are enforced on both the backend and Cloud Firestore security rules—never merely hidden in the interface. Choose your portal below to sign in.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Student / Learner Login Card */}
              <div className="glass-panel-interactive rounded-2xl p-7 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="inline-flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl glass-well flex items-center justify-center text-blue-700">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">
                          Student / Learner Login
                        </h3>
                        <p className="text-xs text-slate-500">
                          For students preparing for technical careers
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-slate-500">Role: student</span>
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed">
                    Access your private career diagnostic workspace to upload PDF resumes, inspect weighted skill gaps, study from RAG-retrieved documentation, and verify mastery via assessments.
                  </p>

                  <div className="glass-well rounded-xl p-4 space-y-2 text-xs text-slate-700">
                    <p className="font-semibold text-slate-900">Included Student Capabilities:</p>
                    <ul className="space-y-1.5">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                        <span>Owner-isolated PDF resume parsing &amp; editable skill confirmation</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                        <span>Transparent weighted Skill Match Score &amp; Gemini gap advisory</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                        <span>Citation-grounded weekly RAG learning roadmap &amp; task tracker</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                        <span>Practical MCQ skill verification &amp; longitudinal progress history</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => onOpenPortalAuth('register', 'student')}
                    className="text-xs font-semibold text-blue-700 hover:underline whitespace-nowrap"
                  >
                    New student? Register profile →
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenPortalAuth('login', 'student')}
                    className="px-4 py-2 text-xs font-semibold rounded-lg glass-btn-primary inline-flex items-center gap-2 whitespace-nowrap shrink-0"
                  >
                    Sign In as Student
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Administrator Login Card */}
              <div className="glass-panel-interactive rounded-2xl p-7 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="inline-flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl glass-well flex items-center justify-center text-slate-900">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">
                          Administrator Console Login
                        </h3>
                        <p className="text-xs text-slate-500">
                          For faculty coordinators &amp; curriculum admins
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-slate-500">Role: admin</span>
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed">
                    Govern career role rubrics, adjust competency weights, curate and chunk RAG documentation, inspect cohort-wide skill gaps, and manage permitted academic metadata.
                  </p>

                  <div className="glass-well rounded-xl p-4 space-y-2 text-xs text-slate-700">
                    <p className="font-semibold text-slate-900">Included Administrator Capabilities:</p>
                    <ul className="space-y-1.5">
                      <li className="flex items-start gap-2">
                        <Database className="w-3.5 h-3.5 text-blue-700 shrink-0 mt-0.5" />
                        <span>Add, edit, or deactivate job roles &amp; skill importance weights live</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Database className="w-3.5 h-3.5 text-blue-700 shrink-0 mt-0.5" />
                        <span>Ingest curated learning resources, auto-chunk text &amp; sync RAG vectors</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Database className="w-3.5 h-3.5 text-blue-700 shrink-0 mt-0.5" />
                        <span>Review cohort skill-gap charts, system audit logs &amp; grant admin UIDs</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                        <span>Zero-trust privacy: student resumes &amp; raw quizzes remain strictly private</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/80">
                  <span className="text-xs text-slate-500">
                    Verified via <span className="font-mono">/admins/&#123;uid&#125;</span> registry
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenPortalAuth('login', 'admin')}
                    className="px-4 py-2 text-xs font-semibold rounded-lg glass-btn-obsidian inline-flex items-center gap-2 whitespace-nowrap shrink-0"
                  >
                    Sign In as Administrator
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Curated Benchmarks Section */}
        <section id="benchmarks" className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
          <div className="space-y-8">
            <div className="max-w-2xl space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">
                Supported Career Tracks &amp; Dynamic Rubric Catalog
              </h2>
              <p className="text-sm text-slate-600">
                Ships with curated academic benchmarks for Java Developer, Python Developer, and Data Analyst. Administrators can modify weights or add new tracks without code changes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {roles.slice(0, 3).map((role) => {
                const count = requirements.filter((r) => r.roleId === role.id && r.active).length;
                return (
                  <div
                    key={role.id}
                    className="glass-panel-interactive rounded-2xl p-6 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <p className="text-xs text-slate-500">
                        {role.department} · <span className="font-mono tabular-nums">{count}</span> weighted skills
                      </p>
                      <h3 className="text-lg font-semibold text-slate-900">{role.title}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{role.description}</p>
                    </div>
                    <div className="pt-5 mt-5 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {role.isSampleDataset ? 'Illustrative sample rubric' : 'Institutional rubric'}
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenPortalAuth('register', 'student')}
                        className="font-semibold text-blue-700 hover:underline whitespace-nowrap shrink-0"
                      >
                        Select Track →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <footer className="glass-topbar border-t border-b-0 px-6 lg:px-12 py-6 mt-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <span>SkillGapRAG — AI-Powered Career Intelligence &amp; Skill Gap Analysis System</span>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => onOpenPortalAuth('login', 'student')}
              className="hover:text-slate-900"
            >
              Student Login
            </button>
            <button
              type="button"
              onClick={() => onOpenPortalAuth('login', 'admin')}
              className="hover:text-slate-900"
            >
              Administrator Login
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

interface AuthPageProps {
  mode: 'login' | 'register';
  initialPortalRole: LoginPortalRole;
  authBusy: boolean;
  authError: string | null;
  onGoogleAuth: (
    portalRole: LoginPortalRole,
    prefill?: {
      institution: string;
      degreeProgram: string;
      graduationYear: number;
    }
  ) => Promise<void>;
  onNavigate: (page: AppPage) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  mode,
  initialPortalRole,
  authBusy,
  authError,
  onGoogleAuth,
  onNavigate,
}) => {
  const [portalRole, setPortalRole] = useState<LoginPortalRole>(initialPortalRole);
  const [institution, setInstitution] = useState('');
  const [degreeProgram, setDegreeProgram] = useState('B.Tech Computer Science & Engineering');
  const [graduationYear, setGraduationYear] = useState(2026);

  useEffect(() => {
    setPortalRole(initialPortalRole);
  }, [initialPortalRole]);

  const isRegister = mode === 'register' && portalRole === 'student';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegister) {
      await onGoogleAuth(portalRole, { institution, degreeProgram, graduationYear });
    } else {
      await onGoogleAuth(portalRole);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between gap-8 px-6 lg:px-12 py-4 glass-topbar">
        <button
          type="button"
          onClick={() => onNavigate(AppPage.LANDING)}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          SkillGapRAG
        </button>
        <nav className="hidden sm:flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => onNavigate(AppPage.LANDING)}
            className="hover:text-slate-900 whitespace-nowrap shrink-0"
          >
            Back to Overview
          </button>
        </nav>
        <button
          type="button"
          onClick={() => {
            if (portalRole === 'admin') {
              setPortalRole('student');
              onNavigate(AppPage.REGISTER);
            } else {
              onNavigate(mode === 'register' ? AppPage.LOGIN : AppPage.REGISTER);
            }
          }}
          className="px-4 py-2 text-xs font-semibold rounded-lg glass-btn-secondary whitespace-nowrap shrink-0"
        >
          {mode === 'register' ? 'Sign In Instead' : 'Student Registration'}
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg glass-panel rounded-2xl p-7 sm:p-8 space-y-6">
          {/* Explicit Login Type Switcher: Student vs Administrator */}
          <div className="grid grid-cols-2 gap-2 p-1.5 glass-well rounded-xl">
            <button
              type="button"
              onClick={() => setPortalRole('student')}
              className={`py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
                portalRole === 'student'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-4 h-4 shrink-0" />
              <span>Student / User Login</span>
            </button>
            <button
              type="button"
              onClick={() => setPortalRole('admin')}
              className={`py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
                portalRole === 'admin'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Shield className="w-4 h-4 shrink-0" />
              <span>Administrator Login</span>
            </button>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              {portalRole === 'admin'
                ? 'Administrator Governance Portal'
                : isRegister
                ? 'New Student Career Profile'
                : 'Student Career Workspace'}
            </p>
            <h1 className="text-2xl font-bold text-slate-900">
              {portalRole === 'admin'
                ? 'Sign in to Administrator Console'
                : isRegister
                ? 'Create your Student Account'
                : 'Sign in as Student'}
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              {portalRole === 'admin'
                ? 'Authenticate with an authorized Google account to manage job-role rubrics, competency weights, RAG knowledge chunks, and cohort gap reports.'
                : isRegister
                ? 'Authenticate with your verified Google account to initialize your private PDF resume workspace, skill-gap matrix, and personalised RAG study roadmap.'
                : 'Sign in with your verified Google account to resume your 6-step skill analysis, roadmap checklist, and practical assessments.'}
            </p>
          </div>

          {authError && (
            <div className="p-3.5 rounded-xl glass-alert-error text-xs leading-relaxed">
              {authError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="space-y-3.5 glass-well rounded-xl p-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Institution / University (editable anytime)
                  </label>
                  <input
                    type="text"
                    maxLength={160}
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="e.g. Francis Xavier Engineering College"
                    className="w-full px-3 py-2 text-sm rounded-lg glass-input"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Degree / Major
                    </label>
                    <input
                      type="text"
                      maxLength={160}
                      value={degreeProgram}
                      onChange={(e) => setDegreeProgram(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg glass-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Grad Year
                    </label>
                    <input
                      type="number"
                      min={2020}
                      max={2035}
                      value={graduationYear}
                      onChange={(e) => setGraduationYear(Number(e.target.value) || 2026)}
                      className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg glass-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {portalRole === 'admin' && (
              <div className="glass-well rounded-xl p-4 text-xs text-slate-600 space-y-1.5">
                <p className="font-semibold text-slate-900">
                  How Administrator Verification Works:
                </p>
                <p className="leading-relaxed">
                  Cloud Firestore verifies your authenticated UID against the{' '}
                  <span className="font-mono text-slate-800">/admins/&#123;uid&#125;</span> registry (or configured institutional bootstrap administrator). Authorized admins can also switch between Admin Console and Student View anytime from the top bar.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={authBusy}
              className={`w-full py-2.5 px-4 disabled:opacity-60 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 whitespace-nowrap ${
                portalRole === 'admin' ? 'glass-btn-obsidian' : 'glass-btn-primary'
              }`}
            >
              <Lock className="w-4 h-4" />
              {authBusy
                ? 'Verifying Google Credentials...'
                : portalRole === 'admin'
                ? 'Sign In to Admin Console with Google'
                : isRegister
                ? 'Register Student Profile with Google'
                : 'Sign In to Student Workspace with Google'}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-200/80 space-y-2 text-xs text-slate-500">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <p>
                Protected by Firebase Authentication (<span className="font-mono">email_verified == true</span>) and strict UID-isolated Firestore security rules.
              </p>
            </div>
            {portalRole === 'student' && (
              <p className="pt-1">
                {isRegister ? 'Already have a student profile?' : 'First time using SkillGapRAG?'}{' '}
                <button
                  type="button"
                  onClick={() => onNavigate(isRegister ? AppPage.LOGIN : AppPage.REGISTER)}
                  className="font-semibold text-blue-700 hover:underline"
                >
                  {isRegister ? 'Sign in here' : 'Register student profile'}
                </button>
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

interface OnboardingPageProps {
  account: UserAccount;
  roles: JobRole[];
  skillsCatalog: SkillDefinition[];
  saving: boolean;
  onCompleteOnboarding: (updated: {
    displayName: string;
    institution: string;
    degreeProgram: string;
    graduationYear: number;
    weeklyStudyHours: number;
    preferredDurationWeeks: number;
    selectedRoleId: string;
    confirmedSkills: StudentSkillEntry[];
  }) => Promise<void>;
}

export const OnboardingPage: React.FC<OnboardingPageProps> = ({
  account,
  roles,
  skillsCatalog,
  saving,
  onCompleteOnboarding,
}) => {
  const [displayName, setDisplayName] = useState(account.displayName || '');
  const [institution, setInstitution] = useState(account.institution || '');
  const [degreeProgram, setDegreeProgram] = useState(
    account.degreeProgram || 'B.Tech Computer Science & Engineering'
  );
  const [graduationYear, setGraduationYear] = useState(account.graduationYear || 2026);
  const [weeklyStudyHours, setWeeklyStudyHours] = useState(account.weeklyStudyHours || 8);
  const [preferredDurationWeeks, setPreferredDurationWeeks] = useState(
    account.preferredDurationWeeks || 6
  );
  const [selectedRoleId, setSelectedRoleId] = useState(
    account.selectedRoleId || roles[0]?.id || 'role_java_developer'
  );
  const [selectedSkills, setSelectedSkills] = useState<Record<string, ProficiencyLevel>>(() => {
    const map: Record<string, ProficiencyLevel> = {};
    for (const s of account.confirmedSkills) {
      map[s.skillId] = s.proficiency;
    }
    return map;
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSkillLevelChange = (skillId: string, level: ProficiencyLevel) => {
    setSelectedSkills((prev) => {
      const next = { ...prev };
      if (level === 0) {
        delete next[skillId];
      } else {
        next[skillId] = level;
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const existingMap = new Map<string, StudentSkillEntry>(
      account.confirmedSkills.map((s) => [s.skillId, s])
    );
    const confirmedSkills: StudentSkillEntry[] = Object.entries(selectedSkills).map(
      ([skillId, level]) => {
        const def = skillsCatalog.find((k) => k.id === skillId);
        const prev = existingMap.get(skillId);
        const numericLevel = Number(level) as ProficiencyLevel;
        return {
          skillId,
          skillName: def?.name || prev?.skillName || skillId,
          category: def?.category || prev?.category || 'Technical',
          proficiency: numericLevel,
          verifiedByAssessment:
            prev?.verifiedByAssessment && prev.proficiency === numericLevel ? true : false,
          source: prev?.source || 'manual',
          evidenceNote: prev?.evidenceNote || 'Self-reported during student onboarding',
        };
      }
    );

    try {
      await onCompleteOnboarding({
        displayName: displayName.trim() || 'Student',
        institution: institution.trim() || 'University / College',
        degreeProgram: degreeProgram.trim() || 'Computer Science',
        graduationYear,
        weeklyStudyHours,
        preferredDurationWeeks,
        selectedRoleId,
        confirmedSkills,
      });
    } catch (err) {
      setErrorMsg(formatFriendlyError(err, 'Failed to save student onboarding profile.'));
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
          Step 01 of 06 · Student Workflow Initialization
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Complete Your Student Career Profile
        </h1>
        <p className="text-sm text-slate-600">
          Configure your academic details, weekly study availability, and initial target career track. Next, Step 02 opens PDF Resume Analysis to extract your technical skills automatically.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl glass-alert-error text-xs">{errorMsg}</div>
      )}

      <form
        onSubmit={handleSubmit}
        className="glass-panel rounded-2xl divide-y divide-slate-200/80 overflow-hidden"
      >
        {/* Academic Profile */}
        <div className="p-6 sm:p-7 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-700" />
            1. Academic Profile &amp; Study Cadence
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                maxLength={120}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg glass-input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Institution / College
              </label>
              <input
                type="text"
                required
                maxLength={160}
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="e.g. Francis Xavier Engineering College"
                className="w-full px-3 py-2 text-sm rounded-lg glass-input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Degree &amp; Specialization
              </label>
              <input
                type="text"
                required
                maxLength={160}
                value={degreeProgram}
                onChange={(e) => setDegreeProgram(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg glass-input"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Grad Year</label>
                <input
                  type="number"
                  min={2000}
                  max={2040}
                  value={graduationYear}
                  onChange={(e) => setGraduationYear(Number(e.target.value) || 2026)}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg glass-input"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Hrs / Week</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={weeklyStudyHours}
                  onChange={(e) => setWeeklyStudyHours(Number(e.target.value) || 8)}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg glass-input"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Plan Weeks</label>
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={preferredDurationWeeks}
                  onChange={(e) => setPreferredDurationWeeks(Number(e.target.value) || 6)}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg glass-input"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Target Career Selection */}
        <div className="p-6 sm:p-7 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-700" />
            2. Select Initial Target Career Role
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {roles.map((role) => {
              const selected = role.id === selectedRoleId;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`text-left p-4 rounded-xl transition-all ${
                    selected
                      ? 'glass-panel-active'
                      : 'glass-well hover:bg-white/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">{role.title}</span>
                    {selected && <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{role.department}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional Baseline Self-Reported Skills */}
        <div className="p-6 sm:p-7 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-700" />
              3. Optional Baseline Skills (Or Extract from PDF Resume in Step 02)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Self-reported skills receive provisional credit until verified via Practical Assessment. You can also leave these at 0 and extract directly from your PDF resume on the next screen.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
            {skillsCatalog.map((skill) => {
              const current = selectedSkills[skill.id] || 0;
              return (
                <div
                  key={skill.id}
                  className="flex items-center justify-between gap-3 py-2.5 px-3.5 glass-well rounded-xl"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">{skill.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{skill.category}</p>
                  </div>
                  <select
                    value={current}
                    onChange={(e) =>
                      handleSkillLevelChange(skill.id, Number(e.target.value) as ProficiencyLevel)
                    }
                    className="text-xs font-mono tabular-nums rounded-lg px-2 py-1 glass-input shrink-0"
                  >
                    <option value={0}>0 · Unset</option>
                    <option value={1}>1 · Beginner</option>
                    <option value={2}>2 · Interm.</option>
                    <option value={3}>3 · Advanced</option>
                  </select>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-6 sm:p-7 glass-well flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs text-slate-600">
            Next in workflow: <span className="font-semibold text-slate-900">Step 02 — PDF Resume Upload &amp; Skill Extraction</span>
          </p>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 disabled:opacity-60 text-sm font-semibold rounded-xl glass-btn-primary whitespace-nowrap shrink-0"
          >
            {saving ? 'Saving Profile...' : 'Save Profile & Continue to Step 02 →'}
          </button>
        </div>
      </form>
    </div>
  );
};
