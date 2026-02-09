export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const agentId = searchParams.get("agentId");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (agentId) where.agentId = agentId;
  if (status) where.status = status;

  const tasks = await prisma.agentTask.findMany({
    where,
    include: {
      agent: { select: { name: true, avatar: true, role: true } },
    },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(tasks);
}

export async function POST(request: NextRequest) {
  const data = await request.json();
  const task = await prisma.agentTask.create({ data });
  return NextResponse.json(task, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const { id, ...data } = await request.json();
  if (data.status === "completed") data.completedAt = new Date();
  const task = await prisma.agentTask.update({ where: { id }, data });
  return NextResponse.json(task);
}
