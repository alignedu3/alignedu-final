import ProtectedPageState from '@/components/ProtectedPageState';

export default function DashboardLoading() {
  return (
    <ProtectedPageState
      mode="loading"
      title="Loading dashboard"
      message="Pulling together your lesson data, trend line, and recent feedback."
    />
  );
}
