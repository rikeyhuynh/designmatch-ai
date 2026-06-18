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
  Gauge,
  ImageIcon,
  MessageSquareText,
  Palette,
  SendHorizonal,
  ShieldCheck,
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
import { PaymentReviewActions } from "@/features/admin/payments/components/payment-review-actions";
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

type JsonRecord = Record<string, unknown>;

type EmbeddedPaymentRow = {
  id: string;
  amount_vnd: number;
  status: string;
  transfer_note: string | null;
  admin_note: string | null;
  platform_fee_percent: number | null;
  platform_fee_vnd: number | null;
  designer_revenue_vnd: number | null;
  confirmed_at: string | null;
  reviewed_at: string | null;
  created_at: string;
};

type AdminJobDetailRow = {
  id: string;
  request_id: string;
  title: string;
  status: string;
  agreed_price_vnd: number;
  pricing_tier: string | null;
  package_code: string | null;
  package_name: string | null;
  selected_price_vnd: number | null;
  platform_fee_percent: number | null;
  platform_fee_vnd: number | null;
  designer_revenue_vnd: number | null;
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
    availability: string | null;
    verification_status: string | null;
    minimum_project_budget_vnd: number | null;
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
    status: string;
    brief_review_status: string | null;
    brief_confirmed_at: string | null;
    created_at: string;
  } | null;
  payments: EmbeddedPaymentRow[] | EmbeddedPaymentRow | null;
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
  brief_json: unknown;
  customer_edited_brief_json: unknown;
  final_brief_json: unknown;
  project_title: string | null;
  business_context: string | null;
  design_objective: string | null;
  target_audience: string | null;
  content_requirements: string[] | null;
  technical_requirements: string[] | null;
  references_to_collect: string[] | null;
  designer_notes: string | null;
  status: string | null;
  confirmed_at: string | null;
  created_at: string;
};

type ProductSpecificSection = {
  section_title: string;
  requirements: string[];
};

type VisualDirection = {
  mood: string[];
  style_tags: string[];
  color_direction: string[];
  typography_direction: string;
  layout_direction: string;
  image_direction: string;
};

type LayoutHierarchy = {
  priority_order: string[];
  composition_notes: string;
  readability_notes: string;
  print_or_platform_notes: string;
};

