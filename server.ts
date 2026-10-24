import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { extractText as extractPdfText } from 'unpdf';
import {
  getQuestionsForSkill,
  SEED_RESOURCE_CHUNKS,
  SEED_SKILLS,
} from './src/data/seedCatalog.ts';
import {
  AssessmentQuestion,
  DifficultyTier,
  ExtractedResumeSkill,
  ResourceChunk,
  RoadmapSourceAttribution,
  RoadmapTaskItem,
  SkillComparisonItem,
  SkillDefinition,
} from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3000;

function tryGetAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/**
 * Note: Never return HTTP 403 from app JSON routes because Cloud Run's outer proxy
 * intercepts 403 status codes and replaces the JSON body with an HTML page.
 */
function formatApiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (
    raw.includes('PERMISSION_DENIED') ||
    raw.includes('API_KEY_INVALID') ||
    raw.includes('denied access') ||
    raw.includes('not configured')
  ) {
    return {
      status: 503,
      message:
        'Gemini API access is currently restricted on the attached project key. Check Settings > Secrets to attach an active Gemini API key.',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      message:
        'Gemini API rate limit reached on the current key tier. Please wait a moment and retry.',
    };
  }
  return { status: 500, message: raw.slice(0, 400) };
}

interface EmbeddedChunkRecord {
  chunk: ResourceChunk;
  contentSignature: string;
  embedding?: number[];
}

const chunkVectorCache = new Map<string, EmbeddedChunkRecord>();

for (const seedChunk of SEED_RESOURCE_CHUNKS) {
  chunkVectorCache.set(seedChunk.id, {
    chunk: seedChunk,
    contentSignature: `${seedChunk.resourceTitle}::${seedChunk.skillCategory}::${seedChunk.chunkText}`,
  });
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA.length || vecA.length !== vecB.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

function computeTfIdfCosineSimilarity(
  queryText: string,
  chunk: ResourceChunk,
  allChunks: ResourceChunk[]
): number {
  const tokenize = (txt: string) =>
    txt
      .toLowerCase()
      .replace(/[^a-z0-9+#]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1);

  const qTokens = tokenize(queryText);
  const dTokens = tokenize(`${chunk.resourceTitle} ${chunk.skillCategory} ${chunk.chunkText}`);
  if (!qTokens.length || !dTokens.length) return 0;

  const vocab = Array.from(new Set([...qTokens, ...dTokens]));
  const totalDocs = Math.max(1, allChunks.length);
  const docTexts = allChunks.map((c) =>
    `${c.resourceTitle} ${c.skillCategory} ${c.chunkText}`.toLowerCase()
  );

  const qVec: number[] = [];
  const dVec: number[] = [];

  for (const term of vocab) {
    let df = 0;
    for (const dt of docTexts) {
      if (dt.includes(term)) df += 1;
    }
    const idf = Math.log((totalDocs + 1) / (df + 1)) + 1;
    const qTf = qTokens.filter((t) => t === term).length / qTokens.length;
    const dTf = dTokens.filter((t) => t === term).length / dTokens.length;
    qVec.push(qTf * idf);
    dVec.push(dTf * idf);
  }

  return cosineSimilarity(qVec, dVec);
}

async function embedTextsWithRetry(ai: GoogleGenAI, texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const batchSize = 20;
  const allVectors: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const slice = texts.slice(i, i + batchSize);
    let lastErr: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await ai.models.embedContent({
          model: 'gemini-embedding-2-preview',
          contents: slice,
        });
        const vectors = (res.embeddings || []).map((e) => e.values || []);
        allVectors.push(...vectors);
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
        await new Promise((r) => setTimeout(r, 300 * Math.pow(2, attempt)));
      }
    }
    if (lastErr) {
      throw lastErr;
    }
  }
  return allVectors;
}

async function syncAndEmbedChunks(
  ai: GoogleGenAI | null,
  incomingChunks: ResourceChunk[]
): Promise<{ records: EmbeddedChunkRecord[]; retrievalMethod: string }> {
  const activeChunks = (incomingChunks.length > 0 ? incomingChunks : SEED_RESOURCE_CHUNKS).filter(
    (c) => c.active
  );

  const toEmbed: EmbeddedChunkRecord[] = [];
  const activeRecords: EmbeddedChunkRecord[] = [];

  for (const chunk of activeChunks) {
    const sig = `${chunk.resourceTitle}::${chunk.skillCategory}::${chunk.chunkText}`;
    const cached = chunkVectorCache.get(chunk.id);
    if (cached && cached.contentSignature === sig && cached.embedding && cached.embedding.length > 0) {
      cached.chunk = chunk;
      activeRecords.push(cached);
    } else {
      const fresh: EmbeddedChunkRecord = { chunk, contentSignature: sig };
      chunkVectorCache.set(chunk.id, fresh);
      toEmbed.push(fresh);
      activeRecords.push(fresh);
    }
  }

  if (!ai) {
    return { records: activeRecords, retrievalMethod: 'tfidf-cosine-vector-fallback' };
  }

  let retrievalMethod = 'gemini-embedding-2-preview';
  if (toEmbed.length > 0) {
    try {
      const inputs = toEmbed.map(
        (r) =>
          `${r.chunk.resourceTitle} (${r.chunk.skillCategory}, ${r.chunk.difficulty}): ${r.chunk.chunkText}`
      );
      const vectors = await embedTextsWithRetry(ai, inputs);
      vectors.forEach((vec, idx) => {
        if (vec.length > 0) {
          toEmbed[idx].embedding = vec;
        }
      });
    } catch {
      retrievalMethod = 'tfidf-cosine-vector-fallback';
    }
  }

  return { records: activeRecords, retrievalMethod };
}

