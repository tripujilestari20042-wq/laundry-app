export interface GeocodingResult {
  lat: number;
  lng: number;
  address: string;
  placeId: string;
}

interface NominatimItem {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

export async function searchAddresses(
  query: string,
  options?: { limit?: number; countryCode?: string }
): Promise<GeocodingResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const params = new URLSearchParams({
    q: trimmed,
    format: 'json',
    addressdetails: '0',
    limit: String(options?.limit ?? 5),
    countrycodes: options?.countryCode ?? 'id',
  });

  const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'id',
    },
  });

  if (!response.ok) {
    throw new Error('Gagal mencari alamat');
  }

  const items = (await response.json()) as NominatimItem[];

  return items.map((item) => ({
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    address: item.display_name,
    placeId: String(item.place_id),
  }));
}