type AdminBriefDisplay = {
  project_title: string;
  business_context: string;
  design_objective: string;
  target_audience: string;
  key_message: string;
  deliverables: string[];
  product_specific_requirements: ProductSpecificSection[];
  visual_direction: VisualDirection;
  layout_hierarchy: LayoutHierarchy;
  content_requirements: string[];
  technical_requirements: string[];
  references_to_collect: string[];
  designer_notes: string;
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
  comment: string | null;
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

  const jobResult = await adminSupabase
    .from("jobs")
    .select(
      `
      id,
      request_id,
      title,
      status,
      agreed_price_vnd,
      pricing_tier,
      package_code,
      package_name,
      selected_price_vnd,
      platform_fee_percent,
      platform_fee_vnd,
      designer_revenue_vnd,
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
        response_time_hours,
        availability,
        verification_status,
        minimum_project_budget_vnd
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
        brief_review_status,
        brief_confirmed_at,
        created_at
      ),
      payments (
        id,
        amount_vnd,
        status,
        transfer_note,
        admin_note,
        platform_fee_percent,
        platform_fee_vnd,
        designer_revenue_vnd,
        confirmed_at,
        reviewed_at,
        created_at
      )
    `,
    )
    .eq("id", jobId)
    .maybeSingle();

  if (jobResult.error || !jobResult.data) {
    notFound();
  }

  const job = jobResult.data as unknown as AdminJobDetailRow;

  const [briefResult, updateResult, feedbackResult, reviewResult] =
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
          brief_completeness_score,
          brief_json,
          customer_edited_brief_json,
          final_brief_json,
          project_title,
          business_context,
          design_objective,
          target_audience,
          content_requirements,
          technical_requirements,
          references_to_collect,
          designer_notes,
          status,
          confirmed_at,
          created_at
        `,
        )
        .or(
          `request_id.eq.${job.request_id},design_request_id.eq.${job.request_id}`,
        )
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
        .order("created_at", { ascending: true }),

      adminSupabase
        .from("job_reviews")
        .select("id, rating, comment, created_at, updated_at")
        .eq("job_id", job.id)
        .maybeSingle(),
    ]);

  const brief = briefResult.data as unknown as AiBriefRow | null;
  const updates = (updateResult.data ?? []) as unknown as JobUpdateRow[];
  const feedbacks = (feedbackResult.data ??
    []) as unknown as JobUpdateFeedbackRow[];
  const review = reviewResult.data as unknown as JobReviewRow | null;

  const request = job.design_requests;
  const designer = job.designer_profiles;
  const payment = getPrimaryPayment(job.payments);

  const finalUpdates = updates.filter(
    (update) => update.update_type === "final",
  );

  const draftUpdates = updates.filter(
    (update) => update.update_type === "draft",
  );

  const jobStatus = getSafeJobStatusMeta(job.status);
  const paymentStatus = payment
    ? getSafePaymentStatusMeta(payment.status)
    : null;

  const adminBrief = brief ? normalizeAdminBrief(brief) : null;
  const briefIsConfirmed =
    brief?.status === "confirmed" ||
    Boolean(brief?.confirmed_at) ||
    request?.brief_review_status === "confirmed" ||
    Object.keys(asRecord(brief?.final_brief_json)).length > 0;

  const platformFee = Number(
    payment?.platform_fee_vnd ?? job.platform_fee_vnd ?? 0,
  );
  const designerRevenue = Number(
    payment?.designer_revenue_vnd ?? job.designer_revenue_vnd ?? 0,
  );
  const feePercent = Number(
    payment?.platform_fee_percent ?? job.platform_fee_percent ?? 0,
  );

  const warningItems = buildWarningItems({
    job,
    payment,
    brief,
    briefIsConfirmed,
    updates,
    review,
  });

  return (
    <DashboardShell
      role="admin"
      title={job.title}
      description="Admin theo dõi chi tiết job, payment, brief, tiến độ, feedback và review."
      userName={profile.full_name}
      userEmail={authState.userEmail}
    >
      <ErrorPanel
        errors={[
          jobResult.error?.message,
          briefResult.error?.message,
          updateResult.error?.message,
          feedbackResult.error?.message,
          reviewResult.error?.message,
        ]}
      />

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
          ) : (
            <StatusPill tone="warning">Chưa có payment</StatusPill>
          )}

          {briefIsConfirmed ? (
            <StatusPill tone="success">Brief đã chốt</StatusPill>
          ) : brief ? (
            <StatusPill tone="warning">Brief chưa chốt rõ</StatusPill>
          ) : (
            <StatusPill tone="warning">Chưa có brief</StatusPill>
          )}

          <StatusPill tone="info">{`${updates.length} updates`}</StatusPill>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Customer paid"
          value={formatCurrencyVnd(payment?.amount_vnd ?? job.agreed_price_vnd)}
          description="Số tiền customer cần trả"
          icon={<CircleDollarSign className="size-5" />}
          tone="dark"
        />

        <MetricCard
          label="Platform fee"
          value={
            feePercent > 0
              ? `${formatCurrencyVnd(platformFee)}`
              : formatCurrencyVnd(platformFee)
          }
          description={
            feePercent > 0 ? `Tỷ lệ phí ${feePercent}%` : "Phí nền tảng"
          }
          icon={<WalletCards className="size-5" />}
          tone="success"
        />

        <MetricCard
          label="Designer revenue"
          value={formatCurrencyVnd(designerRevenue)}
          description="Số tiền designer nhận"
          icon={<Banknote className="size-5" />}
        />

        <MetricCard
          label="Review"
          value={review ? `${review.rating}/5` : "Chưa có"}
          description="Đánh giá sau khi hoàn thành"
          icon={<Star className="size-5 fill-current" />}
          tone={review && review.rating <= 3 ? "warning" : "normal"}
        />
      </section>

      <section className="mt-5">
        <SurfaceCard className="overflow-hidden p-0">
          <div className="bg-gradient-to-br from-[#061a3a] via-[#0b2a61] to-blue-700 p-6 text-white">
            <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr] xl:items-center">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-sky-200/75">
                  Job operation center
                </p>

                <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.055em] text-white">
                  {job.title}
                </h1>

                <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-white/70">
                  Admin theo dõi toàn bộ vòng đời job: request gốc, brief đã
                  chốt, payment, designer, update, feedback và review.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <DarkSignalBox
                  icon={<BriefcaseBusiness className="size-4" />}
                  label="Job status"
                  value={jobStatus.label}
                />

                <DarkSignalBox
                  icon={<CheckCircle2 className="size-4" />}
                  label="Final updates"
                  value={`${finalUpdates.length} final`}
                />

                <DarkSignalBox
                  icon={<Clock3 className="size-4" />}
                  label="Draft updates"
                  value={`${draftUpdates.length} draft`}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-6 md:grid-cols-2 xl:grid-cols-4">
            <SignalBox
              icon={<CalendarDays className="size-4" />}
              label="Created"
              value={formatDateVi(job.created_at)}
            />

            <SignalBox
              icon={<CalendarDays className="size-4" />}
              label="Due date"
              value={
                job.due_at ? formatDateVi(job.due_at) : "Chưa có deadline"
              }
              tone={!job.due_at ? "warning" : "normal"}
            />

            <SignalBox
              icon={<CheckCircle2 className="size-4" />}
              label="Completed"
              value={
                job.completed_at
                  ? formatDateVi(job.completed_at)
                  : "Chưa hoàn thành"
              }
            />

            <SignalBox
              icon={<Gauge className="size-4" />}
              label="System warnings"
              value={
                warningItems.length > 0
                  ? `${warningItems.length} cảnh báo`
                  : "Không có cảnh báo"
              }
              tone={warningItems.length > 0 ? "warning" : "normal"}
            />
          </div>
        </SurfaceCard>
      </section>

      {warningItems.length > 0 ? (
        <section className="mt-5">
          <SurfaceCard className="border-amber-200 bg-amber-50 p-6">
            <div className="flex items-start gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-600 text-white">
                <ShieldCheck className="size-5" />
              </div>

              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-700">
                  Admin attention needed
                </p>

                <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                  Các điểm cần kiểm tra
                </h2>

                <div className="mt-4 grid gap-2">
                  {warningItems.map((item, itemIndex) => (
                    <div
                      key={getReactListKey(item, itemIndex, "warning")}
                      className="rounded-2xl border border-amber-200 bg-white/80 p-3 text-sm font-semibold leading-6 text-amber-950"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SurfaceCard>
        </section>
      ) : null}

      <section className="mt-5 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <SurfaceCard className="p-6">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
            Job overview
          </p>

          <div className="mt-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-3xl font-extrabold tracking-[-0.055em] text-[#061a3a]">
                {job.title}
              </h2>

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
              icon={<FileText className="size-4" />}
              label="Job ID"
              value={job.id}
            />

            <InfoBox
              icon={<BriefcaseBusiness className="size-4" />}
              label="Package"
              value={job.package_name ?? job.package_code ?? "Chưa có"}
            />

            <InfoBox
              icon={<CircleDollarSign className="size-4" />}
              label="Agreed price"
              value={formatCurrencyVnd(job.agreed_price_vnd)}
            />

            <InfoBox
              icon={<CalendarDays className="size-4" />}
              label="Started at"
              value={
                job.started_at ? formatDateVi(job.started_at) : "Chưa bắt đầu"
              }
            />
          </div>

          <PaymentPanel
            payment={payment}
            paymentStatus={paymentStatus}
            job={job}
            platformFee={platformFee}
            designerRevenue={designerRevenue}
            feePercent={feePercent}
          />
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
                `Response: ${designer?.response_time_hours ?? 24}h`,
              ]}
            />

            <PartyCard
              title="Customer"
              name={request?.business_name ?? "Chưa rõ customer"}
              subtitle={request ? getSafeIndustryLabel(request.industry) : "Customer"}
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
          <RequestPanel request={request} />
        ) : (
          <SurfaceCard className="p-6">
            <p className="text-sm font-semibold text-red-600">
              Không tìm thấy request gốc.
            </p>
          </SurfaceCard>
        )}

        {brief && adminBrief ? (
          <AdminBriefPanel
            brief={brief}
            adminBrief={adminBrief}
            isConfirmed={briefIsConfirmed}
          />
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
                Admin có thể xem toàn bộ tiến độ designer gửi và feedback
                customer phản hồi dưới từng update.
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
                {review.comment ?? "Customer không để lại nhận xét chi tiết."}
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

function PaymentPanel({
  payment,
  paymentStatus,
  job,
  platformFee,
  designerRevenue,
  feePercent,
}: {
  payment: EmbeddedPaymentRow | null;
  paymentStatus: ReturnType<typeof getSafePaymentStatusMeta> | null;
  job: AdminJobDetailRow;
  platformFee: number;
  designerRevenue: number;
  feePercent: number;
}) {
  if (!payment) {
    return (
      <div className="mt-5 rounded-[1.2rem] border border-amber-200 bg-amber-50 p-5">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-700">
          Payment missing
        </p>

        <p className="mt-2 text-sm font-medium leading-7 text-amber-950">
          Job này chưa có payment record. Admin nên kiểm tra lại flow tạo job.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-[1.2rem] border border-emerald-200 bg-emerald-50 p-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
            Payment
          </p>

          <h3 className="mt-2 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
            {formatCurrencyVnd(payment.amount_vnd)}
          </h3>
        </div>

        {paymentStatus ? (
          <StatusPill tone={paymentStatus.tone}>
            {paymentStatus.label}
          </StatusPill>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <InfoBox
          icon={<CircleDollarSign className="size-4" />}
          label="Customer paid"
          value={formatCurrencyVnd(payment.amount_vnd)}
        />

        <InfoBox
          icon={<WalletCards className="size-4" />}
          label="Platform fee"
          value={
            feePercent > 0
              ? `${formatCurrencyVnd(platformFee)} · ${feePercent}%`
              : formatCurrencyVnd(platformFee)
          }
        />

        <InfoBox
          icon={<Banknote className="size-4" />}
          label="Designer receives"
          value={formatCurrencyVnd(designerRevenue)}
        />

        <InfoBox
          icon={<FileText className="size-4" />}
          label="Transfer note"
          value={payment.transfer_note ?? "Chưa có"}
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

      {payment.admin_note ? (
        <div className="mt-4 rounded-[1.15rem] border border-emerald-200 bg-white/80 p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
            Admin note
          </p>

          <p className="mt-2 text-sm font-medium leading-7 text-slate-700">
            {payment.admin_note}
          </p>
        </div>
      ) : null}

      <PaymentReviewActions
        paymentId={payment.id}
        currentStatus={payment.status}
      />

      <p className="mt-4 text-xs font-semibold leading-5 text-emerald-900">
        Job price reference: {formatCurrencyVnd(job.agreed_price_vnd)}
      </p>
    </div>
  );
}

function RequestPanel({
  request,
}: {
  request: NonNullable<AdminJobDetailRow["design_requests"]>;
}) {
  return (
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
          value={getSafeIndustryLabel(request.industry)}
        />

        <InfoBox
          icon={<Palette className="size-4" />}
          label="Category"
          value={getSafeCategoryLabel(request.category)}
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

      {request.preferred_styles && request.preferred_styles.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {request.preferred_styles.map((style, styleIndex) => (
            <StatusPill
              key={getReactListKey(style, styleIndex, "preferred-style")}
              tone="neutral"
            >
              {getSafeStyleLabel(style)}
            </StatusPill>
          ))}
        </div>
      ) : null}
    </SurfaceCard>
  );
}

function AdminBriefPanel({
  brief,
  adminBrief,
  isConfirmed,
}: {
  brief: AiBriefRow;
  adminBrief: AdminBriefDisplay;
  isConfirmed: boolean;
}) {
  return (
    <SurfaceCard variant="dark" className="p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-sky-200/70">
            Final brief
          </p>

          <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-white">
            Brief dùng để thực hiện job
          </h2>

          <p className="mt-3 text-sm font-medium leading-7 text-white/65">
            Admin có thể kiểm tra brief cuối cùng customer đã xác nhận trước khi
            designer thực hiện.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isConfirmed ? (
            <StatusPill tone="success">Brief đã chốt</StatusPill>
          ) : (
            <StatusPill tone="warning">Brief chưa chốt rõ</StatusPill>
          )}

          <StatusPill tone={brief.risk_level === "low" ? "success" : "warning"}>
            {`Risk: ${brief.risk_level}`}
          </StatusPill>
        </div>
      </div>

      <DarkBlock label="Project title" value={adminBrief.project_title} />
      <DarkBlock label="Business context" value={adminBrief.business_context} />
      <DarkBlock label="Design objective" value={adminBrief.design_objective} />
      <DarkBlock label="Target audience" value={adminBrief.target_audience} />
      <DarkBlock label="Key message" value={adminBrief.key_message} />

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <DarkMetric
          label="Completeness"
          value={formatPercent(Number(brief.brief_completeness_score ?? 0) / 100)}
        />

        <DarkMetric
          label="Deliverables"
          value={`${adminBrief.deliverables.length} đầu ra`}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <DarkListBlock title="Deliverables" items={adminBrief.deliverables} />

        <DarkListBlock
          title="Content requirements"
          items={adminBrief.content_requirements}
        />

        <DarkListBlock
          title="Technical requirements"
          items={adminBrief.technical_requirements}
        />

        <DarkListBlock
          title="References to collect"
          items={adminBrief.references_to_collect}
        />
      </div>

      {adminBrief.product_specific_requirements.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-200/60">
            Product specific requirements
          </p>

          <div className="mt-4 grid gap-3">
            {adminBrief.product_specific_requirements.map(
              (section, sectionIndex) => (
                <div
                  key={getReactListKey(
                    section,
                    sectionIndex,
                    "product-section",
                  )}
                  className="rounded-xl border border-white/10 bg-white/[0.06] p-4"
                >
                  <p className="text-sm font-black text-white">
                    {section.section_title}
                  </p>

                  <ul className="mt-3 grid gap-2">
                    {section.requirements.map((item, itemIndex) => (
                      <li
                        key={getReactListKey(
                          item,
                          itemIndex,
                          `${section.section_title}-requirement`,
                        )}
                        className="flex gap-2 text-sm font-semibold leading-6 text-white/80"
                      >
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ),
            )}
          </div>
        </div>
      ) : null}

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] p-5">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-200/60">
          Visual direction
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <DarkListBlock title="Mood" items={adminBrief.visual_direction.mood} />
          <DarkListBlock
            title="Style tags"
            items={adminBrief.visual_direction.style_tags}
          />
          <DarkListBlock
            title="Color direction"
            items={adminBrief.visual_direction.color_direction}
          />
          <DarkBlock
            label="Typography"
            value={adminBrief.visual_direction.typography_direction}
          />
          <DarkBlock
            label="Layout"
            value={adminBrief.visual_direction.layout_direction}
          />
          <DarkBlock
            label="Image"
            value={adminBrief.visual_direction.image_direction}
          />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] p-5">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-200/60">
          Layout hierarchy
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <DarkListBlock
            title="Priority order"
            items={adminBrief.layout_hierarchy.priority_order}
          />
          <DarkBlock
            label="Composition notes"
            value={adminBrief.layout_hierarchy.composition_notes}
          />
          <DarkBlock
            label="Readability notes"
            value={adminBrief.layout_hierarchy.readability_notes}
          />
          <DarkBlock
            label="Print/platform notes"
            value={adminBrief.layout_hierarchy.print_or_platform_notes}
          />
        </div>
      </div>

      {adminBrief.designer_notes ? (
        <DarkBlock label="Designer notes" value={adminBrief.designer_notes} />
      ) : null}

      {brief.risk_notes && brief.risk_notes.length > 0 ? (
        <DarkListBlock title="Risk notes" items={brief.risk_notes} />
      ) : null}
    </SurfaceCard>
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
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
            {meta.map((item, itemIndex) => (
              <StatusPill
                key={getReactListKey(item, itemIndex, "party-meta")}
                tone="neutral"
              >
                {item}
              </StatusPill>
            ))}
          </div>
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
        {realErrors.map((error, errorIndex) => (
          <p
            key={getReactListKey(error, errorIndex, "error")}
            className="text-sm font-semibold leading-7 text-red-600"
          >
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
    <div className={`rounded-[1.25rem] border p-5 ${cardClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className={`text-xs font-black uppercase tracking-[0.18em] ${labelClass}`}
          >
            {label}
          </p>

          <p className="mt-3 text-2xl font-black tracking-[-0.05em]">
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

function DarkSignalBox({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.15rem] border border-white/10 bg-white/10 p-4">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-sky-200/75">
        {icon}
        {label}
      </div>

      <p className="mt-2 text-sm font-extrabold leading-6 text-white">
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

function DarkBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] p-5">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-200/60">
        {label}
      </p>

      <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-7 text-white">
        {value || "Chưa có"}
      </p>
    </div>
  );
}

