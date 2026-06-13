import { Loader2, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

type LoadingStateVariant = "card" | "plain" | "ai";

type LoadingStateProps = {
  title?: string;
  description?: string;
  rows?: number;
  className?: string;
  variant?: LoadingStateVariant;
};

export function LoadingState({
  title = "Đang tải dữ liệu",
  description = "Vui lòng chờ trong giây lát.",
  rows = 3,
  className,
  variant = "card",
}: LoadingStateProps) {
  const isAi = variant === "ai";

  return (
    <div
      className={cn(
        "w-full",
        variant === "card" &&
          "rounded-[1.5rem] border border-blue-100 bg-white p-6 shadow-[0_18px_55px_rgba(15,65,145,0.075)]",
        variant === "plain" && "p-4",
        isAi &&
          "rounded-[1.5rem] border border-blue-900/20 bg-[#061a3a] p-6 text-white shadow-[0_30px_90px_rgba(6,26,58,0.22)]",
        className,
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "grid size-12 shrink-0 place-items-center rounded-2xl",
            isAi
              ? "bg-white/10 text-sky-200 ring-1 ring-white/10"
              : "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
          )}
        >
          {isAi ? (
            <Sparkles className="size-5 animate-pulse" aria-hidden="true" />
          ) : (
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              "text-lg font-extrabold tracking-[-0.035em]",
              isAi ? "text-white" : "text-[#061a3a]",
            )}
          >
            {title}
          </h3>

          {description ? (
            <p
              className={cn(
                "mt-2 text-sm font-medium leading-7",
                isAi ? "text-sky-100/70" : "text-slate-600",
              )}
            >
              {description}
            </p>
          ) : null}

          <div className="mt-6 space-y-3">
            {Array.from({ length: rows }).map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-3 animate-pulse rounded-full",
                  isAi ? "bg-white/10" : "bg-blue-100/80",
                  index === rows - 1 ? "w-2/3" : "w-full",
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}