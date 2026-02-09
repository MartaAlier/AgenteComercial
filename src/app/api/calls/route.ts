export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const calls = await prisma.scheduledCall.findMany({
    where,
    include: {
      lead: {
        select: {
          id: true,
          companyName: true,
          contactName: true,
          contactPhone: true,
          contactEmail: true,
          status: true,
        },
      },
    },
    orderBy: { scheduledAt: "asc" },
  });

  return NextResponse.json(calls);
}

export async function POST(request: NextRequest) {
  const data = await request.json();
  const call = await prisma.scheduledCall.create({
    data,
    include: {
      lead: {
        select: { companyName: true, contactName: true },
      },
    },
  });
  return NextResponse.json(call, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const { id, ...data } = await request.json();
  const call = await prisma.scheduledCall.update({
    where: { id },
    data,
    include: {
      lead: {
        select: { companyName: true, contactName: true },
      },
    },
  });
  return NextResponse.json(call);
}
