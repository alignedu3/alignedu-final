"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { buildTeacherDashboardSampleReports, getDashboardSummary, getTrendData, getLatestLessonTrend, getLessonInsights, getLessonMetrics, getLessonReportSections, getTEKSCoverageInsights, type AnalysisReport } from '@/lib/dashboardData';
import { extractSectionText, extractStandardEntries } from '@/lib/analysisReport';
import ToastViewport, { type ToastItem } from '@/components/ToastViewport';
import { fetchJsonWithTimeout } from '@/lib/fetchJsonWithTimeout';
import ProtectedPageState from '@/components/ProtectedPageState';

export default function TeacherDashboard() {
  const [isNarrowScreen, setIsNarrowScreen] = useState(false);
  const [chartReady, setChartReady] = useState(false);
  const [teacherName, setTeacherName] = useState<string | null>(null);
  const [dbReports, setDbReports] = useState<AnalysisReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<AnalysisReport | null>(null);
  const [keyFindingsReportId, setKeyFindingsReportId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string>('');
  const [pendingDeleteReport, setPendingDeleteReport] = useState<AnalysisReport | null>(null);
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const selectedLessonRef = useRef<HTMLDivElement | null>(null);

  const pushToast = useCallback((message: string, tone: ToastItem['tone'] = 'info') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4200);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoadError('');
      const { response, data } = await fetchJsonWithTimeout<{
        success: boolean;
        error?: string;
        teacher?: { name?: string | null };
        analyses?: AnalysisReport[];
      }>('/api/dashboard/teacher', {
        credentials: 'include',
        cache: 'no-store',
      });

      if (response.status === 401) {
        window.location.replace('/login');
        return;
      }

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Unable to load your dashboard.');
      }

      setTeacherName(data.teacher?.name || 'Teacher');
      setDbReports(data.analyses || []);
    } catch (err) {
      console.error('Dashboard load error:', err);
      setLoadError(err instanceof Error ? err.message : 'Unable to load your dashboard.');
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const checkScreen = () => setIsNarrowScreen(window.innerWidth <= 768);
    checkScreen();
    setChartReady(true);
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  const sampleTeacherReports = useMemo<AnalysisReport[]>(
    () =>
      buildTeacherDashboardSampleReports(teacherName || 'Teacher'),
    [teacherName]
  );

  const isSampleMode = dbReports.length === 0;
  const reports = isSampleMode ? sampleTeacherReports : dbReports;

  useEffect(() => {
    if (!reports.length) {
      setKeyFindingsReportId(null);
      return;
    }
    const exists = reports.some((r) => r.id === keyFindingsReportId);
    if (!exists) {
      setKeyFindingsReportId(reports[0].id);
    }
  }, [reports, keyFindingsReportId]);

  useEffect(() => {
    if (!selectedReport || !selectedLessonRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      selectedLessonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedReport]);

  const trendData = useMemo(() => getTrendData(reports), [reports]);
  const summary = useMemo(() => getDashboardSummary(reports), [reports]);

  const overallScore = summary.averageScore;

  const handleViewReport = (report: AnalysisReport) => {
    setSelectedReport((current) => {
      if (current?.id === report.id) {
        window.requestAnimationFrame(() => {
          selectedLessonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        return current;
      }
      return report;
    });
  };

  const handleDeleteReport = async (report: AnalysisReport) => {
    setDeletingReportId(report.id);
    try {
      const response = await fetch(`/api/analyses/${report.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        pushToast(data.error || 'Unable to delete this analysis.', 'error');
        return;
      }

      setSelectedReport((current) => (current?.id === report.id ? null : current));
      setPendingDeleteReport(null);
      pushToast('Lesson deleted successfully.', 'success');
      await loadData();
    } catch (error) {
      console.error(error);
      pushToast('Unable to delete the lesson. Please try again.', 'error');
    } finally {
      setDeletingReportId(null);
    }
  };
  const scoreDiff = getLatestLessonTrend(reports);

  const trendInsight =
    scoreDiff > 0
      ? "Your instructional quality is improving."
      : scoreDiff < 0
      ? "Performance dipped — review recent lesson gaps."
      : "Performance is stable across lessons.";

  const latestReportSections = useMemo(
    () => (reports[0] ? getLessonReportSections(reports[0]) : null),
    [reports]
  );

  const nextActions = useMemo(() => {
    const lessonDrivenActions = [
      ...(latestReportSections?.improvements || []),
      ...(latestReportSections?.contentGaps.length ? [latestReportSections.contentGaps[0]] : []),
      latestReportSections?.recommendedNextStep || '',
    ]
      .map((item) => item.trim())
      .filter(Boolean);

    const dedupedActions = lessonDrivenActions.filter((item, index, all) => {
      const normalized = item.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
      return normalized && all.findIndex((candidate) => candidate.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim() === normalized) === index;
    });

    if (dedupedActions.length > 0) {
      return dedupedActions.slice(0, 3);
    }

    return summary.totalGaps > 0
      ? [
          'Reteach the top missed concept in your next lesson opener.',
          'Add a 2-minute exit check to confirm closure.',
          'Use one targeted follow-up question for students who miss the check.',
        ]
      : [
          'Keep your current pacing and clarity moves consistent.',
          'Add one deeper check-for-understanding prompt in the final 10 minutes.',
        ];
  }, [latestReportSections, summary.totalGaps]);

  const activeKeyFindingsReport = useMemo(() => {
    if (!reports.length) return null;
    return reports.find((r) => r.id === keyFindingsReportId) || reports[0];
  }, [reports, keyFindingsReportId]);

  const selectedLessonInsights = useMemo(
    () => (selectedReport ? getLessonInsights(selectedReport) : null),
    [selectedReport]
  );
  const selectedLessonSections = useMemo(
    () => (selectedReport ? getLessonReportSections(selectedReport) : null),
    [selectedReport]
  );
  const selectedSubmissionContext = useMemo(() => {
    if (!selectedLessonSections) return '';
    return selectedLessonSections.submissionContext
      .map((section) => {
        if (section.bullets.length > 0) return section.bullets.join(' · ');
        if (section.title && section.title !== 'Summary' && section.content) {
          return `${section.title}: ${section.content}`;
        }
        return section.content;
      })
      .filter(Boolean)
      .join(' · ');
  }, [selectedLessonSections]);
  const selectedLessonTEKS = useMemo(
    () => (selectedReport ? getTEKSCoverageInsights(selectedReport) : null),
    [selectedReport]
  );
  const selectedLessonStandards = useMemo(() => {
    if (!selectedLessonSections) {
      return {
        reinforced: [],
        revisit: [],
        notObserved: [],
        readinessSummary: '',
        masteryNotes: '',
        recommendations: '',
        hasHigherEdAlignment: false,
        sectionHeading: 'Standards Alignment',
        summaryTitle: 'Standards Summary',
        higherEdAlignment: [],
      };
    }

    const allSections = [...selectedLessonSections.staar, ...selectedLessonSections.teks];
    const allHigherEdAlignmentSections = selectedLessonSections.higherEdAlignment;
    const hasHigherEdAlignment = allHigherEdAlignmentSections.length > 0;

    return {
      reinforced: extractStandardEntries(allSections, ['Standards Reinforced', 'Standards Addressed', 'Covered in the Lesson']),
      revisit: extractStandardEntries(allSections, ['Standards That Need Stronger Assessment Evidence', 'Needs Reinforcement']),
      notObserved: extractStandardEntries(allSections, ['Standards Not Observed', 'Not Covered in the Lesson']),
      summary:
        extractSectionText(selectedLessonSections.teks, ['Standards Mastery Notes']) ||
        extractSectionText(selectedLessonSections.staar, ['Readiness Summary']) ||
        extractSectionText(allHigherEdAlignmentSections, ['Textbook Alignment', 'Summary']),
      recommendations: extractSectionText(allSections, ['Recommended Standards Follow-Up', 'Recommendations for Standards Integration', 'STAAR Readiness Recommendation']),
      hasHigherEdAlignment,
      sectionHeading: 'Standards Alignment',
      summaryTitle: hasHigherEdAlignment ? 'Textbook Alignment' : 'Standards Summary',
      higherEdAlignment: allHigherEdAlignmentSections.filter(
        (section) => !['Textbook Alignment', 'Summary'].includes(section.title)
      ),
    };
  }, [selectedLessonSections]);
  const hasStructuredSelectedLesson = useMemo(() => {
    if (!selectedLessonSections) return false;
    return Boolean(
      selectedLessonSections.executiveSummary ||
      selectedLessonSections.strengths.length ||
      selectedLessonSections.improvements.length ||
      selectedLessonSections.contentGaps.length ||
      selectedLessonSections.recommendedNextStep ||
      selectedLessonSections.teks.length ||
      selectedLessonSections.staar.length ||
      selectedLessonSections.higherEdAlignment.length
    );
  }, [selectedLessonSections]);

  const keyFindings = useMemo(() => {
    if (!activeKeyFindingsReport) return [];
    return getLessonInsights(activeKeyFindingsReport).findings;
  }, [activeKeyFindingsReport]);

  if (!ready) {
    return (
      <ProtectedPageState
        mode="loading"
        title="Loading your dashboard"
        message="Pulling together your lesson history, trend line, and report data."
      />
    );
  }

  return (
    <main style={page} className="dashboard-page">
      <ToastViewport
        toasts={toasts}
        onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))}
      />
      <div style={glow1} />
      <div style={glow2} />

      <div style={container} className="dashboard-container">

        <div style={header}>
          <div>
            <h1 style={heading}>
              Welcome{teacherName ? `, ${teacherName}` : ''}
            </h1>
            <p style={subheading}>
              Your instructional performance at a glance
            </p>
          </div>

          <div style={buttonGroup}>
            <Link href="/analyze" style={primaryBtn}>+ Analyze Lesson</Link>
          </div>
        </div>

        {loadError && (
          <div style={{ ...card, marginBottom: 12, border: '1px solid rgba(248,113,113,0.28)' }}>
            <p style={{ ...text, margin: 0 }}>{loadError}</p>
          </div>
        )}

        {isSampleMode && (
          <div
            style={{
              ...card,
              marginBottom: 12,
              border: '1px solid rgba(56,189,248,0.24)',
              background: 'linear-gradient(135deg, rgba(14,165,233,0.14), rgba(15,23,42,0.08))',
            }}
          >
            <div style={{ ...label, color: '#7dd3fc', fontSize: 12, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
              Sample Data
            </div>
            <p style={{ ...text, margin: '0 0 8px 0' }}>
              This sample dashboard shows how your trend line, lesson scores, and findings will look once your instructional history starts building.
            </p>
            <p style={{ ...text, margin: 0 }}>
              It will disappear automatically after your first lesson is uploaded.
            </p>
            <div style={{ marginTop: 12 }}>
              <button
                onClick={() => {
                  if (reports[0]) handleViewReport(reports[0]);
                }}
                style={{ ...actionButton, background: '#f97316', padding: '8px 12px' }}
              >
                Open Sample Lesson Analysis
              </button>
            </div>
          </div>
        )}

        <div style={card}>
          <h2 style={cardTitle}>Overall Lesson Analysis</h2>

          <div
            style={{
              ...analysisSummaryLayout,
              gridTemplateColumns: isNarrowScreen ? '1fr' : analysisSummaryLayout.gridTemplateColumns,
            }}
          >
            <div style={analysisScorePanel}>
              <div style={analysisScoreEyebrow}>Current Average</div>
              <div style={{ ...analysisScoreValue, fontSize: isNarrowScreen ? 34 : analysisScoreValue.fontSize }}>{overallScore}/100</div>
              <div style={{ ...analysisScoreSubtext, fontSize: isNarrowScreen ? 12 : analysisScoreSubtext.fontSize }}>
                {summary.lessonsAnalyzed > 0
                  ? `Average across ${summary.lessonsAnalyzed} lesson${summary.lessonsAnalyzed === 1 ? '' : 's'}`
                  : 'No lessons analyzed yet'}
              </div>
            </div>

            <div style={analysisMetricsGrid}>
              <div style={{ ...analysisMetricCard, minHeight: isNarrowScreen ? 88 : analysisMetricCard.minHeight, padding: isNarrowScreen ? '14px 12px 12px' : analysisMetricCard.padding }}>
                <div style={{ ...analysisMetricLabel, fontSize: isNarrowScreen ? 11 : analysisMetricLabel.fontSize }}>Coverage</div>
                <div style={{ ...analysisMetricValue, fontSize: isNarrowScreen ? 24 : analysisMetricValue.fontSize }}>{summary.averageCoverage}%</div>
              </div>

              <div style={{ ...analysisMetricCard, minHeight: isNarrowScreen ? 88 : analysisMetricCard.minHeight, padding: isNarrowScreen ? '14px 12px 12px' : analysisMetricCard.padding }}>
                <div style={{ ...analysisMetricLabel, fontSize: isNarrowScreen ? 11 : analysisMetricLabel.fontSize }}>Clarity</div>
                <div style={{ ...analysisMetricValue, fontSize: isNarrowScreen ? 24 : analysisMetricValue.fontSize }}>{summary.lessonsAnalyzed ? `${summary.averageClarity}%` : '—'}</div>
              </div>

              <div style={{ ...analysisMetricCard, minHeight: isNarrowScreen ? 88 : analysisMetricCard.minHeight, padding: isNarrowScreen ? '14px 12px 12px' : analysisMetricCard.padding }}>
                <div style={{ ...analysisMetricLabel, fontSize: isNarrowScreen ? 11 : analysisMetricLabel.fontSize }}>Engagement</div>
                <div style={{ ...analysisMetricValue, fontSize: isNarrowScreen ? 24 : analysisMetricValue.fontSize }}>{summary.lessonsAnalyzed ? `${summary.averageEngagement}%` : '—'}</div>
              </div>

              <div style={{ ...analysisMetricCard, minHeight: isNarrowScreen ? 88 : analysisMetricCard.minHeight, padding: isNarrowScreen ? '14px 12px 12px' : analysisMetricCard.padding }}>
                <div style={{ ...analysisMetricLabel, fontSize: isNarrowScreen ? 11 : analysisMetricLabel.fontSize }}>Total Gaps</div>
                <div style={{ ...analysisMetricValue, fontSize: isNarrowScreen ? 24 : analysisMetricValue.fontSize }}>{summary.totalGaps || 0}</div>
              </div>
            </div>
          </div>
        </div>

        <div style={card}>
          <h2 style={cardTitle}>Next Best Actions</h2>
          <ul style={{ ...text, margin: '0', paddingLeft: 18 }}>
            {nextActions.map((action, index) => (
              <li key={index} style={{ marginBottom: 6 }}>{action}</li>
            ))}
          </ul>
        </div>

        <div style={card}>
          <h2 style={cardTitle}>📈 Score Trend</h2>
          <p style={text}>{trendInsight}</p>

          <div
            style={{
              marginTop: 10,
              border: '1px solid var(--border-strong)',
              borderRadius: 14,
              padding: isNarrowScreen ? '10px 8px 4px' : '14px 12px 8px',
              background: 'var(--surface-chip)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
              minWidth: 0,
            }}
          >
            {chartReady ? (
              <ResponsiveContainer width="100%" height={isNarrowScreen ? 210 : 260}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="date"
                    stroke="var(--text-secondary)"
                    tick={{ fontSize: isNarrowScreen ? 10 : 12, fill: 'var(--text-secondary)' }}
                    minTickGap={isNarrowScreen ? 20 : 10}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="var(--text-secondary)"
                    tick={{ fontSize: isNarrowScreen ? 10 : 12, fill: 'var(--text-secondary)' }}
                    width={isNarrowScreen ? 28 : 40}
                  />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#f97316" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: isNarrowScreen ? 210 : 260 }} />
            )}
          </div>
        </div>

        <div style={card}>
          <h2 style={cardTitle}>Key Findings</h2>
          {!activeKeyFindingsReport ? (
            <p style={text}>No lesson findings yet.</p>
          ) : (
            <>
              <p style={{ ...text, marginTop: 0 }}>
                Showing findings for: {activeKeyFindingsReport.grade || 'Grade'} {activeKeyFindingsReport.subject || 'Lesson'}
                {activeKeyFindingsReport.created_at ? ` · ${new Date(activeKeyFindingsReport.created_at).toLocaleDateString()}` : ''}
              </p>
              <ul style={text}>
                {keyFindings.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>

              {reports.length > 0 && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <div style={{ ...label, marginBottom: 8 }}>Lesson Findings</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {reports.map((r, idx) => {
                      const chip = `${r.grade || 'Grade'} ${r.subject || 'Lesson'}${r.created_at ? ` · ${new Date(r.created_at).toLocaleDateString()}` : ''}`;
                      const isActive = activeKeyFindingsReport?.id === r.id;
                      return (
                        <button
                          key={r.id || idx}
                          onClick={() => setKeyFindingsReportId(r.id)}
                          style={{
                            border: `1px solid ${isActive ? '#f97316' : 'var(--border)'}`,
                            background: isActive ? 'rgba(249,115,22,0.14)' : 'var(--surface-chip)',
                            color: 'var(--text-primary)',
                            borderRadius: 999,
                            padding: '6px 10px',
                            fontSize: 12,
                            cursor: 'pointer',
                            maxWidth: 300,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={chip}
                        >
                          {chip}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div style={card}>
          <h2 style={cardTitle}>Lessons</h2>

          {reports.length === 0 ? (
            <p style={emptyState}>
              Upload your first lesson to receive AI-powered feedback, scoring, and improvement suggestions.
            </p>
          ) : (
            <div
              className="table-scroll-wrap"
              style={isNarrowScreen ? { overflowX: 'hidden', border: '1px solid var(--border)', borderRadius: 10, padding: '4px 6px', background: 'linear-gradient(180deg, var(--surface-card-solid) 0%, rgba(148,163,184,0.05) 100%)' } : undefined}
            >
          <table style={{ ...table, minWidth: '100%' }}>
              <thead>
                <tr>
                  <th style={{ ...th, width: '40%', whiteSpace: 'normal', padding: isNarrowScreen ? '4px 3px' : th.padding, fontSize: isNarrowScreen ? 12 : th.fontSize }}>Lesson</th>
                  <th style={{ ...th, width: '18%', textAlign: 'center', whiteSpace: 'normal', padding: isNarrowScreen ? '4px 3px' : th.padding, fontSize: isNarrowScreen ? 12 : th.fontSize }}>Score</th>
                  <th style={{ ...th, width: '18%', textAlign: 'center', whiteSpace: 'normal', padding: isNarrowScreen ? '4px 3px' : th.padding, fontSize: isNarrowScreen ? 12 : th.fontSize }}>Trend</th>
                  <th style={{ ...th, width: '24%', textAlign: 'center', whiteSpace: 'normal', padding: isNarrowScreen ? '4px 3px' : th.padding, fontSize: isNarrowScreen ? 12 : th.fontSize }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.slice(0, isSampleMode ? 10 : 5).map((r, i) => {
                  const score = getLessonMetrics(r).score;
                  const previous = reports[i + 1];
                  const trend = previous ? score - getLessonMetrics(previous).score : null;
                  const lessonLabel = `${r.grade || 'Grade?'} ${r.subject || 'Lesson'}` || `Lesson ${i + 1}`;
                  const lessonDate = r.created_at ? new Date(r.created_at).toLocaleDateString() : '';
                  return (
                    <tr key={r.id || i}>
                      <td style={{ ...td, whiteSpace: 'normal', wordBreak: 'break-word', padding: isNarrowScreen ? '4px 3px' : td.padding, fontSize: isNarrowScreen ? 12 : td.fontSize }}>
                        {lessonLabel}{lessonDate ? ` · ${lessonDate}` : ''}
                      </td>
                      <td style={{ ...td, textAlign: 'center', whiteSpace: 'normal', padding: isNarrowScreen ? '4px 3px' : td.padding, fontSize: isNarrowScreen ? 12 : td.fontSize }}>{score}/100</td>
                      <td style={{ ...td, textAlign: 'center', whiteSpace: 'normal', padding: isNarrowScreen ? '4px 3px' : td.padding, fontSize: isNarrowScreen ? 12 : td.fontSize, color: trend === null ? 'var(--text-secondary)' : trend >= 0 ? '#22c55e' : '#ef4444' }}>
                        {trend === null
                          ? '—'
                          : trend > 0
                            ? `↑ ${trend}`
                            : trend < 0
                              ? `↓ ${Math.abs(trend)}`
                              : '→ 0'}
                      </td>
                      <td style={{ ...td, textAlign: 'center', whiteSpace: 'normal', padding: isNarrowScreen ? '4px 3px' : td.padding }}>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            style={{ ...actionButton, padding: isNarrowScreen ? '3px 7px' : actionButton.padding, fontSize: isNarrowScreen ? 11 : undefined }}
                            onClick={() => handleViewReport(r)}
                          >
                            View
                          </button>
                          <button
                            style={{
                              ...deleteButton,
                              padding: isNarrowScreen ? '3px 7px' : deleteButton.padding,
                              fontSize: isNarrowScreen ? 11 : undefined,
                              opacity: isSampleMode ? 0.55 : 1,
                              cursor: isSampleMode ? 'not-allowed' : 'pointer',
                            }}
                            onClick={() => {
                              if (isSampleMode) return;
                              setPendingDeleteReport(r);
                            }}
                            disabled={isSampleMode}
                            title={isSampleMode ? 'Sample lessons cannot be deleted.' : 'Delete lesson'}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}
        </div>

        {selectedReport && (
          <div ref={selectedLessonRef} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={cardTitle}>Selected Lesson</h2>
                <p style={subheading}>
                  {[
                    selectedReport.grade || null,
                    selectedReport.subject || 'Lesson',
                    selectedReport.title || null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  {selectedReport.created_at
                    ? ` · ${new Date(selectedReport.created_at).toLocaleDateString()}`
                    : ''}
                </p>
              </div>
              <button
                style={secondaryButton}
                onClick={() => setSelectedReport(null)}
              >
                Close
              </button>
            </div>
            {selectedLessonInsights && selectedLessonSections && (
              <div style={{ marginTop: 18 }}>
                <div
                  style={{
                    ...executiveSummaryCard,
                    gridTemplateColumns: isNarrowScreen ? '1fr' : executiveSummaryCard.gridTemplateColumns,
                    gap: isNarrowScreen ? 14 : executiveSummaryCard.gap,
                    padding: isNarrowScreen ? 16 : executiveSummaryCard.padding,
                  }}
                >
                  <div>
                    <div style={reportEyebrow}>Executive Summary</div>
                    <div
                      style={{
                        ...summaryLead,
                        fontSize: isNarrowScreen ? 18 : summaryLead.fontSize,
                        lineHeight: isNarrowScreen ? 1.45 : summaryLead.lineHeight,
                      }}
                    >
                      {selectedLessonSections.executiveSummary}
                    </div>
                  </div>
                  <div
                    style={{
                      ...summaryScorePill,
                      width: isNarrowScreen ? '100%' : undefined,
                      padding: isNarrowScreen ? 14 : summaryScorePill.padding,
                    }}
                  >
                    <div style={{ ...summaryScoreValue, fontSize: isNarrowScreen ? 32 : summaryScoreValue.fontSize }}>
                      {selectedLessonInsights.score}
                    </div>
                    <div style={summaryScoreLabel}>Overall Score</div>
                  </div>
                </div>

                {selectedSubmissionContext && (
                  <div style={reportMetaNote}>
                    {selectedSubmissionContext}
                  </div>
                )}

                <div style={reportMetricGrid}>
                  <div style={{ ...reportMetricCard, ...coverageMetricCard, flexDirection: isNarrowScreen ? 'column' : reportMetricCard.flexDirection, justifyContent: isNarrowScreen ? 'center' : reportMetricCard.justifyContent, textAlign: 'center' }}>
                    <div style={{ ...reportMetricLabel, textAlign: 'center' }}>Coverage</div>
                    <div style={{ ...reportMetricValue, textAlign: 'center' }}>{selectedLessonInsights.coverage}%</div>
                  </div>
                  <div style={{ ...reportMetricCard, ...clarityMetricCard, flexDirection: isNarrowScreen ? 'column' : reportMetricCard.flexDirection, justifyContent: isNarrowScreen ? 'center' : reportMetricCard.justifyContent, textAlign: 'center' }}>
                    <div style={{ ...reportMetricLabel, textAlign: 'center' }}>Clarity</div>
                    <div style={{ ...reportMetricValue, textAlign: 'center' }}>{selectedLessonInsights.clarity}%</div>
                  </div>
                  <div style={{ ...reportMetricCard, ...engagementMetricCard, flexDirection: isNarrowScreen ? 'column' : reportMetricCard.flexDirection, justifyContent: isNarrowScreen ? 'center' : reportMetricCard.justifyContent, textAlign: 'center' }}>
                    <div style={{ ...reportMetricLabel, textAlign: 'center' }}>Engagement</div>
                    <div style={{ ...reportMetricValue, textAlign: 'center' }}>{selectedLessonInsights.engagement}%</div>
                  </div>
                  <div style={{ ...reportMetricCard, ...gapsMetricCard, flexDirection: isNarrowScreen ? 'column' : reportMetricCard.flexDirection, justifyContent: isNarrowScreen ? 'center' : reportMetricCard.justifyContent, textAlign: 'center' }}>
                    <div style={{ ...reportMetricLabel, textAlign: 'center' }}>Gaps Flagged</div>
                    <div style={{ ...reportMetricValue, textAlign: 'center' }}>{selectedLessonInsights.gaps}</div>
                  </div>
                </div>

                <div style={reportTwoColumnGrid}>
                  <div style={{ ...reportSectionCard, ...successSectionCard }}>
                    <div style={reportSectionTitle}>What Went Well</div>
                    <ul style={reportList}>
                      {selectedLessonSections.strengths.map((item, index) => (
                        <li key={`strength-${index}`} style={reportListItem}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div style={{ ...reportSectionCard, ...improvementSectionCard }}>
                    <div style={reportSectionTitle}>What Can Improve</div>
                    <ul style={reportList}>
                      {selectedLessonSections.improvements.map((item, index) => (
                        <li key={`improvement-${index}`} style={reportListItem}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {(selectedLessonSections.staar.length > 0 ||
                  selectedLessonSections.teks.length > 0 ||
                  (selectedLessonStandards.higherEdAlignment?.length ?? 0) > 0 ||
                  selectedLessonTEKS) && (
                  <div style={{ ...reportSectionCard, ...teksSectionCard }}>
                    <div style={reportSectionTitle}>{selectedLessonStandards.sectionHeading}</div>
                    <div style={teksSectionStack}>
                      <div style={teksSectionRow}>
                        <div style={reportSubsectionTitle}>{selectedLessonStandards.summaryTitle}</div>
                        <p style={reportBodyText}>
                          {selectedLessonStandards.summary || selectedLessonTEKS?.readinessSummary || selectedLessonTEKS?.overview || 'Review the standards groups below to see which TEKS were reinforced, which need to be revisited, and which were not yet clearly observed in the lesson evidence.'}
                        </p>
                      </div>
                    </div>
                    {(selectedLessonStandards.reinforced.length > 0 ||
                      selectedLessonStandards.revisit.length > 0 ||
                      selectedLessonStandards.notObserved.length > 0) ? (
                      <div style={teksSectionStack}>
                        <div style={teksSectionRow}>
                          <div style={reportSubsectionTitle}>Standards Covered</div>
                          {selectedLessonStandards.reinforced.length > 0 ? (
                            <ul style={reportList}>
                              {selectedLessonStandards.reinforced.map((standard) => (
                                <li key={`reinforced-${standard.code}`} style={reportListItem}>
                                  <strong>{standard.code}</strong>: {standard.description}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p style={reportBodyText}>No clearly reinforced TEKS were identified in the saved analysis.</p>
                          )}
                        </div>
                        <div style={teksSectionRow}>
                          <div style={reportSubsectionTitle}>Standards To Revisit</div>
                          {selectedLessonStandards.revisit.length > 0 ? (
                            <ul style={reportList}>
                              {selectedLessonStandards.revisit.map((standard) => (
                                <li key={`revisit-${standard.code}`} style={reportListItem}>
                                  <strong>{standard.code}</strong>: {standard.description}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p style={reportBodyText}>No additional TEKS were flagged for stronger assessment evidence in this report.</p>
                          )}
                        </div>
                        <div style={teksSectionRow}>
                          <div style={reportSubsectionTitle}>Standards Not Observed</div>
                          {selectedLessonStandards.notObserved.length > 0 ? (
                            <ul style={reportList}>
                              {selectedLessonStandards.notObserved.map((standard) => (
                                <li key={`not-observed-${standard.code}`} style={reportListItem}>
                                  <strong>{standard.code}</strong>: {standard.description}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p style={reportBodyText}>No topic-related TEKS were marked as missing or underdeveloped in the saved analysis.</p>
                          )}
                        </div>
                      </div>
                    ) : selectedLessonTEKS?.hasStandards && (
                      <div style={{ ...teksSectionRow, marginTop: 8 }}>
                        <div style={reportSubsectionTitle}>Priority TEKS Observed</div>
                        <ul style={reportList}>
                          {selectedLessonTEKS.standards.map((standard) => (
                            <li key={standard.code} style={reportListItem}>
                              <strong>{standard.code}</strong>: {standard.description}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedLessonStandards.recommendations && (
                      <div style={{ ...teksSectionRow, marginTop: 8 }}>
                        <div style={reportSubsectionTitle}>Recommended Standards Follow-Up</div>
                        <p style={reportBodyText}>{selectedLessonStandards.recommendations}</p>
                      </div>
                    )}
                    {selectedLessonStandards.higherEdAlignment.length > 0 && (
                      <div style={teksSectionStack}>
                        {selectedLessonStandards.higherEdAlignment.map((section, index) => (
                          <div key={`higher-ed-alignment-${index}`} style={teksSectionRow}>
                            <div style={reportSubsectionTitle}>{section.title}</div>
                            {section.bullets.length > 0 ? (
                              <ul style={reportList}>
                                {section.bullets.map((item, itemIndex) => (
                                  <li key={`higher-ed-alignment-item-${itemIndex}`} style={reportListItem}>{item}</li>
                                ))}
                              </ul>
                            ) : (
                              <p style={reportBodyText}>{section.content}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedLessonSections.teks.length === 0 && (selectedLessonTEKS?.strengths?.length ?? 0) > 0 && (
                      <div style={{ ...teksSectionRow, marginTop: 8 }}>
                        <div style={reportSubsectionTitle}>Alignment Strengths</div>
                        <ul style={reportList}>
                          {selectedLessonTEKS?.strengths.map((item, index) => (
                            <li key={`teks-strength-${index}`} style={reportListItem}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedLessonSections.teks.length === 0 && (selectedLessonTEKS?.gaps?.length ?? 0) > 0 && (
                      <div style={{ ...teksSectionRow, marginTop: 8 }}>
                        <div style={reportSubsectionTitle}>Alignment Gaps</div>
                        <ul style={reportList}>
                          {selectedLessonTEKS?.gaps.map((item, index) => (
                            <li key={`teks-gap-${index}`} style={reportListItem}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {selectedLessonSections.contentGaps.length > 0 && (
                  <div style={{ ...reportSectionCard, ...analysisSectionCard }}>
                    <div style={reportSectionTitle}>Content Gaps To Reinforce</div>
                    <ul style={reportList}>
                      {selectedLessonSections.contentGaps.map((item, index) => (
                        <li key={`content-gap-${index}`} style={reportListItem}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div style={{ ...reportSectionCard, ...nextStepSectionCard }}>
                  <div style={reportSectionTitle}>Recommended Next Step</div>
                  <p style={reportBodyText}>{selectedLessonSections.recommendedNextStep}</p>
                </div>

                {!hasStructuredSelectedLesson && (
                  <div style={{ ...reportSectionCard, ...analysisSectionCard }}>
                    <div style={reportSectionTitle}>Full Analysis Notes</div>
                    <div style={reportLongformText}>
                      {selectedReport.result || 'No saved analysis text available.'}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {pendingDeleteReport && (
          <div
            style={modalOverlay}
            onClick={() => {
              if (!deletingReportId) setPendingDeleteReport(null);
            }}
          >
            <div style={modalCard} onClick={(e) => e.stopPropagation()}>
              <div style={modalTitle}>Delete Lesson Analysis</div>
              <p style={modalText}>
                Delete{' '}
                <strong>
                  {pendingDeleteReport.title || `${pendingDeleteReport.grade || 'Grade'} ${pendingDeleteReport.subject || 'Lesson'}`}
                </strong>
                ? This action cannot be undone.
              </p>
              <div style={modalActions}>
                <button
                  type="button"
                  onClick={() => setPendingDeleteReport(null)}
                  disabled={Boolean(deletingReportId)}
                  style={modalCancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteReport(pendingDeleteReport)}
                  disabled={Boolean(deletingReportId)}
                  style={modalDangerBtn}
                >
                  {deletingReportId ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

const page: React.CSSProperties = { minHeight: '100vh', background: 'var(--bg-primary)' };
const container: React.CSSProperties = { maxWidth: 1200, margin: '0 auto' };
const header: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 };
const heading: React.CSSProperties = { color: 'var(--text-primary)', fontSize: 28, margin: '0 0 4px 0' };
const subheading: React.CSSProperties = { color: 'var(--text-secondary)', margin: 0 };
const buttonGroup: React.CSSProperties = { display: 'flex', gap: 10, alignItems: 'center' };
const primaryBtn: React.CSSProperties = { background: '#f97316', color: '#fff', padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' };

const card: React.CSSProperties = { background: 'var(--surface-card-solid)', border: '1px solid var(--border)', padding: 20, borderRadius: 12, marginBottom: 20, minWidth: 0 };
const cardTitle: React.CSSProperties = { color: 'var(--text-primary)', marginBottom: 10 };

const previewGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 16 };
const analysisSummaryLayout: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(200px, 240px) minmax(0, 1fr)',
  gap: 16,
  alignItems: 'stretch',
};
const analysisScorePanel: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  textAlign: 'center',
  gap: 8,
  minWidth: 0,
  padding: '18px 20px',
  borderRadius: 16,
  border: '1px solid rgba(249,115,22,0.22)',
  background: 'linear-gradient(145deg, rgba(249,115,22,0.14) 0%, rgba(249,115,22,0.05) 52%, rgba(255,255,255,0.02) 100%)',
  boxShadow: 'var(--shadow-soft)',
};
const analysisScoreEyebrow: React.CSSProperties = {
  color: '#c2410c',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.8,
  textTransform: 'uppercase',
};
const analysisScoreValue: React.CSSProperties = {
  fontSize: 40,
  lineHeight: 1,
  color: 'var(--text-primary)',
  fontWeight: 800,
  letterSpacing: '-0.03em',
};
const analysisScoreSubtext: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 13,
  lineHeight: 1.45,
  maxWidth: 180,
};
const analysisMetricsGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
  gap: 12,
  minWidth: 0,
};
const analysisMetricCard: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  textAlign: 'center',
  gap: 10,
  minHeight: 100,
  padding: '16px 16px 14px',
  borderRadius: 14,
  border: '1px solid var(--border)',
  background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(148,163,184,0.05) 100%)',
  boxShadow: 'var(--shadow-soft)',
};
const analysisMetricLabel: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '0.02em',
  lineHeight: 1.3,
};
const analysisMetricValue: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: 28,
  lineHeight: 1,
  fontWeight: 800,
  letterSpacing: '-0.02em',
};
const bigScore: React.CSSProperties = { fontSize: 32, color: 'var(--text-primary)', fontWeight: 700 };
const subText: React.CSSProperties = { color: 'var(--text-secondary)' };

const label: React.CSSProperties = { color: 'var(--text-secondary)' };
const value: React.CSSProperties = { color: 'var(--text-primary)', fontSize: 18 };

const text: React.CSSProperties = { color: 'var(--text-secondary)' };

const table: React.CSSProperties = { width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' };
const th: React.CSSProperties = { color: 'var(--text-secondary)', textAlign: 'left', padding: '5px 6px', fontSize: 13 };
const td: React.CSSProperties = { color: 'var(--text-primary)', padding: '5px 6px', fontSize: 14, verticalAlign: 'middle' };
const actionButton: React.CSSProperties = {
  background: '#22c55e',
  color: '#fff',
  border: 'none',
  padding: '4px 9px',
  marginRight: 0,
  borderRadius: 8,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};
const deleteButton: React.CSSProperties = {
  background: '#ef4444',
  color: '#fff',
  border: 'none',
  padding: '6px 12px',
  borderRadius: 8,
  cursor: 'pointer',
};
const secondaryButton: React.CSSProperties = {
  background: 'transparent',
  color: '#f97316',
  border: '1px solid rgba(249,115,22,0.5)',
  padding: '8px 14px',
  borderRadius: 8,
  cursor: 'pointer',
};

const emptyState: React.CSSProperties = { color: 'var(--text-secondary)' };

const glow1: React.CSSProperties = { display: 'none' };
const glow2: React.CSSProperties = { display: 'none' };

const loadingContainer: React.CSSProperties = { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' };
const loadingText: React.CSSProperties = { color: 'var(--text-primary)' };

const executiveSummaryCard: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) 140px',
  gap: 16,
  alignItems: 'stretch',
  padding: 18,
  borderRadius: 16,
  border: '1px solid rgba(249,115,22,0.18)',
  background: 'var(--surface-card-solid)',
  marginBottom: 16,
  boxShadow: 'var(--shadow-soft)',
};

const reportEyebrow: React.CSSProperties = {
  color: '#c2410c',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: 0.8,
  fontWeight: 800,
  marginBottom: 8,
};

const summaryLead: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: 20,
  lineHeight: 1.35,
  fontWeight: 700,
};

const summaryScorePill: React.CSSProperties = {
  borderRadius: 14,
  background: 'var(--surface-chip)',
  border: '1px solid rgba(249,115,22,0.18)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  gap: 6,
  padding: 16,
};

const summaryScoreValue: React.CSSProperties = {
  color: '#c2410c',
  fontSize: 36,
  fontWeight: 800,
  lineHeight: 1,
  width: '100%',
  textAlign: 'center',
};

const summaryScoreLabel: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 12,
  fontWeight: 700,
  lineHeight: 1.3,
  textAlign: 'center',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};

const reportMetaNote: React.CSSProperties = {
  marginBottom: 16,
  padding: '10px 14px',
  borderRadius: 12,
  border: '1px solid rgba(148,163,184,0.18)',
  background: 'var(--surface-chip)',
  color: 'var(--text-secondary)',
  fontSize: 13,
  lineHeight: 1.5,
};

const reportMetricGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: 12,
  marginBottom: 16,
};

const reportMetricCard: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '14px 16px',
  borderRadius: 14,
  border: '1px solid var(--border)',
  background: 'var(--surface-card-solid)',
  boxShadow: 'var(--shadow-soft)',
};

const reportMetricLabel: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
};

const reportMetricValue: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: 24,
  fontWeight: 700,
  lineHeight: 1,
  whiteSpace: 'nowrap',
};

const reportTwoColumnGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: 14,
  marginBottom: 16,
};

const reportSectionCard: React.CSSProperties = {
  padding: 18,
  borderRadius: 16,
  border: '1px solid var(--border)',
  background: 'var(--surface-card-solid)',
  marginBottom: 16,
  boxShadow: 'var(--shadow-soft)',
};

const reportSectionTitle: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: 17,
  fontWeight: 750,
  marginBottom: 12,
};

const reportSubsectionTitle: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: 13,
  fontWeight: 700,
  marginBottom: 8,
};

const reportSectionStack: React.CSSProperties = {
  display: 'grid',
  gap: 14,
};

const reportList: React.CSSProperties = {
  margin: 0,
  paddingLeft: 18,
  color: 'var(--text-secondary)',
};

const reportListItem: React.CSSProperties = {
  marginBottom: 10,
  lineHeight: 1.6,
};

const reportBodyText: React.CSSProperties = {
  color: 'var(--text-secondary)',
  lineHeight: 1.7,
  margin: 0,
};

const reportLongformText: React.CSSProperties = {
  color: 'var(--text-secondary)',
  whiteSpace: 'pre-wrap',
  lineHeight: 1.7,
  maxHeight: 420,
  overflowY: 'auto',
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

const gapsMetricCard: React.CSSProperties = {
  background: 'var(--surface-card-solid)',
  borderColor: 'rgba(239,68,68,0.16)',
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

const modalOverlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 10000,
  background: 'rgba(2, 6, 23, 0.66)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
};

const modalCard: React.CSSProperties = {
  background: 'var(--surface-card-solid)',
  border: '1px solid var(--border)',
  borderRadius: 14,
  width: '100%',
  maxWidth: 460,
  padding: 20,
  boxShadow: '0 24px 80px rgba(2,6,23,0.35)',
};

const modalTitle: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: 18,
  fontWeight: 700,
  marginBottom: 8,
};

const modalText: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 13,
  lineHeight: 1.5,
  margin: '0 0 16px 0',
};

const modalActions: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 10,
};

const modalCancelBtn: React.CSSProperties = {
  background: 'var(--surface-chip)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '10px 14px',
  fontWeight: 700,
  cursor: 'pointer',
};

const modalDangerBtn: React.CSSProperties = {
  background: '#dc2626',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: '10px 14px',
  fontWeight: 700,
  cursor: 'pointer',
};
