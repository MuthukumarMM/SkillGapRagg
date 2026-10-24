import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  setDoc,
  updateDoc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
  writeBatch,
} from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  ActivityLog,
  AssessmentAttempt,
  JobRole,
  LearningResource,
  LearningRoadmapDoc,
  ProgressSnapshot,
  ResourceChunk,
  ResumeRecord,
  RoadmapTaskItem,
  RoleRequirement,
  SkillDefinition,
  StudentSkillEntry,
  UserAccount,
} from '../types';
import {
  chunkLearningResource,
  SEED_JOB_ROLES,
  SEED_LEARNING_RESOURCES,
  SEED_ROLE_REQUIREMENTS,
  SEED_SKILLS,
} from '../data/seedCatalog';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);

export const BOOTSTRAPPED_ADMIN_EMAIL = 'muthum.ug.24.cs@francisxavier.ac.in';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot (Mandatory check)
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120) || `id_${Date.now()}`;
}

export function formatFriendlyError(error: unknown, fallback = 'An unexpected error occurred.'): string {
  const raw = error instanceof Error ? error.message : String(error || '');
  if (!raw) return fallback;

  if (raw.includes('auth/popup-closed-by-user') || raw.includes('auth/cancelled-popup-request')) {
    return 'Google Sign-In popup was closed before completing authentication. Click the button again to sign in.';
  }
  if (raw.includes('auth/popup-blocked')) {
    return 'Your browser blocked the Google Sign-In popup window. Please allow popups for this site and try again.';
  }
  if (raw.includes('auth/unauthorized-domain')) {
    return 'This preview domain is not yet authorized in Firebase Authentication > Settings > Authorized domains.';
  }

  // Unpack JSON-serialized FirestoreErrorInfo cleanly for UI display while keeping console logs intact
  if (raw.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.error === 'string') {
        if (parsed.error.includes('Missing or insufficient permissions')) {
          return `Permission denied on ${parsed.path || 'database operation'}. Verify your account has a verified email and required role privileges.`;
        }
        return parsed.error;
      }
    } catch {
      // fall through
    }
  }

  return raw;
}

export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    const cred = await signInWithPopup(auth, provider);
    return cred.user;
  } catch (err) {
    throw new Error(formatFriendlyError(err, 'Google authentication failed.'));
  }
}

export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

export async function checkIsUserAdmin(user: User | null): Promise<boolean> {
  if (!user || !user.emailVerified) return false;
  if (user.email === BOOTSTRAPPED_ADMIN_EMAIL) return true;
  const safeUid = sanitizeId(user.uid);
  try {
    const snap = await getDoc(doc(db, 'admins', safeUid));
    return snap.exists();
  } catch {
    return false;
  }
}

const inflightUserEnsure = new Map<string, Promise<UserAccount>>();

