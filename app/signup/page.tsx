import { Suspense } from 'react';
import SignUpPage from '@/components/SignUpPage';

export default function SignUp() {
  return (
    <Suspense fallback={<main style={{ minHeight: '100vh' }} />}>
      <SignUpPage />
    </Suspense>
  );
}
