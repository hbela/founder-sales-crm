import { env } from "../env.js";

export interface PlaceResult {
  googlePlaceId: string;
  brandName: string;
  address?: string;
  district?: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  businessStatus?: string;
}

export interface DiscoverInput {
  query: string;
  limit: number;
}

export interface DiscoverResult {
  results: PlaceResult[];
  simulated: boolean;
}

/** Extract a Budapest district (Roman numeral) from a formatted address, if present. */
function parseDistrict(address?: string): string | undefined {
  if (!address) return undefined;
  // Hungarian addresses encode the district in the postal code: 1XYZ where XY = district.
  const zip = address.match(/\b1(\d{2})\d\b/);
  if (zip?.[1]) {
    const n = Number(zip[1]);
    if (n >= 1 && n <= 23) return romanize(n);
  }
  // Or an explicit roman-numeral district token.
  const roman = address.match(/\b([IVXLC]+)\.\s*(ker|kerület)/i);
  if (roman?.[1]) return roman[1].toUpperCase();
  return undefined;
}

function romanize(num: number): string {
  const map: [number, string][] = [
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let n = num;
  let out = "";
  for (const [value, sym] of map) {
    while (n >= value) {
      out += sym;
      n -= value;
    }
  }
  return out;
}

/**
 * Discover clinics via Google Places Text Search (New). When no
 * GOOGLE_PLACES_API_KEY is configured, returns a small set of simulated
 * Budapest clinics so the flow works end-to-end in local dev.
 */
export async function discoverPlaces(input: DiscoverInput): Promise<DiscoverResult> {
  if (!env.googlePlacesApiKey) {
    return { results: simulatedClinics(input.limit), simulated: true };
  }

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": env.googlePlacesApiKey,
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.internationalPhoneNumber",
        "places.websiteUri",
        "places.rating",
        "places.userRatingCount",
        "places.businessStatus",
      ].join(","),
    },
    body: JSON.stringify({
      textQuery: input.query,
      maxResultCount: Math.min(input.limit, 20),
      // Restrict to dental practices so unrelated high-review businesses
      // (pools, public hospitals, diagnostic centers) are excluded server-side.
      includedType: "dentist",
      strictTypeFiltering: true,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Places ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { places?: GooglePlace[] };
  const results = (data.places ?? []).map(toPlaceResult);
  return { results, simulated: false };
}

interface GooglePlace {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
}

function toPlaceResult(p: GooglePlace): PlaceResult {
  return {
    googlePlaceId: p.id,
    brandName: p.displayName?.text ?? "Unknown clinic",
    address: p.formattedAddress,
    district: parseDistrict(p.formattedAddress),
    phone: p.internationalPhoneNumber,
    website: p.websiteUri,
    rating: p.rating,
    reviewCount: p.userRatingCount,
    businessStatus: p.businessStatus,
  };
}

/** Deterministic mock clinics for local dev without an API key. */
function simulatedClinics(limit: number): PlaceResult[] {
  const base: PlaceResult[] = [
    { googlePlaceId: "sim_place_buda_smile", brandName: "Buda Smile Dental", address: "1011 Budapest, Fő utca 12.", district: "I", phone: "+36 1 201 1111", website: "https://budasmile.hu", rating: 4.7, reviewCount: 212, businessStatus: "OPERATIONAL" },
    { googlePlaceId: "sim_place_pest_dental", brandName: "Pest Dental Center", address: "1052 Budapest, Váci utca 8.", district: "V", phone: "+36 1 202 2222", website: "https://pestdental.hu", rating: 4.5, reviewCount: 480, businessStatus: "OPERATIONAL" },
    { googlePlaceId: "sim_place_danube_ortho", brandName: "Danube Orthodontics", address: "1137 Budapest, Pozsonyi út 20.", district: "XIII", phone: "+36 1 203 3333", website: "https://danubeortho.hu", rating: 4.8, reviewCount: 96, businessStatus: "OPERATIONAL" },
    { googlePlaceId: "sim_place_castle_implant", brandName: "Castle Hill Implant Clinic", address: "1014 Budapest, Úri utca 5.", district: "I", phone: "+36 1 204 4444", website: "https://castleimplant.hu", rating: 4.9, reviewCount: 320, businessStatus: "OPERATIONAL" },
    { googlePlaceId: "sim_place_oktogon", brandName: "Oktogon Dental Care", address: "1066 Budapest, Teréz körút 30.", district: "VI", phone: "+36 1 205 5555", website: "https://oktogondental.hu", rating: 4.3, reviewCount: 150, businessStatus: "OPERATIONAL" },
    { googlePlaceId: "sim_place_gellert", brandName: "Gellért Dental Spa", address: "1118 Budapest, Kelenhegyi út 4.", district: "XI", phone: "+36 1 206 6666", website: "https://gellertdental.hu", rating: 4.6, reviewCount: 205, businessStatus: "OPERATIONAL" },
    { googlePlaceId: "sim_place_corvin", brandName: "Corvin Dental", address: "1082 Budapest, Üllői út 40.", district: "VIII", phone: "+36 1 207 7777", website: "https://corvindental.hu", rating: 4.4, reviewCount: 88, businessStatus: "OPERATIONAL" },
    { googlePlaceId: "sim_place_obuda", brandName: "Óbuda Family Dentistry", address: "1033 Budapest, Flórián tér 1.", district: "III", phone: "+36 1 208 8888", website: "https://obudadental.hu", rating: 4.2, reviewCount: 64, businessStatus: "OPERATIONAL" },
  ];
  return base.slice(0, Math.min(limit, base.length));
}
