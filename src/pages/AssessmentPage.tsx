import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, ClipboardCheck, RotateCcw, XCircle } from 'lucide-react';
import {
  AppPage,
  AssessmentQuestion,
  AssessmentQuestionReview,
  DifficultyTier,
  JobRole,
  PROFICIENCY_LABELS,
  ProficiencyLevel,
  SkillDefinition,
  SkillGapEvaluation,
} from '../types';
import { getQuestionsForSkill } from '../data/seedCatalog';
import { postApiJson } from '../lib/apiClient';
import { formatFriendlyError } from '../lib/firebase';
import { computeVerifiedProficiencyFromQuiz } from '../services/skillEngine';

interface AssessmentPageProps {
  selectedRole: JobRole;
  evaluation: SkillGapEvaluation;
  skillsCatalog: SkillDefinition[];
  initialSkillId?: string;
  submitting: boolean;
  onCompleteAssessment: (params: {
    skillId: string;
    skillName: string;
    category: string;
    difficulty: DifficultyTier;
    totalQuestions: number;
    correctAnswers: number;
    scorePercent: number;
    verifiedProficiency: ProficiencyLevel;
    questionReviews: AssessmentQuestionReview[];
  }) => Promise<{ previousMatchScore: number; newMatchScore: number }>;
  onNavigate: (page: AppPage) => void;
}

