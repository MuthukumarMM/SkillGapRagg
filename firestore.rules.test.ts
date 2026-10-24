export interface SecurityRuleAssertion {
  id: number;
  collection: string;
  attackVector: string;
  expectedOutcome: 'PERMISSION_DENIED';
}

export const SKILLGAPRAG_SECURITY_ASSERTIONS: SecurityRuleAssertion[] = [
  { id: 1, collection: 'users', attackVector: 'Self-assigning admin privilege shadow field', expectedOutcome: 'PERMISSION_DENIED' },
  { id: 2, collection: 'jobRoles', attackVector: 'Spoofed admin email with email_verified == false', expectedOutcome: 'PERMISSION_DENIED' },
  { id: 3, collection: 'resumes', attackVector: 'Administrator attempting to read private student resume', expectedOutcome: 'PERMISSION_DENIED' },
  { id: 4, collection: 'assessments', attackVector: 'Administrator attempting to read individual student quiz record', expectedOutcome: 'PERMISSION_DENIED' },
  { id: 5, collection: 'roadmaps', attackVector: 'Cross-student list query without ownerId match', expectedOutcome: 'PERMISSION_DENIED' },
  { id: 6, collection: 'jobRoles', attackVector: 'Non-admin student attempting to edit job role requirements', expectedOutcome: 'PERMISSION_DENIED' },
  { id: 7, collection: 'progress', attackVector: 'Orphaned progress write without existing /users/{uid} record', expectedOutcome: 'PERMISSION_DENIED' },
  { id: 8, collection: 'assessments', attackVector: 'Shadow field injection on assessment creation', expectedOutcome: 'PERMISSION_DENIED' },
  { id: 9, collection: 'learningResources', attackVector: 'Malformed document ID regex poisoning', expectedOutcome: 'PERMISSION_DENIED' },
  { id: 10, collection: 'roadmaps', attackVector: 'Client timestamp forgery bypassing request.time', expectedOutcome: 'PERMISSION_DENIED' },
  { id: 11, collection: 'roadmaps', attackVector: 'Value poisoning tasks array with string payload on update', expectedOutcome: 'PERMISSION_DENIED' },
  { id: 12, collection: 'resumes', attackVector: 'Mutating immutable ownerId or createdAt during update', expectedOutcome: 'PERMISSION_DENIED' },
];
