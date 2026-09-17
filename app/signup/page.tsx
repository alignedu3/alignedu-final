import SignUpPage from '@/components/SignUpPage';

type SignUpRouteProps = {
  searchParams: Promise<{
    checkout_session_id?: string | string[];
  }>;
};

export default async function SignUp({ searchParams }: SignUpRouteProps) {
  const params = await searchParams;
  const rawSessionId = params.checkout_session_id;
  const checkoutSessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId || null;

  return <SignUpPage checkoutSessionId={checkoutSessionId} />;
}
