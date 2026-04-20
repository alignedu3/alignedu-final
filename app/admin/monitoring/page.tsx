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

type ConnectionState = {
  key: string;
  label: string;
  connected: boolean;
  detail: string;
  envKeys?: string[];
};

type TrafficSummaryCard = {
  key: string;
  label: string;
  value: number | null;
  displayValue: string;
  status: 'healthy' | 'warning' | 'critical' | 'connect_required';
  statusLabel: string;
  detail: string;
};

type TrafficSeriesPoint = {
  date: string;
  label: string;
  requests: number | null;
  cached: number | null;
  uncached: number | null;
  bandwidthMb: number | null;
};

type CloudflareDiagnostics = {
  apiTokenConfigured?: boolean;
  zoneIdConfigured?: boolean;
  status?: 'live' | 'missing_config' | 'error';
  errorMessage?: string | null;
  hint?: string | null;
};

type MonitoringAlert = {
  key: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
  source: string;
};

type OpsSummaryCard = {
  key: string;
  label: string;
  value: number | null;
  displayValue: string;
  status: 'healthy' | 'warning' | 'critical' | 'connect_required';
  detail: string;
};

type UptimeCheck = {
  key: string;
  label: string;
  url: string;
  ok: boolean;
  statusCode: number | null;
  responseTimeMs: number | null;
  detail: string;
  checkedAt: string;
};

type SentryIssueRow = {
  id: string;
  title: string;
  culprit: string | null;
  level: string | null;
  count: number;
  userCount: number;
  status: string | null;
  lastSeen: string | null;
  permalink: string | null;
};

type SentryDiagnostics = {
  tokenConfigured?: boolean;
  orgConfigured?: boolean;
  projectConfigured?: boolean;
  status?: 'live' | 'missing_config' | 'error';
  errorMessage?: string | null;
  hint?: string | null;
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
  alerts?: MonitoringAlert[];
  recentActivity?: MonitoringActivityRow[];
  uptime?: {
    summaryCards?: OpsSummaryCard[];
    checks?: UptimeCheck[];
  };
  sentry?: {
    summaryCards?: OpsSummaryCard[];
    recentIssues?: SentryIssueRow[];
    diagnostics?: SentryDiagnostics;
  };
  connections?: ConnectionState[];
  sync?: {
    generatedAt?: string;
    connectedProviders?: number;
    totalProviders?: number;
  };
  httpTraffic?: {
    summaryCards?: TrafficSummaryCard[];
    requestSeries?: TrafficSeriesPoint[];
    bandwidthSeries?: TrafficSeriesPoint[];
    diagnostics?: CloudflareDiagnostics;
  };
};

const WINDOW_OPTIONS = [7, 14, 30] as const;

