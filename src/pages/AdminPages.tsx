import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Database, ExternalLink, Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  ActivityLog,
  AppPage,
  DifficultyTier,
  JobRole,
  LearningResource,
  PROFICIENCY_LABELS,
  ProgressSnapshot,
  ResourceChunk,
  RoleRequirement,
  SkillDefinition,
  UserAccount,
} from '../types';
import { formatFriendlyError, sanitizeId } from '../lib/firebase';
import { postApiJson } from '../lib/apiClient';

interface AdminDashboardPageProps {
  allUsers: UserAccount[];
  roles: JobRole[];
  rolesFromFirestore: boolean;
  resourcesFromFirestore: boolean;
  chunks: ResourceChunk[];
  allProgress: ProgressSnapshot[];
  activityLogs: ActivityLog[];
  seeding: boolean;
  onSeedCatalog: () => Promise<void>;
  onUpdateStudentPermittedInfo: (
    studentUid: string,
    updates: {
      institution: string;
      degreeProgram: string;
      graduationYear: number;
      onboardingCompleted: boolean;
    }
  ) => Promise<void>;
  onGrantAdmin: (targetUid: string) => Promise<void>;
  onNavigate: (page: AppPage) => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  allUsers,
  roles,
  rolesFromFirestore,
  resourcesFromFirestore,
  chunks,
  allProgress,
  activityLogs,
  seeding,
  onSeedCatalog,
  onUpdateStudentPermittedInfo,
  onGrantAdmin,
  onNavigate,
}) => {
  const [studentSearch, setStudentSearch] = useState('');
  const [editingStudent, setEditingStudent] = useState<UserAccount | null>(null);
  const [adminStatusMsg, setAdminStatusMsg] = useState<string | null>(null);
  const [adminErrorMsg, setAdminErrorMsg] = useState<string | null>(null);

  const activeRolesCount = roles.filter((r) => r.active).length;

  const topMissingSkillsData = useMemo(() => {
    const latestByStudentRole = new Map<string, ProgressSnapshot>();
    for (const snap of allProgress) {
      const key = `${snap.ownerId}_${snap.roleId}`;
      if (!latestByStudentRole.has(key)) {
        latestByStudentRole.set(key, snap);
      }
    }
    const freq = new Map<string, number>();
    latestByStudentRole.forEach((snap) => {
      for (const name of snap.missingSkillNames || []) {
        freq.set(name, (freq.get(name) || 0) + 1);
      }
    });
    return Array.from(freq.entries())
      .map(([skill, students]) => ({
        skill: skill.length > 20 ? `${skill.slice(0, 18)}…` : skill,
        Students: students,
      }))
      .sort((a, b) => b.Students - a.Students)
      .slice(0, 7);
  }, [allProgress]);

  const roleAverageStats = useMemo(() => {
    const latestByStudentRole = new Map<string, ProgressSnapshot>();
    for (const snap of allProgress) {
      const key = `${snap.ownerId}_${snap.roleId}`;
      if (!latestByStudentRole.has(key)) {
        latestByStudentRole.set(key, snap);
      }
    }
    return roles.map((role) => {
      const matching = Array.from(latestByStudentRole.values()).filter(
        (s) => s.roleId === role.id
      );
      const avg =
        matching.length > 0
          ? Math.round(matching.reduce((acc, s) => acc + s.skillMatchScore, 0) / matching.length)
          : null;
      return {
        roleId: role.id,
        title: role.title,
        active: role.active,
        evaluatedStudents: matching.length,
        avgMatchScore: avg,
      };
    });
  }, [allProgress, roles]);

  const filteredUsers = allUsers.filter((u) => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      u.displayName.toLowerCase().includes(q) ||
      u.institution.toLowerCase().includes(q) ||
      u.degreeProgram.toLowerCase().includes(q) ||
      u.uid.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Admin Module 01 of 03 · Cohort Analytics &amp; Role-Enforced Governance
          </p>
          <h1 className="text-2xl font-bold text-slate-900">
            System Analytics &amp; Academic Administration
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {(!rolesFromFirestore || !resourcesFromFirestore) && (
            <button
              type="button"
              disabled={seeding}
              onClick={async () => {
                setAdminErrorMsg(null);
                setAdminStatusMsg(null);
                try {
                  await onSeedCatalog();
                  setAdminStatusMsg(
                    'Sample job roles, skills, and RAG chunks persisted to Cloud Firestore.'
                  );
                } catch (err) {
                  setAdminErrorMsg(formatFriendlyError(err, 'Failed to seed catalog to Firestore.'));
                }
              }}
              className="px-4 py-2 text-xs font-semibold rounded-xl glass-btn-primary disabled:opacity-60 inline-flex items-center gap-2 whitespace-nowrap"
            >
              <Database className="w-3.5 h-3.5" />
              {seeding ? 'Initializing Firestore Catalog...' : 'Persist Default Catalog to Firestore'}
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigate(AppPage.ADMIN_ROLES)}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl glass-btn-secondary whitespace-nowrap"
          >
            Manage Job Roles →
          </button>
          <button
            type="button"
            onClick={() => onNavigate(AppPage.ADMIN_RESOURCES)}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl glass-btn-obsidian whitespace-nowrap"
          >
            Manage RAG Corpus →
          </button>
        </div>
      </div>

      {adminErrorMsg && (
        <div className="p-3.5 rounded-xl glass-alert-error text-xs">{adminErrorMsg}</div>
      )}
      {adminStatusMsg && (
        <div className="p-3.5 rounded-xl glass-alert-success text-xs">{adminStatusMsg}</div>
      )}

      {/* Real Database KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 glass-panel rounded-2xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 overflow-hidden">
        <div className="p-5 space-y-1">
          <p className="text-xs text-slate-500">Registered Accounts</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {allUsers.length}
          </p>
          <p className="text-xs text-slate-500">Live from /users collection</p>
        </div>
        <div className="p-5 space-y-1">
          <p className="text-xs text-slate-500">Active Job Roles</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {activeRolesCount} / {roles.length}
          </p>
          <p className="text-xs text-slate-500">
            {rolesFromFirestore ? 'Stored in /jobRoles' : 'Using default seed catalog'}
          </p>
        </div>
        <div className="p-5 space-y-1">
          <p className="text-xs text-slate-500">Active RAG Chunks</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {chunks.filter((c) => c.active).length}
          </p>
          <p className="text-xs text-slate-500">Indexed for semantic retrieval</p>
        </div>
        <div className="p-5 space-y-1">
          <p className="text-xs text-slate-500">Recorded Evaluations</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {allProgress.length}
          </p>
          <p className="text-xs text-slate-500">Aggregate /progress snapshots</p>
        </div>
      </div>

      {/* Aggregate Skill Gaps Chart + Role Readiness Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 glass-panel rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Most Frequent Student Skill Gaps
            </h2>
            <p className="text-xs text-slate-500">
              Computed from real student skill-gap evaluations stored in Firestore.
            </p>
          </div>

          {topMissingSkillsData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topMissingSkillsData}
                  margin={{ top: 8, right: 12, left: -16, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                  <XAxis dataKey="skill" tick={{ fontSize: 11, fill: '#475569' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#475569' }} />
                  <Tooltip />
                  <Bar dataKey="Students" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center glass-well rounded-xl text-xs text-slate-500 px-6 text-center">
              No student progress snapshots recorded yet. Once students confirm skills or take assessments, aggregate missing skill frequencies appear here automatically.
            </div>
          )}
        </div>

        <div className="lg:col-span-5 glass-panel rounded-2xl overflow-hidden flex flex-col justify-between">
          <div className="p-6 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Aggregate Match Score by Role
              </h2>
              <p className="text-xs text-slate-500">Mean alignment across evaluated students</p>
            </div>
            <div className="divide-y divide-slate-200/70 glass-well rounded-xl px-4">
              {roleAverageStats.map((stat) => (
                <div
                  key={stat.roleId}
                  className="py-3 flex items-center justify-between gap-4 text-sm"
                >
                  <div>
                    <p className="font-medium text-slate-900">{stat.title}</p>
                    <p className="text-xs text-slate-500 font-mono tabular-nums">
                      {stat.evaluatedStudents} student(s) · {stat.active ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <span className="font-mono tabular-nums font-semibold text-slate-900">
                    {stat.avgMatchScore !== null ? `${stat.avgMatchScore}%` : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="px-6 py-4 glass-well border-x-0 border-b-0 flex items-start gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <span>
              Privacy enforcement: Individual PDF resumes (<span className="font-mono">/resumes</span>) and quiz attempts (<span className="font-mono">/assessments</span>) are inaccessible to administrators in Firestore rules.
            </span>
          </div>
        </div>
      </div>

      {/* Permitted Student Account Directory */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Student Accounts (Permitted Academic Profile Fields)
            </h2>
            <p className="text-xs text-slate-500">
              Administrators may review and update institution, degree program, graduation year, or grant admin privileges.
            </p>
          </div>
          <input
            type="search"
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            placeholder="Search name, college, or UID..."
            className="px-3 py-1.5 text-xs rounded-lg glass-input w-full sm:w-64"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 text-xs text-slate-500 bg-slate-100/50">
                <th className="py-3 px-6 font-medium">Student</th>
                <th className="py-3 px-4 font-medium">Institution &amp; Degree</th>
                <th className="py-3 px-4 font-medium text-right">Grad Year</th>
                <th className="py-3 px-4 font-medium text-right">Confirmed Skills</th>
                <th className="py-3 px-6 font-medium text-right">Permitted Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 px-6 text-center text-slate-500">
                    No matching user records found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.uid} className="hover:bg-white/60 transition-colors">
                    <td className="py-3 px-6">
                      <p className="font-semibold text-slate-900 text-sm">{u.displayName}</p>
                      <p className="font-mono text-[11px] text-slate-500">{u.uid}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {u.institution || 'Unset'} · {u.degreeProgram || 'Unset'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      {u.graduationYear}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      {u.confirmedSkills.length}
                    </td>
                    <td className="py-3 px-6 text-right space-x-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setEditingStudent(u)}
                        className="font-semibold text-blue-700 hover:underline"
                      >
                        Edit Academic Info
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          setAdminErrorMsg(null);
                          setAdminStatusMsg(null);
                          try {
                            await onGrantAdmin(u.uid);
                            setAdminStatusMsg(`Granted administrator role to UID ${u.uid}.`);
                          } catch (err) {
                            setAdminErrorMsg(
                              formatFriendlyError(err, 'Unable to grant administrator role.')
                            );
                          }
                        }}
                        className="text-slate-600 hover:text-slate-900 hover:underline font-medium"
                      >
                        Grant Admin
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {editingStudent && (
          <div className="p-6 border-t border-slate-200/80 glass-well space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Edit Permitted Academic Info — {editingStudent.displayName}
              </h3>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="text-xs text-slate-500 hover:text-slate-900"
              >
                Cancel
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={editingStudent.institution}
                onChange={(e) =>
                  setEditingStudent({ ...editingStudent, institution: e.target.value })
                }
                placeholder="Institution"
                className="px-3 py-2 text-xs rounded-lg glass-input"
              />
              <input
                type="text"
                value={editingStudent.degreeProgram}
                onChange={(e) =>
                  setEditingStudent({ ...editingStudent, degreeProgram: e.target.value })
                }
                placeholder="Degree Program"
                className="px-3 py-2 text-xs rounded-lg glass-input"
              />
              <input
                type="number"
                value={editingStudent.graduationYear}
                onChange={(e) =>
                  setEditingStudent({
                    ...editingStudent,
                    graduationYear: Number(e.target.value) || 2026,
                  })
                }
                className="px-3 py-2 text-xs font-mono rounded-lg glass-input"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={async () => {
                  setAdminErrorMsg(null);
                  setAdminStatusMsg(null);
                  try {
                    await onUpdateStudentPermittedInfo(editingStudent.uid, {
                      institution: editingStudent.institution,
                      degreeProgram: editingStudent.degreeProgram,
                      graduationYear: editingStudent.graduationYear,
                      onboardingCompleted: editingStudent.onboardingCompleted,
                    });
                    setEditingStudent(null);
                    setAdminStatusMsg('Permitted academic profile information updated.');
                  } catch (err) {
                    setAdminErrorMsg(
                      formatFriendlyError(err, 'Unable to update student academic profile.')
                    );
                  }
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl glass-btn-obsidian"
              >
                Save Academic Update
              </button>
            </div>
          </div>
        )}
      </div>

      {/* System Activity Log */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200/80">
          <h2 className="text-base font-semibold text-slate-900">
            Recent System Activity &amp; Audit Reports ({activityLogs.length})
          </h2>
        </div>
        {activityLogs.length === 0 ? (
          <p className="p-6 text-xs text-slate-500">No system activity logs recorded yet.</p>
        ) : (
          <div className="divide-y divide-slate-200/70 max-h-80 overflow-y-auto">
            {activityLogs.map((log) => (
              <div
                key={log.id}
                className="px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-white/50 transition-colors"
              >
                <div>
                  <span className="font-semibold text-slate-900">{log.actorDisplayName}</span>
                  <span className="text-slate-500"> ({log.actorRole}) · </span>
                  <span className="text-slate-700">{log.summary}</span>
                </div>
                <span className="font-mono tabular-nums text-slate-500 shrink-0">
                  {new Date(log.occurredAtIso).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface AdminJobRolesPageProps {
  roles: JobRole[];
  skillsCatalog: SkillDefinition[];
  requirements: RoleRequirement[];
  rolesFromFirestore: boolean;
  onSeedCatalog: () => Promise<void>;
  onSaveRole: (role: JobRole, isNew: boolean) => Promise<void>;
  onSaveSkillAndRequirement: (
    skill: SkillDefinition,
    requirement: RoleRequirement
  ) => Promise<void>;
}

export const AdminJobRolesPage: React.FC<AdminJobRolesPageProps> = ({
  roles,
  skillsCatalog,
  requirements,
  rolesFromFirestore,
  onSeedCatalog,
  onSaveRole,
  onSaveSkillAndRequirement,
}) => {
  const [selectedRoleId, setSelectedRoleId] = useState<string>(
    roles[0]?.id || 'role_java_developer'
  );
  const [creatingNew, setCreatingNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentRole = roles.find((r) => r.id === selectedRoleId) || roles[0];

  const [roleTitle, setRoleTitle] = useState(currentRole?.title || '');
  const [roleDept, setRoleDept] = useState(currentRole?.department || 'Engineering');
  const [roleDesc, setRoleDesc] = useState(currentRole?.description || '');
  const [roleActive, setRoleActive] = useState(currentRole ? currentRole.active : true);
  const [roleIsSample, setRoleIsSample] = useState(
    currentRole ? currentRole.isSampleDataset : false
  );

  const [skillNameInput, setSkillNameInput] = useState('');
  const [skillCatInput, setSkillCatInput] = useState('Backend Frameworks');
  const [reqProficiency, setReqProficiency] = useState<1 | 2 | 3 | 4>(3);
  const [reqWeight, setReqWeight] = useState<1 | 2 | 3 | 4 | 5>(4);

  const selectRoleForEdit = (r: JobRole) => {
    setCreatingNew(false);
    setSelectedRoleId(r.id);
    setRoleTitle(r.title);
    setRoleDept(r.department);
    setRoleDesc(r.description);
    setRoleActive(r.active);
    setRoleIsSample(r.isSampleDataset);
    setFeedback(null);
    setErrorMsg(null);
  };

  const startCreateRole = () => {
    setCreatingNew(true);
    setRoleTitle('');
    setRoleDept('Software Engineering');
    setRoleDesc('');
    setRoleActive(true);
    setRoleIsSample(false);
    setFeedback(null);
    setErrorMsg(null);
  };

  const handleSaveRoleForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    setErrorMsg(null);
    try {
      if (!rolesFromFirestore) {
        await onSeedCatalog();
      }
      const roleId = creatingNew
        ? sanitizeId(`role_${roleTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`)
        : currentRole.id;

      await onSaveRole(
        {
          id: roleId,
          title: roleTitle,
          department: roleDept,
          description: roleDesc,
          isSampleDataset: roleIsSample,
          active: roleActive,
          recommendedResourceIds: creatingNew ? [] : currentRole?.recommendedResourceIds || [],
        },
        creatingNew
      );
      setCreatingNew(false);
      setSelectedRoleId(roleId);
      setFeedback('Job role saved to Cloud Firestore without frontend code changes.');
    } catch (err) {
      setErrorMsg(formatFriendlyError(err, 'Failed to save job role.'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddOrUpdateRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillNameInput.trim() || !currentRole) return;
    setSaving(true);
    setFeedback(null);
    setErrorMsg(null);
    try {
      if (!rolesFromFirestore) {
        await onSeedCatalog();
      }
      const existingSkill = skillsCatalog.find(
        (s) => s.name.toLowerCase() === skillNameInput.trim().toLowerCase()
      );
      const skillId =
        existingSkill?.id ||
        sanitizeId(`skill_${skillNameInput.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')}`);

      const skillObj: SkillDefinition = existingSkill || {
        id: skillId,
        name: skillNameInput.trim(),
        category: skillCatInput.trim() || 'Technical',
        description: `Required competency in ${skillNameInput.trim()}.`,
        active: true,
      };

      const reqId = sanitizeId(`req_${currentRole.id}_${skillId}`);
      await onSaveSkillAndRequirement(skillObj, {
        id: reqId,
        roleId: currentRole.id,
        skillId,
        skillName: skillObj.name,
        category: skillObj.category,
        requiredProficiency: reqProficiency,
        importanceWeight: reqWeight,
        active: true,
      });
      setSkillNameInput('');
      setFeedback(`Added/updated skill requirement "${skillObj.name}" on ${currentRole.title}.`);
    } catch (err) {
      setErrorMsg(formatFriendlyError(err, 'Failed to save skill requirement.'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRequirementActive = async (req: RoleRequirement) => {
    setSaving(true);
    setFeedback(null);
    setErrorMsg(null);
    try {
      // Ensure parent /jobRoles/{roleId} exists in Firestore before writing /roleRequirements/{reqId}
      if (!rolesFromFirestore) {
        await onSeedCatalog();
      }
      const sk =
        skillsCatalog.find((s) => s.id === req.skillId) || {
          id: req.skillId,
          name: req.skillName,
          category: req.category,
          description: req.skillName,
          active: true,
        };
      await onSaveSkillAndRequirement(sk, { ...req, active: !req.active });
      setFeedback(
        `${!req.active ? 'Activated' : 'Deactivated'} requirement "${req.skillName}" for ${currentRole?.title}.`
      );
    } catch (err) {
      setErrorMsg(formatFriendlyError(err, 'Failed to toggle requirement status.'));
    } finally {
      setSaving(false);
    }
  };

  const currentReqs = requirements.filter((r) => r.roleId === currentRole?.id);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Admin Module 02 of 03 · Dynamic Role &amp; Weight Configuration
          </p>
          <h1 className="text-2xl font-bold text-slate-900">
            Job-Role &amp; Competency Rubric Management
          </h1>
          <p className="text-sm text-slate-600">
            Add, edit, or deactivate job roles and adjust target skill proficiencies and weights dynamically in Firestore.
          </p>
        </div>
        <button
          type="button"
          onClick={startCreateRole}
          className="px-4 py-2 text-xs font-semibold rounded-xl glass-btn-primary inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" /> Create New Job Role
        </button>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl glass-alert-error text-xs">{errorMsg}</div>
      )}
      {feedback && (
        <div className="p-3.5 rounded-xl glass-alert-success text-xs">{feedback}</div>
      )}

      {/* Role Selector Strip */}
      <div className="flex flex-wrap items-center gap-2">
        {roles.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => selectRoleForEdit(r)}
            className={`px-3.5 py-2 text-xs font-medium rounded-xl transition-all whitespace-nowrap ${
              !creatingNew && r.id === currentRole?.id
                ? 'glass-panel-active text-blue-800 font-semibold'
                : 'glass-btn-secondary'
            }`}
          >
            {r.title} {!r.active ? '(Inactive)' : ''}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Role Editor Form */}
        <form
          onSubmit={handleSaveRoleForm}
          className="lg:col-span-5 glass-panel rounded-2xl p-6 space-y-4"
        >
          <h2 className="text-base font-semibold text-slate-900">
            {creatingNew ? 'Create New Career Role' : `Edit Role: ${currentRole?.title}`}
          </h2>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Role Title</label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={160}
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              placeholder="e.g. Cloud DevOps Engineer"
              className="w-full px-3 py-2 text-sm rounded-lg glass-input"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Department</label>
            <input
              type="text"
              required
              maxLength={120}
              value={roleDept}
              onChange={(e) => setRoleDept(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg glass-input"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Role Description (min 10 chars)
            </label>
            <textarea
              required
              minLength={10}
              maxLength={3000}
              rows={4}
              value={roleDesc}
              onChange={(e) => setRoleDesc(e.target.value)}
              className="w-full p-3 text-xs rounded-xl glass-input"
            />
          </div>

          <div className="space-y-2 pt-1 text-xs text-slate-700">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={roleActive}
                onChange={(e) => setRoleActive(e.target.checked)}
              />
              <span>Active (visible to students in Career Selection)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={roleIsSample}
                onChange={(e) => setRoleIsSample(e.target.checked)}
              />
              <span>Label as illustrative sample dataset</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 disabled:opacity-60 text-xs font-semibold rounded-xl glass-btn-obsidian"
          >
            {saving
              ? 'Saving Role...'
              : creatingNew
              ? 'Create Role in Firestore'
              : 'Save Role Updates'}
          </button>
        </form>

        {/* Role Requirements Editor */}
        {!creatingNew && currentRole && (
          <div className="lg:col-span-7 glass-panel rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Required Skills &amp; Weights — {currentRole.title}
              </h2>
              <p className="text-xs text-slate-500">
                Target proficiency (1–4) and importance weight (1–5) directly drive the student Skill Match Score formula.
              </p>
            </div>

            <form
              onSubmit={handleAddOrUpdateRequirement}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end glass-well p-4 rounded-xl"
            >
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Skill Name
                </label>
                <input
                  type="text"
                  list="catalog-skills-datalist"
                  required
                  value={skillNameInput}
                  onChange={(e) => setSkillNameInput(e.target.value)}
                  placeholder="e.g. Kubernetes"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg glass-input"
                />
                <datalist id="catalog-skills-datalist">
                  {skillsCatalog.map((s) => (
                    <option key={s.id} value={s.name} />
                  ))}
                </datalist>
              </div>
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  required
                  value={skillCatInput}
                  onChange={(e) => setSkillCatInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg glass-input"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Target (1-4)
                </label>
                <select
                  value={reqProficiency}
                  onChange={(e) => setReqProficiency(Number(e.target.value) as 1 | 2 | 3 | 4)}
                  className="w-full px-2 py-1.5 text-xs font-mono rounded-lg glass-input"
                >
                  <option value={1}>L1</option>
                  <option value={2}>L2</option>
                  <option value={3}>L3</option>
                  <option value={4}>L4</option>
                </select>
              </div>
              <div className="sm:col-span-1">
                <label className="block text-[11px] font-medium text-slate-700 mb-1">Wt</label>
                <select
                  value={reqWeight}
                  onChange={(e) => setReqWeight(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
                  className="w-full px-1.5 py-1.5 text-xs font-mono rounded-lg glass-input"
                >
                  {[1, 2, 3, 4, 5].map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-1.5 px-2.5 text-xs font-semibold rounded-lg glass-btn-primary whitespace-nowrap"
                >
                  + Save
                </button>
              </div>
            </form>

            <div className="divide-y divide-slate-200/70 glass-well rounded-xl overflow-hidden">
              {currentReqs.map((req) => (
                <div
                  key={req.id}
                  className="p-3.5 flex items-center justify-between gap-4 text-xs"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {req.skillName} {!req.active && '(Deactivated)'}
                    </p>
                    <p className="text-slate-500">
                      {req.category} · Target {PROFICIENCY_LABELS[req.requiredProficiency]} · Weight{' '}
                      <span className="font-mono tabular-nums">{req.importanceWeight}/5</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleToggleRequirementActive(req)}
                    className="font-semibold text-blue-700 hover:underline whitespace-nowrap"
                  >
                    {req.active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface AdminResourcesPageProps {
  resources: LearningResource[];
  chunks: ResourceChunk[];
  resourcesFromFirestore: boolean;
  onSeedCatalog: () => Promise<void>;
  onSaveResourceAndChunks: (resource: LearningResource) => Promise<ResourceChunk[]>;
}

export const AdminResourcesPage: React.FC<AdminResourcesPageProps> = ({
  resources,
  chunks,
  resourcesFromFirestore,
  onSeedCatalog,
  onSaveResourceAndChunks,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [skillCategory, setSkillCategory] = useState('Core Java & OOP');
  const [tagsInput, setTagsInput] = useState('Java, Backend');
  const [difficulty, setDifficulty] = useState<DifficultyTier>('Intermediate');
  const [source, setSource] = useState('');
  const [url, setUrl] = useState('https://');
  const [estimatedHours, setEstimatedHours] = useState(10);
  const [description, setDescription] = useState('');
  const [searchableContent, setSearchableContent] = useState('');
  const [active, setActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadForEdit = (res: LearningResource) => {
    setEditingId(res.id);
    setTitle(res.title);
    setSkillCategory(res.skillCategory);
    setTagsInput(res.skillTags.join(', '));
    setDifficulty(res.difficulty);
    setSource(res.source);
    setUrl(res.url);
    setEstimatedHours(res.estimatedHours);
    setDescription(res.description);
    setSearchableContent(res.searchableContent);
    setActive(res.active);
    setStatusMsg(null);
    setErrorMsg(null);
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setSkillCategory('Core Java & OOP');
    setTagsInput('');
    setDifficulty('Intermediate');
    setSource('');
    setUrl('https://');
    setEstimatedHours(8);
    setDescription('');
    setSearchableContent('');
    setActive(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);
    setErrorMsg(null);
    try {
      if (!resourcesFromFirestore) {
        await onSeedCatalog();
      }
      const resId =
        editingId ||
        sanitizeId(`res_${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now()}`);

      const newChunks = await onSaveResourceAndChunks({
        id: resId,
        title,
        description,
        skillCategory,
        skillTags: tagsInput
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        difficulty,
        url,
        source,
        estimatedHours,
        searchableContent,
        active,
      });

      const syncData = await postApiJson<{
        indexedCount: number;
        embeddedCount: number;
        retrievalMethod: string;
      }>('/api/rag/index', { chunks: [...chunks, ...newChunks] });

      resetForm();
      setStatusMsg(
        `Saved learning resource, generated ${newChunks.length} metadata-preserving chunks, and indexed ${syncData.indexedCount} active chunks (${syncData.retrievalMethod}).`
      );
    } catch (err) {
      setErrorMsg(formatFriendlyError(err, 'Failed to save resource.'));
    } finally {
      setSaving(false);
    }
  };

  const handleReindexAll = async () => {
    setReindexing(true);
    setStatusMsg(null);
    setErrorMsg(null);
    try {
      const data = await postApiJson<{
        indexedCount: number;
        embeddedCount: number;
        retrievalMethod: string;
      }>('/api/rag/index', { chunks });
      setStatusMsg(
        data.retrievalMethod === 'gemini-embedding-2-preview' && data.embeddedCount > 0
          ? `RAG Embedding Sync Complete: ${data.embeddedCount}/${data.indexedCount} active chunks embedded with gemini-embedding-2-preview.`
          : `RAG Vector Sync Complete: ${data.indexedCount} active chunks indexed using TF-IDF cosine vector similarity (${data.embeddedCount} dense embeddings).`
      );
    } catch (err) {
      setErrorMsg(formatFriendlyError(err, 'Embedding sync failed.'));
    } finally {
      setReindexing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Admin Module 03 of 03 · RAG Corpus Chunking &amp; Vector Indexing
          </p>
          <h1 className="text-2xl font-bold text-slate-900">
            Learning-Resource &amp; RAG Knowledge Base Management
          </h1>
          <p className="text-sm text-slate-600">
            Add or update curated documentation. Resources are automatically cleaned, chunked into{' '}
            <span className="font-mono">/resourceChunks</span>, and embedded for RAG retrieval.
          </p>
        </div>
        <button
          type="button"
          disabled={reindexing}
          onClick={handleReindexAll}
          className="px-4 py-2 text-xs font-semibold rounded-xl glass-btn-obsidian disabled:opacity-60 inline-flex items-center gap-2 whitespace-nowrap shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${reindexing ? 'animate-spin' : ''}`} />
          {reindexing ? 'Embedding Corpus...' : `Sync Vector Embeddings (${chunks.length} chunks)`}
        </button>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl glass-alert-error text-xs">{errorMsg}</div>
      )}
      {statusMsg && (
        <div className="p-3.5 rounded-xl glass-alert-success text-xs">{statusMsg}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Add / Edit Resource Form */}
        <form
          onSubmit={handleSave}
          className="lg:col-span-5 glass-panel rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              {editingId ? 'Edit Learning Resource' : 'Add New RAG Resource'}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-slate-500 hover:text-slate-900"
              >
                Clear
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Resource Title</label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={240}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Official Spring Security Architecture Guide"
              className="w-full px-3 py-2 text-xs rounded-lg glass-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Skill Category</label>
              <input
                type="text"
                required
                maxLength={120}
                value={skillCategory}
                onChange={(e) => setSkillCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg glass-input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as DifficultyTier)}
                className="w-full px-3 py-2 text-xs rounded-lg glass-input"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Publisher / Source
              </label>
              <input
                type="text"
                required
                maxLength={160}
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. Oracle / PyData"
                className="w-full px-3 py-2 text-xs rounded-lg glass-input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Est. Hours</label>
              <input
                type="number"
                min={1}
                max={500}
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(Number(e.target.value) || 8)}
                className="w-full px-3 py-2 text-xs font-mono rounded-lg glass-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Reference URL</label>
            <input
              type="url"
              required
              maxLength={512}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded-lg glass-input"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Comma-Separated Skill Tags
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg glass-input"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Short Summary (min 5 chars)
            </label>
            <textarea
              required
              minLength={5}
              maxLength={2000}
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl glass-input"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Searchable RAG Corpus Content (chunked automatically for retrieval)
            </label>
            <textarea
              required
              minLength={15}
              maxLength={12000}
              rows={5}
              value={searchableContent}
              onChange={(e) => setSearchableContent(e.target.value)}
              placeholder="Paste syllabus topics, core technical concepts, best practices, and learning outcomes..."
              className="w-full p-2.5 text-xs rounded-xl glass-input"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            <span>Active in RAG Knowledge Base</span>
          </label>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 disabled:opacity-60 text-xs font-semibold rounded-xl glass-btn-primary"
          >
            {saving
              ? 'Chunking & Indexing...'
              : editingId
              ? 'Update Resource & Re-Chunk'
              : 'Add Resource & Generate Chunks'}
          </button>
        </form>

        {/* Resource Catalog List */}
        <div className="lg:col-span-7 glass-panel rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200/80">
            <h2 className="text-base font-semibold text-slate-900">
              Curated Learning Resources ({resources.length}) · {chunks.length} Total Chunks
            </h2>
          </div>

          <div className="divide-y divide-slate-200/70 max-h-[720px] overflow-y-auto">
            {resources.map((res) => {
              const resChunks = chunks.filter((c) => c.resourceId === res.id);
              return (
                <div key={res.id} className="p-5 space-y-2 hover:bg-white/60 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {res.title} {!res.active && '(Inactive)'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {res.skillCategory} · {res.difficulty} · {res.source} ·{' '}
                        <span className="font-mono tabular-nums">{res.estimatedHours}h</span> ·{' '}
                        <span className="font-mono tabular-nums">{resChunks.length}</span> chunks
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs shrink-0">
                      <button
                        type="button"
                        onClick={() => loadForEdit(res)}
                        className="font-semibold text-blue-700 hover:underline"
                      >
                        Edit
                      </button>
                      <a
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-500 hover:text-slate-900"
                        title="Open URL"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{res.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
