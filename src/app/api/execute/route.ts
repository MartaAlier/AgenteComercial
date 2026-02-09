export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { executeAgent, updateOKRProgress } from "@/lib/ai-engine";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const apiKey = body.apiKey || process.env.ANTHROPIC_API_KEY;
  const { agentId, instruction, rounds = 1 } = body;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Se requiere la API key de Anthropic" }), {
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
        const agents = agentId
          ? [await prisma.agent.findUnique({ where: { id: agentId } })]
          : await prisma.agent.findMany({ where: { status: "active" }, orderBy: { createdAt: "asc" } });

        const validAgents = agents.filter(Boolean);
        const totalSteps = validAgents.length * rounds;
        let completedSteps = 0;

        send({
          type: "start",
          totalAgents: validAgents.length,
          rounds,
          totalSteps,
        });

        for (let round = 1; round <= rounds; round++) {
          send({ type: "round_start", round, totalRounds: rounds });

          for (const agent of validAgents) {
            if (!agent) continue;

            send({
              type: "agent_start",
              round,
              agent: { id: agent.id, name: agent.name, role: agent.role, avatar: agent.avatar },
              progress: Math.round((completedSteps / totalSteps) * 100),
            });

            try {
              const result = await executeAgent(agent.id, apiKey, instruction);
              completedSteps++;

              send({
                type: "agent_done",
                round,
                agent: { id: agent.id, name: agent.name, avatar: agent.avatar },
                summary: result.summary,
                actionsCount: result.actions.length,
                actionsSuccess: result.actions.filter((a: any) => a.success).length,
                actions: result.actions,
                progress: Math.round((completedSteps / totalSteps) * 100),
              });
            } catch (err) {
              completedSteps++;
              send({
                type: "agent_error",
                round,
                agent: { id: agent.id, name: agent.name, avatar: agent.avatar },
                error: String(err),
                progress: Math.round((completedSteps / totalSteps) * 100),
              });
            }
          }

          // Update OKR progress after each round
          const okrStatus = await updateOKRProgress();
          send({ type: "round_end", round, okrProgress: okrStatus.avgProgress, okrsComplete: okrStatus.allComplete });
        }

        // Get final stats
        const [leadCount, logCount] = await Promise.all([
          prisma.lead.count(),
          prisma.activityLog.count(),
        ]);

        send({
          type: "complete",
          progress: 100,
          stats: { leads: leadCount, logs: logCount },
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
