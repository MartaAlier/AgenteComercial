export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { executeBatch } from "@/lib/ai-engine";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const apiKey = body.apiKey || process.env.ANTHROPIC_API_KEY;
  const { location, batch = 1 } = body;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Se requiere la API key de Anthropic" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!location) {
    return new Response(JSON.stringify({ error: "Se requiere una ubicación" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(data: any) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        send({ type: "start", location, batch });

        const result = await executeBatch(apiKey, location, batch, (event) => {
          send(event);
        });

        send({
          type: "complete",
          totalBatch: result.totalBatch,
          totalAll: result.totalAll,
          noMoreResults: result.noMoreResults,
        });
      } catch (err) {
        send({ type: "error", error: String(err) });
      } finally {
        controller.close();
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
