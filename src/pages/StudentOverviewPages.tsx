import React, { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowRight, CheckCircle2, History, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  AppPage,
  AssessmentAttempt,
  JobRole,
  LearningRoadmapDoc,
  PROFICIENCY_LABELS,
  ProficiencyLevel,
  ProgressSnapshot,
  ResumeRecord,
  SkillDefinition,
  SkillGapEvaluation,
  StudentSkillEntry,
  UserAccount,
} from '../types';
import { formatFriendlyError } from '../lib/firebase';

interface StudentDashboardPageProps {
  account: UserAccount;
  selectedRole: JobRole;
  evaluation: SkillGapEvaluation;
  latestResume: ResumeRecord | null;
  activeRoadmap: LearningRoadmapDoc | null;
  assessments: AssessmentAttempt[];
  progressHistory: ProgressSnapshot[];
  onNavigate: (page: AppPage, preselectedSkillId?: string) => void;
}

export const StudentDashboardPage: React.FC<StudentDashboardPageProps> = ({
  account,
  selectedRole,
  evaluation,
  latestResume,
  activeRoadmap,
  assessments,
  progressHistory,
  onNavigate,
}) => {
  const totalTasks = activeRoadmap?.tasks.length || 0;
  const completedTasks = activeRoadmap?.tasks.filter((t) => t.completed).length || 0;
  const roadmapCompletionPct =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const verifiedSkillsCount = account.confirmedSkills.filter((s) => s.verifiedByAssessment).length;

  // Dynamic workflow state guide
  let nextActionStep = 'Step 02';
  let nextActionLabel = 'Upload PDF Resume';
  let nextActionDesc =
    'Extract technical skills, projects, and certificates from your PDF resume to establish an evidence-backed baseline.';
  let nextActionPage = AppPage.RESUME_ANALYSIS;
  let nextSkillId: string | undefined;

  if (!latestResume && account.confirmedSkills.length === 0) {
    nextActionStep = 'Step 02';
    nextActionLabel = 'Upload PDF Resume';
    nextActionDesc =
      'Start by uploading your PDF resume (or testing sample extraction) so SkillGapRAG can map your initial skills.';
    nextActionPage = AppPage.RESUME_ANALYSIS;
  } else if (
    !activeRoadmap &&
    (evaluation.missingCount > 0 || evaluation.needsImprovementCount > 0)
  ) {
    nextActionStep = 'Step 05';
    nextActionLabel = 'Generate RAG Learning Roadmap';
    nextActionDesc = `You have ${evaluation.missingCount} missing and ${evaluation.needsImprovementCount} improvable skills for ${selectedRole.title}. Generate a citation-backed study plan.`;
    nextActionPage = AppPage.LEARNING_ROADMAP;
  } else if (evaluation.requiresAssessmentCount > 0) {
    const firstUnverified = evaluation.items.find((i) => i.status === 'requires_assessment');
    nextActionStep = 'Step 06';
    nextActionLabel = `Verify ${firstUnverified?.skillName || 'Skill'} via Assessment`;
    nextActionDesc =
      'Unverified resume or self-reported skills receive 80% provisional credit. Complete a short practical quiz to unlock full verified points.';
    nextActionPage = AppPage.ASSESSMENT;
    nextSkillId = firstUnverified?.skillId;
  } else if (totalTasks > 0 && completedTasks < totalTasks) {
    nextActionStep = 'Step 05';
    nextActionLabel = 'Continue Weekly Roadmap Tasks';
    nextActionDesc = `You have completed ${completedTasks} of ${totalTasks} planned study modules (${roadmapCompletionPct}%).`;
    nextActionPage = AppPage.LEARNING_ROADMAP;
  } else {
    nextActionStep = 'Step 04';
    nextActionLabel = 'Review Skill-Gap Matrix & Reassess';
    nextActionDesc =
      'Inspect per-skill weighted points or take an Advanced practical quiz to raise your verified proficiency.';
    nextActionPage = AppPage.SKILL_GAP_ANALYSIS;
  }

  const barData = evaluation.items.map((item) => ({
    skill: item.skillName.length > 18 ? `${item.skillName.slice(0, 16)}…` : item.skillName,
    Current: item.currentProficiency,
    Required: item.requiredProficiency,
  }));

  const trendData = progressHistory.slice(-10).map((snap, idx) => ({
    label: `#${idx + 1} ${new Date(snap.recordedAtIso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })}`,
    Score: snap.skillMatchScore,
  }));

  return (
    <div className="space-y-8">
      {/* Header & Recommended Next Action Glass Banner */}
      <div className="glass-panel rounded-2xl p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <p className="text-xs text-slate-500">
            {account.institution || 'Academic Profile'} · {account.degreeProgram || 'Student'} · Class of{' '}
            <span className="font-mono tabular-nums">{account.graduationYear}</span>
          </p>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {account.displayName}
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">{nextActionDesc}</p>
        </div>
        <div className="shrink-0 flex flex-col sm:items-end gap-1.5">
          <span className="text-[11px] font-mono tabular-nums text-blue-700 font-semibold">
            Recommended Next: {nextActionStep}
          </span>
          <button
            type="button"
            onClick={() => onNavigate(nextActionPage, nextSkillId)}
            className="px-4 py-2.5 text-sm font-semibold rounded-xl glass-btn-primary inline-flex items-center gap-2 whitespace-nowrap"
          >
            {nextActionLabel}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4-Metric Glass Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 glass-panel rounded-2xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 overflow-hidden">
        <div className="p-5 space-y-1">
          <p className="text-xs text-slate-500">Target Role &amp; Match Score</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {evaluation.skillMatchScore}%
          </p>
          <p className="text-xs text-slate-600 truncate">
            {selectedRole.title} ·{' '}
            <span className="font-mono tabular-nums">
              {evaluation.earnedWeightedPoints}/{evaluation.totalWeightedPoints}
            </span>{' '}
            pts
          </p>
        </div>

        <div className="p-5 space-y-1">
          <p className="text-xs text-slate-500">Confirmed Profile Skills</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {account.confirmedSkills.length}
          </p>
          <p className="text-xs text-slate-600">
            <span className="font-mono tabular-nums">{verifiedSkillsCount}</span> verified via practical quiz
          </p>
        </div>

        <div className="p-5 space-y-1">
          <p className="text-xs text-slate-500">Role Gap Breakdown</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {evaluation.missingCount + evaluation.needsImprovementCount}
          </p>
          <p className="text-xs text-slate-600">
            <span className="font-mono tabular-nums">{evaluation.missingCount}</span> missing ·{' '}
            <span className="font-mono tabular-nums">{evaluation.needsImprovementCount}</span> improve ·{' '}
            <span className="font-mono tabular-nums">{evaluation.requiresAssessmentCount}</span> unverified
          </p>
        </div>

        <div className="p-5 space-y-1">
          <p className="text-xs text-slate-500">Roadmap Task Progress</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {roadmapCompletionPct}%
          </p>
          <svg
            viewBox="0 0 100 4"
            preserveAspectRatio="none"
            className="w-full h-1.5 rounded-full overflow-hidden mt-1"
            aria-hidden="true"
          >
            <rect width="100" height="4" fill="#e2e8f0" />
            <rect width={roadmapCompletionPct} height="4" fill="#1d4ed8" />
          </svg>
          <p className="text-xs text-slate-600 pt-0.5">
            <span className="font-mono tabular-nums">
              {completedTasks}/{totalTasks}
            </span>{' '}
            tasks · <span className="font-mono tabular-nums">{assessments.length}</span> quizzes taken
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Proficiency Alignment — {selectedRole.title}
              </h2>
              <p className="text-xs text-slate-500">
                Scale 0–4 (0 = Unrecorded, 1 = Beginner, 2 = Intermediate, 3 = Advanced, 4 = Expert)
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate(AppPage.SKILL_GAP_ANALYSIS)}
              className="text-xs font-semibold text-blue-700 hover:underline whitespace-nowrap shrink-0"
            >
              Open Gap Matrix →
            </button>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 8, right: 12, left: -16, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                <XAxis dataKey="skill" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis domain={[0, 4]} ticks={[0, 1, 2, 3, 4]} tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Current" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Required" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-5 glass-panel rounded-2xl p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Historical Skill Match Trend
              </h2>
              <p className="text-xs text-slate-500">
                Saved reassessment snapshots over time (curriculum alignment %)
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate(AppPage.PROGRESS_HISTORY)}
              className="text-xs font-semibold text-blue-700 hover:underline whitespace-nowrap shrink-0"
            >
              History →
            </button>
          </div>

          {trendData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 8, right: 12, left: -16, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#475569' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#475569' }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="Score"
                    stroke="#1d4ed8"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#1d4ed8' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center px-4 glass-well rounded-xl space-y-3">
              <p className="text-sm font-medium text-slate-800">No reassessment snapshots yet</p>
              <p className="text-xs text-slate-500 max-w-xs">
                Confirm skills from your resume or complete your first practical assessment to record historical progress points.
              </p>
              <button
                type="button"
                onClick={() => onNavigate(AppPage.RESUME_ANALYSIS)}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg glass-btn-obsidian whitespace-nowrap"
              >
                Analyze Resume First
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Priority Skills Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Priority Skills for {selectedRole.title}
            </h2>
            <p className="text-xs text-slate-500">
              Note: Skill Match Score measures weighted alignment against role competencies, not hiring probability.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate(AppPage.CAREER_SELECTION)}
            className="text-xs font-semibold text-blue-700 hover:underline whitespace-nowrap shrink-0"
          >
            Switch Career Role →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 text-xs text-slate-500 bg-slate-100/50">
                <th className="py-3 px-6 font-medium">Skill</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium text-right">Current / Target</th>
                <th className="py-3 px-4 font-medium text-right">Weighted Pts</th>
                <th className="py-3 px-6 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 text-sm">
              {evaluation.items.map((item) => (
                <tr key={item.requirementId} className="hover:bg-white/60 transition-colors">
                  <td className="py-3 px-6">
                    <p className="font-medium text-slate-900">{item.skillName}</p>
                    <p className="text-xs text-slate-500">
                      {item.category} · {item.verifiedByAssessment ? 'Assessment-verified' : 'Unverified'}
                    </p>
                  </td>
                  <td className="py-3 px-4 text-xs font-semibold">
                    {item.status === 'meets_requirement' && (
                      <span className="text-emerald-700">Meets requirement</span>
                    )}
                    {item.status === 'requires_assessment' && (
                      <span className="text-blue-700">Requires assessment</span>
                    )}
                    {item.status === 'needs_improvement' && (
                      <span className="text-amber-700">Needs improvement</span>
                    )}
                    {item.status === 'missing' && (
                      <span className="text-red-700">Missing from profile</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-700">
                    L{item.currentProficiency} / L{item.requiredProficiency}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-700">
                    {item.earnedWeightedPoints} / {item.maxWeightedPoints}
                  </td>
                  <td className="py-3 px-6 text-right">
                    {item.status === 'meets_requirement' ? (
                      <span className="text-xs text-emerald-700 inline-flex items-center gap-1 justify-end font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onNavigate(AppPage.ASSESSMENT, item.skillId)}
                        className="text-xs font-semibold text-blue-700 hover:underline whitespace-nowrap"
                      >
                        Take Quiz →
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

interface ProgressHistoryPageProps {
  selectedRole: JobRole;
  evaluation: SkillGapEvaluation;
  progressHistory: ProgressSnapshot[];
  assessments: AssessmentAttempt[];
  recordingSnapshot: boolean;
  onRecordSnapshot: (reason: string) => Promise<void>;
  onNavigate: (page: AppPage, skillId?: string) => void;
}

export const ProgressHistoryPage: React.FC<ProgressHistoryPageProps> = ({
  selectedRole,
  evaluation,
  progressHistory,
  assessments,
  recordingSnapshot,
  onRecordSnapshot,
  onNavigate,
}) => {
  const [expandedAttemptId, setExpandedAttemptId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const roleSnapshots = progressHistory.filter((s) => s.roleId === selectedRole.id);
  const displaySnapshots = roleSnapshots.length > 0 ? roleSnapshots : progressHistory;

  const firstSnap = displaySnapshots[0];
  const latestSnap = displaySnapshots[displaySnapshots.length - 1];
  const scoreDelta =
    firstSnap && latestSnap ? latestSnap.skillMatchScore - firstSnap.skillMatchScore : 0;

  const chartData = displaySnapshots.map((snap, index) => ({
    point: `Snap ${index + 1} (${new Date(snap.recordedAtIso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })})`,
    MatchScore: snap.skillMatchScore,
    VerifiedSkills: snap.meetsCount,
  }));

  const handleManualSnapshot = async () => {
    setErrorMsg(null);
    try {
      await onRecordSnapshot('Manual student reassessment checkpoint');
    } catch (err) {
      setErrorMsg(formatFriendlyError(err, 'Unable to record reassessment snapshot.'));
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Step 06 · Longitudinal Progress &amp; Verification Audit
          </p>
          <h1 className="text-2xl font-bold text-slate-900">
            Reassessment &amp; Progress Comparison
          </h1>
          <p className="text-sm text-slate-600">
            Compare historical Skill Match Score snapshots and inspect verified practical assessment attempts over time.
          </p>
        </div>
        <button
          type="button"
          disabled={recordingSnapshot}
          onClick={handleManualSnapshot}
          className="px-4 py-2 disabled:opacity-60 text-sm font-medium rounded-xl glass-btn-obsidian inline-flex items-center gap-2 whitespace-nowrap shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${recordingSnapshot ? 'animate-spin' : ''}`} />
          {recordingSnapshot ? 'Recording...' : 'Record Current Reassessment Snapshot'}
        </button>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl glass-alert-error text-xs">{errorMsg}</div>
      )}

      {/* Baseline vs Current Comparison Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 glass-panel rounded-2xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 overflow-hidden">
        <div className="p-5 space-y-1">
          <p className="text-xs text-slate-500">Initial Recorded Baseline</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {firstSnap ? `${firstSnap.skillMatchScore}%` : '—'}
          </p>
          <p className="text-xs text-slate-500">
            {firstSnap
              ? `${firstSnap.roleTitle} · ${new Date(firstSnap.recordedAtIso).toLocaleDateString()}`
              : 'Record a snapshot to set baseline'}
          </p>
        </div>
        <div className="p-5 space-y-1">
          <p className="text-xs text-slate-500">Current Live Alignment ({selectedRole.title})</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {evaluation.skillMatchScore}%
          </p>
          <p className="text-xs text-slate-500 font-mono tabular-nums">
            {evaluation.earnedWeightedPoints} / {evaluation.totalWeightedPoints} weighted pts
          </p>
        </div>
        <div className="p-5 space-y-1">
          <p className="text-xs text-slate-500">Measured Change Across Snapshots</p>
          <p
            className={`text-2xl font-bold font-mono tabular-nums ${
              scoreDelta > 0
                ? 'text-emerald-700'
                : scoreDelta < 0
                ? 'text-red-700'
                : 'text-slate-900'
            }`}
          >
            {displaySnapshots.length >= 2
              ? `${scoreDelta >= 0 ? '+' : ''}${scoreDelta}%`
              : '0% (1st point)'}
          </p>
          <p className="text-xs text-slate-500">
            <span className="font-mono tabular-nums">{displaySnapshots.length}</span> snapshots ·{' '}
            <span className="font-mono tabular-nums">{assessments.length}</span> completed quizzes
          </p>
        </div>
      </div>

      {/* Historical Line Chart */}
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Skill Match Score Progression Over Time
          </h2>
          <p className="text-xs text-slate-500">
            Visualizes readiness rubric alignment across saved reassessment checkpoints.
          </p>
        </div>

        {chartData.length > 0 ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 16, left: -12, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                <XAxis dataKey="point" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="MatchScore"
                  name="Skill Match Score (%)"
                  stroke="#1d4ed8"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="py-12 text-center space-y-3 glass-well rounded-xl">
            <History className="w-6 h-6 text-slate-400 mx-auto" />
            <p className="text-sm font-medium text-slate-800">No historical checkpoints saved yet</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Click “Record Current Reassessment Snapshot” above or complete a Practical Assessment to track progress over time.
            </p>
          </div>
        )}
      </div>

      {/* Snapshot Log Table */}
      {displaySnapshots.length > 0 && (
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200/80">
            <h2 className="text-base font-semibold text-slate-900">Saved Reassessment Snapshots</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 text-xs text-slate-500 bg-slate-100/50">
                  <th className="py-3 px-6 font-medium">Timestamp</th>
                  <th className="py-3 px-4 font-medium">Target Role</th>
                  <th className="py-3 px-4 font-medium">Trigger Event</th>
                  <th className="py-3 px-4 font-medium text-right">Meets / Missing</th>
                  <th className="py-3 px-6 font-medium text-right">Match Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 text-sm">
                {[...displaySnapshots].reverse().map((s) => (
                  <tr key={s.id} className="hover:bg-white/60 transition-colors">
                    <td className="py-3 px-6 font-mono tabular-nums text-xs text-slate-600">
                      {new Date(s.recordedAtIso).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">{s.roleTitle}</td>
                    <td className="py-3 px-4 text-xs text-slate-600">{s.triggerReason}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-700">
                      {s.meetsCount} met · {s.missingCount} missing
                    </td>
                    <td className="py-3 px-6 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {s.skillMatchScore}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Past Practical Assessments Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Completed Practical Assessments (Private to You)
            </h2>
            <p className="text-xs text-slate-500">
              Click any attempt to inspect question-by-question explanations.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate(AppPage.ASSESSMENT)}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg glass-btn-primary whitespace-nowrap shrink-0"
          >
            Take New Assessment
          </button>
        </div>

        {assessments.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            You have not completed any practical assessments yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-200/70">
            {assessments.map((att) => {
              const isExpanded = expandedAttemptId === att.id;
              return (
                <div key={att.id} className="p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {att.skillName} · {att.difficulty}
                      </p>
                      <p className="text-xs text-slate-500 font-mono tabular-nums">
                        {new Date(att.completedAtIso).toLocaleString()} · {att.correctAnswers}/
                        {att.totalQuestions} correct ({att.scorePercent}%)
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-mono tabular-nums text-emerald-700 font-semibold">
                        Verified: {PROFICIENCY_LABELS[att.verifiedProficiency]}
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpandedAttemptId(isExpanded ? null : att.id)}
                        className="text-xs font-semibold text-blue-700 hover:underline whitespace-nowrap"
                      >
                        {isExpanded ? 'Hide Review' : 'Review Answers'}
                      </button>
                    </div>
                  </div>

                  {isExpanded && att.questionReviews.length > 0 && (
                    <div className="pt-3 border-t border-slate-200/70 space-y-2.5">
                      {att.questionReviews.map((rev, idx) => (
                        <div key={idx} className="text-xs space-y-1 glass-well p-3.5 rounded-xl">
                          <p className="font-semibold text-slate-900">
                            Q{idx + 1}. {rev.prompt}
                          </p>
                          <p className={rev.isCorrect ? 'text-emerald-700 font-medium' : 'text-red-700 font-medium'}>
                            Your answer: {rev.selectedOption}{' '}
                            {rev.isCorrect ? '(Correct)' : `(Incorrect — Correct: ${rev.correctOption})`}
                          </p>
                          <p className="text-slate-600 leading-relaxed">{rev.explanation}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

interface ProfileSettingsPageProps {
  account: UserAccount;
  userEmail: string | null;
  skillsCatalog: SkillDefinition[];
  saving: boolean;
  onSaveProfile: (updates: {
    displayName: string;
    institution: string;
    degreeProgram: string;
    graduationYear: number;
    weeklyStudyHours: number;
    preferredDurationWeeks: number;
    confirmedSkills: StudentSkillEntry[];
  }) => Promise<void>;
  onNavigate: (page: AppPage) => void;
  onSignOut: () => Promise<void>;
}

export const ProfileSettingsPage: React.FC<ProfileSettingsPageProps> = ({
  account,
  userEmail,
  skillsCatalog,
  saving,
  onSaveProfile,
  onNavigate,
  onSignOut,
}) => {
  const [displayName, setDisplayName] = useState(account.displayName);
  const [institution, setInstitution] = useState(account.institution);
  const [degreeProgram, setDegreeProgram] = useState(account.degreeProgram);
  const [graduationYear, setGraduationYear] = useState(account.graduationYear);
  const [weeklyStudyHours, setWeeklyStudyHours] = useState(account.weeklyStudyHours);
  const [preferredDurationWeeks, setPreferredDurationWeeks] = useState(
    account.preferredDurationWeeks
  );
  const [skills, setSkills] = useState<StudentSkillEntry[]>(account.confirmedSkills);
  const [newSkillId, setNewSkillId] = useState(skillsCatalog[0]?.id || '');
  const [newSkillLevel, setNewSkillLevel] = useState<ProficiencyLevel>(2);
  const [savedBanner, setSavedBanner] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAddManualSkill = () => {
    const def = skillsCatalog.find((s) => s.id === newSkillId);
    if (!def) return;
    if (skills.some((s) => s.skillId === def.id)) return;
    setSkills((prev) => [
      ...prev,
      {
        skillId: def.id,
        skillName: def.name,
        category: def.category,
        proficiency: newSkillLevel,
        verifiedByAssessment: false,
        source: 'manual',
        evidenceNote: 'Added manually in Profile Settings (requires assessment to verify)',
      },
    ]);
  };

  const handleRemoveSkill = (skillId: string) => {
    setSkills((prev) => prev.filter((s) => s.skillId !== skillId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavedBanner(false);
    setErrorMsg(null);
    try {
      await onSaveProfile({
        displayName,
        institution,
        degreeProgram,
        graduationYear,
        weeklyStudyHours,
        preferredDurationWeeks,
        confirmedSkills: skills,
      });
      setSavedBanner(true);
    } catch (err) {
      setErrorMsg(formatFriendlyError(err, 'Failed to save student profile settings.'));
    }
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Step 01 of 06 · Academic Profile &amp; Skill Inventory
          </p>
          <h1 className="text-2xl font-bold text-slate-900">Profile &amp; Study Settings</h1>
          <p className="text-sm text-slate-600">
            Manage your academic details, weekly learning cadence, and confirmed technical skill inventory.
          </p>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="px-4 py-2 text-xs font-semibold text-red-700 glass-btn-secondary rounded-lg whitespace-nowrap shrink-0"
        >
          Sign Out
        </button>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl glass-alert-error text-xs">{errorMsg}</div>
      )}

      {savedBanner && (
        <div className="p-3.5 rounded-xl glass-alert-success text-xs flex flex-wrap items-center justify-between gap-3">
          <span>Profile settings and skill inventory saved to Cloud Firestore.</span>
          <button
            type="button"
            onClick={() => onNavigate(AppPage.RESUME_ANALYSIS)}
            className="font-semibold underline whitespace-nowrap"
          >
            Continue to Step 02: Resume Analysis →
          </button>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="glass-panel rounded-2xl divide-y divide-slate-200/80 overflow-hidden"
      >
        <div className="p-6 sm:p-7 space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Academic Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Display Name</label>
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
                Verified Auth Account (Owner UID: <span className="font-mono">{account.uid.slice(0, 10)}…</span>)
              </label>
              <input
                type="text"
                disabled
                value={userEmail || account.uid}
                className="w-full px-3 py-2 text-sm glass-well text-slate-500 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Institution</label>
              <input
                type="text"
                maxLength={160}
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg glass-input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Degree Program</label>
              <input
                type="text"
                maxLength={160}
                value={degreeProgram}
                onChange={(e) => setDegreeProgram(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg glass-input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Graduation Year</label>
              <input
                type="number"
                min={2000}
                max={2040}
                value={graduationYear}
                onChange={(e) => setGraduationYear(Number(e.target.value) || 2026)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg glass-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Weekly Study Hours
                </label>
                <input
                  type="number"
                  min={1}
                  max={80}
                  value={weeklyStudyHours}
                  onChange={(e) => setWeeklyStudyHours(Number(e.target.value) || 8)}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg glass-input"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Roadmap Duration (Wks)
                </label>
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

        {/* Confirmed Skills Editor */}
        <div className="p-6 sm:p-7 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Confirmed Technical Skills ({skills.length})
            </h2>
            <p className="text-xs text-slate-500">
              Manually added or edited skills remain unverified until confirmed via a Practical Assessment.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={newSkillId}
              onChange={(e) => setNewSkillId(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg glass-input"
            >
              {skillsCatalog.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.category})
                </option>
              ))}
            </select>
            <select
              value={newSkillLevel}
              onChange={(e) => setNewSkillLevel(Number(e.target.value) as ProficiencyLevel)}
              className="px-3 py-2 text-xs font-mono rounded-lg glass-input"
            >
              <option value={1}>1 · Beginner</option>
              <option value={2}>2 · Intermediate</option>
              <option value={3}>3 · Advanced</option>
            </select>
            <button
              type="button"
              onClick={handleAddManualSkill}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg glass-btn-secondary whitespace-nowrap"
            >
              + Add Skill
            </button>
          </div>

          <div className="divide-y divide-slate-200/70 glass-well rounded-xl overflow-hidden">
            {skills.length === 0 ? (
              <p className="p-4 text-xs text-slate-500">No skills confirmed yet.</p>
            ) : (
              skills.map((sk) => (
                <div key={sk.skillId} className="p-3.5 flex items-center justify-between gap-4 text-xs">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{sk.skillName}</p>
                    <p className="text-slate-500 truncate">
                      {sk.category} ·{' '}
                      {sk.verifiedByAssessment ? 'Verified by Assessment' : `Unverified (${sk.source})`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono tabular-nums text-slate-700">
                      {PROFICIENCY_LABELS[sk.proficiency]}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(sk.skillId)}
                      className="text-red-700 hover:underline font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-6 sm:p-7 glass-well flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              Private resumes (<span className="font-mono">/resumes</span>) and quiz attempts (<span className="font-mono">/assessments</span>) are strictly owner-isolated.
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate(AppPage.RESUME_ANALYSIS)}
              className="px-4 py-2.5 text-xs font-semibold rounded-xl glass-btn-secondary whitespace-nowrap"
            >
              Next: Step 02 Resume →
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 disabled:opacity-60 text-sm font-semibold rounded-xl glass-btn-primary whitespace-nowrap"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
