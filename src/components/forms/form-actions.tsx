import { ReactNode } from "react";

import { cn } from "@/lib/utils";

type FormActionsProps = {
  children: ReactNode;
  align?: "left" | "right" | "between";
  className?: string;
};

export function FormActions({
  children,
  align = "right",
  className,
}: FormActionsProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-blue-100 pt-5 sm:flex-row",
        align === "left" && "sm:justify-start",
        align === "right" && "sm:justify-end",
        align === "between" && "sm:justify-between",
        className,
      )}
    >
      {children}
    </div>
  );
}