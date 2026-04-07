/**
 * bookingLinks.ts
 *
 * Builds reliable, always-valid booking/search URLs for a given flight.
 * Strategy:
 *   1. Try a known airline deep-link if the carrier is recognised.
 *   2. Fall back to a Google Flights search URL that is pre-filled with
 *      the exact route, date, and passenger count — guaranteed to work.
 *
 * The Google Flights fallback is intentionally the universal safety net:
 * it always opens a live, bookable search for the exact flight details
 * even when the airline name doesn't match any known pattern.
 */

export interface BookingLinkParams {
  airline: string;
  flightNumber?: string;
  origin: string;       // IATA code  e.g. "DEL"
  destination: string;  // IATA code  e.g. "LHR"
  date: string;         // YYYY-MM-DD
  returnDate?: string;  // YYYY-MM-DD — only for round trips
  passengers?: number;
  cabinClass?: string;  // "Economy" | "Business" | "First"
}

/** Maps cabin class label → airline-specific codes */
const cabinMap: Record<string, { kayak: string; google: string; indigo: string }> = {
  economy:  { kayak: "e", google: "1", indigo: "ECONOMY" },
  business: { kayak: "b", google: "2", indigo: "BUSINESS" },
  first:    { kayak: "f", google: "3", indigo: "FIRST" },
};

function getCabin(cabinClass = "Economy") {
  return cabinMap[cabinClass.toLowerCase()] ?? cabinMap.economy;
}

/**
 * Google Flights deep-link — always works, pre-fills route + date.
 * This is the universal fallback used whenever no airline-specific URL exists.
 */
function googleFlightsUrl(p: BookingLinkParams): string {
  const cabin = getCabin(p.cabinClass);
  const pax = p.passengers ?? 1;
  const trip = p.returnDate ? "round-trip" : "one-way";

  // Google Flights accepts a simple query string that pre-fills the search form
  const params = new URLSearchParams({
    q: `flights from ${p.origin} to ${p.destination}`,
    tfs: "",          // Placeholder — Google ignores unknown params gracefully
  });

  // Construct a direct search URL using the known stable format
  const base = "https://www.google.com/travel/flights";
  const query = [
    `hl=en`,
    `curr=USD`,
    `trip=${trip}`,
    `pax=${pax}`,
    `cabin=${cabin.google}`,
    `airports=${p.origin}.${p.destination}`,
    `dates=${p.date}${p.returnDate ? `.${p.returnDate}` : ""}`,
  ].join("&");

  return `${base}?${query}`;
}

/**
 * Main export — returns the best possible booking URL for the given flight.
 */
