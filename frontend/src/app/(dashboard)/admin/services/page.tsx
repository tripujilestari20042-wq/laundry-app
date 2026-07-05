import AdminServicesManager from '@/components/admin/AdminServicesManager';
import { BRAND } from '@/lib/brand';

export const metadata = {
  title: `Kelola Layanan — Admin ${BRAND.name}`,
};

export default function AdminServicesPage() {
  return <AdminServicesManager />;
}