export default function MonitoringDashboard() {
  const [days, setDays] = useState<(typeof WINDOW_OPTIONS)[number]>(7);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [chartReady, setChartReady] = useState(false);
  const [payload, setPayload] = useState<MonitoringPayload | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setChartReady(true);
  }, []);

  const loadMonitoring = async (selectedDays: (typeof WINDOW_OPTIONS)[number], silent = false) => {
    try {
      if (!silent) {
        setIsRefreshing(true);
      }
      setLoadError('');

      const { response, data } = await fetchJsonWithTimeout<MonitoringPayload>(`/api/admin/monitoring?days=${selectedDays}`, {
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
      if (!silent) {
        setIsRefreshing(false);
      }
    }
  };

  useEffect(() => {
    loadMonitoring(days);

    const refreshId = window.setInterval(() => {
      loadMonitoring(days, true);
    }, 60000);

    return () => window.clearInterval(refreshId);
  }, [days]);

  const summary = payload?.summary;
  const series = payload?.series || [];
  const readiness = payload?.readiness || [];
  const recentActivity = payload?.recentActivity || [];
  const alerts = payload?.alerts || [];
  const uptimeCards = payload?.uptime?.summaryCards || [];
  const uptimeChecks = payload?.uptime?.checks || [];
  const sentryCards = payload?.sentry?.summaryCards || [];
  const sentryIssues = payload?.sentry?.recentIssues || [];
  const sentryDiagnostics = payload?.sentry?.diagnostics;
  const connections = payload?.connections || [];
  const trafficCards = payload?.httpTraffic?.summaryCards || [];
  const requestSeries = payload?.httpTraffic?.requestSeries || [];
  const bandwidthSeries = payload?.httpTraffic?.bandwidthSeries || [];
  const trafficDiagnostics = payload?.httpTraffic?.diagnostics;
  const callerName = payload?.caller?.name || 'Platform Monitoring';
  const syncGeneratedAt = payload?.sync?.generatedAt || null;
  const hasLiveTraffic = trafficCards.some((card) => card.status !== 'connect_required');
  const hasLiveSentry = sentryCards.some((card) => card.status !== 'connect_required');
  const cloudflareConnection = connections.find((item) => item.key === 'cloudflare-traffic');
  const sentryConnection = connections.find((item) => item.key === 'sentry-api');

  const healthHeadline = useMemo(() => {
    if (!readiness.length) return 'Monitoring status is loading.';
    const healthyCount = readiness.filter((item) => item.healthy).length;
    if (healthyCount === readiness.length) return 'Core monitoring and runtime services are configured.';
    if (healthyCount >= readiness.length - 1) return 'Most core services are configured, with one area to review.';
    return 'Multiple monitoring or runtime services still need attention.';
  }, [readiness]);

  const connectionHeadline = useMemo(() => {
    const connected = payload?.sync?.connectedProviders ?? 0;
    const total = payload?.sync?.totalProviders ?? 0;
    if (!total) return 'Provider connections will appear here once the dashboard is initialized.';
    if (connected === total) return 'All provider feeds are connected.';
    return `${connected} of ${total} provider feeds are connected. The rest are ready to wire in when you add access tokens.`;
  }, [payload?.sync?.connectedProviders, payload?.sync?.totalProviders]);

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
            <button
              type="button"
              onClick={() => loadMonitoring(days)}
              style={{
                ...backBtn,
                minWidth: 122,
                opacity: isRefreshing ? 0.7 : 1,
              }}
              disabled={isRefreshing}
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button type="button" onClick={() => router.push('/admin')} style={backBtn}>
              Back to Admin
            </button>
            <div>
              <div style={updatedText}>
                {syncGeneratedAt ? `Updated ${formatTime(syncGeneratedAt)}` : 'Waiting for sync'}
              </div>
              <div style={refreshText}>Auto-refresh every 60 seconds</div>
            </div>
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

        <section style={sectionCard}>
          <div style={sectionHeader}>
            <div>
              <div style={sectionEyebrow}>Watchlist</div>
              <h2 style={sectionTitle}>What Needs Attention</h2>
            </div>
          </div>
          <div style={alertGrid}>
            {alerts.map((alert) => (
              <div
                key={alert.key}
                style={{
                  ...alertCard,
                  borderColor:
                    alert.severity === 'critical'
                      ? 'rgba(220,38,38,0.22)'
                      : alert.severity === 'warning'
                        ? 'rgba(245,158,11,0.22)'
                        : 'rgba(59,130,246,0.18)',
                  background:
                    alert.severity === 'critical'
                      ? 'rgba(220,38,38,0.06)'
                      : alert.severity === 'warning'
                        ? 'rgba(245,158,11,0.08)'
                        : 'rgba(59,130,246,0.06)',
                }}
              >
                <div style={alertTopRow}>
                  <div style={alertTitle}>{alert.title}</div>
                  <div
                    style={{
                      ...miniStatusPill,
                      background:
                        alert.severity === 'critical'
                          ? 'rgba(220,38,38,0.14)'
                          : alert.severity === 'warning'
                            ? 'rgba(245,158,11,0.16)'
                            : 'rgba(59,130,246,0.12)',
                      color:
                        alert.severity === 'critical'
                          ? '#dc2626'
                          : alert.severity === 'warning'
                            ? '#b45309'
                            : '#2563eb',
                    }}
                  >
                    {alert.severity === 'critical' ? 'Critical' : alert.severity === 'warning' ? 'Watch' : 'Info'}
                  </div>
                </div>
                <p style={{ ...bodyText, margin: '8px 0 10px 0' }}>{alert.detail}</p>
                <div style={alertSource}>{alert.source}</div>
              </div>
            ))}
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
                <div style={sectionEyebrow}>Availability</div>
                <h2 style={sectionTitle}>Uptime and Response Time</h2>
              </div>
            </div>
            <div style={uptimeStatsGrid} className="monitoring-uptime-grid">
              {uptimeCards.map((card) => (
                <div key={card.key} style={statCard}>
                  <div style={statLabel}>{card.label}</div>
                  <div style={statValue}>{card.displayValue}</div>
                  <div
                    style={{
                      ...miniStatusPill,
                      background:
                        card.status === 'healthy'
                          ? 'rgba(22,163,74,0.16)'
                          : card.status === 'warning'
                            ? 'rgba(245,158,11,0.16)'
                            : 'rgba(220,38,38,0.14)',
                      color:
                        card.status === 'healthy'
                          ? '#16a34a'
                          : card.status === 'warning'
                            ? '#b45309'
                            : '#dc2626',
                    }}
                  >
                    {card.status === 'healthy' ? 'Healthy' : card.status === 'warning' ? 'Slow' : 'Down'}
                  </div>
                  <div style={{ ...statSub, marginTop: 10 }}>{card.detail}</div>
                </div>
              ))}
            </div>
            <div style={statusList} className="monitoring-status-list">
              {uptimeChecks.map((check) => (
                <div key={check.key} style={statusRow} className="monitoring-status-row">
                  <div>
                    <div style={statusTitle}>{check.label}</div>
                    <div style={statusMeta}>
                      {check.statusCode ? `HTTP ${check.statusCode}` : 'No response'} | {check.responseTimeMs != null ? `${check.responseTimeMs} ms` : 'No timing'}
                    </div>
                    <div style={{ ...statSub, marginTop: 6 }}>
                      {formatCheckTarget(check.url)} | Checked {formatTime(check.checkedAt)}
                    </div>
                    <div style={{ ...statSub, marginTop: 4 }}>{check.detail}</div>
                  </div>
                  <div
                    style={{
                      ...miniStatusPill,
                      background: !check.ok
                        ? 'rgba(220,38,38,0.14)'
                        : (check.responseTimeMs || 0) > 1200
                          ? 'rgba(245,158,11,0.16)'
                          : 'rgba(22,163,74,0.16)',
                      color: !check.ok ? '#dc2626' : (check.responseTimeMs || 0) > 1200 ? '#b45309' : '#16a34a',
                    }}
                  >
                    {!check.ok ? 'Failing' : (check.responseTimeMs || 0) > 1200 ? 'Slow' : 'Healthy'}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section style={sectionCard}>
            <div style={sectionHeader}>
              <div>
                <div style={sectionEyebrow}>Error Health</div>
                <h2 style={sectionTitle}>Sentry Issues and Errors</h2>
              </div>
            </div>
            {!hasLiveSentry ? (
              <div style={warningBanner}>
                <div style={warningTitle}>Sentry issue monitoring is not live yet.</div>
                <p style={{ ...bodyText, margin: '6px 0 0 0' }}>
                  {sentryConnection?.detail || 'Add Sentry API credentials to pull live issue and error metrics.'}
                </p>
                {sentryDiagnostics?.errorMessage ? (
                  <p style={{ ...bodyText, margin: '6px 0 0 0' }}>
                    Last Sentry API error: <strong>{sentryDiagnostics.errorMessage}</strong>
                  </p>
                ) : null}
                {sentryDiagnostics?.hint ? (
                  <p style={{ ...bodyText, margin: '6px 0 0 0' }}>{sentryDiagnostics.hint}</p>
                ) : null}
              </div>
            ) : null}
            <div style={statsGrid}>
              {sentryCards.map((card) => (
                <div key={card.key} style={statCard}>
                  <div style={statLabel}>{card.label}</div>
                  <div style={statValue}>{card.displayValue}</div>
                  <div
                    style={{
                      ...miniStatusPill,
                      background:
                        card.status === 'healthy'
                          ? 'rgba(22,163,74,0.16)'
                          : card.status === 'warning'
                            ? 'rgba(245,158,11,0.16)'
                            : card.status === 'critical'
                              ? 'rgba(220,38,38,0.14)'
                              : 'rgba(59,130,246,0.12)',
                      color:
                        card.status === 'healthy'
                          ? '#16a34a'
                          : card.status === 'warning'
                            ? '#b45309'
                            : card.status === 'critical'
                              ? '#dc2626'
                              : '#2563eb',
                    }}
                  >
                    {card.status === 'healthy'
                      ? 'Healthy'
                      : card.status === 'warning'
                        ? 'Watch'
                        : card.status === 'critical'
                          ? 'Urgent'
                          : 'Connect'}
                  </div>
                  <div style={{ ...statSub, marginTop: 10 }}>{card.detail}</div>
                </div>
              ))}
            </div>
            {sentryIssues.length ? (
            <div style={statusList} className="monitoring-status-list">
                {sentryIssues.map((issue) => (
                  <div key={issue.id} style={issueRow} className="monitoring-issue-row">
                    <div style={{ minWidth: 0 }}>
                      <div style={issueTitle}>{issue.title}</div>
                      <div style={issueMeta}>
                        {issue.count} events | {issue.userCount} users | {issue.level || 'error'}
                      </div>
                      {issue.culprit ? <div style={issueCulprit}>{issue.culprit}</div> : null}
                    </div>
                    <div style={issueTime}>{formatDateTime(issue.lastSeen)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={bodyText}>No recent unresolved Sentry issues are being shown yet.</p>
            )}
          </section>
        </div>

        <section style={sectionCard}>
          <div style={sectionHeader}>
            <div>
              <div style={sectionEyebrow}>Provider Connections</div>
              <h2 style={sectionTitle}>Infrastructure Feeds</h2>
            </div>
          </div>
          <p style={{ ...bodyText, marginTop: 0 }}>{connectionHeadline}</p>
          <div style={readinessGrid}>
            {connections.map((item) => (
              <div key={item.key} style={readinessCard}>
                <div style={readinessTopRow}>
                  <div style={readinessLabel}>{item.label}</div>
                  <div
                    style={{
                      ...readinessPill,
                      background: item.connected ? 'rgba(22,163,74,0.16)' : 'rgba(59,130,246,0.12)',
                      color: item.connected ? '#16a34a' : '#3b82f6',
                    }}
                  >
                    {item.connected ? 'Connected' : 'Ready to Connect'}
                  </div>
                </div>
                <p style={readinessText}>{item.detail}</p>
                {item.envKeys && item.envKeys.length > 0 ? (
                  <div style={envKeyRow}>
                    {item.envKeys.map((envKey) => (
                      <span key={envKey} style={envKeyChip}>{envKey}</span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section style={sectionCard}>
          <div style={sectionHeader}>
            <div>
              <div style={sectionEyebrow}>HTTP Traffic</div>
              <h2 style={sectionTitle}>Requests, Caching, Visitors, and Bandwidth</h2>
            </div>
          </div>
          {!hasLiveTraffic ? (
            <div style={warningBanner}>
              <div style={warningTitle}>Cloudflare traffic is not connected for this environment.</div>
              <p style={{ ...bodyText, margin: '6px 0 0 0' }}>
                {cloudflareConnection?.detail || 'Add Cloudflare credentials so the monitoring API can pull live traffic analytics.'}
              </p>
              {trafficDiagnostics ? (
                <p style={{ ...bodyText, margin: '6px 0 0 0' }}>
                  Token: {trafficDiagnostics.apiTokenConfigured ? 'configured' : 'missing'} | Zone ID: {trafficDiagnostics.zoneIdConfigured ? 'configured' : 'missing'}
                </p>
              ) : null}
              {trafficDiagnostics?.hint ? (
                <p style={{ ...bodyText, margin: '6px 0 0 0' }}>{trafficDiagnostics.hint}</p>
              ) : null}
            </div>
          ) : null}
          <div style={trafficStatsGrid} className="monitoring-traffic-grid">
            {trafficCards.map((card) => (
              <div key={card.key} style={statCard}>
                <div style={statLabel}>{card.label}</div>
                <div style={statValue}>{card.displayValue}</div>
                <div
                  style={{
                    ...miniStatusPill,
                    background:
                      card.status === 'healthy'
                        ? 'rgba(22,163,74,0.16)'
                        : card.status === 'warning'
                          ? 'rgba(245,158,11,0.16)'
                          : card.status === 'critical'
                            ? 'rgba(220,38,38,0.14)'
                            : 'rgba(59,130,246,0.12)',
                    color:
                      card.status === 'healthy'
                        ? '#16a34a'
                        : card.status === 'warning'
                          ? '#b45309'
                          : card.status === 'critical'
                            ? '#dc2626'
                            : '#3b82f6',
                  }}
                >
                  {card.statusLabel}
                </div>
                <div style={{ ...statSub, marginTop: 10 }}>{card.detail}</div>
              </div>
            ))}
          </div>
          <div style={twoColumn} className="monitoring-two-column">
            <section style={sectionCard}>
              <div style={sectionHeader}>
                <div>
                  <div style={sectionEyebrow}>Request Load</div>
                  <h3 style={subChartTitle}>Requests Over Time</h3>
                </div>
              </div>
              <div style={chartShell}>
                {chartReady ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={requestSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="label" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                      <YAxis stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                      <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'var(--text-primary)', fontWeight: 700 }} />
                      <Bar dataKey="cached" name="Cached" fill="#10b981" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="uncached" name="Uncached" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: 300 }} />
                )}
              </div>
              <p style={emptyChartNote}>
                {hasLiveTraffic
                  ? 'Cloudflare request and cache analytics are now being pulled into the monitoring view.'
                  : 'Add Cloudflare traffic analytics to unlock request, visitor, and cache metrics.'}
              </p>
            </section>

            <section style={sectionCard}>
              <div style={sectionHeader}>
                <div>
                  <div style={sectionEyebrow}>Bandwidth</div>
                  <h3 style={subChartTitle}>Bandwidth Over Time</h3>
                </div>
              </div>
              <div style={chartShell}>
                {chartReady ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={bandwidthSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="label" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                      <YAxis stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                      <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'var(--text-primary)', fontWeight: 700 }} />
                      <Line type="monotone" dataKey="bandwidthMb" name="Bandwidth (MB)" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: 300 }} />
                )}
              </div>
              <p style={emptyChartNote}>
                {hasLiveTraffic
                  ? 'Bandwidth and edge-delivery visibility are now coming from Cloudflare for the selected window.'
                  : 'Bandwidth, cache hit ratio, and threat blocking will populate from Cloudflare once connected.'}
              </p>
            </section>
          </div>
        </section>

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

function formatTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatCheckTarget(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.pathname === '/' ? parsed.origin : `${parsed.origin}${parsed.pathname}`;
  } catch {
    return value;
  }
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

const updatedText: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 13,
  fontWeight: 600,
};

const refreshText: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 12,
  marginTop: 4,
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

const uptimeStatsGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 16,
  marginBottom: 14,
};

const trafficStatsGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: 14,
  marginBottom: 22,
};

const alertGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 14,
};

const alertCard: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 18,
  padding: 18,
  minWidth: 0,
};

const alertTopRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 12,
};

const alertTitle: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontWeight: 800,
  fontSize: 15,
};

const alertSource: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
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

const miniStatusPill: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: 999,
  padding: '6px 10px',
  fontSize: 12,
  fontWeight: 800,
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

const warningBanner: React.CSSProperties = {
  marginBottom: 18,
  padding: 16,
  borderRadius: 16,
  border: '1px solid rgba(245, 158, 11, 0.28)',
  background: 'rgba(245, 158, 11, 0.08)',
};

const warningTitle: React.CSSProperties = {
  color: '#b45309',
  fontSize: 14,
  fontWeight: 800,
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

const statusList: React.CSSProperties = {
  display: 'grid',
  gap: 12,
};

const statusRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  padding: '14px 16px',
  borderRadius: 16,
  border: '1px solid var(--border)',
  background: 'var(--surface-chip)',
};

const statusTitle: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontWeight: 700,
  fontSize: 14,
};

const statusMeta: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 13,
  marginTop: 4,
};

const issueRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
  padding: '14px 16px',
  borderRadius: 16,
  border: '1px solid var(--border)',
  background: 'var(--surface-chip)',
};

const issueTitle: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontWeight: 700,
  fontSize: 14,
};

const issueMeta: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 13,
  marginTop: 4,
};

const issueCulprit: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 13,
  marginTop: 6,
  overflowWrap: 'anywhere',
};

const issueTime: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 13,
  whiteSpace: 'nowrap',
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

const envKeyRow: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  marginTop: 12,
};

const envKeyChip: React.CSSProperties = {
  borderRadius: 999,
  padding: '6px 10px',
  background: 'rgba(15,23,42,0.06)',
  border: '1px solid var(--border)',
  color: 'var(--text-secondary)',
  fontSize: 12,
  fontWeight: 700,
};

const subChartTitle: React.CSSProperties = {
  color: 'var(--text-primary)',
  margin: 0,
  fontSize: 18,
};

const emptyChartNote: React.CSSProperties = {
  margin: '12px 0 0 0',
  color: 'var(--text-secondary)',
  fontSize: 13,
  lineHeight: 1.55,
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
