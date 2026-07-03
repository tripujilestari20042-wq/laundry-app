import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import {
  defaultStoreFromEnv,
  fetchActiveServices,
  fetchStoreSettings,
} from '@/lib/catalog';
import NewOrderForm from './NewOrderForm';

export default async function NewOrderPage() {
  const supabase = await createClient();

  const initialServices = await fetchActiveServices(supabase).catch(() => []);
  const storeFromDb = await fetchStoreSettings(supabase).catch(() => null);
  const initialStore = storeFromDb ?? defaultStoreFromEnv();

  return (
    <Suspense fallback={<div className="text-slate-400 py-12 text-center">Memuat...</div>}>
      <NewOrderForm initialServices={initialServices} initialStore={initialStore} />
    </Suspense>
  );
}
