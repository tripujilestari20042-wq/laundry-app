import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import MonthlyReportView from '@/components/reports/MonthlyReportView';
import type { Profile } from '@/types';

export default async function AdminLaporanPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profileData } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const profile = profileData as Pick<Profile, 'role'> | null;
  if (profile?.role !== 'admin') redirect('/dashboard');

  return <MonthlyReportView />;
}
