import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Banknote,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  ShieldCheck,
  Store,
  UserRound,
  WalletCards,
} from "lucide-react";
import type { ReactNode } from "react";

import { StatusPill } from "@/components/common/status-pill";
import { SurfaceCard } from "@/components/common/surface-card";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { PaymentReviewActions } from "@/features/admin/payments/components/payment-review-actions";
import { requireRole } from "@/lib/auth/guards";
import { getCategoryLabel } from "@/lib/domain/labels";
import { formatCurrencyVnd, formatDateVi } from "@/lib/format";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type PaymentRow = {
  id: string;
  job_id: string;
  amount_vnd: number;
  status: string;
  admin_note: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
};

type JobRow = {
  id: string;
  request_id: string;
  designer_id: string;
  title: string;
  status: string;
  agreed_price_vnd: number;
  created_at: string;
};

type RequestRow = {
  id: string;
  customer_id: string;
  title: string;
  business_name: string;
  category: string;
  status: string;
  created_at: string;
};

type DesignerRow = {
  id: string;
  display_name: string;
  headline: string | null;
  rating: number;
  completed_jobs: number;
};

export default async function AdminPaymentsPage() {
  const authState = await requireRole(["admin"]);
  const profile = authState.profile;

  if (!profile) {
    redirect("/auth-check");
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  const paymentsResult = await adminSupabase
    .from("payments")
    .select(
      `
      id,
      job_id,
      amount_vnd,
      status,
      admin_note,
      reviewed_at,
      reviewed_by,
      created_at
    `,
    )
    .order("created_at", { ascending: false });

  const payments = (paymentsResult.data ?? []) as unknown as PaymentRow[];
  const jobIds = Array.from(new Set(payments.map((payment) => payment.job_id)));

  const jobsResult =
    jobIds.length > 0
      ? await adminSupabase
          .from("jobs")
          .select(
            `
            id,
            request_id,
            designer_id,
            title,
            status,
            agreed_price_vnd,
            created_at
          `,
          )
          .in("id", jobIds)
      : { data: [], error: null };

  const jobs = (jobsResult.data ?? []) as unknown as JobRow[];

  const requestIds = Array.from(new Set(jobs.map((job) => job.request_id)));
  const designerIds = Array.from(new Set(jobs.map((job) => job.designer_id)));

  const requestsResult =
    requestIds.length > 0
      ? await adminSupabase
          .from("design_requests")
          .select(
            `
            id,
            customer_id,
            title,
            business_name,
            category,
            status,
            created_at
          `,
          )
          .in("id", requestIds)
      : { data: [], error: null };

  const designersResult =
    designerIds.length > 0
      ? await adminSupabase
          .from("designer_profiles")
          .select("id, display_name, headline, rating, completed_jobs")
          .in("id", designerIds)
      : { data: [], error: null };

  const requests = (requestsResult.data ?? []) as unknown as RequestRow[];
  const designers = (designersResult.data ?? []) as unknown as DesignerRow[];

  const confirmedPayments = payments.filter((payment) =>
    ["paid", "confirmed", "completed"].includes(payment.status),
  );

  const pendingPayments = payments.filter((payment) =>
    ["pending", "waiting", "submitted"].includes(payment.status),
  );

  const rejectedPayments = payments.filter(
    (payment) => payment.status === "rejected",
  );

  const totalPaymentValue = payments.reduce(
    (total, payment) => total + Number(payment.amount_vnd ?? 0),
    0,
  );

  const confirmedPaymentValue = confirmedPayments.reduce(
    (total, payment) => total + Number(payment.amount_vnd ?? 0),
    0,
  );

  const pendingPaymentValue = pendingPayments.reduce(
    (total, payment) => total + Number(payment.amount_vnd ?? 0),
    0,
  );

  return (
    <DashboardShell
      role="admin"
      title="Payments"
      description="Theo dõi, xác nhận và từ chối payment trên toàn hệ thống."
      userName={profile.full_name}
      userEmail={authState.userEmail}
    >
      <ErrorPanel
        errors={[
          paymentsResult.error?.message,
          jobsResult.error?.message,
          requestsResult.error?.message,
          designersResult.error?.message,
        ]}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total payments"
          value={`${payments.length}`}
          description="Tổng payment trong hệ thống"
          icon={<CreditCard className="size-5" />}
          tone="dark"
        />

        <MetricCard
          label="Confirmed value"
          value={formatCurrencyVnd(confirmedPaymentValue)}
          description="Tổng tiền đã xác nhận"
          icon={<WalletCards className="size-5" />}
          tone="success"
        />

        <MetricCard
          label="Pending"
          value={`${pendingPayments.length}`}
          description="Payment đang chờ kiểm tra"
          icon={<Clock3 className="size-5" />}
          tone={pendingPayments.length > 0 ? "warning" : "normal"}
        />

        <MetricCard
          label="Rejected"
          value={`${rejectedPayments.length}`}
          description="Payment bị từ chối"
          icon={<ShieldCheck className="size-5" />}
        />
      </section>

      <section className="mt-5">
        <SurfaceCard className="p-6">
          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr] xl:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Payment control center
              </p>

              <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.055em] text-[#061a3a]">
                Quản trị thanh toán toàn hệ thống
              </h2>

              <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-slate-600">
                Admin có thể xác nhận payment hợp lệ để job tiếp tục hoạt động,
                hoặc từ chối payment nếu thông tin thanh toán chưa đúng.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  asChild
                  className="rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61]"
                >
                  <Link href="/admin/jobs">
                    Mở danh sách jobs
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="rounded-full border-blue-200 bg-white font-extrabold"
                >
                  <Link href="/admin/requests">
                    Mở requests
                    <FileText className="ml-2 size-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <SignalBox
                icon={<Banknote className="size-4" />}
                label="Total value"
                value={formatCurrencyVnd(totalPaymentValue)}
              />

              <SignalBox
                icon={<CheckCircle2 className="size-4" />}
                label="Confirmed"
                value={`${confirmedPayments.length} payment`}
              />

              <SignalBox
                icon={<Clock3 className="size-4" />}
                label="Pending value"
                value={formatCurrencyVnd(pendingPaymentValue)}
                tone={pendingPaymentValue > 0 ? "warning" : "normal"}
              />
            </div>
          </div>
        </SurfaceCard>
      </section>

      <section className="mt-5">
        <SurfaceCard className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Payment list
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Danh sách payment
              </h2>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-600">
                Mỗi payment được liên kết với một job. Admin có thể mở job để
                kiểm tra chi tiết request, designer, update và review.
              </p>
            </div>

            <StatusPill tone="info">{`${payments.length} payments`}</StatusPill>
          </div>

          {payments.length === 0 ? (
            <EmptyState
              title="Chưa có payment nào."
              description="Payment sẽ xuất hiện sau khi customer chọn designer và tạo job."
              href="/admin/jobs"
              buttonLabel="Mở jobs"
            />
          ) : (
            <div className="mt-6 grid gap-5">
              {payments.map((payment) => {
                const job = jobs.find((item) => item.id === payment.job_id);
                const request = job
                  ? requests.find((item) => item.id === job.request_id)
                  : undefined;
                const designer = job
                  ? designers.find((item) => item.id === job.designer_id)
                  : undefined;

                return (
                  <PaymentCard
                    key={payment.id}
                    payment={payment}
                    job={job}
                    request={request}
                    designer={designer}
                  />
                );
              })}
            </div>
          )}
        </SurfaceCard>
      </section>
    </DashboardShell>
  );
}