const SKILL_SYNONYM_MAP: Record<string, string[]> = {
  skill_core_java: ['java', 'core java', 'jvm', 'collections framework', 'multithreading', 'oop', 'java 17', 'java 21'],
  skill_spring_boot: ['spring boot', 'spring mvc', 'spring data', 'spring security', 'spring ioc', 'hibernate', 'jpa'],
  skill_sql_databases: ['sql', 'postgresql', 'postgres', 'mysql', 'sqlite', 'oracle db', 'relational database', 'rdbms', 'window functions'],
  skill_rest_apis: ['rest api', 'rest apis', 'restful', 'openapi', 'swagger', 'http api', 'json api', 'microservices'],
  skill_git_vcs: ['git', 'github', 'gitlab', 'bitbucket', 'version control', 'pull request'],
  skill_junit_testing: ['junit', 'junit 5', 'mockito', 'pytest', 'unit test', 'unit testing', 'integration testing', 'tdd', 'jest'],
  skill_python_core: ['python', 'python3', 'python 3', 'pep8', 'type hints'],
  skill_fastapi_django: ['fastapi', 'django', 'flask', 'pydantic', 'uvicorn', 'sqlalchemy'],
  skill_async_python: ['asyncio', 'async/await', 'aiohttp', 'httpx', 'asynchronous python', 'concurrent.futures', 'multiprocessing'],
  skill_docker_containers: ['docker', 'dockerfile', 'docker compose', 'docker-compose', 'containerization', 'containers', 'kubernetes'],
  skill_pandas_wrangling: ['pandas', 'numpy', 'dataframe', 'dataframes', 'scipy', 'data wrangling'],
  skill_statistics_prob: ['statistics', 'statistical', 'hypothesis testing', 'a/b testing', 'p-value', 'confidence interval', 'regression', 'probability', 'anova'],
  skill_data_viz_bi: ['tableau', 'power bi', 'powerbi', 'matplotlib', 'seaborn', 'plotly', 'looker', 'data visualization', 'bi dashboard'],
  skill_spreadsheets: ['excel', 'google sheets', 'pivot table', 'pivot tables', 'xlookup', 'vlookup', 'power query', 'spreadsheet'],
};

const GENERIC_SKILL_STOPWORDS = new Set([
  'and',
  'with',
  'for',
  'the',
  'core',
  'web',
  'data',
  'design',
  'programming',
  'testing',
  'analysis',
  'services',
  'collaborative',
  'exploratory',
  'asynchronous',
  'concurrent',
  'modeling',
  'unit',
  'integration',
  'version',
  'control',
]);

const EXTRA_TECH_SKILLS: { id: string; name: string; category: string; patterns: string[] }[] = [
  { id: 'skill_custom_javascript', name: 'JavaScript', category: 'Frontend & Web', patterns: ['javascript', 'es6'] },
  { id: 'skill_custom_typescript', name: 'TypeScript', category: 'Frontend & Web', patterns: ['typescript'] },
  { id: 'skill_custom_react', name: 'React', category: 'Frontend & Web', patterns: ['react', 'reactjs', 'react.js'] },
  { id: 'skill_custom_nodejs', name: 'Node.js', category: 'Backend Engineering', patterns: ['node.js', 'nodejs', 'express.js'] },
  { id: 'skill_custom_aws', name: 'Cloud Services (AWS/GCP)', category: 'Cloud & DevOps', patterns: ['aws', 'amazon web services', 'google cloud', 'gcp', 'azure'] },
  { id: 'skill_custom_mongodb', name: 'MongoDB / NoSQL', category: 'Databases', patterns: ['mongodb', 'nosql', 'firestore', 'redis'] },
  { id: 'skill_custom_ml', name: 'Machine Learning', category: 'AI & Data Science', patterns: ['machine learning', 'scikit-learn', 'tensorflow', 'pytorch'] },
];

