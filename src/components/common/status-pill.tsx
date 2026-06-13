import type { ReactNode } from "react";

type StatusPillTone =
  | "neutral"
  | "success"
  | "warning"
  | "info"
  | "danger";

type StatusPillProps = {
  tone?: StatusPillTone;
  children: ReactNode;
  className?: string;
};

const toneClassMap: Record<StatusPillTone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
  danger: "border-red-200 bg-red-50 text-red-700",
};

export function StatusPill({
  tone = "neutral",
  children,
  className = "",
}: StatusPillProps) {
  return (
    <span
      className={[
        "inline-flex w-fit items-center justify-center rounded-full border px-3 py-1 text-xs font-black leading-none",
        "uppercase tracking-[0.12em]",
        toneClassMap[tone],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}