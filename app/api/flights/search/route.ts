import { NextRequest, NextResponse } from "next/server";
import { scrapeFlights } from "@/lib/scraper";
import { parseScrapedFlights } from "@/lib/agent";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const criteria = await req.json();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: any) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        const onStep = (msg: string) => send({ type: "log", message: msg });

        // Phase 1: Scrape
        const rawText = await scrapeFlights(
          criteria.origin, 
          criteria.destination, 
          criteria.departureDate, 
          onStep
        );

        // Phase 2: Parse with Gemini
        onStep("Analyzing live data and identifying best value...");
        const result = await parseScrapedFlights(rawText, criteria);

        // Phase 3: Send Final Results
        send({ type: "result", ...result });
        
        controller.close();
      } catch (error: any) {
        console.error("Streaming Search Error:", error);
        send({ type: "error", message: error.message || "An unexpected error occurred during the live search." });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
