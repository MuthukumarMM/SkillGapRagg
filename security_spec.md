# SkillGapRAG Firestore Security Specification (11-Collection Production Model)

## 1. Data Invariants & Privacy Guarantees
1. **Strict Private Record Protection (`resumes`, `assessments`)**: Private student resumes and individual student assessment attempts are **strictly owner-isolated** (`ownerId == request.auth.uid`). Even administrators are **denied** `get` and `list` access on `/resumes` and `/assessments`, fulfilling Section 14 ("Do not expose private resumes or individual student assessment records to unauthorised users").
2. **Trusted Administrator Verification (`isAdmin()`)**: An authenticated user is recognized as an Administrator only if:
   - `exists(/databases/$(database)/documents/admins/$(request.auth.uid))`, OR
   - They match the bootstrapped runtime administrator email (`muthum.ug.24.cs@francisxavier.ac.in`) **AND** `request.auth.token.email_verified == true`.
   Users can never self-assign `role` or `isAdmin` inside `/users/{userId}`.
3. **Catalog Integrity (`jobRoles`, `skills`, `roleRequirements`, `learningResources`, `resourceChunks`)**: Authenticated users may read active catalog documents (`resource.data.active == true || isAdmin()`), while only `isAdmin()` with verified email may create, update, or deactivate catalog entries.
4. **Aggregate Analytics Without Privacy Leaks (`progress`, `activityLogs`, `users`)**: Students can only read/query their own `/progress`, `/roadmaps`, and `/users/{uid}` documents (`resource.data.ownerId == request.auth.uid`), while verified Administrators can query aggregate non-PII `progress`, `users` (non-PII academic profile fields only), and `activityLogs`.
5. **Temporal, Structural & Volumetric Hardening**: All creates enforce `hasAll` + `hasOnly` allowlists, `createdAt == request.time`, `isValidId()`, and `.size()` limits on every string and array. All updates wrap `isValid[Entity](incoming())`, lock immutable fields (`ownerId`, `uid`, `createdAt`), and restrict mutable keys via `affectedKeys().hasOnly(...)`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Student Self-Privilege Escalation**: Student writes `{ uid: 'u1', isAdmin: true, ... }` to `/users/u1` → Rejected by `hasOnly` blueprint.
2. **Unverified Bootstrapped Admin Spoof**: Attacker signs in with `email == 'muthum.ug.24.cs@francisxavier.ac.in'` and `email_verified == false` attempting to create `/jobRoles/java-dev` → `PERMISSION_DENIED`.
3. **Unauthorized Admin Snooping on Private Resume**: Authenticated Admin (`isAdmin() == true`) attempts `get` or `list` on `/resumes/student_resume_1` → `PERMISSION_DENIED`.
4. **Unauthorized Admin Snooping on Individual Assessment**: Authenticated Admin attempts `get` or `list` on `/assessments/student_quiz_1` → `PERMISSION_DENIED`.
5. **Cross-Student Roadmap Read**: Student A queries `/roadmaps` without `where('ownerId', '==', auth.uid)` or targets Student B's roadmap → `PERMISSION_DENIED`.
6. **Student Modifying Job Role Catalog**: Student attempts `update` on `/jobRoles/python-dev` → `PERMISSION_DENIED`.
7. **Orphaned Progress Write Without User Profile**: Creating `/progress/p1` when `/users/$(request.auth.uid)` does not exist → `PERMISSION_DENIED`.
8. **Shadow Field Injection on Assessment**: Creating `/assessments/a1` with extra field `hackedScore: 100` → `PERMISSION_DENIED`.
9. **ID Poisoning Attack**: Creating `/learningResources/invalid$path!id` → `PERMISSION_DENIED`.
10. **Client Timestamp Forgery**: Creating `/roadmaps/r1` with client-forged `createdAt` != `request.time` → `PERMISSION_DENIED`.
11. **Value Poisoning on Roadmap Task Update**: Updating `/roadmaps/r1` where `tasks` is a 500KB string instead of bounded `list` → `PERMISSION_DENIED`.
12. **Immutable Owner Transfer on Resume Update**: Updating `/resumes/res1` changing `ownerId` to another UID → `PERMISSION_DENIED`.
