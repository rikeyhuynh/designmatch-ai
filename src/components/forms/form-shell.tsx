import { ReactNode } from "react";
import { Sparkles, type LucideIcon } from "lucide-react";

import { StatusPill } from "@/components/common/status-pill";
import { cn } from "@/lib/utils";

type FormStatusTone = "success" | "warning" | "info" | "danger" | "neutral";

type FormShellProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  icon?: LucideIcon;
  status?: {
    label: string;
    tone?: FormStatusTone;
  };
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function FormShell({
  title,
  description,
  eyebrow,
  icon: Icon = Sparkles,
  status,
  children,
  footer,
  className,
}: FormShellProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[1.5rem] border border-blue-100 bg-white shadow-[0_20px_70px_rgba(15,65,145,0.075)]",
        className,
      )}
    >
      <div className="border-b border-blue-100 bg-gradient-to-r from-white to-blue-50/65 p-6">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
          <div className="flex gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
              <Icon className="size-5" aria-hidden="true" />
            </div>

            <div>
              {eyebrow ? (
                <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-600">
                  {eyebrow}
                </p>
              ) : null}

              <h2 className="mt-1 text-xl font-extrabold tracking-[-0.04em] text-[#061a3a]">
                {title}
              </h2>

              {description ? (
                <p className="mt-2 max-w-2xl text-sm font-medium leading-7 text-slate-600">
                  {description}
                </p>
              ) : null}
            </div>
          </div>

          {status ? (
            <StatusPill tone={status.tone ?? "neutral"}>
              {status.label}
            </StatusPill>
          ) : null}
        </div>
      </div>

      <div className="p-6">{children}</div>

      {footer ? (
        <div className="border-t border-blue-100 bg-blue-50/45 px-6 py-4">
          {footer}
        </div>
      ) : null}
    </section>
  );
}