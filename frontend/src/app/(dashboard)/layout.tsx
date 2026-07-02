import { createClient } from '@/lib/supabase/server';
import DashboardChromeWithToast from '@/components/layout/DashboardChromeWithToast';
import type { UserRole, Profile } from '@/types';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profileData } = user
    ? await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
    : { data: null };

  const profile = profileData as Pick<Profile, 'role' | 'full_name'> | null;

  return (
    <DashboardChromeWithToast
      role={(profile?.role as UserRole) || 'pelanggan'}
      fullName={profile?.full_name}
    >
      {children}
    </DashboardChromeWithToast>
  );
}
