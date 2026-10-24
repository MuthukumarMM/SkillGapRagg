import React, { useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowRight,
  BookOpen,
  CheckSquare,
  ExternalLink,
  RefreshCw,
  Square,
} from 'lucide-react';
import { postApiJson } from '../lib/apiClient';
import { formatFriendlyError } from '../lib/firebase';
import {
  AppPage,
  JobRole,
  LearningRoadmapDoc,
  PROFICIENCY_LABELS,
  ProgressSnapshot,
  ResourceChunk,
  RoadmapSourceAttribution,
  RoadmapTaskItem,
  SkillComparisonStatus,
  SkillGapEvaluation,
  UserAccount,
} from '../types';

interface SkillGapAnalysisPageProps {
  selectedRole: JobRole;
  evaluation: SkillGapEvaluation;
  progressHistory: ProgressSnapshot[];
  recordingSnapshot: boolean;
  onRecordSnapshot: (reason: string) => Promise<void>;
  onNavigate: (page: AppPage, preselectedSkillId?: string) => void;
}

export const SkillGapAnalysisPage: React.FC<SkillGapAnalysisPageProps> = ({
  selectedRole,
  evaluation,
  progressHistory,
  recordingSnapshot,
  onRecordSnapshot,
  onNavigate,
}) => {
  const [filter, setFilter] = useState<'all' | SkillComparisonStatus>('all');
  const [aiExplanation, setAiExplanation] = useState<string>('');
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [explainErr, setExplainErr] = useState<string | null>(null);
  const [snapBanner, setSnapBanner] = useState<string | null>(null);

  const filteredItems =
    filter === 'all'
      ? evaluation.items
      : evaluation.items.filter((item) => item.status === filter);

  const handleRequestExplanation = async () => {
    setLoadingExplain(true);
    setExplainErr(null);
    try {
      const data = await postApiJson<{ explanation: string }>('/api/gap/explain', {
        roleTitle: selectedRole.title,
        skillMatchScore: evaluation.skillMatchScore,
        earnedWeightedPoints: evaluation.earnedWeightedPoints,
        totalWeightedPoints: evaluation.totalWeightedPoints,
        items: evaluation.items,
      });
      setAiExplanation(data.explanation || '');
    } catch (err) {
      setExplainErr(formatFriendlyError(err, 'Unable to generate explanation.'));
    } finally {
      setLoadingExplain(false);
    }
  };

  const handleSaveCheckpoint = async () => {
    setExplainErr(null);
    setSnapBanner(null);
    try {
      await onRecordSnapshot(`Skill-gap review for ${selectedRole.title}`);
      setSnapBanner('Progress snapshot saved to Cloud Firestore trend history.');
    } catch (err) {
      setExplainErr(formatFriendlyError(err, 'Unable to save progress snapshot.'));
    }
  };

  const roleSnapshots = progressHistory.filter((s) => s.roleId === selectedRole.id);
  const matrixTrendData = (roleSnapshots.length > 0 ? roleSnapshots : progressHistory)
    .slice(-10)
    .map((snap, idx) => ({
      checkpoint: `#${idx + 1} ${new Date(snap.recordedAtIso).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })}`,
      Score: snap.skillMatchScore,
    }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Step 04 of 06 · Weighted Competency Comparison · {selectedRole.department}
          </p>
          <h1 className="text-2xl font-bold text-slate-900">
            Skill-Gap Matrix — {selectedRole.title}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {selectedRole.isSampleDataset
              ? 'Illustrative sample academic benchmark rubric'
              : 'Administrator institutional role rubric'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            disabled={recordingSnapshot}
            onClick={handleSaveCheckpoint}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl glass-btn-secondary whitespace-nowrap"
          >
            {recordingSnapshot ? 'Saving...' : 'Save Progress Snapshot'}
          </button>
          <button
            type="button"
            onClick={() => onNavigate(AppPage.LEARNING_ROADMAP)}
            className="px-4 py-2 text-xs font-semibold rounded-xl glass-btn-primary inline-flex items-center gap-2 whitespace-nowrap"
          >
            Continue to Step 05: RAG Roadmap
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {snapBanner && (
        <div className="p-3.5 rounded-xl glass-alert-success text-xs">{snapBanner}</div>
      )}

      {/* Transparent Formula Glass Panel */}
      <div className="glass-panel rounded-2xl p-6 sm:p-7 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-3 space-y-1">
            <p className="text-xs text-slate-500">Weighted Skill Match Score</p>
            <p className="text-4xl font-bold font-mono tabular-nums text-slate-900">
              {evaluation.skillMatchScore}%
            </p>
            <p className="text-xs font-mono tabular-nums text-slate-600">
              {evaluation.earnedWeightedPoints} / {evaluation.totalWeightedPoints} weighted pts
            </p>
          </div>

          <div className="md:col-span-9 space-y-2 border-t md:border-t-0 md:border-l border-slate-200/80 md:pl-6 pt-4 md:pt-0">
            <p className="text-xs font-mono text-slate-800">
              Skill Match Score = (Weighted points earned ÷ Total possible weighted points) × 100
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              {evaluation.formulaExplanation}
            </p>
            <div className="pt-1 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={loadingExplain}
                onClick={handleRequestExplanation}
                className="text-xs font-semibold text-blue-700 hover:underline whitespace-nowrap"
              >
                {loadingExplain
                  ? 'Synthesizing Advisory Summary...'
                  : aiExplanation
                  ? 'Refresh Gap Advisory Summary'
                  : 'Generate Detailed Gap Advisory →'}
              </button>
            </div>
          </div>
        </div>

        {explainErr && (
          <div className="p-3.5 rounded-xl glass-alert-error text-xs">{explainErr}</div>
        )}
        {aiExplanation && (
          <div className="p-4 glass-well rounded-xl text-sm text-slate-700 leading-relaxed whitespace-pre-line">
            {aiExplanation}
          </div>
        )}
      </div>

      {/* Historical Readiness Score Trend (Recharts) */}
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Historical Readiness Alignment Trend ({selectedRole.title})
            </h2>
            <p className="text-xs text-slate-500">
              Tracks saved Skill Match Score checkpoints across resume confirmations and practical assessments.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate(AppPage.PROGRESS_HISTORY)}
            className="text-xs font-semibold text-blue-700 hover:underline whitespace-nowrap shrink-0"
          >
            View Detailed Progress History →
          </button>
        </div>

        {matrixTrendData.length > 0 ? (
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={matrixTrendData} margin={{ top: 8, right: 16, left: -16, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                <XAxis dataKey="checkpoint" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="Score"
                  name="Skill Match Score (%)"
                  stroke="#1d4ed8"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#1d4ed8' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="py-8 px-4 text-center glass-well rounded-xl text-xs text-slate-500">
            Click “Save Progress Snapshot” above or complete a Practical Assessment to plot readiness score improvements over time.
          </div>
        )}
      </div>

      {/* Interactive Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1.5 glass-well rounded-xl">
          {[
            { id: 'all', label: `All (${evaluation.items.length})` },
            { id: 'missing', label: `Missing (${evaluation.missingCount})` },
            {
              id: 'needs_improvement',
              label: `Needs Improvement (${evaluation.needsImprovementCount})`,
            },
            {
              id: 'requires_assessment',
              label: `Requires Assessment (${evaluation.requiresAssessmentCount})`,
            },
            { id: 'meets_requirement', label: `Meets (${evaluation.meetsCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                filter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Detailed Comparison Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 text-xs text-slate-500 bg-slate-100/50">
                <th className="py-3 px-6 font-medium">Required Skill &amp; Guidance</th>
                <th className="py-3 px-4 font-medium">Classification</th>
                <th className="py-3 px-4 font-medium text-right">Current</th>
                <th className="py-3 px-4 font-medium text-right">Target</th>
                <th className="py-3 px-4 font-medium text-right">Earned / Weight</th>
                <th className="py-3 px-6 font-medium text-right">Next Step</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 text-sm">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 px-6 text-center text-xs text-slate-500">
                    No skills match the selected status filter.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.requirementId} className="hover:bg-white/60 transition-colors align-top">
                    <td className="py-4 px-6 max-w-md space-y-1">
                      <p className="font-semibold text-slate-900">{item.skillName}</p>
                      <p className="text-xs text-slate-500">
                        {item.category} · Source: {item.source} ·{' '}
                        {item.verifiedByAssessment ? 'Verified by quiz' : 'Unverified'}
                      </p>
                      <p className="text-xs text-slate-600 leading-relaxed pt-0.5">
                        {item.guidance}
                      </p>
                    </td>
                    <td className="py-4 px-4 text-xs font-semibold whitespace-nowrap">
                      {item.status === 'meets_requirement' && (
                        <span className="text-emerald-700">Skill meets requirement</span>
                      )}
                      {item.status === 'requires_assessment' && (
                        <span className="text-blue-700">Skill requires assessment</span>
                      )}
                      {item.status === 'needs_improvement' && (
                        <span className="text-amber-700">Skill needs improvement</span>
                      )}
                      {item.status === 'missing' && (
                        <span className="text-red-700">Skill is missing</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right font-mono tabular-nums text-xs text-slate-700 whitespace-nowrap">
                      {PROFICIENCY_LABELS[item.currentProficiency]}
                    </td>
                    <td className="py-4 px-4 text-right font-mono tabular-nums text-xs text-slate-700 whitespace-nowrap">
                      {PROFICIENCY_LABELS[item.requiredProficiency]}
                    </td>
                    <td className="py-4 px-4 text-right font-mono tabular-nums text-xs font-semibold text-slate-900 whitespace-nowrap">
                      {item.earnedWeightedPoints} / {item.maxWeightedPoints}
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      {item.status === 'meets_requirement' ? (
                        <span className="text-xs text-emerald-700 font-medium">Benchmark Met</span>
                      ) : (
                        <div className="flex flex-col items-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onNavigate(AppPage.ASSESSMENT, item.skillId)}
                            className="text-xs font-semibold text-blue-700 hover:underline"
                          >
                            Verify via Assessment →
                          </button>
                          <button
                            type="button"
                            onClick={() => onNavigate(AppPage.LEARNING_ROADMAP)}
                            className="text-xs text-slate-600 hover:text-slate-900 hover:underline"
                          >
                            Study in Roadmap
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

interface LearningRoadmapPageProps {
  account: UserAccount;
  selectedRole: JobRole;
  evaluation: SkillGapEvaluation;
  activeRoadmap: LearningRoadmapDoc | null;
  chunks: ResourceChunk[];
  onSaveGeneratedRoadmap: (roadmap: Omit<LearningRoadmapDoc, 'id' | 'ownerId'>) => Promise<void>;
  onToggleTask: (roadmap: LearningRoadmapDoc, taskId: string) => Promise<void>;
  onNavigate: (page: AppPage, skillId?: string) => void;
}

export const LearningRoadmapPage: React.FC<LearningRoadmapPageProps> = ({
  account,
  selectedRole,
  evaluation,
  activeRoadmap,
  chunks,
  onSaveGeneratedRoadmap,
  onToggleTask,
  onNavigate,
}) => {
  const [weeklyHours, setWeeklyHours] = useState<number>(
    activeRoadmap?.weeklyStudyHours || account.weeklyStudyHours || 8
  );
  const [durationWeeks, setDurationWeeks] = useState<number>(
    activeRoadmap?.preferredDurationWeeks || account.preferredDurationWeeks || 6
  );
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGenerateRoadmap = async () => {
    setGenerating(true);
    setErrorMsg(null);
    try {
      const data = await postApiJson<{
        summary: string;
        insufficientEvidenceNote: string;
        tasks: RoadmapTaskItem[];
        sourceAttributions: RoadmapSourceAttribution[];
      }>('/api/rag/roadmap', {
        roleTitle: selectedRole.title,
        gapItems: evaluation.items,
        weeklyStudyHours: weeklyHours,
        preferredDurationWeeks: durationWeeks,
        chunks,
      });

      await onSaveGeneratedRoadmap({
        roleId: selectedRole.id,
        roleTitle: selectedRole.title,
        weeklyStudyHours: weeklyHours,
        preferredDurationWeeks: durationWeeks,
        summary: data.summary || '',
        insufficientEvidenceNote: data.insufficientEvidenceNote || '',
        tasks: Array.isArray(data.tasks) ? data.tasks : [],
        sourceAttributions: Array.isArray(data.sourceAttributions) ? data.sourceAttributions : [],
        generatedAtIso: new Date().toISOString(),
      });
    } catch (err) {
      setErrorMsg(formatFriendlyError(err, 'Roadmap generation failed.'));
    } finally {
      setGenerating(false);
    }
  };

  const handleSafeToggleTask = async (roadmapDoc: LearningRoadmapDoc, taskId: string) => {
    setErrorMsg(null);
    try {
      await onToggleTask(roadmapDoc, taskId);
    } catch (err) {
      setErrorMsg(formatFriendlyError(err, 'Unable to update task completion status.'));
    }
  };

  const tasks: RoadmapTaskItem[] = activeRoadmap?.tasks || [];
  const completedCount = tasks.filter((t) => t.completed).length;
  const pct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Header & Generation Controls */}
      <div className="glass-panel rounded-2xl p-6 sm:p-7 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Step 05 of 06 · Retrieval-Augmented Generation ·{' '}
              <span className="font-mono tabular-nums">{chunks.length}</span> active knowledge chunks indexed
            </p>
            <h1 className="text-2xl font-bold text-slate-900">
              Personalised Learning Roadmap — {selectedRole.title}
            </h1>
            <p className="text-sm text-slate-600 max-w-2xl">
              Retrieves relevant chunks from the curated knowledge base via semantic cosine similarity and builds a week-by-week study schedule tailored to your skill gaps.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3 shrink-0">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Hours / Week
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={weeklyHours}
                onChange={(e) => setWeeklyHours(Number(e.target.value) || 8)}
                className="w-24 px-3 py-2 text-xs font-mono tabular-nums rounded-lg glass-input"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Duration (Weeks)
              </label>
              <input
                type="number"
                min={1}
                max={52}
                value={durationWeeks}
                onChange={(e) => setDurationWeeks(Number(e.target.value) || 6)}
                className="w-28 px-3 py-2 text-xs font-mono tabular-nums rounded-lg glass-input"
              />
            </div>
            <button
              type="button"
              disabled={generating}
              onClick={handleGenerateRoadmap}
              className="px-4 py-2 disabled:opacity-60 text-xs font-semibold rounded-xl glass-btn-primary inline-flex items-center gap-2 whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
              {generating
                ? 'Retrieving Chunks & Generating...'
                : activeRoadmap
                ? 'Regenerate Roadmap'
                : 'Generate Personalised Roadmap'}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl glass-alert-error text-xs">{errorMsg}</div>
        )}
      </div>

      {!activeRoadmap ? (
        <div className="glass-panel rounded-2xl p-12 text-center space-y-3">
          <BookOpen className="w-7 h-7 text-slate-400 mx-auto" />
          <h2 className="text-base font-semibold text-slate-900">
            No roadmap generated for {selectedRole.title} yet
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Click “Generate Personalised Roadmap” above to run RAG retrieval over the learning resource corpus and build your weekly study tasks.
          </p>
        </div>
      ) : (
        <>
          {/* Summary & Epistemic Notice */}
          <div className="glass-panel rounded-2xl p-6 sm:p-7 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Study Plan Strategy</h2>
                <p className="text-xs text-slate-500 font-mono tabular-nums">
                  Generated {new Date(activeRoadmap.generatedAtIso).toLocaleString()} ·{' '}
                  {activeRoadmap.weeklyStudyHours} hrs/wk · {activeRoadmap.preferredDurationWeeks} weeks
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold font-mono tabular-nums text-slate-900">
                  {completedCount}/{tasks.length} tasks ({pct}%)
                </p>
                <p className="text-[11px] text-slate-500">
                  Study progress (verify proficiency in Step 06)
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed">{activeRoadmap.summary}</p>

            {activeRoadmap.insufficientEvidenceNote && (
              <div className="p-3.5 rounded-xl glass-alert-warn text-xs leading-relaxed">
                {activeRoadmap.insufficientEvidenceNote}
              </div>
            )}
          </div>

          {/* Weekly Tasks Checklist */}
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Structured Weekly Study Modules
                </h2>
                <p className="text-xs text-slate-500">
                  Checking off a module records study task completion. Take a Practical Assessment afterward to demonstrate and verify skill mastery.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate(AppPage.ASSESSMENT)}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl glass-btn-obsidian inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                Continue to Step 06: Assessments <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-200/70">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-5 flex items-start gap-4 hover:bg-white/60 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => handleSafeToggleTask(activeRoadmap, task.id)}
                    className="mt-0.5 text-slate-700 hover:text-blue-700 shrink-0"
                    aria-label={`Mark ${task.title} as ${task.completed ? 'incomplete' : 'complete'}`}
                  >
                    {task.completed ? (
                      <CheckSquare className="w-5 h-5 text-blue-700" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-400" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p
                        className={`text-sm font-semibold ${
                          task.completed ? 'line-through text-slate-400' : 'text-slate-900'
                        }`}
                      >
                        Week {task.weekNumber}: {task.title}
                      </p>
                      <span className="text-xs font-mono tabular-nums text-slate-500">
                        ~{task.estimatedHours} hrs · {task.skillName}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{task.actionSteps}</p>

                    <div className="pt-1 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="text-slate-500">
                        {task.groundedInCorpus && task.resourceUrl ? (
                          <a
                            href={task.resourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-700 hover:underline inline-flex items-center gap-1 font-medium"
                          >
                            Source: {task.resourceTitle} ({task.resourceSource})
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span>{task.resourceTitle}</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onNavigate(AppPage.ASSESSMENT, task.skillId)}
                        className="font-semibold text-blue-700 hover:underline whitespace-nowrap"
                      >
                        Take Practical Quiz →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grounded RAG Source Attributions */}
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200/80">
              <h2 className="text-base font-semibold text-slate-900">
                Retrieved RAG Knowledge Chunks &amp; Source Attribution (
                {activeRoadmap.sourceAttributions.length})
              </h2>
              <p className="text-xs text-slate-500">
                Every cited study module above was grounded strictly in these retrieved knowledge base chunks.
              </p>
            </div>

            {activeRoadmap.sourceAttributions.length === 0 ? (
              <p className="p-6 text-xs text-slate-500">
                No knowledge base chunks exceeded the semantic similarity threshold for the current skill gaps.
              </p>
            ) : (
              <div className="divide-y divide-slate-200/70">
                {activeRoadmap.sourceAttributions.map((attr) => (
                  <div key={attr.chunkId} className="p-5 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{attr.resourceTitle}</p>
                      <span className="text-xs font-mono tabular-nums text-slate-600">
                        Cosine Similarity: {(attr.similarityScore * 100).toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {attr.source} · {attr.difficulty} · Matched gap: {attr.matchedSkillName} · Chunk ID:{' '}
                      <span className="font-mono">{attr.chunkId}</span>
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed pt-1">{attr.excerpt}</p>
                    <div className="pt-1">
                      <a
                        href={attr.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-blue-700 hover:underline inline-flex items-center gap-1"
                      >
                        Open Reference Documentation <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