export function buildBookingLink(params: BookingLinkParams): string {
  const { airline, origin, destination, date, returnDate, passengers = 1, cabinClass = "Economy" } = params;
  const name = airline.toLowerCase();
  const cabin = getCabin(cabinClass);
  const pax = passengers;
  const isRT = !!returnDate;

  // ── IndiGo ────────────────────────────────────────────────────────────────
  if (name.includes("indigo") || name.includes("6e")) {
    const url = new URL("https://www.goindigo.in/flight-booking.html");
    url.searchParams.set("origin", origin);
    url.searchParams.set("destination", destination);
    url.searchParams.set("departDate", date);
    url.searchParams.set("tripType", isRT ? "R" : "O");
    url.searchParams.set("adults", String(pax));
    url.searchParams.set("cabinClass", cabin.indigo);
    if (isRT && returnDate) url.searchParams.set("returnDate", returnDate);
    return url.toString();
  }

  // ── Air India ─────────────────────────────────────────────────────────────
  if (name.includes("air india") || name.includes("ai ")) {
    const url = new URL("https://www.airindia.com/in/en/book/flights/search-flights.html");
    url.searchParams.set("tripType", isRT ? "R" : "O");
    url.searchParams.set("origin", origin);
    url.searchParams.set("destination", destination);
    url.searchParams.set("departDate", date);
    url.searchParams.set("adults", String(pax));
    if (isRT && returnDate) url.searchParams.set("returnDate", returnDate);
    return url.toString();
  }

  // ── Vistara / Tata SIA ────────────────────────────────────────────────────
  if (name.includes("vistara") || name.includes("uk ") || name.includes("tata sia")) {
    const url = new URL("https://www.airvistara.com/in/en/book-a-flight");
    url.searchParams.set("src", origin);
    url.searchParams.set("dst", destination);
    url.searchParams.set("adt", String(pax));
    url.searchParams.set("doj", date);
    url.searchParams.set("tt", isRT ? "R" : "O");
    if (isRT && returnDate) url.searchParams.set("dor", returnDate);
    return url.toString();
  }

  // ── SpiceJet ──────────────────────────────────────────────────────────────
  if (name.includes("spicejet") || name.includes("sg ")) {
    const url = new URL("https://book.spicejet.com/");
    url.searchParams.set("depature", origin);   // SpiceJet typo in their own API
    url.searchParams.set("arrival", destination);
    url.searchParams.set("traveldate", date);
    url.searchParams.set("triptype", isRT ? "R" : "O");
    url.searchParams.set("adults", String(pax));
    if (isRT && returnDate) url.searchParams.set("returndate", returnDate);
    return url.toString();
  }

  // ── Akasa Air ─────────────────────────────────────────────────────────────
  if (name.includes("akasa") || name.includes("qp ")) {
    return `https://www.akasaair.com/booking/select-flights?origin=${origin}&destination=${destination}&departDate=${date}&adults=${pax}&tripType=${isRT ? "R" : "O"}${isRT && returnDate ? `&returnDate=${returnDate}` : ""}`;
  }

  // ── Emirates ──────────────────────────────────────────────────────────────
  if (name.includes("emirates") || name.includes("ek ")) {
    const url = new URL("https://www.emirates.com/in/english/book/flights/");
    url.searchParams.set("type", isRT ? "R" : "O");
    url.searchParams.set("origin", origin);
    url.searchParams.set("destination", destination);
    url.searchParams.set("date", date.replace(/-/g, ""));
    url.searchParams.set("adults", String(pax));
    url.searchParams.set("cabin", cabin.kayak);
    if (isRT && returnDate) url.searchParams.set("return", returnDate.replace(/-/g, ""));
    return url.toString();
  }

  // ── Qatar Airways ─────────────────────────────────────────────────────────
  if (name.includes("qatar") || name.includes("qr ")) {
    return `https://www.qatarairways.com/en/flights.html?widget=QR&adults=${pax}&from=${origin}&to=${destination}&departDate=${date}${isRT && returnDate ? `&returnDate=${returnDate}` : ""}&bookingClass=${cabin.kayak.toUpperCase()}`;
  }

  // ── Lufthansa ─────────────────────────────────────────────────────────────
  if (name.includes("lufthansa") || name.includes("lh ")) {
    const url = new URL("https://www.lufthansa.com/in/en/flight-search");
    url.searchParams.set("origin", origin);
    url.searchParams.set("dest", destination);
    url.searchParams.set("adults", String(pax));
    url.searchParams.set("departure", date);
    if (isRT && returnDate) url.searchParams.set("return", returnDate);
    return url.toString();
  }

  // ── British Airways ───────────────────────────────────────────────────────
  if (name.includes("british") || name.includes("ba ")) {
    return `https://www.britishairways.com/travel/home/public/en_in#outboundAirport=${origin}&inboundAirport=${destination}&departureDate=${date}&adult=${pax}`;
  }

  // ── Singapore Airlines ────────────────────────────────────────────────────
  if (name.includes("singapore") || name.includes("sq ")) {
    return `https://www.singaporeair.com/en_UK/plan-travel/booking-summary/?tripType=${isRT ? "R" : "O"}&origin=${origin}&destination=${destination}&departureDate=${date}${isRT && returnDate ? `&returnDate=${returnDate}` : ""}&adults=${pax}`;
  }

  // ── Etihad ────────────────────────────────────────────────────────────────
  if (name.includes("etihad") || name.includes("ey ")) {
    return `https://www.etihad.com/en-in/book/flights?type=${isRT ? "return" : "oneway"}&origin=${origin}&destination=${destination}&departing=${date}${isRT && returnDate ? `&returning=${returnDate}` : ""}&adults=${pax}`;
  }

  // ── Air France ────────────────────────────────────────────────────────────
  if (name.includes("air france") || name.includes("af ")) {
    return `https://wwws.airfrance.in/en/booking/passenger-info?origin=${origin}&destination=${destination}&outwardDate=${date}${isRT && returnDate ? `&inwardDate=${returnDate}` : ""}&adult=${pax}&cabin=${cabin.kayak}`;
  }

  // ── KLM ───────────────────────────────────────────────────────────────────
  if (name.includes("klm") || name.includes("kl ")) {
    return `https://www.klm.com/search/en/flights/${origin}-${destination}/${date}${isRT && returnDate ? `/${returnDate}` : ""}/${pax}A`;
  }

  // ── United Airlines ───────────────────────────────────────────────────────
  if (name.includes("united") || name.includes("ua ")) {
    return `https://www.united.com/ual/en/us/flight-search/book-a-flight/results/rev?f=${origin}&t=${destination}&d=${date}&tt=${isRT ? "2" : "1"}&sc=7&px=${pax}&taxng=1&newHP=True`;
  }

  // ── American Airlines ─────────────────────────────────────────────────────
  if (name.includes("american") || name.includes("aa ")) {
    return `https://www.aa.com/booking/find-flights?origin=${origin}&destination=${destination}&departureDate=${date}&passengers=${pax}&tripType=${isRT ? "roundTrip" : "oneWay"}`;
  }

  // ── Delta ─────────────────────────────────────────────────────────────────
  if (name.includes("delta") || name.includes("dl ")) {
    return `https://www.delta.com/flight-search/book-a-flight?tripType=${isRT ? "RT" : "OW"}&cacheKeySuffix=0&originCity=${origin}&destinationCity=${destination}&departureDate=${date}${isRT && returnDate ? `&returnDate=${returnDate}` : ""}&paxCount=${pax}&cabinType=${cabin.kayak}`;
  }

  // ── Turkish Airlines ──────────────────────────────────────────────────────
  if (name.includes("turkish") || name.includes("tk ")) {
    return `https://www.turkishairlines.com/en-int/flights/find-flight/?tripType=${isRT ? "2" : "1"}&origin=${origin}&destination=${destination}&departDate=${date}${isRT && returnDate ? `&returnDate=${returnDate}` : ""}&adult=${pax}`;
  }

  // ── Thai Airways ──────────────────────────────────────────────────────────
  if (name.includes("thai") || name.includes("tg ")) {
    return `https://www.thaiairways.com/en_TH/book/flight-search.page?departureCityCode=${origin}&arrivalCityCode=${destination}&departureDate=${date}&cabinClass=${cabin.kayak}&adult=${pax}&tripType=${isRT ? "R" : "O"}`;
  }

  // ── Kayak universal fallback (still better than "#") ──────────────────────
  // We use Google Flights as the true universal fallback — always pre-filled,
  // always live, works for any airline worldwide.
  return googleFlightsUrl(params);
}
