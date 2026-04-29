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
  borderRadius: '10px',
  border: '1px solid rgba(148,163,184,0.2)',
  background: 'linear-gradient(180deg, rgba(255,255,255,0.94), rgba(248,250,252,0.9))',
  padding: '8px',
  boxShadow: '0 6px 14px rgba(15,23,42,0.05)',
  minWidth: 0,
};

const previewSubjectTitle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 800,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  marginBottom: '8px',
  textAlign: 'center',
  color: '#0f172a',
  minHeight: '26px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  whiteSpace: 'pre-line',
  lineHeight: 1.05,
};

const previewCoverageChartWrap: React.CSSProperties = {
  position: 'relative',
  borderRadius: '9px',
  background: 'rgba(255,255,255,0.92)',
  border: '1px solid rgba(148,163,184,0.24)',
  padding: '8px 6px 6px 2px',
  height: '136px',
  minWidth: 0,
  minHeight: 136,
};