function DarkListBlock({ title, items }: { title: string; items: string[] }) {
  const realItems = items.filter(Boolean);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-200/60">
        {title}
      </p>

      {realItems.length > 0 ? (
        <ul className="mt-3 grid gap-2">
          {realItems.map((item, itemIndex) => (
            <li
              key={getReactListKey(item, itemIndex, title)}
              className="flex gap-2 text-sm font-semibold leading-6 text-white/85"
            >
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm font-semibold leading-6 text-white/55">
          Chưa có dữ liệu.
        </p>
      )}
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

function normalizeAdminBrief(brief: AiBriefRow): AdminBriefDisplay {
  const finalBriefJson = asRecord(brief.final_brief_json);
  const editedBriefJson = asRecord(brief.customer_edited_brief_json);
  const generatedBriefJson = asRecord(brief.brief_json);

  const source =
    Object.keys(finalBriefJson).length > 0
      ? finalBriefJson
      : Object.keys(editedBriefJson).length > 0
        ? editedBriefJson
        : generatedBriefJson;

  const visualDirection = asRecord(source.visual_direction);
  const layoutHierarchy = asRecord(source.layout_hierarchy);

  return {
    project_title: stringValue(
      source.project_title ?? brief.project_title,
      "Brief thiết kế",
    ),
    business_context: stringValue(
      source.business_context ?? brief.business_context,
      "",
    ),
    design_objective: stringValue(
      source.design_objective ?? brief.design_objective ?? brief.objective,
      "",
    ),
    target_audience: stringValue(
      source.target_audience ?? brief.target_audience,
      "",
    ),
    key_message: stringValue(source.key_message ?? brief.key_message, ""),
    deliverables:
      stringArray(source.deliverables).length > 0
        ? stringArray(source.deliverables)
        : brief.deliverables ?? [],
    product_specific_requirements: normalizeProductSpecificSections(
      source.product_specific_requirements,
    ),
    visual_direction: {
      mood: stringArray(visualDirection.mood),
      style_tags: stringArray(visualDirection.style_tags),
      color_direction: stringArray(visualDirection.color_direction),
      typography_direction: stringValue(
        visualDirection.typography_direction,
        "",
      ),
      layout_direction: stringValue(visualDirection.layout_direction, ""),
      image_direction: stringValue(visualDirection.image_direction, ""),
    },
    layout_hierarchy: {
      priority_order: stringArray(layoutHierarchy.priority_order),
      composition_notes: stringValue(layoutHierarchy.composition_notes, ""),
      readability_notes: stringValue(layoutHierarchy.readability_notes, ""),
      print_or_platform_notes: stringValue(
        layoutHierarchy.print_or_platform_notes,
        "",
      ),
    },
    content_requirements:
      stringArray(source.content_requirements).length > 0
        ? stringArray(source.content_requirements)
        : brief.content_requirements ?? [],
    technical_requirements:
      stringArray(source.technical_requirements).length > 0
        ? stringArray(source.technical_requirements)
        : brief.technical_requirements ?? [],
    references_to_collect:
      stringArray(source.references_to_collect).length > 0
        ? stringArray(source.references_to_collect)
        : brief.references_to_collect ?? [],
    designer_notes: stringValue(
      source.designer_notes ?? brief.designer_notes,
      "",
    ),
  };
}

function normalizeProductSpecificSections(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, itemIndex) => {
      if (typeof item === "string") {
        return {
          section_title: `Yêu cầu ${itemIndex + 1}`,
          requirements: [item],
        };
      }

      const record = asRecord(item);

      return {
        section_title: stringValue(record.section_title, "Yêu cầu thiết kế"),
        requirements: stringArray(record.requirements),
      };
    })
    .filter(
      (item) =>
        item.section_title.trim().length > 0 || item.requirements.length > 0,
    );
}

function buildWarningItems({
  job,
  payment,
  brief,
  briefIsConfirmed,
  updates,
  review,
}: {
  job: AdminJobDetailRow;
  payment: EmbeddedPaymentRow | null;
  brief: AiBriefRow | null;
  briefIsConfirmed: boolean;
  updates: JobUpdateRow[];
  review: JobReviewRow | null;
}) {
  const items: string[] = [];

  if (!payment) {
    items.push("Job chưa có payment record.");
  }

  if (
    payment &&
    !["confirmed", "paid", "completed", "succeeded"].includes(payment.status)
  ) {
    items.push(
      "Payment chưa được xác nhận, designer có thể chưa được phép bắt đầu.",
    );
  }

  if (!brief) {
    items.push("Request chưa có AI brief.");
  } else if (!briefIsConfirmed) {
    items.push("Brief chưa có tín hiệu đã được customer chốt.");
  }

  if (job.status === "active" && updates.length === 0) {
    items.push("Job đang active nhưng designer chưa gửi update nào.");
  }

  if (job.status === "completed" && !review) {
    items.push("Job đã hoàn thành nhưng chưa có review từ customer.");
  }

  if (!job.due_at) {
    items.push("Job chưa có due date rõ ràng.");
  }

  return items;
}

function getPrimaryPayment(
  payments: EmbeddedPaymentRow[] | EmbeddedPaymentRow | null,
) {
  if (Array.isArray(payments)) {
    return payments[0] ?? null;
  }

  return payments;
}

function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as JsonRecord;
}

function stringValue(value: unknown, fallback = "") {
  if (typeof value === "string") {
    const cleaned = value.trim();

    return cleaned.length > 0 ? cleaned : fallback;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;

    const candidate =
      record.text ??
      record.label ??
      record.title ??
      record.name ??
      record.requirement ??
      record.description ??
      record.value ??
      record.content ??
      record.message ??
      record.section_title;

    if (candidate !== undefined && candidate !== null) {
      return stringValue(candidate, fallback);
    }
  }

  return fallback;
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => stringValue(item, ""))
    .filter(Boolean);
}