function PaymentCard({
  payment,
  job,
  request,
  designer,
}: {
  payment: PaymentRow;
  job?: JobRow;
  request?: RequestRow;
  designer?: DesignerRow;
}) {
  const paymentStatus = getPaymentStatusView(payment.status);
  const jobStatus = getJobStatusView(job?.status ?? null);

  return (
    <div className="rounded-[1.35rem] border border-blue-100 bg-blue-50/65 p-5">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={paymentStatus.tone}>
              {paymentStatus.label}
            </StatusPill>

            <StatusPill tone={jobStatus.tone}>{jobStatus.label}</StatusPill>

            {request ? (
              <StatusPill tone="neutral">
                {getSafeCategoryLabel(request.category)}
              </StatusPill>
            ) : null}
          </div>

          <h3 className="mt-4 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
            {job?.title ?? "Không tìm thấy job"}
          </h3>

          <p className="mt-2 text-sm font-bold text-blue-700">
            {request?.business_name ?? "Không tìm thấy business"}
          </p>

          <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            {`Payment created at ${formatDateVi(payment.created_at)}`}
          </p>
        </div>

        {job ? (
          <Button
            asChild
            className="w-fit shrink-0 rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61]"
          >
            <Link href={`/admin/jobs/${job.id}`}>
              Mở job
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <InfoBox
          icon={<WalletCards className="size-4" />}
          label="Payment amount"
          value={formatCurrencyVnd(payment.amount_vnd)}
        />

        <InfoBox
          icon={<Banknote className="size-4" />}
          label="Job agreed price"
          value={job ? formatCurrencyVnd(job.agreed_price_vnd) : "Không có"}
        />

        <InfoBox
          icon={<CalendarDays className="size-4" />}
          label="Reviewed at"
          value={payment.reviewed_at ? formatDateVi(payment.reviewed_at) : "Chưa xử lý"}
        />

        <InfoBox
          icon={<CreditCard className="size-4" />}
          label="Payment status"
          value={paymentStatus.label}
        />
      </div>

      {payment.admin_note ? (
        <div className="mt-5 rounded-[1.15rem] border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
            Admin note
          </p>

          <p className="mt-2 text-sm font-medium leading-7 text-amber-950">
            {payment.admin_note}
          </p>
        </div>
      ) : null}

      <PaymentReviewActions
        paymentId={payment.id}
        currentStatus={payment.status}
      />

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <div className="rounded-[1.2rem] border border-blue-100 bg-white p-5">
          <div className="flex items-start gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
              <Store className="size-5" />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                Request source
              </p>

              <h4 className="mt-2 text-lg font-extrabold tracking-[-0.035em] text-[#061a3a]">
                {request?.title ?? "Không tìm thấy request"}
              </h4>

              <p className="mt-2 text-sm font-bold leading-6 text-blue-700">
                {request?.business_name ?? "Business unknown"}
              </p>
            </div>
          </div>

          {request ? (
            <Button
              asChild
              variant="outline"
              className="mt-4 rounded-full border-blue-200 bg-white font-extrabold"
            >
              <Link href={`/admin/requests/${request.id}`}>
                Xem request
                <FileText className="ml-2 size-4" />
              </Link>
            </Button>
          ) : null}
        </div>

        <div className="rounded-[1.2rem] border border-blue-100 bg-white p-5">
          <div className="flex items-start gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
              <UserRound className="size-5" />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                Designer
              </p>

              <h4 className="mt-2 text-lg font-extrabold tracking-[-0.035em] text-[#061a3a]">
                {designer?.display_name ?? "Không tìm thấy designer"}
              </h4>

              <p className="mt-2 text-sm font-bold leading-6 text-blue-700">
                {designer?.headline ?? "Designer"}
              </p>
            </div>
          </div>

          {designer ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <MiniInfo
                label="Rating"
                value={`${designer.rating ?? 0}/5`}
                icon={<ShieldCheck className="size-4" />}
              />

              <MiniInfo
                label="Completed"
                value={`${designer.completed_jobs ?? 0} jobs`}
                icon={<CheckCircle2 className="size-4" />}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ErrorPanel({ errors }: { errors: Array<string | undefined> }) {
  const realErrors = errors.filter((error): error is string => Boolean(error));

  if (realErrors.length === 0) return null;

  return (
    <SurfaceCard className="mb-5 border-red-200 bg-red-50 p-6">
      <p className="text-sm font-black uppercase tracking-[0.18em] text-red-600">
        Data loading warning
      </p>

      <div className="mt-3 grid gap-2">
        {realErrors.map((error) => (
          <p key={error} className="text-sm font-semibold leading-7 text-red-600">
            {error}
          </p>
        ))}
      </div>
    </SurfaceCard>
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
  tone?: "normal" | "dark" | "success" | "warning";
}) {
  const cardClass =
    tone === "dark"
      ? "border-[#061a3a] bg-[#061a3a] text-white shadow-[0_18px_50px_rgba(6,26,58,0.22)]"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-[#061a3a]"
        : tone === "warning"
          ? "border-amber-200 bg-amber-50 text-[#061a3a]"
          : "border-blue-100 bg-white text-[#061a3a]";

  const iconClass =
    tone === "dark"
      ? "bg-white/10 text-sky-200 ring-white/10"
      : tone === "success"
        ? "bg-white text-emerald-700 ring-emerald-200"
        : tone === "warning"
          ? "bg-white text-amber-700 ring-amber-200"
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

function SignalBox({
  icon,
  label,
  value,
  tone = "normal",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: "normal" | "warning";
}) {
  const boxClass =
    tone === "warning"
      ? "border-amber-200 bg-amber-50"
      : "border-blue-100 bg-blue-50/65";

  return (
    <div className={`rounded-[1.15rem] border p-4 ${boxClass}`}>
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-blue-600">
        {icon}
        {label}
      </div>

      <p className="mt-2 text-sm font-extrabold leading-6 text-[#061a3a]">
        {value}
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

function MiniInfo({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/65 p-3">
      <div className="flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.16em] text-blue-600">
        {icon}
        {label}
      </div>

      <p className="mt-2 break-words text-sm font-extrabold leading-6 text-[#061a3a]">
        {value}
      </p>
    </div>
  );
}

function EmptyState({
  title,
  description,
  href,
  buttonLabel,
}: {
  title: string;
  description: string;
  href: string;
  buttonLabel: string;
}) {
  return (
    <div className="mt-6 grid place-items-center rounded-[1.25rem] border border-blue-100 bg-blue-50/65 p-8 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-white text-blue-700 ring-1 ring-blue-100">
        <CreditCard className="size-6" />
      </div>

      <h3 className="mt-5 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
        {title}
      </h3>

      <p className="mt-3 max-w-xl text-sm font-medium leading-7 text-slate-600">
        {description}
      </p>

      <Button
        asChild
        className="mt-6 rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61]"
      >
        <Link href={href}>{buttonLabel}</Link>
      </Button>
    </div>
  );
}

function getPaymentStatusView(status: string) {
  if (["paid", "confirmed", "completed"].includes(status)) {
    return {
      label: "Đã xác nhận",
      tone: "success" as const,
    };
  }

  if (["pending", "waiting", "submitted"].includes(status)) {
    return {
      label: "Chờ xác nhận",
      tone: "warning" as const,
    };
  }

  if (status === "rejected") {
    return {
      label: "Bị từ chối",
      tone: "warning" as const,
    };
  }

  return {
    label: status,
    tone: "neutral" as const,
  };
}

function getJobStatusView(status: string | null) {
  if (!status) {
    return {
      label: "Không có job",
      tone: "warning" as const,
    };
  }

  if (status === "completed") {
    return {
      label: "Job hoàn thành",
      tone: "success" as const,
    };
  }

  if (status === "active") {
    return {
      label: "Job đang làm",
      tone: "info" as const,
    };
  }

  if (status === "cancelled") {
    return {
      label: "Job đã hủy",
      tone: "warning" as const,
    };
  }

  return {
    label: status,
    tone: "neutral" as const,
  };
}

function getSafeCategoryLabel(category: string) {
  try {
    return getCategoryLabel(category as Parameters<typeof getCategoryLabel>[0]);
  } catch {
    return category;
  }
}