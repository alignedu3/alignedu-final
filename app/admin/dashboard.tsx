'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  sampleReports,
  getDashboardSummary,
  getTrendData,
  calculateLessonScore
} from '@/lib/dashboardData';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from 'recharts';

export default function AdminDashboard() {
  const [dbReports, setDbReports] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [isNarrowScreen, setIsNarrowScreen] = useState(false);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  const handleAddTeacher = () => {
    router.push('/admin/invite');
  };

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          return;
        }

        // Load only teachers managed by this admin
        const { data: managedData } = await supabase
          .from('managed_teachers')
          .select('teacher_id')
          .eq('admin_id', user.id);

        const teacherIds = (managedData || []).map(m => m.teacher_id);

        // Get teacher profiles for managed teachers
        const { data: profileData } = teacherIds.length > 0 
          ? await supabase
              .from('profiles')
              .select('id, name, role')
              .in('id', teacherIds)
          : { data: [] };

        setProfiles(profileData ?? []);

        if (!teacherIds.length) {
          setDbReports([]);
          return;
        }

        const { data } = await supabase
          .from('analyses')
          .select('id, user_id, created_at, date, coverage, coverage_score, clarity, clarity_rating, engagement, assessment, gaps, gaps_detected, teacher_name, name')
          .in('user_id', teacherIds)
          .order('created_at', { ascending: false });

        setDbReports(data ?? []);
      } catch (err) {
        console.error('Admin dashboard load error:', err);
      } finally {
        setReady(true);
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    const checkScreen = () => setIsNarrowScreen(window.innerWidth <= 768);
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  const reports = dbReports.length ? dbReports : sampleReports;
  const summary = getDashboardSummary(reports);
  const trendData = getTrendData(reports);

  // ================================
  // FIXED: teacher name resolution ONLY
  // ================================
  const teacherStats = useMemo(() => {
    const profileById = new Map((profiles || []).map((p) => [p.id, p]));
    const map: Record<string, any[]> = {};

    reports.forEach((r: any) => {
      const key = r.user_id;
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });

    return Object.entries(map).map(([id, reps]) => {
      const profile = profileById.get(id);

      const scores = reps.map(r => calculateLessonScore(r));
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

      const trend =
        scores.length > 1
          ? scores[scores.length - 1] - scores[0]
          : 0;

      // ONLY FIX: robust name resolution
      let teacherName = 'Unknown Teacher';

      if (profile?.name) {
        teacherName = profile.name;
      } else if (reps?.length && reps[0]?.teacher_name) {
        teacherName = reps[0].teacher_name;
      } else if (reps?.length && reps[0]?.name) {
        teacherName = reps[0].name;
      }

      return {
        id,
        name: teacherName,
        avgScore: Math.round(avg),
        count: reps.length,
        trend: Math.round(trend),
        needsAttention: avg < 75,
      };
    });
  }, [reports, profiles]);

  const atRiskTeachers = teacherStats
    .filter(t => t.needsAttention)
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, 3);

  const systemInsight =
    summary.averageScore < 75
      ? "System performance is declining due to gaps in lesson closure and concept reinforcement."
      : "Instructional quality is strong with consistent standards alignment.";

  const recommendedAction =
    summary.averageScore < 75
      ? "Focus on improving lesson closure and reinforcing key concepts across classrooms."
      : "Maintain strong instruction and introduce deeper checks for understanding.";

  const strongCount = teacherStats.filter(t => !t.needsAttention).length;
  const supportCount = teacherStats.filter(t => t.needsAttention).length;

  if (!ready) {
    return <div style={loading}>Loading...</div>;
  }

  return (
    <main style={page} className="dashboard-page">
      <div style={container} className="dashboard-container">

        {/* HEADER */}
        <div style={header}>
          <div>
            <h1 style={heading}>Admin Dashboard</h1>
            <p style={subheading}>System-wide instructional intelligence</p>
          </div>

          <div style={actions}>
            <button onClick={() => router.push('/analyze')} style={btn}>
              Analyze Lesson
            </button>
            <button onClick={handleAddTeacher} style={btnAlt}>
              Add Teacher
            </button>
          </div>
        </div>

        {/* AT RISK */}
        <div style={card}>
          <h2 style={title}>At-Risk Teachers</h2>
          {atRiskTeachers.length === 0 ? (
            <p style={text}>No teachers currently need intervention.</p>
          ) : (
            atRiskTeachers.map((t, i) => (
              <div key={i} style={listItem}>
                {t.name} — {t.avgScore}/100 ({t.trend > 0 ? `↑ +${t.trend}` : `↓ ${t.trend}`})
              </div>
            ))
          )}
        </div>

        {/* ACTION */}
        <div style={card}>
          <h2 style={title}>Recommended Action</h2>
          <p style={text}>{recommendedAction}</p>
        </div>

        {/* STATS */}
        <div style={grid}>
          <div style={cardSmall}>
            <div style={statLabel}>Instructional Quality Score</div>
            <div style={{
              ...big,
              color: summary.averageScore >= 75 ? '#22c55e' : '#ef4444'
            }}>
              {summary.averageScore}/100
            </div>
            <div style={statSub}>
              {summary.averageScore >= 75
                ? 'System performance is strong'
                : 'Below target — improvement needed'}
            </div>
          </div>

          <div style={cardSmall}>
            <div style={statLabel}>Lessons Analyzed</div>
            <div style={big}>{reports.length}</div>
            <div style={statSub}>Based on recent submissions</div>
          </div>

          <div style={cardSmall}>
            <div style={statLabel}>Teachers Performing Strongly</div>
            <div style={big}>{strongCount}</div>
            <div style={statSub}>Meeting expectations</div>
          </div>

          <div style={cardSmall}>
            <div style={statLabel}>At-Risk Teachers</div>
            <div style={big}>{supportCount}</div>
            <div style={statSub}>Require support</div>
          </div>
        </div>

        {/* TREND */}
        <div style={{ ...card, marginTop: 8 }}>
          <h2 style={title}>System Trend</h2>
          <p style={text}>{systemInsight}</p>

          <ResponsiveContainer width="100%" height={isNarrowScreen ? 210 : 260}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: isNarrowScreen ? 10 : 12 }}
                minTickGap={isNarrowScreen ? 20 : 10}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: isNarrowScreen ? 10 : 12 }}
                width={isNarrowScreen ? 28 : 40}
              />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#f97316" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* TABLE */}
        <div style={card}>
          <h2 style={title}>Teacher Performance</h2>

          <div className="table-scroll-wrap">
          <table style={table}>
            <thead>
              <tr>
                <th style={{ ...th, width: '44%', whiteSpace: 'normal' }}>Teacher</th>
                <th style={{ ...th, width: '16%', textAlign: 'center', whiteSpace: 'normal' }}>Score</th>
                <th style={{ ...th, width: '16%', textAlign: 'center', whiteSpace: 'normal' }}>Trend</th>
                <th style={{ ...th, width: '24%', textAlign: 'center', whiteSpace: 'normal' }}>Status</th>
              </tr>
            </thead>

            <tbody>
              {teacherStats.map((t, i) => (
                <tr
                  key={i}
                  onClick={() => router.push(`/admin/teacher/${t.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td style={{ ...td, whiteSpace: 'normal', wordBreak: 'break-word' }}>{t.name}</td>
                  <td style={{ ...td, textAlign: 'center', whiteSpace: 'normal' }}>{t.avgScore}</td>
                  <td style={{ ...td, textAlign: 'center', whiteSpace: 'normal' }}>
                    {t.trend > 0 ? `↑ +${t.trend}` : `↓ ${t.trend}`}
                  </td>
                  <td style={{ ...td, textAlign: 'center', whiteSpace: 'normal' }}>
                    <span style={t.needsAttention ? statusBadgeWarn : statusBadgeGood}>
                      {t.needsAttention ? (
                        <>
                          Needs
                          <br />
                          Support
                        </>
                      ) : (
                        'Strong'
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

      </div>
    </main>
  );
}

/* =========================
   STYLES (UNCHANGED - FULL)
   ========================= */

const page: React.CSSProperties = {
  minHeight: '100vh',
  background: 'var(--bg-primary)',
};

const container: React.CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto'
};

const header: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
  flexWrap: 'wrap',
  marginBottom: 28
};

const heading: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: 28,
  margin: '0 0 4px 0'
};

const subheading: React.CSSProperties = {
  color: 'var(--text-secondary)',
  margin: 0
};

const actions: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
  alignItems: 'center'
};

const btn: React.CSSProperties = {
  background: '#f97316',
  color: '#fff',
  padding: '10px 16px',
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 14
};

const btnAlt: React.CSSProperties = {
  background: 'var(--surface-chip)',
  color: 'var(--text-primary)',
  padding: '10px 16px',
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 14
};

const card: React.CSSProperties = {
  background: 'var(--surface-card-solid)',
  border: '1px solid var(--border)',
  padding: 20,
  borderRadius: 12,
  marginBottom: 24
};

const cardSmall: React.CSSProperties = {
  background: 'var(--surface-card-solid)',
  border: '1px solid var(--border)',
  padding: 16,
  borderRadius: 12
};

const grid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 16,
  marginBottom: 28
};

const title: React.CSSProperties = {
  color: 'var(--text-primary)',
  marginBottom: 10
};

const text: React.CSSProperties = {
  color: 'var(--text-secondary)'
};

const big: React.CSSProperties = {
  fontSize: 24,
  color: 'var(--text-primary)'
};

const statLabel: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 13,
  marginBottom: 4
};

const statSub: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--text-secondary)',
  marginTop: 6
};

const table: React.CSSProperties = {
  width: '100%',
  tableLayout: 'fixed',
  borderCollapse: 'collapse'
};

const th: React.CSSProperties = {
  textAlign: 'left',
  color: 'var(--text-secondary)',
  padding: '5px 6px',
  fontSize: 13
};

const td: React.CSSProperties = {
  color: 'var(--text-primary)',
  padding: '5px 6px',
  fontSize: 14,
  verticalAlign: 'middle'
};

const statusBadgeWarn: React.CSSProperties = {
  display: 'inline-block',
  minWidth: 64,
  padding: '4px 6px',
  borderRadius: 10,
  background: 'rgba(239,68,68,0.12)',
  border: '1px solid rgba(239,68,68,0.24)',
  color: '#ef4444',
  fontSize: 12,
  fontWeight: 700,
  lineHeight: 1.1,
  textAlign: 'center'
};

const statusBadgeGood: React.CSSProperties = {
  display: 'inline-block',
  minWidth: 64,
  padding: '4px 6px',
  borderRadius: 10,
  background: 'rgba(34,197,94,0.12)',
  border: '1px solid rgba(34,197,94,0.24)',
  color: '#22c55e',
  fontSize: 12,
  fontWeight: 700,
  lineHeight: 1.1,
  textAlign: 'center'
};

const listItem: React.CSSProperties = {
  color: 'var(--text-primary)',
  marginBottom: 6
};

const loading: React.CSSProperties = {
  color: 'var(--text-primary)',
  padding: 40
};