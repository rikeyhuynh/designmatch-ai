import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

type AppLogoProps = {
  className?: string;
  markClassName?: string;
};

export function AppLogo({ className, markClassName }: AppLogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "relative grid size-11 place-items-center overflow-hidden rounded-[1.05rem] bg-[#061a3a] text-white shadow-[0_16px_38px_rgba(6,26,58,0.25)]",
          markClassName,
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(76,178,255,0.72),transparent_44%)]" />
        <div className="absolute -bottom-8 -right-8 size-16 rounded-full bg-blue-500/45 blur-xl" />
        <Sparkles className="relative size-5" aria-hidden="true" />
      </div>

      <div className="leading-none">
        <p className="text-[1.33rem] font-black tracking-[-0.055em] text-[#061a3a]">
          DesignMatch
        </p>
        <p className="mt-1 text-[0.65rem] font-black uppercase tracking-[0.42em] text-blue-600">
          AI
        </p>
      </div>
    </div>
  );
}