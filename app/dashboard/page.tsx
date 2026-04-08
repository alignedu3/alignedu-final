import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import { ensureProfile } from '../../lib/profile';

type AnalysisRow = {
  id: string;
  user_id: string;
  title: string | null;
  grade: string | null;
  subject: string | null;
  lesson_text: string | null;
  analysis_result: string | null;
  coverage_score: number | null;
  clarity_rating: string | null;
  gaps_detected: number | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: 'teacher' | 'admin';
  admin_id: string | null;
};

type TeacherSummary = {
  id: string;
  name: string;
  email: string;
  reports: number;
  avgCoverage: number;
  avgClarity: string;
  totalGaps: number;
  latestDate: string | null;
};

export default async function DashboardPage() {
  const user = await ensureProfile();

  if (!user) {
    redirect('/login');
  }

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, admin_id')
    .eq('id', user.id)
    .single<ProfileRow>();

  const isAdmin = profile?.role === 'admin';

  let analyses: AnalysisRow[] = [];
  let assignedTeachers: ProfileRow[] = [];

  if (isAdmin) {
    const { data: teachers } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, admin_id')
      .eq('admin_id', user.id)
      .eq('role', 'teacher');

    assignedTeachers = teachers ?? [];

    const teacherIds = assignedTeachers.map((t) => t.id);

    if (teacherIds.length > 0) {
      const { data: adminAnalyses } = await supabase
        .from('analyses')
        .select(
          'id, user_id, title, grade, subject, lesson_text, analysis_result, coverage_score, clarity_rating, gaps_detected, created_at'
        )
        .in('user_id', teacherIds)
        .order('created_at', { ascending: false });

      analyses = adminAnalyses ?? [];
    }
  } else {
    const { data: teacherAnalyses } = await supabase
      .from('analyses')
      .select(
        'id, user_id, title, grade, subject, lesson_text, analysis_result, coverage_score, clarity_rating, gaps_detected, created_at'
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    analyses = teacherAnalyses ?? [];
  }

  const totalReports = analyses.length;
  const avgCoverage =
    totalReports > 0
      ? Math.round(
          analyses.reduce((sum, item) => sum + (item.coverage_score ?? 0), 0) / totalReports
        )
      : 0;

  const totalGaps = analyses.reduce((sum, item) => sum + (item.gaps_detected ?? 0), 0);

  const avgClarity = getAverageClarity(
    analyses.map((item) => item.clarity_rating).filter(Boolean) as string[]
  );

  const latestReport = analyses[0] ?? null;
  const latestRecommendation = latestReport
    ? extractSectionBullets(latestReport.analysis_result ?? '', 'Recommendations')[0] ??
      'No recommendation available yet.'
    : 'Run your first analysis to generate recommendations.';

  const performanceSummary =
    totalReports === 0
      ? 'No lesson data yet. Run your first analysis to build your instructional dashboard.'
      : avgCoverage >= 85 && avgClarity === 'Strong'
      ? 'Overall performance is strong. Coverage is consistent and lesson clarity is trending positively.'
      : avgCoverage >= 75
      ? 'Instructional performance is stable, with room to strengthen clarity and reduce recurring gaps.'
      : 'Coverage and clarity need attention. Focus on reinforcing core concepts and strengthening lesson checks.';

  const recurringGaps = getTopItems(
    analyses.flatMap((item) =>
      extractSectionBullets(item.analysis_result ?? '', 'Instructional Gaps')
    ),
    4
  );

  const recurringStrengths = getTopItems(
    analyses.flatMap((item) =>
      extractSectionBullets(item.analysis_result ?? '', 'Instructional Strengths')
    ),
    4
  );

  const teacherSummaries: TeacherSummary[] = isAdmin
    ? assignedTeachers.map((teacher) => {
        const teacherReports = analyses.filter((item) => item.user_id === teacher.id);
        const reports = teacherReports.length;
        const teacherAvgCoverage =
          reports > 0
            ? Math.round(
                teacherReports.reduce((sum, item) => sum + (item.coverage_score ?? 0), 0) /
                  reports
              )
            : 0;

        const teacherAvgClarity = getAverageClarity(
          teacherReports.map((item) => item.clarity_rating).filter(Boolean) as string[]
        );

        const teacherTotalGaps = teacherReports.reduce(
          (sum, item) => sum + (item.gaps_detected ?? 0),
          0
        );

        return {
          id: teacher.id,
          name: teacher.full_name || teacher.email || 'Unnamed Teacher',
          email: teacher.email || '—',
          reports,
          avgCoverage: teacherAvgCoverage,
          avgClarity: teacherAvgClarity,
          totalGaps: teacherTotalGaps,
          latestDate: teacherReports[0]?.created_at ?? null,
        };
      })
    : [];

  return (
    <main className="analysis-wrapper">
      <div className="analysis-shell">
        <div className="analysis-header">
          <div className="analysis-badge">{isAdmin ? 'Admin Dashboard' : 'Teacher Dashboard'}</div>
          <h1 className="analysis-title">
            {isAdmin ? 'Instructional Command Center' : 'Your Instructional Dashboard'}
          </h1>
          <p className="analysis-subtitle">
            {isAdmin
              ? 'Monitor teacher performance, recurring gaps, and instructional patterns across your team.'
              : 'Track your lesson performance, recurring strengths, and next-step instructional priorities.'}
          </p>
        </div>

        <section className="analysis-results-card" style={{ marginBottom: '24px' }}>
          <div className="analysis-results-header">
            <h2>Quick Actions</h2>
            <p>Jump directly into the core workflows.</p>
          </div>

          <div className="dashboard-quick-actions">
            <Link href="/analyze" className="dashboard-action-card">
              <div className="dashboard-action-title">Analyze New Lesson</div>
              <div className="dashboard-action-text">
                Upload notes, record audio, or submit a lecture to generate a new instructional report.
              </div>
            </Link>

            <Link href="/analyze" className="dashboard-action-card">
              <div className="dashboard-action-title">Upload Lecture</div>
              <div className="dashboard-action-text">
                Add recorded classroom instruction and capture coverage, clarity, and flagged gaps.
              </div>
            </Link>

            <Link href="/analyze" className="dashboard-action-card">
              <div className="dashboard-action-title">Record Live Lecture</div>
              <div className="dashboard-action-text">
                Capture a lesson directly in the app and turn it into measurable instructional insight.
              </div>
            </Link>

            <Link href="/dashboard" className="dashboard-action-card">
              <div className="dashboard-action-title">Review Saved Reports</div>
              <div className="dashboard-action-text">
                Return to your dashboard to review trends, recurring gaps, and previous lesson reports.
              </div>
            </Link>
          </div>
        </section>

        <div className="analysis-metrics-grid" style={{ marginBottom: '24px' }}>
          <div className="analysis-metric-card">
            <div className="analysis-metric-label">
              {isAdmin ? 'Total Team Reports' : 'Lessons Analyzed'}
            </div>
            <div className="analysis-metric-value">{totalReports}</div>
          </div>

          <div className="analysis-metric-card">
            <div className="analysis-metric-label">Average Coverage</div>
            <div className="analysis-metric-value">{totalReports ? `${avgCoverage}%` : '—'}</div>
          </div>

          <div className="analysis-metric-card">
            <div className="analysis-metric-label">Average Clarity</div>
            <div className="analysis-metric-value">{avgClarity}</div>
          </div>

          <div className="analysis-metric-card">
            <div className="analysis-metric-label">Gaps Flagged</div>
            <div className="analysis-metric-value">{totalGaps}</div>
          </div>
        </div>

        <section className="analysis-panel">
          <div className="analysis-panel-grid">
            <div className="analysis-form-card">
              <div className="analysis-section-top">
                <h2>{isAdmin ? 'Executive Summary' : 'Performance Summary'}</h2>
                <p>{performanceSummary}</p>
              </div>

              <div className="dashboard-summary-stack">
                <div className="dashboard-summary-card">
                  <div className="dashboard-summary-label">Current Recommendation</div>
                  <div className="dashboard-summary-text">{latestRecommendation}</div>
                </div>

                <div className="dashboard-summary-card">
                  <div className="dashboard-summary-label">
                    {isAdmin ? 'Leadership Value' : 'Instructional Value'}
                  </div>
                  <div className="dashboard-summary-text">
                    {isAdmin
                      ? 'Use this dashboard to identify recurring teamwide gaps, support coaching conversations, and increase instructional consistency.'
                      : 'Use this dashboard to monitor your lesson patterns, strengthen coverage, and make feedback more objective over time.'}
                  </div>
                </div>
              </div>
            </div>

            <div className="analysis-side-card">
              <h3>{isAdmin ? 'At-a-Glance Focus' : 'Current Focus'}</h3>
              <ul className="analysis-side-list">
                <li>Keep lesson coverage consistent across reports</li>
                <li>Reduce recurring instructional gaps</li>
                <li>Strengthen clarity and lesson reinforcement</li>
                <li>Use objective analysis to guide next steps</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="analysis-panel">
          <div className="analysis-panel-grid">
            <div className="analysis-form-card">
              <div className="analysis-section-top">
                <h2>{isAdmin ? 'Recent Team Reports' : 'Recent Lesson Reports'}</h2>
                <p>
                  {isAdmin
                    ? 'Recent instructional analyses across assigned teachers.'
                    : 'Your most recent lesson analyses and instructional summaries.'}
                </p>
              </div>

              <div className="dashboard-table-wrap">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Subject</th>
                      <th>Grade</th>
                      <th>Coverage</th>
                      <th>Clarity</th>
                      <th>Gaps</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyses.length > 0 ? (
                      analyses.slice(0, 8).map((item) => (
                        <tr key={item.id}>
                          <td>{item.title || 'Untitled Lesson'}</td>
                          <td>{item.subject || '—'}</td>
                          <td>{item.grade || '—'}</td>
                          <td>{item.coverage_score != null ? `${item.coverage_score}%` : '—'}</td>
                          <td>{item.clarity_rating || '—'}</td>
                          <td>{item.gaps_detected != null ? item.gaps_detected : '—'}</td>
                          <td>{formatDate(item.created_at)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7}>No analyses saved yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="analysis-side-card">
              <h3>{isAdmin ? 'Leadership Snapshot' : 'Recurring Gaps'}</h3>
              <ul className="analysis-side-list">
                {recurringGaps.length > 0 ? (
                  recurringGaps.map((gap) => (
                    <li key={gap.label}>
                      {gap.label} <strong>({gap.count})</strong>
                    </li>
                  ))
                ) : (
                  <li>No recurring gaps yet.</li>
                )}
              </ul>
            </div>
          </div>
        </section>

        <section className="analysis-panel">
          <div className="analysis-panel-grid">
            <div className="analysis-form-card">
              <div className="analysis-section-top">
                <h2>{isAdmin ? 'What Your Teachers Are Doing Well' : 'Recurring Strengths'}</h2>
                <p>
                  {isAdmin
                    ? 'The strongest recurring instructional patterns across your assigned teachers.'
                    : 'The strengths that show up most often across your recent lessons.'}
                </p>
              </div>

              <div className="dashboard-pill-grid">
                {recurringStrengths.length > 0 ? (
                  recurringStrengths.map((item) => (
                    <div key={item.label} className="dashboard-pill-card">
                      <div className="dashboard-pill-title">{item.label}</div>
                      <div className="dashboard-pill-count">{item.count} reports</div>
                    </div>
                  ))
                ) : (
                  <div className="analysis-empty-state">
                    No recurring strengths yet. Run analyses to generate instructional trends.
                  </div>
                )}
              </div>
            </div>

            <div className="analysis-side-card">
              <h3>Objective Feedback Value</h3>
              <div className="analysis-side-note">
                AlignEDU helps move instructional review from subjective observation to more
                objective, consistent insight grounded in lesson evidence.
              </div>
            </div>
          </div>
        </section>

        {isAdmin && (
          <section className="analysis-results-card">
            <div className="analysis-results-header">
              <h2>Teacher Performance Overview</h2>
              <p>Summary across teachers assigned under your account.</p>
            </div>

            <div className="dashboard-table-wrap">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Teacher</th>
                    <th>Email</th>
                    <th>Reports</th>
                    <th>Avg Coverage</th>
                    <th>Avg Clarity</th>
                    <th>Gaps</th>
                    <th>Latest Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherSummaries.length > 0 ? (
                    teacherSummaries.map((teacher) => (
                      <tr key={teacher.id}>
                        <td>{teacher.name}</td>
                        <td>{teacher.email}</td>
                        <td>{teacher.reports}</td>
                        <td>{teacher.reports ? `${teacher.avgCoverage}%` : '—'}</td>
                        <td>{teacher.avgClarity}</td>
                        <td>{teacher.totalGaps}</td>
                        <td>{teacher.latestDate ? formatDate(teacher.latestDate) : '—'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7}>No teachers assigned yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString();
}

function getAverageClarity(values: string[]) {
  if (values.length === 0) return '—';

  const scoreMap: Record<string, number> = {
    Strong: 3,
    Moderate: 2,
    'Needs Support': 1,
  };

  const avg =
    values.reduce((sum, value) => sum + (scoreMap[value] ?? 2), 0) / values.length;

  if (avg >= 2.5) return 'Strong';
  if (avg >= 1.75) return 'Moderate';
  return 'Needs Support';
}

function extractSectionBullets(result: string, heading: string) {
  const lines = result.split('\n').map((line) => line.trim());
  const sectionIndex = lines.findIndex(
    (line) => line.replace(/:$/, '').toLowerCase() === heading.toLowerCase()
  );

  if (sectionIndex === -1) return [];

  const bullets: string[] = [];

  for (let i = sectionIndex + 1; i < lines.length; i++) {
    const line = lines[i];

    if (!line) continue;

    const looksLikeHeading =
      !line.startsWith('-') &&
      /^[A-Z][A-Za-z\s]+$/.test(line.replace(/:$/, '')) &&
      line.length < 40;

    if (looksLikeHeading) break;

    if (line.startsWith('-')) {
      bullets.push(line.replace(/^-+\s*/, '').trim());
    }
  }

  return bullets;
}

function getTopItems(items: string[], limit: number) {
  const counts = new Map<string, number>();

  for (const item of items) {
    const cleaned = item.trim();
    if (!cleaned) continue;
    counts.set(cleaned, (counts.get(cleaned) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
