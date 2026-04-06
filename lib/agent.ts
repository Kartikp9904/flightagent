import { GoogleGenerativeAI } from "@google/generative-ai";

console.log("GEMINI_API_KEY Present:", !!process.env.GEMINI_API_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Using gemini-2.5-flash as requested and verified by our diagnostics.
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
} as any);

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

export async function parseScrapedFlights(
  scrapedData: string,
  criteria: SearchCriteria
): Promise<{ flights: Flight[], agentInsight: string }> {
  // CRITICAL: Strict sorting priority requested by the user.
  // 1. Cheapest 0-stop flights
  // 2. Cheapest 1-stop flights
  // 3. Overall cheapest
  const prompt = `
    You are a professional flight data extraction expert. 
    TASK: Analyze the RAW WEB TEXT provided below and extract the best current flight options.
    
    Travel Details:
    - Origin: ${criteria.origin}
    - Destination: ${criteria.destination}
    - Date: ${criteria.departureDate}

    RAW WEB TEXT (Scraped row-by-row):
    """
    ${scrapedData.substring(0, 30000)}
    """

    STRICT ROW-BY-ROW RULES (MANDATORY):
    1. The raw text is delineated by '====FLIGHT_ROW===='.
    2. PRICE INTEGRITY: Only extract a price if it is found WITHIN the specific '====FLIGHT_ROW====' block for that flight.
    3. NEVER use a price from the top of the search page or a 'Cheapest from' header. 
    4. CURRENCY: Detect and keep the exact currency symbol (e.g., ₹, $, €, £).
    
    SORTING RULES:
    1. PRIORITY 1: Find and list all CHEAPEST 0-STOP (Direct) flights first.
    2. PRIORITY 2: Then list the CHEAPEST 1-STOP flights.
    3. PRIORITY 3: Overall cheapest available.
    
    DATA EXTRACTION:
    - Extract ALL valid flight options found in the text segments.
    
    RETURN ONLY A VALID JSON OBJECT:
    {
      "flights": [
        {
          "id": "string",
          "airline": "string",
          "flightNumber": "string",
          "departureTime": "ISO String",
          "arrivalTime": "ISO String",
          "duration": "string",
          "stops": number,
          "stopLocations": ["string"],
          "price": number,
          "currency": "USD",
          "bookingLink": "URL to the search page or airline",
          "baggageInfo": "string",
          "isCheapest": boolean,
          "isBestValue": boolean,
          "agentReasoning": "Specifically state why this fulfills the '0-stop first' or 'Cheapest 1-stop' priority rule."
        }
      ],
      "agentInsight": "Expert summary of the live flight market for this route based on the scraped data."
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    console.log("Gemini Live Data Parsing Output:", text);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Agent failed to parse the live scraping results.");

    return JSON.parse(jsonMatch[0]);
  } catch (error: any) {
    console.error("Gemini Data Parsing Error:", error);

    // Auto-fallback suggestion for invalid model version or quota
    if (error.message?.includes("429") || error.message?.includes("quota")) {
      throw new Error("CAUSE: QUOTA");
    }
    if (error.message?.includes("404") || error.message?.includes("not found")) {
      throw new Error("CAUSE: MODEL");
    }

    throw new Error(error.message || "CAUSE: UNKNOWN");
  }
}
