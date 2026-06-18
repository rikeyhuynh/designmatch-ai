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
  Layers3,
  LayoutTemplate,
  Lightbulb,
  MessageSquareText,
  Palette,
  SendHorizonal,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  WalletCards,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";

import { StatusPill } from "@/components/common/status-pill";
import { SurfaceCard } from "@/components/common/surface-card";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { CompleteJobButton } from "@/features/customer/jobs/components/complete-job-button";
import { ConfirmTransferButton } from "@/features/customer/jobs/components/confirm-transfer-button";
import { CreateJobReviewForm } from "@/features/customer/jobs/components/create-job-review-form";
import { CreateUpdateFeedbackForm } from "@/features/customer/jobs/components/create-update-feedback-form";
import { requireRole } from "@/lib/auth/guards";
import { formatCurrencyVnd, formatDateVi, formatPercent } from "@/lib/format";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type CustomerJobDetailPageProps = {
  params: Promise<Record<string, string>>;
};

type JsonRecord = Record<string, unknown>;

type CustomerJobDetailRow = {
  id: string;
  request_id: string;
  title: string;
  status: string;
  agreed_price_vnd: number;
  package_name: string | null;
  package_code: string | null;
  selected_price_vnd: number | null;
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
    deadline: string | null;
    is_urgent: boolean | null;
    urgency_fee_percent: number | null;
    brief_review_status: string | null;
    brief_confirmed_at: string | null;
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

type SelectedConceptRow = {
  id: string;
  design_request_id: string;
  concept_name: string | null;
  concept_summary: string | null;
  strategic_role: string | null;
  mood_tags: string[] | null;
  style_tags: string[] | null;
  color_palette: unknown;
  typography_direction: string | null;
  layout_direction: string | null;
  image_direction: string | null;
  content_direction: string | null;
  designer_guidance: string | null;
  customer_explanation: string | null;
  suitability_score: number | null;
  differentiation_score: number | null;
  risk_notes: string[] | null;
};

type ConceptPreviewRow = {
  id: string;
  design_request_id: string;
  concept_direction_id: string;
  image_public_url: string | null;
  image_storage_path: string | null;
  image_mime_type: string | null;
  provider: string | null;
  model: string | null;
  prompt: string | null;
  preview_status: string | null;
  created_at: string | null;
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

type CustomerBriefDisplay = {
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
      package_name,
      package_code,
      selected_price_vnd,
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
        deadline,
        is_urgent,
        urgency_fee_percent,
        brief_review_status,
        brief_confirmed_at
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

  const [
    briefResult,
    paymentResult,
    updateResult,
    feedbackResult,
    reviewResult,
    selectedConceptResult,
  ] = await Promise.all([
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
      .or(`request_id.eq.${job.request_id},design_request_id.eq.${job.request_id}`)
      .order("created_at", { ascending: false })
      .limit(1)
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

    adminSupabase
      .from("ai_concept_directions")
      .select(
        `
          id,
          design_request_id,
          concept_name,
          concept_summary,
          strategic_role,
          mood_tags,
          style_tags,
          color_palette,
          typography_direction,
          layout_direction,
          image_direction,
          content_direction,
          designer_guidance,
          customer_explanation,
          suitability_score,
          differentiation_score,
          risk_notes
        `,
      )
      .eq("design_request_id", job.request_id)
      .eq("is_selected", true)
      .limit(1)
      .maybeSingle(),
  ]);

  const brief = briefResult.data as unknown as AiBriefRow | null;
  const payment = paymentResult.data as unknown as PaymentRow | null;
  const updates = (updateResult.data ?? []) as unknown as JobUpdateRow[];
  const feedbacks = (feedbackResult.data ??
    []) as unknown as JobUpdateFeedbackRow[];
  const review = reviewResult.data as unknown as JobReviewRow | null;

  const selectedConcept =
    selectedConceptResult.data as unknown as SelectedConceptRow | null;

  const conceptPreviewResult: any = selectedConcept
    ? await adminSupabase
        .from("ai_concept_previews")
        .select(
          `
          id,
          design_request_id,
          concept_direction_id,
          image_public_url,
          image_storage_path,
          image_mime_type,
          provider,
          model,
          prompt,
          preview_status,
          created_at
        `,
        )
        .eq("design_request_id", job.request_id)
        .eq("concept_direction_id", selectedConcept.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null, error: null };

  const selectedPreview =
    conceptPreviewResult.data as unknown as ConceptPreviewRow | null;

  const request = job.design_requests;
  const designer = job.designer_profiles;
  const customerBrief = brief ? normalizeCustomerBrief(brief) : null;

  const finalUpdates = updates.filter(
    (update) => update.update_type === "final",
  );

  const draftUpdates = updates.filter(
    (update) => update.update_type === "draft",
  );

  const isCompleted = job.status === "completed";
  const isPaymentPending = job.status === "payment_pending";
  const isActive = job.status === "active";
  const canCompleteJob = isActive && finalUpdates.length > 0;

  const jobStatus = getSafeJobStatus(job.status);
  const paymentStatus = getSafePaymentStatus(payment?.status ?? null);

  const customerPaymentAmountVnd =
    typeof payment?.amount_vnd === "number"
      ? payment.amount_vnd
      : job.agreed_price_vnd;

  const isUrgentRequest = Boolean(request?.is_urgent);
  const receiveTimeLabel = isUrgentRequest ? "1 ngày" : "Ít nhất 3 ngày";
  const urgencyBadgeLabel = isUrgentRequest ? "Đơn gấp +50%" : "Đơn thường";

  const briefIsConfirmed =
    brief?.status === "confirmed" ||
    Boolean(brief?.confirmed_at) ||
    request?.brief_review_status === "confirmed" ||
    Object.keys(asRecord(brief?.final_brief_json)).length > 0;

  return (
    <DashboardShell
      role="customer"
      title={job.title}
      description="Theo dõi thanh toán, thời gian nhận hàng, tiến độ thiết kế, ảnh preview, feedback, duyệt bản hoàn thiện và đánh giá designer."
      userName={profile.full_name}
      userEmail={authState.userEmail}
    >
      <ErrorPanel
        errors={[
          briefResult.error?.message,
          paymentResult.error?.message,
          updateResult.error?.message,
          feedbackResult.error?.message,
          reviewResult.error?.message,
          selectedConceptResult.error?.message,
          conceptPreviewResult.error?.message,
        ]}
      />

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

          <StatusPill tone={isUrgentRequest ? "warning" : "neutral"}>
            {urgencyBadgeLabel}
          </StatusPill>

          {briefIsConfirmed ? (
            <StatusPill tone="success">Brief đã chốt</StatusPill>
          ) : brief ? (
            <StatusPill tone="warning">Brief chưa chốt rõ</StatusPill>
          ) : (
            <StatusPill tone="warning">Chưa có brief</StatusPill>
          )}

          {selectedConcept ? (
            <StatusPill tone="info">Có concept direction</StatusPill>
          ) : (
            <StatusPill tone="warning">Chưa có concept</StatusPill>
          )}

          {selectedPreview ? (
            <StatusPill tone="success">Có visual preview</StatusPill>
          ) : null}

          <StatusPill tone="info">{`${updates.length} updates`}</StatusPill>

          {review ? <StatusPill tone="success">Đã đánh giá</StatusPill> : null}
        </div>
      </div>

      {isCompleted ? (
        <NoticeCard
          tone="success"
          icon={<CheckCircle2 className="size-5" />}
          title="Job completed"
          message="Job này đã được duyệt hoàn thành. Bạn có thể đánh giá designer nếu chưa gửi review cho job này."
        />
      ) : null}

      {isPaymentPending ? (
        <NoticeCard
          tone="warning"
          icon={<WalletCards className="size-5" />}
          title="Chờ thanh toán"
          message="Job đã được tạo nhưng designer chỉ bắt đầu làm sau khi payment được admin xác nhận. Hãy chuyển khoản đúng số tiền và đúng nội dung bên dưới."
        />
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Số tiền cần thanh toán"
          value={formatCurrencyVnd(customerPaymentAmountVnd)}
          description="Tổng số tiền bạn cần chuyển cho job này"
          icon={<CircleDollarSign className="size-5" />}
          tone="dark"
        />

        <MetricCard
          label="Job status"
          value={jobStatus.label}
          description="Trạng thái xử lý hiện tại"
          icon={<BriefcaseBusiness className="size-5" />}
          tone={isCompleted ? "success" : isPaymentPending ? "warning" : "normal"}
        />

        <MetricCard
          label="Final updates"
          value={`${finalUpdates.length}`}
          description="Bản hoàn thiện designer đã gửi"
          icon={<CheckCircle2 className="size-5" />}
          tone={finalUpdates.length > 0 ? "success" : "normal"}
        />

        <MetricCard
          label="Review"
          value={review ? `${review.rating}/5` : "Chưa có"}
          description="Đánh giá sau khi hoàn thành"
          icon={<Star className="size-5 fill-current" />}
          tone={review ? "warning" : "normal"}
        />
      </section>

      <section className="mt-5">
        <SurfaceCard className="overflow-hidden p-0">
          <div className="bg-gradient-to-br from-[#061a3a] via-[#0b2a61] to-blue-700 p-6 text-white">
            <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr] xl:items-center">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-sky-200/75">
                  Customer job workspace
                </p>

                <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.055em] text-white">
                  {job.title}
                </h1>

                <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-white/70">
                  Theo dõi toàn bộ quá trình làm việc: thanh toán, brief đã chốt,
                  concept direction, visual preview, designer, bản nháp, bản hoàn
                  thiện, feedback và review.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <DarkSignalBox
                  icon={<WalletCards className="size-4" />}
                  label="Payment"
                  value={paymentStatus.label}
                />

                <DarkSignalBox
                  icon={<Lightbulb className="size-4" />}
                  label="Concept"
                  value={selectedConcept ? "Đã chọn" : "Chưa có"}
                />

                <DarkSignalBox
                  icon={<CheckCircle2 className="size-4" />}
                  label="Final"
                  value={`${finalUpdates.length} bản cuối`}
                />

                <DarkSignalBox
                  icon={<Zap className="size-4" />}
                  label="Delivery"
                  value={
                    isUrgentRequest
                      ? "Đơn gấp · 1 ngày"
                      : "Đơn thường · ít nhất 3 ngày"
                  }
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
              label="Ngày nhận hàng"
              value={
                request?.deadline
                  ? formatDateVi(request.deadline)
                  : job.due_at
                    ? formatDateVi(job.due_at)
                    : "Chưa có deadline"
              }
              tone={!request?.deadline && !job.due_at ? "warning" : "normal"}
            />

            <SignalBox
              icon={<Clock3 className="size-4" />}
              label="Started"
              value={job.started_at ? formatDateVi(job.started_at) : "Chưa bắt đầu"}
            />

            <SignalBox
              icon={<Sparkles className="size-4" />}
              label="Draft / final"
              value={`${draftUpdates.length} draft · ${finalUpdates.length} final`}
            />
          </div>
        </SurfaceCard>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <SurfaceCard className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Job overview
              </p>

              <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.055em] text-[#061a3a]">
                {job.title}
              </h2>

              <p className="mt-2 text-sm font-bold text-blue-700">
                {request?.business_name ?? "Chưa rõ thương hiệu"}
              </p>

              <p className="mt-4 text-sm font-medium leading-7 text-slate-600">
                Job được tạo sau khi bạn chọn designer từ danh sách matching.
                Hãy xem update, phản hồi bản nháp và chỉ hoàn thành job sau khi
                đã hài lòng với bản cuối.
              </p>
            </div>

            <div className="grid size-14 place-items-center rounded-2xl bg-[#061a3a] text-white">
              <BriefcaseBusiness className="size-6" aria-hidden="true" />
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <InfoBox
              icon={<BriefcaseBusiness className="size-4" />}
              label="Package"
              value={job.package_name ?? job.package_code ?? "Chưa có"}
            />

            <InfoBox
              icon={<ShieldCheck className="size-4" />}
              label="Job status"
              value={jobStatus.label}
            />

            <InfoBox
              icon={<WalletCards className="size-4" />}
              label="Payment"
              value={paymentStatus.label}
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
          jobId={job.id}
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

      <section className="mt-6">
        <JobCreativeDirectionPanel
          concept={selectedConcept}
          preview={selectedPreview}
          audience="customer"
        />
      </section>

      <section className="mt-6">
        <DesignerPanel designer={designer} />
      </section>

      <section className="mt-6">
        {brief && customerBrief ? (
          <CustomerBriefPanel
            brief={brief}
            customerBrief={customerBrief}
            isConfirmed={briefIsConfirmed}
          />
        ) : (
          <SurfaceCard className="p-6">
            <EmptyBlock message="Request này chưa có AI brief." />
          </SurfaceCard>
        )}
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

function JobCreativeDirectionPanel({
  concept,
  preview,
  audience,
}: {
  concept: SelectedConceptRow | null;
  preview: ConceptPreviewRow | null;
  audience: "customer" | "designer";
}) {
  if (!concept) {
    return (
      <SurfaceCard className="p-6">
        <div className="grid gap-5 xl:grid-cols-[1fr_320px] xl:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
              Creative direction
            </p>

            <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
              Chưa có concept direction cho job này
            </h2>

            <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-slate-600">
              Concept direction giúp customer và designer thống nhất mood, style,
              màu sắc, typography, layout và hướng hình ảnh trước khi thiết kế.
            </p>
          </div>

          <div className="grid min-h-56 place-items-center rounded-[1.35rem] border border-dashed border-blue-200 bg-blue-50 p-6 text-center">
            <div>
              <Lightbulb className="mx-auto size-9 text-blue-700" />
              <p className="mt-3 text-sm font-extrabold text-[#061a3a]">
                Concept direction pending
              </p>
              <p className="mt-2 text-xs font-medium leading-6 text-slate-500">
                Job vẫn có thể thực hiện theo brief, nhưng sẽ rõ hơn nếu có
                concept và visual preview.
              </p>
            </div>
          </div>
        </div>
      </SurfaceCard>
    );
  }

  const colors = normalizeColorPalette(concept.color_palette);

  return (
    <SurfaceCard className="overflow-hidden p-0">
      <div className="border-b border-blue-100 bg-gradient-to-br from-blue-50 via-white to-sky-50 p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
              Creative direction
            </p>

            <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.055em] text-[#061a3a]">
              {concept.concept_name ?? "Concept đã chọn"}
            </h2>

            <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-slate-600">
              {concept.concept_summary ??
                concept.customer_explanation ??
                "Concept này là direction chính được dùng cho job."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusPill tone="info">Selected concept</StatusPill>

            {preview ? (
              <StatusPill tone="success">Visual preview ready</StatusPill>
            ) : (
              <StatusPill tone="warning">Chưa có preview</StatusPill>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-6 xl:grid-cols-[1fr_360px]">
        <div>
          <div className="grid gap-3 md:grid-cols-3">
            <InfoBox
              icon={<Palette className="size-4" />}
              label="Mood"
              value={(concept.mood_tags ?? []).slice(0, 5).join(", ") || "Chưa rõ"}
            />

            <InfoBox
              icon={<LayoutTemplate className="size-4" />}
              label="Style"
              value={(concept.style_tags ?? []).slice(0, 5).join(", ") || "Chưa rõ"}
            />

            <InfoBox
              icon={<ImageIcon className="size-4" />}
              label="Image direction"
              value={concept.image_direction ?? "Chưa rõ"}
            />
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {concept.typography_direction ? (
              <BriefBlock
                label="Typography direction"
                value={concept.typography_direction}
              />
            ) : null}

            {concept.layout_direction ? (
              <BriefBlock
                label="Layout direction"
                value={concept.layout_direction}
              />
            ) : null}

            {concept.content_direction ? (
              <BriefBlock
                label="Content direction"
                value={concept.content_direction}
              />
            ) : null}

            {concept.designer_guidance ? (
              <BriefBlock
                label={
                  audience === "designer"
                    ? "Guidance dành cho bạn"
                    : "Guidance cho designer"
                }
                value={concept.designer_guidance}
              />
            ) : null}
          </div>

          {colors.length > 0 ? (
            <div className="mt-5 rounded-[1.15rem] border border-blue-100 bg-blue-50/65 p-4">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                <Palette className="size-4" />
                Color palette
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {colors.slice(0, 8).map((color) => (
                  <div
                    key={`${color.name}-${color.hex_guess ?? color.role}`}
                    className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-bold text-slate-700"
                  >
                    <span
                      className="size-4 rounded-full border border-white shadow-sm"
                      style={{
                        backgroundColor: color.hex_guess ?? "#E5E7EB",
                      }}
                    />
                    {color.name}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {(concept.risk_notes ?? []).length > 0 ? (
            <div className="mt-5 rounded-[1.15rem] border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
                Risk notes
              </p>

              <ul className="mt-3 grid gap-2">
                {(concept.risk_notes ?? []).slice(0, 5).map((risk) => (
                  <li
                    key={risk}
                    className="rounded-2xl bg-white p-3 text-sm font-semibold leading-6 text-amber-900 ring-1 ring-amber-100"
                  >
                    • {risk}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {preview?.image_public_url ? (
          <div className="overflow-hidden rounded-[1.35rem] border border-blue-100 bg-blue-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview.image_public_url}
              alt={`Visual concept preview for ${
                concept.concept_name ?? "selected concept"
              }`}
              className="aspect-square w-full object-cover"
            />

            <div className="border-t border-blue-100 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">
                Visual preview
              </p>

              <p className="mt-2 text-xs font-medium leading-6 text-slate-500">
                {preview.provider || "AI"} · {preview.model || "image model"}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid min-h-80 place-items-center rounded-[1.35rem] border border-dashed border-blue-200 bg-blue-50 p-6 text-center">
            <div>
              <ImageIcon className="mx-auto size-10 text-blue-700" />
              <p className="mt-3 text-sm font-extrabold text-[#061a3a]">
                Chưa có visual preview
              </p>
              <p className="mt-2 text-xs font-medium leading-6 text-slate-500">
                Job này hiện chỉ có concept text. Visual preview giúp hai bên dễ
                thống nhất direction hơn.
              </p>
            </div>
          </div>
        )}
      </div>
    </SurfaceCard>
  );
}

function DesignerPanel({
  designer,
}: {
  designer: CustomerJobDetailRow["designer_profiles"];
}) {
  return (
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
  );
}

function CustomerBriefPanel({
  brief,
  customerBrief,
  isConfirmed,
}: {
  brief: AiBriefRow;
  customerBrief: CustomerBriefDisplay;
  isConfirmed: boolean;
}) {
  return (
    <SurfaceCard className="overflow-hidden p-0">
      <div className="border-b border-blue-100 bg-gradient-to-br from-[#061a3a] via-[#0b2a61] to-blue-700 p-6 text-white">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-sky-200/75">
              Final customer brief
            </p>

            <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.055em] text-white">
              Brief đã chốt cho job
            </h2>

            <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-white/70">
              Đây là brief cuối cùng dùng để designer thực hiện job. Bạn có thể
              đối chiếu bản thiết kế với các yêu cầu dưới đây.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {isConfirmed ? (
              <StatusPill tone="success">Đã chốt</StatusPill>
            ) : (
              <StatusPill tone="warning">Chưa chốt rõ</StatusPill>
            )}

            <StatusPill tone="info">
              {`${formatPercent(brief.brief_completeness_score / 100)} complete`}
            </StatusPill>
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-6">
        <div className="grid gap-4 xl:grid-cols-2">
          <BriefBlock label="Tên dự án" value={customerBrief.project_title} />

          <BriefBlock
            label="Thông điệp chính"
            value={customerBrief.key_message || "Chưa có thông điệp chính"}
          />

          <BriefBlock
            label="Bối cảnh kinh doanh"
            value={customerBrief.business_context}
          />

          <BriefBlock
            label="Mục tiêu thiết kế"
            value={customerBrief.design_objective}
          />

          <BriefBlock
            label="Đối tượng mục tiêu"
            value={customerBrief.target_audience}
          />

          {customerBrief.designer_notes ? (
            <BriefBlock
              label="Ghi chú riêng cho designer"
              value={customerBrief.designer_notes}
            />
          ) : null}
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <ListBlock
            title="Deliverables"
            items={customerBrief.deliverables}
            icon={<FileText className="size-4" />}
          />

          <ListBlock
            title="Yêu cầu nội dung"
            items={customerBrief.content_requirements}
            icon={<MessageSquareText className="size-4" />}
          />

          <ListBlock
            title="Yêu cầu kỹ thuật"
            items={customerBrief.technical_requirements}
            icon={<ShieldCheck className="size-4" />}
          />
        </div>

        {customerBrief.product_specific_requirements.length > 0 ? (
          <div className="rounded-[1.25rem] border border-blue-100 bg-blue-50/60 p-5">
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-blue-600">
              <Layers3 className="size-4" />
              Yêu cầu riêng theo loại ấn phẩm
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              {customerBrief.product_specific_requirements.map((section) => (
                <div
                  key={section.section_title}
                  className="rounded-2xl border border-blue-100 bg-white p-4"
                >
                  <p className="text-sm font-extrabold text-[#061a3a]">
                    {section.section_title}
                  </p>

                  {section.requirements.length > 0 ? (
                    <ul className="mt-3 grid gap-2">
                      {section.requirements.map((item) => (
                        <li
                          key={item}
                          className="flex gap-2 text-sm font-medium leading-6 text-slate-700"
                        >
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
                      Chưa có yêu cầu cụ thể trong nhóm này.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-2">
          <ListBlock
            title="Mood / cảm giác"
            items={customerBrief.visual_direction.mood}
            icon={<Sparkles className="size-4" />}
          />

          <ListBlock
            title="Style tags"
            items={customerBrief.visual_direction.style_tags}
            icon={<Palette className="size-4" />}
          />

          <ListBlock
            title="Màu sắc"
            items={customerBrief.visual_direction.color_direction}
            icon={<Palette className="size-4" />}
          />

          <BriefBlock
            label="Typography"
            value={
              customerBrief.visual_direction.typography_direction ||
              "Chưa có định hướng"
            }
          />

          <BriefBlock
            label="Layout"
            value={
              customerBrief.visual_direction.layout_direction ||
              "Chưa có định hướng"
            }
          />

          <BriefBlock
            label="Hình ảnh"
            value={
              customerBrief.visual_direction.image_direction ||
              "Chưa có định hướng"
            }
          />
        </div>

        <div className="rounded-[1.25rem] border border-blue-100 bg-blue-50/60 p-5">
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-blue-600">
            <Layers3 className="size-4" />
            Layout & hierarchy
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <ListBlock
              title="Thứ tự ưu tiên thông tin"
              items={customerBrief.layout_hierarchy.priority_order}
              icon={<Layers3 className="size-4" />}
            />

            <div className="grid gap-4">
              <BriefBlock
                label="Ghi chú bố cục"
                value={
                  customerBrief.layout_hierarchy.composition_notes ||
                  "Chưa có ghi chú"
                }
              />

              <BriefBlock
                label="Khả năng đọc"
                value={
                  customerBrief.layout_hierarchy.readability_notes ||
                  "Chưa có ghi chú"
                }
              />

              <BriefBlock
                label="Kênh sử dụng / in ấn"
                value={
                  customerBrief.layout_hierarchy.print_or_platform_notes ||
                  "Chưa có ghi chú"
                }
              />
            </div>
          </div>
        </div>

        <ListBlock
          title="Tài liệu cần cung cấp"
          items={customerBrief.references_to_collect}
          icon={<FileText className="size-4" />}
        />

        {brief.risk_notes && brief.risk_notes.length > 0 ? (
          <ListBlock
            title="Risk notes"
            items={brief.risk_notes}
            icon={<Sparkles className="size-4" />}
          />
        ) : null}
      </div>
    </SurfaceCard>
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
  jobId,
  payment,
  paymentStatus,
  jobStatus,
}: {
  jobId: string;
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

  const isConfirmed = ["confirmed", "paid", "completed"].includes(
    payment.status,
  );

  const canConfirmTransfer = ["waiting_transfer", "rejected"].includes(
    payment.status,
  );

  const isWaitingAdminConfirm = payment.status === "waiting_admin_confirm";

  return (
    <SurfaceCard
      className={`p-6 ${
        isConfirmed
          ? "border-emerald-200 bg-emerald-50"
          : isWaitingAdminConfirm
            ? "border-blue-200 bg-blue-50"
            : "border-amber-200 bg-amber-50"
      }`}
    >
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p
            className={`text-sm font-black uppercase tracking-[0.22em] ${
              isConfirmed
                ? "text-emerald-700"
                : isWaitingAdminConfirm
                  ? "text-blue-700"
                  : "text-amber-700"
            }`}
          >
            Payment information
          </p>

          <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
            Thông tin thanh toán
          </h2>

          <p
            className={`mt-3 text-sm font-medium leading-7 ${
              isConfirmed
                ? "text-emerald-950"
                : isWaitingAdminConfirm
                  ? "text-blue-950"
                  : "text-amber-950"
            }`}
          >
            {isConfirmed
              ? "Payment đã được admin xác nhận. Designer có thể bắt đầu hoặc tiếp tục thực hiện job."
              : isWaitingAdminConfirm
                ? "Hệ thống đã ghi nhận bạn đã chuyển khoản. Payment đang chờ admin kiểm tra và xác nhận."
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
            3. Sau khi chuyển khoản, bấm nút “Tôi đã chuyển khoản” để hệ thống
            ghi nhận.
          </li>
          <li>
            4. Admin sẽ kiểm tra giao dịch. Khi payment được xác nhận, job sẽ
            chuyển sang trạng thái đang làm.
          </li>
        </ol>

        {canConfirmTransfer ? (
          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-bold text-[#061a3a]">
              Bạn đã chuyển khoản xong?
            </p>

            <p className="mt-1 text-xs font-medium leading-5 text-slate-600">
              Hãy bấm xác nhận sau khi bạn đã chuyển đúng số tiền và đúng nội
              dung chuyển khoản. Admin sẽ kiểm tra giao dịch trước khi kích hoạt
              job.
            </p>

            <div className="mt-4">
              <ConfirmTransferButton jobId={jobId} />
            </div>
          </div>
        ) : null}

        {isWaitingAdminConfirm ? (
          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-bold text-blue-800">
              Payment đang chờ admin xác nhận
            </p>

            <p className="mt-1 text-xs font-medium leading-5 text-blue-700">
              Bạn đã xác nhận chuyển khoản. Vui lòng chờ admin kiểm tra giao
              dịch. Designer sẽ bắt đầu sau khi payment được xác nhận.
            </p>
          </div>
        ) : null}

        {isConfirmed ? (
          <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-sm font-bold text-emerald-800">
              Thanh toán đã được xác nhận
            </p>

            <p className="mt-1 text-xs font-medium leading-5 text-emerald-700">
              Job đã sẵn sàng để designer thực hiện.
            </p>
          </div>
        ) : null}

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
            {/* eslint-disable-next-line @next/next/no-img-element */}
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

function NoticeCard({
  tone,
  icon,
  title,
  message,
}: {
  tone: "success" | "warning";
  icon: ReactNode;
  title: string;
  message: string;
}) {
  const isSuccess = tone === "success";

  return (
    <SurfaceCard
      className={`mb-5 p-5 ${
        isSuccess
          ? "border-emerald-200 bg-emerald-50"
          : "border-amber-200 bg-amber-50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`grid size-11 shrink-0 place-items-center rounded-2xl text-white ${
            isSuccess ? "bg-emerald-700" : "bg-amber-600"
          }`}
        >
          {icon}
        </div>

        <div>
          <p
            className={`text-sm font-black uppercase tracking-[0.18em] ${
              isSuccess ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            {title}
          </p>

          <p
            className={`mt-2 text-sm font-medium leading-7 ${
              isSuccess ? "text-emerald-950" : "text-amber-950"
            }`}
          >
            {message}
          </p>
        </div>
      </div>
    </SurfaceCard>
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

function BriefBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.15rem] border border-blue-100 bg-blue-50/65 p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
        {label}
      </p>

      <p className="mt-2 whitespace-pre-line text-sm font-medium leading-7 text-slate-700">
        {value || "Chưa có"}
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
  const realItems = items.filter(Boolean);

  return (
    <div className="rounded-[1.15rem] border border-blue-100 bg-blue-50/65 p-4">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-blue-600">
        {icon}
        {title}
      </div>

      {realItems.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {realItems.map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-blue-100 bg-white p-3 text-sm font-medium leading-6 text-slate-700"
            >
              {item}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
          Chưa có dữ liệu.
        </p>
      )}
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

function normalizeColorPalette(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const record = asRecord(item);

      return {
        name: stringValue(record.name, "Không xác định"),
        hex_guess:
          typeof record.hex_guess === "string" &&
          /^#[0-9a-fA-F]{6}$/.test(record.hex_guess.trim())
            ? record.hex_guess.trim().toUpperCase()
            : null,
        role: stringValue(record.role, "supporting"),
      };
    })
    .filter((item) => item.name);
}

function normalizeCustomerBrief(brief: AiBriefRow): CustomerBriefDisplay {
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
    .map((item) => {
      const record = asRecord(item);

      return {
        section_title: stringValue(record.section_title, "Yêu cầu thiết kế"),
        requirements: stringArray(record.requirements),
      };
    })
    .filter(
      (item) =>
        item.section_title.trim().length > 0 ||
        item.requirements.length > 0,
    );
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

  return fallback;
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
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

  if (status === "reviewing") {
    return {
      label: "Đang duyệt bản cuối",
      tone: "info" as const,
    };
  }

  if (status === "completed") {
    return {
      label: "Hoàn thành",
      tone: "success" as const,
    };
  }

  if (status === "disputed") {
    return {
      label: "Đang tranh chấp",
      tone: "warning" as const,
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

  if (status === "not_required") {
    return {
      label: "Không cần thanh toán",
      tone: "neutral" as const,
    };
  }

  if (status === "waiting_transfer") {
    return {
      label: "Chờ chuyển khoản",
      tone: "warning" as const,
    };
  }

  if (status === "waiting_admin_confirm") {
    return {
      label: "Chờ admin xác nhận",
      tone: "info" as const,
    };
  }

  if (status === "confirmed") {
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