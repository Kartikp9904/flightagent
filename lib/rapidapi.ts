import axios from "axios";
import { Flight } from "./agent";
import { buildBookingLink } from "./bookingLinks";

const RAPID_API_KEY = process.env.RAPID_API_KEY;
const TRIPADVISOR_HOST = process.env.TRIPADVISOR_HOST;
const KAYAK_HOST = process.env.KAYAK_HOST;
const FLIGHT_API_KEY = process.env.FLIGHT_API_KEY;

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

/* ---------------- TRIPADVISOR ---------------- */

export async function fetchTripAdvisorFlights(
  origin: string,
  destination: string,
  date: string,
  isRoundTrip: boolean = false,
  onProgress?: (msg: string) => void,
  returnDate?: string
): Promise<Flight[]> {
  if (!RAPID_API_KEY || !TRIPADVISOR_HOST) {
    throw new Error("TripAdvisor API credentials missing");
  }

  const endpoint = isRoundTrip ? "search-roundtrip" : "search-one-way";
  const url = `https://${TRIPADVISOR_HOST}/flights/${endpoint}`;

  try {
    const log = (msg: string) => {
      console.log(msg);
      if (onProgress) onProgress(msg);
    };

    log(`TripAdvisor: Initiating search for ${origin} -> ${destination}...`);

    let response = await axios.get(url, {
      params: { airportFrom: origin, airportTo: destination, departDate: date, adults: 1, currency: "USD" },
      headers: { "x-rapidapi-key": RAPID_API_KEY, "x-rapidapi-host": TRIPADVISOR_HOST },
    });

    let data = response.data;
    let searchKey = data.meta?.searchKey;

    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const isComplete = data.meta?.isComplete === true || data.meta?.isComplete === "true";
      const hasResults = (data.data?.itineraries?.length || 0) > 0;

      if (isComplete && hasResults) {
        log(`TripAdvisor: Search complete. Found ${data.data.itineraries.length} flights.`);
        break;
      }

      log(`TripAdvisor: Polling for results (Attempt ${attempts + 1}/${maxAttempts})...`);
      await delay(3000);

      response = await axios.get(url, {
        params: { airportFrom: origin, airportTo: destination, departDate: date, searchKey, adults: 1, currency: "USD" },
        headers: { "x-rapidapi-key": RAPID_API_KEY, "x-rapidapi-host": TRIPADVISOR_HOST },
      });

      data = response.data;
      searchKey = data.meta?.searchKey ?? searchKey;
      attempts++;
    }

    const items = data.data?.itineraries || data.data || [];

    return items
      .map((item: any, index: number) => {
        const leg = item.legs?.[0] || {};
        const price = item.purchaseLinks?.[0]?.totalPrice;
        if (!price || price <= 0) return null;

        const airlineName =
          leg.segments?.[0]?.marketingCarrier?.name ||
          item.brand?.name ||
          "Multiple Airlines";

        return {
          id: `ta-${item.id ?? index}-${searchKey ?? Date.now()}`,
          airline: airlineName,
          flightNumber: leg.segments?.[0]?.flightNumber || "TA-MULT",
          departureTime: leg.departureDateTime || date,
          arrivalTime: leg.arrivalDateTime || "N/A",
          duration: leg.durationDisplay || "N/A",
          stops: (leg.segments?.length || 1) - 1,
          stopLocations: leg.segments?.slice(0, -1).map((s: any) => s.arrivalAirportCode) || [],
          price,
          currency: item.purchaseLinks?.[0]?.currency || "USD",
          bookingLink: buildBookingLink({ airline: airlineName, origin, destination, date, returnDate }),
          baggageInfo: "Check airline for baggage info",
        };
      })
      .filter(Boolean) as Flight[];
  } catch (error: any) {
    console.error("TripAdvisor API Error:", error?.response?.status || error.message);
    return [];
  }
}

/* ---------------- FLIGHTAPI.IO ---------------- */

