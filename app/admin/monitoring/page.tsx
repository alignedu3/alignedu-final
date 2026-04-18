'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
} from 'recharts';
import { fetchJsonWithTimeout } from '@/lib/fetchJsonWithTimeout';
import ProtectedPageState from '@/components/ProtectedPageState';

type MonitoringReadiness = {
  key: string;
  label: string;
  healthy: boolean;
  detail: string;
};

type MonitoringSeriesPoint = {
  date: string;
  label: string;
  lessons: number;
  observations: number;
  averageScore: number;
};

type MonitoringActivityRow = {
  id: string;
  name: string;
  role: string;
  lessons: number;
  adminObservations: number;
  averageScore: number;
  trend: number;
  latestSubmittedAt: string | null;
};

type MonitoringPayload = {
  success: boolean;
  error?: string;
  caller?: { id: string; name?: string | null; role?: string | null };
  summary?: {
    days: number;
    totalLessons: number;
    lessonsInWindow: number;
    totalTeachers: number;
    totalAdmins: number;
    activeTeachers: number;
    observationCount: number;
    averageScore: number;
    strongTeachers: number;
    atRiskTeachers: number;
  };
  series?: MonitoringSeriesPoint[];
  readiness?: MonitoringReadiness[];
  recentActivity?: MonitoringActivityRow[];
};

const WINDOW_OPTIONS = [7, 14, 30] as const;

