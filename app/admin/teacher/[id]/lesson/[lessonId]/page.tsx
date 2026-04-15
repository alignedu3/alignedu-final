"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buildSampleAnalysisReports, getLessonInsights, getLessonReportSections, getTEKSCoverageInsights, SAMPLE_TEACHER_IDS, type AnalysisReport, type ProfileRecord } from "@/lib/dashboardData";

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

      const supabase = createClient();
      const { data: lessonData } = await supabase
        .from("analyses")
        .select("*")
        .eq("id", lessonId)
        .maybeSingle();
      setLesson(lessonData);

      if (lessonData?.user_id) {
        const { data: teacherData } = await supabase
          .from("profiles")
          .select("id, name")
          .eq("id", lessonData.user_id)
          .maybeSingle();
        setTeacher(teacherData);
      }
      setLoading(false);
    }
    if (lessonId) load();
  }, [lessonId, teacherId]);

  if (loading) return <div style={loadingState}>Loading lesson report...</div>;
  if (!lesson) return <div style={loadingState}>Lesson not found.</div>;

  const insights = getLessonInsights(lesson);
  const reportSections = getLessonReportSections(lesson);
  const teksCoverage = getTEKSCoverageInsights(lesson);
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
              <p style={summarySupportText}>
                {insights.score >= 85
                  ? 'This lesson provides strong evidence of effective instruction and is trending in a healthy direction.'
                  : insights.score >= 75
                  ? 'This lesson is on solid footing, with a few high-leverage moves that could strengthen impact and consistency.'
                  : 'This lesson needs targeted refinement so instructional clarity, student evidence, and closure are more secure.'}
              </p>
            </div>
            <div style={summaryScoreCard}>
              <div style={summaryScore}>{insights.score}/100</div>
              <div style={summaryScoreLabel}>Overall Score</div>
            </div>
          </div>
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

        {(reportSections.staar.length > 0 || reportSections.teks.length > 0 || teksCoverage) && (
          <div style={{ ...sectionCard, ...teksSectionCard }}>
            <h2 style={sectionTitle}>TEKS Coverage</h2>
            {reportSections.staar.length > 0 ? (
              <div style={sectionStack}>
                {reportSections.staar.map((section, index) => (
                  <div key={`staar-section-${index}`}>
                    <div style={subsectionTitle}>{section.title}</div>
                    {section.bullets.length > 0 ? (
                      <ul style={findingsList}>
                        {section.bullets.map((item, itemIndex) => (
                          <li key={`staar-item-${itemIndex}`} style={findingItem}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p style={bodyText}>{section.content}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : teksCoverage ? (
              <>
                <p style={bodyText}>{teksCoverage.readinessSummary}</p>
                <p style={{ ...bodyText, marginTop: 10 }}>{teksCoverage.overview}</p>
              </>
            ) : null}
            {reportSections.teks.length > 0 ? (
              <div style={{ marginTop: 14 }}>
                {reportSections.teks.map((section, index) => (
                  <div key={`teks-section-${index}`} style={{ marginTop: index === 0 ? 0 : 14 }}>
                    <div style={subsectionTitle}>{section.title}</div>
                    {section.bullets.length > 0 ? (
                      <ul style={findingsList}>
                        {section.bullets.map((item, itemIndex) => (
                          <li key={`teks-item-${itemIndex}`} style={findingItem}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p style={bodyText}>{section.content}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : teksCoverage?.hasStandards && (
              <div style={{ marginTop: 14 }}>
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
            {reportSections.teks.length === 0 && (teksCoverage?.strengths?.length ?? 0) > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={subsectionTitle}>Alignment Strengths</div>
                <ul style={findingsList}>
                  {teksCoverage?.strengths.map((finding, index) => (
                    <li key={`strength-${index}`} style={findingItem}>{finding}</li>
                  ))}
                </ul>
              </div>
            )}
            {reportSections.teks.length === 0 && (teksCoverage?.gaps?.length ?? 0) > 0 && (
              <div style={{ marginTop: 14 }}>
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

        <div style={{ ...sectionCard, ...summarySectionCard }}>
          <h2 style={sectionTitle}>Lesson Summary</h2>
          <p style={bodyText}>
            {(reportSections.strengths[0] || insights.celebration)} {(reportSections.improvements[0] || insights.improvementSummary)}
          </p>
        </div>

        <div style={{ ...sectionCard, ...analysisSectionCard }}>
          <h2 style={sectionTitle}>AI Analysis</h2>
          <div style={longformText}>{lesson.result || lesson.analysis_result || 'No saved analysis text available.'}</div>
        </div>

        <div style={{ ...sectionCard, ...transcriptSectionCard }}>
          <h2 style={sectionTitle}>Transcript</h2>
          <div style={longformText}>{lesson.transcript || 'No transcript available.'}</div>
        </div>
      </div>
    </main>
  );
}

const page: React.CSSProperties = {
  minHeight: '100vh',
  background: 'var(--surface-page)',
};

const container: React.CSSProperties = {
  maxWidth: 980,
  margin: '0 auto',
};

const heroCard: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(255,255,255,0.78))',
  border: '1px solid rgba(249,115,22,0.16)',
  borderRadius: 18,
  padding: 28,
  marginBottom: 22,
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
  background: 'rgba(255,255,255,0.84)',
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

const summarySupportText: React.CSSProperties = {
  color: 'var(--text-secondary)',
  lineHeight: 1.65,
  margin: '10px 0 0 0',
};

const summaryScoreCard: React.CSSProperties = {
  borderRadius: 14,
  border: '1px solid rgba(249,115,22,0.16)',
  background: 'rgba(255,255,255,0.88)',
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

const metricGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 14,
  marginBottom: 22,
};

const metricCard: React.CSSProperties = {
  background: 'var(--surface-card-solid)',
  border: '1px solid var(--border)',
  borderRadius: 14,
  padding: 18,
  boxShadow: '0 8px 24px rgba(15,23,42,0.04)',
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
  fontSize: 26,
  marginTop: 8,
  fontWeight: 700,
};

const sectionCard: React.CSSProperties = {
  background: 'var(--surface-card-solid)',
  border: '1px solid var(--border)',
  borderRadius: 14,
  padding: 22,
  marginBottom: 18,
  boxShadow: '0 10px 28px rgba(15,23,42,0.05)',
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
  background: 'linear-gradient(180deg, rgba(249,115,22,0.08), rgba(255,255,255,0.96))',
  borderColor: 'rgba(249,115,22,0.16)',
};

const coverageMetricCard: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(59,130,246,0.08), rgba(255,255,255,0.96))',
  borderColor: 'rgba(59,130,246,0.16)',
};

const clarityMetricCard: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(14,165,233,0.08), rgba(255,255,255,0.96))',
  borderColor: 'rgba(14,165,233,0.16)',
};

const engagementMetricCard: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(16,185,129,0.08), rgba(255,255,255,0.96))',
  borderColor: 'rgba(16,185,129,0.16)',
};

const assessmentMetricCard: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(245,158,11,0.08), rgba(255,255,255,0.96))',
  borderColor: 'rgba(245,158,11,0.16)',
};

const gapsMetricCard: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(239,68,68,0.08), rgba(255,255,255,0.96))',
  borderColor: 'rgba(239,68,68,0.16)',
};

const contextSectionCard: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(15,23,42,0.03), rgba(255,255,255,0.98))',
};

const successSectionCard: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(16,185,129,0.06), rgba(255,255,255,0.98))',
  borderColor: 'rgba(16,185,129,0.18)',
};

const improvementSectionCard: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(245,158,11,0.07), rgba(255,255,255,0.98))',
  borderColor: 'rgba(245,158,11,0.18)',
};

const nextStepSectionCard: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(249,115,22,0.06), rgba(255,255,255,0.98))',
  borderColor: 'rgba(249,115,22,0.18)',
};

const teksSectionCard: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(59,130,246,0.06), rgba(255,255,255,0.98))',
  borderColor: 'rgba(59,130,246,0.18)',
};

const summarySectionCard: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(15,23,42,0.04), rgba(255,255,255,0.98))',
  borderColor: 'rgba(15,23,42,0.12)',
};

const analysisSectionCard: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(99,102,241,0.05), rgba(255,255,255,0.98))',
  borderColor: 'rgba(99,102,241,0.16)',
};

const transcriptSectionCard: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(107,114,128,0.05), rgba(255,255,255,0.98))',
  borderColor: 'rgba(107,114,128,0.14)',
};
