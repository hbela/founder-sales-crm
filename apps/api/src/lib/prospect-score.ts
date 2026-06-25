/**
 * Clinic fit score (0–100) for the Sunshine Dental campaign. Capacity signals
 * (dentists, locations, reviews, online booking) matter more than raw company
 * headcount — see docs/prospecting-module.md.
 */
export function calculateClinicSizeScore(input: {
  employees?: number | null;
  dentists?: number | null;
  locations?: number | null;
  reviews?: number | null;
  hasOnlineBooking?: boolean | null;
}): number {
  const employeeScore = Math.min(input.employees ?? 0, 30);
  const dentistScore = Math.min((input.dentists ?? 0) * 5, 30);
  const locationScore = Math.min((input.locations ?? 1) * 8, 24);
  const reviewScore = Math.min(Math.floor((input.reviews ?? 0) / 25), 10);
  const bookingScore = input.hasOnlineBooking ? 6 : 0;

  return Math.min(employeeScore + dentistScore + locationScore + reviewScore + bookingScore, 100);
}