export default function MonitoringDashboard() {
  const [days, setDays] = useState<(typeof WINDOW_OPTIONS)[number]>(7);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [chartReady, setChartReady] = useState(false);
  const [payload, setPayload] = useState<MonitoringPayload | null>(null);
  const router = useRouter();

  useEffect(() => {
    setChartReady(true);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        if (!ready) {
          setReady(false);
        }
        setLoadError('');

        const { response, data } = await fetchJsonWithTimeout<MonitoringPayload>(`/api/admin/monitoring?days=${days}`, {
          credentials: 'include',
          cache: 'no-store',
          timeoutMs: 12000,
        });

        if (response.status === 401) {
          window.location.replace('/login');
          return;
        }

        if (response.status === 403) {
          window.location.replace('/admin');
          return;
        }

        if (!response.ok || !data?.success) {
          throw new Error(data?.error || 'Unable to load monitoring dashboard.');
        }

        setPayload(data);
      } catch (error) {
        console.error('Monitoring dashboard load error:', error);
        setLoadError(error instanceof Error ? error.message : 'Unable to load monitoring dashboard.');
      } finally {
        setReady(true);
      }
    }

    load();
  }, [days]);

  const summary = payload?.summary;
  const series = payload?.series || [];
  const readiness = payload?.readiness || [];
  const recentActivity = payload?.recentActivity || [];
  const callerName = payload?.caller?.name || 'Platform Monitoring';

  const healthHeadline = useMemo(() => {
    if (!readiness.length) return 'Monitoring status is loading.';
    const healthyCount = readiness.filter((item) => item.healthy).length;
    if (healthyCount === readiness.length) return 'Core monitoring and runtime services are configured.';
    if (healthyCount >= readiness.length - 1) return 'Most core services are configured, with one area to review.';
    return 'Multiple monitoring or runtime services still need attention.';
  }, [readiness]);

  if (!ready) {
    return (
      <ProtectedPageState
        mode="loading"
        title="Loading platform monitoring"
        message="Building your app-wide activity, readiness, and operational trend view."
      />
    );
  }

  if (loadError && !payload) {
    return (
      <ProtectedPageState
        mode="error"
        title="Unable to load monitoring"
        message={loadError}
        actionHref="/admin"
        actionLabel="Back to Admin Dashboard"
      />
    );
  }

  return (
    <main style={page} className="dashboard-page">
      <div style={container} className="dashboard-container">
        <div style={header}>
          <div>
            <div style={eyebrow}>Platform Monitoring</div>
            <h1 style={heading}>{callerName}</h1>
            <p style={subheading}>
              A live operational view of lesson volume, admin observations, teacher activity, and system readiness across your current scope.
            </p>
          </div>

          <div style={headerControls}>
            <div style={toggleWrap}>
              {WINDOW_OPTIONS.map((option) => {
                const selected = option === days;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setDays(option)}
                    style={{
                      ...toggleBtn,
                      background: selected ? '#3b82f6' : 'transparent',
                      color: selected ? '#ffffff' : 'var(--text-secondary)',
                      boxShadow: selected ? '0 10px 18px rgba(59,130,246,0.22)' : 'none',
                    }}
                  >
                    {option}d
                  </button>
                );
              })}
            </div>
            <button type="button" onClick={() => router.push('/admin')} style={backBtn}>
              Back to Admin
            </button>
          </div>
        </div>

        {loadError ? (
          <section style={{ ...sectionCard, marginBottom: 18, border: '1px solid rgba(248,113,113,0.28)' }}>
            <p style={{ ...bodyText, margin: 0 }}>{loadError}</p>
          </section>
        ) : null}

        <section style={heroSection}>
          <div style={heroTextBlock}>
            <div style={heroKicker}>Monitoring Readiness</div>
            <h2 style={heroTitle}>Keep one clean eye on usage, operations, and reliability.</h2>
            <p style={heroText}>{healthHeadline}</p>
          </div>
          <div style={heroBadge}>
            <div style={heroBadgeValue}>{summary?.lessonsInWindow ?? 0}</div>
            <div style={heroBadgeLabel}>Lessons in {days} days</div>
          </div>
        </section>

        <div style={statsGrid}>
          <div style={statCard}>
            <div style={statLabel}>Lessons Analyzed</div>
            <div style={statValue}>{summary?.lessonsInWindow ?? 0}</div>
            <div style={statSub}>{summary?.totalLessons ?? 0} total saved analyses</div>
          </div>
          <div style={statCard}>
            <div style={statLabel}>Average Score</div>
            <div style={{ ...statValue, color: (summary?.averageScore ?? 0) >= 80 ? '#16a34a' : '#ea580c' }}>
              {summary?.averageScore ?? 0}/100
            </div>
            <div style={statSub}>Recent instructional quality across submitted lessons</div>
          </div>
          <div style={statCard}>
            <div style={statLabel}>Active Teachers</div>
            <div style={statValue}>{summary?.activeTeachers ?? 0}</div>
            <div style={statSub}>{summary?.totalTeachers ?? 0} teachers in visible scope</div>
          </div>
          <div style={statCard}>
            <div style={statLabel}>Admin Observations</div>
            <div style={statValue}>{summary?.observationCount ?? 0}</div>
            <div style={statSub}>Observed lessons submitted through the admin flow</div>
          </div>
          <div style={statCard}>
            <div style={statLabel}>Strong Teachers</div>
            <div style={{ ...statValue, color: '#16a34a' }}>{summary?.strongTeachers ?? 0}</div>
            <div style={statSub}>Teachers averaging 85+ in the current window</div>
          </div>
          <div style={statCard}>
            <div style={statLabel}>At-Risk Teachers</div>
            <div style={{ ...statValue, color: (summary?.atRiskTeachers ?? 0) > 0 ? '#dc2626' : 'var(--text-primary)' }}>
              {summary?.atRiskTeachers ?? 0}
            </div>
            <div style={statSub}>Teachers currently below the recent support threshold</div>
          </div>
        </div>

        <div style={twoColumn} className="monitoring-two-column">
          <section style={sectionCard}>
            <div style={sectionHeader}>
              <div>
                <div style={sectionEyebrow}>Operational Activity</div>
                <h2 style={sectionTitle}>Lessons and Observations Over Time</h2>
              </div>
            </div>
            <div style={chartShell}>
              {chartReady ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={series}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="label" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <YAxis stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelStyle={{ color: 'var(--text-primary)', fontWeight: 700 }}
                    />
                    <Bar dataKey="lessons" name="Lessons" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="observations" name="Admin Observations" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 300 }} />
              )}
            </div>
          </section>

          <section style={sectionCard}>
            <div style={sectionHeader}>
              <div>
                <div style={sectionEyebrow}>Quality Trend</div>
                <h2 style={sectionTitle}>Average Score Over Time</h2>
              </div>
            </div>
            <div style={chartShell}>
              {chartReady ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={series}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="label" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <YAxis domain={[0, 100]} stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelStyle={{ color: 'var(--text-primary)', fontWeight: 700 }}
                    />
                    <Line type="monotone" dataKey="averageScore" name="Average Score" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 300 }} />
              )}
            </div>
          </section>
        </div>

        <section style={sectionCard}>
          <div style={sectionHeader}>
            <div>
              <div style={sectionEyebrow}>Monitoring Stack</div>
              <h2 style={sectionTitle}>Runtime and Observability Readiness</h2>
            </div>
          </div>
          <div style={readinessGrid}>
            {readiness.map((item) => (
              <div key={item.key} style={readinessCard}>
                <div style={readinessTopRow}>
                  <div style={readinessLabel}>{item.label}</div>
                  <div
                    style={{
                      ...readinessPill,
                      background: item.healthy ? 'rgba(22,163,74,0.16)' : 'rgba(220,38,38,0.14)',
                      color: item.healthy ? '#16a34a' : '#dc2626',
                    }}
                  >
                    {item.healthy ? 'Healthy' : 'Review'}
                  </div>
                </div>
                <p style={readinessText}>{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={sectionCard}>
          <div style={sectionHeader}>
            <div>
              <div style={sectionEyebrow}>Recent Activity</div>
              <h2 style={sectionTitle}>Most Active Users in Scope</h2>
            </div>
          </div>

          {recentActivity.length === 0 ? (
            <p style={bodyText}>No submitted lesson activity was found in the selected window yet.</p>
          ) : (
            <div className="table-scroll-wrap" style={tableWrap}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>User</th>
                    <th style={th}>Role</th>
                    <th style={th}>Lessons</th>
                    <th style={th}>Observations</th>
                    <th style={th}>Average</th>
                    <th style={th}>Trend</th>
                    <th style={th}>Latest Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.map((row) => (
                    <tr key={row.id}>
                      <td style={tdStrong}>{row.name}</td>
                      <td style={td}>{formatRole(row.role)}</td>
                      <td style={td}>{row.lessons}</td>
                      <td style={td}>{row.adminObservations}</td>
                      <td style={td}>{row.averageScore ? `${row.averageScore}/100` : '—'}</td>
                      <td style={td}>
                        {row.trend > 0 ? `+${row.trend}` : row.trend < 0 ? `${row.trend}` : '0'}
                      </td>
                      <td style={td}>{formatDateTime(row.latestSubmittedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function formatRole(role: string) {
  if (!role) return 'User';
  if (role === 'super_admin') return 'Super Admin';
  if (role === 'admin') return 'Admin';
  return 'Teacher';
}

function formatDateTime(value: string | null) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const tooltipStyle = {
  background: 'var(--surface-card-solid)',
  border: '1px solid var(--border)',
  borderRadius: 14,
  boxShadow: '0 18px 32px rgba(15,23,42,0.18)',
};

const page: React.CSSProperties = {
  minHeight: '100vh',
  background: 'var(--surface-page)',
};

const container: React.CSSProperties = {
  maxWidth: 1240,
  margin: '0 auto',
};

const header: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 20,
  flexWrap: 'wrap',
  marginBottom: 24,
};

const eyebrow: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#3b82f6',
  marginBottom: 10,
};

const heading: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: 32,
  lineHeight: 1.05,
  margin: '0 0 8px 0',
};

const subheading: React.CSSProperties = {
  color: 'var(--text-secondary)',
  margin: 0,
  maxWidth: 780,
};

const headerControls: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  alignItems: 'center',
  flexWrap: 'wrap',
};

const toggleWrap: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: 6,
  borderRadius: 14,
  border: '1px solid var(--border)',
  background: 'var(--surface-card-solid)',
  boxShadow: 'var(--shadow-soft)',
};

const toggleBtn: React.CSSProperties = {
  border: 'none',
  borderRadius: 10,
  padding: '10px 14px',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
};

const backBtn: React.CSSProperties = {
  border: '1px solid var(--border)',
  background: 'var(--surface-card-solid)',
  color: 'var(--text-primary)',
  borderRadius: 12,
  padding: '10px 14px',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  minHeight: 42,
};

const heroSection: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'stretch',
  gap: 18,
  flexWrap: 'wrap',
  background: 'linear-gradient(135deg, rgba(59,130,246,0.14), rgba(15,23,42,0.04))',
  border: '1px solid rgba(59,130,246,0.18)',
  borderRadius: 24,
  padding: 24,
  marginBottom: 22,
  boxShadow: 'var(--shadow-soft)',
};

const heroTextBlock: React.CSSProperties = {
  flex: '1 1 560px',
  minWidth: 0,
};

const heroKicker: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#3b82f6',
  marginBottom: 10,
};

const heroTitle: React.CSSProperties = {
  margin: '0 0 10px 0',
  color: 'var(--text-primary)',
  fontSize: 28,
  lineHeight: 1.1,
};

const heroText: React.CSSProperties = {
  margin: 0,
  color: 'var(--text-secondary)',
  maxWidth: 680,
};

const heroBadge: React.CSSProperties = {
  minWidth: 200,
  borderRadius: 20,
  padding: '20px 22px',
  border: '1px solid rgba(59,130,246,0.16)',
  background: 'var(--surface-card-solid)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: 6,
};

const heroBadgeValue: React.CSSProperties = {
  fontSize: 38,
  fontWeight: 800,
  color: 'var(--text-primary)',
  lineHeight: 1,
};

const heroBadgeLabel: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 13,
};

const statsGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 16,
  marginBottom: 22,
};

const statCard: React.CSSProperties = {
  background: 'var(--surface-card-solid)',
  border: '1px solid var(--border)',
  borderRadius: 18,
  padding: 20,
  boxShadow: 'var(--shadow-soft)',
  minWidth: 0,
};

const statLabel: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  marginBottom: 10,
};

