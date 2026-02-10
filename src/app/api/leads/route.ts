export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { companyName: { contains: search } },
      { address: { contains: search } },
      { description: { contains: search } },
    ];
  }

  const leads = await prisma.lead.findMany({
    where,
    orderBy: [{ batch: "asc" }, { companyName: "asc" }],
  });

  return NextResponse.json(leads);
}
