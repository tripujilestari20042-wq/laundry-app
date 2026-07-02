import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PRICE_UNIT_LABELS, type Service } from '@/types';

export default async function ServicesCatalogPage() {
  const supabase = await createClient();
  const { data: servicesData } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('name');

  const services = (servicesData ?? []) as Service[];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Katalog Layanan</h1>
          <p className="text-gray-500 mt-1">Pilih layanan laundry yang Anda butuhkan</p>
        </div>
        <Link
          href="/orders/new"
          className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
        >
          Pesan Sekarang
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services?.map((service) => (
          <div key={service.id} className="bg-white rounded-xl border overflow-hidden hover:shadow-md transition-shadow">
            <div className="h-40 bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
              {service.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={service.image_url} alt={service.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-5xl">🧺</span>
              )}
            </div>
            <div className="p-5">
              <h3 className="font-semibold text-gray-900">{service.name}</h3>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{service.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-primary-700 font-bold">
                  Rp {service.price.toLocaleString('id-ID')}
                  <span className="text-sm font-normal text-gray-500">
                    /{PRICE_UNIT_LABELS[service.price_unit]}
                  </span>
                </p>
                <Link
                  href={`/orders/new?service=${service.id}`}
                  className="text-sm text-primary-600 hover:underline font-medium"
                >
                  Pesan →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
