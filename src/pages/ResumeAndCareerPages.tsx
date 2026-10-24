import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, FileUp, Plus, Trash2 } from 'lucide-react';
import {
  AppPage,
  ExtractedResumeSkill,
  JobRole,
  PROFICIENCY_LABELS,
  ProficiencyLevel,
  ResumeRecord,
  RoleRequirement,
  SkillDefinition,
  StudentSkillEntry,
  UserAccount,
} from '../types';
import { SAMPLE_STUDENT_RESUME_TEXT } from '../data/seedCatalog';
import { postApiJson } from '../lib/apiClient';
import { formatFriendlyError } from '../lib/firebase';
import { evaluateSkillGapForRole } from '../services/skillEngine';

interface ResumeAnalysisPageProps {
  account: UserAccount;
  latestResume: ResumeRecord | null;
  skillsCatalog: SkillDefinition[];
  onSaveExtractedResumeAndConfirmSkills: (params: {
    file: File | null;
    fileName: string;
    mimeType: string;
    fileSizeBytes: number;
    extractedText: string;
    extractedSkills: ExtractedResumeSkill[];
    projects: string[];
    certificates: string[];
    experienceSummary: string;
    confirmedSkills: StudentSkillEntry[];
  }) => Promise<void>;
  onNavigate: (page: AppPage) => void;
}

