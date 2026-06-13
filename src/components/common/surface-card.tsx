import { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SurfaceCardProps = {
  children: ReactNode;
  className?: string;
  variant?: "default" | "blue" | "dark";
};

export function SurfaceCard({
  children,
  className,
  variant = "default",
}: SurfaceCardProps) {
  return (
    <div
      className={cn(
        "rounded-[1.5rem] border shadow-[0_20px_70px_rgba(15,65,145,0.075)]",
        variant === "default" && "border-blue-100 bg-white",
        variant === "blue" && "border-blue-100 bg-blue-50/70",
        variant === "dark" &&
          "border-blue-900/20 bg-[#061a3a] text-white shadow-[0_34px_100px_rgba(6,26,58,0.22)]",
        className,
      )}
    >
      {children}
    </div>
  );
}