export const AssessmentPage: React.FC<AssessmentPageProps> = ({
  selectedRole,
  evaluation,
  skillsCatalog,
  initialSkillId,
  submitting,
  onCompleteAssessment,
  onNavigate,
}) => {
  const defaultSkillId =
    initialSkillId ||
    evaluation.items.find((i) => i.status !== 'meets_requirement')?.skillId ||
    evaluation.items[0]?.skillId ||
    skillsCatalog[0]?.id ||
    'skill_core_java';

  const [selectedSkillId, setSelectedSkillId] = useState<string>(defaultSkillId);
  const [difficulty, setDifficulty] = useState<DifficultyTier>('Intermediate');
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultSummary, setResultSummary] = useState<{
    correctAnswers: number;
    totalQuestions: number;
    scorePercent: number;
    verifiedProficiency: ProficiencyLevel;
    previousMatchScore: number;
    newMatchScore: number;
    reviews: AssessmentQuestionReview[];
  } | null>(null);

  useEffect(() => {
    if (initialSkillId) {
      setSelectedSkillId(initialSkillId);
      setQuizStarted(false);
      setResultSummary(null);
      setErrorMsg(null);
    }
  }, [initialSkillId]);

  const activeSkillDef =
    skillsCatalog.find((s) => s.id === selectedSkillId) || {
      id: selectedSkillId,
      name:
        evaluation.items.find((i) => i.skillId === selectedSkillId)?.skillName || selectedSkillId,
      category:
        evaluation.items.find((i) => i.skillId === selectedSkillId)?.category || 'Technical',
      description: '',
      active: true,
    };

  const handleStartQuiz = async () => {
    setLoadingQuiz(true);
    setErrorMsg(null);
    setAnswers({});
    setResultSummary(null);

    try {
      const data = await postApiJson<{ questions: AssessmentQuestion[] }>('/api/quiz/generate', {
        skillId: activeSkillDef.id,
        skillName: activeSkillDef.name,
        category: activeSkillDef.category,
        difficulty,
      });
      if (Array.isArray(data.questions) && data.questions.length > 0) {
        setQuestions(data.questions);
      } else {
        setQuestions(getQuestionsForSkill(activeSkillDef.id, activeSkillDef.name, difficulty));
      }
      setQuizStarted(true);
    } catch {
      // Seamless local fallback if network request fails
      setQuestions(getQuestionsForSkill(activeSkillDef.id, activeSkillDef.name, difficulty));
      setQuizStarted(true);
    } finally {
      setLoadingQuiz(false);
    }
  };

  const handleSubmitQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (questions.length === 0) return;
    setErrorMsg(null);

    let correctCount = 0;
    const reviews: AssessmentQuestionReview[] = questions.map((q) => {
      const chosenIdx = answers[q.id];
      const isCorrect = chosenIdx === q.correctIndex;
      if (isCorrect) correctCount += 1;
      return {
        questionId: q.id,
        prompt: q.prompt,
        selectedOption: chosenIdx !== undefined ? q.options[chosenIdx] : 'No option selected',
        correctOption: q.options[q.correctIndex],
        isCorrect,
        explanation: q.explanation,
      };
    });

    const scorePercent = Math.round((correctCount / questions.length) * 100);
    const verifiedProficiency = computeVerifiedProficiencyFromQuiz(difficulty, scorePercent);

    try {
      const { previousMatchScore, newMatchScore } = await onCompleteAssessment({
        skillId: activeSkillDef.id,
        skillName: activeSkillDef.name,
        category: activeSkillDef.category,
        difficulty,
        totalQuestions: questions.length,
        correctAnswers: correctCount,
        scorePercent,
        verifiedProficiency,
        questionReviews: reviews,
      });

      setResultSummary({
        correctAnswers: correctCount,
        totalQuestions: questions.length,
        scorePercent,
        verifiedProficiency,
        previousMatchScore,
        newMatchScore,
        reviews,
      });
    } catch (err) {
      setErrorMsg(formatFriendlyError(err, 'Unable to save assessment result to Firestore.'));
    }
  };

  const allAnswered =
    questions.length > 0 && questions.every((q) => answers[q.id] !== undefined);

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Step 06 of 06 · Objective Skill Verification · Target Role: {selectedRole.title}
          </p>
          <h1 className="text-2xl font-bold text-slate-900">
            Practical Skill Assessment &amp; Reassessment
          </h1>
          <p className="text-sm text-slate-600">
            Demonstrate technical understanding through scenario-based diagnostics. Passing verifies your proficiency in Firestore and automatically recalculates your Skill Match Score.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate(AppPage.PROGRESS_HISTORY)}
          className="px-4 py-2 text-xs font-semibold rounded-xl glass-btn-secondary whitespace-nowrap shrink-0"
        >
          View Progress History →
        </button>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl glass-alert-error text-xs">{errorMsg}</div>
      )}

      {/* Selector Glass Card */}
      <div className="glass-panel rounded-2xl p-6 sm:p-7 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-6">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Select Technical Skill to Verify
            </label>
            <select
              value={selectedSkillId}
              onChange={(e) => {
                setSelectedSkillId(e.target.value);
                setQuizStarted(false);
                setResultSummary(null);
              }}
              className="w-full px-3 py-2 text-sm rounded-lg glass-input"
            >
              <optgroup label={`Required for ${selectedRole.title}`}>
                {evaluation.items.map((item) => (
                  <option key={item.skillId} value={item.skillId}>
                    {item.skillName} — {item.statusLabel} (Target L{item.requiredProficiency})
                  </option>
                ))}
              </optgroup>
              <optgroup label="All Catalog Skills">
                {skillsCatalog
                  .filter((s) => !evaluation.items.some((i) => i.skillId === s.id))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.category})
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Difficulty Tier
            </label>
            <select
              value={difficulty}
              onChange={(e) => {
                setDifficulty(e.target.value as DifficultyTier);
                setQuizStarted(false);
                setResultSummary(null);
              }}
              className="w-full px-3 py-2 text-sm rounded-lg glass-input"
            >
              <option value="Beginner">Beginner (Up to L2)</option>
              <option value="Intermediate">Intermediate (Up to L3)</option>
              <option value="Advanced">Advanced (Up to L4)</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <button
              type="button"
              disabled={loadingQuiz}
              onClick={handleStartQuiz}
              className="w-full py-2 px-4 disabled:opacity-60 text-sm font-semibold rounded-xl glass-btn-primary inline-flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <ClipboardCheck className="w-4 h-4" />
              {loadingQuiz ? 'Preparing...' : quizStarted ? 'Restart Quiz' : 'Start Assessment'}
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Scoring rubric: Beginner ≥80% verifies L2; Intermediate ≥60% verifies L2 and ≥85% verifies L3; Advanced ≥65% verifies L3 and ≥85% verifies L4.
        </p>
      </div>

      {/* Active Quiz Form */}
      {quizStarted && !resultSummary && (
        <form
          onSubmit={handleSubmitQuiz}
          className="glass-panel rounded-2xl divide-y divide-slate-200/80 overflow-hidden"
        >
          <div className="px-6 py-4 flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold text-slate-900">
              {activeSkillDef.name} · {difficulty} Assessment
            </h2>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              {Object.keys(answers).length} / {questions.length} answered
            </span>
          </div>

          {questions.map((q, qIdx) => (
            <div key={q.id} className="p-6 space-y-3">
              <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                {qIdx + 1}. {q.prompt}
              </p>
              <div className="space-y-2">
                {q.options.map((opt, optIdx) => {
                  const checked = answers[q.id] === optIdx;
                  return (
                    <label
                      key={optIdx}
                      className={`flex items-start gap-3 p-3.5 rounded-xl cursor-pointer text-xs transition-all ${
                        checked
                          ? 'glass-panel-active text-slate-900 font-semibold'
                          : 'glass-well hover:bg-white/80 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        checked={checked}
                        onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: optIdx }))}
                        className="mt-0.5"
                      />
                      <span>{opt}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="p-6 glass-well flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-xs text-slate-600">
              Answer all {questions.length} questions to grade and record verified proficiency.
            </p>
            <button
              type="submit"
              disabled={!allAnswered || submitting}
              className="px-5 py-2.5 disabled:opacity-50 text-sm font-semibold rounded-xl glass-btn-obsidian whitespace-nowrap shrink-0"
            >
              {submitting ? 'Grading & Updating Score...' : 'Submit Practical Assessment'}
            </button>
          </div>
        </form>
      )}

      {/* Result & Feedback Card */}
      {resultSummary && (
        <div className="glass-panel rounded-2xl divide-y divide-slate-200/80 overflow-hidden">
          <div className="p-6 sm:p-7 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500">Assessment Graded &amp; Saved Privately</p>
                <h2 className="text-xl font-bold text-slate-900">
                  {activeSkillDef.name}: {resultSummary.scorePercent}% ({resultSummary.correctAnswers}/
                  {resultSummary.totalQuestions})
                </h2>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs text-slate-500">Verified Proficiency Assigned</p>
                <p className="text-base font-bold font-mono tabular-nums text-emerald-700">
                  {PROFICIENCY_LABELS[resultSummary.verifiedProficiency]}
                </p>
              </div>
            </div>

            <div className="p-4 glass-well rounded-xl flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs text-slate-700">
                <span className="font-semibold text-slate-900">
                  Reassessment Impact ({selectedRole.title}):
                </span>{' '}
                Skill Match Score updated from{' '}
                <span className="font-mono tabular-nums font-semibold">
                  {resultSummary.previousMatchScore}%
                </span>{' '}
                to{' '}
                <span className="font-mono tabular-nums font-semibold text-blue-700">
                  {resultSummary.newMatchScore}%
                </span>
                .
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleStartQuiz}
                  className="text-xs font-medium text-slate-700 hover:text-slate-900 inline-flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Retake
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate(AppPage.PROGRESS_HISTORY)}
                  className="text-xs font-semibold text-blue-700 hover:underline inline-flex items-center gap-1"
                >
                  Compare in Progress History <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-7 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Diagnostic Feedback &amp; Explanations
            </h3>
            <div className="space-y-3">
              {resultSummary.reviews.map((rev, idx) => (
                <div
                  key={rev.questionId}
                  className="p-4 glass-well rounded-xl space-y-1.5 text-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-slate-900">
                      Q{idx + 1}. {rev.prompt}
                    </p>
                    {rev.isCorrect ? (
                      <span className="text-emerald-700 font-semibold inline-flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-4 h-4" /> Correct
                      </span>
                    ) : (
                      <span className="text-red-700 font-semibold inline-flex items-center gap-1 shrink-0">
                        <XCircle className="w-4 h-4" /> Review Needed
                      </span>
                    )}
                  </div>
                  <p className={rev.isCorrect ? 'text-emerald-700 font-medium' : 'text-red-700 font-medium'}>
                    Selected: {rev.selectedOption}
                  </p>
                  {!rev.isCorrect && (
                    <p className="text-slate-900 font-medium">
                      Correct Answer: {rev.correctOption}
                    </p>
                  )}
                  <p className="text-slate-600 leading-relaxed pt-1">{rev.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
