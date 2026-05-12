"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { buildSampleAnalysisReports, calculateLessonScoreFromMetrics, getLessonInsights, getLessonMetrics, getLessonReportSections, getReportNarrative, getTEKSCoverageInsights, SAMPLE_TEACHER_IDS, type AnalysisReport, type ProfileRecord } from "@/lib/dashboardData";
import { extractSectionText, extractStandardEntries } from "@/lib/analysisReport";
import ProtectedPageState from "@/components/ProtectedPageState";

export default function LessonReportPage() {
  const params = useParams<{ id: string; lessonId: string }>();
  const teacherId = params?.id;
  const lessonId = params?.lessonId;

  const [lesson, setLesson] = useState<AnalysisReport | null>(null);
  const [teacher, setTeacher] = useState<ProfileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [adminFeedbackDraft, setAdminFeedbackDraft] = useState('');
  const [editedAnalysisDraft, setEditedAnalysisDraft] = useState('');
  const [metricDraft, setMetricDraft] = useState({
    coverage: 75,
    clarity: 75,
    engagement: 75,
    assessment: 75,
    gaps: 0,
  });
  const [savingAdminUpdate, setSavingAdminUpdate] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    async function load() {
      setLoadError('');
      if ((teacherId as string)?.startsWith('sample-') || (lessonId as string)?.startsWith('sample-report-')) {
        const sampleLesson = buildSampleAnalysisReports().find((report) => report.id === lessonId);
        setLesson(sampleLesson || null);
        if (sampleLesson?.user_id) {
          const sampleTeacherName =
            Object.entries(SAMPLE_TEACHER_IDS).find(([, sampleId]) => sampleId === sampleLesson.user_id)?.[0] || 'Sample Teacher';
          setTeacher({ id: sampleLesson.user_id, name: sampleTeacherName });
        }
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/admin/teacher/${teacherId}/lesson/${lessonId}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error('Admin lesson load error:', data.error || 'Unknown error');
        setLesson(null);
        setTeacher(null);
        setLoadError(data.error || 'Unable to load lesson report.');
        setLoading(false);
        return;
      }

      setLesson(data.lesson || null);
      setTeacher(data.teacher || null);
      setLoading(false);
    }
    if (lessonId) load();
  }, [lessonId, teacherId]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [lessonId, teacherId]);

  useEffect(() => {
    setAdminFeedbackDraft(lesson?.admin_feedback || '');
    setEditedAnalysisDraft(lesson ? getReportNarrative(lesson) : '');
    const metrics = lesson ? getLessonMetrics(lesson) : null;
    setMetricDraft({
      coverage: metrics?.coverage ?? 75,
      clarity: metrics?.clarity ?? 75,
      engagement: metrics?.engagement ?? 75,
      assessment: metrics?.assessment ?? 75,
      gaps: metrics?.gaps ?? 0,
    });
    setSaveMessage('');
  }, [lesson]);

  if (loading) {
    return (
      <ProtectedPageState
        mode="loading"
        title="Loading lesson report"
        message="Preparing the lesson details, metrics, and standards alignment."
      />
    );
  }
  if (loadError) {
    return (
      <ProtectedPageState
        mode="error"
        title="Unable to load lesson report"
        message={loadError}
        actionHref={teacherId ? `/admin/teacher/${teacherId}` : '/admin'}
        actionLabel={teacherId ? 'Back to Teacher' : 'Back to Administrator Dashboard'}
      />
    );
  }
  if (!lesson) {
    return (
      <ProtectedPageState
        mode="empty"
        title="Lesson not found"
        message="This lesson may have been removed or is no longer available in your current admin scope."
        actionHref={teacherId ? `/admin/teacher/${teacherId}` : '/admin'}
        actionLabel={teacherId ? 'Back to Teacher' : 'Back to Administrator Dashboard'}
      />
    );
  }

  const insights = getLessonInsights(lesson);
  const reportSections = getLessonReportSections(lesson);
  const teksCoverage = getTEKSCoverageInsights(lesson);
  const allHigherEdAlignmentSections = reportSections.higherEdAlignment;
  const hasHigherEdAlignment = allHigherEdAlignmentSections.length > 0;
  const lessonStandards = {
    reinforced: extractStandardEntries([...reportSections.staar, ...reportSections.teks], ['Standards Reinforced', 'Standards Addressed', 'Covered in the Lesson']),
    revisit: extractStandardEntries([...reportSections.staar, ...reportSections.teks], ['Standards That Need Stronger Assessment Evidence', 'Needs Reinforcement']),
    notObserved: extractStandardEntries([...reportSections.staar, ...reportSections.teks], ['Standards Not Observed', 'Not Covered in the Lesson']),
    summary:
      extractSectionText(reportSections.teks, ['Standards Mastery Notes']) ||
      extractSectionText(reportSections.staar, ['Readiness Summary']) ||
      extractSectionText(allHigherEdAlignmentSections, ['Textbook Alignment', 'Summary']),
    recommendations: extractSectionText([...reportSections.staar, ...reportSections.teks], ['Recommended Standards Follow-Up', 'Recommendations for Standards Integration', 'STAAR Readiness Recommendation']),
    sectionHeading: 'Standards Alignment',
    summaryTitle: hasHigherEdAlignment ? 'Textbook Alignment' : 'Standards Summary',
    higherEdAlignment: allHigherEdAlignmentSections.filter(
      (section) => !['Textbook Alignment', 'Summary'].includes(section.title)
    ),
  };
  const submissionContextText = reportSections.submissionContext
    .map((section) => {
      if (section.bullets.length > 0) return section.bullets.join(' · ');
      if (section.title && section.title !== 'Summary' && section.content) {
        return `${section.title}: ${section.content}`;
      }
      return section.content;
    })
    .filter(Boolean)
    .join(' · ');
  const hasStructuredReport = Boolean(
    reportSections.executiveSummary ||
    reportSections.strengths.length ||
    reportSections.improvements.length ||
    reportSections.recommendedNextStep ||
    reportSections.contentGaps.length ||
    reportSections.teks.length ||
    reportSections.staar.length ||
    reportSections.higherEdAlignment.length
  );
  const lessonDate = lesson.created_at ? new Date(lesson.created_at).toLocaleString() : '—';
  const titleText = lesson.title || `${lesson.grade || 'Grade'} ${lesson.subject || 'Lesson'}`;
  const canSaveAdminAdjustments = !String(lesson.id || '').startsWith('sample-report-');
  const adjustedScorePreview = calculateLessonScoreFromMetrics(metricDraft);

  const handleMetricChange = (field: keyof typeof metricDraft, rawValue: string) => {
    const parsed = Number(rawValue);

    setMetricDraft((current) => ({
      ...current,
      [field]: field === 'gaps'
        ? (Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : current.gaps)
        : (Number.isFinite(parsed) ? Math.max(0, Math.min(100, Math.round(parsed))) : current[field]),
    }));
  };

  const handleSaveAdminUpdate = async () => {
    if (!canSaveAdminAdjustments) return;

    setSavingAdminUpdate(true);
    setSaveMessage('');
    try {
      const response = await fetch(`/api/analyses/${lesson.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminFeedback: adminFeedbackDraft,
          editedResult: editedAnalysisDraft,
          metricOverrides: metricDraft,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success || !data.analysis) {
        setSaveMessage(data.error || 'Unable to save administrator updates.');
        return;
      }

      setLesson(data.analysis);
      setSaveMessage('Administrator updates saved.');
    } catch (error) {
      console.error(error);
      setSaveMessage('Unable to save administrator updates.');
    } finally {
      setSavingAdminUpdate(false);
    }
  };

  return (
    <main style={page}>
      <div style={container}>
        <div style={heroCard}>
          <div style={heroTop}>
            <div>
              <div style={eyebrow}>Administrator Lesson Report</div>
              <h1 style={heading}>{titleText}</h1>
              <p style={subheading}>{teacher?.name || 'Unknown'} · {lessonDate}</p>
            </div>
            <Link href={`/admin/teacher/${teacherId}`} style={backLink}>Back to Teacher</Link>
          </div>

          <div style={summaryBanner} className="lesson-report-summary-banner">
            <div>
              <div style={summaryTitle}>Executive Summary</div>
              <div style={summaryText}>{reportSections.executiveSummary}</div>
            </div>
            <div style={summaryScoreCard}>
              <div style={summaryScore}>{insights.score}/100</div>
              <div style={summaryScoreLabel}>Overall Score</div>
            </div>
          </div>

          {submissionContextText && (
            <div style={submissionNote}>
              {submissionContextText}
            </div>
          )}
        </div>

        <div style={metricGrid} className="lesson-report-metric-grid">
          <div style={{ ...metricCard, ...coverageMetricCard }}>
            <div style={metricLabel}>Coverage</div>
            <div style={metricValue}>{insights.coverage}%</div>
          </div>
          <div style={{ ...metricCard, ...clarityMetricCard }}>
            <div style={metricLabel}>Clarity</div>
            <div style={metricValue}>{insights.clarity}%</div>
          </div>
          <div style={{ ...metricCard, ...engagementMetricCard }}>
            <div style={metricLabel}>Engagement</div>
            <div style={metricValue}>{insights.engagement}%</div>
          </div>
          <div style={{ ...metricCard, ...assessmentMetricCard }}>
            <div style={metricLabel}>Assessment</div>
            <div style={metricValue}>{insights.assessment}%</div>
          </div>
          <div style={{ ...metricCard, ...gapsMetricCard }}>
            <div style={metricLabel}>Gaps</div>
            <div style={metricValue}>{insights.gaps}</div>
          </div>
        </div>

        <div style={{ ...sectionCard, ...contextSectionCard }}>
          <h2 style={sectionTitle}>Lesson Context</h2>
          <div style={contextGrid} className="lesson-report-context-grid">
            <div style={contextBox}>
              <div style={metricLabel}>Grade</div>
              <div style={contextValue}>{lesson.grade || '—'}</div>
            </div>
            <div style={contextBox}>
              <div style={metricLabel}>Subject</div>
              <div style={contextValue}>{lesson.subject || '—'}</div>
            </div>
            <div style={contextBox}>
              <div style={metricLabel}>Title</div>
              <div style={contextValue}>{lesson.title || '—'}</div>
            </div>
          </div>
        </div>

        <div style={twoColumnGrid} className="lesson-report-two-column-grid">
          <div style={{ ...sectionCard, ...successSectionCard }}>
            <h2 style={sectionTitle}>What Went Well</h2>
            <ul style={findingsList}>
              {reportSections.strengths.map((finding, index) => (
                <li key={index} style={findingItem}>{finding}</li>
              ))}
            </ul>
          </div>

          <div style={{ ...sectionCard, ...improvementSectionCard }}>
            <h2 style={sectionTitle}>What Can Improve</h2>
            <ul style={findingsList}>
              {reportSections.improvements.map((finding, index) => (
                <li key={index} style={findingItem}>{finding}</li>
              ))}
            </ul>
          </div>
        </div>

        {(reportSections.staar.length > 0 || reportSections.teks.length > 0 || reportSections.higherEdAlignment.length > 0 || teksCoverage) && (
          <div style={{ ...sectionCard, ...teksSectionCard }}>
            <h2 style={sectionTitle}>{lessonStandards.sectionHeading}</h2>
            <div style={teksSectionStack}>
              <div style={teksSectionRow}>
                <div style={subsectionTitle}>{lessonStandards.summaryTitle}</div>
                <p style={bodyText}>
                  {lessonStandards.summary || teksCoverage?.readinessSummary || teksCoverage?.overview || 'Review the standards groups below to see which TEKS were reinforced, which need to be revisited, and which were not yet clearly observed in the lesson evidence.'}
                </p>
              </div>
            </div>
            {(lessonStandards.reinforced.length > 0 || lessonStandards.revisit.length > 0 || lessonStandards.notObserved.length > 0) ? (
              <div style={teksSectionStack}>
                <div style={teksSectionRow}>
                  <div style={subsectionTitle}>Standards Covered</div>
                  {lessonStandards.reinforced.length > 0 ? (
                    <ul style={findingsList}>
                      {lessonStandards.reinforced.map((standard) => (
                        <li key={`reinforced-${standard.code}`} style={findingItem}>
                          <strong>{standard.code}</strong>: {standard.description}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={bodyText}>No clearly reinforced TEKS were identified in the saved analysis.</p>
                  )}
                </div>
                <div style={teksSectionRow}>
                  <div style={subsectionTitle}>Standards To Revisit</div>
                  {lessonStandards.revisit.length > 0 ? (
                    <ul style={findingsList}>
                      {lessonStandards.revisit.map((standard) => (
                        <li key={`revisit-${standard.code}`} style={findingItem}>
                          <strong>{standard.code}</strong>: {standard.description}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={bodyText}>No additional TEKS were flagged for stronger assessment evidence in this report.</p>
                  )}
                </div>
                <div style={teksSectionRow}>
                  <div style={subsectionTitle}>Standards Not Observed</div>
                  {lessonStandards.notObserved.length > 0 ? (
                    <ul style={findingsList}>
                      {lessonStandards.notObserved.map((standard) => (
                        <li key={`not-observed-${standard.code}`} style={findingItem}>
                          <strong>{standard.code}</strong>: {standard.description}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={bodyText}>No topic-related TEKS were marked as missing or underdeveloped in the saved analysis.</p>
                  )}
                </div>
              </div>
            ) : teksCoverage?.hasStandards && (
              <div style={{ ...teksSectionRow, marginTop: 8 }}>
                <div style={subsectionTitle}>Priority TEKS Observed</div>
                <ul style={findingsList}>
                  {teksCoverage.standards.map((standard) => (
                    <li key={standard.code} style={findingItem}>
                      <strong>{standard.code}</strong>: {standard.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {lessonStandards.recommendations && (
              <div style={{ ...teksSectionRow, marginTop: 8 }}>
                <div style={subsectionTitle}>Recommended Standards Follow-Up</div>
                <p style={bodyText}>{lessonStandards.recommendations}</p>
              </div>
            )}
            {lessonStandards.higherEdAlignment.length > 0 && (
              <div style={teksSectionStack}>
                {lessonStandards.higherEdAlignment.map((section, index) => (
                  <div key={`higher-ed-alignment-${index}`} style={teksSectionRow}>
                    <div style={subsectionTitle}>{section.title}</div>
                    {section.bullets.length > 0 ? (
                      <ul style={findingsList}>
                        {section.bullets.map((item, itemIndex) => (
                          <li key={`higher-ed-alignment-item-${itemIndex}`} style={findingItem}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p style={bodyText}>{section.content}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
            {reportSections.teks.length === 0 && (teksCoverage?.strengths?.length ?? 0) > 0 && (
              <div style={{ ...teksSectionRow, marginTop: 8 }}>
                <div style={subsectionTitle}>Alignment Strengths</div>
                <ul style={findingsList}>
                  {teksCoverage?.strengths.map((finding, index) => (
                    <li key={`strength-${index}`} style={findingItem}>{finding}</li>
                  ))}
                </ul>
              </div>
            )}
            {reportSections.teks.length === 0 && (teksCoverage?.gaps?.length ?? 0) > 0 && (
              <div style={{ ...teksSectionRow, marginTop: 8 }}>
                <div style={subsectionTitle}>Alignment Gaps</div>
                <ul style={findingsList}>
                  {teksCoverage?.gaps.map((finding, index) => (
                    <li key={`gap-${index}`} style={findingItem}>{finding}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {reportSections.contentGaps.length > 0 && (
          <div style={{ ...sectionCard, ...analysisSectionCard }}>
            <h2 style={sectionTitle}>Content Gaps To Reinforce</h2>
            <ul style={findingsList}>
              {reportSections.contentGaps.map((gap, index) => (
                <li key={`content-gap-${index}`} style={findingItem}>{gap}</li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ ...sectionCard, ...nextStepSectionCard }}>
          <h2 style={sectionTitle}>Recommended Next Step</h2>
          <p style={bodyText}>{reportSections.recommendedNextStep}</p>
        </div>

        {lesson.teacher_feedback && (
          <div style={{ ...sectionCard, ...analysisSectionCard }}>
            <h2 style={sectionTitle}>Teacher Feedback On This Analysis</h2>
            <p style={bodyText}>{lesson.teacher_feedback}</p>
            {lesson.teacher_feedback_updated_at ? (
              <div style={helperText}>Last updated {new Date(lesson.teacher_feedback_updated_at).toLocaleDateString()}</div>
            ) : null}
          </div>
        )}

        <div style={{ ...sectionCard, ...analysisSectionCard }}>
          <h2 style={sectionTitle}>Administrator Feedback and Adjustments</h2>
          <p style={bodyText}>
            Use this to note what the analysis missed and refine the saved write-up when you need a cleaner final version for coaching conversations.
          </p>
          <div style={editorGrid} className="lesson-report-two-column-grid">
            <div style={editorCard}>
              <div style={subsectionTitle}>Administrator Notes</div>
              <textarea
                value={adminFeedbackDraft}
                onChange={(event) => setAdminFeedbackDraft(event.target.value)}
                placeholder="Add coaching notes about what the analysis got right, missed, or should handle better next time."
                style={editorTextarea}
                disabled={!canSaveAdminAdjustments || savingAdminUpdate}
              />
              {lesson.admin_feedback_updated_at || lesson.admin_feedback_author_name ? (
                <div style={helperText}>
                  {lesson.admin_feedback_author_name || 'Administrator'}
                  {lesson.admin_feedback_updated_at
                    ? ` · Updated ${new Date(lesson.admin_feedback_updated_at).toLocaleDateString()}`
                    : ''}
                </div>
              ) : null}
            </div>
            <div style={editorCard}>
              <div style={subsectionTitle}>Adjusted Metrics</div>
              <p style={bodyText}>
                If you observed something the analysis missed, you can correct the lesson write-up and refresh the saved scoring here.
              </p>
              <div style={metricEditorGrid}>
                <label style={metricEditorField}>
                  <span style={metricEditorLabel}>Coverage</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={metricDraft.coverage}
                    onChange={(event) => handleMetricChange('coverage', event.target.value)}
                    style={metricEditorInput}
                    disabled={!canSaveAdminAdjustments || savingAdminUpdate}
                  />
                </label>
                <label style={metricEditorField}>
                  <span style={metricEditorLabel}>Clarity</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={metricDraft.clarity}
                    onChange={(event) => handleMetricChange('clarity', event.target.value)}
                    style={metricEditorInput}
                    disabled={!canSaveAdminAdjustments || savingAdminUpdate}
                  />
                </label>
                <label style={metricEditorField}>
                  <span style={metricEditorLabel}>Engagement</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={metricDraft.engagement}
                    onChange={(event) => handleMetricChange('engagement', event.target.value)}
                    style={metricEditorInput}
                    disabled={!canSaveAdminAdjustments || savingAdminUpdate}
                  />
                </label>
                <label style={metricEditorField}>
                  <span style={metricEditorLabel}>Assessment</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={metricDraft.assessment}
                    onChange={(event) => handleMetricChange('assessment', event.target.value)}
                    style={metricEditorInput}
                    disabled={!canSaveAdminAdjustments || savingAdminUpdate}
                  />
                </label>
                <label style={metricEditorField}>
                  <span style={metricEditorLabel}>Gaps</span>
                  <input
                    type="number"
                    min={0}
                    value={metricDraft.gaps}
                    onChange={(event) => handleMetricChange('gaps', event.target.value)}
                    style={metricEditorInput}
                    disabled={!canSaveAdminAdjustments || savingAdminUpdate}
                  />
                </label>
              </div>
              <div style={metricPreviewRow}>
                <div style={metricPreviewLabel}>Updated instructional score</div>
                <div style={metricPreviewValue}>{adjustedScorePreview}/100</div>
              </div>
            </div>
            <div style={editorCard}>
              <div style={subsectionTitle}>Editable Analysis Text</div>
              <textarea
                value={editedAnalysisDraft}
                onChange={(event) => setEditedAnalysisDraft(event.target.value)}
                placeholder="Refine the saved analysis text if you want to clean up wording or adjust the final coaching write-up."
                style={{ ...editorTextarea, minHeight: 320 }}
                disabled={!canSaveAdminAdjustments || savingAdminUpdate}
              />
              {lesson.admin_edited_result_updated_at || lesson.admin_edited_result_editor_name ? (
                <div style={helperText}>
                  {lesson.admin_edited_result_editor_name || 'Administrator'}
                  {lesson.admin_edited_result_updated_at
                    ? ` · Edited ${new Date(lesson.admin_edited_result_updated_at).toLocaleDateString()}`
                    : ''}
                </div>
              ) : null}
            </div>
          </div>
          <div style={editorActions}>
            <div style={helperText}>
              {saveMessage || (canSaveAdminAdjustments ? 'Saved edits will become the displayed analysis for this lesson.' : 'Sample lesson reports cannot be edited.')}
            </div>
            <button
              type="button"
              onClick={handleSaveAdminUpdate}
              disabled={!canSaveAdminAdjustments || savingAdminUpdate}
              style={{
                ...saveButton,
                opacity: !canSaveAdminAdjustments || savingAdminUpdate ? 0.6 : 1,
                cursor: !canSaveAdminAdjustments || savingAdminUpdate ? 'not-allowed' : 'pointer',
              }}
            >
              {savingAdminUpdate ? 'Saving...' : 'Save Administrator Update'}
            </button>
          </div>
        </div>

        {!hasStructuredReport && (
          <div style={{ ...sectionCard, ...analysisSectionCard }}>
            <h2 style={sectionTitle}>AI Analysis</h2>
            {lesson.admin_edited_result ? (
              <div style={submissionNote}>Administrator-edited analysis is currently shown below.</div>
            ) : null}
            <div style={longformText}>{getReportNarrative(lesson) || 'No saved analysis text available.'}</div>
          </div>
        )}
      </div>
    </main>
  );
}

const page: React.CSSProperties = {
  minHeight: '100vh',
  background: 'var(--surface-page)',
  paddingTop: 18,
};

const container: React.CSSProperties = {
  maxWidth: 980,
  margin: '0 auto',
};

const heroCard: React.CSSProperties = {
  background: 'var(--surface-card-solid)',
  border: '1px solid rgba(249,115,22,0.16)',
  borderRadius: 18,
  padding: 28,
  marginBottom: 22,
  boxShadow: 'var(--shadow-soft)',
};

const heroTop: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
  flexWrap: 'wrap',
};

const eyebrow: React.CSSProperties = {
  color: '#c2410c',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: 0.7,
  fontWeight: 700,
};

const heading: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: 30,
  margin: '8px 0 6px 0',
};

const subheading: React.CSSProperties = {
  color: 'var(--text-secondary)',
  margin: 0,
};

const backLink: React.CSSProperties = {
  color: '#f97316',
  textDecoration: 'none',
  fontWeight: 600,
  whiteSpace: 'nowrap',
};

const summaryBanner: React.CSSProperties = {
  marginTop: 18,
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) 150px',
  gap: 16,
  alignItems: 'center',
  padding: 18,
  borderRadius: 14,
  background: 'var(--surface-chip)',
  border: '1px solid rgba(249,115,22,0.14)',
};

const summaryTitle: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: 14,
  fontWeight: 700,
  marginBottom: 6,
};

const summaryText: React.CSSProperties = {
  color: 'var(--text-primary)',
  lineHeight: 1.6,
};

const summaryScoreCard: React.CSSProperties = {
  borderRadius: 14,
  border: '1px solid rgba(249,115,22,0.16)',
  background: 'var(--surface-card-solid)',
  padding: 18,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
};

const summaryScore: React.CSSProperties = {
  color: '#c2410c',
  fontSize: 34,
  fontWeight: 800,
};

const summaryScoreLabel: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  marginTop: 4,
};

const submissionNote: React.CSSProperties = {
  marginTop: 14,
  padding: '10px 14px',
  borderRadius: 12,
  border: '1px solid rgba(148,163,184,0.18)',
  background: 'var(--surface-card-solid)',
  color: 'var(--text-secondary)',
  fontSize: 13,
  lineHeight: 1.5,
};

const metricGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: 14,
  marginBottom: 22,
};

const metricCard: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  background: 'var(--surface-card-solid)',
  border: '1px solid var(--border)',
  borderRadius: 14,
  padding: '14px 16px',
  boxShadow: 'var(--shadow-soft)',
};

const metricLabel: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  fontWeight: 700,
};

const metricValue: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: 24,
  fontWeight: 700,
  lineHeight: 1,
  whiteSpace: 'nowrap',
};

const sectionCard: React.CSSProperties = {
  background: 'var(--surface-card-solid)',
  border: '1px solid var(--border)',
  borderRadius: 14,
  padding: 22,
  marginBottom: 18,
  boxShadow: 'var(--shadow-soft)',
};

const sectionTitle: React.CSSProperties = {
  color: 'var(--text-primary)',
  margin: '0 0 12px 0',
};

const subsectionTitle: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: 13,
  fontWeight: 700,
  marginBottom: 8,
};

const contextGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 12,
};

const contextBox: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: 14,
  background: 'var(--surface-chip)',
};

const contextValue: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: 15,
  marginTop: 6,
  fontWeight: 600,
};

const findingsList: React.CSSProperties = {
  color: 'var(--text-secondary)',
  margin: 0,
  paddingLeft: 18,
};

const findingItem: React.CSSProperties = {
  marginBottom: 10,
  lineHeight: 1.65,
};

const bodyText: React.CSSProperties = {
  color: 'var(--text-secondary)',
  lineHeight: 1.7,
  margin: 0,
};

const longformText: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 15,
  lineHeight: 1.75,
  whiteSpace: 'pre-wrap',
};

const helperText: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: 12,
  lineHeight: 1.5,
  marginTop: 10,
};

const editorGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: 14,
  marginTop: 16,
};

const editorCard: React.CSSProperties = {
  borderRadius: 14,
  border: '1px solid var(--border)',
  background: 'var(--surface-chip)',
  padding: 14,
};

const metricEditorGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
  gap: 12,
  marginTop: 14,
};

const metricEditorField: React.CSSProperties = {
  display: 'grid',
  gap: 8,
};

const metricEditorLabel: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};

const metricEditorInput: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'var(--surface-input)',
  color: 'var(--text-primary)',
  fontSize: 14,
  fontWeight: 600,
};

const metricPreviewRow: React.CSSProperties = {
  marginTop: 14,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid rgba(249,115,22,0.14)',
  background: 'rgba(249,115,22,0.07)',
};

const metricPreviewLabel: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 13,
  fontWeight: 600,
};

const metricPreviewValue: React.CSSProperties = {
  color: '#c2410c',
  fontSize: 22,
  fontWeight: 800,
  whiteSpace: 'nowrap',
};

const editorTextarea: React.CSSProperties = {
  width: '100%',
  minHeight: 180,
  marginTop: 10,
  padding: '14px 16px',
  borderRadius: 12,
  border: '1px solid var(--border)',
  background: 'var(--surface-input)',
  color: 'var(--text-primary)',
  fontSize: 14,
  lineHeight: 1.6,
  resize: 'vertical',
};

const editorActions: React.CSSProperties = {
  marginTop: 14,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap',
};

const saveButton: React.CSSProperties = {
  border: '1px solid rgba(249,115,22,0.2)',
  background: 'linear-gradient(135deg, #fb923c, #f97316)',
  color: '#fff',
  borderRadius: 999,
  padding: '10px 18px',
  fontWeight: 700,
  boxShadow: '0 10px 18px rgba(249,115,22,0.22)',
};

const twoColumnGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: 18,
};

const coverageMetricCard: React.CSSProperties = {
  background: 'var(--surface-card-solid)',
  borderColor: 'rgba(59,130,246,0.16)',
};

const clarityMetricCard: React.CSSProperties = {
  background: 'var(--surface-card-solid)',
  borderColor: 'rgba(14,165,233,0.16)',
};

const engagementMetricCard: React.CSSProperties = {
  background: 'var(--surface-card-solid)',
  borderColor: 'rgba(16,185,129,0.16)',
};

const assessmentMetricCard: React.CSSProperties = {
  background: 'var(--surface-card-solid)',
  borderColor: 'rgba(245,158,11,0.16)',
};

const gapsMetricCard: React.CSSProperties = {
  background: 'var(--surface-card-solid)',
  borderColor: 'rgba(239,68,68,0.16)',
};

const contextSectionCard: React.CSSProperties = {
  background: 'var(--surface-card-solid)',
};

const successSectionCard: React.CSSProperties = {
  background: 'var(--surface-card-solid)',
  borderColor: 'rgba(16,185,129,0.18)',
};

const improvementSectionCard: React.CSSProperties = {
  background: 'var(--surface-card-solid)',
  borderColor: 'rgba(245,158,11,0.18)',
};

const nextStepSectionCard: React.CSSProperties = {
  background: 'var(--surface-card-solid)',
  borderColor: 'rgba(249,115,22,0.18)',
};

const teksSectionCard: React.CSSProperties = {
  background: 'var(--surface-card-solid)',
  borderColor: 'rgba(59,130,246,0.18)',
};

const teksSectionStack: React.CSSProperties = {
  display: 'grid',
  gap: 0,
  marginTop: 8,
  borderTop: '1px solid rgba(59,130,246,0.12)',
};

const teksSectionRow: React.CSSProperties = {
  padding: '18px 0',
  borderBottom: '1px solid rgba(59,130,246,0.12)',
};

const analysisSectionCard: React.CSSProperties = {
  background: 'var(--surface-card-solid)',
  borderColor: 'rgba(99,102,241,0.16)',
};
