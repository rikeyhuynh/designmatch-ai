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
  ImageIcon,
  Sparkles,
  Star,
  Store,
  UserRound,
  WalletCards,
} from "lucide-react";
import type { ReactNode } from "react";

import { StatusPill } from "@/components/common/status-pill";
import { SurfaceCard } from "@/components/common/surface-card";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/guards";
import { getCategoryLabel } from "@/lib/domain/labels";
import { formatCurrencyVnd, formatDateVi } from "@/lib/format";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RequestRow = {
  id: string;
  title: string;
  business_name: string;
  category: string;
  status: string;
  created_at: string;
};

type JobRow = {
  id: string;
  request_id: string;
  designer_id: string;
  title: string;
  status: string;
  agreed_price_vnd: number;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
};

type DesignerRow = {
  id: string;
  display_name: string;
  headline: string | null;
  rating: number;
  completed_jobs: number;
  response_time_hours: number;
};

type PaymentRow = {
  id: string;
  job_id: string;
  amount_vnd: number;
  status: string;
  created_at: string;
};

type JobUpdateRow = {
  id: string;
  job_id: string;
};

type ReviewRow = {
  id: string;
  job_id: string;
  rating: number;
};

export default async function CustomerJobsPage() {
  const authState = await requireRole(["customer"]);
  const profile = authState.profile;
  const customerProfile = authState.customerProfile;

  if (!profile || !customerProfile) {
    redirect("/auth-check");
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  const requestsResult = await adminSupabase
    .from("design_requests")
    .select("id, title, business_name, category, status, created_at")
    .eq("customer_id", customerProfile.id)
    .order("created_at", { ascending: false });

  const requests = (requestsResult.data ?? []) as unknown as RequestRow[];
  const requestIds = requests.map((request) => request.id);

  const jobsResult =
    requestIds.length > 0
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
            due_at,
            completed_at,
            created_at
          `,
          )
          .in("request_id", requestIds)
          .order("created_at", { ascending: false })
      : { data: [], error: null };

  const jobs = (jobsResult.data ?? []) as unknown as JobRow[];
  const jobIds = jobs.map((job) => job.id);

  const designerIds = Array.from(new Set(jobs.map((job) => job.designer_id)));

  const designersResult =
    designerIds.length > 0
      ? await adminSupabase
          .from("designer_profiles")
          .select(
            "id, display_name, headline, rating, completed_jobs, response_time_hours",
          )
          .in("id", designerIds)
      : { data: [], error: null };

  const paymentsResult =
    jobIds.length > 0
      ? await adminSupabase
          .from("payments")
          .select("id, job_id, amount_vnd, status, created_at")
          .in("job_id", jobIds)
      : { data: [], error: null };

  const updatesResult =
    jobIds.length > 0
      ? await adminSupabase
          .from("job_updates")
          .select("id, job_id")
          .in("job_id", jobIds)
      : { data: [], error: null };

  const reviewsResult =
    jobIds.length > 0
      ? await adminSupabase
          .from("job_reviews")
          .select("id, job_id, rating")
          .in("job_id", jobIds)
      : { data: [], error: null };

  const designers = (designersResult.data ?? []) as unknown as DesignerRow[];
  const payments = (paymentsResult.data ?? []) as unknown as PaymentRow[];
  const updates = (updatesResult.data ?? []) as unknown as JobUpdateRow[];
  const reviews = (reviewsResult.data ?? []) as unknown as ReviewRow[];

  const totalJobValue = jobs.reduce(
    (total, job) => total + Number(job.agreed_price_vnd ?? 0),
    0,
  );

  const confirmedPayments = payments.filter((payment) =>
    ["paid", "confirmed", "completed"].includes(payment.status),
  );

  const totalConfirmedPaymentValue = confirmedPayments.reduce(
    (total, payment) => total + Number(payment.amount_vnd ?? 0),
    0,
  );

  const activeJobs = jobs.filter((job) => job.status === "active").length;
  const completedJobs = jobs.filter((job) => job.status === "completed").length;
  const pendingPayments = payments.filter((payment) =>
    ["pending", "waiting", "submitted"].includes(payment.status),
  ).length;

  return (
    <DashboardShell
      role="customer"
      title="Job & Payment"
      description="Theo dõi job đã tạo, tiến độ thực hiện và trạng thái thanh toán."
      userName={profile.full_name}
      userEmail={authState.userEmail}
    >
      <ErrorPanel
        errors={[
          requestsResult.error?.message,
          jobsResult.error?.message,
          designersResult.error?.message,
          paymentsResult.error?.message,
          updatesResult.error?.message,
          reviewsResult.error?.message,
        ]}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total jobs"
          value={`${jobs.length}`}
          description="Tổng job đã tạo"
          icon={<BriefcaseBusiness className="size-5" />}
          tone="dark"
        />

        <MetricCard
          label="Active jobs"
          value={`${activeJobs}`}
          description="Job đang thực hiện"
          icon={<Clock3 className="size-5" />}
          tone={activeJobs > 0 ? "warning" : "normal"}
        />

        <MetricCard
          label="Completed"
          value={`${completedJobs}`}
          description="Job đã hoàn thành"
          icon={<CheckCircle2 className="size-5" />}
          tone="success"
        />

        <MetricCard
          label="Paid value"
          value={formatCurrencyVnd(totalConfirmedPaymentValue)}
          description="Tổng tiền đã xác nhận"
          icon={<WalletCards className="size-5" />}
        />
      </section>

      <section className="mt-5">
        <SurfaceCard className="p-6">
          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr] xl:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Job workspace
              </p>

              <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.055em] text-[#061a3a]">
                Theo dõi toàn bộ job thiết kế
              </h2>

              <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-slate-600">
                Đây là nơi customer theo dõi các job đã tạo sau khi chọn
                designer, kiểm tra trạng thái thanh toán, xem tiến độ và hoàn
                tất đánh giá sau khi job hoàn thành.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  asChild
                  className="rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61]"
                >
                  <Link href="/customer/requests">
                    Mở request của tôi
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="rounded-full border-blue-200 bg-white font-extrabold"
                >
                  <Link href="/customer/matches">
                    Xem designer match
                    <Sparkles className="ml-2 size-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <SignalBox
                icon={<Banknote className="size-4" />}
                label="Job value"
                value={formatCurrencyVnd(totalJobValue)}
              />

              <SignalBox
                icon={<CreditCard className="size-4" />}
                label="Payments"
                value={`${confirmedPayments.length} đã xác nhận`}
              />

              <SignalBox
                icon={<Clock3 className="size-4" />}
                label="Pending"
                value={`${pendingPayments} payment chờ duyệt`}
                tone={pendingPayments > 0 ? "warning" : "normal"}
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
                Job list
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Danh sách job của bạn
              </h2>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-600">
                Mỗi job được liên kết với một request, một designer và một payment
                tương ứng.
              </p>
            </div>

            <StatusPill tone="info">{`${jobs.length} jobs`}</StatusPill>
          </div>

          {jobs.length === 0 ? (
            <EmptyState
              title="Bạn chưa có job nào."
              description="Hãy tạo brief, tạo matching và chọn designer để chuyển request thành job."
              href="/customer/requests"
              buttonLabel="Mở request"
            />
          ) : (
            <div className="mt-6 grid gap-5">
              {jobs.map((job) => {
                const request = requests.find(
                  (item) => item.id === job.request_id,
                );

                const designer = designers.find(
                  (item) => item.id === job.designer_id,
                );

                const payment = payments.find((item) => item.job_id === job.id);

                const updateCount = updates.filter(
                  (item) => item.job_id === job.id,
                ).length;

                const review = reviews.find((item) => item.job_id === job.id);

                return (
                  <JobCard
                    key={job.id}
                    job={job}
                    request={request}
                    designer={designer}
                    payment={payment}
                    updateCount={updateCount}
                    review={review}
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

function JobCard({
  job,
  request,
  designer,
  payment,
  updateCount,
  review,
}: {
  job: JobRow;
  request?: RequestRow;
  designer?: DesignerRow;
  payment?: PaymentRow;
  updateCount: number;
  review?: ReviewRow;
}) {
  const jobStatus = getJobStatusView(job.status);
  const paymentStatus = getPaymentStatusView(payment?.status ?? null);

  return (
    <div className="rounded-[1.35rem] border border-blue-100 bg-blue-50/65 p-5">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={jobStatus.tone}>{jobStatus.label}</StatusPill>

            <StatusPill tone={paymentStatus.tone}>
              {paymentStatus.label}
            </StatusPill>

            {request ? (
              <StatusPill tone="neutral">
                {getSafeCategoryLabel(request.category)}
              </StatusPill>
            ) : null}

            {review ? (
              <StatusPill tone="success">Đã review</StatusPill>
            ) : (
              <StatusPill tone="info">Chưa review</StatusPill>
            )}
          </div>

          <h3 className="mt-4 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
            {job.title}
          </h3>

          <p className="mt-2 text-sm font-bold text-blue-700">
            {request?.business_name ?? "Không tìm thấy business"}
          </p>

          <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            {`Created at ${formatDateVi(job.created_at)}`}
          </p>
        </div>

        <Button
          asChild
          className="w-fit shrink-0 rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61]"
        >
          <Link href={`/customer/jobs/${job.id}`}>
            Mở job
            <ArrowRight className="ml-2 size-4" />
          </Link>
        </Button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <InfoBox
          icon={<WalletCards className="size-4" />}
          label="Agreed price"
          value={formatCurrencyVnd(job.agreed_price_vnd)}
        />

        <InfoBox
          icon={<CalendarDays className="size-4" />}
          label="Due date"
          value={job.due_at ? formatDateVi(job.due_at) : "Chưa có"}
        />

        <InfoBox
          icon={<ImageIcon className="size-4" />}
          label="Updates"
          value={`${updateCount} update`}
        />

        <InfoBox
          icon={<CreditCard className="size-4" />}
          label="Payment"
          value={payment ? formatCurrencyVnd(payment.amount_vnd) : "Chưa có"}
        />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
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

              <p className="mt-1 text-sm font-bold leading-6 text-blue-700">
                {designer?.headline ?? "Designer"}
              </p>
            </div>
          </div>

          {designer ? (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <MiniInfo
                icon={<Star className="size-4" />}
                label="Rating"
                value={`${designer.rating ?? 0}/5`}
              />

              <MiniInfo
                icon={<CheckCircle2 className="size-4" />}
                label="Done"
                value={`${designer.completed_jobs ?? 0}`}
              />

              <MiniInfo
                icon={<Clock3 className="size-4" />}
                label="Response"
                value={`${designer.response_time_hours ?? 24}h`}
              />
            </div>
          ) : null}
        </div>

        <div className="rounded-[1.2rem] border border-blue-100 bg-white p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
            Request source
          </p>

          <h4 className="mt-2 text-lg font-extrabold tracking-[-0.035em] text-[#061a3a]">
            {request?.title ?? "Không tìm thấy request"}
          </h4>

          <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
            Job này được tạo từ request gốc. Bạn có thể mở job để xem tiến độ,
            feedback, ảnh cập nhật và hoàn tất nghiệm thu.
          </p>

          {request ? (
            <Button
              asChild
              variant="outline"
              className="mt-4 rounded-full border-blue-200 bg-white font-extrabold"
            >
              <Link href={`/customer/requests/${request.id}`}>
                Xem request gốc
                <FileText className="ml-2 size-4" />
              </Link>
            </Button>
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
        <Store className="size-6" />
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

function getJobStatusView(status: string) {
  if (status === "completed") {
    return {
      label: "Hoàn thành",
      tone: "success" as const,
    };
  }

  if (status === "active") {
    return {
      label: "Đang thực hiện",
      tone: "info" as const,
    };
  }

  if (status === "cancelled") {
    return {
      label: "Đã hủy",
      tone: "warning" as const,
    };
  }

  return {
    label: status,
    tone: "neutral" as const,
  };
}

function getPaymentStatusView(status: string | null) {
  if (!status) {
    return {
      label: "Chưa có payment",
      tone: "neutral" as const,
    };
  }

  if (["paid", "confirmed", "completed"].includes(status)) {
    return {
      label: "Đã xác nhận thanh toán",
      tone: "success" as const,
    };
  }

  if (["pending", "waiting", "submitted"].includes(status)) {
    return {
      label: "Chờ xác nhận thanh toán",
      tone: "warning" as const,
    };
  }

  if (status === "rejected") {
    return {
      label: "Payment bị từ chối",
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