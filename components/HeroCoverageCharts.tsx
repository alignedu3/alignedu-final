'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';

type SubjectMetric = {
  subject: string;
  value: number;
  color: string;
};

type SchoolGroup = {
  name: string;
  subjects: SubjectMetric[];
};

export default function HeroCoverageCharts({
  schoolGroups,
}: {
  schoolGroups: SchoolGroup[];
}) {
  return (
    <>
      {schoolGroups.map((schoolGroup) => (
        <div key={schoolGroup.name} className="preview-school-card" style={previewSubjectCard}>
          <div style={previewSubjectTitle}>{schoolGroup.name.replace(' ', '\n')}</div>
          <div className="preview-coverage-wrap" style={previewCoverageChartWrap}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={schoolGroup.subjects}
                margin={{ top: 10, right: 2, left: -12, bottom: 0 }}
                barCategoryGap="14%"
              >
                <CartesianGrid vertical={false} stroke="rgba(148,163,184,0.26)" strokeDasharray="3 5" />
                <XAxis
                  dataKey="subject"
                  axisLine={false}
                  tickLine={false}
                  tick={false}
                  height={0}
                />
                <YAxis
                  type="number"
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  axisLine={false}
                  tickLine={false}
                  width={24}
                  tick={{ fontSize: 8, fill: '#94a3b8', fontWeight: 700 }}
                />
                <ReferenceLine
                  y={85}
                  stroke="#0284c7"
                  strokeDasharray="4 4"
                  ifOverflow="extendDomain"
                  label={{
                    value: 'Target 85%',
                    position: 'insideTopRight',
                    fill: '#0369a1',
                    fontSize: 8,
                    fontWeight: 700,
                  }}
                />
                <Bar dataKey="value" radius={[10, 10, 3, 3]} maxBarSize={14} minPointSize={3}>
                  {schoolGroup.subjects.map((item) => (
                    <Cell key={`${schoolGroup.name}-${item.subject}`} fill={item.color} fillOpacity={0.95} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}
    </>
  );
}

const previewSubjectCard: React.CSSProperties = {
  minWidth: 0,
  background: '#ffffff',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  borderRadius: '18px',
  padding: '12px',
  display: 'grid',
  gridTemplateColumns: '70px minmax(0, 1fr)',
  gap: '12px',
  alignItems: 'stretch',
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
};

const previewSubjectTitle: React.CSSProperties = {
  color: '#0f172a',
  fontSize: '12px',
  fontWeight: 700,
  lineHeight: 1.5,
  whiteSpace: 'pre-line',
  display: 'flex',
  alignItems: 'center',
};

const previewCoverageChartWrap: React.CSSProperties = {
  width: '100%',
  height: 210,
  minWidth: 0,
};
