import { CheckCircle2, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type ChoiceCardProps = {
  title: string;
  description?: string;
  meta?: string;
  icon?: LucideIcon;
  selected?: boolean;
  disabled?: boolean;
  className?: string;
};

export function ChoiceCard({
  title,
  description,
  meta,
  icon: Icon,
  selected = false,
  disabled = false,
  className,
}: ChoiceCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-[1.25rem] border bg-white p-5 transition",
        selected
          ? "border-blue-600 bg-blue-50/75 shadow-[0_18px_55px_rgba(37,99,235,0.12)]"
          : "border-blue-100 shadow-[0_14px_45px_rgba(15,65,145,0.055)]",
        disabled && "cursor-not-allowed opacity-50",
        !disabled && "hover:border-blue-300 hover:bg-blue-50/45",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          {Icon ? (
            <div
              className={cn(
                "grid size-11 shrink-0 place-items-center rounded-2xl ring-1",
                selected
                  ? "bg-blue-700 text-white ring-blue-700"
                  : "bg-blue-50 text-blue-700 ring-blue-100",
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
            </div>
          ) : null}

          <div>
            <h3 className="font-extrabold tracking-[-0.035em] text-[#061a3a]">
              {title}
            </h3>

            {description ? (
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                {description}
              </p>
            ) : null}

            {meta ? (
              <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                {meta}
              </p>
            ) : null}
          </div>
        </div>

        {selected ? (
          <CheckCircle2 className="size-5 shrink-0 text-blue-700" />
        ) : null}
      </div>
    </div>
  );
}