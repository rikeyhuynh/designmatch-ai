import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  BriefcaseBusiness,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  FileText,
  Palette,
  Store,
  Target,
} from "lucide-react";
import { redirect } from "next/navigation";

import { StatusPill } from "@/components/common/status-pill";
import { SurfaceCard } from "@/components/common/surface-card";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/guards";
import {
  getCategoryLabel,
  getIndustryLabel,
  getJobStatusMeta,
  getPaymentStatusMeta,
  getStyleLabel,
} from "@/lib/domain/labels";
import { formatCurrencyVnd, formatDateVi } from "@/lib/format";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type DesignerJobRow = {
  id: string;
  title: string;
  status: string;
  designer_revenue_vnd: number | null;
  started_at: string | null;
  due_at: string | null;
  created_at: string;
  design_requests: {
    id: string;
    title: string;
    business_name: string;
    industry: string;
    category: string;
    description: string;
    target_audience: string | null;
    deadline: string | null;
    preferred_styles: string[] | null;
  } | null;
  payments: {
    id: string;
    status: string;
    designer_revenue_vnd: number | null;
    confirmed_at: string | null;
  } | null;
};

export default async function DesignerJobsPage() {
  const authState = await requireRole(["designer"]);
  const profile = authState.profile;
  const designerProfile = authState.designerProfile;

  if (!profile || !designerProfile) {
    redirect("/auth-check");
  }

  const adminSupabase = createSupabaseAdminClient();

  const { data, error } = await adminSupabase
    .from("jobs")
    .select(
      `
      id,
      title,
      status,
      designer_revenue_vnd,
      started_at,
      due_at,
      created_at,
      design_requests (
        id,
        title,
        business_name,
        industry,
        category,
        description,
        target_audience,
        deadline,
        preferred_styles
      ),
      payments (
        id,
        status,
        designer_revenue_vnd,
        confirmed_at
      )
    `,
    )
    .eq("designer_id", designerProfile.id)
    .order("created_at", { ascending: false });

  const jobs = (data ?? []) as unknown as DesignerJobRow[];

  const activeJobs = jobs.filter((job) => job.status === "active");
  const paymentPendingJobs = jobs.filter(
    (job) => job.status === "payment_pending",
  );

  const totalActiveDesignerRevenue = activeJobs.reduce((sum, job) => {
    const payment = job.payments;

    return (
      sum +
      Number(payment?.designer_revenue_vnd ?? job.designer_revenue_vnd ?? 0)
    );
  }, 0);

  return (
    <DashboardShell
      role="designer"
      title="Job đang làm"
      description="Danh sách dự án đã được customer chọn và admin xác nhận thanh toán."
      userName={profile.full_name}
      userEmail={authState.userEmail}
    >
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          icon={BriefcaseBusiness}
          label="Jobs"
          value={jobs.length}
          description="Tổng số job được giao cho designer."
        />

        <DashboardStatCard
          icon={Clock3}
          label="Active"
          value={activeJobs.length}
          description="Job đã được thanh toán và có thể bắt đầu thực hiện."
        />

        <DashboardStatCard
          icon={CircleDollarSign}
          label="Pending payment"
          value={paymentPendingJobs.length}
          description="Job đã tạo nhưng còn chờ admin xác nhận thanh toán."
        />

        <DashboardStatCard
          icon={Palette}
          label="Thu nhập active"
          value={formatCurrencyVnd(totalActiveDesignerRevenue)}
          description="Tổng tiền designer nhận từ các job đang active."
        />
      </section>

      <section className="mt-6">
        {error ? (
          <SurfaceCard className="p-6">
            <p className="text-sm font-semibold leading-7 text-red-600">
              {error.message}
            </p>
          </SurfaceCard>
        ) : null}

        {jobs.length === 0 ? (
          <SurfaceCard className="grid place-items-center p-8 text-center">
            <div className="grid size-14 place-items-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
              <BriefcaseBusiness className="size-6" aria-hidden="true" />
            </div>

            <h2 className="mt-5 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
              Chưa có job nào.
            </h2>

            <p className="mt-3 max-w-xl text-sm font-medium leading-7 text-slate-600">
              Khi customer chọn bạn trong danh sách matching và admin xác nhận
              thanh toán, job sẽ xuất hiện ở đây.
            </p>
          </SurfaceCard>
        ) : (
          <div className="grid gap-5">
            {jobs.map((job) => (
              <DesignerJobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </section>
    </DashboardShell>
  );
}

function DesignerJobCard({ job }: { job: DesignerJobRow }) {
  const request = job.design_requests;
  const payment = job.payments;

  const jobStatus = getJobStatusMeta(
    job.status as Parameters<typeof getJobStatusMeta>[0],
  );

  const paymentStatus = payment
    ? getPaymentStatusMeta(
        payment.status as Parameters<typeof getPaymentStatusMeta>[0],
      )
    : null;

  const designerRevenue = Number(
    payment?.designer_revenue_vnd ?? job.designer_revenue_vnd ?? 0,
  );

  return (
    <SurfaceCard className="p-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={jobStatus.tone}>{jobStatus.label}</StatusPill>

            {paymentStatus ? (
              <StatusPill tone={paymentStatus.tone}>
                {paymentStatus.label}
              </StatusPill>
            ) : null}

            {request ? (
              <StatusPill tone="info">
                {getCategoryLabel(
                  request.category as Parameters<typeof getCategoryLabel>[0],
                )}
              </StatusPill>
            ) : null}
          </div>

          <h2 className="mt-4 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
            {job.title}
          </h2>

          <p className="mt-2 text-sm font-bold text-blue-700">
            {request?.business_name ?? "Chưa rõ thương hiệu"}
          </p>
        </div>

        <Button
          asChild
          variant="outline"
          className="rounded-full border-blue-200 bg-white font-extrabold"
        >
          <Link href={`/designer/jobs/${job.id}`}>Xem chi tiết</Link>
        </Button>
      </div>

      {request ? (
        <>
          <p className="mt-5 text-sm font-medium leading-7 text-slate-600">
            {request.description}
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <InfoBox
              icon={CircleDollarSign}
              label="Thu nhập của bạn"
              value={formatCurrencyVnd(designerRevenue)}
            />

            <InfoBox
              icon={CalendarDays}
              label="Due date"
              value={job.due_at ? formatDateVi(job.due_at) : "Chưa có deadline"}
            />

            <InfoBox
              icon={Store}
              label="Industry"
              value={getIndustryLabel(
                request.industry as Parameters<typeof getIndustryLabel>[0],
              )}
            />

            <InfoBox
              icon={Target}
              label="Target"
              value={request.target_audience ?? "Chưa mô tả rõ"}
            />
          </div>

          {request.preferred_styles && request.preferred_styles.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {request.preferred_styles.map((style) => (
                <StatusPill key={`${job.id}-${style}`} tone="neutral">
                  {getStyleLabel(style as Parameters<typeof getStyleLabel>[0])}
                </StatusPill>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <div className="mt-5 rounded-[1.25rem] border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-700">
            Missing request data
          </p>

          <p className="mt-2 text-sm font-medium leading-7 text-amber-950">
            Job này chưa liên kết được với request. Cần kiểm tra dữ liệu trong
            Supabase.
          </p>
        </div>
      )}

      <div className="mt-5 rounded-[1.25rem] border border-blue-100 bg-blue-50/70 p-5">
        <div className="flex items-start gap-3">
          <FileText className="mt-1 size-5 shrink-0 text-blue-700" />

          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-700">
              Designer note
            </p>

            <p className="mt-2 text-sm font-medium leading-7 text-slate-700">
              Đây là trang xem job ở phía designer. Designer chỉ thấy thu nhập
              mình nhận, trạng thái job, deadline và thông tin brief cần thiết.
            </p>
          </div>
        </div>
      </div>
    </SurfaceCard>
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

      <p className="mt-2 break-words text-sm font-extrabold leading-6 text-[#061a3a]">
        {value}
      </p>
    </div>
  );
}