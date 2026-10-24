export enum AppPage {
  LANDING = 'landing',
  LOGIN = 'login',
  REGISTER = 'register',
  ONBOARDING = 'onboarding',
  STUDENT_DASHBOARD = 'student_dashboard',
  RESUME_ANALYSIS = 'resume_analysis',
  CAREER_SELECTION = 'career_selection',
  SKILL_GAP_ANALYSIS = 'skill_gap_analysis',
  LEARNING_ROADMAP = 'learning_roadmap',
  ASSESSMENT = 'assessment',
  PROGRESS_HISTORY = 'progress_history',
  PROFILE_SETTINGS = 'profile_settings',
  ADMIN_DASHBOARD = 'admin_dashboard',
  ADMIN_ROLES = 'admin_roles',
  ADMIN_RESOURCES = 'admin_resources',
}

export type LoginPortalRole = 'student' | 'admin';

export type ProficiencyLevel = 0 | 1 | 2 | 3 | 4;

export const PROFICIENCY_LABELS: Record<ProficiencyLevel, string> = {
  0: 'Not Recorded (0)',
  1: 'Beginner (1)',
  2: 'Intermediate (2)',
  3: 'Advanced (3)',
  4: 'Expert (4)',
};

export type DifficultyTier = 'Beginner' | 'Intermediate' | 'Advanced';

export type SkillSource = 'resume' | 'manual' | 'assessment';

export interface StudentSkillEntry {
  skillId: string;
  skillName: string;
  category: string;
  proficiency: ProficiencyLevel;
  verifiedByAssessment: boolean;
  source: SkillSource;
  evidenceNote: string;
  lastAssessedIso?: string;
}

export interface UserAccount {
  uid: string;
  displayName: string;
  institution: string;
  degreeProgram: string;
  graduationYear: number;
  weeklyStudyHours: number;
  preferredDurationWeeks: number;
  selectedRoleId: string;
  onboardingCompleted: boolean;
  confirmedSkills: StudentSkillEntry[];
  createdAtIso?: string;
  updatedAtIso?: string;
}

export interface JobRole {
  id: string;
  title: string;
  description: string;
  department: string;
  isSampleDataset: boolean;
  active: boolean;
  recommendedResourceIds: string[];
  updatedAtIso?: string;
}

export interface SkillDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  active: boolean;
}

export interface RoleRequirement {
  id: string;
  roleId: string;
  skillId: string;
  skillName: string;
  category: string;
  requiredProficiency: 1 | 2 | 3 | 4;
  importanceWeight: 1 | 2 | 3 | 4 | 5;
  active: boolean;
}

export interface ExtractedResumeSkill {
  skillId: string;
  skillName: string;
  category: string;
  suggestedProficiency: 1 | 2 | 3 | 4;
  evidenceSnippet: string;
}

export interface ResumeRecord {
  id: string;
  ownerId: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  storagePath: string;
  extractedText: string;
  extractedSkills: ExtractedResumeSkill[];
  projects: string[];
  certificates: string[];
  experienceSummary: string;
  updatedAtIso: string;
}

export type SkillComparisonStatus =
  | 'meets_requirement'
  | 'needs_improvement'
  | 'requires_assessment'
  | 'missing';

export interface SkillComparisonItem {
  requirementId: string;
  skillId: string;
  skillName: string;
  category: string;
  requiredProficiency: 1 | 2 | 3 | 4;
  currentProficiency: ProficiencyLevel;
  verifiedByAssessment: boolean;
  source: SkillSource | 'unrecorded';
  importanceWeight: number;
  earnedWeightedPoints: number;
  maxWeightedPoints: number;
  gapLevels: number;
  status: SkillComparisonStatus;
  statusLabel: string;
  guidance: string;
}

export interface SkillGapEvaluation {
  roleId: string;
  roleTitle: string;
  isSampleDataset: boolean;
  skillMatchScore: number;
  earnedWeightedPoints: number;
  totalWeightedPoints: number;
  meetsCount: number;
  needsImprovementCount: number;
  requiresAssessmentCount: number;
  missingCount: number;
  missingSkillNames: string[];
  items: SkillComparisonItem[];
  formulaExplanation: string;
}

export interface LearningResource {
  id: string;
  title: string;
  description: string;
  skillCategory: string;
  skillTags: string[];
  difficulty: DifficultyTier;
  url: string;
  source: string;
  estimatedHours: number;
  searchableContent: string;
  active: boolean;
}

export interface ResourceChunk {
  id: string;
  resourceId: string;
  resourceTitle: string;
  skillCategory: string;
  difficulty: DifficultyTier;
  source: string;
  url: string;
  chunkIndex: number;
  chunkText: string;
  active: boolean;
}

export interface RoadmapSourceAttribution {
  chunkId: string;
  resourceId: string;
  resourceTitle: string;
  source: string;
  url: string;
  difficulty: DifficultyTier;
  matchedSkillName: string;
  similarityScore: number;
  excerpt: string;
}

export interface RoadmapTaskItem {
  id: string;
  weekNumber: number;
  skillId: string;
  skillName: string;
  title: string;
  actionSteps: string;
  estimatedHours: number;
  resourceTitle: string;
  resourceSource: string;
  resourceUrl: string;
  groundedInCorpus: boolean;
  completed: boolean;
  completedAtIso?: string;
}

export interface LearningRoadmapDoc {
  id: string;
  ownerId: string;
  roleId: string;
  roleTitle: string;
  weeklyStudyHours: number;
  preferredDurationWeeks: number;
  summary: string;
  insufficientEvidenceNote: string;
  tasks: RoadmapTaskItem[];
  sourceAttributions: RoadmapSourceAttribution[];
  generatedAtIso: string;
}

export interface AssessmentQuestion {
  id: string;
  skillId: string;
  skillName: string;
  difficulty: DifficultyTier;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
}

export interface AssessmentQuestionReview {
  questionId: string;
  prompt: string;
  selectedOption: string;
  correctOption: string;
  isCorrect: boolean;
  explanation: string;
}

export interface AssessmentAttempt {
  id: string;
  ownerId: string;
  skillId: string;
  skillName: string;
  difficulty: DifficultyTier;
  totalQuestions: number;
  correctAnswers: number;
  scorePercent: number;
  verifiedProficiency: ProficiencyLevel;
  questionReviews: AssessmentQuestionReview[];
  completedAtIso: string;
}

export interface ProgressSnapshot {
  id: string;
  ownerId: string;
  roleId: string;
  roleTitle: string;
  skillMatchScore: number;
  earnedWeightedPoints: number;
  totalWeightedPoints: number;
  meetsCount: number;
  needsImprovementCount: number;
  missingCount: number;
  requiresAssessmentCount: number;
  missingSkillNames: string[];
  skillBreakdown: {
    skillId: string;
    skillName: string;
    requiredProficiency: number;
    currentProficiency: number;
    verifiedByAssessment: boolean;
    status: SkillComparisonStatus;
  }[];
  triggerReason: string;
  recordedAtIso: string;
}

export interface ActivityLog {
  id: string;
  actorUid: string;
  actorDisplayName: string;
  actorRole: 'student' | 'admin';
  actionType: string;
  summary: string;
  occurredAtIso: string;
}
