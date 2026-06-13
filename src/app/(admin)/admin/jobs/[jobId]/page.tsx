import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ExternalLink,
  FileText,
  ImageIcon,
  MessageSquareText,
  Palette,
  SendHorizonal,
  Star,
  Store,
  Target,
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
  getStyleLabel,
} from "@/lib/domain/labels";
import { formatCurrencyVnd, formatDateVi, formatPercent } from "@/lib/format";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AdminJobDetailPageProps = {
  params: Promise<Record<string, string>>;
};

type AdminJobDetailRow = {
  id: string;
  request_id: string;
  title: string;
  status: string;
  agreed_price_vnd: number;
  started_at: string | null;
  due_at: string | null;
  completed_at: string | null;
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
    preferred_styles: string[];
    status: string;
    created_at: string;
  } | null;
  payments: {
    id: string;
    amount_vnd: number;
    status: string;
    transfer_note: string;
    confirmed_at: string | null;
    created_at: string;
  } | null;
};

type AiBriefRow = {
  id: string;
  objective: string;
  visual_direction: string;
  key_message: string | null;
  deliverables: string[];
  recommended_styles: string[];
  risk_level: string;
  risk_notes: string[];
  brief_completeness_score: number;
  created_at: string;
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
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;
};

export default async function AdminJobDetailPage({
  params,
}: AdminJobDetailPageProps) {
  const routeParams = await params;
  const jobId = routeParams.jobId ?? routeParams.jobID;

  if (!jobId) {
    notFound();
  }

  const authState = await requireRole(["admin"]);
  const profile = authState.profile;

  if (!profile) {
    redirect("/auth-check");
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  const { data: jobData, error: jobError } = await adminSupabase
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
      completed_at,
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
        preferred_styles,
        status,
        created_at
      ),
      payments (
        id,
        amount_vnd,
        status,
        transfer_note,
        confirmed_at,
        created_at
      )
    `,
    )
    .eq("id", jobId)
    .maybeSingle();

  if (!jobData) {
    notFound();
  }

  const job = jobData as unknown as AdminJobDetailRow;

  const { data: briefData } = await adminSupabase
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
      brief_completeness_score,
      created_at
    `,
    )
    .eq("request_id", job.request_id)
    .maybeSingle();

  const { data: updateData } = await adminSupabase
    .from("job_updates")
    .select("id, update_type, title, message, attachment_url, created_at")
    .eq("job_id", job.id)
    .order("created_at", { ascending: false });

  const { data: feedbackData } = await adminSupabase
    .from("job_update_feedbacks")
    .select("id, update_id, message, created_at")
    .eq("job_id", job.id)
    .order("created_at", { ascending: true });

  const { data: reviewData } = await adminSupabase
    .from("job_reviews")
    .select("id, rating, comment, created_at, updated_at")
    .eq("job_id", job.id)
    .maybeSingle();

  const brief = briefData as unknown as AiBriefRow | null;
  const updates = (updateData ?? []) as unknown as JobUpdateRow[];
  const feedbacks = (feedbackData ?? []) as unknown as JobUpdateFeedbackRow[];
  const review = reviewData as JobReviewRow | null;

  const request = job.design_requests;
  const designer = job.designer_profiles;
  const payment = job.payments;

  const finalUpdates = updates.filter(
    (update) => update.update_type === "final",
  );

  const jobStatus = getSafeJobStatusMeta(job.status);

  const paymentStatus = payment
    ? getPaymentStatusMeta(
        payment.status as Parameters<typeof getPaymentStatusMeta>[0],
      )
    : null;

  return (
    <DashboardShell
      role="admin"
      title={job.title}
      description="Admin theo dõi chi tiết job, payment, tiến độ, feedback và review."
      userName={profile.full_name}
      userEmail={authState.userEmail}
    >
      {jobError ? (
        <SurfaceCard className="mb-5 border-red-200 bg-red-50 p-6">
          <p className="text-sm font-semibold leading-7 text-red-600">
            {jobError.message}
          </p>
        </SurfaceCard>
      ) : null}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Button
          asChild
          variant="outline"
          className="rounded-full border-blue-200 bg-white font-extrabold"
        >
          <Link href="/admin/jobs">
            <ArrowLeft className="mr-2 size-4" />
            Quay lại Jobs
          </Link>
        </Button>

        <div className="flex flex-wrap gap-2">
          <StatusPill tone={jobStatus.tone}>{jobStatus.label}</StatusPill>

          {paymentStatus ? (
            <StatusPill tone={paymentStatus.tone}>
              {paymentStatus.label}
            </StatusPill>
          ) : null}

          <StatusPill tone="info">{`${updates.length} updates`}</StatusPill>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Agreed price"
          value={formatCurrencyVnd(job.agreed_price_vnd)}
          description="Giá trị job đã chốt"
          icon={<CircleDollarSign className="size-5" />}
        />

        <MetricCard
          label="Job status"
          value={jobStatus.label}
          description="Trạng thái xử lý hiện tại"
          icon={<BriefcaseBusiness className="size-5" />}
          tone={job.status === "completed" ? "success" : "normal"}
        />

        <MetricCard
          label="Final updates"
          value={`${finalUpdates.length}`}
          description="Số bản hoàn thiện designer đã gửi"
          icon={<CheckCircle2 className="size-5" />}
        />

        <MetricCard
          label="Review"
          value={review ? `${review.rating}/5` : "Chưa có"}
          description="Đánh giá sau khi hoàn thành"
          icon={<Star className="size-5 fill-current" />}
          tone={review ? "warning" : "normal"}
        />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <SurfaceCard className="p-6">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
            Job overview
          </p>

          <div className="mt-4 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-[-0.055em] text-[#061a3a]">
                {job.title}
              </h1>

              <p className="mt-2 text-sm font-bold text-blue-700">
                {request?.business_name ?? "Chưa rõ thương hiệu"}
              </p>
            </div>

            <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#061a3a] text-white">
              <BriefcaseBusiness className="size-6" />
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <InfoBox
              icon={<CalendarDays className="size-4" />}
              label="Created at"
              value={formatDateVi(job.created_at)}
            />

            <InfoBox
              icon={<CalendarDays className="size-4" />}
              label="Due date"
              value={job.due_at ? formatDateVi(job.due_at) : "Chưa có deadline"}
            />

            <InfoBox
              icon={<CheckCircle2 className="size-4" />}
              label="Completed at"
              value={
                job.completed_at
                  ? formatDateVi(job.completed_at)
                  : "Chưa hoàn thành"
              }
            />

            <InfoBox
              icon={<FileText className="size-4" />}
              label="Job ID"
              value={job.id}
            />
          </div>

          {payment ? (
            <div className="mt-5 rounded-[1.2rem] border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
                Payment
              </p>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <InfoBox
                  icon={<CircleDollarSign className="size-4" />}
                  label="Amount"
                  value={formatCurrencyVnd(payment.amount_vnd)}
                />

                <InfoBox
                  icon={<FileText className="size-4" />}
                  label="Transfer note"
                  value={payment.transfer_note}
                />

                <InfoBox
                  icon={<CheckCircle2 className="size-4" />}
                  label="Payment status"
                  value={paymentStatus?.label ?? payment.status}
                />

                <InfoBox
                  icon={<CalendarDays className="size-4" />}
                  label="Confirmed at"
                  value={
                    payment.confirmed_at
                      ? formatDateVi(payment.confirmed_at)
                      : "Chưa xác nhận"
                  }
                />
              </div>
            </div>
          ) : null}
        </SurfaceCard>

        <SurfaceCard className="p-6">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
            Parties
          </p>

          <div className="mt-5 grid gap-4">
            <PartyCard
              title="Designer"
              name={designer?.display_name ?? "Không rõ designer"}
              subtitle={designer?.headline ?? "Designer"}
              icon={<UserRound className="size-5" />}
              meta={[
                `Rating: ${designer?.rating ?? "N/A"}/5`,
                `Completed: ${designer?.completed_jobs ?? 0} jobs`,
              ]}
            />

            <PartyCard
              title="Customer"
              name={request?.business_name ?? "Chưa rõ customer"}
              subtitle={
                request
                  ? getIndustryLabel(
                      request.industry as Parameters<typeof getIndustryLabel>[0],
                    )
                  : "Customer"
              }
              icon={<Store className="size-5" />}
              meta={[
                `Request: ${request?.title ?? "N/A"}`,
                `Status: ${request?.status ?? "N/A"}`,
              ]}
            />
          </div>
        </SurfaceCard>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        {request ? (
          <SurfaceCard className="p-6">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
              Original request
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
                value={getIndustryLabel(
                  request.industry as Parameters<typeof getIndustryLabel>[0],
                )}
              />

              <InfoBox
                icon={<Palette className="size-4" />}
                label="Category"
                value={getCategoryLabel(
                  request.category as Parameters<typeof getCategoryLabel>[0],
                )}
              />

              <InfoBox
                icon={<Target className="size-4" />}
                label="Target"
                value={request.target_audience ?? "Chưa mô tả rõ"}
              />

              <InfoBox
                icon={<CircleDollarSign className="size-4" />}
                label="Budget"
                value={`${formatCurrencyVnd(
                  request.budget_min_vnd,
                )} - ${formatCurrencyVnd(request.budget_max_vnd)}`}
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {request.preferred_styles.map((style) => (
                <StatusPill key={style} tone="neutral">
                  {getStyleLabel(style as Parameters<typeof getStyleLabel>[0])}
                </StatusPill>
              ))}
            </div>
          </SurfaceCard>
        ) : (
          <SurfaceCard className="p-6">
            <p className="text-sm font-semibold text-red-600">
              Không tìm thấy request gốc.
            </p>
          </SurfaceCard>
        )}

        {brief ? (
          <SurfaceCard variant="dark" className="p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-sky-200/70">
                  AI Brief
                </p>

                <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-white">
                  Brief chuẩn hóa
                </h2>
              </div>

              <StatusPill
                tone={brief.risk_level === "low" ? "success" : "warning"}
                className="border-white/10 bg-white/10 text-white"
              >
                {`Risk: ${brief.risk_level}`}
              </StatusPill>
            </div>

            <DarkBlock label="Objective" value={brief.objective} />
            <DarkBlock label="Visual direction" value={brief.visual_direction} />

            {brief.key_message ? (
              <DarkBlock label="Key message" value={brief.key_message} />
            ) : null}

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <DarkMetric
                label="Completeness"
                value={formatPercent(brief.brief_completeness_score)}
              />

              <DarkMetric
                label="Deliverables"
                value={`${brief.deliverables.length} đầu ra`}
              />
            </div>
          </SurfaceCard>
        ) : (
          <SurfaceCard className="p-6">
            <p className="text-sm font-semibold text-slate-600">
              Request này chưa có AI brief.
            </p>
          </SurfaceCard>
        )}
      </section>

      <section className="mt-5">
        <SurfaceCard className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Timeline
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Cập nhật, feedback và file preview
              </h2>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-600">
                Admin có thể xem toàn bộ tiến độ designer gửi và feedback customer
                phản hồi dưới từng update.
              </p>
            </div>

            <StatusPill tone="info">{`${updates.length} updates`}</StatusPill>
          </div>

          {updates.length === 0 ? (
            <EmptyState
              title="Chưa có cập nhật nào."
              description="Khi designer gửi bản nháp hoặc bản hoàn thiện, timeline sẽ hiển thị tại đây."
            />
          ) : (
            <div className="mt-6 grid gap-4">
              {updates.map((update) => (
                <AdminUpdateCard
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

      <section className="mt-5">
        <SurfaceCard className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Final review
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Đánh giá sau khi hoàn thành
              </h2>
            </div>

            {review ? (
              <RatingPill rating={review.rating} />
            ) : (
              <StatusPill tone="neutral">Chưa có review</StatusPill>
            )}
          </div>

          {review ? (
            <div className="mt-5 rounded-[1.2rem] border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm font-medium leading-7 text-amber-950">
                {review.comment}
              </p>

              <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
                {`Reviewed at ${formatDateVi(review.created_at)}`}
              </p>
            </div>
          ) : (
            <EmptyState
              title="Customer chưa đánh giá."
              description="Sau khi customer gửi review, nội dung đánh giá sẽ xuất hiện tại đây."
            />
          )}
        </SurfaceCard>
      </section>
    </DashboardShell>
  );
}

function AdminUpdateCard({
  update,
  feedbacks,
}: {
  update: JobUpdateRow;
  feedbacks: JobUpdateFeedbackRow[];
}) {
  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-blue-100 bg-blue-50/65">
      {update.attachment_url ? (
        <div className="border-b border-blue-100 bg-white p-3">
          <div className="overflow-hidden rounded-[1.1rem] border border-blue-100 bg-slate-100">
            <img
              src={update.attachment_url}
              alt={update.title}
              className="max-h-[580px] w-full object-contain"
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

              {update.update_type === "final" ? (
                <StatusPill tone="success">Final delivery</StatusPill>
              ) : null}

              {update.attachment_url ? (
                <StatusPill tone="info">Có hình ảnh</StatusPill>
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
              Mở file gốc
            </a>
          </Button>
        ) : (
          <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-500">
            <ImageIcon className="size-4" />
            Không có ảnh đính kèm
          </div>
        )}

        <div className="mt-5 rounded-[1.1rem] border border-blue-100 bg-white p-4">
          <div className="flex items-center gap-2">
            <MessageSquareText className="size-4 text-blue-700" />

            <p className="text-sm font-black uppercase tracking-[0.16em] text-blue-700">
              Feedback customer
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
              Chưa có feedback dưới cập nhật này.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function PartyCard({
  title,
  name,
  subtitle,
  icon,
  meta,
}: {
  title: string;
  name: string;
  subtitle: string;
  icon: ReactNode;
  meta: string[];
}) {
  return (
    <div className="rounded-[1.2rem] border border-blue-100 bg-blue-50/65 p-5">
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-blue-700 ring-1 ring-blue-100">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
            {title}
          </p>

          <h3 className="mt-2 text-lg font-extrabold tracking-[-0.035em] text-[#061a3a]">
            {name}
          </h3>

          <p className="mt-1 text-sm font-bold text-blue-700">{subtitle}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {meta.map((item) => (
              <StatusPill key={item} tone="neutral">
                {item}
              </StatusPill>
            ))}
          </div>
        </div>
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
  tone?: "normal" | "success" | "warning";
}) {
  const cardClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50"
        : "border-blue-100 bg-white";

  const iconClass =
    tone === "success"
      ? "bg-white text-emerald-700 ring-emerald-200"
      : tone === "warning"
        ? "bg-white text-amber-700 ring-amber-200"
        : "bg-blue-50 text-blue-700 ring-blue-100";

  return (
    <div className={`rounded-[1.25rem] border p-5 ${cardClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
            {label}
          </p>

          <p className="mt-3 text-2xl font-black tracking-[-0.05em] text-[#061a3a]">
            {value}
          </p>
        </div>

        <div
          className={`grid size-11 shrink-0 place-items-center rounded-2xl ring-1 ${iconClass}`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
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

function DarkBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] p-5">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-200/60">
        {label}
      </p>

      <p className="mt-2 text-sm font-semibold leading-7 text-white">
        {value}
      </p>
    </div>
  );
}

function DarkMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-200/60">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black tracking-[-0.05em] text-white">
        {value}
      </p>
    </div>
  );
}

function RatingPill({ rating }: { rating: number }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-amber-700">
      <Star className="size-3.5 fill-current" />
      {rating}/5
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mt-6 grid place-items-center rounded-[1.25rem] border border-blue-100 bg-blue-50/65 p-8 text-center">
      <SendHorizonal className="size-8 text-blue-700" />

      <h3 className="mt-4 text-xl font-extrabold tracking-[-0.04em] text-[#061a3a]">
        {title}
      </h3>

      <p className="mt-2 max-w-xl text-sm font-medium leading-7 text-slate-600">
        {description}
      </p>
    </div>
  );
}

function getUpdateTypeLabel(updateType: string) {
  if (updateType === "draft") return "Bản nháp";
  if (updateType === "final") return "Bản hoàn thiện";
  return "Tiến độ";
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