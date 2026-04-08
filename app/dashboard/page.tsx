'use client';

import Link from 'next/link';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import {
  sampleReports,
  getDashboardSummary,
  getTrendData,
  calculateLessonScore,
} from '@/lib/dashboardData';

export default function DashboardPage() {
  const reports = sampleReports.filter(r => r.teacher === 'Ms. Carter');
  const summary = getDashboardSummary(reports);
  const trendData = getTrendData(reports);

  const latestReport = reports[reports.length - 1];
  const latestScore = latestReport ? calculateLessonScore(latestReport) : 0;

  const insight =
    latestScore >= 90
      ? 'Excellent instructional alignment with strong clarity and consistency.'
      : latestScore >= 80
      ? 'Strong lesson performance with a few opportunities to tighten instruction.'
      : 'Solid foundation, but this lesson needs reinforcement in key instructional areas.';

  const nextSteps = [
    'Strengthen checks for understanding during the lesson',
    'Close flagged gaps before moving to the next objective',
    'Increase reinforcement of the most important takeaway',
  ];

  const metricCards = [
    { label: 'Lessons Analyzed', value: summary.lessonsAnalyzed },
    { label: 'Average Score', value: `${summary.averageScore}/100` },
    { label: 'Coverage', value: `${summary.averageCoverage}%` },
    { label: 'Clarity', value: `${summary.averageClarity}%` },
  ];

  const breakdownData = latestReport
    ? [
        { name: 'Coverage', value: latestReport.coverage },
        { name: 'Clarity', value: latestReport.clarity },
        { name: 'Engagement', value: latestReport.engagement },
        { name: 'Assessment', value: latestReport.assessment },
      ]
    : [];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px 48px' }}>
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
          Instructional Score
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 48, fontWeight: 800, margin: 0 }}>
            {summary.averageScore}/100
          </h1>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '8px 12px',
              borderRadius: '999px',
              background: 'rgba(34, 197, 94, 0.14)',
              border: '1px solid rgba(34, 197, 94, 0.24)',
              color: '#22c55e',
              fontSize: '13px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            ↑ +4 from last lesson
          </div>
        </div>
        <p style={{ marginTop: 10, fontSize: 16, lineHeight: 1.5, maxWidth: 720 }}>
          💡 {insight}
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 18 }}>
          <Link
            href="/analyze"
            style={{
              background: '#fff',
              color: '#0f172a',
              padding: '12px 18px',
              borderRadius: 12,
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Analyze New Lesson
          </Link>

          <Link
            href="/reports"
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
            Review Saved Reports
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
        {metricCards.map(card => (
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
          display: 'grid',
          gridTemplateColumns: '1.2fr 0.8fr',
          gap: 20,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 20,
            padding: 20,
            minHeight: 360,
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 16, color: '#0f172a' }}>📈 Performance Trend</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="score" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div
          style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 20,
            padding: 20,
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 16, color: '#0f172a' }}>📌 What To Do Next</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {nextSteps.map(step => (
              <div
                key={step}
                style={{
                  padding: 14,
                  borderRadius: 14,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#0f172a',
                  lineHeight: 1.45,
                }}
              >
                {step}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 20,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 20,
            padding: 20,
            minHeight: 340,
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 16, color: '#0f172a' }}>
            📊 Latest Lesson Breakdown
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={breakdownData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="value" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div
          style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 20,
            padding: 20,
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 16, color: '#0f172a' }}>🧠 Latest Lesson Snapshot</h2>

          {latestReport ? (
            <div style={{ display: 'grid', gap: 12 }}>
              <div><strong>Title:</strong> {latestReport.title}</div>
              <div><strong>Date:</strong> {latestReport.date}</div>
              <div><strong>Score:</strong> {latestScore}/100</div>
              <div><strong>Coverage:</strong> {latestReport.coverage}%</div>
              <div><strong>Clarity:</strong> {latestReport.clarity}%</div>
              <div><strong>Gaps Flagged:</strong> {latestReport.gaps}</div>
            </div>
          ) : (
            <p>No lesson data yet.</p>
          )}
        </div>
      </div>

      <div
        style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 20,
          padding: 20,
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 16, color: '#0f172a' }}>Recent Lesson Reports</h2>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '12px 8px' }}>Title</th>
                <th style={{ padding: '12px 8px' }}>Date</th>
                <th style={{ padding: '12px 8px' }}>Coverage</th>
                <th style={{ padding: '12px 8px' }}>Clarity</th>
                <th style={{ padding: '12px 8px' }}>Gaps</th>
                <th style={{ padding: '12px 8px' }}>Score</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(report => (
                <tr key={report.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 8px' }}>{report.title}</td>
                  <td style={{ padding: '12px 8px' }}>{report.date}</td>
                  <td style={{ padding: '12px 8px' }}>{report.coverage}%</td>
                  <td style={{ padding: '12px 8px' }}>{report.clarity}%</td>
                  <td style={{ padding: '12px 8px' }}>{report.gaps}</td>
                  <td style={{ padding: '12px 8px', fontWeight: 700 }}>
                    {calculateLessonScore(report)}/100
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
