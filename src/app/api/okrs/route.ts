export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const agentId = searchParams.get("agentId");
  const quarter = searchParams.get("quarter");

  const where: Record<string, unknown> = {};
  if (agentId) where.agentId = agentId;
  if (quarter) where.quarter = quarter;

  const objectives = await prisma.objective.findMany({
    where,
    include: {
      keyResults: { orderBy: { createdAt: "asc" } },
      agent: { select: { name: true, avatar: true, role: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(objectives);
}

export async function POST(request: NextRequest) {
  const data = await request.json();
  const { keyResults, ...objectiveData } = data;
  const objective = await prisma.objective.create({
    data: {
      ...objectiveData,
      keyResults: keyResults ? { create: keyResults } : undefined,
    },
    include: { keyResults: true },
  });
  return NextResponse.json(objective, { status: 201 });
}
