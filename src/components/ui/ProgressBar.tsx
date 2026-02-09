"use client";

import { progressColor } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercent?: boolean;
  size?: "sm" | "md" | "lg";
  color?: string;
}

export default function ProgressBar({
  value,
  max = 100,
  label,
  showPercent = true,
  size = "md",
  color,
}: ProgressBarProps) {
  const percent = Math.min(Math.round((value / max) * 100), 100);
  const heights = { sm: "h-1.5", md: "h-2.5", lg: "h-4" };

  return (
    <div className="w-full">
      {(label || showPercent) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-xs text-gray-600">{label}</span>}
          {showPercent && <span className="text-xs font-semibold text-gray-700">{percent}%</span>}
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full ${heights[size]} overflow-hidden`}>
        <div
          className={`${heights[size]} rounded-full transition-all duration-500 ${color || progressColor(percent)}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
