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
  const [ready, setReady] = useState(false);
  const router = useRouter();

  const handleAddTeacher = async () => {
    const email = prompt("Enter teacher email:");
    const firstName = prompt("Enter teacher first name:"); const lastName = prompt("Enter teacher last name:"); const name = `${firstName?.trim()} ${lastName?.trim()}`.trim();

    if (!email || !name) return;

    const res = await fetch('/api/create-teacher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name }),
    });

    const data = await res.json();

    if (data.success) {
      alert("Teacher added successfully");
      window.location.reload();
    } else {
      alert("Error: " + data.error);
    }
  };

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setReady(true);
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
        setReady(true);
        return;
      }

      const { data } = await supabase
        .from('analyses')
        .select('*')
        .in('user_id', teacherIds)
        .order('created_at', { ascending: false });

      setDbReports(data ?? []);
      setReady(true);
    }

    loadData();
  }, []);

  const reports = dbReports.length ? dbReports : sampleReports;
  const summary = getDashboardSummary(reports);
  const trendData = getTrendData(reports);

  // ================================
  // FIXED: teacher name resolution ONLY
  // ================================
  const teacherStats = useMemo(() => {
    const map: Record<string, any[]> = {};

    reports.forEach((r: any) => {
      const key = r.user_id;
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });

    return Object.entries(map).map(([id, reps]) => {
      const profile = profiles.find(p => p.id === id);

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
    <main style={page}>
      <div style={container}>

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

          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#f97316" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* TABLE */}
        <div style={card}>
          <h2 style={title}>Teacher Performance</h2>

          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Teacher</th>
                <th style={th}>Score</th>
                <th style={th}>Trend</th>
                <th style={th}>Status</th>
              </tr>
            </thead>

            <tbody>
              {teacherStats.map((t, i) => (
                <tr
                  key={i}
                  onClick={() => router.push(`/admin/teacher/${t.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td style={td}>{t.name}</td>
                  <td style={td}>{t.avgScore}</td>
                  <td style={td}>
                    {t.trend > 0 ? `↑ +${t.trend}` : `↓ ${t.trend}`}
                  </td>
                  <td style={{ ...td, color: t.needsAttention ? '#ef4444' : '#22c55e' }}>
                    {t.needsAttention ? 'Needs Support' : 'Strong'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
  background: '#081120',
  padding: 40
};

const container: React.CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto'
};

const header: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  flexWrap: 'wrap',
  marginBottom: 28
};

const heading: React.CSSProperties = {
  color: '#fff',
  fontSize: 28
};

const subheading: React.CSSProperties = {
  color: '#94a3b8'
};

const actions: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap'
};

const btn: React.CSSProperties = {
  background: '#f97316',
  color: '#fff',
  padding: 10,
  borderRadius: 8
};

const btnAlt: React.CSSProperties = {
  background: '#1f2937',
  color: '#fff',
  padding: 10,
  borderRadius: 8
};

const card: React.CSSProperties = {
  background: '#111827',
  padding: 20,
  borderRadius: 12,
  marginBottom: 24
};

const cardSmall: React.CSSProperties = {
  background: '#111827',
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
  color: '#fff',
  marginBottom: 10
};

const text: React.CSSProperties = {
  color: '#94a3b8'
};

const big: React.CSSProperties = {
  fontSize: 24,
  color: '#fff'
};

const statLabel: React.CSSProperties = {
  color: '#94a3b8',
  fontSize: 13,
  marginBottom: 4
};

const statSub: React.CSSProperties = {
  fontSize: 12,
  color: '#64748b',
  marginTop: 6
};

const table: React.CSSProperties = {
  width: '100%'
};

const th: React.CSSProperties = {
  textAlign: 'left',
  color: '#94a3b8',
  padding: 8
};

const td: React.CSSProperties = {
  color: '#fff',
  padding: 8
};

const listItem: React.CSSProperties = {
  color: '#fff',
  marginBottom: 6
};

const loading: React.CSSProperties = {
  color: '#fff',
  padding: 40
};