export async function fetchFlightApiFlights(
  origin: string,
  destination: string,
  date: string,
  isRoundTrip: boolean = false,
  onProgress?: (msg: string) => void,
  returnDate?: string
): Promise<Flight[]> {
  if (!FLIGHT_API_KEY) throw new Error("FlightAPI.io key missing");

  const cabinClass = "Economy";
  const currency = "USD";
  const url =
    isRoundTrip && returnDate
      ? `https://api.flightapi.io/roundtrip/${FLIGHT_API_KEY}/${origin}/${destination}/${date}/${returnDate}/1/0/0/${cabinClass}/${currency}`
      : `https://api.flightapi.io/onewaytrip/${FLIGHT_API_KEY}/${origin}/${destination}/${date}/1/0/0/${cabinClass}/${currency}`;

  try {
    if (onProgress) onProgress("FlightAPI.io: Consulting regional providers...");

    const response = await axios.get(url);
    const data = response.data;

    if (!data.itineraries || data.itineraries.length === 0) return [];
    if (!Array.isArray(data.legs) || !Array.isArray(data.segments)) {
      console.warn("FlightAPI.io: Missing legs or segments — skipping.");
      return [];
    }

    // BUG FIX 1: carrier IDs are negative integers (e.g. -32672).
    // Key the map by number so lookups match leg.marketing_carrier_ids[0].
    const carrierMap = new Map<number, string>();
    data.carriers?.forEach((c: any) => {
      if (c.id !== undefined) carrierMap.set(Number(c.id), c.name ?? "Unknown Airline");
    });

    // Place IDs are also integers — key by number.
    const placeMap = new Map<number, string>();
    data.places?.forEach((p: any) => {
      if (p.id !== undefined) placeMap.set(Number(p.id), p.name || p.display_code || p.iata || "");
    });

    // Build a fast segment lookup by id.
    const segmentMap = new Map<string, any>();
    data.segments?.forEach((s: any) => { if (s.id) segmentMap.set(s.id, s); });

    return data.itineraries
      .map((itin: any) => {
        const legId = itin.leg_ids?.[0];
        const leg = data.legs.find((l: any) => l.id === legId);
        if (!leg) return null;

        // BUG FIX 3: use segment lookup map for O(1) access
        const firstSegment = segmentMap.get(leg.segment_ids?.[0]) || {};

        const pricing = itin.pricing_options?.[0] || {};
        // price lives at pricing_options[0].price.amount (confirmed from debug)
        const price = pricing.price?.amount ?? itin.cheapest_price?.amount;
        if (!price || price <= 0) return null;

        // BUG FIX 1: cast to Number before map lookup
        const carrierId = Number(leg.marketing_carrier_ids?.[0]);
        const airlineName = carrierMap.get(carrierId) || "Unknown Airline";

        // BUG FIX 4: segment uses marketing_carrier_id (singular), not plural
        const flightNumber = firstSegment.marketing_flight_number
          ? `${carrierMap.get(Number(firstSegment.marketing_carrier_id)) ?? ""} ${firstSegment.marketing_flight_number}`.trim()
          : "FA-MULT";

        // BUG FIX 2: stop_ids is array-of-arrays [[10957],[10337]] — flatten first
        const stopLocations = (leg.stop_ids ?? [])
          .flat()
          .map((id: any) => placeMap.get(Number(id)) ?? String(id))
          .filter(Boolean);

        return {
          id: `fa-${itin.id}`,
          airline: airlineName,
          flightNumber,
          departureTime: leg.departure || date,
          arrivalTime: leg.arrival || "N/A",
          // duration is in minutes (e.g. 3160 min) — convert to h m
          duration: leg.duration
            ? `${Math.floor(leg.duration / 60)}h ${leg.duration % 60}m`
            : "N/A",
          stops: leg.stop_count || 0,
          stopLocations,
          price,
          currency: pricing.price?.currency || "USD",
          bookingLink: buildBookingLink({ airline: airlineName, origin, destination, date, returnDate }),
          baggageInfo: "See provider details",
        };
      })
      .filter(Boolean) as Flight[];
  } catch (error: any) {
    console.error("FlightAPI.io Error:", error.message);
    return [];
  }
}

