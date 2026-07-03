const EARTH_RADIUS_KM = 6371;

export interface Coordinates {
  lat: number;
  lng: number;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

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

export function roundDistanceKm(distanceKm: number): number {
  return Math.ceil(distanceKm * 10) / 10;
}

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
