import { NextRequest } from "next/server";
import { unifiedSearch } from "@/lib/rapidapi";
import { analyzeFlights } from "@/lib/agent";

export const dynamic = "force-dynamic";

// Hard timeout for the entire search — 120 seconds max.
// Prevents the stream hanging forever when an API stalls mid-poll.
const SEARCH_TIMEOUT_MS = 120_000;

export async function POST(req: NextRequest) {
  const criteria = await req.json();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      function send(data: unknown) {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      function finish(data?: unknown) {
        if (closed) return;
        if (data) send(data);
        closed = true;
        controller.close();
      }

      // Hard timeout — fires if the whole search takes > 30s
      const timeout = setTimeout(() => {
        finish({
          type: "error",
          message: "CAUSE: TIMEOUT",
        });
      }, SEARCH_TIMEOUT_MS);

      try {
        const onStep = (msg: string) => send({ type: "log", message: msg });

        // Phase 1: Search
        onStep("Initiating live flight search across all providers...");
        const flights = await unifiedSearch(
          criteria.origin,
          criteria.destination,
          criteria.departureDate,
          criteria.returnDate,
          onStep
        );

        // BUG FIX: was `return Response.json(...)` which silently did nothing
        // inside a ReadableStream — stream never closed, causing infinite hang.
        if (!flights || flights.length === 0) {
          return finish({
            type: "error",
            message:
              "CAUSE: NO_RESULTS",
          });
        }

        // Phase 2: Gemini analysis
        onStep(`Found ${flights.length} flights. Agent is now strategically ranking the best options...`);
        const result = await analyzeFlights(flights, criteria);

        // Phase 3: Send result
        finish({ type: "result", ...result });
      } catch (error: unknown) {
        const msg =
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.";
        console.error("Streaming Search Error:", error);
        finish({ type: "error", message: msg });
      } finally {
        clearTimeout(timeout);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}