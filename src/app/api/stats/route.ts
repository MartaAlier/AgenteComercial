export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const [
    totalLeads,
    leadsByStatus,
    totalAgents,
    activeAgents,
    totalLogs,
    totalCalls,
    upcomingCalls,
    objectives,
    totalPipelineValue,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.groupBy({ by: ["status"], _count: true }),
    prisma.agent.count(),
    prisma.agent.count({ where: { status: "active" } }),
    prisma.activityLog.count(),
    prisma.scheduledCall.count(),
    prisma.scheduledCall.count({ where: { status: "scheduled", scheduledAt: { gte: new Date() } } }),
    prisma.objective.findMany({ select: { progress: true, status: true } }),
    prisma.lead.aggregate({ _sum: { estimatedValue: true }, where: { status: { notIn: ["lost", "discarded"] } } }),
  ]);

  const avgOkrProgress = objectives.length
    ? objectives.reduce((sum, o) => sum + o.progress, 0) / objectives.length
    : 0;

  const okrsByStatus: Record<string, number> = {};
  objectives.forEach((o) => {
    okrsByStatus[o.status] = (okrsByStatus[o.status] || 0) + 1;
  });

  const leadsStatusMap: Record<string, number> = {};
  leadsByStatus.forEach((l) => {
    leadsStatusMap[l.status] = l._count;
  });

  return NextResponse.json({
    leads: {
      total: totalLeads,
      byStatus: leadsStatusMap,
      pipelineValue: totalPipelineValue._sum.estimatedValue || 0,
    },
    agents: {
      total: totalAgents,
      active: activeAgents,
    },
    activity: {
      totalLogs,
    },
    calls: {
      total: totalCalls,
      upcoming: upcomingCalls,
    },
    okrs: {
      avgProgress: Math.round(avgOkrProgress),
      byStatus: okrsByStatus,
    },
  });
}
