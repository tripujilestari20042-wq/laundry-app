const EARTH_RADIUS_KM = 6371;

export interface Coordinates {
  lat: number;
  lng: number;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Haversine formula — calculates great-circle distance between two points.
 * @returns Distance in kilometers
 */
export function haversineDistance(from: Coordinates, to: Coordinates): number {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Round distance up to nearest 0.1 km for billing purposes.
 */
export function roundDistanceKm(distanceKm: number): number {
  return Math.ceil(distanceKm * 10) / 10;
}

/**
 * Calculate delivery fee based on distance.
 * Rp 2.000 per km (round-trip: pickup + delivery from store).
 */
export function calculateDeliveryFee(
  storeLocation: Coordinates,
  customerLocation: Coordinates,
  feePerKm: number
): { distanceKm: number; deliveryFee: number } {
  const oneWayKm = haversineDistance(storeLocation, customerLocation);
  const roundTripKm = roundDistanceKm(oneWayKm * 2);
  const deliveryFee = Math.ceil(roundTripKm) * feePerKm;

  return {
    distanceKm: roundDistanceKm(oneWayKm),
    deliveryFee,
  };
}

/**
 * Calculate total order amount.
 */
export function calculateOrderTotal(
  servicePrice: number,
  weightQty: number,
  deliveryFee: number
): { serviceCost: number; totalAmount: number } {
  const serviceCost = servicePrice * weightQty;
  const totalAmount = serviceCost + deliveryFee;

  return {
    serviceCost: Math.round(serviceCost),
    totalAmount: Math.round(totalAmount),
  };
}
