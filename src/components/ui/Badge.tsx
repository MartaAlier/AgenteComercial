"use client";

import { statusBadgeColor, translateStatus } from "@/lib/utils";

interface BadgeProps {
  status: string;
  className?: string;
}

export default function Badge({ status, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadgeColor(status)} ${className}`}
    >
      {translateStatus(status)}
    </span>
  );
}
