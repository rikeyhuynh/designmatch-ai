import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  FileText,
  ImageIcon,
  MessageSquareText,
  Palette,
  SendHorizonal,
  ShieldCheck,
  Sparkles,
  Store,
  Target,
  WalletCards,
} from "lucide-react";
import type { ReactNode } from "react";

import { StatusPill } from "@/components/common/status-pill";
import { SurfaceCard } from "@/components/common/surface-card";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { CreateJobUpdateForm } from "@/features/designer/jobs/components/create-job-update-form";
import { requireRole } from "@/lib/auth/guards";
import {
  getCategoryLabel,
  getIndustryLabel,
  getStyleLabel,
} from "@/lib/domain/labels";
import { formatCurrencyVnd, formatDateVi, formatPercent } from "@/lib/format";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type DesignerJobDetailPageProps = {
  params: Promise<Record<string, string>>;
};

type JobDetailRow = {
  id: string;
  request_id: string;
  title: string;
  status: string;
  agreed_price_vnd: number;
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
    budget_min_vnd: number;
    budget_max_vnd: number;
    deadline: string | null;
    preferred_styles: string[] | null;
  } | null;
};

type PaymentRow = {
  id: string;
  job_id: string;
  amount_vnd: number;
  status: string;
  transfer_note: string | null;
  admin_note: string | null;
  confirmed_at: string | null;
  created_at: string;
};

type AiBriefRow = {
  id: string;
  objective: string;
  visual_direction: string;
  key_message: string | null;
  deliverables: string[] | null;
  recommended_styles: string[] | null;
  risk_level: string;
  risk_notes: string[] | null;
  brief_completeness_score: number;
};

type JobUpdateRow = {
  id: string;
  update_type: string;
  title: string;
  message: string;
  attachment_url: string | null;
  created_at: string;
};

type JobUpdateFeedbackRow = {
  id: string;
  update_id: string;
  message: string;
  created_at: string;
};