const statValue: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: 32,
  fontWeight: 800,
  lineHeight: 1,
  marginBottom: 8,
};

const statSub: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 13,
  lineHeight: 1.5,
};

const twoColumn: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 18,
  marginBottom: 22,
};

const sectionCard: React.CSSProperties = {
  background: 'var(--surface-card-solid)',
  border: '1px solid var(--border)',
  borderRadius: 20,
  padding: 22,
  boxShadow: 'var(--shadow-soft)',
  minWidth: 0,
};

const sectionHeader: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  marginBottom: 16,
  flexWrap: 'wrap',
};

const sectionEyebrow: React.CSSProperties = {
  color: '#3b82f6',
  fontSize: 12,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 8,
};

const sectionTitle: React.CSSProperties = {
  color: 'var(--text-primary)',
  margin: 0,
  fontSize: 22,
};

const chartShell: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 18,
  padding: '14px 10px 6px',
  background: 'linear-gradient(180deg, rgba(15,23,42,0.04), rgba(15,23,42,0.02))',
  minWidth: 0,
};

const readinessGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 16,
};

const readinessCard: React.CSSProperties = {
  borderRadius: 16,
  border: '1px solid var(--border)',
  background: 'var(--surface-chip)',
  padding: 18,
  minWidth: 0,
};

const readinessTopRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  marginBottom: 12,
};

const readinessLabel: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontWeight: 700,
  fontSize: 15,
};

const readinessPill: React.CSSProperties = {
  borderRadius: 999,
  padding: '6px 10px',
  fontSize: 12,
  fontWeight: 800,
};

const readinessText: React.CSSProperties = {
  margin: 0,
  color: 'var(--text-secondary)',
  lineHeight: 1.6,
  fontSize: 14,
};

const bodyText: React.CSSProperties = {
  color: 'var(--text-secondary)',
  lineHeight: 1.65,
};

const tableWrap: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 16,
  overflow: 'hidden',
};

const table: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  minWidth: 760,
};

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '14px 16px',
  color: 'var(--text-secondary)',
  fontSize: 12,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: '1px solid var(--border)',
};

const td: React.CSSProperties = {
  padding: '14px 16px',
  color: 'var(--text-secondary)',
  borderBottom: '1px solid var(--border)',
  fontSize: 14,
  verticalAlign: 'middle',
};

const tdStrong: React.CSSProperties = {
  ...td,
  color: 'var(--text-primary)',
  fontWeight: 700,
};
