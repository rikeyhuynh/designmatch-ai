import { ReactNode } from "react";
import { FileQuestion, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type EmptyStateVariant = "card" | "plain";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  variant?: EmptyStateVariant;
};

export function EmptyState({
  icon: Icon = FileQuestion,
  title,
  description,
  action,
  className,
  variant = "card",
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        variant === "card" &&
          "rounded-[1.5rem] border border-blue-100 bg-white p-8 shadow-[0_18px_55px_rgba(15,65,145,0.075)]",
        variant === "plain" && "p-6",
        className,
      )}
    >
      <div className="grid size-14 place-items-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
        <Icon className="size-6" aria-hidden="true" />
      </div>

      <h3 className="mt-5 max-w-md text-xl font-extrabold tracking-[-0.04em] text-[#061a3a]">
        {title}
      </h3>

      {description ? (
        <p className="mt-3 max-w-md text-sm font-medium leading-7 text-slate-600">
          {description}
        </p>
      ) : null}

      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}