/* ---------------- KAYAK ---------------- */

export async function fetchKayakFlights(
  origin: string,
  destination: string,
  date: string,
  returnDate?: string,
  onProgress?: (msg: string) => void
): Promise<Flight[]> {
  if (!RAPID_API_KEY || !KAYAK_HOST) throw new Error("Kayak API credentials missing");

  const url = `https://${KAYAK_HOST}/search-flights`;
  const MAX_RETRIES = 2;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (onProgress) onProgress(`Kayak: Searching deal attempt ${attempt + 1}...`);
      await delay(1000);

      const body: Record<string, any> = {
        origin,
        destination,
        departure_date: date,
        filterParams: { fs: "cabin=e" },
        searchMetaData: { pageNumber: 1, priceMode: "per-person" },
        userSearchParams: { passengers: ["ADT"], sortMode: "price_a" },
      };
      if (returnDate) body.return_date = returnDate;

      const response = await axios.post(url, body, {
        headers: {
          "x-rapidapi-key": RAPID_API_KEY,
          "x-rapidapi-host": KAYAK_HOST,
          "Content-Type": "application/json",
        },
      });

      const items = response.data?.data?.results || response.data?.results || [];

      return items
        .map((item: any, index: number) => {
          const itin = item.itinerary || item;
          const leg = itin.legs?.[0] || {};
          const price = itin.price?.amount || itin.price;
          if (!price || price <= 0) return null;

          const airlineName = itin.airline || leg.airline || "Unknown Airline";

          return {
            id: `ky-${itin.id || index}-${Date.now()}`,
            airline: airlineName,
            flightNumber: itin.flightNumber || leg.flightNumber || "KY-MULT",
            departureTime: leg.departure?.time || leg.departureTime || date,
            arrivalTime: leg.arrival?.time || leg.arrivalTime || "N/A",
            duration: itin.durationDisplay || leg.duration || "N/A",
            stops: itin.stops?.[0] || leg.stops || 0,
            stopLocations: [],
            price,
            currency: itin.price?.currency || "USD",
            bookingLink: buildBookingLink({ airline: airlineName, origin, destination, date, returnDate }),
            baggageInfo: "Standard baggage",
          };
        })
        .filter(Boolean) as Flight[];
    } catch (error: any) {
      if (error?.response?.status === 429) {
        console.log(`Kayak 429 → retrying (${attempt + 1})...`);
        await delay(3000);
        continue;
      }
      console.log("Kayak failed:", error.message);
      break;
    }
  }

  return [];
}

/* ---------------- UNIFIED SEARCH ---------------- */

export async function unifiedSearch(
  origin: string,
  destination: string,
  date: string,
  returnDate?: string,
  onProgress?: (msg: string) => void
): Promise<Flight[]> {
  if (onProgress) onProgress("Searching TripAdvisor and FlightAPI.io for best rates...");

  const [taSettled, faSettled] = await Promise.allSettled([
    fetchTripAdvisorFlights(origin, destination, date, !!returnDate, onProgress, returnDate),
    fetchFlightApiFlights(origin, destination, date, !!returnDate, onProgress, returnDate),
  ]);

  const taResults = taSettled.status === "fulfilled" ? taSettled.value : [];
  const faResults = faSettled.status === "fulfilled" ? faSettled.value : [];

  if (taSettled.status === "rejected") console.error("TripAdvisor failed:", taSettled.reason);
  if (faSettled.status === "rejected") console.error("FlightAPI.io failed:", faSettled.reason);

  let combined = [...taResults, ...faResults];

  if (combined.length === 0) {
    if (onProgress) onProgress("Primary providers returned no results, attempting Kayak...");
    try {
      combined = await fetchKayakFlights(origin, destination, date, returnDate, onProgress);
    } catch {
      if (onProgress) onProgress("All search providers currently unavailable.");
    }
  }

  return combined.sort((a, b) => a.price - b.price);
}