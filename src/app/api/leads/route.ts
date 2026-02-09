export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");
  const segment = searchParams.get("segment");
  const priority = searchParams.get("priority");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (segment) where.segment = segment;
  if (priority) where.priority = priority;
  if (search) {
    where.OR = [
      { companyName: { contains: search } },
      { contactName: { contains: search } },
      { contactEmail: { contains: search } },
    ];
  }

  const leads = await prisma.lead.findMany({
    where,
    include: {
      actions: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { agent: { select: { name: true, avatar: true } } },
      },
      scheduledCalls: {
        where: { status: "scheduled" },
        orderBy: { scheduledAt: "asc" },
      },
      _count: { select: { actions: true, scheduledCalls: true } },
    },
    orderBy: [{ priority: "asc" }, { score: "desc" }],
  });

  return NextResponse.json(leads);
}

export async function POST(request: NextRequest) {
  const data = await request.json();
  const lead = await prisma.lead.create({ data });
  return NextResponse.json(lead, { status: 201 });
}
