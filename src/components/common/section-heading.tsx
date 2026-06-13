import { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  children?: ReactNode;
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  children,
  className,
}: SectionHeadingProps) {
  const isCenter = align === "center";

  return (
    <div
      className={cn(
        "max-w-3xl",
        isCenter && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow ? (
        <Badge
          variant="outline"
          className="rounded-full border-blue-200 bg-blue-50 px-4 py-2 text-sm font-extrabold text-blue-800 hover:bg-blue-50"
        >
          {eyebrow}
        </Badge>
      ) : null}

      <h2 className="mt-5 text-3xl font-extrabold leading-[1.08] tracking-[-0.045em] text-[#061a3a] md:text-4xl">
        {title}
      </h2>

      {description ? (
        <p
          className={cn(
            "mt-4 text-base font-medium leading-8 text-slate-600",
            isCenter && "mx-auto max-w-2xl",
          )}
        >
          {description}
        </p>
      ) : null}

      {children ? <div className="mt-7">{children}</div> : null}
    </div>
  );
}