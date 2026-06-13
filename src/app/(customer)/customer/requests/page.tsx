import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  CircleDollarSign,
  FileText,
  Plus,
  type LucideIcon,
} from "lucide-react";

import { StatusPill } from "@/components/common/status-pill";
import { SurfaceCard } from "@/components/common/surface-card";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/guards";
import {
  getCategoryLabel,
  getIndustryLabel,
  getRequestStatusMeta,
  getStyleLabel,
} from "@/lib/domain/labels";
import { formatCurrencyVnd, formatDateVi } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type DesignRequestRow = {
  id: string;
  title: string;
  business_name: string;
  industry: string;
  category: string;
  description: string;
  target_audience: string | null;
  budget_min_vnd: number;
  budget_max_vnd: number;
  deadline: string | null;
  preferred_styles: string[];
  status: string;
  created_at: string;
};

export default async function CustomerRequestsPage() {
  const authState = await requireRole(["customer"]);
  const profile = authState.profile;
  const customerProfile = authState.customerProfile;

  if (!profile || !customerProfile) {
    redirect("/auth-check");
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("design_requests")
    .select(
      "id, title, business_name, industry, category, description, target_audience, budget_min_vnd, budget_max_vnd, deadline, preferred_styles, status, created_at",
    )
    .eq("customer_id", customerProfile.id)
    .order("created_at", { ascending: false });

  const requests = (data ?? []) as unknown as DesignRequestRow[];

  return (
    <DashboardShell
      role="customer"
      title="Request của tôi"
      description="Danh sách design request đã được lưu thật trong Supabase."
      userName={profile.full_name}
      userEmail={authState.userEmail}
      action={
        <Button
          asChild
          className="rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61]"
        >
          <Link href="/customer/requests/new">
            <Plus className="mr-2 size-4" />
            Tạo request
          </Link>
        </Button>
      }
    >
      {error ? (
        <SurfaceCard className="p-6">
          <p className="text-sm font-semibold leading-7 text-red-600">
            {error.message}
          </p>
        </SurfaceCard>
      ) : null}

      {requests.length === 0 ? (
        <SurfaceCard className="p-8 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
            <FileText className="size-6" aria-hidden="true" />
          </div>

          <h2 className="mt-5 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
            Chưa có request nào.
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-7 text-slate-600">
            Tạo request đầu tiên để bắt đầu luồng AI Brief Builder và Designer
            Matching.
          </p>

          <Button
            asChild
            className="mt-6 rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61]"
          >
            <Link href="/customer/requests/new">Tạo request đầu tiên</Link>
          </Button>
        </SurfaceCard>
      ) : (
        <div className="grid gap-5">
          {requests.map((request) => {
            const statusMeta = getRequestStatusMeta(
              request.status as Parameters<typeof getRequestStatusMeta>[0],
            );

            return (
              <SurfaceCard key={request.id} className="p-6">
                <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill tone={statusMeta.tone}>
                        {statusMeta.label}
                      </StatusPill>

                      <StatusPill tone="info">
                        {getCategoryLabel(
                          request.category as Parameters<
                            typeof getCategoryLabel
                          >[0],
                        )}
                      </StatusPill>

                      <StatusPill tone="neutral">
                        {getIndustryLabel(
                          request.industry as Parameters<
                            typeof getIndustryLabel
                          >[0],
                        )}
                      </StatusPill>
                    </div>

                    <h2 className="mt-4 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                      {request.title}
                    </h2>

                    <p className="mt-2 text-sm font-bold text-blue-700">
                      {request.business_name}
                    </p>
                  </div>

                  <Button
                    asChild
                    variant="outline"
                    className="rounded-full border-blue-200 bg-white font-extrabold"
                  >
                    <Link href={`/customer/requests/${request.id}`}>
                      Xem chi tiết
                    </Link>
                  </Button>
                </div>

                <p className="mt-4 text-sm font-medium leading-7 text-slate-600">
                  {request.description}
                </p>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <InfoBox
                    icon={CircleDollarSign}
                    label="Budget"
                    value={`${formatCurrencyVnd(
                      request.budget_min_vnd,
                    )} - ${formatCurrencyVnd(request.budget_max_vnd)}`}
                  />

                  <InfoBox
                    icon={CalendarDays}
                    label="Deadline"
                    value={
                      request.deadline
                        ? formatDateVi(request.deadline)
                        : "Chưa đặt deadline"
                    }
                  />
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {request.preferred_styles.map((style) => (
                    <StatusPill key={`${request.id}-${style}`} tone="neutral">
                      {getStyleLabel(
                        style as Parameters<typeof getStyleLabel>[0],
                      )}
                    </StatusPill>
                  ))}
                </div>
              </SurfaceCard>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}

function InfoBox({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.15rem] border border-blue-100 bg-blue-50/65 p-4">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-blue-600">
        <Icon className="size-4" aria-hidden="true" />
        {label}
      </div>

      <p className="mt-2 text-sm font-extrabold leading-6 text-[#061a3a]">
        {value}
      </p>
    </div>
  );
}