function getReactListKey(value: unknown, index: number, prefix = "item") {
  const normalizedPrefix = normalizeKeyPart(prefix) || "item";

  if (typeof value === "string" || typeof value === "number") {
    const normalizedValue = normalizeKeyPart(String(value));

    return `${normalizedPrefix}-${normalizedValue || "value"}-${index}`;
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;

    const stableValue =
      record.id ??
      record.key ??
      record.title ??
      record.label ??
      record.name ??
      record.section_title ??
      record.question ??
      record.text ??
      record.requirement ??
      record.description ??
      record.value ??
      record.content ??
      record.message;

    const normalizedStableValue = normalizeKeyPart(stringValue(stableValue, ""));

    return `${normalizedPrefix}-${normalizedStableValue || "object"}-${index}`;
  }

  return `${normalizedPrefix}-${index}`;
}

function normalizeKeyPart(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
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

  if (status === "active") {
    return {
      label: "Đang thực hiện",
      tone: "info" as const,
    };
  }

  if (status === "payment_pending") {
    return {
      label: "Chờ thanh toán",
      tone: "warning" as const,
    };
  }

  if (status === "cancelled") {
    return {
      label: "Đã hủy",
      tone: "warning" as const,
    };
  }

  try {
    return getJobStatusMeta(status as Parameters<typeof getJobStatusMeta>[0]);
  } catch {
    return {
      label: status,
      tone: "neutral" as const,
    };
  }
}

function getSafePaymentStatusMeta(status: string) {
  if (["confirmed", "paid", "completed", "succeeded"].includes(status)) {
    return {
      label: "Đã xác nhận",
      tone: "success" as const,
    };
  }

  if (["pending", "waiting", "submitted", "waiting_transfer"].includes(status)) {
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

  try {
    return getPaymentStatusMeta(
      status as Parameters<typeof getPaymentStatusMeta>[0],
    );
  } catch {
    return {
      label: status,
      tone: "neutral" as const,
    };
  }
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