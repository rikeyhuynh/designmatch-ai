import { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusCardProps = {
  title: string;
  description: string;
  status: "Ready" | "Next" | "Soon";
  icon: LucideIcon;
};

export function StatusCard({
  title,
  description,
  status,
  icon: Icon,
}: StatusCardProps) {
  return (
    <article className="group relative overflow-hidden rounded-[1.75rem] border border-blue-100 bg-white/88 p-6 shadow-[0_18px_60px_rgba(15,65,145,0.10)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_24px_80px_rgba(15,65,145,0.16)]">
      <div className="absolute -right-12 -top-12 size-32 rounded-full bg-blue-100/70 blur-2xl transition group-hover:bg-blue-200/80" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="grid size-12 place-items-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
          <Icon className="size-5" aria-hidden="true" />
        </div>

        <Badge
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-bold",
            status === "Ready" &&
              "border-blue-700 bg-blue-700 text-white hover:bg-blue-700",
            status === "Next" &&
              "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-50",
            status === "Soon" &&
              "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-50",
          )}
        >
          {status}
        </Badge>
      </div>

      <div className="relative mt-7">
        <h3 className="text-lg font-extrabold tracking-[-0.03em] text-slate-950">
          {title}
        </h3>
        <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
      </div>

      <div className="relative mt-7 h-1.5 rounded-full bg-blue-50">
        <div
          className="h-1.5 rounded-full bg-gradient-to-r from-blue-800 via-blue-600 to-sky-400"
          style={{
            width:
              status === "Ready" ? "100%" : status === "Next" ? "48%" : "18%",
          }}
        />
      </div>
    </article>
  );
}