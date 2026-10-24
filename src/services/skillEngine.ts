import {
  JobRole,
  PROFICIENCY_LABELS,
  ProficiencyLevel,
  RoleRequirement,
  SkillComparisonItem,
  SkillComparisonStatus,
  SkillGapEvaluation,
  StudentSkillEntry,
} from '../types';

function normalizeSkillKey(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9+#]+/g, ' ');
}

/**
 * Dedicated Skill Comparison Service (Section 9 & Section 10).
 *
 * Epistemic safeguards enforced here:
 * 1. Absent resume/profile keywords are classified as "missing" (unrecorded in profile),
 *    never described as proof that the student lacks ability.
 * 2. Self-reported or resume-extracted skills that claim to meet target proficiency
 *    WITHOUT an objective practical assessment are classified as "requires_assessment"
 *    and capped at 80% of that skill's weighted points until verified by assessment.
 * 3. Skill Match Score = (Earned Weighted Points / Total Possible Weighted Points) * 100.
 *    It measures curriculum alignment against role requirements, NOT hiring probability.
 */
export function evaluateSkillGapForRole(
  role: JobRole,
  requirements: RoleRequirement[],
  confirmedSkills: StudentSkillEntry[]
): SkillGapEvaluation {
  const activeReqs = requirements
    .filter((req) => req.roleId === role.id && req.active)
    .sort((a, b) => b.importanceWeight - a.importanceWeight || a.skillName.localeCompare(b.skillName));

  const byId = new Map<string, StudentSkillEntry>();
  const byName = new Map<string, StudentSkillEntry>();

  for (const entry of confirmedSkills) {
    byId.set(entry.skillId, entry);
    byName.set(normalizeSkillKey(entry.skillName), entry);
  }

  let totalWeightedPoints = 0;
  let earnedWeightedPoints = 0;
  let meetsCount = 0;
  let needsImprovementCount = 0;
  let requiresAssessmentCount = 0;
  let missingCount = 0;
  const missingSkillNames: string[] = [];

  const items: SkillComparisonItem[] = activeReqs.map((req) => {
    const matched =
      byId.get(req.skillId) || byName.get(normalizeSkillKey(req.skillName)) || undefined;

    const currentProficiency: ProficiencyLevel = matched ? matched.proficiency : 0;
    const verified = matched ? Boolean(matched.verifiedByAssessment) : false;
    const source = matched ? matched.source : 'unrecorded';
    const maxPoints = req.importanceWeight;
    totalWeightedPoints += maxPoints;

    let status: SkillComparisonStatus;
    let statusLabel: string;
    let earned = 0;
    let guidance = '';

    if (currentProficiency === 0) {
      status = 'missing';
      statusLabel = 'Skill is missing';
      earned = 0;
      missingCount += 1;
      missingSkillNames.push(req.skillName);
      guidance = `Not yet recorded in your confirmed profile (target: ${PROFICIENCY_LABELS[req.requiredProficiency]}). Absence on a resume is not proof you lack ${req.skillName}—take a practical assessment if you already know it, or study it via your roadmap.`;
    } else if (currentProficiency >= req.requiredProficiency && verified) {
      status = 'meets_requirement';
      statusLabel = 'Skill meets requirement';
      earned = maxPoints;
      meetsCount += 1;
      guidance = `Verified at ${PROFICIENCY_LABELS[currentProficiency]} via practical assessment, meeting the ${PROFICIENCY_LABELS[req.requiredProficiency]} benchmark.`;
    } else if (currentProficiency >= req.requiredProficiency && !verified) {
      status = 'requires_assessment';
      statusLabel = 'Skill requires assessment';
      // Conservative 80% credit for unverified self-reported / resume-inferred proficiency
      earned = Number((maxPoints * 0.8).toFixed(2));
      requiresAssessmentCount += 1;
      guidance = `Recorded at ${PROFICIENCY_LABELS[currentProficiency]} (${source === 'resume' ? 'extracted from resume' : 'self-reported'}), which reaches target ${PROFICIENCY_LABELS[req.requiredProficiency]} but has not been verified by a practical assessment yet (80% provisional credit).`;
    } else {
      status = 'needs_improvement';
      statusLabel = 'Skill needs improvement';
      const rawRatio = currentProficiency / req.requiredProficiency;
      const verificationFactor = verified ? 1.0 : 0.85;
      earned = Number((maxPoints * rawRatio * verificationFactor).toFixed(2));
      needsImprovementCount += 1;
      guidance = `Currently at ${PROFICIENCY_LABELS[currentProficiency]} (${verified ? 'assessment-verified' : 'unverified'}) vs. required ${PROFICIENCY_LABELS[req.requiredProficiency]}. Complete targeted roadmap modules and reassess.`;
    }

    earnedWeightedPoints += earned;

    return {
      requirementId: req.id,
      skillId: req.skillId,
      skillName: req.skillName,
      category: req.category,
      requiredProficiency: req.requiredProficiency,
      currentProficiency,
      verifiedByAssessment: verified,
      source,
      importanceWeight: req.importanceWeight,
      earnedWeightedPoints: earned,
      maxWeightedPoints: maxPoints,
      gapLevels: Math.max(0, req.requiredProficiency - currentProficiency),
      status,
      statusLabel,
      guidance,
    };
  });

  const roundedEarned = Number(earnedWeightedPoints.toFixed(2));
  const roundedTotal = Number(totalWeightedPoints.toFixed(2));
  const skillMatchScore =
    roundedTotal > 0 ? Math.min(100, Math.max(0, Math.round((roundedEarned / roundedTotal) * 100))) : 0;

  return {
    roleId: role.id,
    roleTitle: role.title,
    isSampleDataset: role.isSampleDataset,
    skillMatchScore,
    earnedWeightedPoints: roundedEarned,
    totalWeightedPoints: roundedTotal,
    meetsCount,
    needsImprovementCount,
    requiresAssessmentCount,
    missingCount,
    missingSkillNames,
    items,
    formulaExplanation: `Skill Match Score = (${roundedEarned} earned weighted points ÷ ${roundedTotal} total possible weighted points) × 100 = ${skillMatchScore}%. Unverified resume or self-reported skills receive provisional credit until confirmed by a practical assessment. This score measures alignment with the role's skill rubric, not the probability of being hired.`,
  };
}

/**
 * Converts a practical assessment percentage score and difficulty tier into an objective verified proficiency level (1-4).
 */
export function computeVerifiedProficiencyFromQuiz(
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced',
  scorePercent: number
): ProficiencyLevel {
  if (scorePercent < 40) {
    return 1; // Demonstrated awareness / foundational exposure
  }
  if (difficulty === 'Beginner') {
    return scorePercent >= 80 ? 2 : 1;
  }
  if (difficulty === 'Intermediate') {
    if (scorePercent >= 85) return 3;
    if (scorePercent >= 60) return 2;
    return 1;
  }
  // Advanced
  if (scorePercent >= 85) return 4;
  if (scorePercent >= 65) return 3;
  return 2;
}
