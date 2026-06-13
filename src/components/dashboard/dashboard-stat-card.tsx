import type { LucideIcon } from "lucide-react";

import { SurfaceCard } from "@/components/common/surface-card";

type DashboardStatCardProps = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  description: string;
};

export function DashboardStatCard({
  icon: Icon,
  label,
  value,
  description,
}: DashboardStatCardProps) {
  return (
    <SurfaceCard className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="grid size-11 place-items-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
          <Icon className="size-5" aria-hidden="true" />
        </div>

        <p className="text-3xl font-black tracking-[-0.055em] text-[#061a3a]">
          {value}
        </p>
      </div>

      <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-blue-600">
        {label}
      </p>

      <p className="mt-2 text-sm font-medium leading-7 text-slate-600">
        {description}
      </p>
    </SurfaceCard>
  );
}