export default async function DesignerJobDetailPage({
  params,
}: DesignerJobDetailPageProps) {
  const routeParams = await params;
  const jobId = routeParams.jobId ?? routeParams.jobID;

  if (!jobId) {
    notFound();
  }

  const authState = await requireRole(["designer"]);
  const profile = authState.profile;
  const designerProfile = authState.designerProfile;

  if (!profile || !designerProfile) {
    redirect("/auth-check");
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  const jobResult = await adminSupabase
    .from("jobs")
    .select(
      `
      id,
      request_id,
      title,
      status,
      agreed_price_vnd,
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
        budget_min_vnd,
        budget_max_vnd,
        deadline,
        preferred_styles
      )
    `,
    )
    .eq("id", jobId)
    .eq("designer_id", designerProfile.id)
    .maybeSingle();

  if (jobResult.error || !jobResult.data) {
    notFound();
  }

  const job = jobResult.data as unknown as JobDetailRow;

  const [briefResult, paymentResult, updateResult, feedbackResult] =
    await Promise.all([
      adminSupabase
        .from("ai_briefs")
        .select(
          `
          id,
          objective,
          visual_direction,
          key_message,
          deliverables,
          recommended_styles,
          risk_level,
          risk_notes,
          brief_completeness_score
        `,
        )
        .eq("request_id", job.request_id)
        .maybeSingle(),

      adminSupabase
        .from("payments")
        .select(
          `
          id,
          job_id,
          amount_vnd,
          status,
          transfer_note,
          admin_note,
          confirmed_at,
          created_at
        `,
        )
        .eq("job_id", job.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),

      adminSupabase
        .from("job_updates")
        .select("id, update_type, title, message, attachment_url, created_at")
        .eq("job_id", job.id)
        .eq("designer_id", designerProfile.id)
        .order("created_at", { ascending: false }),

      adminSupabase
        .from("job_update_feedbacks")
        .select("id, update_id, message, created_at")
        .eq("job_id", job.id)
        .order("created_at", { ascending: true }),
    ]);

  const brief = briefResult.data as unknown as AiBriefRow | null;
  const payment = paymentResult.data as unknown as PaymentRow | null;
  const updates = (updateResult.data ?? []) as unknown as JobUpdateRow[];
  const feedbacks = (feedbackResult.data ??
    []) as unknown as JobUpdateFeedbackRow[];

  const request = job.design_requests;

  const jobStatus = getSafeJobStatus(job.status);
  const paymentStatus = getSafePaymentStatus(payment?.status ?? null);

  const canUpdateJob = job.status === "active";
  const isPaymentPending = job.status === "payment_pending";
  const isCompleted = job.status === "completed";
  const isCancelled = job.status === "cancelled";

  return (
    <DashboardShell
      role="designer"
      title={job.title}
      description="Chi tiết job, trạng thái thanh toán, brief khách hàng, cập nhật tiến độ và feedback."
      userName={profile.full_name}
      userEmail={authState.userEmail}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Button
          asChild
          variant="outline"
          className="rounded-full border-blue-200 bg-white font-extrabold"
        >
          <Link href="/designer/jobs">
            <ArrowLeft className="mr-2 size-4" />
            Quay lại job
          </Link>
        </Button>

        <div className="flex flex-wrap gap-2">
          <StatusPill tone={jobStatus.tone}>{jobStatus.label}</StatusPill>

          {payment ? (
            <StatusPill tone={paymentStatus.tone}>
              {paymentStatus.label}
            </StatusPill>
          ) : (
            <StatusPill tone="warning">Chưa có payment</StatusPill>
          )}

          <StatusPill tone="info">{`${updates.length} updates`}</StatusPill>
        </div>
      </div>

      {isPaymentPending ? (
        <SurfaceCard className="mb-5 border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-600 text-white">
              <WalletCards className="size-5" />
            </div>

            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-700">
                Waiting for payment
              </p>

              <p className="mt-2 text-sm font-medium leading-7 text-amber-950">
                Customer đã chọn bạn cho job này, nhưng payment chưa được admin
                xác nhận. Bạn chưa thể gửi progress, draft hoặc final delivery
                cho đến khi job chuyển sang trạng thái đang thực hiện.
              </p>
            </div>
          </div>
        </SurfaceCard>
      ) : null}

      {canUpdateJob ? (
        <SurfaceCard className="mb-5 border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-700 text-white">
              <CheckCircle2 className="size-5" />
            </div>

            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
                Job active
              </p>

              <p className="mt-2 text-sm font-medium leading-7 text-emerald-950">
                Payment đã được xác nhận. Bạn có thể gửi tiến độ, bản nháp hoặc
                bản hoàn thiện cho customer.
              </p>
            </div>
          </div>
        </SurfaceCard>
      ) : null}

      {isCompleted ? (
        <SurfaceCard className="mb-5 border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-700 text-white">
              <ShieldCheck className="size-5" />
            </div>

            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
                Job completed
              </p>

              <p className="mt-2 text-sm font-medium leading-7 text-emerald-950">
                Customer đã duyệt hoàn thành job này. Form gửi cập nhật đã được
                khóa.
              </p>
            </div>
          </div>
        </SurfaceCard>
      ) : null}

      {isCancelled ? (
        <SurfaceCard className="mb-5 border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-600 text-white">
              <ShieldCheck className="size-5" />
            </div>

            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-700">
                Job cancelled
              </p>

              <p className="mt-2 text-sm font-medium leading-7 text-amber-950">
                Job này đã bị hủy nên bạn không thể gửi cập nhật mới.
              </p>
            </div>
          </div>
        </SurfaceCard>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <SurfaceCard className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Job overview
              </p>

              <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.055em] text-[#061a3a]">
                {job.title}
              </h1>

              <p className="mt-2 text-sm font-bold text-blue-700">
                {request?.business_name ?? "Chưa rõ thương hiệu"}
              </p>

              <p className="mt-4 text-sm font-medium leading-7 text-slate-600">
                Đây là workspace làm việc của designer. Bạn chỉ có thể gửi cập
                nhật khi job đã được thanh toán và admin đã xác nhận payment.
              </p>
            </div>

            <div className="grid size-14 place-items-center rounded-2xl bg-[#061a3a] text-white">
              <BriefcaseBusiness className="size-6" aria-hidden="true" />
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
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
              icon={<ShieldCheck className="size-4" />}
              label="Job status"
              value={jobStatus.label}
            />

            <InfoBox
              icon={<FileText className="size-4" />}
              label="Job ID"
              value={job.id}
            />
          </div>
        </SurfaceCard>

        <PaymentPanel payment={payment} paymentStatus={paymentStatus} />
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        {request ? (
          <SurfaceCard className="p-6">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
              Customer request
            </p>

            <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
              {request.title}
            </h2>

            <p className="mt-2 text-sm font-bold text-blue-700">
              {request.business_name}
            </p>

            <p className="mt-5 text-sm font-medium leading-7 text-slate-600">
              {request.description}
            </p>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <InfoBox
                icon={<Store className="size-4" />}
                label="Industry"
                value={getSafeIndustryLabel(request.industry)}
              />

              <InfoBox
                icon={<Palette className="size-4" />}
                label="Category"
                value={getSafeCategoryLabel(request.category)}
              />

              <InfoBox
                icon={<Target className="size-4" />}
                label="Target audience"
                value={request.target_audience ?? "Chưa mô tả rõ"}
              />

              <InfoBox
                icon={<CircleDollarSign className="size-4" />}
                label="Original budget"
                value={`${formatCurrencyVnd(
                  request.budget_min_vnd,
                )} - ${formatCurrencyVnd(request.budget_max_vnd)}`}
              />
            </div>

            {request.preferred_styles && request.preferred_styles.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {request.preferred_styles.map((style) => (
                  <StatusPill key={style} tone="neutral">
                    {getSafeStyleLabel(style)}
                  </StatusPill>
                ))}
              </div>
            ) : null}
          </SurfaceCard>
        ) : (
          <SurfaceCard className="p-6">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-amber-700">
              Missing request
            </p>

            <p className="mt-3 text-sm font-medium leading-7 text-amber-900">
              Không tìm thấy request gốc của job này.
            </p>
          </SurfaceCard>
        )}

        <SurfaceCard className="p-6">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
            Send update
          </p>

          <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
            Gửi cập nhật tiến độ
          </h2>

          <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
            Gửi progress, bản nháp hoặc bản hoàn thiện để customer theo dõi tiến
            độ và phản hồi.
          </p>

          {!canUpdateJob ? (
            <div className="mt-5 rounded-[1.25rem] border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-700">
                Form update đang bị khóa
              </p>

              <p className="mt-2 text-sm font-medium leading-7 text-amber-950">
                {getUpdateLockedMessage(job.status)}
              </p>
            </div>
          ) : null}

          <div className="mt-5">
            <CreateJobUpdateForm jobId={job.id} disabled={!canUpdateJob} />
          </div>
        </SurfaceCard>
      </section>

      <section className="mt-6">
        {brief ? (
          <SurfaceCard variant="dark" className="p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-sky-200/70">
                  AI Brief
                </p>

                <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-white">
                  Brief chuẩn hóa cho designer
                </h2>

                <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-white/65">
                  Đây là phần định hướng để bạn bám sát mục tiêu, phong cách và
                  thông điệp thiết kế.
                </p>
              </div>

              <StatusPill tone="info">
                {`${formatPercent(brief.brief_completeness_score / 100)} complete`}
              </StatusPill>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              <DarkBlock label="Objective" value={brief.objective} />

              <DarkBlock
                label="Visual direction"
                value={brief.visual_direction}
              />

              {brief.key_message ? (
                <DarkBlock label="Key message" value={brief.key_message} />
              ) : null}

              <DarkBlock
                label="Risk level"
                value={getRiskLevelLabel(brief.risk_level)}
              />

              {brief.deliverables && brief.deliverables.length > 0 ? (
                <DarkListBlock title="Deliverables" items={brief.deliverables} />
              ) : null}

              {brief.recommended_styles &&
              brief.recommended_styles.length > 0 ? (
                <DarkListBlock
                  title="Recommended styles"
                  items={brief.recommended_styles.map(getSafeStyleLabel)}
                />
              ) : null}

              {brief.risk_notes && brief.risk_notes.length > 0 ? (
                <DarkListBlock title="Risk notes" items={brief.risk_notes} />
              ) : null}
            </div>
          </SurfaceCard>
        ) : (
          <SurfaceCard className="grid place-items-center p-8 text-center">
            <Sparkles className="size-8 text-blue-700" />

            <h2 className="mt-4 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
              Chưa có AI brief.
            </h2>

            <p className="mt-2 max-w-xl text-sm font-medium leading-7 text-slate-600">
              Customer chưa tạo AI brief cho request này.
            </p>
          </SurfaceCard>
        )}
      </section>

      <section className="mt-6">
        <SurfaceCard className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Update timeline
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Lịch sử cập nhật và feedback
              </h2>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-600">
                Theo dõi các update bạn đã gửi và phản hồi từ customer.
              </p>
            </div>

            <StatusPill tone="info">{`${updates.length} updates`}</StatusPill>
          </div>

          {updates.length === 0 ? (
            <div className="mt-6 grid place-items-center rounded-[1.25rem] border border-blue-100 bg-blue-50/60 p-8 text-center">
              <SendHorizonal className="size-8 text-blue-700" />

              <h3 className="mt-4 text-xl font-extrabold tracking-[-0.04em] text-[#061a3a]">
                Chưa có cập nhật nào.
              </h3>

              <p className="mt-2 max-w-xl text-sm font-medium leading-7 text-slate-600">
                Khi job active, bạn có thể gửi progress, draft hoặc final
                delivery ở form phía trên.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {updates.map((update) => (
                <DesignerUpdateCard
                  key={update.id}
                  update={update}
                  feedbacks={feedbacks.filter(
                    (feedback) => feedback.update_id === update.id,
                  )}
                />
              ))}
            </div>
          )}
        </SurfaceCard>
      </section>
    </DashboardShell>
  );
}

function PaymentPanel({
  payment,
  paymentStatus,
}: {
  payment: PaymentRow | null;
  paymentStatus: ReturnType<typeof getSafePaymentStatus>;
}) {
  if (!payment) {
    return (
      <SurfaceCard className="border-amber-200 bg-amber-50 p-6">
        <div className="flex items-start gap-3">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-amber-600 text-white">
            <WalletCards className="size-5" />
          </div>

          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-amber-700">
              Payment missing
            </p>

            <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
              Chưa có payment
            </h2>

            <p className="mt-3 text-sm font-medium leading-7 text-amber-950">
              Job này chưa có payment record. Designer chưa nên bắt đầu làm cho
              đến khi admin xử lý.
            </p>
          </div>
        </div>
      </SurfaceCard>
    );
  }

  const isConfirmed = ["paid", "confirmed", "completed"].includes(
    payment.status,
  );

  return (
    <SurfaceCard
      className={`p-6 ${
        isConfirmed
          ? "border-emerald-200 bg-emerald-50"
          : "border-amber-200 bg-amber-50"
      }`}
    >
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p
            className={`text-sm font-black uppercase tracking-[0.22em] ${
              isConfirmed ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            Payment status
          </p>

          <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
            Thanh toán của customer
          </h2>

          <p
            className={`mt-3 text-sm font-medium leading-7 ${
              isConfirmed ? "text-emerald-950" : "text-amber-950"
            }`}
          >
            {isConfirmed
              ? "Payment đã được xác nhận. Job có thể được thực hiện."
              : "Payment chưa được xác nhận. Form gửi update sẽ bị khóa cho đến khi admin xác nhận."}
          </p>
        </div>

        <StatusPill tone={paymentStatus.tone}>{paymentStatus.label}</StatusPill>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <InfoBox
          icon={<CircleDollarSign className="size-4" />}
          label="Amount"
          value={formatCurrencyVnd(payment.amount_vnd)}
        />

        <InfoBox
          icon={<FileText className="size-4" />}
          label="Transfer note"
          value={payment.transfer_note ?? "Chưa có"}
        />

        <InfoBox
          icon={<Banknote className="size-4" />}
          label="Payment status"
          value={paymentStatus.label}
        />

        <InfoBox
          icon={<CalendarDays className="size-4" />}
          label="Confirmed at"
          value={payment.confirmed_at ? formatDateVi(payment.confirmed_at) : "Chưa xác nhận"}
        />
      </div>

      {payment.admin_note ? (
        <div className="mt-5 rounded-[1.15rem] border border-white/70 bg-white/70 p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#061a3a]">
            Admin note
          </p>

          <p className="mt-2 text-sm font-medium leading-7 text-slate-700">
            {payment.admin_note}
          </p>
        </div>
      ) : null}
    </SurfaceCard>
  );
}

function DesignerUpdateCard({
  update,
  feedbacks,
}: {
  update: JobUpdateRow;
  feedbacks: JobUpdateFeedbackRow[];
}) {
  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-blue-100 bg-blue-50/65">
      {update.attachment_url ? (
        <div className="border-b border-blue-100 bg-white p-3">
          <div className="overflow-hidden rounded-[1.1rem] border border-blue-100 bg-slate-100">
            <img
              src={update.attachment_url}
              alt={update.title}
              className="max-h-[520px] w-full object-contain"
            />
          </div>
        </div>
      ) : null}

      <div className="p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone="neutral">
                {getUpdateTypeLabel(update.update_type)}
              </StatusPill>

              {update.attachment_url ? (
                <StatusPill tone="info">Có hình ảnh</StatusPill>
              ) : null}

              {update.update_type === "final" ? (
                <StatusPill tone="success">Final delivery</StatusPill>
              ) : null}
            </div>

            <h3 className="mt-3 text-lg font-extrabold tracking-[-0.035em] text-[#061a3a]">
              {update.title}
            </h3>
          </div>

          <p className="text-sm font-bold text-slate-500">
            {formatDateVi(update.created_at)}
          </p>
        </div>

        <p className="mt-3 text-sm font-medium leading-7 text-slate-700">
          {update.message}
        </p>

        {update.attachment_url ? (
          <Button
            asChild
            variant="outline"
            className="mt-4 rounded-full border-blue-200 bg-white font-extrabold"
          >
            <a href={update.attachment_url} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 size-4" />
              Mở ảnh gốc
            </a>
          </Button>
        ) : (
          <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-500">
            <ImageIcon className="size-4" />
            Không có ảnh đính kèm
          </div>
        )}

        <div className="mt-5 rounded-[1.2rem] border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2">
            <MessageSquareText className="size-4 text-amber-700" />

            <p className="text-sm font-black uppercase tracking-[0.16em] text-amber-700">
              Feedback từ customer
            </p>
          </div>

          {feedbacks.length > 0 ? (
            <div className="mt-3 grid gap-2">
              {feedbacks.map((feedback) => (
                <div
                  key={feedback.id}
                  className="rounded-xl border border-amber-200 bg-white p-3"
                >
                  <p className="text-sm font-medium leading-6 text-slate-700">
                    {feedback.message}
                  </p>

                  <p className="mt-2 text-xs font-bold text-slate-500">
                    {formatDateVi(feedback.created_at)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm font-medium leading-6 text-amber-950">
              Customer chưa gửi feedback cho cập nhật này.
            </p>
          )}
        </div>
      </div>
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
    <div className="rounded-[1.15rem] border border-blue-100 bg-blue-50/65 p-4">
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

function DarkBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-200/60">
        {label}
      </p>

      <p className="mt-2 text-sm font-semibold leading-7 text-white">
        {value}
      </p>
    </div>
  );
}

function DarkListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-200/60">
        {title}
      </p>

      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <div
            key={item}
            className="rounded-xl border border-white/10 bg-white/[0.06] p-3 text-sm font-semibold leading-6 text-white"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function getSafeJobStatus(status: string) {
  if (status === "payment_pending") {
    return {
      label: "Chờ thanh toán",
      tone: "warning" as const,
    };
  }

  if (status === "active") {
    return {
      label: "Đang thực hiện",
      tone: "info" as const,
    };
  }

  if (status === "completed") {
    return {
      label: "Hoàn thành",
      tone: "success" as const,
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

function getSafePaymentStatus(status: string | null) {
  if (!status) {
    return {
      label: "Chưa có payment",
      tone: "warning" as const,
    };
  }

  if (status === "waiting_transfer") {
    return {
      label: "Chờ customer chuyển khoản",
      tone: "warning" as const,
    };
  }

  if (status === "pending") {
    return {
      label: "Chờ admin duyệt",
      tone: "warning" as const,
    };
  }

  if (["paid", "confirmed", "completed"].includes(status)) {
    return {
      label: "Đã xác nhận",
      tone: "success" as const,
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

function getUpdateLockedMessage(status: string) {
  if (status === "payment_pending") {
    return "Customer chưa thanh toán hoặc admin chưa xác nhận payment. Bạn chỉ được gửi cập nhật sau khi job chuyển sang trạng thái đang thực hiện.";
  }

  if (status === "completed") {
    return "Job này đã hoàn thành nên không thể gửi thêm cập nhật mới.";
  }

  if (status === "cancelled") {
    return "Job này đã bị hủy nên không thể gửi cập nhật mới.";
  }

  return `Job hiện đang ở trạng thái "${status}", chưa thể gửi cập nhật.`;
}

function getUpdateTypeLabel(updateType: string) {
  if (updateType === "draft") return "Bản nháp";
  if (updateType === "final") return "Bản hoàn thiện";
  return "Tiến độ";
}

function getRiskLevelLabel(riskLevel: string) {
  if (riskLevel === "low") return "Thấp";
  if (riskLevel === "medium") return "Trung bình";
  if (riskLevel === "high") return "Cao";
  return riskLevel;
}

function getSafeCategoryLabel(category: string) {
  try {
    return getCategoryLabel(category as Parameters<typeof getCategoryLabel>[0]);
  } catch {
    return category;
  }
}

function getSafeIndustryLabel(industry: string) {
  try {
    return getIndustryLabel(industry as Parameters<typeof getIndustryLabel>[0]);
  } catch {
    return industry;
  }
}

function getSafeStyleLabel(style: string) {
  try {
    return getStyleLabel(style as Parameters<typeof getStyleLabel>[0]);
  } catch {
    return style;
  }
}