import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildBookingLink } from "./bookingLinks";

console.log("GEMINI_API_KEY Present:", !!process.env.GEMINI_API_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export interface Flight {
  id: string;
  airline: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number;
  stopLocations: string[];
  price: number;
  currency: string;
  bookingLink: string;
  baggageInfo: string;
  isCheapest?: boolean;
  isBestValue?: boolean;
  agentReasoning?: string;
}

export interface SearchCriteria {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  cabinClass: string;
  budget?: number;
  maxStops?: number;
}

/**
 * Strip fields that are heavy on tokens and that Gemini should never touch.
 * bookingLink is ALWAYS built by buildBookingLink — never from AI output.
 */
function toPromptFlights(flights: Flight[]) {
  return flights.map(({ bookingLink: _bl, baggageInfo: _bi, stopLocations: _sl, ...rest }) => rest);
}

export async function analyzeFlights(
  flights: Flight[],
  criteria: SearchCriteria
): Promise<{ flights: Flight[]; agentInsight: string }> {
  // Sort and slice: only send top 25 to Gemini to keep tokens and analysis time low.
  const flightsForPrompt = toPromptFlights(
    flights.sort((a, b) => a.price - b.price).slice(0, 25)
  );

  const prompt = `
You are a professional travel advisor.
TASK: Analyze the flight results below and return your top recommendations.

Travel Details:
- Origin: ${criteria.origin}
- Destination: ${criteria.destination}
- Date: ${criteria.departureDate}
${criteria.returnDate ? `- Return: ${criteria.returnDate}` : ""}

FLIGHT DATA (JSON):
"""
${JSON.stringify(flightsForPrompt)}
"""

STRICT ANALYSIS RULES:
1. SORTING:
   - Find the CHEAPEST 0-STOP flight first.
   - Then the CHEAPEST 1-STOP flight.
   - Then the OVERALL BEST VALUE flight (price + duration + convenience).
2. Limit output to the best 10 flights.
3. Be specific in agentReasoning — reference actual prices and times.

CRITICAL FORMATTING RULES:
- Return ONLY a raw JSON object.
- Do NOT use markdown, backticks, or code fences of any kind.
- Do NOT include any text before or after the JSON.

JSON shape:
{
  "flights": [
    {
      "id": "string",
      "airline": "string",
      "flightNumber": "string",
      "departureTime": "ISO string",
      "arrivalTime": "ISO string",
      "duration": "string",
      "stops": number,
      "price": number,
      "currency": "string",
      "isCheapest": boolean,
      "isBestValue": boolean,
      "agentReasoning": "string"
    }
  ],
  "agentInsight": "string"
}
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    console.log("Gemini raw output:", text);

    // Strip any accidental markdown fences
    const cleaned = text
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/gi, "")
      .trim();

    // Brace-counting parser — immune to trailing text after closing }
    let depth = 0;
    let start = -1;
    let end = -1;

    for (let i = 0; i < cleaned.length; i++) {
      if (cleaned[i] === "{") {
        if (start === -1) start = i;
        depth++;
      } else if (cleaned[i] === "}") {
        depth--;
        if (depth === 0 && start !== -1) { end = i; break; }
      }
    }

    if (start === -1 || end === -1) {
      throw new Error("Agent failed to return a valid JSON object.");
    }

    const parsed = JSON.parse(cleaned.slice(start, end + 1));

    // Validate shape
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Gemini returned an unexpected non-object response.");
    }
    if (!Array.isArray(parsed.flights)) {
      console.warn("Gemini missing 'flights' array — defaulting to empty.");
      parsed.flights = [];
    }
    if (typeof parsed.agentInsight !== "string") {
      parsed.agentInsight = "No insight available.";
    }

    // Re-attach fields Gemini never saw — bookingLink is ALWAYS from buildBookingLink
    const originalMap = new Map(flights.map(f => [f.id, f]));

    parsed.flights = (parsed.flights as Flight[]).map((f: Flight) => {
      const original = originalMap.get(f.id);

      // Always rebuild the booking link from scratch to guarantee it's correct
      const bookingLink = buildBookingLink({
        airline: f.airline || original?.airline || "",
        origin: criteria.origin,
        destination: criteria.destination,
        date: criteria.departureDate,
        returnDate: criteria.returnDate,
        passengers: criteria.passengers,
        cabinClass: criteria.cabinClass,
      });

      return {
        ...f,
        bookingLink,
        baggageInfo: original?.baggageInfo ?? "Check airline for details",
        stopLocations: original?.stopLocations ?? [],
      };
    });

    return parsed as { flights: Flight[]; agentInsight: string };
  } catch (error: unknown) {
    console.error("Gemini Error:", error);
    const msg = error instanceof Error ? error.message : String(error);

    if (msg.includes("429") || msg.includes("quota")) throw new Error("CAUSE: QUOTA");
    if (msg.includes("404") || msg.includes("not found")) throw new Error("CAUSE: MODEL");
    if (msg.includes("ENOTFOUND") || msg.includes("ECONNREFUSED") || msg.includes("timeout"))
      throw new Error("CAUSE: NETWORK");
    if (msg.includes("JSON") || msg.includes("valid JSON")) throw new Error("CAUSE: PARSE");

    throw new Error(`CAUSE: UNKNOWN — ${msg}`);
  }
}