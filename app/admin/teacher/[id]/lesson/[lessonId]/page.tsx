"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { buildSampleAnalysisReports, getLessonInsights, getLessonReportSections, getTEKSCoverageInsights, SAMPLE_TEACHER_IDS, type AnalysisReport, type ProfileRecord } from "@/lib/dashboardData";
import { extractSectionText, extractStandardEntries } from "@/lib/analysisReport";

export default function LessonReportPage() {
  const params = useParams<{ id: string; lessonId: string }>();
  const teacherId = params?.id;
  const lessonId = params?.lessonId;

  const [lesson, setLesson] = useState<AnalysisReport | null>(null);
  const [teacher, setTeacher] = useState<ProfileRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
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

  if (loading) return <div style={loadingState}>Loading lesson report...</div>;
  if (!lesson) return <div style={loadingState}>Lesson not found.</div>;

  const insights = getLessonInsights(lesson);
  const reportSections = getLessonReportSections(lesson);
  const teksCoverage = getTEKSCoverageInsights(lesson);
  const lessonStandards = {
    reinforced: extractStandardEntries([...reportSections.staar, ...reportSections.teks], ['Standards Reinforced', 'Standards Addressed']),
    revisit: extractStandardEntries([...reportSections.staar, ...reportSections.teks], ['Standards That Need Stronger Assessment Evidence']),
    notObserved: extractStandardEntries([...reportSections.staar, ...reportSections.teks], ['Standards Not Observed']),
    readinessSummary: extractSectionText(reportSections.staar, ['Readiness Summary']),
    masteryNotes: extractSectionText(reportSections.teks, ['Standards Mastery Notes']),
    recommendations: extractSectionText([...reportSections.staar, ...reportSections.teks], ['Recommendations for Standards Integration', 'STAAR Readiness Recommendation']),
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
    reportSections.coaching.length ||
    reportSections.teks.length ||
    reportSections.staar.length
  );
  const lessonDate = lesson.created_at ? new Date(lesson.created_at).toLocaleString() : '—';
  const titleText = lesson.title || `${lesson.grade || 'Grade'} ${lesson.subject || 'Lesson'}`;

  return (
    <main style={page}>
      <div style={container}>
        <div style={heroCard}>
          <div style={heroTop}>
            <div>
              <div style={eyebrow}>Admin Lesson Report</div>
              <h1 style={heading}>{titleText}</h1>
              <p style={subheading}>{teacher?.name || 'Unknown'} · {lessonDate}</p>
            </div>
            <Link href={`/admin/teacher/${teacherId}`} style={backLink}>Back to Teacher</Link>
          </div>

          <div style={summaryBanner}>
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

        <div style={metricGrid}>
          <div style={{ ...metricCard, ...overallMetricCard }}>
            <div style={metricLabel}>Overall</div>
            <div style={metricValue}>{insights.score}/100</div>
          </div>
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
          <div style={contextGrid}>
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

        <div style={twoColumnGrid}>
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

        <div style={{ ...sectionCard, ...nextStepSectionCard }}>
          <h2 style={sectionTitle}>Next Best Action</h2>
          <p style={bodyText}>{reportSections.recommendedNextStep}</p>
        </div>

        {reportSections.coaching.length > 0 && (
          <div style={{ ...sectionCard, ...analysisSectionCard }}>
            <h2 style={sectionTitle}>Coaching Notes</h2>
            <div style={sectionStack}>
              {reportSections.coaching.map((section, index) => (
                <div key={`coaching-section-${index}`}>
                  <div style={subsectionTitle}>{section.title}</div>
                  {section.bullets.length > 0 ? (
                    <ul style={findingsList}>
                      {section.bullets.map((item, itemIndex) => (
                        <li key={`coaching-item-${itemIndex}`} style={findingItem}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p style={bodyText}>{section.content}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {(reportSections.staar.length > 0 || reportSections.teks.length > 0 || teksCoverage) && (
          <div style={{ ...sectionCard, ...teksSectionCard }}>
            <h2 style={sectionTitle}>TEKS Coverage</h2>
            <div style={teksSectionStack}>
              <div style={teksSectionRow}>
                <div style={subsectionTitle}>Readiness Summary</div>
                <p style={bodyText}>
                  {lessonStandards.readinessSummary || teksCoverage?.readinessSummary || 'This lesson includes standards evidence that can support a TEKS-aligned coaching conversation.'}
                </p>
              </div>
              <div style={teksSectionRow}>
                <div style={subsectionTitle}>Standards Mastery Notes</div>
                <p style={bodyText}>
                  {lessonStandards.masteryNotes || teksCoverage?.overview || 'Review the standards groups below to see which TEKS were reinforced, which need to be revisited, and which were not yet clearly observed in the lesson evidence.'}
                </p>
              </div>
            </div>
            {(lessonStandards.reinforced.length > 0 || lessonStandards.revisit.length > 0 || lessonStandards.notObserved.length > 0) ? (
              <div style={teksSectionStack}>
                <div style={teksSectionRow}>
                  <div style={subsectionTitle}>Standards Reinforced</div>
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

        {!hasStructuredReport && (
          <div style={{ ...sectionCard, ...analysisSectionCard }}>
            <h2 style={sectionTitle}>AI Analysis</h2>
            <div style={longformText}>{lesson.result || lesson.analysis_result || 'No saved analysis text available.'}</div>
          </div>
        )}
      </div>
    </main>
  );
}

const page: React.CSSProperties = {
  minHeight: '100vh',
  background: 'var(--surface-page)',
  paddingTop: 12,
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
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
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

const loadingState: React.CSSProperties = {
  color: 'var(--text-primary)',
  padding: 32,
};

const twoColumnGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: 18,
};

const sectionStack: React.CSSProperties = {
  display: 'grid',
  gap: 14,
};

const overallMetricCard: React.CSSProperties = {
  background: 'var(--surface-card-solid)',
  borderColor: 'rgba(249,115,22,0.16)',
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
