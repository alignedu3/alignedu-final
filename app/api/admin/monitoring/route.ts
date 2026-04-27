import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { calculateLessonScore, getLatestLessonTrend, type AnalysisReport, type ProfileRecord } from '@/lib/dashboardData';
import { cleanDisplayText, parseFeedbackSections } from '@/lib/analysisReport';
import { getErrorMessage } from '@/lib/errorHandling';
import { captureRouteException } from '@/lib/sentryRoute';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MONITORING_OWNER_EMAIL = 'ryan@alignedu.net';
const DEFAULT_PUBLIC_SITE_URL = 'https://www.alignedu.net';

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

type MonitoringLessonLedgerRow = {
  id: string;
  title: string;
  context: string;
  submittedBy: string;
  submitterRole: string;
  source: string;
  createdAt: string | null;
  score: number;
  executiveSummary: string;
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

type CloudflareDailyPoint = {
  date: string;
  requests: number;
  pageViews: number;
  uniques: number;
  bytes: number;
  cachedBytes: number;
  cachedRequests: number;
  threats: number;
  clientErrors: number;
  serverErrors: number;
};

type CloudflareTotals = {
  requests: number;
  pageViews: number;
  uniques: number;
  bytes: number;
  cachedBytes: number;
  cachedRequests: number;
  threats: number;
  clientErrors: number;
  serverErrors: number;
};

type CloudflareTrafficResult = {
  connected: boolean;
  detail: string;
  summaryCards: TrafficSummaryCard[];
  topErrorRoutes: Array<{
    key: string;
    label: string;
    path: string | null;
    requests: number;
    status: 'healthy' | 'warning' | 'critical';
    detail: string;
  }>;
  requestSeries: TrafficSeriesPoint[];
  bandwidthSeries: TrafficSeriesPoint[];
  diagnostics: {
    apiTokenConfigured: boolean;
    zoneIdConfigured: boolean;
    status: 'live' | 'missing_config' | 'error';
    errorMessage: string | null;
  hint: string | null;
  };
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

type UptimeResult = {
  summaryCards: Array<{
    key: string;
    label: string;
    value: number | null;
    displayValue: string;
    status: 'healthy' | 'warning' | 'critical';
    statusLabel: string;
    detail: string;
  }>;
  checks: UptimeCheck[];
};

type UptimeCheckTarget = {
  key: string;
  label: string;
  path: string;
  acceptedStatuses?: number[];
  expectedRedirectTo?: string;
};

const MONITORING_BROWSER_HEADERS = {
  Accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
  'Upgrade-Insecure-Requests': '1',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
} as const;

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

type SentryResult = {
  connected: boolean;
  detail: string;
  summaryCards: Array<{
    key: string;
    label: string;
    value: number | null;
    displayValue: string;
    status: 'healthy' | 'warning' | 'critical' | 'connect_required';
    detail: string;
  }>;
  recentIssues: SentryIssueRow[];
  crashFreeSessionsPercent: number | null;
  diagnostics: {
    tokenConfigured: boolean;
    orgConfigured: boolean;
    projectConfigured: boolean;
    status: 'live' | 'missing_config' | 'error';
    errorMessage: string | null;
    hint: string | null;
  };
};

type SupabaseAdvisorLint = {
  name?: string;
  title?: string;
  level?: string;
  categories?: string[];
  description?: string;
  detail?: string;
  remediation?: string;
  metadata?: {
    schema?: string;
    name?: string;
    entity?: string;
    type?: string;
    fkey_name?: string;
  } | null;
  cache_key?: string;
};

type SupabaseAdvisorResult = {
  connected: boolean;
  detail: string;
  summaryCards: Array<{
    key: string;
    label: string;
    value: number | null;
    displayValue: string;
    status: 'healthy' | 'warning' | 'critical' | 'connect_required';
    detail: string;
  }>;
  findings: Array<{
    key: string;
    title: string;
    severity: 'healthy' | 'warning' | 'critical';
    category: 'security' | 'performance';
    detail: string;
    remediation: string | null;
    entity: string | null;
  }>;
  diagnostics: {
    tokenConfigured: boolean;
    projectRefConfigured: boolean;
    status: 'live' | 'missing_config' | 'error';
    errorMessage: string | null;
    hint: string | null;
  };
};

type StatsGroup = {
  totals?: Record<string, number | string | null | undefined> | null;
  by?: {
    outcome?: string | null;
  } | null;
};

type StatsPayload = {
  groups?: StatsGroup[] | null;
};

type SentryProject = {
  id: string | number;
  slug?: string | null;
  name?: string | null;
};

type SentryIssueLike = {
  id?: string | number | null;
  title?: string | null;
  culprit?: string | null;
  level?: string | null;
  count?: string | number | null;
  userCount?: string | number | null;
  status?: string | null;
  lastSeen?: string | null;
  permalink?: string | null;
  metadata?: {
    title?: string | null;
    value?: string | null;
  } | null;
};

type CloudflareRouteEntry = {
  count?: string | number | null;
  dimensions?: {
    clientRequestHTTPHost?: string | null;
    clientRequestPath?: string | null;
  } | null;
  edgeResponseStatus?: string | number | null;
  requests?: string | number | null;
};

type MonitoringAlert = {
  key: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
  source: string;
};

function getServiceSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Server configuration error: Supabase service credentials are not set.');
  }

  return createServiceClient(supabaseUrl, serviceRoleKey);
}

function parseWindowDays(value: string | null) {
  const parsed = Number(value);
  return parsed === 14 || parsed === 30 ? parsed : 7;
}

function buildDateKeys(days: number) {
  const now = new Date();
  const keys: string[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(now);
    day.setHours(12, 0, 0, 0);
    day.setDate(now.getDate() - offset);
    keys.push(day.toISOString().slice(0, 10));
  }

  return keys;
}

function isAdminObservation(report: AnalysisReport) {
  const text = `${report.result || ''}\n${report.analysis_result || ''}`.toLowerCase();
  return text.includes('admin observation') || text.includes('submitted by:');
}

