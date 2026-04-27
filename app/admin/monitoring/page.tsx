import dynamic from 'next/dynamic';

const MonitoringDashboardClient = dynamic(() => import('./MonitoringDashboardClient'), {
  ssr: false,
});

export default function MonitoringPage() {
  return <MonitoringDashboardClient />;
}
