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
  Star,
  Store,
  Target,
  UserRound,
  WalletCards,
} from "lucide-react";
import type { ReactNode } from "react";

import { StatusPill } from "@/components/common/status-pill";
import { SurfaceCard } from "@/components/common/surface-card";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { CompleteJobButton } from "@/features/customer/jobs/components/complete-job-button";
import { CreateJobReviewForm } from "@/features/customer/jobs/components/create-job-review-form";
import { CreateUpdateFeedbackForm } from "@/features/customer/jobs/components/create-update-feedback-form";
import { requireRole } from "@/lib/auth/guards";
import {
  getCategoryLabel,
  getIndustryLabel,
  getStyleLabel,
} from "@/lib/domain/labels";
import { formatCurrencyVnd, formatDateVi, formatPercent } from "@/lib/format";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type CustomerJobDetailPageProps = {
  params: Promise<Record<string, string>>;
};

type CustomerJobDetailRow = {
  id: string;
  request_id: string;
  title: string;
  status: string;
  agreed_price_vnd: number;
  started_at: string | null;
  due_at: string | null;
  created_at: string;
  designer_profiles: {
    id: string;
    display_name: string;
    headline: string | null;
    rating: number;
    completed_jobs: number;
    response_time_hours: number;
  } | null;
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

type JobReviewRow = {
  id: string;
  job_id: string;
  customer_id: string;
  designer_id: string;
  rating: number;
  comment: string;
  created_at: string;
};

const bankConfig = {
  bankName: process.env.BANK_TRANSFER_BANK_NAME ?? "",
  accountNumber: process.env.BANK_TRANSFER_ACCOUNT_NUMBER ?? "",
  accountName: process.env.BANK_TRANSFER_ACCOUNT_NAME ?? "",
};

export default async function CustomerJobDetailPage({
  params,
}: CustomerJobDetailPageProps) {
  const routeParams = await params;
  const jobId = routeParams.jobId ?? routeParams.jobID;

  if (!jobId) {
    notFound();
  }

  const authState = await requireRole(["customer"]);
  const profile = authState.profile;
  const customerProfile = authState.customerProfile;

  if (!profile || !customerProfile) {
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
      designer_profiles (
        id,
        display_name,
        headline,
        rating,
        completed_jobs,
        response_time_hours
      ),
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
    .eq("customer_id", customerProfile.id)
    .maybeSingle();

  if (jobResult.error || !jobResult.data) {
    notFound();
  }

  const job = jobResult.data as unknown as CustomerJobDetailRow;

  const [briefResult, paymentResult, updateResult, feedbackResult, reviewResult] =
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
        .order("created_at", { ascending: false }),

      adminSupabase
        .from("job_update_feedbacks")
        .select("id, update_id, message, created_at")
        .eq("job_id", job.id)
        .eq("customer_id", customerProfile.id)
        .order("created_at", { ascending: true }),

      adminSupabase
        .from("job_reviews")
        .select("id, job_id, customer_id, designer_id, rating, comment, created_at")
        .eq("job_id", job.id)
        .eq("customer_id", customerProfile.id)
        .maybeSingle(),
    ]);

  const brief = briefResult.data as unknown as AiBriefRow | null;
  const payment = paymentResult.data as unknown as PaymentRow | null;
  const updates = (updateResult.data ?? []) as unknown as JobUpdateRow[];
  const feedbacks = (feedbackResult.data ??
    []) as unknown as JobUpdateFeedbackRow[];
  const review = reviewResult.data as unknown as JobReviewRow | null;

  const request = job.design_requests;
  const designer = job.designer_profiles;

  const finalUpdates = updates.filter(
    (update) => update.update_type === "final",
  );

  const isCompleted = job.status === "completed";
  const isPaymentPending = job.status === "payment_pending";
  const isActive = job.status === "active";
  const canCompleteJob = isActive && finalUpdates.length > 0;

  const jobStatus = getSafeJobStatus(job.status);
  const paymentStatus = getSafePaymentStatus(payment?.status ?? null);

  return (
    <DashboardShell
      role="customer"
      title={job.title}
      description="Theo dõi thanh toán, tiến độ thiết kế, ảnh preview, feedback, duyệt bản hoàn thiện và đánh giá designer."
      userName={profile.full_name}
      userEmail={authState.userEmail}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Button
          asChild
          variant="outline"
          className="rounded-full border-blue-200 bg-white font-extrabold"
        >
          <Link href="/customer/jobs">
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

          {review ? (
            <StatusPill tone="success">Đã đánh giá</StatusPill>
          ) : null}
        </div>
      </div>

      {isCompleted ? (
        <SurfaceCard className="mb-5 border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-700 text-white">
              <CheckCircle2 className="size-5" />
            </div>

            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
                Job completed
              </p>

              <p className="mt-2 text-sm font-medium leading-7 text-emerald-950">
                Job này đã được duyệt hoàn thành. Bạn có thể đánh giá designer
                nếu chưa gửi review cho job này.
              </p>
            </div>
          </div>
        </SurfaceCard>
      ) : null}

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
                Job đã được tạo nhưng designer chỉ bắt đầu làm sau khi payment
                được admin xác nhận. Hãy chuyển khoản đúng số tiền và đúng nội
                dung bên dưới.
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
                Job được tạo sau khi bạn chọn designer từ danh sách matching.
                Theo dõi thanh toán, tiến độ, feedback, duyệt bản cuối và đánh
                giá designer tại trang này.
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
              label="Final updates"
              value={`${finalUpdates.length} bản hoàn thiện`}
            />
          </div>

          <div className="mt-5 rounded-[1.25rem] border border-blue-100 bg-blue-50/70 p-5">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-700">
              Completion control
            </p>

            <p className="mt-2 text-sm font-medium leading-7 text-slate-700">
              Chỉ bấm duyệt hoàn thành khi bạn đã xem bản cuối cùng và đồng ý
              đóng job. Sau khi hoàn thành, feedback mới sẽ bị khóa.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <CompleteJobButton
                jobId={job.id}
                disabled={!canCompleteJob || isCompleted}
              />

              {isCompleted ? (
                <Button
                  asChild
                  className="min-h-12 rounded-xl bg-amber-500 px-6 text-sm font-extrabold text-white shadow-[0_14px_30px_rgba(245,158,11,0.24)] hover:bg-amber-600"
                >
                  <a href="#designer-review">
                    <Star className="mr-2 size-4 fill-current" />
                    Đánh giá designer
                  </a>
                </Button>
              ) : null}
            </div>

            {!canCompleteJob && !isCompleted ? (
              <p className="mt-3 text-xs font-bold leading-6 text-amber-700">
                Điều kiện duyệt: job phải đang active và designer đã gửi ít nhất
                một update loại “Bản hoàn thiện”.
              </p>
            ) : null}
          </div>
        </SurfaceCard>

        <PaymentPanel
          payment={payment}
          paymentStatus={paymentStatus}
          jobStatus={jobStatus}
        />
      </section>

      <section id="designer-review" className="mt-6 scroll-mt-24">
        <ReviewPanel
          jobId={job.id}
          isCompleted={isCompleted}
          review={review}
          designerName={designer?.display_name ?? "designer"}
        />
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <SurfaceCard className="p-6">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
            Designer
          </p>

          <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
            Designer phụ trách
          </h2>

          {designer ? (
            <div className="mt-5 rounded-[1.25rem] border border-blue-100 bg-blue-50/65 p-5">
              <div className="flex items-start gap-4">
                <div className="grid size-14 shrink-0 place-items-center rounded-3xl bg-[#061a3a] text-white">
                  <UserRound className="size-6" />
                </div>

                <div>
                  <h3 className="text-xl font-extrabold tracking-[-0.04em] text-[#061a3a]">
                    {designer.display_name}
                  </h3>

                  <p className="mt-2 text-sm font-bold leading-6 text-blue-700">
                    {designer.headline ?? "Designer"}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <InfoBox
                  icon={<Star className="size-4" />}
                  label="Rating"
                  value={`${designer.rating ?? 0}/5`}
                />

                <InfoBox
                  icon={<BriefcaseBusiness className="size-4" />}
                  label="Completed"
                  value={`${designer.completed_jobs ?? 0} jobs`}
                />

                <InfoBox
                  icon={<Clock3 className="size-4" />}
                  label="Response"
                  value={`${designer.response_time_hours ?? 24} giờ`}
                />
              </div>
            </div>
          ) : (
            <EmptyBlock message="Không tìm thấy thông tin designer." />
          )}
        </SurfaceCard>

        <SurfaceCard className="p-6">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
            Request brief
          </p>

          <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
            Thông tin request gốc
          </h2>

          {request ? (
            <div className="mt-5">
              <div className="flex flex-wrap gap-2">
                <StatusPill tone="neutral">
                  {getSafeCategoryLabel(request.category)}
                </StatusPill>

                <StatusPill tone="info">
                  {getSafeIndustryLabel(request.industry)}
                </StatusPill>
              </div>

              <h3 className="mt-4 text-xl font-extrabold tracking-[-0.04em] text-[#061a3a]">
                {request.title}
              </h3>

              <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                {request.description}
              </p>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <InfoBox
                  icon={<Store className="size-4" />}
                  label="Business"
                  value={request.business_name}
                />

                <InfoBox
                  icon={<Target className="size-4" />}
                  label="Audience"
                  value={request.target_audience ?? "Chưa có"}
                />

                <InfoBox
                  icon={<CircleDollarSign className="size-4" />}
                  label="Budget"
                  value={`${formatCurrencyVnd(
                    request.budget_min_vnd,
                  )} - ${formatCurrencyVnd(request.budget_max_vnd)}`}
                />

                <InfoBox
                  icon={<CalendarDays className="size-4" />}
                  label="Deadline"
                  value={
                    request.deadline ? formatDateVi(request.deadline) : "Chưa có"
                  }
                />
              </div>

              {request.preferred_styles && request.preferred_styles.length > 0 ? (
                <div className="mt-5 rounded-[1.15rem] border border-blue-100 bg-blue-50/65 p-4">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                    <Palette className="size-4" />
                    Preferred styles
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {request.preferred_styles.map((style) => (
                      <StatusPill key={style} tone="neutral">
                        {getSafeStyleLabel(style)}
                      </StatusPill>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <EmptyBlock message="Không tìm thấy thông tin request." />
          )}
        </SurfaceCard>
      </section>

      <section className="mt-6">
        <SurfaceCard className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                AI brief
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Brief đã chuẩn hóa
              </h2>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-600">
                Đây là brief AI được tạo từ request gốc để designer bám sát mục
                tiêu, phong cách và thông điệp thiết kế.
              </p>
            </div>

            {brief ? (
              <StatusPill tone="success">
                {`${formatPercent(brief.brief_completeness_score / 100)} complete`}
              </StatusPill>
            ) : (
              <StatusPill tone="warning">Chưa có brief</StatusPill>
            )}
          </div>

          {brief ? (
            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              <BriefBlock label="Objective" value={brief.objective} />

              <BriefBlock
                label="Visual direction"
                value={brief.visual_direction}
              />

              {brief.key_message ? (
                <BriefBlock label="Key message" value={brief.key_message} />
              ) : null}

              <BriefBlock
                label="Risk level"
                value={getRiskLevelLabel(brief.risk_level)}
              />

              {brief.deliverables && brief.deliverables.length > 0 ? (
                <ListBlock
                  title="Deliverables"
                  items={brief.deliverables}
                  icon={<FileText className="size-4" />}
                />
              ) : null}

              {brief.recommended_styles &&
              brief.recommended_styles.length > 0 ? (
                <ListBlock
                  title="Recommended styles"
                  items={brief.recommended_styles.map(getSafeStyleLabel)}
                  icon={<Palette className="size-4" />}
                />
              ) : null}

              {brief.risk_notes && brief.risk_notes.length > 0 ? (
                <ListBlock
                  title="Risk notes"
                  items={brief.risk_notes}
                  icon={<Sparkles className="size-4" />}
                />
              ) : null}
            </div>
          ) : (
            <EmptyBlock message="Request này chưa có AI brief." />
          )}
        </SurfaceCard>
      </section>

      <section className="mt-6">
        <SurfaceCard className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Progress timeline
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Cập nhật tiến độ từ designer
              </h2>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-600">
                Xem ảnh mockup, bản nháp, bản hoàn thiện và gửi feedback trực
                tiếp cho designer.
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
                Khi designer gửi ảnh tiến độ, bản nháp hoặc bản hoàn thiện, bạn
                sẽ xem được tại đây.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {updates.map((update) => (
                <ProgressUpdateCard
                  key={update.id}
                  jobId={job.id}
                  update={update}
                  feedbacks={feedbacks.filter(
                    (feedback) => feedback.update_id === update.id,
                  )}
                  isCompleted={isCompleted}
                />
              ))}
            </div>
          )}
        </SurfaceCard>
      </section>
    </DashboardShell>
  );
}

function ReviewPanel({
  jobId,
  isCompleted,
  review,
  designerName,
}: {
  jobId: string;
  isCompleted: boolean;
  review: JobReviewRow | null;
  designerName: string;
}) {
  if (!isCompleted) {
    return (
      <SurfaceCard className="border-blue-100 bg-blue-50/65 p-6">
        <div className="flex items-start gap-3">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-blue-700 ring-1 ring-blue-100">
            <Star className="size-5" />
          </div>

          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
              Designer review
            </p>

            <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
              Đánh giá sẽ mở sau khi job hoàn thành
            </h2>

            <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
              Bạn chỉ có thể đánh giá designer sau khi đã duyệt hoàn thành job.
            </p>
          </div>
        </div>
      </SurfaceCard>
    );
  }

  if (review) {
    return (
      <SurfaceCard className="border-emerald-200 bg-emerald-50 p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-700">
              Designer review
            </p>

            <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
              Bạn đã đánh giá designer
            </h2>

            <p className="mt-3 text-sm font-medium leading-7 text-emerald-950">
              Mỗi job chỉ được đánh giá một lần. Review này sẽ hiển thị trong hồ
              sơ và trang review của designer.
            </p>
          </div>

          <StatusPill tone="success">Đã gửi review</StatusPill>
        </div>

        <div className="mt-5 rounded-[1.2rem] border border-emerald-200 bg-white p-5">
          <div className="flex flex-wrap items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`size-5 ${
                  star <= review.rating
                    ? "fill-amber-500 text-amber-500"
                    : "text-slate-300"
                }`}
              />
            ))}

            <span className="ml-1 text-sm font-black text-[#061a3a]">
              {review.rating}/5
            </span>
          </div>

          <p className="mt-4 text-sm font-medium leading-7 text-slate-700">
            {review.comment}
          </p>

          <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            {`Reviewed at ${formatDateVi(review.created_at)}`}
          </p>
        </div>
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard className="border-amber-200 bg-amber-50 p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-amber-700">
            Designer review
          </p>

          <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
            Đánh giá {designerName}
          </h2>

          <p className="mt-3 text-sm font-medium leading-7 text-amber-950">
            Job đã hoàn thành. Hãy đánh giá chất lượng làm việc của designer để
            hệ thống cải thiện matching và giúp designer xây dựng uy tín.
          </p>
        </div>

        <StatusPill tone="warning">Chưa đánh giá</StatusPill>
      </div>

      <div className="mt-5 rounded-[1.2rem] border border-amber-200 bg-white p-5">
        <CreateJobReviewForm jobId={jobId} />
      </div>
    </SurfaceCard>
  );
}

function PaymentPanel({
  payment,
  paymentStatus,
  jobStatus,
}: {
  payment: PaymentRow | null;
  paymentStatus: ReturnType<typeof getSafePaymentStatus>;
  jobStatus: ReturnType<typeof getSafeJobStatus>;
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
              Chưa có thông tin thanh toán
            </h2>

            <p className="mt-3 text-sm font-medium leading-7 text-amber-950">
              Job này chưa có payment record. Hãy kiểm tra lại quá trình tạo job
              hoặc liên hệ admin.
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
            Payment information
          </p>

          <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
            Thông tin thanh toán
          </h2>

          <p
            className={`mt-3 text-sm font-medium leading-7 ${
              isConfirmed ? "text-emerald-950" : "text-amber-950"
            }`}
          >
            {isConfirmed
              ? "Payment đã được xác nhận. Designer có thể bắt đầu hoặc tiếp tục thực hiện job."
              : "Vui lòng chuyển khoản đúng số tiền và đúng nội dung để admin xác nhận payment."}
          </p>
        </div>

        <StatusPill tone={paymentStatus.tone}>{paymentStatus.label}</StatusPill>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <PaymentInfoBox
          icon={<CircleDollarSign className="size-4" />}
          label="Số tiền cần chuyển"
          value={formatCurrencyVnd(payment.amount_vnd)}
          strong
        />

        <PaymentInfoBox
          icon={<FileText className="size-4" />}
          label="Nội dung chuyển khoản"
          value={payment.transfer_note ?? "Chưa có"}
          strong
        />

        <PaymentInfoBox
          icon={<Banknote className="size-4" />}
          label="Ngân hàng"
          value={bankConfig.bankName || "Chưa cấu hình"}
        />

        <PaymentInfoBox
          icon={<WalletCards className="size-4" />}
          label="Số tài khoản"
          value={bankConfig.accountNumber || "Chưa cấu hình"}
        />

        <PaymentInfoBox
          icon={<UserRound className="size-4" />}
          label="Chủ tài khoản"
          value={bankConfig.accountName || "Chưa cấu hình"}
        />

        <PaymentInfoBox
          icon={<ShieldCheck className="size-4" />}
          label="Job status"
          value={jobStatus.label}
        />
      </div>

      <div className="mt-5 rounded-[1.15rem] border border-white/70 bg-white/70 p-4">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#061a3a]">
          Hướng dẫn thanh toán
        </p>

        <ol className="mt-3 grid gap-2 text-sm font-medium leading-7 text-slate-700">
          <li>1. Chuyển đúng số tiền hiển thị ở trên.</li>
          <li>
            2. Nhập đúng nội dung chuyển khoản:{" "}
            <span className="font-black text-[#061a3a]">
              {payment.transfer_note ?? "Chưa có"}
            </span>
            .
          </li>
          <li>
            3. Sau khi chuyển khoản, chờ admin kiểm tra và xác nhận payment.
          </li>
          <li>
            4. Khi payment được xác nhận, job sẽ chuyển sang trạng thái đang
            làm.
          </li>
        </ol>

        {payment.confirmed_at ? (
          <p className="mt-4 text-sm font-bold text-emerald-700">
            {`Đã xác nhận lúc ${formatDateVi(payment.confirmed_at)}.`}
          </p>
        ) : null}

        {payment.admin_note ? (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium leading-7 text-amber-800">
            {payment.admin_note}
          </p>
        ) : null}
      </div>
    </SurfaceCard>
  );
}

function ProgressUpdateCard({
  jobId,
  update,
  feedbacks,
  isCompleted,
}: {
  jobId: string;
  update: JobUpdateRow;
  feedbacks: JobUpdateFeedbackRow[];
  isCompleted: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-blue-100 bg-blue-50/65">
      {update.attachment_url ? (
        <div className="border-b border-blue-100 bg-white p-3">
          <div className="overflow-hidden rounded-[1.1rem] border border-blue-100 bg-slate-100">
            <img
              src={update.attachment_url}
              alt={update.title}
              className="max-h-[620px] w-full object-contain"
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

        <div className="mt-5 rounded-[1.2rem] border border-blue-100 bg-white p-4">
          <div className="flex items-center gap-2">
            <MessageSquareText className="size-4 text-blue-700" />

            <p className="text-sm font-black uppercase tracking-[0.16em] text-blue-700">
              Feedback của bạn
            </p>
          </div>

          {feedbacks.length > 0 ? (
            <div className="mt-3 grid gap-2">
              {feedbacks.map((feedback) => (
                <div
                  key={feedback.id}
                  className="rounded-xl border border-blue-100 bg-blue-50/70 p-3"
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
            <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
              Chưa có feedback cho cập nhật này.
            </p>
          )}

          {!isCompleted ? (
            <CreateUpdateFeedbackForm jobId={jobId} updateId={update.id} />
          ) : (
            <p className="mt-3 text-sm font-semibold leading-6 text-emerald-700">
              Job đã hoàn thành nên feedback mới đã được khóa.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function BriefBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.15rem] border border-blue-100 bg-blue-50/65 p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
        {label}
      </p>

      <p className="mt-2 text-sm font-medium leading-7 text-slate-700">
        {value}
      </p>
    </div>
  );
}

function ListBlock({
  title,
  items,
  icon,
}: {
  title: string;
  items: string[];
  icon: ReactNode;
}) {
  return (
    <div className="rounded-[1.15rem] border border-blue-100 bg-blue-50/65 p-4">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-blue-600">
        {icon}
        {title}
      </div>

      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-blue-100 bg-white p-3 text-sm font-medium leading-6 text-slate-700"
          >
            {item}
          </div>
        ))}
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

function PaymentInfoBox({
  icon,
  label,
  value,
  strong = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-[1.15rem] border border-white/70 bg-white/70 p-4">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
        {icon}
        {label}
      </div>

      <p
        className={`mt-2 break-words leading-6 text-[#061a3a] ${
          strong
            ? "text-lg font-black tracking-[-0.03em]"
            : "text-sm font-extrabold"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyBlock({ message }: { message: string }) {
  return (
    <div className="mt-5 rounded-[1.15rem] border border-blue-100 bg-blue-50/65 p-5">
      <p className="text-sm font-medium leading-7 text-slate-500">{message}</p>
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
      label: "Chờ chuyển khoản",
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