import type { CSSProperties } from 'react';

type Metric = {
  label: 'Coverage' | 'Clarity' | 'Engagement' | 'Assessment';
  value: number | null;
  color: string;
};

type PerformanceMetricSummaryProps = {
  overallScore: number;
  lessonsAnalyzed: number;
  overallLabel?: string;
  overallHelper?: string;
  metricHelper?: string;
  metrics: Metric[];
};

export default function PerformanceMetricSummary({
  overallScore,
  lessonsAnalyzed,
  overallLabel = 'Overall Score',
  overallHelper,
  metricHelper,
  metrics,
}: PerformanceMetricSummaryProps) {
  const lessonLabel = `${lessonsAnalyzed} analyzed lesson${lessonsAnalyzed === 1 ? '' : 's'}`;

  return (
    <div className="performance-metric-summary">
      <div className="performance-overall-card">
        <div className="performance-overall-label">{overallLabel}</div>
        <div className="performance-overall-value">
          {overallScore}<span>/100</span>
        </div>
        <div className="performance-metric-helper">
          {overallHelper || (lessonsAnalyzed > 0 ? `Based on ${lessonLabel}` : 'No lessons analyzed yet')}
        </div>
      </div>

      <div className="performance-secondary-grid">
        {metrics.map((metric) => {
          const progress = metric.value ?? 0;
          return (
            <div
              key={metric.label}
              className="performance-secondary-card"
              style={{ '--metric-color': metric.color } as CSSProperties}
            >
              <div className="performance-secondary-label">{metric.label}</div>
              <div className="performance-secondary-value">
                {metric.value === null ? '—' : `${metric.value}%`}
              </div>
              <div className="performance-progress-track" aria-hidden="true">
                <div className="performance-progress-fill" style={{ width: `${progress}%` }} />
              </div>
              {metricHelper ? <div className="performance-metric-helper">{metricHelper}</div> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
