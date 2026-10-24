# SkillGapRAG

**An AI-Powered Career Intelligence and Skill Gap Analysis System Using Retrieval-Augmented Generation**

SkillGapRAG helps university students prepare for software and data careers by extracting technical evidence from PDF resumes, comparing confirmed skills against weighted job-role rubrics, retrieving grounded learning resources via dense semantic embeddings, verifying proficiency through practical multiple-choice assessments, and tracking reassessment progress over time.

---

## Core Architecture & Capabilities

1. **Two Role-Enforced Personas (`Student` & `Administrator`)**
   - **Student Workflow**: Registration → Academic Onboarding → PDF Resume Upload & Gemini Extraction → Student Skill Review & Confirmation → Career Role Selection (`Java Developer`, `Python Developer`, `Data Analyst`, plus custom admin roles) → Transparent Weighted Skill-Gap Analysis → RAG-Grounded Learning Roadmap → Task Completion Tracking → Practical MCQ Assessments → Automatic Score Reassessment → Historical Progress Comparison.
   - **Administrator Console**: Real-time Firestore analytics (registered accounts, active job roles, most frequent skill gaps, average match score per role, system activity logs), permitted student academic info updates, dynamic Job-Role & Skill Weight management without modifying frontend code, and RAG Knowledge Base resource & chunk management.

2. **Transparent Weighted Scoring (`src/services/skillEngine.ts`)**
   - `Skill Match Score = (Earned Weighted Points ÷ Total Possible Weighted Points) × 100`
   - Distinguishes four explicit states per required skill:
     - **Skill meets requirement** (verified via practical assessment at or above target level)
     - **Skill requires assessment** (self-reported or resume-extracted proficiency reaches target level, receiving 80% provisional credit until verified by an objective quiz)
     - **Skill needs improvement** (below required proficiency level)
     - **Skill is missing** (not yet recorded in profile; never treated as proof that a student lacks ability)
   - Explicitly framed as alignment against a role competency rubric—never as a hiring probability prediction.

3. **Chunked Retrieval-Augmented Generation (`server.ts` + `src/data/seedCatalog.ts`)**
   - Curated `learningResources` are cleaned and split into metadata-preserving `resourceChunks` (`resourceTitle`, `skillCategory`, `difficulty`, `source`, `url`, `chunkIndex`, `chunkText`).
   - Backend embeds chunks and per-gap queries server-side using `gemini-embedding-2-preview` and ranks matches via cosine similarity.
   - `gemini-3.8-flash` synthesizes a week-by-week roadmap grounded strictly in retrieved chunks, displaying source attributions and emitting an explicit insufficient-evidence notice whenever a skill lacks matching corpus coverage.

4. **Zero-Trust Cloud Firestore Security (`firestore.rules`)**
   - 11 application collections (`users`, `jobRoles`, `skills`, `roleRequirements`, `resumes`, `assessments`, `learningResources`, `resourceChunks`, `roadmaps`, `progress`, `activityLogs`) plus `/admins/{adminUid}`.
   - Enforces verified email tokens (`request.auth.token.email_verified == true`), strict field/type/size validation blueprints, and strict owner-only isolation on `/resumes` and `/assessments` (even administrators cannot read private student resumes or individual quiz attempts).

---

## External Configuration & Setup

### 1. Prerequisites
- **Node.js** 20+ and **npm**
- **Google Gemini API Key** (`GEMINI_API_KEY`) configured on the server (in AI Studio: **Settings > Secrets**; locally: `.env` copied from `.env.example`).
- **Firebase Project** (`firebase-applet-config.json`):
  - **Firebase Authentication**: Google Sign-In (`signInWithPopup`) is enabled out of the box. *(Optional: if you later want email/password login in addition to Google Sign-In, enable Email/Password + email verification in the Firebase Console first).*
  - **Cloud Firestore**: Database ID configured in `firebase-applet-config.json` with `firestore.rules` deployed.
  - **Firebase Storage** *(for binary PDF blob archiving)*: Uses the project bucket in `firebase-applet-config.json`. Ensure Firebase Storage is initialized in your Firebase Console with owner-scoped rules (`match /resumes/{userId}/{allPaths=**} { allow read, write: if request.auth != null && request.auth.uid == userId; }`). If Storage bucket rules are not yet initialized in the console, PDF text & skill extraction via `/api/resume/extract` and private Firestore `/resumes` persistence continue working seamlessly.

### 2. Initial Administrator Setup
- Administrator privileges are verified server/rule-side via `isAdmin()` in `firestore.rules`:
  1. **Bootstrapped Primary Admin**: Verified Google login matching the configured project owner email (`muthum.ug.24.cs@francisxavier.ac.in` with `email_verified == true`) automatically receives Administrator access alongside Student workspace access.
  2. **Granting Additional Admins**: Any existing Administrator can promote a verified account UID from **Admin Console → Student Accounts → Grant Admin**, which writes a trusted `/admins/{uid}` marker document enforced by Firestore rules.
- Before sharing the application broadly with external cohorts, review and audit `firestore.rules` and your `/admins` registry in the Firebase Console.

---

## Local Development & Deployment

```bash
# 1. Install dependencies
npm install

# 2. Configure local environment variables (if running outside AI Studio)
cp .env.example .env
# Edit .env and set GEMINI_API_KEY=...

# 3. Validate Firestore security rules & TypeScript types
npx eslint firestore.rules
npm run lint

# 4. Start full-stack Express + Vite server on http://localhost:3000
npm run dev

# 5. Production build & start
npm run build
npm start
```
