export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const agents = await prisma.agent.findMany({
    include: {
      _count: {
        select: {
          logs: true,
          leadActions: true,
          tasks: true,
        },
      },
      tasks: {
        where: { status: { in: ["pending", "in_progress"] } },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      kpis: true,
      objectives: {
        include: { keyResults: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(agents);
}