function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function formatCompactDate(dateKey: string) {
  const parsed = new Date(`${dateKey}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? dateKey
    : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
}

function buildMonitoringLessonContext(report: AnalysisReport) {
  return [report.grade, report.subject, report.title]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' · ');
}

function buildMonitoringLessonSummary(report: AnalysisReport) {
  const parsed = parseFeedbackSections(report.result || report.analysis_result || '');
  if (parsed.executiveSummary) {
    return parsed.executiveSummary;
  }

  const fallback = cleanDisplayText(report.result || report.analysis_result || '');
  if (!fallback) return 'No executive summary was saved for this lesson report.';
  return fallback.length > 260 ? `${fallback.slice(0, 257).trimEnd()}...` : fallback;
}

function getTotalFromStatsGroups(payload: StatsPayload | null | undefined, field: string) {
  return roundTo(
    Number(
      (payload?.groups || []).reduce((sum: number, group) => sum + Number(group?.totals?.[field] || 0), 0)
    ),
    0
  );
}

function roundTo(value: number, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function buildReadiness(): MonitoringReadiness[] {
  const sentryConfigured = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN);
  const openAiConfigured = Boolean(process.env.OPENAI_API_KEY);
  const publicSupabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const serviceSupabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  return [
    {
      key: 'sentry',
      label: 'Sentry Monitoring',
      healthy: sentryConfigured,
      detail: sentryConfigured ? 'Error capture is configured for browser and server monitoring.' : 'Sentry DSN is missing.',
    },
    {
      key: 'openai',
      label: 'OpenAI Runtime',
      healthy: openAiConfigured,
      detail: openAiConfigured ? 'Lesson analysis runtime is configured.' : 'OPENAI_API_KEY is missing.',
    },
    {
      key: 'supabase-public',
      label: 'Supabase Public Auth',
      healthy: publicSupabaseConfigured,
      detail: publicSupabaseConfigured ? 'Browser authentication can initialize cleanly.' : 'Public Supabase env vars are incomplete.',
    },
    {
      key: 'supabase-service',
      label: 'Supabase Service Access',
      healthy: serviceSupabaseConfigured,
      detail: serviceSupabaseConfigured ? 'Protected dashboard routes can query secure app data.' : 'SUPABASE_SERVICE_ROLE_KEY is missing.',
    },
  ];
}

function buildConnections() {
  const hasSentryApi = Boolean(process.env.SENTRY_AUTH_TOKEN && (process.env.SENTRY_ORG || process.env.SENTRY_ORG_SLUG));
  const hasCloudflareUsage = Boolean(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ZONE_ID);
  const hasResendUsage = Boolean(process.env.RESEND_API_KEY);
  const hasSupabaseAdvisors = Boolean(process.env.SUPABASE_MANAGEMENT_TOKEN && process.env.SUPABASE_PROJECT_REF);

  const connections: ConnectionState[] = [
    {
      key: 'supabase-advisors',
      label: 'Supabase Security Advisors',
      connected: hasSupabaseAdvisors,
      detail: hasSupabaseAdvisors
        ? 'Supabase management credentials are present for live security and performance advisor findings.'
        : 'Add SUPABASE_MANAGEMENT_TOKEN and SUPABASE_PROJECT_REF to surface live advisor warnings.',
      envKeys: ['SUPABASE_MANAGEMENT_TOKEN', 'SUPABASE_PROJECT_REF'],
    },
    {
      key: 'sentry-api',
      label: 'Sentry Error Health',
      connected: hasSentryApi,
      detail: hasSentryApi
        ? 'Sentry API credentials are present for live issue and error metrics.'
        : 'Add SENTRY_AUTH_TOKEN and SENTRY_ORG to unlock live issue counts and error trends.',
      envKeys: ['SENTRY_AUTH_TOKEN', 'SENTRY_ORG', 'SENTRY_PROJECT'],
    },
    {
      key: 'cloudflare-traffic',
      label: 'Cloudflare Traffic',
      connected: hasCloudflareUsage,
      detail: hasCloudflareUsage
        ? 'Cloudflare analytics are ready to connect.'
        : 'Add CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID to unlock requests, threats, cache, and bandwidth.',
      envKeys: ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ZONE_ID'],
    },
    {
      key: 'resend-usage',
      label: 'Resend Email Usage',
      connected: hasResendUsage,
      detail: hasResendUsage
        ? 'Email runtime is configured and ready for delivery monitoring.'
        : 'Add RESEND_API_KEY to track invite and reset email usage.',
      envKeys: ['RESEND_API_KEY'],
    },
  ];

  return {
    connections,
    connectedCount: connections.filter((item) => item.connected).length,
  };
}

function getSupabaseAdvisorConfig() {
  const token = process.env.SUPABASE_MANAGEMENT_TOKEN || null;
  const projectRef = process.env.SUPABASE_PROJECT_REF || null;

  return {
    token,
    projectRef,
    tokenConfigured: Boolean(token),
    projectRefConfigured: Boolean(projectRef),
  };
}

function buildSupabaseAdvisorMissingConfigDetail() {
  const config = getSupabaseAdvisorConfig();
  const missing = [
    ...(!config.tokenConfigured ? ['SUPABASE_MANAGEMENT_TOKEN'] : []),
    ...(!config.projectRefConfigured ? ['SUPABASE_PROJECT_REF'] : []),
  ];

  if (!missing.length) {
    return 'Supabase advisor credentials are configured.';
  }
  if (missing.length === 1) {
    return `Missing ${missing[0]} in the running app environment.`;
  }
  return `Missing ${missing.join(' and ')} in the running app environment.`;
}

function buildEmptySupabaseAdvisorCards(): SupabaseAdvisorResult['summaryCards'] {
  return [
    {
      key: 'supabase-open-findings',
      label: 'Open Findings',
      value: null,
      displayValue: '—',
      status: 'connect_required',
      detail: 'Waiting on Supabase advisor findings.',
    },
    {
      key: 'supabase-security-findings',
      label: 'Security Findings',
      value: null,
      displayValue: '—',
      status: 'connect_required',
      detail: 'Waiting on Supabase security advisor results.',
    },
    {
      key: 'supabase-performance-findings',
      label: 'Performance Findings',
      value: null,
      displayValue: '—',
      status: 'connect_required',
      detail: 'Waiting on Supabase performance advisor results.',
    },
    {
      key: 'supabase-critical-findings',
      label: 'Critical Findings',
      value: null,
      displayValue: '—',
      status: 'connect_required',
      detail: 'Waiting on Supabase high-priority findings.',
    },
  ];
}

function buildSupabaseAdvisorErrorHint(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes('(401)') || normalized.includes('unauthorized')) {
    return 'The Supabase management token may be invalid or expired.';
  }
  if (normalized.includes('(403)') || normalized.includes('forbidden')) {
    return 'The Supabase management token may be missing advisors_read or database:read access.';
  }
  if (normalized.includes('(404)') || normalized.includes('not found')) {
    return 'The configured SUPABASE_PROJECT_REF may not match this project.';
  }
  return 'Check the Supabase management token and project ref for this deployment.';
}

function formatSupabaseAdvisorEntity(lint: SupabaseAdvisorLint) {
  const entity = lint.metadata?.entity || lint.metadata?.name || null;
  const schema = lint.metadata?.schema || null;
  const fkeyName = lint.metadata?.fkey_name || null;

  if (schema && entity && fkeyName) {
    return `${schema}.${entity} · ${fkeyName}`;
  }
  if (schema && entity) {
    return `${schema}.${entity}`;
  }
  return entity;
}

function mapSupabaseAdvisorSeverity(level: string | undefined) {
  const normalized = String(level || '').toUpperCase();
  if (normalized === 'ERROR') return 'critical' as const;
  if (normalized === 'WARN' || normalized === 'WARNING') return 'warning' as const;
  return 'healthy' as const;
}

async function fetchSupabaseAdvisors(): Promise<SupabaseAdvisorResult> {
  const config = getSupabaseAdvisorConfig();

  if (!config.tokenConfigured || !config.projectRefConfigured) {
    return {
      connected: false,
      detail: buildSupabaseAdvisorMissingConfigDetail(),
      summaryCards: buildEmptySupabaseAdvisorCards(),
      findings: [],
      diagnostics: {
        tokenConfigured: config.tokenConfigured,
        projectRefConfigured: config.projectRefConfigured,
        status: 'missing_config',
        errorMessage: null,
        hint: 'Add SUPABASE_MANAGEMENT_TOKEN and SUPABASE_PROJECT_REF to surface live database advisor findings.',
      },
    };
  }

  const advisorFetch = async (kind: 'security' | 'performance') => {
    const response = await fetch(`https://api.supabase.com/v1/projects/${config.projectRef}/advisors/${kind}`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/json',
      },
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage =
        payload?.message ||
        payload?.error ||
        `Supabase advisor request failed (${response.status}) for /advisors/${kind}.`;
      throw new Error(errorMessage);
    }

    return Array.isArray(payload?.lints) ? (payload.lints as SupabaseAdvisorLint[]) : [];
  };

  const [securityLints, performanceLints] = await Promise.all([
    advisorFetch('security'),
    advisorFetch('performance'),
  ]);

  const findings = [...securityLints, ...performanceLints]
    .map((lint, index) => {
      const categories = Array.isArray(lint.categories) ? lint.categories : [];
      const category = categories.includes('PERFORMANCE') ? ('performance' as const) : ('security' as const);
      return {
        key: lint.cache_key || `${category}-${lint.name || lint.title || index}`,
        title: lint.title || lint.name || 'Supabase advisor finding',
        severity: mapSupabaseAdvisorSeverity(lint.level),
        category,
        detail: lint.detail || lint.description || 'Supabase reported an issue that needs review.',
        remediation: lint.remediation || null,
        entity: formatSupabaseAdvisorEntity(lint),
      };
    })
    .sort((a, b) => {
      const weight = { critical: 0, warning: 1, healthy: 2 } as const;
      if (weight[a.severity] !== weight[b.severity]) {
        return weight[a.severity] - weight[b.severity];
      }
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.title.localeCompare(b.title);
    });

  const securityCount = findings.filter((item) => item.category === 'security').length;
  const performanceCount = findings.filter((item) => item.category === 'performance').length;
  const criticalCount = findings.filter((item) => item.severity === 'critical').length;
  const warningCount = findings.filter((item) => item.severity === 'warning').length;
  const openCount = findings.filter((item) => item.severity !== 'healthy').length;

  return {
    connected: true,
    detail:
      openCount > 0
        ? `${formatNumber(openCount)} active Supabase advisor finding${openCount === 1 ? '' : 's'} need review.`
        : 'Supabase advisors are connected and not currently reporting an active finding.',
    summaryCards: [
      {
        key: 'supabase-open-findings',
        label: 'Open Findings',
        value: openCount,
        displayValue: formatNumber(openCount),
        status: criticalCount > 0 ? 'critical' : openCount > 0 ? 'warning' : 'healthy',
        detail:
          openCount > 0
            ? 'Current Supabase security and performance advisories still need review.'
            : 'No active Supabase advisor findings are currently open.',
      },
      {
        key: 'supabase-security-findings',
        label: 'Security Findings',
        value: securityCount,
        displayValue: formatNumber(securityCount),
        status: criticalCount > 0 && securityCount > 0 ? 'critical' : securityCount > 0 ? 'warning' : 'healthy',
        detail:
          securityCount > 0
            ? 'Supabase security advisors are surfacing database hardening items.'
            : 'No active Supabase security findings are open right now.',
      },
      {
        key: 'supabase-performance-findings',
        label: 'Performance Findings',
        value: performanceCount,
        displayValue: formatNumber(performanceCount),
        status: performanceCount > 0 ? 'warning' : 'healthy',
        detail:
          performanceCount > 0
            ? 'Supabase performance advisors are surfacing index or policy efficiency items.'
            : 'No active Supabase performance findings are open right now.',
      },
      {
        key: 'supabase-critical-findings',
        label: 'Critical Findings',
        value: criticalCount,
        displayValue: formatNumber(criticalCount),
        status: criticalCount > 0 ? 'critical' : warningCount > 0 ? 'warning' : 'healthy',
        detail:
          criticalCount > 0
            ? 'At least one Supabase advisor finding is marked high severity.'
            : warningCount > 0
              ? 'Open findings are currently warning-level only.'
              : 'No critical Supabase advisor findings are open.',
      },
    ],
    findings: findings.filter((item) => item.severity !== 'healthy').slice(0, 8),
    diagnostics: {
      tokenConfigured: true,
      projectRefConfigured: true,
      status: 'live',
      errorMessage: null,
      hint: null,
    },
  };
}

async function runUptimeCheck(target: UptimeCheckTarget, baseUrl: string): Promise<UptimeCheck> {
  const url = `${baseUrl}${target.path}`;
  const startedAt = Date.now();

  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      redirect: 'manual',
      headers: MONITORING_BROWSER_HEADERS,
    });

    const responseTimeMs = Date.now() - startedAt;
    const redirectLocation = response.headers.get('location');
    const isExpectedRedirect =
      Boolean(target.expectedRedirectTo) &&
      [301, 302, 303, 307, 308].includes(response.status) &&
      Boolean(redirectLocation?.includes(target.expectedRedirectTo!));
    const isAcceptedStatus = response.ok || Boolean(target.acceptedStatuses?.includes(response.status));
    const ok = isAcceptedStatus || isExpectedRedirect;

    return {
      key: target.key,
      label: target.label,
      url,
      ok,
      statusCode: response.status,
      responseTimeMs,
      detail: isExpectedRedirect
        ? `${target.label} redirected to ${target.expectedRedirectTo} as expected for a protected route.`
        : ok
          ? `${target.label} responded normally.`
          : `${target.label} responded with HTTP ${response.status}.`,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      key: target.key,
      label: target.label,
      url,
      ok: false,
      statusCode: null,
      responseTimeMs: null,
      detail: getErrorMessage(error, `${target.label} could not be reached.`),
      checkedAt: new Date().toISOString(),
    };
  }
}

function getUptimeLatencyStatus(responseTimeMs: number | null): 'healthy' | 'warning' | 'critical' {
  if (responseTimeMs == null || !Number.isFinite(responseTimeMs)) return 'critical';
  if (responseTimeMs > 2500) return 'critical';
  if (responseTimeMs > 1200) return 'warning';
  return 'healthy';
}

async function fetchUptimeSummary(request: NextRequest): Promise<UptimeResult> {
  const checkBase = resolveUptimeCheckBaseUrl(request);
  const targets: UptimeCheckTarget[] = [
    { key: 'public-site', label: 'Public Site', path: '/' },
    { key: 'login-page', label: 'Login Page', path: '/login' },
    { key: 'analyze-page', label: 'Analyze Page', path: '/analyze' },
    { key: 'forgot-password', label: 'Forgot Password', path: '/forgot-password' },
    { key: 'reset-access', label: 'Reset Access', path: '/reset-access' },
    { key: 'accept-invite', label: 'Accept Invite', path: '/accept-invite' },
    { key: 'dashboard-gate', label: 'Dashboard Gate', path: '/dashboard', expectedRedirectTo: '/login' },
    { key: 'admin-gate', label: 'Admin Gate', path: '/admin', expectedRedirectTo: '/login' },
    { key: 'auth-api', label: 'Auth API', path: '/api/auth/me', acceptedStatuses: [200, 401] },
  ];

  const rawChecks = await Promise.all(targets.map((target) => runUptimeCheck(target, checkBase)));
  const edgeProtectedChecks = isEdgeProtectedProbeSet(rawChecks);
  const checks = edgeProtectedChecks
    ? rawChecks.map((check) => ({
        ...check,
        ok: true,
        detail:
          check.key === 'auth-api'
            ? `${check.label} responded through an edge-protected host and is still reachable.`
            : `${check.label} is being blocked by edge/deployment protection for this server-side probe, but the host is reachable.`,
      }))
    : rawChecks;

  const passingChecks = checks.filter((check) => check.ok);
  const averageResponseMs = passingChecks.length
    ? roundTo(passingChecks.reduce((sum, check) => sum + (check.responseTimeMs || 0), 0) / passingChecks.length, 0)
    : null;
  const failingChecks = checks.length - passingChecks.length;
  const allHealthy = failingChecks === 0;
  const availabilityStatus: 'healthy' | 'warning' | 'critical' =
    failingChecks === 0 ? 'healthy' : passingChecks.length > 0 ? 'warning' : 'critical';

  return {
    summaryCards: [
      {
        key: 'uptime-availability',
        label: 'Checks Passing',
        value: passingChecks.length,
        displayValue: `${passingChecks.length}/${checks.length}`,
        status: edgeProtectedChecks ? 'warning' : availabilityStatus,
        statusLabel: edgeProtectedChecks ? 'Protected' : availabilityStatus === 'healthy' ? 'Healthy' : availabilityStatus === 'warning' ? 'Reachable' : 'Down',
        detail: edgeProtectedChecks
          ? 'The current host is protected from server-side uptime probes, so these checks are being treated as reachable instead of down.'
          : allHealthy
          ? 'All uptime probes are returning healthy responses right now.'
          : `${failingChecks} uptime ${failingChecks === 1 ? 'check is' : 'checks are'} failing in the latest pass.`,
      },
      {
        key: 'uptime-average-response',
        label: 'Average Response',
        value: averageResponseMs,
        displayValue: formatDurationMs(averageResponseMs),
        status: getUptimeLatencyStatus(averageResponseMs),
        statusLabel:
          getUptimeLatencyStatus(averageResponseMs) === 'healthy'
            ? 'Healthy'
            : getUptimeLatencyStatus(averageResponseMs) === 'warning'
              ? 'Slow'
              : 'Down',
        detail:
          averageResponseMs != null
            ? `Average response time across successful uptime checks in the latest pass.`
            : 'No successful uptime checks were available to average.',
      },
    ],
    checks,
  };
}

