import LoginForm from './LoginForm';

interface LoginPageProps {
  searchParams: Promise<{
    error?: string;
    hint?: string;
    redirect?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  const initialError =
    params.error === 'auth_callback_failed'
      ? params.hint || 'Autentikasi Google gagal. Silakan coba lagi.'
      : null;

  return <LoginForm initialError={initialError} redirectTo={params.redirect ?? null} />;
}