function escapeRegex(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Deterministic, zero-hallucination resume parser operating strictly over verbatim extracted text.
 * Used automatically when Gemini API access is unavailable on the project's key.
 */
function extractResumeDeterministically(
  rawResumeText: string,
  catalogSkills: SkillDefinition[]
): {
  extractedSkills: ExtractedResumeSkill[];
  projects: string[];
  certificates: string[];
  experienceSummary: string;
} {
  const normalizedLines = rawResumeText
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const lowerFull = rawResumeText.toLowerCase();
  const extractedSkills: ExtractedResumeSkill[] = [];
  const seenIds = new Set<string>();

  const findEvidenceAndLevel = (patterns: string[]): { snippet: string; level: 1 | 2 | 3 } | null => {
    for (const pat of patterns) {
      const regex = new RegExp(`(^|[^a-z0-9])${escapeRegex(pat.toLowerCase())}([^a-z0-9]|$)`, 'i');
      if (regex.test(lowerFull)) {
        const matchingLines = normalizedLines.filter((line) => regex.test(line));
        const snippet = (matchingLines[0] || `Mentioned "${pat}" in resume`).slice(0, 220);
        const contextJoined = matchingLines.join(' ').toLowerCase();
        let level: 1 | 2 | 3 = 1;
        if (
          /built|developed|architected|designed|implemented|deployed|optimized|engineered|intern|production/i.test(
            contextJoined
          ) ||
          matchingLines.length >= 2
        ) {
          level = matchingLines.length >= 3 ? 3 : 2;
        }
        return { snippet, level };
      }
    }
    return null;
  };

  for (const skill of catalogSkills) {
    const dynamicTokens = skill.name
      .toLowerCase()
      .split(/[&/,()\-]+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 3 && !GENERIC_SKILL_STOPWORDS.has(t));
    const synonyms = SKILL_SYNONYM_MAP[skill.id] || dynamicTokens;
    const allPatterns = Array.from(new Set([skill.name.toLowerCase(), ...synonyms, ...dynamicTokens]));
    const hit = findEvidenceAndLevel(allPatterns);
    if (hit && !seenIds.has(skill.id)) {
      seenIds.add(skill.id);
      extractedSkills.push({
        skillId: skill.id,
        skillName: skill.name,
        category: skill.category,
        suggestedProficiency: hit.level,
        evidenceSnippet: hit.snippet,
      });
    }
  }

  for (const extra of EXTRA_TECH_SKILLS) {
    if (seenIds.has(extra.id)) continue;
    const hit = findEvidenceAndLevel(extra.patterns);
    if (hit) {
      seenIds.add(extra.id);
      extractedSkills.push({
        skillId: extra.id,
        skillName: extra.name,
        category: extra.category,
        suggestedProficiency: hit.level,
        evidenceSnippet: hit.snippet,
      });
    }
  }

  // Extract section bullets strictly from headings present in the document
  const sectionMap: Record<'projects' | 'certs' | 'experience' | 'other', string[]> = {
    projects: [],
    certs: [],
    experience: [],
    other: [],
  };

  let currentSection: 'projects' | 'certs' | 'experience' | 'other' = 'other';
  for (const line of normalizedLines) {
    const cleanHeading = line.replace(/[:\-|]/g, '').trim().toLowerCase();
    if (cleanHeading.length <= 42) {
      if (/^(academic\s+)?projects?(\s+experience)?$/.test(cleanHeading)) {
        currentSection = 'projects';
        continue;
      }
      if (/^(certifications?|certificates?|licenses?(\s*&\s*certifications?)?)$/.test(cleanHeading)) {
        currentSection = 'certs';
        continue;
      }
      if (/^(work\s+experience|experience|internships?|employment(\s+history)?)$/.test(cleanHeading)) {
        currentSection = 'experience';
        continue;
      }
      if (/^(education|technical\s+skills|skills|summary|objective|achievements|activities)$/.test(cleanHeading)) {
        currentSection = 'other';
        continue;
      }
    }
    if (line.length >= 12) {
      sectionMap[currentSection].push(line.replace(/^[•\-*▪◦]+\s*/, '').trim());
    }
  }

  const projects = sectionMap.projects.slice(0, 8).map((p) => p.slice(0, 450));
  const certificates = sectionMap.certs.slice(0, 8).map((c) => c.slice(0, 280));
  const experienceSummary =
    sectionMap.experience.length > 0
      ? sectionMap.experience.slice(0, 5).join(' • ').slice(0, 2500)
      : 'No dedicated work experience section detected in uploaded document.';

  return {
    extractedSkills: extractedSkills.slice(0, 35),
    projects,
    certificates,
    experienceSummary,
  };
}

function buildDeterministicGapExplanation(
  roleTitle: string,
  skillMatchScore: number,
  earnedWeightedPoints: number,
  totalWeightedPoints: number,
  items: SkillComparisonItem[]
): string {
  const missingHighWeight = items
    .filter((i) => i.status === 'missing')
    .sort((a, b) => b.importanceWeight - a.importanceWeight);
  const improvable = items
    .filter((i) => i.status === 'needs_improvement')
    .sort((a, b) => b.importanceWeight - a.importanceWeight);
  const unverified = items.filter((i) => i.status === 'requires_assessment');
  const met = items.filter((i) => i.status === 'meets_requirement');

  const p1Parts: string[] = [
    `Your current weighted alignment against the ${roleTitle} competency rubric is ${skillMatchScore}% (${earnedWeightedPoints} of ${totalWeightedPoints} weighted points, with ${met.length} of ${items.length} required skills verified at target level). This score measures curriculum alignment rather than hiring probability.`,
  ];
  if (missingHighWeight.length > 0) {
    p1Parts.push(
      `The highest-priority missing competencies impacting your alignment are ${missingHighWeight
        .slice(0, 3)
        .map((m) => `${m.skillName} (weight ${m.importanceWeight}, target L${m.requiredProficiency})`)
        .join(', ')}.`
    );
  } else if (improvable.length > 0) {
    p1Parts.push(
      `Your primary growth opportunities are ${improvable
        .slice(0, 3)
        .map((m) => `${m.skillName} (currently L${m.currentProficiency} vs target L${m.requiredProficiency})`)
        .join(', ')}.`
    );
  }

  const p2Parts: string[] = [];
  if (unverified.length > 0) {
    p2Parts.push(
      `Because unverified resume and self-reported entries are capped at 80% provisional credit until tested, you can earn immediate verified points by taking a Practical Assessment in ${unverified
        .slice(0, 3)
        .map((u) => u.skillName)
        .join(', ')}.`
    );
  }
  p2Parts.push(
    `Next, generate or follow your RAG Learning Roadmap to address high-weight gaps first, then complete skill assessments to record verified reassessment gains.`
  );

  return `${p1Parts.join(' ')}\n\n${p2Parts.join(' ')}`;
}

function buildDeterministicRagRoadmap(params: {
  roleTitle: string;
  actionableGaps: SkillComparisonItem[];
  weeklyStudyHours: number;
  preferredDurationWeeks: number;
  sourceAttributions: RoadmapSourceAttribution[];
  uncoveredSkills: string[];
}): { summary: string; tasks: RoadmapTaskItem[] } {
  const {
    roleTitle,
    actionableGaps,
    weeklyStudyHours,
    preferredDurationWeeks,
    sourceAttributions,
  } = params;

  const sortedGaps = [...actionableGaps].sort((a, b) => {
    const statusPriority = (s: SkillComparisonItem['status']) =>
      s === 'missing' ? 3 : s === 'needs_improvement' ? 2 : 1;
    if (b.importanceWeight !== a.importanceWeight) {
      return b.importanceWeight - a.importanceWeight;
    }
    return statusPriority(b.status) - statusPriority(a.status);
  });

  const tasks: RoadmapTaskItem[] = sortedGaps.slice(0, 12).map((gap, idx) => {
    const weekNumber = Math.min(
      preferredDurationWeeks,
      Math.max(1, Math.ceil(((idx + 1) / Math.max(1, sortedGaps.length)) * preferredDurationWeeks))
    );
    const matchedAttr = sourceAttributions.find((a) => a.matchedSkillName === gap.skillName);
    const estHours = Math.max(
      2,
      Math.min(
        16,
        Math.round(
          (weeklyStudyHours * preferredDurationWeeks) / Math.max(1, sortedGaps.length)
        )
      )
    );

    const actionSteps =
      gap.status === 'requires_assessment'
        ? `Review core concepts for ${gap.skillName} (target L${gap.requiredProficiency})${
            matchedAttr ? ` using "${matchedAttr.resourceTitle}"` : ''
          }, then complete an Intermediate or Advanced Practical Assessment to convert your provisional credit into verified mastery.`
        : `Study ${gap.skillName} from L${gap.currentProficiency} toward target L${gap.requiredProficiency}${
            matchedAttr
              ? ` using "${matchedAttr.resourceTitle}" (${matchedAttr.excerpt.slice(0, 160)}...)`
              : ' through hands-on coding exercises and official documentation'
          }, build a focused practice artifact, and verify mastery via the ${gap.skillName} Practical Assessment.`;

    return {
      id: `task_${idx + 1}_${Date.now()}`,
      weekNumber,
      skillId: gap.skillId,
      skillName: gap.skillName,
      title:
        gap.status === 'requires_assessment'
          ? `Review & Verify ${gap.skillName} (Target L${gap.requiredProficiency})`
          : `Close ${gap.skillName} Gap (L${gap.currentProficiency} → L${gap.requiredProficiency})`,
      actionSteps: actionSteps.slice(0, 580),
      estimatedHours: estHours,
      resourceTitle: matchedAttr
        ? matchedAttr.resourceTitle
        : 'General Practice Milestone (No Verified Corpus Match)',
      resourceSource: matchedAttr ? matchedAttr.source : 'Insufficient RAG Evidence',
      resourceUrl: matchedAttr ? matchedAttr.url : '',
      groundedInCorpus: Boolean(matchedAttr),
      completed: false,
    };
  });

  tasks.sort((a, b) => a.weekNumber - b.weekNumber);

  const summary = `Structured ${preferredDurationWeeks}-week roadmap for ${roleTitle} paced at ~${weeklyStudyHours} study hours/week across ${tasks.length} priority modules. High-weight missing and improvable competencies are scheduled in earlier weeks, grounded in ${sourceAttributions.length} retrieved knowledge-base chunks.`;

  return { summary, tasks };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '12mb' }));

  // Ensure body-parser errors (e.g., PayloadTooLargeError or malformed JSON) always return JSON on /api/*
  app.use(
    (
      err: { status?: number; type?: string; message?: string },
      req: Request,
      res: Response,
      next: express.NextFunction
    ) => {
      if (err && req.path.startsWith('/api')) {
        if (err.type === 'entity.too.large' || err.status === 413) {
          res.status(413).json({
            error:
              'Uploaded file payload exceeds the gateway limit. Please upload a PDF smaller than 5 MB.',
          });
          return;
        }
        res.status(400).json({
          error: err.message || 'Invalid JSON request body sent to server.',
        });
        return;
      }
      next(err);
    }
  );

  // 1. Health & Configuration Check
  app.get('/api/health', (_req: Request, res: Response) => {
    const hasKey = Boolean(
      process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
    );
    let embeddedCount = 0;
    chunkVectorCache.forEach((v) => {
      if (v.embedding && v.embedding.length > 0) embeddedCount += 1;
    });
    res.json({
      status: 'ok',
      geminiConfigured: hasKey,
      indexedChunkCount: chunkVectorCache.size,
      embeddedChunkCount: embeddedCount,
    });
  });

  // 2. Resume PDF / Text Extraction & Skill Identification (Section 7)
  app.post('/api/resume/extract', async (req: Request, res: Response) => {
    try {
      const {
        fileName = 'resume.pdf',
        mimeType = 'application/pdf',
        fileSizeBytes = 0,
        base64Data,
        rawText,
        catalogSkills,
      } = req.body || {};

      if (fileSizeBytes > 5 * 1024 * 1024) {
        res.status(400).json({
          error:
            'Resume file exceeds the 5 MB maximum upload limit. Please compress or export a smaller PDF.',
        });
        return;
      }

      if (!rawText && (!base64Data || typeof base64Data !== 'string')) {
        res.status(400).json({
          error: 'No resume PDF data or text provided for extraction.',
        });
        return;
      }

      if (
        base64Data &&
        mimeType !== 'application/pdf' &&
        !String(fileName).toLowerCase().endsWith('.pdf')
      ) {
        res.status(400).json({
          error: 'Unsupported file format. Please upload a valid PDF (.pdf) document.',
        });
        return;
      }

      const skillsList: SkillDefinition[] =
        Array.isArray(catalogSkills) && catalogSkills.length > 0 ? catalogSkills : SEED_SKILLS;

      // Step A: Extract real text directly from PDF bytes using unpdf when base64Data is uploaded
      let extractedPdfText = typeof rawText === 'string' ? rawText.trim() : '';
      if (!extractedPdfText && base64Data) {
        try {
          const pdfBytes = new Uint8Array(Buffer.from(base64Data, 'base64'));
          const pdfParsed = await extractPdfText(pdfBytes, { mergePages: true });
          extractedPdfText = String(pdfParsed.text || '').trim();
        } catch {
          res.status(422).json({
            error:
              'The uploaded file could not be parsed as a valid PDF document. Please upload an unencrypted, non-corrupted PDF resume.',
          });
          return;
        }
      }

      // Step B: Attempt Gemini AI-assisted skill & section extraction first
      const ai = tryGetAiClient();
      if (ai) {
        try {
          const canonicalCatalogText = skillsList
            .map((s) => `- ${s.id}: ${s.name} (${s.category})`)
            .join('\n');

          const extractionInstruction = `You are a conservative, factual academic resume parser for SkillGapRAG.
Extract ONLY information explicitly stated in the student's resume.
STRICT RULES:
1. NEVER invent or hallucinate skills, projects, certificates, or work experience that do not appear in the document.
2. When a technical skill in the resume matches or closely corresponds to one of the Canonical Catalog Skills below, use that exact skillId and skillName. For other technical skills clearly written in the resume, create a clean snake_case skillId prefixed with "skill_custom_".
3. Estimate suggestedProficiency conservatively on a 1-3 scale (1 = Beginner/coursework mention, 2 = Intermediate/applied in project or internship, 3 = Advanced/substantial multi-project or production evidence). Never assign 4 from resume text alone.
4. If the PDF is blank, corrupted, or contains no readable resume text, set isReadable to false.

Canonical Catalog Skills:
${canonicalCatalogText}`;

          const parts: any[] = [];
          if (extractedPdfText.length >= 20) {
            parts.push({
              text: `Extract the technical skills with evidence snippets, projects, certificates, and factual experience summary from this resume text:\n\n${extractedPdfText.slice(0, 18000)}`,
            });
          } else if (base64Data) {
            parts.push({
              inlineData: {
                mimeType: 'application/pdf',
                data: base64Data,
              },
            });
            parts.push({
              text: 'Extract the verbatim text, technical skills with evidence snippets, projects, certificates, and factual experience summary from this PDF resume.',
            });
          }

          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: { parts },
            config: {
              systemInstruction: extractionInstruction,
              temperature: 0.1,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  isReadable: { type: Type.BOOLEAN },
                  extractedText: { type: Type.STRING },
                  extractedSkills: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        skillId: { type: Type.STRING },
                        skillName: { type: Type.STRING },
                        category: { type: Type.STRING },
                        suggestedProficiency: { type: Type.INTEGER },
                        evidenceSnippet: { type: Type.STRING },
                      },
                      required: [
                        'skillId',
                        'skillName',
                        'category',
                        'suggestedProficiency',
                        'evidenceSnippet',
                      ],
                    },
                  },
                  projects: { type: Type.ARRAY, items: { type: Type.STRING } },
                  certificates: { type: Type.ARRAY, items: { type: Type.STRING } },
                  experienceSummary: { type: Type.STRING },
                },
                required: [
                  'isReadable',
                  'extractedText',
                  'extractedSkills',
                  'projects',
                  'certificates',
                  'experienceSummary',
                ],
              },
            },
          });

          const parsed = JSON.parse((response.text || '{}').trim());
          const finalText = (extractedPdfText || String(parsed.extractedText || '')).trim();

          if (!parsed.isReadable || finalText.length < 20) {
            res.status(422).json({
              error:
                'The uploaded PDF contains no extractable text (for example, a scanned image without OCR). Please upload a text-selectable PDF resume.',
            });
            return;
          }

          const dedupSkills = new Map<string, ExtractedResumeSkill>();
          for (const s of Array.isArray(parsed.extractedSkills) ? parsed.extractedSkills : []) {
            const cleanId = String(s.skillId || s.skillName || '')
              .toLowerCase()
              .replace(/[^a-z0-9_-]/g, '_')
              .slice(0, 80);
            if (!cleanId || !s.skillName) continue;
            dedupSkills.set(cleanId, {
              skillId: cleanId,
              skillName: String(s.skillName).slice(0, 120),
              category: String(s.category || 'Technical').slice(0, 100),
              suggestedProficiency: Math.min(
                3,
                Math.max(1, Number(s.suggestedProficiency) || 1)
              ) as 1 | 2 | 3 | 4,
              evidenceSnippet: String(s.evidenceSnippet || 'Listed in resume').slice(0, 220),
            });
          }

          res.json({
            extractedText: finalText.slice(0, 18000),
            extractedSkills: Array.from(dedupSkills.values()).slice(0, 35),
            projects: (Array.isArray(parsed.projects) ? parsed.projects : [])
              .map((p: unknown) => String(p).trim().slice(0, 450))
              .filter(Boolean)
              .slice(0, 15),
            certificates: (Array.isArray(parsed.certificates) ? parsed.certificates : [])
              .map((c: unknown) => String(c).trim().slice(0, 280))
              .filter(Boolean)
              .slice(0, 15),
            experienceSummary: String(
              parsed.experienceSummary || 'No formal work experience listed in document.'
            ).slice(0, 2500),
            extractionMode: 'gemini-3.8-flash',
            aiNotice: '',
          });
          return;
        } catch {
          // Fall through cleanly to local PDF text + deterministic catalog-grounded parser below
        }
      }

      // Step C: Deterministic Catalog-Grounded Fallback over real extracted PDF text
      if (extractedPdfText.length < 20) {
        res.status(422).json({
          error:
            'The uploaded PDF contains no selectable text (for example, a scanned image PDF or empty file). Please upload a text-selectable PDF resume.',
        });
        return;
      }

      const deterministic = extractResumeDeterministically(extractedPdfText, skillsList);
      res.json({
        extractedText: extractedPdfText.slice(0, 18000),
        extractedSkills: deterministic.extractedSkills,
        projects: deterministic.projects,
        certificates: deterministic.certificates,
        experienceSummary: deterministic.experienceSummary,
        extractionMode: 'deterministic-nlp-fallback',
        aiNotice: `Extracted verbatim PDF text (${extractedPdfText.length.toLocaleString()} chars) and matched ${deterministic.extractedSkills.length} technical skill(s), ${deterministic.projects.length} project(s), and ${deterministic.certificates.length} certificate(s) against the canonical catalog. Review and adjust any entries below before confirming.`,
      });
    } catch (err) {
      const formatted = formatApiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // 3. Index / Refresh RAG Knowledge Base Chunks (Section 11 & Section 15)
  app.post('/api/rag/index', async (req: Request, res: Response) => {
    try {
      const ai = tryGetAiClient();
      const chunks: ResourceChunk[] = Array.isArray(req.body?.chunks) ? req.body.chunks : [];
      const { records, retrievalMethod } = await syncAndEmbedChunks(ai, chunks);
      const embeddedCount = records.filter((r) => r.embedding && r.embedding.length > 0).length;
      res.json({
        indexedCount: records.length,
        embeddedCount,
        retrievalMethod,
      });
    } catch (err) {
      const formatted = formatApiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // 4. Explain Skill Gap Analysis (Section 4 & Section 9)
  app.post('/api/gap/explain', async (req: Request, res: Response) => {
    try {
      const {
        roleTitle = 'Target Role',
        skillMatchScore = 0,
        earnedWeightedPoints = 0,
        totalWeightedPoints = 0,
        items = [],
      } = req.body || {};

      const safeItems: SkillComparisonItem[] = Array.isArray(items) ? items : [];
      const ai = tryGetAiClient();

      if (ai) {
        try {
          const prompt = `Provide a clear, constructive 2-paragraph academic advisory summary for a student targeting "${roleTitle}".
Weighted Skill Match Score: ${skillMatchScore}% (${earnedWeightedPoints} / ${totalWeightedPoints} weighted points).
Skill breakdown:
${safeItems
  .map(
    (i: SkillComparisonItem) =>
      `- ${i.skillName}: current=${i.currentProficiency}, required=${i.requiredProficiency}, weight=${i.importanceWeight}, status=${i.statusLabel}, verified=${i.verifiedByAssessment}`
  )
  .join('\n')}

Rules:
- Explain specifically which high-weight missing or insufficient skills impact their score most, and which unverified skills can be validated immediately via a Practical Assessment.
- Never describe the Skill Match Score as a hiring probability or guarantee of employment.
- Keep tone concise, analytical, and encouraging (max 140 words).`;

          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: { temperature: 0.25 },
          });

          const text = (response.text || '').trim();
          if (text) {
            res.json({
              explanation: text.slice(0, 1500),
              generationMode: 'gemini-3.8-flash',
            });
            return;
          }
        } catch {
          // Fall through to deterministic weighted rubric advisory
        }
      }

      const fallbackExplanation = buildDeterministicGapExplanation(
        String(roleTitle),
        Number(skillMatchScore) || 0,
        Number(earnedWeightedPoints) || 0,
        Number(totalWeightedPoints) || 0,
        safeItems
      );

      res.json({
        explanation: fallbackExplanation,
        generationMode: 'deterministic-rubric-advisory',
      });
    } catch (err) {
      const formatted = formatApiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // 5. RAG Retrieval + Personalised Learning Roadmap Generation (Section 11 & Section 12)
  app.post('/api/rag/roadmap', async (req: Request, res: Response) => {
    try {
      const {
        roleTitle = 'Target Role',
        gapItems = [],
        weeklyStudyHours = 8,
        preferredDurationWeeks = 6,
        chunks = [],
      } = req.body || {};

      const ai = tryGetAiClient();
      const { records: indexedRecords, retrievalMethod } = await syncAndEmbedChunks(
        ai,
        Array.isArray(chunks) ? chunks : SEED_RESOURCE_CHUNKS
      );
      const allActiveChunks = indexedRecords.map((r) => r.chunk);

      // Focus roadmap on skills that do not yet meet verified target proficiency
      const actionableGaps: SkillComparisonItem[] = (Array.isArray(gapItems) ? gapItems : []).filter(
        (item: SkillComparisonItem) => item.status !== 'meets_requirement'
      );

      if (actionableGaps.length === 0) {
        res.json({
          summary: `All required skills for ${roleTitle} are currently verified at or above target proficiency. Continue practicing advanced capstone projects and periodic reassessments.`,
          insufficientEvidenceNote: '',
          tasks: [],
          sourceAttributions: [],
          retrievalMethod,
          generationMode: 'complete',
        });
        return;
      }

      // Build semantic queries per gap skill
      const queries = actionableGaps.map(
        (g) =>
          `${g.skillName} ${g.category} tutorial concepts practice from level ${g.currentProficiency} to level ${g.requiredProficiency} for ${roleTitle}`
      );

      let queryVectors: number[][] = [];
      const hasDenseIndex =
        Boolean(ai) && indexedRecords.some((r) => r.embedding && r.embedding.length > 0);
      if (ai && hasDenseIndex) {
        try {
          queryVectors = await embedTextsWithRetry(ai, queries);
        } catch {
          queryVectors = [];
        }
      }

      const retrievedMap = new Map<string, RoadmapSourceAttribution>();
      const uncoveredSkills: string[] = [];

      actionableGaps.forEach((gap, idx) => {
        const qVec = queryVectors[idx];
        const scored = indexedRecords.map((rec) => {
          const denseScore =
            qVec && rec.embedding && rec.embedding.length === qVec.length
              ? cosineSimilarity(qVec, rec.embedding)
              : 0;
          const tfidfScore = computeTfIdfCosineSimilarity(
            `${gap.skillName} ${gap.category}`,
            rec.chunk,
            allActiveChunks
          );
          const combined = qVec && rec.embedding ? denseScore : tfidfScore;
          const categoryAligned =
            rec.chunk.skillCategory.toLowerCase().includes(gap.skillName.toLowerCase()) ||
            gap.skillName.toLowerCase().includes(rec.chunk.skillCategory.toLowerCase());
          const finalScore = Math.min(0.99, combined + (categoryAligned ? 0.08 : 0));
          return { chunk: rec.chunk, score: finalScore };
        });

        scored.sort((a, b) => b.score - a.score);
        const threshold = queryVectors.length > 0 ? 0.44 : 0.2;
        const topMatches = scored.filter((s) => s.score >= threshold).slice(0, 2);

        if (topMatches.length === 0) {
          uncoveredSkills.push(gap.skillName);
        } else {
          for (const m of topMatches) {
            const existing = retrievedMap.get(m.chunk.id);
            if (!existing || m.score > existing.similarityScore) {
              retrievedMap.set(m.chunk.id, {
                chunkId: m.chunk.id,
                resourceId: m.chunk.resourceId,
                resourceTitle: m.chunk.resourceTitle,
                source: m.chunk.source,
                url: m.chunk.url,
                difficulty: m.chunk.difficulty,
                matchedSkillName: gap.skillName,
                similarityScore: Number(m.score.toFixed(3)),
                excerpt: m.chunk.chunkText.slice(0, 320),
              });
            }
          }
        }
      });

      const sourceAttributions = Array.from(retrievedMap.values()).sort(
        (a, b) => b.similarityScore - a.similarityScore
      );

      const insufficientEvidenceNote =
        uncoveredSkills.length > 0
          ? `Knowledge base coverage notice: Insufficient curated RAG sources were found for ${uncoveredSkills.join(', ')}. Tasks for those skills provide general syllabus milestones without external source citations—ask an administrator to add verified resources for those topics.`
          : '';

      if (ai) {
        try {
          const groundedContextBlock =
            sourceAttributions.length > 0
              ? sourceAttributions
                  .map(
                    (attr) =>
                      `[CHUNK_ID: ${attr.chunkId}] Title: "${attr.resourceTitle}" | Source: ${attr.source} | Difficulty: ${attr.difficulty} | URL: ${attr.url} | Matched Skill: ${attr.matchedSkillName}\nExcerpt: ${attr.excerpt}`
                  )
                  .join('\n\n')
              : 'NO MATCHING KNOWLEDGE BASE CHUNKS RETRIEVED.';

          const gapSummaryBlock = actionableGaps
            .map(
              (g) =>
                `- skillId="${g.skillId}", skillName="${g.skillName}", status="${g.statusLabel}", currentLevel=${g.currentProficiency}, targetLevel=${g.requiredProficiency}, weight=${g.importanceWeight}`
            )
            .join('\n');

          const roadmapPrompt = `Generate a personalised, structured ${preferredDurationWeeks}-week learning roadmap for a student preparing for "${roleTitle}" with ${weeklyStudyHours} study hours/week.

Student Skill Gaps to Address:
${gapSummaryBlock}

Retrieved RAG Knowledge Base Chunks (GROUNDING EVIDENCE):
${groundedContextBlock}

STRICT GROUNDING & HONESTY RULES:
1. Prioritise high-weight missing and needs-improvement skills in earlier weeks, and include practical assessment verification steps for unverified skills.
2. Pace weekly tasks so estimatedHours per week stays realistic for ~${weeklyStudyHours} hours/week across ${preferredDurationWeeks} weeks (create 5 to 10 concrete tasks total).
3. ONLY cite a chunkId from the Retrieved RAG Knowledge Base Chunks above when that chunk genuinely covers the task's skill. NEVER invent URLs, sources, or chunkIds!
4. If a skill has no matching retrieved chunk (Uncovered skills: ${uncoveredSkills.join(', ') || 'None'}), set chunkId to "" (empty string) for that task so the UI clearly marks it as ungrounded general study guidance.`;

          const genRes = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: roadmapPrompt,
            config: {
              temperature: 0.2,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  summary: { type: Type.STRING },
                  tasks: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        weekNumber: { type: Type.INTEGER },
                        skillId: { type: Type.STRING },
                        skillName: { type: Type.STRING },
                        title: { type: Type.STRING },
                        actionSteps: { type: Type.STRING },
                        estimatedHours: { type: Type.INTEGER },
                        chunkId: { type: Type.STRING },
                      },
                      required: [
                        'weekNumber',
                        'skillId',
                        'skillName',
                        'title',
                        'actionSteps',
                        'estimatedHours',
                        'chunkId',
                      ],
                    },
                  },
                },
                required: ['summary', 'tasks'],
              },
            },
          });

          const parsedRoadmap = JSON.parse((genRes.text || '{}').trim());
          const chunkLookup = new Map(sourceAttributions.map((a) => [a.chunkId, a]));

          const tasks: RoadmapTaskItem[] = (Array.isArray(parsedRoadmap.tasks)
            ? parsedRoadmap.tasks
            : []
          )
            .slice(0, 16)
            .map((rawTask: any, idx: number) => {
              const matchedChunk = rawTask.chunkId
                ? chunkLookup.get(String(rawTask.chunkId))
                : undefined;
              return {
                id: `task_${idx + 1}_${Date.now()}`,
                weekNumber: Math.min(
                  preferredDurationWeeks,
                  Math.max(1, Number(rawTask.weekNumber) || idx + 1)
                ),
                skillId: String(rawTask.skillId || 'skill_general'),
                skillName: String(rawTask.skillName || 'Core Skill'),
                title: String(rawTask.title || 'Structured Study Module'),
                actionSteps: String(rawTask.actionSteps || ''),
                estimatedHours: Math.min(40, Math.max(1, Number(rawTask.estimatedHours) || 4)),
                resourceTitle: matchedChunk
                  ? matchedChunk.resourceTitle
                  : 'General Practice Milestone (No Verified Corpus Match)',
                resourceSource: matchedChunk ? matchedChunk.source : 'Insufficient RAG Evidence',
                resourceUrl: matchedChunk ? matchedChunk.url : '',
                groundedInCorpus: Boolean(matchedChunk),
                completed: false,
              };
            });

          tasks.sort((a, b) => a.weekNumber - b.weekNumber);

          res.json({
            summary: String(
              parsedRoadmap.summary ||
                `Personalised ${preferredDurationWeeks}-week roadmap structured for ${weeklyStudyHours} hours/week.`
            ),
            insufficientEvidenceNote,
            tasks,
            sourceAttributions,
            retrievalMethod:
              queryVectors.length > 0 ? retrievalMethod : 'tfidf-cosine-vector-fallback',
            generationMode: 'gemini-3.8-flash',
          });
          return;
        } catch {
          // Fall through cleanly to deterministic RAG chunk planner
        }
      }

      const fallbackPlan = buildDeterministicRagRoadmap({
        roleTitle: String(roleTitle),
        actionableGaps,
        weeklyStudyHours: Number(weeklyStudyHours) || 8,
        preferredDurationWeeks: Number(preferredDurationWeeks) || 6,
        sourceAttributions,
        uncoveredSkills,
      });

      res.json({
        summary: fallbackPlan.summary,
        insufficientEvidenceNote,
        tasks: fallbackPlan.tasks,
        sourceAttributions,
        retrievalMethod: 'tfidf-cosine-vector-fallback',
        generationMode: 'rag-deterministic-planner',
      });
    } catch (err) {
      const formatted = formatApiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // 6. Practical Skill Assessment Diagnostic Generator
  app.post('/api/quiz/generate', async (req: Request, res: Response) => {
    try {
      const {
        skillId = 'skill_core_java',
        skillName = 'Core Java & OOP',
        category = 'Programming Languages',
        difficulty = 'Intermediate',
      } = req.body || {};

      const validDifficulty: DifficultyTier =
        difficulty === 'Beginner' || difficulty === 'Advanced' ? difficulty : 'Intermediate';

      const shuffleQuestionOptions = (q: AssessmentQuestion, seedIdx: number): AssessmentQuestion => {
        const correctText = q.options[q.correctIndex];
        const len = q.options.length;
        const offset = (seedIdx + q.prompt.length) % len;
        const rotated = q.options.map((_, i) => q.options[(i + offset) % len]) as [
          string,
          string,
          string,
          string,
        ];
        const nextCorrect = Math.max(0, rotated.indexOf(correctText)) as 0 | 1 | 2 | 3;
        return {
          ...q,
          options: rotated,
          correctIndex: nextCorrect,
        };
      };

      const ai = tryGetAiClient();
      if (ai) {
        try {
          const quizPrompt = `Generate 4 practical, scenario-based multiple-choice diagnostic questions to objectively evaluate a student's "${validDifficulty}" proficiency in "${skillName}" (${category}).
Rules:
1. Each question must test real engineering comprehension, debugging, or applied trade-offs (not trivia).
2. Provide exactly 4 distinct options per question and a concise, educational explanation of why the correct option is right.
3. Vary correctIndex naturally across 0, 1, 2, and 3.`;

          const genRes = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: quizPrompt,
            config: {
              temperature: 0.3,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  questions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        prompt: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        correctIndex: { type: Type.INTEGER },
                        explanation: { type: Type.STRING },
                      },
                      required: ['prompt', 'options', 'correctIndex', 'explanation'],
                    },
                  },
                },
                required: ['questions'],
              },
            },
          });

          const parsed = JSON.parse((genRes.text || '{}').trim());
          const rawList = Array.isArray(parsed.questions) ? parsed.questions : [];
          const formattedQuestions: AssessmentQuestion[] = rawList
            .filter((q: any) => Array.isArray(q.options) && q.options.length >= 4 && q.prompt)
            .slice(0, 5)
            .map((q: any, idx: number) => ({
              id: `ai_q_${String(skillId)}_${Date.now()}_${idx}`,
              skillId: String(skillId),
              skillName: String(skillName),
              difficulty: validDifficulty,
              prompt: String(q.prompt).slice(0, 380),
              options: [
                String(q.options[0]).slice(0, 220),
                String(q.options[1]).slice(0, 220),
                String(q.options[2]).slice(0, 220),
                String(q.options[3]).slice(0, 220),
              ],
              correctIndex: Math.min(3, Math.max(0, Number(q.correctIndex) || 0)) as 0 | 1 | 2 | 3,
              explanation: String(q.explanation || '').slice(0, 380),
            }));

          if (formattedQuestions.length >= 2) {
            res.json({
              questions: formattedQuestions,
              generationMode: 'gemini-3.8-flash',
            });
            return;
          }
        } catch {
          // Fall through to curated deterministic question bank
        }
      }

      const curated = getQuestionsForSkill(
        String(skillId),
        String(skillName),
        validDifficulty
      ).map((q, idx) => shuffleQuestionOptions(q, idx + 1));

      res.json({
        questions: curated,
        generationMode: 'curated-diagnostic-bank',
      });
    } catch (err) {
      const formatted = formatApiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // Catch any unknown /api/* route before Vite SPA fallback so HTML is never returned for API calls
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Requested API endpoint does not exist.' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SkillGapRAG server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