async function fetchSentryHealth(): Promise<SentryResult> {
  const config = getSentryConfig();

  if (!config.tokenConfigured || !config.orgConfigured || !config.authToken || !config.orgSlug) {
    return {
      connected: false,
      detail: buildSentryMissingConfigDetail(),
      summaryCards: buildEmptySentryCards(),
      recentIssues: [],
      crashFreeSessionsPercent: null,
      diagnostics: {
        tokenConfigured: config.tokenConfigured,
        orgConfigured: config.orgConfigured,
        projectConfigured: config.projectConfigured,
        status: 'missing_config',
        errorMessage: null,
        hint: 'Add SENTRY_AUTH_TOKEN and SENTRY_ORG to the deployment. Add SENTRY_PROJECT to scope to a single project if you want.',
      },
    };
  }

  const sentryFetch = async (path: string, searchParams?: URLSearchParams) => {
    const url = new URL(`https://sentry.io/api/0${path}`);
    if (searchParams) {
      url.search = searchParams.toString();
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.authToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Sentry request failed (${response.status}) for ${path}.`);
    }

    return response.json();
  };

  const projects = (await sentryFetch(`/organizations/${config.orgSlug}/projects/`)) as SentryProject[];
  const selectedProjects = config.projectSlug
    ? projects.filter((project) => project.slug === config.projectSlug || project.name === config.projectSlug)
    : projects;

  if (!selectedProjects.length) {
    throw new Error('Sentry project not found for the configured organization.');
  }

  const projectIds = selectedProjects.map((project) => Number(project.id)).filter((value) => Number.isFinite(value));
  const issueParams = new URLSearchParams();
  issueParams.set('statsPeriod', '14d');
  issueParams.set('limit', '5');
  issueParams.set('sort', 'freq');
  for (const projectId of projectIds) {
    issueParams.append('project', String(projectId));
  }

  const unresolvedParams = new URLSearchParams(issueParams);
  unresolvedParams.set('query', 'is:unresolved');
  const regressedParams = new URLSearchParams(issueParams);
  regressedParams.set('query', 'is:regressed');

  const errors24hParams = new URLSearchParams({
    field: 'sum(quantity)',
    statsPeriod: '24h',
    interval: '1h',
    category: 'error',
    groupBy: 'outcome',
  });
  const errors14dParams = new URLSearchParams({
    field: 'sum(quantity)',
    statsPeriod: '14d',
    interval: '1d',
    category: 'error',
    groupBy: 'outcome',
  });
  const sessions24hParams = new URLSearchParams({
    statsPeriod: '24h',
    interval: '24h',
    groupBy: 'project',
  });
  sessions24hParams.append('field', 'sum(session)');
  sessions24hParams.append('field', 'sum(session.crashed)');
  for (const projectId of projectIds) {
    sessions24hParams.append('project', String(projectId));
  }

  const [unresolvedIssuesRaw, regressedIssuesRaw, errors24h, errors14d, sessions24h] = await Promise.all([
    sentryFetch(`/organizations/${config.orgSlug}/issues/`, unresolvedParams),
    sentryFetch(`/organizations/${config.orgSlug}/issues/`, regressedParams),
    sentryFetch(`/organizations/${config.orgSlug}/stats_v2/`, errors24hParams),
    sentryFetch(`/organizations/${config.orgSlug}/stats_v2/`, errors14dParams),
    sentryFetch(`/organizations/${config.orgSlug}/stats_v2/`, sessions24hParams).catch(() => null),
  ]);

  const unresolvedIssues = Array.isArray(unresolvedIssuesRaw)
    ? (unresolvedIssuesRaw as SentryIssueLike[]).filter((issue) => !isNoiseSentryIssue(issue) && isRecentlySeenSentryIssue(issue))
    : [];
  const regressedIssues = Array.isArray(regressedIssuesRaw)
    ? (regressedIssuesRaw as SentryIssueLike[]).filter((issue) => !isNoiseSentryIssue(issue) && isRecentlySeenSentryIssue(issue))
    : [];

  const sumSentryOutcome = (payload: StatsPayload | null | undefined, outcome: string) =>
    roundTo(
      Number(
        (payload?.groups || [])
          .filter((group) => group?.by?.outcome === outcome)
          .reduce((sum: number, group) => sum + Number(group?.totals?.['sum(quantity)'] || 0), 0)
      ),
      0
    );

  const accepted24h = sumSentryOutcome(errors24h, 'accepted');
  const dropped24h =
    sumSentryOutcome(errors24h, 'filtered') +
    sumSentryOutcome(errors24h, 'rate_limited') +
    sumSentryOutcome(errors24h, 'invalid') +
    sumSentryOutcome(errors24h, 'abuse') +
    sumSentryOutcome(errors24h, 'client_discard') +
    sumSentryOutcome(errors24h, 'cardinality_limited');
  const accepted14d = sumSentryOutcome(errors14d, 'accepted');
  const totalSessions24h = sessions24h ? getTotalFromStatsGroups(sessions24h, 'sum(session)') : 0;
  const crashedSessions24h = sessions24h ? getTotalFromStatsGroups(sessions24h, 'sum(session.crashed)') : 0;
  const crashFreeSessionsPercent =
    totalSessions24h > 0 ? roundTo(((totalSessions24h - crashedSessions24h) / totalSessions24h) * 100, 1) : null;

  const recentIssues: SentryIssueRow[] = unresolvedIssues.map((issue) => ({
    id: String(issue?.id || ''),
    title: issue?.title || issue?.metadata?.title || 'Issue',
    culprit: issue?.culprit || issue?.metadata?.value || null,
    level: issue?.level || null,
    count: Number(issue?.count || 0),
    userCount: Number(issue?.userCount || 0),
    status: issue?.status || null,
    lastSeen: issue?.lastSeen || null,
    permalink: issue?.permalink || null,
  }));

  const unresolvedCount = unresolvedIssues.length;
  const regressedCount = regressedIssues.length;

  return {
    connected: true,
    detail: config.projectSlug
      ? `Sentry issue health is connected for ${config.projectSlug}.`
      : 'Sentry issue health is connected for the configured organization.',
    summaryCards: [
      {
        key: 'errors-24h',
        label: 'Errors (24h)',
        value: accepted24h,
        displayValue: formatNumber(accepted24h),
        status: accepted24h > 25 ? 'warning' : 'healthy',
        detail: 'Accepted Sentry error events in the last 24 hours.',
      },
      {
        key: 'errors-14d',
        label: 'Errors (14d)',
        value: accepted14d,
        displayValue: formatNumber(accepted14d),
        status: accepted14d > 100 ? 'warning' : 'healthy',
        detail: 'Accepted Sentry error events in the last 14 days.',
      },
      {
        key: 'unresolved-issues',
        label: 'Unresolved Issues',
        value: unresolvedCount,
        displayValue: formatNumber(unresolvedCount),
        status: unresolvedCount > 0 ? 'warning' : 'healthy',
        detail: 'Open unresolved Sentry issues seen in the last 24 hours.',
      },
      {
        key: 'regressed-issues',
        label: 'Regressed Issues',
        value: regressedCount,
        displayValue: formatNumber(regressedCount),
        status: regressedCount > 0 ? 'critical' : 'healthy',
        detail: 'Regressed Sentry issues seen in the last 24 hours.',
      },
      {
        key: 'dropped-events-24h',
        label: 'Dropped Events',
        value: dropped24h,
        displayValue: formatNumber(dropped24h),
        status: dropped24h > 25 ? 'warning' : 'healthy',
        detail: 'Filtered, rate-limited, or invalid events in the last 24 hours.',
      },
      {
        key: 'crash-free-sessions',
        label: 'Crash-Free Sessions',
        value: crashFreeSessionsPercent,
        displayValue: crashFreeSessionsPercent != null ? `${formatNumber(crashFreeSessionsPercent)}%` : 'Scoped',
        status:
          crashFreeSessionsPercent == null
            ? 'healthy'
            : crashFreeSessionsPercent >= 99
              ? 'healthy'
              : crashFreeSessionsPercent >= 97
                ? 'warning'
                : 'critical',
        detail:
          crashFreeSessionsPercent != null
            ? 'Tracked sessions without crashes in the last 24 hours.'
            : `Session health is unavailable from Sentry, so this view is scoped to ${formatNumber(selectedProjects.length)} monitored project(s).`,
      },
    ],
    recentIssues,
    crashFreeSessionsPercent,
    diagnostics: {
      tokenConfigured: true,
      orgConfigured: true,
      projectConfigured: config.projectConfigured,
      status: 'live',
      errorMessage: null,
      hint: null,
    },
  };
}

function buildMonitoringAlerts(args: {
  cloudflareTraffic: CloudflareTrafficResult;
  sentryHealth: SentryResult;
  supabaseAdvisors: SupabaseAdvisorResult;
  uptime: UptimeResult;
}) {
  const alerts: MonitoringAlert[] = [];

  const uptimeFailures = args.uptime.checks.filter((check) => !check.ok);
  for (const check of uptimeFailures) {
    alerts.push({
      key: `uptime-${check.key}`,
      severity: 'critical',
      title: `${check.label} is down`,
      detail: check.detail,
      source: 'Uptime',
    });
  }

  const uptimeSlow = args.uptime.checks.filter((check) => check.ok && (check.responseTimeMs || 0) > 1500);
  for (const check of uptimeSlow) {
    alerts.push({
      key: `latency-${check.key}`,
      severity: 'warning',
      title: `${check.label} is slow`,
      detail: `${check.label} responded in ${formatDurationMs(check.responseTimeMs)}.`,
      source: 'Uptime',
    });
  }

  if (args.cloudflareTraffic.connected) {
    const cacheRatioCard = args.cloudflareTraffic.summaryCards.find((card) => card.key === 'cache-hit-ratio');
    const cachedBandwidthCard = args.cloudflareTraffic.summaryCards.find((card) => card.key === 'cached-bandwidth-ratio');
    const threatsCard = args.cloudflareTraffic.summaryCards.find((card) => card.key === 'threats-blocked');
    const unexpectedClientErrorsCard = args.cloudflareTraffic.summaryCards.find((card) => card.key === 'unexpected-client-errors');
    const serverErrorsCard = args.cloudflareTraffic.summaryCards.find((card) => card.key === 'server-errors');
    const top4xxRoute = args.cloudflareTraffic.topErrorRoutes.find((route) => route.key === 'top-unexpected-4xx-route');
    const top5xxRoute = args.cloudflareTraffic.topErrorRoutes.find((route) => route.key === 'top-5xx-route');
    const requests = args.cloudflareTraffic.requestSeries.map((point) => point.requests || 0);

    if ((cacheRatioCard?.value || 0) < 3 && (cachedBandwidthCard?.value || 0) < 20) {
      alerts.push({
        key: 'cache-ratio',
        severity: 'warning',
        title: 'Cache efficiency is low',
        detail: `Cloudflare cache hit ratio is ${cacheRatioCard?.displayValue || 'low'} for the selected window.`,
        source: 'Cloudflare',
      });
    }

    const threatCount = threatsCard?.value || 0;
    const hasCorrelatedEdgeStress =
      (serverErrorsCard?.value || 0) >= 5 || (unexpectedClientErrorsCard?.value || 0) >= 100;

    if (threatCount >= 250 || (threatCount >= 100 && hasCorrelatedEdgeStress)) {
      alerts.push({
        key: 'threats-blocked',
        severity: threatCount >= 250 ? 'critical' : 'warning',
        title: 'Threat traffic detected',
        detail: hasCorrelatedEdgeStress
          ? `${threatsCard?.displayValue || '0'} threats were blocked in the selected window alongside elevated 4xx/5xx activity.`
          : `${threatsCard?.displayValue || '0'} threats were blocked in the selected window.`,
        source: 'Cloudflare',
      });
    }

    if ((unexpectedClientErrorsCard?.value || 0) >= 100 && (top4xxRoute?.requests || 0) >= 50) {
      alerts.push({
        key: 'client-errors',
        severity: 'warning',
        title: 'Unexpected 4xx responses are elevated',
        detail: `${unexpectedClientErrorsCard?.displayValue || '0'} unexpected 4xx responses were reported in the selected window.`,
        source: 'Cloudflare',
      });
    }

    if ((serverErrorsCard?.value || 0) >= 5 && (top5xxRoute?.requests || 0) >= 3) {
      alerts.push({
        key: 'server-errors',
        severity: (serverErrorsCard?.value || 0) >= 10 ? 'critical' : 'warning',
        title: 'Server-side 5xx responses were detected',
        detail: `${serverErrorsCard?.displayValue || '0'} 5xx responses were reported in the selected window.`,
        source: 'Cloudflare',
      });
    }

    if (hasMaterialTrafficDrop(requests)) {
      alerts.push({
        key: 'traffic-drop',
        severity: 'warning',
        title: 'Traffic dropped below recent baseline',
        detail: 'Latest request volume is materially below the recent baseline for this window.',
        source: 'Cloudflare',
      });
    }
  }

  if (args.sentryHealth.connected) {
    const regressedCard = args.sentryHealth.summaryCards.find((card) => card.key === 'regressed-issues');
    const unresolvedCard = args.sentryHealth.summaryCards.find((card) => card.key === 'unresolved-issues');
    const droppedCard = args.sentryHealth.summaryCards.find((card) => card.key === 'dropped-events-24h');
    const crashFreeCard = args.sentryHealth.summaryCards.find((card) => card.key === 'crash-free-sessions');

    if ((regressedCard?.value || 0) > 0) {
      alerts.push({
        key: 'sentry-regressions',
        severity: 'critical',
        title: 'Sentry regressions need attention',
        detail: `${regressedCard?.displayValue || '0'} regressed issue(s) are currently open.`,
        source: 'Sentry',
      });
    }

    if ((unresolvedCard?.value || 0) > 5) {
      alerts.push({
        key: 'sentry-unresolved',
        severity: 'warning',
        title: 'Open error backlog is growing',
        detail: `${unresolvedCard?.displayValue || '0'} unresolved Sentry issues are in scope.`,
        source: 'Sentry',
      });
    }

    if ((droppedCard?.value || 0) > 25) {
      alerts.push({
        key: 'sentry-dropped',
        severity: 'warning',
        title: 'Some Sentry events are being dropped',
        detail: `${droppedCard?.displayValue || '0'} events were dropped in the last 24 hours.`,
        source: 'Sentry',
      });
    }

    if ((crashFreeCard?.value || 100) < 99) {
      alerts.push({
        key: 'sentry-crash-free',
        severity: (crashFreeCard?.value || 100) < 97 ? 'critical' : 'warning',
        title: 'Crash-free session health slipped',
        detail: `${crashFreeCard?.displayValue || '—'} of tracked sessions were crash-free in the last 24 hours.`,
        source: 'Sentry',
      });
    }
  }

  if (args.supabaseAdvisors.connected) {
    const openFindingsCard = args.supabaseAdvisors.summaryCards.find((card) => card.key === 'supabase-open-findings');
    const criticalFindingsCard = args.supabaseAdvisors.summaryCards.find((card) => card.key === 'supabase-critical-findings');
    const securityFindingsCard = args.supabaseAdvisors.summaryCards.find((card) => card.key === 'supabase-security-findings');

    if ((criticalFindingsCard?.value || 0) > 0) {
      alerts.push({
        key: 'supabase-critical-findings',
        severity: 'critical',
        title: 'Supabase advisor found critical issues',
        detail: `${criticalFindingsCard?.displayValue || '0'} high-severity database finding(s) are still open.`,
        source: 'Supabase',
      });
    } else if ((securityFindingsCard?.value || 0) > 0) {
      alerts.push({
        key: 'supabase-security-findings',
        severity: 'warning',
        title: 'Supabase security findings need review',
        detail: `${securityFindingsCard?.displayValue || '0'} Supabase security advisor finding(s) are still open.`,
        source: 'Supabase',
      });
    } else if ((openFindingsCard?.value || 0) >= 3) {
      alerts.push({
        key: 'supabase-open-findings',
        severity: 'warning',
        title: 'Supabase advisor has open findings',
        detail: `${openFindingsCard?.displayValue || '0'} Supabase advisor finding(s) are currently open.`,
        source: 'Supabase',
      });
    }
  }

  if (!alerts.length) {
    alerts.push({
      key: 'all-clear',
      severity: 'info',
      title: 'No urgent issues in the current monitoring window',
      detail: 'Traffic, uptime, and error signals are not showing a high-priority problem right now.',
      source: 'Platform',
    });
  }

  return alerts.slice(0, 6);
}

function buildTrafficCards(): TrafficSummaryCard[] {
  return [
    {
      key: 'total-requests',
      label: 'Total Requests',
      value: null,
      displayValue: '—',
      status: 'connect_required',
      statusLabel: 'Connect account',
      detail: 'Waiting on Cloudflare traffic analytics.',
    },
    {
      key: 'page-views',
      label: 'Page Views',
      value: null,
      displayValue: '—',
      status: 'connect_required',
      statusLabel: 'Connect account',
      detail: 'Waiting on Cloudflare or web analytics connection.',
    },
    {
      key: 'unique-visitors',
      label: 'Unique Visitors',
      value: null,
      displayValue: '—',
      status: 'connect_required',
      statusLabel: 'Connect account',
      detail: 'Waiting on Cloudflare or web analytics connection.',
    },
    {
      key: 'cache-hit-ratio',
      label: 'Cache Hit Ratio',
      value: null,
      displayValue: '—',
      status: 'connect_required',
      statusLabel: 'Connect account',
      detail: 'Waiting on Cloudflare cache analytics.',
    },
    {
      key: 'threats-blocked',
      label: 'Threats Blocked',
      value: null,
      displayValue: '—',
      status: 'connect_required',
      statusLabel: 'Connect account',
      detail: 'Waiting on Cloudflare security analytics.',
    },
    {
      key: 'expected-client-errors',
      label: 'Expected 4xx',
      value: null,
      displayValue: '—',
      status: 'connect_required',
      statusLabel: 'Connect account',
      detail: 'Waiting on Cloudflare expected client error analytics.',
    },
    {
      key: 'unexpected-client-errors',
      label: 'Unexpected 4xx',
      value: null,
      displayValue: '—',
      status: 'connect_required',
      statusLabel: 'Connect account',
      detail: 'Waiting on Cloudflare unexpected client error analytics.',
    },
    {
      key: 'server-errors',
      label: '5xx Responses',
      value: null,
      displayValue: '—',
      status: 'connect_required',
      statusLabel: 'Connect account',
      detail: 'Waiting on Cloudflare origin error analytics.',
    },
    {
      key: 'bandwidth',
      label: 'Bandwidth',
      value: null,
      displayValue: '—',
      status: 'connect_required',
      statusLabel: 'Connect account',
      detail: 'Waiting on Cloudflare bandwidth analytics.',
    },
    {
      key: 'cached-bandwidth-ratio',
      label: 'Cached Bandwidth',
      value: null,
      displayValue: '—',
      status: 'connect_required',
      statusLabel: 'Connect account',
      detail: 'Waiting on Cloudflare cached bandwidth analytics.',
    },
  ];
}

function getTrendDirection(values: number[]) {
  if (values.length < 3) return 'limited' as const;
  const latest = values[values.length - 1] || 0;
  const prior = values.slice(0, -1);
  const priorAverage = prior.length ? prior.reduce((sum, value) => sum + value, 0) / prior.length : 0;

  if (priorAverage < 10) {
    return latest > 0 ? ('active' as const) : ('quiet' as const);
  }
  if (latest >= priorAverage * 1.3) return 'up' as const;
  if (latest <= priorAverage * 0.7) return 'down' as const;
  return 'steady' as const;
}

function getMedian(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

function hasMaterialTrafficDrop(values: number[]) {
  if (values.length < 5) {
    return false;
  }

  const latest = values[values.length - 1] || 0;
  const prior = values.slice(0, -1).filter((value) => value > 0);

  if (prior.length < 4) {
    return false;
  }

  const priorAverage = prior.reduce((sum, value) => sum + value, 0) / prior.length;
  const priorMedian = getMedian(prior);

  if (priorAverage < 150 || priorMedian < 150) {
    return false;
  }

  return latest < priorAverage * 0.35 && latest < priorMedian * 0.3;
}

function buildEmptySentryCards(): SentryResult['summaryCards'] {
  return [
    {
      key: 'errors-24h',
      label: 'Errors (24h)',
      value: null,
      displayValue: '—',
      status: 'connect_required',
      detail: 'Waiting on Sentry event metrics.',
    },
    {
      key: 'errors-14d',
      label: 'Errors (14d)',
      value: null,
      displayValue: '—',
      status: 'connect_required',
      detail: 'Waiting on Sentry event metrics.',
    },
    {
      key: 'unresolved-issues',
      label: 'Unresolved Issues',
      value: null,
      displayValue: '—',
      status: 'connect_required',
      detail: 'Waiting on Sentry issue metrics.',
    },
    {
      key: 'regressed-issues',
      label: 'Regressed Issues',
      value: null,
      displayValue: '—',
      status: 'connect_required',
      detail: 'Waiting on Sentry issue metrics.',
    },
    {
      key: 'dropped-events-24h',
      label: 'Dropped Events',
      value: null,
      displayValue: '—',
      status: 'connect_required',
      detail: 'Waiting on Sentry outcome metrics.',
    },
    {
      key: 'crash-free-sessions',
      label: 'Crash-Free Sessions',
      value: null,
      displayValue: '—',
      status: 'connect_required',
      detail: 'Waiting on Sentry session health metrics.',
    },
  ];
}

function getSentryConfig() {
  const authToken = process.env.SENTRY_AUTH_TOKEN || process.env.SENTRY_API_TOKEN || null;
  const orgSlug = process.env.SENTRY_ORG || process.env.SENTRY_ORG_SLUG || null;
  const projectSlug = process.env.SENTRY_PROJECT || process.env.SENTRY_PROJECT_SLUG || process.env.NEXT_PUBLIC_SENTRY_PROJECT || null;

  return {
    authToken,
    orgSlug,
    projectSlug,
    tokenConfigured: Boolean(authToken),
    orgConfigured: Boolean(orgSlug),
    projectConfigured: Boolean(projectSlug),
  };
}

function buildSentryMissingConfigDetail() {
  const config = getSentryConfig();
  const missing = [
    ...(!config.tokenConfigured ? ['SENTRY_AUTH_TOKEN'] : []),
    ...(!config.orgConfigured ? ['SENTRY_ORG'] : []),
  ];

  if (!missing.length) {
    return 'Sentry API credentials are configured.';
  }
  if (missing.length === 1) {
    return `Missing ${missing[0]} in the running app environment.`;
  }
  return `Missing ${missing.join(' and ')} in the running app environment.`;
}

function buildSentryErrorHint(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes('(401)') || normalized.includes('unauthorized')) {
    return 'The Sentry auth token may be invalid or attached to a different organization.';
  }
  if (normalized.includes('(403)') || normalized.includes('forbidden')) {
    return 'The Sentry auth token may be missing org:read or event:read scopes.';
  }
  if (normalized.includes('(404)') || normalized.includes('not found')) {
    return 'The SENTRY_ORG or SENTRY_PROJECT value may not match your Sentry workspace.';
  }
  return 'Check the Sentry token scopes, organization slug, and project slug for this deployment.';
}

function isNoiseSentryIssue(issue: SentryIssueLike) {
  const title = String(issue?.title || issue?.metadata?.title || '').toLowerCase();
  const culprit = String(issue?.culprit || issue?.metadata?.value || '').toLowerCase();

  return (
    title.includes('sentryexample') ||
    title.includes('exampleapierror') ||
    culprit.includes('/api/debug-supabase') ||
    culprit.includes('/api/sentry-example') ||
    culprit.includes('/sentry-example-page')
  );
}

function isRecentlySeenSentryIssue(issue: SentryIssueLike, maxAgeHours = 24) {
  const lastSeen = issue?.lastSeen;
  if (!lastSeen) return false;
  const timestamp = new Date(lastSeen).getTime();
  if (!Number.isFinite(timestamp)) return false;
  return Date.now() - timestamp <= maxAgeHours * 60 * 60 * 1000;
}

function formatDurationMs(value: number | null) {
  if (value == null || !Number.isFinite(value)) return '—';
  if (value < 1000) return `${Math.round(value)} ms`;
  return `${roundTo(value / 1000, 2)} s`;
}

function resolveUptimeCheckBaseUrl(request: NextRequest) {
  const requestHostname = request.nextUrl.hostname;
  const isLocalRequest =
    requestHostname === 'localhost' ||
    requestHostname === '127.0.0.1' ||
    requestHostname.endsWith('.local');

  if (isLocalRequest) {
    return normalizeMonitoringBaseUrl(request.nextUrl.origin);
  }

  const configuredPublicSite =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    DEFAULT_PUBLIC_SITE_URL;

  return normalizeMonitoringBaseUrl(configuredPublicSite);
}

function isEdgeProtectedProbeSet(checks: UptimeCheck[]) {
  if (!checks.length) {
    return false;
  }

  const protectedStatuses = new Set([401, 403]);
  const publicCheckKeys = new Set([
    'public-site',
    'login-page',
    'analyze-page',
    'forgot-password',
    'reset-access',
    'accept-invite',
  ]);

  const publicChecks = checks.filter((check) => publicCheckKeys.has(check.key));
  const protectedChecks = checks.filter((check) => protectedStatuses.has(check.statusCode || 0));

  if (!publicChecks.length || protectedChecks.length !== checks.length) {
    return false;
  }

  return publicChecks.every((check) => protectedStatuses.has(check.statusCode || 0));
}

function isExpectedClientErrorRoute(path: string | null) {
  if (!path) {
    return false;
  }

  const normalized = path.toLowerCase();

  return [
    '/api/auth/me',
    '/dashboard',
    '/admin',
    '/login',
    '/favicon.ico',
    '/robots.txt',
    '/_environment',
    '/.env',
    '/wp-admin',
    '/wp-login.php',
    '/xmlrpc.php',
    '/webroot/index.php',
    '/vendor/phpunit',
    '/cgi-bin',
    '/server-status',
    '/.git/',
    '/actuator',
    '/boaform',
  ].some((knownPath) => normalized.includes(knownPath));
}

function normalizeMonitoringBaseUrl(baseUrl: string) {
  try {
    const parsed = new URL(baseUrl);
    if (parsed.hostname === 'alignedu.net') {
      parsed.hostname = 'www.alignedu.net';
    }
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return baseUrl.replace(/\/$/, '');
  }
}

function getCloudflareConfigStatus() {
  const apiTokenConfigured = Boolean(process.env.CLOUDFLARE_API_TOKEN);
  const zoneIdConfigured = Boolean(process.env.CLOUDFLARE_ZONE_ID);

  return {
    apiTokenConfigured,
    zoneIdConfigured,
    missingKeys: [
      ...(!apiTokenConfigured ? ['CLOUDFLARE_API_TOKEN'] : []),
      ...(!zoneIdConfigured ? ['CLOUDFLARE_ZONE_ID'] : []),
    ],
  };
}

function buildCloudflareMissingConfigDetail() {
  const config = getCloudflareConfigStatus();
  if (!config.missingKeys.length) {
    return 'Cloudflare credentials are configured.';
  }
  if (config.missingKeys.length === 1) {
    return `Missing ${config.missingKeys[0]} in the running app environment.`;
  }
  return `Missing ${config.missingKeys.join(' and ')} in the running app environment.`;
}

function buildCloudflareErrorHint(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes('cannot request a time range wider than 1d')) {
    return 'This Cloudflare dataset only supports a 1-day range for route-level lookups, so the monitoring query needs to stay scoped to the latest day.';
  }
  if (normalized.includes('(403)') || normalized.includes('permission') || normalized.includes('forbidden')) {
    return 'The Cloudflare token is present but likely missing zone analytics permissions for this zone.';
  }
  if (normalized.includes('not found') || normalized.includes('zone')) {
    return 'The configured CLOUDFLARE_ZONE_ID may not match the Cloudflare zone for this site.';
  }
  if (normalized.includes('(401)') || normalized.includes('unauthorized')) {
    return 'The Cloudflare token may be invalid, expired, or added to the wrong Vercel environment.';
  }
  return 'Check the Cloudflare token permissions, the zone ID, and whether Vercel has been redeployed after the env vars were added.';
}

function getCloudflareEnv() {
  const config = getCloudflareConfigStatus();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;

  if (!config.apiTokenConfigured || !config.zoneIdConfigured || !apiToken || !zoneId) {
    return null;
  }

  return { apiToken, zoneId };
}

async function fetchCloudflareTraffic(windowKeys: string[]): Promise<CloudflareTrafficResult> {
  const env = getCloudflareEnv();
  const emptyRequestSeries = buildEmptyTrafficSeries(windowKeys);
  const emptyBandwidthSeries = buildEmptyTrafficSeries(windowKeys);

  if (!env) {
    const config = getCloudflareConfigStatus();
    return {
      connected: false,
      detail: buildCloudflareMissingConfigDetail(),
      summaryCards: buildTrafficCards(),
      topErrorRoutes: [],
      requestSeries: emptyRequestSeries,
      bandwidthSeries: emptyBandwidthSeries,
      diagnostics: {
        apiTokenConfigured: config.apiTokenConfigured,
        zoneIdConfigured: config.zoneIdConfigured,
        status: 'missing_config',
        errorMessage: null,
        hint: 'Add the missing Cloudflare env vars to the Vercel environment used by this deployment, then redeploy.',
      },
    };
  }

  const startDate = windowKeys[0];
  const latestDayKey = windowKeys[windowKeys.length - 1];
  const endDate = new Date(`${windowKeys[windowKeys.length - 1]}T12:00:00Z`);
  endDate.setUTCDate(endDate.getUTCDate() + 1);
  const endDateKey = endDate.toISOString().slice(0, 10);

  const query = `
    query MonitoringTraffic($zoneTag: string!, $startDate: Date!, $endDate: Date!) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          totals: httpRequests1dGroups(
            limit: 1
            filter: { date_geq: $startDate, date_lt: $endDate }
          ) {
            uniq {
              uniques
            }
            sum {
              requests
              pageViews
              bytes
              cachedBytes
              cachedRequests
              threats
              responseStatusMap {
                edgeResponseStatus
                requests
              }
            }
          }
          series: httpRequests1dGroups(
            limit: 100
            orderBy: [date_ASC]
            filter: { date_geq: $startDate, date_lt: $endDate }
          ) {
            dimensions {
              date
            }
            uniq {
              uniques
            }
            sum {
              requests
              pageViews
              bytes
              cachedBytes
              cachedRequests
              threats
              responseStatusMap {
                edgeResponseStatus
                requests
              }
            }
          }
          top4xxPaths: httpRequestsAdaptiveGroups(
            limit: 20
            orderBy: [count_DESC]
            filter: { datetime_geq: "${latestDayKey}T00:00:00Z", datetime_lt: "${endDateKey}T00:00:00Z", requestSource: "eyeball", edgeResponseStatus_geq: 400, edgeResponseStatus_lt: 500 }
          ) {
            count
            dimensions {
              clientRequestPath
              clientRequestHTTPHost
            }
          }
          top5xxPaths: httpRequestsAdaptiveGroups(
            limit: 3
            orderBy: [count_DESC]
            filter: { datetime_geq: "${latestDayKey}T00:00:00Z", datetime_lt: "${endDateKey}T00:00:00Z", requestSource: "eyeball", edgeResponseStatus_geq: 500, edgeResponseStatus_lt: 600 }
          ) {
            count
            dimensions {
              clientRequestPath
              clientRequestHTTPHost
            }
          }
        }
      }
    }
  `;

  const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.apiToken}`,
    },
    body: JSON.stringify({
      query,
      variables: {
        zoneTag: env.zoneId,
        startDate,
        endDate: endDateKey,
      },
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Cloudflare analytics request failed (${response.status}).`);
  }

  const payload = await response.json();
  if (payload.errors?.length) {
    const message = payload.errors[0]?.message || 'Cloudflare analytics request failed.';
    throw new Error(message);
  }

  const zone = payload?.data?.viewer?.zones?.[0];
  if (!zone) {
    throw new Error('Cloudflare zone analytics not found for the configured zone.');
  }

  const formatRoutePath = (entry: CloudflareRouteEntry) => {
    const host = entry?.dimensions?.clientRequestHTTPHost || null;
    const path = entry?.dimensions?.clientRequestPath || null;
    if (!path) return host || null;
    return host ? `https://${host}${path}` : path;
  };

  const totalBucket = zone.totals?.[0];
  const sumResponseStatusMap = (statusMap: CloudflareRouteEntry[] | null | undefined, minStatus: number, maxStatus: number) =>
    Number(
      (statusMap || []).reduce((sum: number, entry) => {
        const statusCode = Number(entry?.edgeResponseStatus || 0);
        if (statusCode < minStatus || statusCode > maxStatus) return sum;
        return sum + Number(entry?.requests || 0);
      }, 0)
    );
  const totalsFromBucket: CloudflareTotals = {
    requests: Number(totalBucket?.sum?.requests || 0),
    pageViews: Number(totalBucket?.sum?.pageViews || 0),
    uniques: Number(totalBucket?.uniq?.uniques || 0),
    bytes: Number(totalBucket?.sum?.bytes || 0),
    cachedBytes: Number(totalBucket?.sum?.cachedBytes || 0),
    cachedRequests: Number(totalBucket?.sum?.cachedRequests || 0),
    threats: Number(totalBucket?.sum?.threats || 0),
    clientErrors: sumResponseStatusMap(totalBucket?.sum?.responseStatusMap, 400, 499),
    serverErrors: sumResponseStatusMap(totalBucket?.sum?.responseStatusMap, 500, 599),
  };

  const dailyByDate = new Map<string, CloudflareDailyPoint>();
  for (const key of windowKeys) {
    dailyByDate.set(key, {
      date: key,
      requests: 0,
      pageViews: 0,
      uniques: 0,
      bytes: 0,
      cachedBytes: 0,
      cachedRequests: 0,
      threats: 0,
      clientErrors: 0,
      serverErrors: 0,
    });
  }

  for (const point of zone.series || []) {
    const key = point?.dimensions?.date;
    if (!key || !dailyByDate.has(key)) continue;
    dailyByDate.set(key, {
      date: key,
      requests: Number(point?.sum?.requests || 0),
      pageViews: Number(point?.sum?.pageViews || 0),
      uniques: Number(point?.uniq?.uniques || 0),
      bytes: Number(point?.sum?.bytes || 0),
      cachedBytes: Number(point?.sum?.cachedBytes || 0),
      cachedRequests: Number(point?.sum?.cachedRequests || 0),
      threats: Number(point?.sum?.threats || 0),
      clientErrors: sumResponseStatusMap(point?.sum?.responseStatusMap, 400, 499),
      serverErrors: sumResponseStatusMap(point?.sum?.responseStatusMap, 500, 599),
    });
  }

  const dailyPoints = windowKeys.map((key) => dailyByDate.get(key)!);
  const totalsFromSeries = dailyPoints.reduce<CloudflareTotals>(
    (accumulator, point) => ({
      requests: accumulator.requests + point.requests,
      pageViews: accumulator.pageViews + point.pageViews,
      uniques: accumulator.uniques + point.uniques,
      bytes: accumulator.bytes + point.bytes,
      cachedBytes: accumulator.cachedBytes + point.cachedBytes,
      cachedRequests: accumulator.cachedRequests + point.cachedRequests,
      threats: accumulator.threats + point.threats,
      clientErrors: accumulator.clientErrors + point.clientErrors,
      serverErrors: accumulator.serverErrors + point.serverErrors,
    }),
    {
      requests: 0,
      pageViews: 0,
      uniques: 0,
      bytes: 0,
      cachedBytes: 0,
      cachedRequests: 0,
      threats: 0,
      clientErrors: 0,
      serverErrors: 0,
    }
  );

  // Cloudflare's limited totals bucket can come back as a single day for some responses,
  // so prefer the larger window-wide value derived from the daily series.
  const totals: CloudflareTotals = {
    requests: Math.max(totalsFromBucket.requests, totalsFromSeries.requests),
    pageViews: Math.max(totalsFromBucket.pageViews, totalsFromSeries.pageViews),
    uniques: Math.max(totalsFromBucket.uniques, ...dailyPoints.map((point) => point.uniques)),
    bytes: Math.max(totalsFromBucket.bytes, totalsFromSeries.bytes),
    cachedBytes: Math.max(totalsFromBucket.cachedBytes, totalsFromSeries.cachedBytes),
    cachedRequests: Math.max(totalsFromBucket.cachedRequests, totalsFromSeries.cachedRequests),
    threats: Math.max(totalsFromBucket.threats, totalsFromSeries.threats),
    clientErrors: Math.max(totalsFromBucket.clientErrors, totalsFromSeries.clientErrors),
    serverErrors: Math.max(totalsFromBucket.serverErrors, totalsFromSeries.serverErrors),
  };

  const cacheHitRatio = totals.requests > 0 ? roundTo((totals.cachedRequests / totals.requests) * 100, 1) : 0;
  const totalBandwidthMb = roundTo(totals.bytes / (1024 * 1024), 1);
  const cachedBandwidthRatio = totals.bytes > 0 ? roundTo((totals.cachedBytes / totals.bytes) * 100, 1) : 0;
  const serverErrorRate = totals.requests > 0 ? roundTo((totals.serverErrors / totals.requests) * 100, 1) : 0;
  const top4xxEntries = Array.isArray(zone.top4xxPaths) ? zone.top4xxPaths : [];
  const expected4xxEntries = top4xxEntries.filter((entry: CloudflareRouteEntry) => isExpectedClientErrorRoute(formatRoutePath(entry)));
  const unexpected4xxEntries = top4xxEntries.filter((entry: CloudflareRouteEntry) => !isExpectedClientErrorRoute(formatRoutePath(entry)));
  const expectedClientErrors = expected4xxEntries.reduce((sum: number, entry: CloudflareRouteEntry) => sum + Number(entry?.count || 0), 0);
  const unexpectedClientErrors = Math.max(totals.clientErrors - expectedClientErrors, 0);
  const expectedClientErrorRate = totals.requests > 0 ? roundTo((expectedClientErrors / totals.requests) * 100, 1) : 0;
  const unexpectedClientErrorRate = totals.requests > 0 ? roundTo((unexpectedClientErrors / totals.requests) * 100, 1) : 0;
  const requestSeries = windowKeys.map((key) => {
    const point = dailyByDate.get(key)!;
    const uncachedRequests = Math.max(point.requests - point.cachedRequests, 0);
    return {
      date: key,
      label: formatCompactDate(key),
      requests: point.requests,
      cached: point.cachedRequests,
      uncached: uncachedRequests,
      bandwidthMb: roundTo(point.bytes / (1024 * 1024), 1),
    };
  });

  const bandwidthSeries = requestSeries.map((point) => ({
    ...point,
  }));

  const requestTrend = getTrendDirection(dailyPoints.map((point) => point.requests));
  const pageViewTrend = getTrendDirection(dailyPoints.map((point) => point.pageViews));
  const uniqueTrend = getTrendDirection(dailyPoints.map((point) => point.uniques));
  const bandwidthTrend = getTrendDirection(dailyPoints.map((point) => point.bytes / (1024 * 1024)));
  const requestsStatus =
    totals.requests === 0
      ? { status: 'warning' as const, statusLabel: 'No Traffic', detail: 'No Cloudflare requests were recorded in the selected window.' }
      : requestTrend === 'down' && totals.requests >= 100
        ? { status: 'warning' as const, statusLabel: 'Below Baseline', detail: 'Request volume is lower than the recent daily baseline for this window.' }
        : requestTrend === 'up'
          ? { status: 'healthy' as const, statusLabel: 'Above Baseline', detail: 'Request volume is running above the recent daily baseline for this window.' }
          : requestTrend === 'quiet'
            ? { status: 'healthy' as const, statusLabel: 'Light Traffic', detail: 'This is a light-traffic window, so request trend signals are limited.' }
            : { status: 'healthy' as const, statusLabel: 'On Track', detail: 'Request volume is in line with the recent daily baseline for this window.' };
  const pageViewsStatus =
    totals.pageViews === 0
      ? { status: 'warning' as const, statusLabel: 'No Page Views', detail: 'No successful HTML page views were reported in the selected window.' }
      : pageViewTrend === 'up'
        ? { status: 'healthy' as const, statusLabel: 'More Viewing', detail: 'HTML page views are up versus the recent daily baseline.' }
        : pageViewTrend === 'down' && totals.pageViews >= 20
          ? { status: 'warning' as const, statusLabel: 'Views Down', detail: 'HTML page views are below the recent daily baseline for this window.' }
          : { status: 'healthy' as const, statusLabel: 'Steady', detail: 'Successful HTML page views are stable for the selected window.' };
  const uniquesStatus =
    totals.uniques === 0
      ? { status: 'warning' as const, statusLabel: 'No Visitors', detail: 'No unique visitors were reported in the selected window.' }
      : uniqueTrend === 'up'
        ? { status: 'healthy' as const, statusLabel: 'More Visitors', detail: 'Unique visitors are running above the recent daily baseline.' }
        : uniqueTrend === 'down' && totals.uniques >= 20
          ? { status: 'warning' as const, statusLabel: 'Visitors Down', detail: 'Unique visitors are below the recent daily baseline for this window.' }
          : { status: 'healthy' as const, statusLabel: 'Steady', detail: 'Unique visitor volume is steady for the selected window.' };
  const cacheStatus =
    cacheHitRatio >= 40
      ? { status: 'healthy' as const, statusLabel: 'Cache Healthy', detail: 'A solid share of requests is being served from Cloudflare cache.' }
      : cacheHitRatio >= 20
        ? { status: 'warning' as const, statusLabel: 'Needs Work', detail: 'Some requests are being cached, but there is room to improve edge hit rate.' }
        : { status: 'warning' as const, statusLabel: 'Low Cache', detail: 'Only a small share of requests is being served from Cloudflare cache.' };
  const threatsStatus =
    totals.threats >= 50
      ? { status: 'critical' as const, statusLabel: 'Threats Blocked at Edge', detail: 'Cloudflare is blocking a high level of threat traffic in this window.' }
      : totals.threats >= 10
        ? { status: 'warning' as const, statusLabel: 'Threats Blocked at Edge', detail: 'Cloudflare is blocking repeated threat traffic in this window.' }
        : totals.threats > 0
          ? { status: 'healthy' as const, statusLabel: 'Blocked at Edge', detail: 'Cloudflare blocked a small number of threat requests in this window.' }
          : { status: 'healthy' as const, statusLabel: 'No Threats', detail: 'No blocked threats were reported in the selected window.' };
  const expectedClientErrorsStatus =
    expectedClientErrors === 0
      ? { status: 'healthy' as const, statusLabel: 'None', detail: 'No expected or scanner-driven 4xx responses were reported in the selected window.' }
      : { status: 'healthy' as const, statusLabel: 'Expected', detail: `${formatNumber(expectedClientErrors)} expected or scanner-driven 4xx responses were reported (${formatNumber(expectedClientErrorRate)}% of requests).` };
  const unexpectedClientErrorsStatus =
    unexpectedClientErrors === 0
      ? { status: 'healthy' as const, statusLabel: 'Clean', detail: 'No unexpected client-side 4xx responses were reported in the selected window.' }
      : unexpectedClientErrorRate >= 5
        ? { status: 'warning' as const, statusLabel: 'High 4xx', detail: `Unexpected client-side 4xx responses are ${formatNumber(unexpectedClientErrorRate)}% of requests in this window.` }
        : { status: 'warning' as const, statusLabel: 'Some 4xx', detail: `A small number of unexpected 4xx responses were reported (${formatNumber(unexpectedClientErrorRate)}% of requests).` };
  const serverErrorsStatus =
    totals.serverErrors === 0
      ? { status: 'healthy' as const, statusLabel: 'No 5xx', detail: 'No server-side 5xx responses were reported in the selected window.' }
      : serverErrorRate >= 1 || totals.serverErrors >= 10
        ? { status: 'critical' as const, statusLabel: 'Origin Errors', detail: `Server-side 5xx responses are ${formatNumber(serverErrorRate)}% of requests in this window.` }
        : { status: 'warning' as const, statusLabel: 'Some 5xx', detail: `A small number of server-side 5xx responses were reported (${formatNumber(serverErrorRate)}% of requests).` };
  const bandwidthStatus =
    totalBandwidthMb === 0
      ? { status: 'healthy' as const, statusLabel: 'Quiet Window', detail: 'No meaningful response bandwidth was recorded in the selected window.' }
      : bandwidthTrend === 'up'
        ? { status: 'healthy' as const, statusLabel: 'Higher Load', detail: 'Served bandwidth is running above the recent daily baseline.' }
        : bandwidthTrend === 'down' && totalBandwidthMb >= 5
          ? { status: 'warning' as const, statusLabel: 'Load Down', detail: 'Served bandwidth is below the recent daily baseline for this window.' }
          : { status: 'healthy' as const, statusLabel: 'Stable Load', detail: 'Served bandwidth is steady for the selected window.' };
  const cachedBandwidthStatus =
    cachedBandwidthRatio >= 50
      ? { status: 'healthy' as const, statusLabel: 'Edge Efficient', detail: 'A strong share of response bytes is being delivered from Cloudflare cache.' }
      : cachedBandwidthRatio >= 30
        ? { status: 'healthy' as const, statusLabel: 'Moderate Cache', detail: 'A meaningful share of response bytes is being delivered from the edge cache.' }
        : { status: 'warning' as const, statusLabel: 'Low Edge Cache', detail: 'Only a limited share of response bytes is being served from Cloudflare cache.' };
  const topExpected4xxRoute = expected4xxEntries[0] || null;
  const topUnexpected4xxRoute = unexpected4xxEntries[0] || null;
  const top5xxRoute = Array.isArray(zone.top5xxPaths) ? zone.top5xxPaths[0] : null;
  const topExpected4xxRouteRequests = Number(topExpected4xxRoute?.count || 0);
  const topUnexpected4xxRouteRequests = Number(topUnexpected4xxRoute?.count || 0);
  const top5xxRouteRequests = Number(top5xxRoute?.count || 0);
  const topErrorRoutes = [
    {
      key: 'top-expected-4xx-route',
      label: 'Top Expected/Noisy 4xx Route',
      path: formatRoutePath(topExpected4xxRoute),
      requests: topExpected4xxRouteRequests,
      status: 'healthy' as const,
      detail:
        topExpected4xxRouteRequests > 0
          ? `${formatNumber(topExpected4xxRouteRequests)} expected or scanner-driven 4xx responses were reported on this route in the latest day.`
          : 'No notable expected or scanner-driven 4xx route was reported in the latest day.',
    },
    {
      key: 'top-unexpected-4xx-route',
      label: 'Top Unexpected 4xx Route',
      path: formatRoutePath(topUnexpected4xxRoute),
      requests: topUnexpected4xxRouteRequests,
      status: topUnexpected4xxRouteRequests >= 3 ? ('warning' as const) : ('healthy' as const),
      detail:
        topUnexpected4xxRouteRequests >= 3
          ? `${formatNumber(topUnexpected4xxRouteRequests)} unexpected 4xx responses were reported on this route in the latest day.`
          : topUnexpected4xxRouteRequests > 0
            ? `${formatNumber(topUnexpected4xxRouteRequests)} low-volume unexpected 4xx responses were reported on this route in the latest day.`
            : 'No notable unexpected 4xx route was reported in the latest day.',
    },
    {
      key: 'top-5xx-route',
      label: 'Top 5xx Route',
      path: formatRoutePath(top5xxRoute),
      requests: top5xxRouteRequests,
      status:
        top5xxRouteRequests >= 10
          ? ('critical' as const)
          : top5xxRouteRequests > 0
            ? ('warning' as const)
            : ('healthy' as const),
      detail:
        top5xxRouteRequests > 0
          ? `${formatNumber(top5xxRouteRequests)} 5xx responses were reported on this route in the latest day.`
          : 'No notable 5xx route was reported in the latest day.',
    },
  ];

  return {
    connected: true,
    detail: 'Cloudflare traffic analytics are connected and reporting live zone metrics.',
    summaryCards: [
      {
        key: 'total-requests',
        label: 'Total Requests',
        value: totals.requests,
        displayValue: formatNumber(totals.requests),
        status: requestsStatus.status,
        statusLabel: requestsStatus.statusLabel,
        detail: requestsStatus.detail,
      },
      {
        key: 'page-views',
        label: 'Page Views',
        value: totals.pageViews,
        displayValue: formatNumber(totals.pageViews),
        status: pageViewsStatus.status,
        statusLabel: pageViewsStatus.statusLabel,
        detail: pageViewsStatus.detail,
      },
      {
        key: 'unique-visitors',
        label: 'Unique Visitors',
        value: totals.uniques,
        displayValue: formatNumber(totals.uniques),
        status: uniquesStatus.status,
        statusLabel: uniquesStatus.statusLabel,
        detail: uniquesStatus.detail,
      },
      {
        key: 'cache-hit-ratio',
        label: 'Cache Hit Ratio',
        value: cacheHitRatio,
        displayValue: `${formatNumber(cacheHitRatio)}%`,
        status: cacheStatus.status,
        statusLabel: cacheStatus.statusLabel,
        detail: cacheStatus.detail,
      },
      {
        key: 'threats-blocked',
        label: 'Threats Blocked',
        value: totals.threats,
        displayValue: formatNumber(totals.threats),
        status: threatsStatus.status,
        statusLabel: threatsStatus.statusLabel,
        detail: threatsStatus.detail,
      },
      {
        key: 'expected-client-errors',
        label: 'Expected 4xx',
        value: expectedClientErrors,
        displayValue: formatNumber(expectedClientErrors),
        status: expectedClientErrorsStatus.status,
        statusLabel: expectedClientErrorsStatus.statusLabel,
        detail: expectedClientErrorsStatus.detail,
      },
      {
        key: 'unexpected-client-errors',
        label: 'Unexpected 4xx',
        value: unexpectedClientErrors,
        displayValue: formatNumber(unexpectedClientErrors),
        status: unexpectedClientErrorsStatus.status,
        statusLabel: unexpectedClientErrorsStatus.statusLabel,
        detail: unexpectedClientErrorsStatus.detail,
      },
      {
        key: 'server-errors',
        label: '5xx Responses',
        value: totals.serverErrors,
        displayValue: formatNumber(totals.serverErrors),
        status: serverErrorsStatus.status,
        statusLabel: serverErrorsStatus.statusLabel,
        detail: serverErrorsStatus.detail,
      },
      {
        key: 'bandwidth',
        label: 'Bandwidth',
        value: totalBandwidthMb,
        displayValue: `${formatNumber(totalBandwidthMb)} MB`,
        status: bandwidthStatus.status,
        statusLabel: bandwidthStatus.statusLabel,
        detail: bandwidthStatus.detail,
      },
      {
        key: 'cached-bandwidth-ratio',
        label: 'Cached Bandwidth',
        value: cachedBandwidthRatio,
        displayValue: `${formatNumber(cachedBandwidthRatio)}%`,
        status: cachedBandwidthStatus.status,
        statusLabel: cachedBandwidthStatus.statusLabel,
        detail: cachedBandwidthStatus.detail,
      },
    ],
    topErrorRoutes,
    requestSeries,
    bandwidthSeries,
    diagnostics: {
      apiTokenConfigured: true,
      zoneIdConfigured: true,
      status: 'live',
      errorMessage: null,
      hint: null,
    },
  };
}

