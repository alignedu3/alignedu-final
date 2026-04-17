import ProtectedPageState from '@/components/ProtectedPageState';

export default function AdminLoading() {
  return (
    <ProtectedPageState
      mode="loading"
      title="Loading admin workspace"
      message="Preparing your admin tools, visibility scope, and instructional data."
    />
  );
}
