'use client';

import Link from 'next/link';
import { sampleReports, calculateLessonScore } from '@/lib/dashboardData';

function getTeacherSummaries() {
  const teacherMap = new Map<string, any[]>();

  for (const report of sampleReports) {
    const key = report.teacher || 'Unknown Teacher';
    if (!teacherMap.has(key)) teacherMap.set(key, []);
    teacherMap.get(key)!.push(report);
  }

  const rows = Array.from(teacherMap.entries()).map(([teacher, reports]) => {
    const avgScore = Math.round(
      reports.reduce((sum, report) => sum + calculateLessonScore(report), 0) / reports.length
    );

    const avgCoverage = Math.round(
      reports.reduce((sum, report) => sum + Number(report.coverage ?? 0), 0) / reports.length
    );

    const avgClarity = Math.round(
      reports.reduce((sum, report) => sum + Number(report.clarity ?? 0), 0) / reports.length
    );

    return {
      teacher,
      reports: reports.length,
      avgScore,
      avgCoverage,
      avgClarity,
      status:
        avgScore >= 85 ? 'Strong' :
        avgScore >= 75 ? 'Watch' :
        'Needs Attention',
    };
  });

  return rows.sort((a, b) => b.avgScore - a.avgScore);
}

export default function AdminPage() {
  const teachers = getTeacherSummaries();

  const totalTeachers = teachers.length;
  const totalLessons = teachers.reduce((sum, t) => sum + t.reports, 0);
  const avgScore = teachers.length
    ? Math.round(teachers.reduce((sum, t) => sum + t.avgScore, 0) / teachers.length)
    : 0;
  const flaggedTeachers = teachers.filter(t => t.avgScore < 75).length;

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '32px 20px 48px' }}>
      <div
        style={{
          borderRadius: 24,
          padding: 28,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
          color: '#fff',
          boxShadow: '0 20px 50px rgba(15, 23, 42, 0.22)',
          marginBottom: 24,
        }}
      >
        <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 8 }}>
          District Instruction Overview
        </div>
        <h1 style={{ fontSize: 42, fontWeight: 800, margin: 0 }}>
          {avgScore}/100
        </h1>
        <p style={{ marginTop: 10, fontSize: 16, lineHeight: 1.5, maxWidth: 760 }}>
          Centralized visibility into teacher performance, lesson quality, and instructional risk.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 18 }}>
          <Link
            href="/dashboard"
            style={{
              background: '#fff',
              color: '#0f172a',
              padding: '12px 18px',
              borderRadius: 12,
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Teacher Dashboard
          </Link>

          <Link
            href="/analyze"
            style={{
              background: 'rgba(255,255,255,0.12)',
              color: '#fff',
              padding: '12px 18px',
              borderRadius: 12,
              textDecoration: 'none',
              fontWeight: 600,
              border: '1px solid rgba(255,255,255,0.18)',
            }}
          >
            Analyze New Lesson
          </Link>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {[
          { label: 'Teachers', value: totalTeachers },
          { label: 'Lessons Analyzed', value: totalLessons },
          { label: 'Average Score', value: `${avgScore}/100` },
          { label: 'Flagged Teachers', value: flaggedTeachers },
        ].map(card => (
          <div
            key={card.label}
            style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 18,
              padding: 18,
              boxShadow: '0 8px 24px rgba(15,23,42,0.05)',
            }}
          >
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a' }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 20,
          padding: 20,
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 16, color: '#0f172a' }}>Teacher Performance Summary</h2>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '12px 8px' }}>Teacher</th>
                <th style={{ padding: '12px 8px' }}>Reports</th>
                <th style={{ padding: '12px 8px' }}>Avg Score</th>
                <th style={{ padding: '12px 8px' }}>Coverage</th>
                <th style={{ padding: '12px 8px' }}>Clarity</th>
                <th style={{ padding: '12px 8px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map(row => (
                <tr key={row.teacher} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 8px', fontWeight: 600 }}>{row.teacher}</td>
                  <td style={{ padding: '12px 8px' }}>{row.reports}</td>
                  <td style={{ padding: '12px 8px' }}>{row.avgScore}/100</td>
                  <td style={{ padding: '12px 8px' }}>{row.avgCoverage}%</td>
                  <td style={{ padding: '12px 8px' }}>{row.avgClarity}%</td>
                  <td style={{ padding: '12px 8px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '6px 10px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 700,
                        background:
                          row.status === 'Strong' ? 'rgba(34,197,94,0.12)' :
                          row.status === 'Watch' ? 'rgba(245,158,11,0.12)' :
                          'rgba(239,68,68,0.12)',
                        color:
                          row.status === 'Strong' ? '#16a34a' :
                          row.status === 'Watch' ? '#d97706' :
                          '#dc2626',
                      }}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