export async function ensureUserAccount(user: User): Promise<UserAccount> {
  const uid = sanitizeId(user.uid);
  const existingPromise = inflightUserEnsure.get(uid);
  if (existingPromise) {
    return existingPromise;
  }

  const run = (async (): Promise<UserAccount> => {
    const path = `users/${uid}`;
    const ref = doc(db, 'users', uid);

    try {
      const snap = await getDoc(ref);
      const defaultName = (user.displayName || user.email?.split('@')[0] || 'Student')
        .trim()
        .slice(0, 120);

      if (!snap.exists()) {
        const initial: Omit<UserAccount, 'createdAtIso' | 'updatedAtIso'> = {
          uid,
          displayName: defaultName || 'Student',
          institution: '',
          degreeProgram: '',
          graduationYear: 2026,
          weeklyStudyHours: 8,
          preferredDurationWeeks: 6,
          selectedRoleId: 'role_java_developer',
          onboardingCompleted: false,
          confirmedSkills: [],
        };
        try {
          await setDoc(ref, {
            ...initial,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          await logSystemActivity(
            uid,
            initial.displayName,
            'student',
            'account_registered',
            'Created student account'
          );
          return initial;
        } catch (writeErr) {
          // Handle cross-tab or concurrent creation race where document was just created
          const retrySnap = await getDocFromServer(ref);
          if (retrySnap.exists()) {
            return mapUserDoc(uid, retrySnap.data());
          }
          throw writeErr;
        }
      }

      return mapUserDoc(uid, snap.data());
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  })();

  inflightUserEnsure.set(uid, run);
  try {
    return await run;
  } finally {
    inflightUserEnsure.delete(uid);
  }
}

function mapUserDoc(uid: string, d: Record<string, any>): UserAccount {
  return {
    uid: d.uid || uid,
    displayName: d.displayName || 'Student',
    institution: d.institution || '',
    degreeProgram: d.degreeProgram || '',
    graduationYear: Number(d.graduationYear) || 2026,
    weeklyStudyHours: Number(d.weeklyStudyHours) || 8,
    preferredDurationWeeks: Number(d.preferredDurationWeeks) || 6,
    selectedRoleId: d.selectedRoleId || 'role_java_developer',
    onboardingCompleted: Boolean(d.onboardingCompleted),
    confirmedSkills: Array.isArray(d.confirmedSkills) ? d.confirmedSkills : [],
    createdAtIso: d.createdAt?.toDate?.()?.toISOString?.(),
    updatedAtIso: d.updatedAt?.toDate?.()?.toISOString?.(),
  };
}

export function subscribeCurrentUserAccount(
  uid: string,
  onData: (account: UserAccount | null) => void
): Unsubscribe {
  const safeUid = sanitizeId(uid);
  const path = `users/${safeUid}`;
  return onSnapshot(
    doc(db, 'users', safeUid),
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      onData(mapUserDoc(safeUid, snap.data()));
    },
    (error) => handleFirestoreError(error, OperationType.GET, path)
  );
}

export async function updateStudentProfile(
  uid: string,
  updates: {
    displayName: string;
    institution: string;
    degreeProgram: string;
    graduationYear: number;
    weeklyStudyHours: number;
    preferredDurationWeeks: number;
    selectedRoleId: string;
    onboardingCompleted: boolean;
    confirmedSkills: StudentSkillEntry[];
  }
): Promise<void> {
  const safeUid = sanitizeId(uid);
  const path = `users/${safeUid}`;
  try {
    await updateDoc(doc(db, 'users', safeUid), {
      displayName: updates.displayName.trim().slice(0, 120) || 'Student',
      institution: updates.institution.trim().slice(0, 160),
      degreeProgram: updates.degreeProgram.trim().slice(0, 160),
      graduationYear: Math.min(2040, Math.max(2000, Math.round(Number(updates.graduationYear) || 2026))),
      weeklyStudyHours: Math.min(80, Math.max(1, Math.round(Number(updates.weeklyStudyHours) || 8))),
      preferredDurationWeeks: Math.min(52, Math.max(1, Math.round(Number(updates.preferredDurationWeeks) || 6))),
      selectedRoleId: sanitizeId(updates.selectedRoleId || 'role_java_developer'),
      onboardingCompleted: Boolean(updates.onboardingCompleted),
      confirmedSkills: updates.confirmedSkills.slice(0, 40).map((s) => ({
        skillId: sanitizeId(s.skillId),
        skillName: String(s.skillName).slice(0, 120),
        category: String(s.category || 'Technical').slice(0, 100),
        proficiency: Math.min(4, Math.max(0, Math.round(Number(s.proficiency) || 0))),
        verifiedByAssessment: Boolean(s.verifiedByAssessment),
        source: s.source || 'manual',
        evidenceNote: String(s.evidenceNote || '').slice(0, 240),
        ...(s.lastAssessedIso ? { lastAssessedIso: String(s.lastAssessedIso).slice(0, 64) } : {}),
      })),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function adminUpdatePermittedStudentInfo(
  studentUid: string,
  updates: {
    institution: string;
    degreeProgram: string;
    graduationYear: number;
    onboardingCompleted: boolean;
  }
): Promise<void> {
  const safeUid = sanitizeId(studentUid);
  const path = `users/${safeUid}`;
  try {
    await updateDoc(doc(db, 'users', safeUid), {
      institution: updates.institution.trim().slice(0, 160),
      degreeProgram: updates.degreeProgram.trim().slice(0, 160),
      graduationYear: Math.min(2040, Math.max(2000, Math.round(Number(updates.graduationYear) || 2026))),
      onboardingCompleted: Boolean(updates.onboardingCompleted),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function grantAdminAccessToUid(targetUid: string, grantedByUid: string): Promise<void> {
  const safeTarget = sanitizeId(targetUid);
  const path = `admins/${safeTarget}`;
  try {
    await setDoc(doc(db, 'admins', safeTarget), {
      uid: safeTarget,
      grantedBy: sanitizeId(grantedByUid),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeAllUsersForAdmin(
  onData: (users: UserAccount[]) => void
): Unsubscribe {
  const path = 'users';
  return onSnapshot(
    collection(db, 'users'),
    (snap) => {
      const list = snap.docs.map((d) => mapUserDoc(d.id, d.data()));
      list.sort((a, b) => a.displayName.localeCompare(b.displayName));
      onData(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

// Catalog Subscriptions (JobRoles, Skills, RoleRequirements, LearningResources, ResourceChunks)
export function subscribeCatalogJobRoles(
  isAdminMode: boolean,
  onData: (roles: JobRole[], fromFirestore: boolean) => void
): Unsubscribe {
  const path = 'jobRoles';
  const q = isAdminMode
    ? collection(db, 'jobRoles')
    : query(collection(db, 'jobRoles'), where('active', '==', true));

  return onSnapshot(
    q,
    (snap) => {
      if (snap.empty) {
        onData(
          isAdminMode ? SEED_JOB_ROLES : SEED_JOB_ROLES.filter((r) => r.active),
          false
        );
        return;
      }
      const roles: JobRole[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title || 'Career Role',
          description: data.description || '',
          department: data.department || 'Engineering',
          isSampleDataset: Boolean(data.isSampleDataset),
          active: Boolean(data.active),
          recommendedResourceIds: Array.isArray(data.recommendedResourceIds)
            ? data.recommendedResourceIds
            : [],
          updatedAtIso: data.updatedAt?.toDate?.()?.toISOString?.(),
        };
      });
      roles.sort((a, b) => a.title.localeCompare(b.title));
      onData(roles, true);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeCatalogSkills(
  isAdminMode: boolean,
  onData: (skills: SkillDefinition[]) => void
): Unsubscribe {
  const path = 'skills';
  const q = isAdminMode
    ? collection(db, 'skills')
    : query(collection(db, 'skills'), where('active', '==', true));

  return onSnapshot(
    q,
    (snap) => {
      if (snap.empty) {
        onData(isAdminMode ? SEED_SKILLS : SEED_SKILLS.filter((s) => s.active));
        return;
      }
      const list: SkillDefinition[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || d.id,
          category: data.category || 'Technical',
          description: data.description || '',
          active: Boolean(data.active),
        };
      });
      list.sort((a, b) => a.name.localeCompare(b.name));
      onData(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeCatalogRequirements(
  isAdminMode: boolean,
  onData: (reqs: RoleRequirement[]) => void
): Unsubscribe {
  const path = 'roleRequirements';
  const q = isAdminMode
    ? collection(db, 'roleRequirements')
    : query(collection(db, 'roleRequirements'), where('active', '==', true));

  return onSnapshot(
    q,
    (snap) => {
      if (snap.empty) {
        onData(
          isAdminMode
            ? SEED_ROLE_REQUIREMENTS
            : SEED_ROLE_REQUIREMENTS.filter((r) => r.active)
        );
        return;
      }
      const list: RoleRequirement[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          roleId: data.roleId,
          skillId: data.skillId,
          skillName: data.skillName,
          category: data.category || 'Technical',
          requiredProficiency: (Math.min(4, Math.max(1, Number(data.requiredProficiency) || 2)) as 1 | 2 | 3 | 4),
          importanceWeight: (Math.min(5, Math.max(1, Number(data.importanceWeight) || 3)) as 1 | 2 | 3 | 4 | 5),
          active: Boolean(data.active),
        };
      });
      onData(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeCatalogResources(
  isAdminMode: boolean,
  onData: (resources: LearningResource[], fromFirestore: boolean) => void
): Unsubscribe {
  const path = 'learningResources';
  const q = isAdminMode
    ? collection(db, 'learningResources')
    : query(collection(db, 'learningResources'), where('active', '==', true));

  return onSnapshot(
    q,
    (snap) => {
      if (snap.empty) {
        onData(
          isAdminMode
            ? SEED_LEARNING_RESOURCES
            : SEED_LEARNING_RESOURCES.filter((r) => r.active),
          false
        );
        return;
      }
      const list: LearningResource[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title || 'Resource',
          description: data.description || '',
          skillCategory: data.skillCategory || 'General',
          skillTags: Array.isArray(data.skillTags) ? data.skillTags : [],
          difficulty: data.difficulty || 'Intermediate',
          url: data.url || 'https://developer.mozilla.org',
          source: data.source || 'Documentation',
          estimatedHours: Number(data.estimatedHours) || 8,
          searchableContent: data.searchableContent || '',
          active: Boolean(data.active),
        };
      });
      list.sort((a, b) => a.title.localeCompare(b.title));
      onData(list, true);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeCatalogChunks(
  isAdminMode: boolean,
  onData: (chunks: ResourceChunk[]) => void
): Unsubscribe {
  const path = 'resourceChunks';
  const q = isAdminMode
    ? collection(db, 'resourceChunks')
    : query(collection(db, 'resourceChunks'), where('active', '==', true));

  return onSnapshot(
    q,
    (snap) => {
      if (snap.empty) {
        const fallback = SEED_LEARNING_RESOURCES.filter((r) => isAdminMode || r.active).flatMap(
          (r) => chunkLearningResource(r)
        );
        onData(fallback);
        return;
      }
      const list: ResourceChunk[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          resourceId: data.resourceId,
          resourceTitle: data.resourceTitle,
          skillCategory: data.skillCategory,
          difficulty: data.difficulty || 'Intermediate',
          source: data.source,
          url: data.url,
          chunkIndex: Number(data.chunkIndex) || 0,
          chunkText: data.chunkText || '',
          active: Boolean(data.active),
        };
      });
      list.sort((a, b) => a.id.localeCompare(b.id));
      onData(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

// Administrator Catalog Bootstrap & Management
export async function seedCatalogToFirestore(adminUid: string, adminName: string): Promise<void> {
  try {
    // 1. Seed Job Roles, Skills, and Learning Resources first (preserving createdAt if already seeded)
    const batch1 = writeBatch(db);
    for (const role of SEED_JOB_ROLES) {
      const ref = doc(db, 'jobRoles', role.id);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        batch1.set(ref, {
          ...role,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        batch1.update(ref, {
          title: role.title,
          description: role.description,
          department: role.department,
          isSampleDataset: role.isSampleDataset,
          active: role.active,
          recommendedResourceIds: role.recommendedResourceIds,
          updatedAt: serverTimestamp(),
        });
      }
    }
    for (const skill of SEED_SKILLS) {
      const ref = doc(db, 'skills', skill.id);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        batch1.set(ref, {
          ...skill,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        batch1.update(ref, {
          name: skill.name,
          category: skill.category,
          description: skill.description,
          active: skill.active,
          updatedAt: serverTimestamp(),
        });
      }
    }
    for (const resource of SEED_LEARNING_RESOURCES) {
      const ref = doc(db, 'learningResources', resource.id);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        batch1.set(ref, {
          ...resource,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        batch1.update(ref, {
          title: resource.title,
          description: resource.description,
          skillCategory: resource.skillCategory,
          skillTags: resource.skillTags,
          difficulty: resource.difficulty,
          url: resource.url,
          source: resource.source,
          estimatedHours: resource.estimatedHours,
          searchableContent: resource.searchableContent,
          active: resource.active,
          updatedAt: serverTimestamp(),
        });
      }
    }
    await batch1.commit();

    // 2. Seed Role Requirements & Resource Chunks (now parent jobRoles & learningResources exist)
    const batch2 = writeBatch(db);
    for (const req of SEED_ROLE_REQUIREMENTS) {
      const ref = doc(db, 'roleRequirements', req.id);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        batch2.set(ref, {
          ...req,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        batch2.update(ref, {
          skillId: req.skillId,
          skillName: req.skillName,
          category: req.category,
          requiredProficiency: req.requiredProficiency,
          importanceWeight: req.importanceWeight,
          active: req.active,
          updatedAt: serverTimestamp(),
        });
      }
    }
    const allChunks = SEED_LEARNING_RESOURCES.flatMap((res) => chunkLearningResource(res));
    for (const chunk of allChunks) {
      const ref = doc(db, 'resourceChunks', chunk.id);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        batch2.set(ref, {
          ...chunk,
          createdAt: serverTimestamp(),
        });
      } else {
        batch2.update(ref, {
          resourceTitle: chunk.resourceTitle,
          skillCategory: chunk.skillCategory,
          difficulty: chunk.difficulty,
          source: chunk.source,
          url: chunk.url,
          chunkIndex: chunk.chunkIndex,
          chunkText: chunk.chunkText,
          active: chunk.active,
        });
      }
    }
    await batch2.commit();

    await logSystemActivity(
      adminUid,
      adminName,
      'admin',
      'catalog_seeded',
      `Initialized Firestore catalog with ${SEED_JOB_ROLES.length} roles, ${SEED_SKILLS.length} skills, and ${allChunks.length} RAG chunks.`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'jobRoles/learningResources');
  }
}

export async function adminSaveJobRole(
  role: JobRole,
  _isNew: boolean,
  adminUid: string,
  adminName: string
): Promise<void> {
  const safeId = sanitizeId(role.id);
  const path = `jobRoles/${safeId}`;
  const ref = doc(db, 'jobRoles', safeId);

  try {
    const cleanPayload = {
      id: safeId,
      title: role.title.trim().slice(0, 160),
      description: role.description.trim().slice(0, 3000),
      department: role.department.trim().slice(0, 120) || 'Engineering',
      isSampleDataset: Boolean(role.isSampleDataset),
      active: Boolean(role.active),
      recommendedResourceIds: (role.recommendedResourceIds || [])
        .map((id) => sanitizeId(id))
        .slice(0, 30),
    };

    const existingSnap = await getDoc(ref);
    if (!existingSnap.exists()) {
      await setDoc(ref, {
        ...cleanPayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        title: cleanPayload.title,
        description: cleanPayload.description,
        department: cleanPayload.department,
        isSampleDataset: cleanPayload.isSampleDataset,
        active: cleanPayload.active,
        recommendedResourceIds: cleanPayload.recommendedResourceIds,
        updatedAt: serverTimestamp(),
      });
    }

    await logSystemActivity(
      adminUid,
      adminName,
      'admin',
      existingSnap.exists() ? 'role_updated' : 'role_created',
      `${existingSnap.exists() ? 'Updated' : 'Created'} job role: ${cleanPayload.title} (${cleanPayload.active ? 'Active' : 'Deactivated'})`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function adminSaveSkillAndRequirement(
  skill: SkillDefinition,
  requirement: RoleRequirement,
  adminUid: string,
  adminName: string
): Promise<void> {
  const safeSkillId = sanitizeId(skill.id);
  const safeReqId = sanitizeId(requirement.id);
  try {
    const skillRef = doc(db, 'skills', safeSkillId);
    const skillSnap = await getDoc(skillRef);
    if (!skillSnap.exists()) {
      await setDoc(skillRef, {
        id: safeSkillId,
        name: skill.name.trim().slice(0, 120),
        category: skill.category.trim().slice(0, 100) || 'Technical',
        description: skill.description.trim().slice(0, 1000),
        active: Boolean(skill.active),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    const reqRef = doc(db, 'roleRequirements', safeReqId);
    const reqSnap = await getDoc(reqRef);
    if (!reqSnap.exists()) {
      await setDoc(reqRef, {
        id: safeReqId,
        roleId: sanitizeId(requirement.roleId),
        skillId: safeSkillId,
        skillName: requirement.skillName.trim().slice(0, 120),
        category: requirement.category.trim().slice(0, 100) || 'Technical',
        requiredProficiency: Math.min(4, Math.max(1, Math.round(requirement.requiredProficiency))),
        importanceWeight: Math.min(5, Math.max(1, Math.round(requirement.importanceWeight))),
        active: Boolean(requirement.active),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(reqRef, {
        skillId: safeSkillId,
        skillName: requirement.skillName.trim().slice(0, 120),
        category: requirement.category.trim().slice(0, 100) || 'Technical',
        requiredProficiency: Math.min(4, Math.max(1, Math.round(requirement.requiredProficiency))),
        importanceWeight: Math.min(5, Math.max(1, Math.round(requirement.importanceWeight))),
        active: Boolean(requirement.active),
        updatedAt: serverTimestamp(),
      });
    }

    await logSystemActivity(
      adminUid,
      adminName,
      'admin',
      'requirement_saved',
      `Updated skill requirement ${requirement.skillName} (L${requirement.requiredProficiency}, weight ${requirement.importanceWeight})`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `roleRequirements/${safeReqId}`);
  }
}

export async function adminSaveLearningResourceAndChunks(
  resource: LearningResource,
  adminUid: string,
  adminName: string
): Promise<ResourceChunk[]> {
  const safeId = sanitizeId(resource.id);
  const path = `learningResources/${safeId}`;
  const ref = doc(db, 'learningResources', safeId);

  const normalized: LearningResource = {
    id: safeId,
    title: resource.title.trim().slice(0, 240),
    description: resource.description.trim().slice(0, 2000),
    skillCategory: resource.skillCategory.trim().slice(0, 120),
    skillTags: (resource.skillTags || []).map((t) => String(t).trim().slice(0, 80)).filter(Boolean).slice(0, 20),
    difficulty: resource.difficulty || 'Intermediate',
    url: resource.url.trim().slice(0, 512),
    source: resource.source.trim().slice(0, 160),
    estimatedHours: Math.min(500, Math.max(1, Math.round(Number(resource.estimatedHours) || 8))),
    searchableContent: resource.searchableContent.trim().slice(0, 12000),
    active: Boolean(resource.active),
  };

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        ...normalized,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        title: normalized.title,
        description: normalized.description,
        skillCategory: normalized.skillCategory,
        skillTags: normalized.skillTags,
        difficulty: normalized.difficulty,
        url: normalized.url,
        source: normalized.source,
        estimatedHours: normalized.estimatedHours,
        searchableContent: normalized.searchableContent,
        active: normalized.active,
        updatedAt: serverTimestamp(),
      });
    }

    const chunks = chunkLearningResource(normalized);
    for (const chunk of chunks) {
      const chunkRef = doc(db, 'resourceChunks', chunk.id);
      const chunkSnap = await getDoc(chunkRef);
      if (!chunkSnap.exists()) {
        await setDoc(chunkRef, {
          ...chunk,
          createdAt: serverTimestamp(),
        });
      } else {
        await updateDoc(chunkRef, {
          resourceTitle: chunk.resourceTitle,
          skillCategory: chunk.skillCategory,
          difficulty: chunk.difficulty,
          source: chunk.source,
          url: chunk.url,
          chunkIndex: chunk.chunkIndex,
          chunkText: chunk.chunkText,
          active: chunk.active,
        });
      }
    }

    await logSystemActivity(
      adminUid,
      adminName,
      'admin',
      'resource_indexed',
      `Saved resource "${normalized.title}" (${chunks.length} RAG chunks)`
    );

    return chunks;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Student Private Resumes + Firebase Storage Upload
export async function uploadPdfToStorageAndSaveResume(
  uid: string,
  file: File | null,
  extractedData: {
    fileName: string;
    mimeType: string;
    fileSizeBytes: number;
    extractedText: string;
    extractedSkills: ResumeRecord['extractedSkills'];
    projects: string[];
    certificates: string[];
    experienceSummary: string;
  }
): Promise<string> {
  const safeUid = sanitizeId(uid);
  const resumeId = `${safeUid}_latest`;
  const path = `resumes/${resumeId}`;

  let uploadedStoragePath = `local_session/${safeUid}/${sanitizeId(extractedData.fileName)}`;

  if (file) {
    const bucketPath = `resumes/${safeUid}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    try {
      const fileRef = storageRef(storage, bucketPath);
      await uploadBytes(fileRef, file, { contentType: file.type || 'application/pdf' });
      uploadedStoragePath = bucketPath;
    } catch {
      // Graceful fallback if Firebase Storage bucket rules have not been configured in Firebase Console yet
      uploadedStoragePath = `storage_pending_rules/${bucketPath}`.slice(0, 500);
    }
  }

  try {
    const ref = doc(db, 'resumes', resumeId);
    const snap = await getDoc(ref);

    const payload = {
      ownerId: safeUid,
      fileName: extractedData.fileName.trim().slice(0, 240) || 'resume.pdf',
      mimeType: (extractedData.mimeType || 'application/pdf').slice(0, 100),
      fileSizeBytes: Math.min(10485760, Math.max(0, Math.round(extractedData.fileSizeBytes || 0))),
      storagePath: uploadedStoragePath.slice(0, 512),
      extractedText: extractedData.extractedText.slice(0, 20000),
      extractedSkills: (extractedData.extractedSkills || []).slice(0, 40).map((s) => ({
        skillId: sanitizeId(s.skillId || s.skillName),
        skillName: String(s.skillName).slice(0, 120),
        category: String(s.category || 'Technical').slice(0, 100),
        suggestedProficiency: Math.min(4, Math.max(1, Math.round(Number(s.suggestedProficiency) || 2))),
        evidenceSnippet: String(s.evidenceSnippet || '').slice(0, 240),
      })),
      projects: (extractedData.projects || []).map((p) => String(p).slice(0, 500)).slice(0, 20),
      certificates: (extractedData.certificates || []).map((c) => String(c).slice(0, 300)).slice(0, 20),
      experienceSummary: String(extractedData.experienceSummary || '').slice(0, 3000),
    };

    if (!snap.exists()) {
      await setDoc(ref, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        fileName: payload.fileName,
        mimeType: payload.mimeType,
        fileSizeBytes: payload.fileSizeBytes,
        storagePath: payload.storagePath,
        extractedText: payload.extractedText,
        extractedSkills: payload.extractedSkills,
        projects: payload.projects,
        certificates: payload.certificates,
        experienceSummary: payload.experienceSummary,
        updatedAt: serverTimestamp(),
      });
    }

    return uploadedStoragePath;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeStudentResumes(
  uid: string,
  onData: (resumes: ResumeRecord[]) => void
): Unsubscribe {
  const safeUid = sanitizeId(uid);
  const path = 'resumes';
  const q = query(collection(db, 'resumes'), where('ownerId', '==', safeUid));

  return onSnapshot(
    q,
    (snap) => {
      const list: ResumeRecord[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ownerId: data.ownerId,
          fileName: data.fileName || 'resume.pdf',
          mimeType: data.mimeType || 'application/pdf',
          fileSizeBytes: Number(data.fileSizeBytes) || 0,
          storagePath: data.storagePath || '',
          extractedText: data.extractedText || '',
          extractedSkills: Array.isArray(data.extractedSkills) ? data.extractedSkills : [],
          projects: Array.isArray(data.projects) ? data.projects : [],
          certificates: Array.isArray(data.certificates) ? data.certificates : [],
          experienceSummary: data.experienceSummary || '',
          updatedAtIso: data.updatedAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
        };
      });
      onData(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

// Student Private Practical Assessments
export async function saveAssessmentAttempt(
  uid: string,
  attempt: Omit<AssessmentAttempt, 'id' | 'ownerId'>
): Promise<void> {
  const safeUid = sanitizeId(uid);
  const attemptId = sanitizeId(`assess_${safeUid}_${Date.now()}`);
  const path = `assessments/${attemptId}`;

  try {
    await setDoc(doc(db, 'assessments', attemptId), {
      ownerId: safeUid,
      skillId: sanitizeId(attempt.skillId),
      skillName: attempt.skillName.slice(0, 120),
      difficulty: attempt.difficulty,
      totalQuestions: Math.min(25, Math.max(1, attempt.totalQuestions)),
      correctAnswers: Math.min(25, Math.max(0, attempt.correctAnswers)),
      scorePercent: Math.min(100, Math.max(0, Math.round(attempt.scorePercent))),
      verifiedProficiency: Math.min(4, Math.max(0, Math.round(attempt.verifiedProficiency))),
      questionReviews: attempt.questionReviews.slice(0, 25).map((r) => ({
        questionId: String(r.questionId).slice(0, 80),
        prompt: String(r.prompt).slice(0, 400),
        selectedOption: String(r.selectedOption).slice(0, 240),
        correctOption: String(r.correctOption).slice(0, 240),
        isCorrect: Boolean(r.isCorrect),
        explanation: String(r.explanation).slice(0, 400),
      })),
      completedAtIso: attempt.completedAtIso.slice(0, 64),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeStudentAssessments(
  uid: string,
  onData: (attempts: AssessmentAttempt[]) => void
): Unsubscribe {
  const safeUid = sanitizeId(uid);
  const path = 'assessments';
  const q = query(collection(db, 'assessments'), where('ownerId', '==', safeUid));

  return onSnapshot(
    q,
    (snap) => {
      const list: AssessmentAttempt[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ownerId: data.ownerId,
          skillId: data.skillId,
          skillName: data.skillName,
          difficulty: data.difficulty || 'Intermediate',
          totalQuestions: Number(data.totalQuestions) || 1,
          correctAnswers: Number(data.correctAnswers) || 0,
          scorePercent: Number(data.scorePercent) || 0,
          verifiedProficiency: (Math.min(4, Math.max(0, Number(data.verifiedProficiency) || 0)) as 0 | 1 | 2 | 3 | 4),
          questionReviews: Array.isArray(data.questionReviews) ? data.questionReviews : [],
          completedAtIso: data.completedAtIso || new Date().toISOString(),
        };
      });
      list.sort(
        (a, b) => new Date(b.completedAtIso).getTime() - new Date(a.completedAtIso).getTime()
      );
      onData(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

// Student Personalised Learning Roadmaps
export async function saveStudentRoadmap(
  uid: string,
  roadmap: Omit<LearningRoadmapDoc, 'id' | 'ownerId'>
): Promise<void> {
  const safeUid = sanitizeId(uid);
  const safeRoleId = sanitizeId(roadmap.roleId);
  const docId = sanitizeId(`${safeUid}_${safeRoleId}`);
  const path = `roadmaps/${docId}`;
  const ref = doc(db, 'roadmaps', docId);

  try {
    const snap = await getDoc(ref);
    const cleanPayload = {
      ownerId: safeUid,
      roleId: safeRoleId,
      roleTitle: roadmap.roleTitle.slice(0, 160),
      weeklyStudyHours: Math.min(80, Math.max(1, Math.round(roadmap.weeklyStudyHours))),
      preferredDurationWeeks: Math.min(52, Math.max(1, Math.round(roadmap.preferredDurationWeeks))),
      summary: roadmap.summary.slice(0, 3000),
      insufficientEvidenceNote: (roadmap.insufficientEvidenceNote || '').slice(0, 1000),
      tasks: roadmap.tasks.slice(0, 30).map((t) => ({
        id: sanitizeId(t.id),
        weekNumber: Math.max(1, Math.min(52, Math.round(t.weekNumber || 1))),
        skillId: sanitizeId(t.skillId || t.skillName),
        skillName: String(t.skillName).slice(0, 120),
        title: String(t.title).slice(0, 200),
        actionSteps: String(t.actionSteps).slice(0, 600),
        estimatedHours: Math.max(1, Math.min(80, Math.round(t.estimatedHours || 4))),
        resourceTitle: String(t.resourceTitle || '').slice(0, 240),
        resourceSource: String(t.resourceSource || '').slice(0, 160),
        resourceUrl: String(t.resourceUrl || '').slice(0, 512),
        groundedInCorpus: Boolean(t.groundedInCorpus),
        completed: Boolean(t.completed),
        ...(t.completedAtIso ? { completedAtIso: String(t.completedAtIso).slice(0, 64) } : {}),
      })),
      sourceAttributions: roadmap.sourceAttributions.slice(0, 25).map((a) => ({
        chunkId: sanitizeId(a.chunkId),
        resourceId: sanitizeId(a.resourceId),
        resourceTitle: String(a.resourceTitle).slice(0, 240),
        source: String(a.source).slice(0, 160),
        url: String(a.url).slice(0, 512),
        difficulty: a.difficulty || 'Intermediate',
        matchedSkillName: String(a.matchedSkillName).slice(0, 120),
        similarityScore: Number(Number(a.similarityScore || 0).toFixed(3)),
        excerpt: String(a.excerpt).slice(0, 360),
      })),
      generatedAtIso: roadmap.generatedAtIso.slice(0, 64),
    };

    if (!snap.exists()) {
      await setDoc(ref, {
        ...cleanPayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        roleTitle: cleanPayload.roleTitle,
        weeklyStudyHours: cleanPayload.weeklyStudyHours,
        preferredDurationWeeks: cleanPayload.preferredDurationWeeks,
        summary: cleanPayload.summary,
        insufficientEvidenceNote: cleanPayload.insufficientEvidenceNote,
        tasks: cleanPayload.tasks,
        sourceAttributions: cleanPayload.sourceAttributions,
        generatedAtIso: cleanPayload.generatedAtIso,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateRoadmapTaskCompletion(
  roadmapDoc: LearningRoadmapDoc,
  updatedTasks: RoadmapTaskItem[]
): Promise<void> {
  const path = `roadmaps/${roadmapDoc.id}`;
  try {
    await updateDoc(doc(db, 'roadmaps', roadmapDoc.id), {
      tasks: updatedTasks.slice(0, 30),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeStudentRoadmaps(
  uid: string,
  onData: (roadmaps: LearningRoadmapDoc[]) => void
): Unsubscribe {
  const safeUid = sanitizeId(uid);
  const path = 'roadmaps';
  const q = query(collection(db, 'roadmaps'), where('ownerId', '==', safeUid));

  return onSnapshot(
    q,
    (snap) => {
      const list: LearningRoadmapDoc[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ownerId: data.ownerId,
          roleId: data.roleId,
          roleTitle: data.roleTitle || 'Target Role',
          weeklyStudyHours: Number(data.weeklyStudyHours) || 8,
          preferredDurationWeeks: Number(data.preferredDurationWeeks) || 6,
          summary: data.summary || '',
          insufficientEvidenceNote: data.insufficientEvidenceNote || '',
          tasks: Array.isArray(data.tasks) ? data.tasks : [],
          sourceAttributions: Array.isArray(data.sourceAttributions)
            ? data.sourceAttributions
            : [],
          generatedAtIso: data.generatedAtIso || new Date().toISOString(),
        };
      });
      list.sort(
        (a, b) => new Date(b.generatedAtIso).getTime() - new Date(a.generatedAtIso).getTime()
      );
      onData(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

// Progress Snapshots (Student History + Aggregate Admin Reporting)
export async function recordProgressSnapshot(
  uid: string,
  snapshot: Omit<ProgressSnapshot, 'id' | 'ownerId'>
): Promise<void> {
  const safeUid = sanitizeId(uid);
  const snapId = sanitizeId(`prog_${safeUid}_${Date.now()}`);
  const path = `progress/${snapId}`;

  try {
    await setDoc(doc(db, 'progress', snapId), {
      ownerId: safeUid,
      roleId: sanitizeId(snapshot.roleId),
      roleTitle: snapshot.roleTitle.slice(0, 160),
      skillMatchScore: Math.min(100, Math.max(0, Math.round(snapshot.skillMatchScore))),
      earnedWeightedPoints: Math.min(1000, Math.max(0, Number(snapshot.earnedWeightedPoints.toFixed(2)))),
      totalWeightedPoints: Math.min(1000, Math.max(0, Number(snapshot.totalWeightedPoints.toFixed(2)))),
      meetsCount: Math.min(50, Math.max(0, snapshot.meetsCount)),
      needsImprovementCount: Math.min(50, Math.max(0, snapshot.needsImprovementCount)),
      missingCount: Math.min(50, Math.max(0, snapshot.missingCount)),
      requiresAssessmentCount: Math.min(50, Math.max(0, snapshot.requiresAssessmentCount)),
      missingSkillNames: snapshot.missingSkillNames.map((n) => n.slice(0, 120)).slice(0, 30),
      skillBreakdown: snapshot.skillBreakdown.slice(0, 30),
      triggerReason: snapshot.triggerReason.slice(0, 120),
      recordedAtIso: snapshot.recordedAtIso.slice(0, 64),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeStudentProgress(
  uid: string,
  onData: (snapshots: ProgressSnapshot[]) => void
): Unsubscribe {
  const safeUid = sanitizeId(uid);
  const path = 'progress';
  const q = query(collection(db, 'progress'), where('ownerId', '==', safeUid));

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => mapProgressDoc(d.id, d.data()));
      list.sort(
        (a, b) => new Date(a.recordedAtIso).getTime() - new Date(b.recordedAtIso).getTime()
      );
      onData(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeAllProgressForAdmin(
  onData: (snapshots: ProgressSnapshot[]) => void
): Unsubscribe {
  const path = 'progress';
  return onSnapshot(
    collection(db, 'progress'),
    (snap) => {
      const list = snap.docs.map((d) => mapProgressDoc(d.id, d.data()));
      list.sort(
        (a, b) => new Date(b.recordedAtIso).getTime() - new Date(a.recordedAtIso).getTime()
      );
      onData(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

function mapProgressDoc(id: string, data: Record<string, any>): ProgressSnapshot {
  return {
    id,
    ownerId: data.ownerId,
    roleId: data.roleId,
    roleTitle: data.roleTitle || 'Target Role',
    skillMatchScore: Number(data.skillMatchScore) || 0,
    earnedWeightedPoints: Number(data.earnedWeightedPoints) || 0,
    totalWeightedPoints: Number(data.totalWeightedPoints) || 0,
    meetsCount: Number(data.meetsCount) || 0,
    needsImprovementCount: Number(data.needsImprovementCount) || 0,
    missingCount: Number(data.missingCount) || 0,
    requiresAssessmentCount: Number(data.requiresAssessmentCount) || 0,
    missingSkillNames: Array.isArray(data.missingSkillNames) ? data.missingSkillNames : [],
    skillBreakdown: Array.isArray(data.skillBreakdown) ? data.skillBreakdown : [],
    triggerReason: data.triggerReason || 'Skill evaluation',
    recordedAtIso: data.recordedAtIso || new Date().toISOString(),
  };
}

// System Activity Logs
export async function logSystemActivity(
  actorUid: string,
  actorDisplayName: string,
  actorRole: 'student' | 'admin',
  actionType: string,
  summary: string
): Promise<void> {
  const safeUid = sanitizeId(actorUid);
  const logId = sanitizeId(`log_${safeUid}_${Date.now()}`);
  const path = `activityLogs/${logId}`;

  try {
    await setDoc(doc(db, 'activityLogs', logId), {
      actorUid: safeUid,
      actorDisplayName: (actorDisplayName || 'User').trim().slice(0, 120),
      actorRole,
      actionType: actionType.slice(0, 80),
      summary: summary.slice(0, 400),
      occurredAtIso: new Date().toISOString(),
      createdAt: serverTimestamp(),
    });
  } catch {
    // Activity logging should never crash student workflows if user record is still initializing
  }
}

export function subscribeActivityLogsForAdmin(
  onData: (logs: ActivityLog[]) => void
): Unsubscribe {
  const path = 'activityLogs';
  return onSnapshot(
    collection(db, 'activityLogs'),
    (snap) => {
      const list: ActivityLog[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          actorUid: data.actorUid,
          actorDisplayName: data.actorDisplayName || 'User',
          actorRole: data.actorRole === 'admin' ? 'admin' : 'student',
          actionType: data.actionType || 'event',
          summary: data.summary || '',
          occurredAtIso: data.occurredAtIso || new Date().toISOString(),
        };
      });
      list.sort(
        (a, b) => new Date(b.occurredAtIso).getTime() - new Date(a.occurredAtIso).getTime()
      );
      onData(list.slice(0, 50));
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}