export const ResumeAnalysisPage: React.FC<ResumeAnalysisPageProps> = ({
  account,
  latestResume,
  skillsCatalog,
  onSaveExtractedResumeAndConfirmSkills,
  onNavigate,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  const [fileName, setFileName] = useState<string>(latestResume?.fileName || '');
  const [fileSizeBytes, setFileSizeBytes] = useState<number>(latestResume?.fileSizeBytes || 0);
  const [extractedText, setExtractedText] = useState<string>(latestResume?.extractedText || '');
  const [editableSkills, setEditableSkills] = useState<ExtractedResumeSkill[]>(
    latestResume?.extractedSkills || []
  );
  const [projectsText, setProjectsText] = useState<string>(
    (latestResume?.projects || []).join('\n')
  );
  const [certsText, setCertsText] = useState<string>(
    (latestResume?.certificates || []).join('\n')
  );
  const [experienceSummary, setExperienceSummary] = useState<string>(
    latestResume?.experienceSummary || ''
  );

  const [addCatalogSkillId, setAddCatalogSkillId] = useState<string>(skillsCatalog[0]?.id || '');

  // Hydrate saved resume record once Firestore subscription delivers it if user hasn't started editing a new upload
  useEffect(() => {
    if (latestResume && !extractedText && editableSkills.length === 0 && !extracting) {
      setFileName(latestResume.fileName || '');
      setFileSizeBytes(latestResume.fileSizeBytes || 0);
      setExtractedText(latestResume.extractedText || '');
      setEditableSkills(latestResume.extractedSkills || []);
      setProjectsText((latestResume.projects || []).join('\n'));
      setCertsText((latestResume.certificates || []).join('\n'));
      setExperienceSummary(latestResume.experienceSummary || '');
    }
  }, [latestResume, extractedText, editableSkills.length, extracting]);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = String(reader.result || '');
        const commaIdx = res.indexOf(',');
        resolve(commaIdx >= 0 ? res.slice(commaIdx + 1) : res);
      };
      reader.onerror = () => reject(new Error('Failed to read local PDF file.'));
      reader.readAsDataURL(file);
    });

  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setAiNotice(null);
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;

    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg('Invalid file format. Please upload a PDF (.pdf) resume file.');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setErrorMsg('File exceeds the 5 MB maximum upload size. Please upload a smaller PDF.');
      return;
    }

    setSelectedFile(f);
    setFileName(f.name);
    setFileSizeBytes(f.size);
    setExtracting(true);

    try {
      const base64Data = await fileToBase64(f);
      const data = await postApiJson<{
        extractedText: string;
        extractedSkills: ExtractedResumeSkill[];
        projects: string[];
        certificates: string[];
        experienceSummary: string;
        aiNotice?: string;
      }>('/api/resume/extract', {
        fileName: f.name,
        mimeType: 'application/pdf',
        fileSizeBytes: f.size,
        base64Data,
        catalogSkills: skillsCatalog,
      });

      setExtractedText(data.extractedText || '');
      setEditableSkills(Array.isArray(data.extractedSkills) ? data.extractedSkills : []);
      setProjectsText(Array.isArray(data.projects) ? data.projects.join('\n') : '');
      setCertsText(Array.isArray(data.certificates) ? data.certificates.join('\n') : '');
      setExperienceSummary(data.experienceSummary || '');
      setAiNotice(data.aiNotice || null);
    } catch (err) {
      setErrorMsg(formatFriendlyError(err, 'Unable to parse PDF resume.'));
    } finally {
      setExtracting(false);
    }
  };

  const handleLoadSampleResume = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setAiNotice(null);
    setSelectedFile(null);
    setFileName('sample_student_resume.pdf');
    setFileSizeBytes(SAMPLE_STUDENT_RESUME_TEXT.length);
    setExtracting(true);

    try {
      const data = await postApiJson<{
        extractedText: string;
        extractedSkills: ExtractedResumeSkill[];
        projects: string[];
        certificates: string[];
        experienceSummary: string;
        aiNotice?: string;
      }>('/api/resume/extract', {
        fileName: 'sample_student_resume.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: SAMPLE_STUDENT_RESUME_TEXT.length,
        rawText: SAMPLE_STUDENT_RESUME_TEXT,
        catalogSkills: skillsCatalog,
      });

      setExtractedText(data.extractedText || SAMPLE_STUDENT_RESUME_TEXT);
      setEditableSkills(Array.isArray(data.extractedSkills) ? data.extractedSkills : []);
      setProjectsText(Array.isArray(data.projects) ? data.projects.join('\n') : '');
      setCertsText(Array.isArray(data.certificates) ? data.certificates.join('\n') : '');
      setExperienceSummary(data.experienceSummary || '');
      setAiNotice(data.aiNotice || null);
    } catch (err) {
      setErrorMsg(formatFriendlyError(err, 'Sample resume extraction failed.'));
    } finally {
      setExtracting(false);
    }
  };

  const handleAddSkillRow = () => {
    const def = skillsCatalog.find((s) => s.id === addCatalogSkillId);
    if (!def) return;
    if (editableSkills.some((s) => s.skillId === def.id)) return;
    setEditableSkills((prev) => [
      ...prev,
      {
        skillId: def.id,
        skillName: def.name,
        category: def.category,
        suggestedProficiency: 2,
        evidenceSnippet: 'Added manually by student during resume confirmation',
      },
    ]);
  };

  const handleConfirmAndSave = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setSaving(true);

    try {
      const prevMap = new Map<string, StudentSkillEntry>(
        account.confirmedSkills.map((s) => [s.skillId, s])
      );

      const mergedConfirmed: StudentSkillEntry[] = editableSkills.map((ext) => {
        const prev = prevMap.get(ext.skillId);
        if (prev && prev.verifiedByAssessment) {
          return prev;
        }
        return {
          skillId: ext.skillId,
          skillName: ext.skillName,
          category: ext.category,
          proficiency: ext.suggestedProficiency as ProficiencyLevel,
          verifiedByAssessment: false,
          source: 'resume',
          evidenceNote: ext.evidenceSnippet,
        };
      });

      // Keep previously verified skills even if omitted from this resume
      for (const prev of account.confirmedSkills) {
        if (!mergedConfirmed.some((m) => m.skillId === prev.skillId)) {
          mergedConfirmed.push(prev);
        }
      }

      const projects = projectsText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      const certificates = certsText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      await onSaveExtractedResumeAndConfirmSkills({
        file: selectedFile,
        fileName: fileName || 'resume.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes,
        extractedText,
        extractedSkills: editableSkills,
        projects,
        certificates,
        experienceSummary,
        confirmedSkills: mergedConfirmed,
      });

      setSuccessMsg(
        'Resume record saved privately and confirmed skills synced to your student profile.'
      );
    } catch (err) {
      setErrorMsg(formatFriendlyError(err, 'Failed to save confirmed resume skills.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Step 02 of 06 · PDF Resume Intake &amp; Skill Confirmation
          </p>
          <h1 className="text-2xl font-bold text-slate-900">
            PDF Resume Upload &amp; Skill Extraction
          </h1>
          <p className="text-sm text-slate-600">
            Upload a PDF resume (max 5 MB) to extract technical skills, projects, and certificates. Review and edit before confirming to your profile.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate(AppPage.CAREER_SELECTION)}
          className="px-4 py-2 text-xs font-semibold rounded-xl glass-btn-secondary whitespace-nowrap shrink-0"
        >
          Continue to Step 03: Target Role →
        </button>
      </div>

      {/* Upload Glass Panel */}
      <div className="glass-panel rounded-2xl p-6 sm:p-7 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-900">
              1. Upload Student Resume (PDF)
            </h2>
            <p className="text-xs text-slate-500">
              Validated for <span className="font-mono">application/pdf</span> up to 5 MB. Absent resume keywords are never treated as proof that you lack a skill.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <label className="px-4 py-2 text-xs font-semibold rounded-xl glass-btn-primary cursor-pointer inline-flex items-center gap-2 whitespace-nowrap">
              <FileUp className="w-4 h-4" />
              {extracting ? 'Extracting Skills...' : 'Choose PDF File'}
              <input
                type="file"
                accept="application/pdf,.pdf"
                disabled={extracting}
                onChange={handleFilePicked}
                className="hidden"
              />
            </label>
            <button
              type="button"
              disabled={extracting}
              onClick={handleLoadSampleResume}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl glass-btn-secondary whitespace-nowrap"
            >
              Test with Sample Student Resume
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl glass-alert-error text-xs">{errorMsg}</div>
        )}
        {aiNotice && (
          <div className="p-3.5 rounded-xl glass-well text-xs text-slate-700 leading-relaxed">
            {aiNotice}
          </div>
        )}
        {successMsg && (
          <div className="p-3.5 rounded-xl glass-alert-success text-xs flex flex-wrap items-center justify-between gap-4">
            <span>{successMsg}</span>
            <button
              type="button"
              onClick={() => onNavigate(AppPage.CAREER_SELECTION)}
              className="font-semibold underline whitespace-nowrap"
            >
              Proceed to Step 03: Career Role Selection →
            </button>
          </div>
        )}
      </div>

      {/* Editable Review Panel */}
      {(extractedText || editableSkills.length > 0) && (
        <div className="glass-panel rounded-2xl divide-y divide-slate-200/80 overflow-hidden">
          <div className="p-6 sm:p-7 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  2. Review &amp; Confirm Extracted Technical Skills ({editableSkills.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Adjust initial proficiency (1–3) or add unlisted skills you know. Practical assessments will verify mastery in Step 06.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={addCatalogSkillId}
                  onChange={(e) => setAddCatalogSkillId(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg glass-input"
                >
                  {skillsCatalog.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddSkillRow}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg glass-btn-secondary inline-flex items-center gap-1 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Unlisted Skill
                </button>
              </div>
            </div>

            <div className="overflow-x-auto glass-well rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 text-xs text-slate-500 bg-slate-100/50">
                    <th className="py-2.5 px-4 font-medium">Skill Name</th>
                    <th className="py-2.5 px-4 font-medium">Category</th>
                    <th className="py-2.5 px-4 font-medium">Resume Evidence Note</th>
                    <th className="py-2.5 px-4 font-medium">Initial Level</th>
                    <th className="py-2.5 px-4 font-medium text-right">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 text-xs">
                  {editableSkills.map((sk, idx) => (
                    <tr key={sk.skillId} className="hover:bg-white/60 transition-colors">
                      <td className="py-2.5 px-4">
                        <input
                          type="text"
                          value={sk.skillName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditableSkills((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, skillName: val } : item
                              )
                            );
                          }}
                          className="w-full px-2 py-1 rounded-md glass-input font-medium text-slate-900"
                        />
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">{sk.category}</td>
                      <td className="py-2.5 px-4">
                        <input
                          type="text"
                          value={sk.evidenceSnippet}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditableSkills((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, evidenceSnippet: val } : item
                              )
                            );
                          }}
                          className="w-full px-2 py-1 rounded-md glass-input text-slate-600"
                        />
                      </td>
                      <td className="py-2.5 px-4">
                        <select
                          value={sk.suggestedProficiency}
                          onChange={(e) => {
                            const lvl = Number(e.target.value) as 1 | 2 | 3 | 4;
                            setEditableSkills((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, suggestedProficiency: lvl } : item
                              )
                            );
                          }}
                          className="px-2 py-1 rounded-md font-mono tabular-nums glass-input"
                        >
                          <option value={1}>1 · Beginner</option>
                          <option value={2}>2 · Intermediate</option>
                          <option value={3}>3 · Advanced</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setEditableSkills((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Remove skill"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Editable Projects, Certificates, and Experience */}
          <div className="p-6 sm:p-7 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Extracted Projects (one per line, editable)
              </label>
              <textarea
                rows={4}
                value={projectsText}
                onChange={(e) => setProjectsText(e.target.value)}
                placeholder="No projects listed in document."
                className="w-full p-3 text-xs rounded-xl glass-input"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Extracted Certificates (one per line, editable)
              </label>
              <textarea
                rows={4}
                value={certsText}
                onChange={(e) => setCertsText(e.target.value)}
                placeholder="No certificates listed in document."
                className="w-full p-3 text-xs rounded-xl glass-input"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Experience Summary (editable)
              </label>
              <textarea
                rows={2}
                value={experienceSummary}
                onChange={(e) => setExperienceSummary(e.target.value)}
                className="w-full p-3 text-xs rounded-xl glass-input"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Extracted Resume Text Preview ({fileName})
              </label>
              <textarea
                rows={4}
                value={extractedText}
                onChange={(e) => setExtractedText(e.target.value)}
                className="w-full p-3 text-xs font-mono glass-well rounded-xl text-slate-700"
              />
            </div>
          </div>

          <div className="p-6 sm:p-7 glass-well flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-xs text-slate-600">
              Confirming saves this private record to <span className="font-mono">/resumes</span> and updates your confirmed skill profile.
            </p>
            <button
              type="button"
              disabled={saving}
              onClick={handleConfirmAndSave}
              className="px-5 py-2.5 disabled:opacity-60 text-sm font-semibold rounded-xl glass-btn-primary inline-flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              {saving ? 'Confirming & Saving...' : 'Confirm Skills & Save to Profile'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface CareerSelectionPageProps {
  account: UserAccount;
  roles: JobRole[];
  requirements: RoleRequirement[];
  savingRole: boolean;
  onSelectRole: (roleId: string) => Promise<void>;
  onNavigate: (page: AppPage) => void;
}

export const CareerSelectionPage: React.FC<CareerSelectionPageProps> = ({
  account,
  roles,
  requirements,
  savingRole,
  onSelectRole,
  onNavigate,
}) => {
  const [roleError, setRoleError] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Step 03 of 06 · Target Career Track &amp; Competency Weights
          </p>
          <h1 className="text-2xl font-bold text-slate-900">Select Target Career Role</h1>
          <p className="text-sm text-slate-600 max-w-3xl">
            Compare your confirmed skills against curated career tracks. Roles marked as sample datasets represent illustrative academic preparation rubrics rather than verified live employer hiring criteria.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate(AppPage.SKILL_GAP_ANALYSIS)}
          className="px-4 py-2 text-xs font-semibold rounded-xl glass-btn-secondary whitespace-nowrap shrink-0"
        >
          Continue to Step 04: Gap Matrix →
        </button>
      </div>

      {roleError && (
        <div className="p-3.5 rounded-xl glass-alert-error text-xs">{roleError}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {roles.map((role) => {
          const evalPreview = evaluateSkillGapForRole(role, requirements, account.confirmedSkills);
          const isCurrent = account.selectedRoleId === role.id;

          return (
            <div
              key={role.id}
              className={`rounded-2xl p-6 flex flex-col justify-between ${
                isCurrent ? 'glass-panel-active' : 'glass-panel-interactive'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500">
                      {role.department} · {role.isSampleDataset ? 'Sample dataset' : 'Custom role'}
                    </p>
                    <h2 className="text-lg font-bold text-slate-900 mt-0.5">{role.title}</h2>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-bold font-mono tabular-nums text-slate-900">
                      {evalPreview.skillMatchScore}%
                    </p>
                    <p className="text-[11px] text-slate-500">Match Score</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{role.description}</p>

                <div className="glass-well rounded-xl p-3.5 space-y-2">
                  <p className="text-xs font-semibold text-slate-800">
                    Required Technical Skills ({evalPreview.items.length})
                  </p>
                  <div className="divide-y divide-slate-200/70">
                    {evalPreview.items.map((item) => (
                      <div
                        key={item.requirementId}
                        className="py-1.5 flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="text-slate-800 truncate">{item.skillName}</span>
                        <span className="font-mono tabular-nums text-slate-500 shrink-0">
                          Target {PROFICIENCY_LABELS[item.requiredProficiency].split(' ')[0]} · W
                          {item.importanceWeight}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-5 mt-5 border-t border-slate-200/80 flex items-center justify-between gap-3">
                {isCurrent ? (
                  <span className="text-xs font-semibold text-blue-700 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Selected Target
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 font-mono tabular-nums">
                    {evalPreview.missingCount} missing · {evalPreview.needsImprovementCount} improve
                  </span>
                )}

                <button
                  type="button"
                  disabled={savingRole}
                  onClick={async () => {
                    setRoleError(null);
                    try {
                      await onSelectRole(role.id);
                      onNavigate(AppPage.SKILL_GAP_ANALYSIS);
                    } catch (err) {
                      setRoleError(formatFriendlyError(err, 'Unable to update target role.'));
                    }
                  }}
                  className={`px-4 py-2 text-xs font-semibold rounded-xl whitespace-nowrap shrink-0 ${
                    isCurrent ? 'glass-btn-primary' : 'glass-btn-obsidian'
                  }`}
                >
                  {isCurrent ? 'Open Step 04 Gap Matrix →' : 'Select Role & Analyze'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
