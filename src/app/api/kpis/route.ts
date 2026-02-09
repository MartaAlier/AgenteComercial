export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const agentId = searchParams.get("agentId");

  const where: Record<string, unknown> = {};
  if (agentId) where.agentId = agentId;

  const kpis = await prisma.kPI.findMany({
    where,
    include: {
      agent: { select: { name: true, avatar: true, role: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(kpis);
}

export async function PATCH(request: NextRequest) {
  const { id, currentValue } = await request.json();
  const kpi = await prisma.kPI.update({
    where: { id },
    data: { currentValue },
  });
  return NextResponse.json(kpi);
}
