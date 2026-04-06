import { NextResponse } from "next/server";
import { searchFlightsWithAgent, SearchCriteria } from "@/lib/agent";

export async function POST(req: Request) {
  try {
    const criteria: SearchCriteria = await req.json();
    
    if (!criteria.origin || !criteria.destination || !criteria.departureDate) {
      return NextResponse.json({ error: "Missing required search fields." }, { status: 400 });
    }

    const result = await searchFlightsWithAgent(criteria);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("API Flights Error:", error);
    return NextResponse.json({ error: error.message || "Failed to search flights." }, { status: 500 });
  }
}
