export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const agentId = searchParams.get("agentId");
  const category = searchParams.get("category");
  const limit = parseInt(searchParams.get("limit") || "50");

  const where: Record<string, unknown> = {};
  if (agentId) where.agentId = agentId;
  if (category) where.category = category;

  const logs = await prisma.activityLog.findMany({
    where,
    include: {
      agent: { select: { name: true, avatar: true, role: true, id: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(logs);
}

export async function POST(request: NextRequest) {
  const data = await request.json();
  const log = await prisma.activityLog.create({
    data,
    include: {
      agent: { select: { name: true, avatar: true, role: true } },
    },
  });
  return NextResponse.json(log, { status: 201 });
}