function buildEmptyTrafficSeries(windowKeys: string[]): TrafficSeriesPoint[] {
  return windowKeys.map((key) => ({
    date: key,
    label: formatCompactDate(key),
    requests: null,
    cached: null,
    uncached: null,
    bandwidthMb: null,
  }));
}

export async function GET(request: NextRequest) {
  const days = parseWindowDays(request.nextUrl.searchParams.get('days'));
  let sentryUser: { id?: string | null; email?: string | null; role?: string | null } | null = null;

  try {
    const serverSupabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await serverSupabase.auth.getUser();

    if (authError) {
      return NextResponse.json({ success: false, error: authError.message }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    sentryUser = {
      id: user.id,
      email: user.email ?? null,
      role: null,
    };

    const { data: callerProfile, error: callerProfileError } = await serverSupabase
      .from('profiles')
      .select('id, name, role')
      .eq('id', user.id)
      .maybeSingle();

    if (callerProfileError) {
      return NextResponse.json({ success: false, error: callerProfileError.message }, { status: 500 });
    }

    if (callerProfile?.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    sentryUser.role = callerProfile?.role || null;

    if ((user.email || '').toLowerCase() !== MONITORING_OWNER_EMAIL) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const serviceSupabase = getServiceSupabase();

    const [{ data: profiles, error: profilesError }, analysesResult] = await Promise.all([
      serviceSupabase
        .from('profiles')
        .select('id, name, email, role'),
      serviceSupabase
        .from('analyses')
        .select('id, user_id, created_at, title, subject, grade, coverage_score, clarity_rating, engagement_level, gaps_detected, result, analysis_result')
        .order('created_at', { ascending: false }),
    ]);

    const { data: analyses, error: analysesError } = analysesResult;

    if (profilesError) {
      return NextResponse.json({ success: false, error: profilesError.message }, { status: 500 });
    }
    if (analysesError) {
      return NextResponse.json({ success: false, error: analysesError.message }, { status: 500 });
    }

    const profileList = (profiles || []) as ProfileRecord[];
    const reportList = (analyses || []) as AnalysisReport[];
    const profileById = new Map(profileList.map((profile) => [profile.id, profile]));
    const windowKeys = buildDateKeys(days);
    const windowKeySet = new Set(windowKeys);
    const reportsInWindow = reportList.filter((report) => {
      if (!report.created_at) return false;
      return windowKeySet.has(report.created_at.slice(0, 10));
    });

    const totalLessons = reportList.length;
    const totalTeachers = profileList.filter((profile) => profile.role === 'teacher').length;
    const totalAdmins = profileList.filter((profile) => profile.role === 'admin' || profile.role === 'super_admin').length;
    const activeTeachers = new Set(
      reportsInWindow
        .map((report) => report.user_id)
        .filter((value): value is string => Boolean(value && profileById.get(value)?.role === 'teacher'))
    ).size;
    const observationCount = reportsInWindow.filter(isAdminObservation).length;
    const averageScore = average(reportsInWindow.map((report) => calculateLessonScore(report)));

    const seriesMap = new Map<string, { lessons: number; observations: number; scores: number[] }>();
    windowKeys.forEach((key) => {
      seriesMap.set(key, { lessons: 0, observations: 0, scores: [] });
    });

    reportsInWindow.forEach((report) => {
      if (!report.created_at) return;
      const key = report.created_at.slice(0, 10);
      const bucket = seriesMap.get(key);
      if (!bucket) return;
      bucket.lessons += 1;
      bucket.scores.push(calculateLessonScore(report));
      if (isAdminObservation(report)) {
        bucket.observations += 1;
      }
    });

    const series: MonitoringSeriesPoint[] = windowKeys.map((key) => {
      const bucket = seriesMap.get(key)!;
      return {
        date: key,
        label: formatCompactDate(key),
        lessons: bucket.lessons,
        observations: bucket.observations,
        averageScore: average(bucket.scores),
      };
    });

    const activityByUser = new Map<string, AnalysisReport[]>();
    reportList.forEach((report) => {
      if (!report.user_id) return;
      const existing = activityByUser.get(report.user_id) || [];
      existing.push(report);
      activityByUser.set(report.user_id, existing);
    });

    const recentActivity: MonitoringActivityRow[] = Array.from(activityByUser.entries())
      .map(([userId, userReports]) => {
        const recentReports = userReports.filter((report) => {
          if (!report.created_at) return false;
          return windowKeySet.has(report.created_at.slice(0, 10));
        });
        const latestSubmittedAt = userReports[0]?.created_at ?? null;

        return {
          id: userId,
          name: profileById.get(userId)?.name || profileById.get(userId)?.email || 'User',
          role: profileById.get(userId)?.role || 'teacher',
          lessons: recentReports.length,
          adminObservations: recentReports.filter(isAdminObservation).length,
          averageScore: average(recentReports.map((report) => calculateLessonScore(report))),
          trend: getLatestLessonTrend(userReports),
          latestSubmittedAt,
        };
      })
      .filter((row) => row.lessons > 0)
      .sort((a, b) => {
        if (b.lessons !== a.lessons) return b.lessons - a.lessons;
        return (b.latestSubmittedAt || '').localeCompare(a.latestSubmittedAt || '');
      })
      .slice(0, 8);

    const lessonUploads: MonitoringLessonLedgerRow[] = reportList.map((report) => {
      const profile = report.user_id ? profileById.get(report.user_id) : null;
      const isAnonymous = !report.user_id;
      const source = isAnonymous
        ? 'Try It Now'
        : isAdminObservation(report)
          ? 'Admin Observation'
          : 'Logged-in Lesson';

      return {
        id: report.id,
        title: String(report.title || 'Untitled Lesson'),
        context: buildMonitoringLessonContext(report) || 'Lesson context was not saved.',
        submittedBy: isAnonymous ? 'Guest User' : profile?.name || profile?.email || 'User',
        submitterRole: isAnonymous ? 'guest' : profile?.role || 'teacher',
        source,
        createdAt: report.created_at || null,
        score: calculateLessonScore(report),
        executiveSummary: buildMonitoringLessonSummary(report),
      };
    });

    const readiness = buildReadiness();
    const connectionState = buildConnections();
    const uptime = await fetchUptimeSummary(request);

    let cloudflareTraffic = {
      connected: false,
      detail: buildCloudflareMissingConfigDetail(),
      summaryCards: buildTrafficCards(),
      requestSeries: buildEmptyTrafficSeries(windowKeys),
      bandwidthSeries: buildEmptyTrafficSeries(windowKeys),
      diagnostics: {
        apiTokenConfigured: Boolean(process.env.CLOUDFLARE_API_TOKEN),
        zoneIdConfigured: Boolean(process.env.CLOUDFLARE_ZONE_ID),
        status: 'missing_config',
        errorMessage: null,
        hint: 'Add the missing Cloudflare env vars to the running deployment, then redeploy.',
      },
    } as CloudflareTrafficResult;

    let sentryHealth = {
      connected: false,
      detail: buildSentryMissingConfigDetail(),
      summaryCards: buildEmptySentryCards(),
      recentIssues: [],
      crashFreeSessionsPercent: null,
      diagnostics: {
        tokenConfigured: Boolean(process.env.SENTRY_AUTH_TOKEN || process.env.SENTRY_API_TOKEN),
        orgConfigured: Boolean(process.env.SENTRY_ORG || process.env.SENTRY_ORG_SLUG),
        projectConfigured: Boolean(
          process.env.SENTRY_PROJECT || process.env.SENTRY_PROJECT_SLUG || process.env.NEXT_PUBLIC_SENTRY_PROJECT
        ),
        status: 'missing_config',
        errorMessage: null,
        hint: 'Add SENTRY_AUTH_TOKEN and SENTRY_ORG to unlock live Sentry monitoring metrics.',
      },
    } as SentryResult;

    let supabaseAdvisors = {
      connected: false,
      detail: buildSupabaseAdvisorMissingConfigDetail(),
      summaryCards: buildEmptySupabaseAdvisorCards(),
      findings: [],
      diagnostics: {
        tokenConfigured: Boolean(process.env.SUPABASE_MANAGEMENT_TOKEN),
        projectRefConfigured: Boolean(process.env.SUPABASE_PROJECT_REF),
        status: 'missing_config',
        errorMessage: null,
        hint: 'Add SUPABASE_MANAGEMENT_TOKEN and SUPABASE_PROJECT_REF to unlock live Supabase advisor findings.',
      },
    } as SupabaseAdvisorResult;

    await Promise.all([
      (async () => {
        try {
          cloudflareTraffic = await fetchCloudflareTraffic(windowKeys);
        } catch (cloudflareError) {
          console.error('Cloudflare monitoring fetch error:', cloudflareError);
          const errorMessage = getErrorMessage(cloudflareError, 'Cloudflare analytics could not be loaded.');
          cloudflareTraffic = {
            connected: false,
            detail: errorMessage,
            summaryCards: buildTrafficCards().map((card) =>
              card.key === 'total-requests'
                ? { ...card, detail: errorMessage }
                : card
            ),
            topErrorRoutes: [],
            requestSeries: buildEmptyTrafficSeries(windowKeys),
            bandwidthSeries: buildEmptyTrafficSeries(windowKeys),
            diagnostics: {
              apiTokenConfigured: Boolean(process.env.CLOUDFLARE_API_TOKEN),
              zoneIdConfigured: Boolean(process.env.CLOUDFLARE_ZONE_ID),
              status: 'error',
              errorMessage,
              hint: buildCloudflareErrorHint(errorMessage),
            },
          };
        }
      })(),
      (async () => {
        try {
          sentryHealth = await fetchSentryHealth();
        } catch (sentryError) {
          console.error('Sentry monitoring fetch error:', sentryError);
          const errorMessage = getErrorMessage(sentryError, 'Sentry metrics could not be loaded.');
          const config = getSentryConfig();
          sentryHealth = {
            connected: false,
            detail: errorMessage,
            summaryCards: buildEmptySentryCards().map((card) =>
              card.key === 'errors-24h' || card.key === 'unresolved-issues'
                ? { ...card, detail: errorMessage }
                : card
            ),
            recentIssues: [],
            crashFreeSessionsPercent: null,
            diagnostics: {
              tokenConfigured: config.tokenConfigured,
              orgConfigured: config.orgConfigured,
              projectConfigured: config.projectConfigured,
              status: 'error',
              errorMessage,
              hint: buildSentryErrorHint(errorMessage),
            },
          };
        }
      })(),
      (async () => {
        try {
          supabaseAdvisors = await fetchSupabaseAdvisors();
        } catch (supabaseAdvisorError) {
          console.error('Supabase advisor monitoring fetch error:', supabaseAdvisorError);
          const errorMessage = getErrorMessage(supabaseAdvisorError, 'Supabase advisor findings could not be loaded.');
          const config = getSupabaseAdvisorConfig();
          supabaseAdvisors = {
            connected: false,
            detail: errorMessage,
            summaryCards: buildEmptySupabaseAdvisorCards().map((card) =>
              card.key === 'supabase-open-findings' || card.key === 'supabase-critical-findings'
                ? { ...card, detail: errorMessage }
                : card
            ),
            findings: [],
            diagnostics: {
              tokenConfigured: config.tokenConfigured,
              projectRefConfigured: config.projectRefConfigured,
              status: 'error',
              errorMessage,
              hint: buildSupabaseAdvisorErrorHint(errorMessage),
            },
          };
        }
      })(),
    ]);

    const alerts = buildMonitoringAlerts({
      cloudflareTraffic,
      sentryHealth,
      supabaseAdvisors,
      uptime,
    });

    const hydratedConnections = connectionState.connections.map((item) => {
      if (item.key === 'sentry-api') {
        return {
          ...item,
          connected: sentryHealth.connected,
          detail: sentryHealth.detail,
        };
      }
      if (item.key === 'supabase-advisors') {
        return {
          ...item,
          connected: supabaseAdvisors.connected,
          detail: supabaseAdvisors.detail,
        };
      }
      if (item.key !== 'cloudflare-traffic') return item;
      return {
        ...item,
        connected: cloudflareTraffic.connected,
        detail: cloudflareTraffic.detail,
      };
    });

    const connectedProviders = hydratedConnections.filter((item) => item.connected).length;
    const strongTeachers = recentActivity.filter((row) => row.role === 'teacher' && row.averageScore >= 85).length;
    const atRiskTeachers = recentActivity.filter((row) => row.role === 'teacher' && row.averageScore > 0 && row.averageScore < 75).length;

    return NextResponse.json(
      {
        success: true,
        caller: {
          id: callerProfile?.id || user.id,
          name: callerProfile?.name || null,
          role: callerProfile?.role || null,
        },
        summary: {
          days,
          totalLessons,
          lessonsInWindow: reportsInWindow.length,
          totalTeachers,
          totalAdmins,
          activeTeachers,
          observationCount,
          averageScore,
          strongTeachers,
          atRiskTeachers,
        },
        series,
        recentActivity,
        lessonUploads,
        readiness,
        alerts,
        uptime,
        sentry: {
          summaryCards: sentryHealth.summaryCards,
          recentIssues: sentryHealth.recentIssues,
          diagnostics: sentryHealth.diagnostics,
        },
        supabaseAdvisors: {
          summaryCards: supabaseAdvisors.summaryCards,
          findings: supabaseAdvisors.findings,
          diagnostics: supabaseAdvisors.diagnostics,
        },
        connections: hydratedConnections,
        sync: {
          generatedAt: new Date().toISOString(),
          connectedProviders,
          totalProviders: hydratedConnections.length,
        },
        httpTraffic: {
          summaryCards: cloudflareTraffic.summaryCards,
          topErrorRoutes: cloudflareTraffic.topErrorRoutes,
          requestSeries: cloudflareTraffic.requestSeries,
          bandwidthSeries: cloudflareTraffic.bandwidthSeries,
          diagnostics: cloudflareTraffic.diagnostics,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('Admin monitoring route error:', error);
    captureRouteException(error, {
      route: 'api/admin/monitoring',
      user: sentryUser,
    });
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
  }
}
