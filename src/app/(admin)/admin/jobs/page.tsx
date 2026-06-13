import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  FileText,
  Store,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";

import { StatusPill } from "@/components/common/status-pill";
import { SurfaceCard } from "@/components/common/surface-card";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/guards";
import {
  getCategoryLabel,
  getIndustryLabel,
  getJobStatusMeta,
  getPaymentStatusMeta,
} from "@/lib/domain/labels";
import { formatCurrencyVnd, formatDateVi } from "@/lib/format";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AdminJobRow = {
  id: string;
  title: string;
  status: string;
  agreed_price_vnd: number;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
  designer_profiles: {
    id: string;
    display_name: string;
    headline: string | null;
  } | null;
  customer_profiles: {
    id: string;
    business_name: string | null;
  } | null;
  design_requests: {
    id: string;
    title: string;
    business_name: string;
    industry: string;
    category: string;
  } | null;
  payments: {
    id: string;
    amount_vnd: number;
    status: string;
    transfer_note: string;
  } | null;
};

export default async function AdminJobsPage() {
  const authState = await requireRole(["admin"]);
  const profile = authState.profile;

  if (!profile) {
    redirect("/auth-check");
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  const { data, error } = await adminSupabase
    .from("jobs")
    .select(
      `
      id,
      title,
      status,
      agreed_price_vnd,
      due_at,
      completed_at,
      created_at,
      designer_profiles (
        id,
        display_name,
        headline
      ),
      customer_profiles (
        id,
        business_name
      ),
      design_requests (
        id,
        title,
        business_name,
        industry,
        category
      ),
      payments (
        id,
        amount_vnd,
        status,
        transfer_note
      )
    `,
    )
    .order("created_at", { ascending: false });

  const jobs = (data ?? []) as unknown as AdminJobRow[];

  const totalJobs = jobs.length;
  const activeJobs = jobs.filter((job) => job.status === "active").length;
  const completedJobs = jobs.filter((job) => job.status === "completed").length;
  const paymentPendingJobs = jobs.filter(
    (job) => job.status === "payment_pending",
  ).length;

  return (
    <DashboardShell
      role="admin"
      title="Jobs"
      description="Theo dõi toàn bộ job, designer, customer, payment và trạng thái hoàn thành."
      userName={profile.full_name}
      userEmail={authState.userEmail}
    >
      {error ? (
        <SurfaceCard className="mb-5 border-red-200 bg-red-50 p-6">
          <p className="text-sm font-semibold leading-7 text-red-600">
            {error.message}
          </p>
        </SurfaceCard>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total jobs"
          value={`${totalJobs}`}
          description="Tổng job đã tạo"
          icon={<BriefcaseBusiness className="size-5" />}
          tone="dark"
        />

        <MetricCard
          label="Active"
          value={`${activeJobs}`}
          description="Job đang thực hiện"
          icon={<CheckCircle2 className="size-5" />}
        />

        <MetricCard
          label="Payment pending"
          value={`${paymentPendingJobs}`}
          description="Job chờ xác nhận payment"
          icon={<CreditCard className="size-5" />}
          tone={paymentPendingJobs > 0 ? "warning" : "normal"}
        />

        <MetricCard
          label="Completed"
          value={`${completedJobs}`}
          description="Job đã hoàn thành"
          icon={<CheckCircle2 className="size-5" />}
          tone="success"
        />
      </section>

      <section className="mt-5">
        <SurfaceCard className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Job management
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Danh sách job toàn hệ thống
              </h2>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-600">
                Admin có thể mở từng job để xem request, payment, tiến độ,
                feedback và review cuối cùng.
              </p>
            </div>

            <StatusPill tone="info">{`${totalJobs} jobs`}</StatusPill>
          </div>

          {jobs.length === 0 ? (
            <div className="mt-6 grid place-items-center rounded-[1.25rem] border border-blue-100 bg-blue-50/65 p-8 text-center">
              <div className="grid size-14 place-items-center rounded-2xl bg-white text-blue-700 ring-1 ring-blue-100">
                <BriefcaseBusiness className="size-6" />
              </div>

              <h3 className="mt-5 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Chưa có job nào.
              </h3>

              <p className="mt-3 max-w-xl text-sm font-medium leading-7 text-slate-600">
                Khi customer chọn designer và tạo payment, job sẽ xuất hiện tại
                đây.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {jobs.map((job) => (
                <AdminJobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </SurfaceCard>
      </section>
    </DashboardShell>
  );
}

function AdminJobCard({ job }: { job: AdminJobRow }) {
  const jobStatus = getSafeJobStatusMeta(job.status);

  const paymentStatus = job.payments
    ? getPaymentStatusMeta(
        job.payments.status as Parameters<typeof getPaymentStatusMeta>[0],
      )
    : null;

  const request = job.design_requests;
  const designer = job.designer_profiles;
  const customer = job.customer_profiles;

  return (
    <div className="rounded-[1.35rem] border border-blue-100 bg-blue-50/65 p-5 transition hover:bg-blue-50">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={jobStatus.tone}>{jobStatus.label}</StatusPill>

            {paymentStatus ? (
              <StatusPill tone={paymentStatus.tone}>
                {paymentStatus.label}
              </StatusPill>
            ) : (
              <StatusPill tone="neutral">Chưa có payment</StatusPill>
            )}

            {request ? (
              <StatusPill tone="neutral">
                {getCategoryLabel(
                  request.category as Parameters<typeof getCategoryLabel>[0],
                )}
              </StatusPill>
            ) : null}
          </div>

          <h3 className="mt-4 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
            {job.title}
          </h3>

          <p className="mt-2 text-sm font-bold text-blue-700">
            {request?.business_name ??
              customer?.business_name ??
              "Chưa rõ thương hiệu"}
          </p>
        </div>

        <Button
          asChild
          className="w-fit shrink-0 rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61]"
        >
          <Link href={`/admin/jobs/${job.id}`}>
            Xem chi tiết
            <ArrowRight className="ml-2 size-4" />
          </Link>
        </Button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <InfoBox
          icon={<CircleDollarSign className="size-4" />}
          label="Agreed price"
          value={formatCurrencyVnd(job.agreed_price_vnd)}
        />

        <InfoBox
          icon={<CalendarDays className="size-4" />}
          label="Due date"
          value={job.due_at ? formatDateVi(job.due_at) : "Chưa có deadline"}
        />

        <InfoBox
          icon={<CreditCard className="size-4" />}
          label="Payment"
          value={
            job.payments
              ? formatCurrencyVnd(job.payments.amount_vnd)
              : "Chưa có payment"
          }
        />

        <InfoBox
          icon={<FileText className="size-4" />}
          label="Transfer note"
          value={job.payments?.transfer_note ?? "Chưa có mã"}
        />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <PartyLine
          icon={<UserRound className="size-4" />}
          label="Designer"
          title={designer?.display_name ?? "Chưa rõ designer"}
          description={designer?.headline ?? "Designer"}
        />

        <PartyLine
          icon={<Store className="size-4" />}
          label="Customer"
          title={customer?.business_name ?? request?.business_name ?? "Chưa rõ customer"}
          description={
            request
              ? getIndustryLabel(
                  request.industry as Parameters<typeof getIndustryLabel>[0],
                )
              : "Customer"
          }
        />
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  description,
  icon,
  tone = "normal",
}: {
  label: string;
  value: string;
  description: string;
  icon: ReactNode;
  tone?: "normal" | "dark" | "warning" | "success";
}) {
  const cardClass =
    tone === "dark"
      ? "border-[#061a3a] bg-[#061a3a] text-white shadow-[0_18px_50px_rgba(6,26,58,0.22)]"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-[#061a3a]"
        : tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-[#061a3a]"
          : "border-blue-100 bg-white text-[#061a3a]";

  const iconClass =
    tone === "dark"
      ? "bg-white/10 text-sky-200 ring-white/10"
      : tone === "warning"
        ? "bg-white text-amber-700 ring-amber-200"
        : tone === "success"
          ? "bg-white text-emerald-700 ring-emerald-200"
          : "bg-blue-50 text-blue-700 ring-blue-100";

  const labelClass = tone === "dark" ? "text-sky-200/75" : "text-blue-600";
  const descriptionClass = tone === "dark" ? "text-white/68" : "text-slate-500";

  return (
    <div className={`rounded-[1.35rem] border p-5 ${cardClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className={`text-xs font-black uppercase tracking-[0.18em] ${labelClass}`}
          >
            {label}
          </p>

          <p className="mt-3 text-3xl font-black tracking-[-0.06em]">
            {value}
          </p>
        </div>

        <div
          className={`grid size-11 shrink-0 place-items-center rounded-2xl ring-1 ${iconClass}`}
        >
          {icon}
        </div>
      </div>

      <p className={`mt-3 text-sm font-medium leading-6 ${descriptionClass}`}>
        {description}
      </p>
    </div>
  );
}

function InfoBox({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.15rem] border border-blue-100 bg-white/75 p-4">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-blue-600">
        {icon}
        {label}
      </div>

      <p className="mt-2 break-words text-sm font-extrabold leading-6 text-[#061a3a]">
        {value}
      </p>
    </div>
  );
}

function PartyLine({
  icon,
  label,
  title,
  description,
}: {
  icon: ReactNode;
  label: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.15rem] border border-blue-100 bg-white/75 p-4">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
            {label}
          </p>

          <p className="mt-2 break-words text-sm font-extrabold leading-6 text-[#061a3a]">
            {title}
          </p>

          <p className="mt-1 break-words text-sm font-medium leading-6 text-slate-500">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function getSafeJobStatusMeta(status: string) {
  if (status === "completed") {
    return {
      label: "Hoàn thành",
      tone: "success" as const,
    };
  }

  return getJobStatusMeta(status as Parameters<typeof getJobStatusMeta>[0]);
}