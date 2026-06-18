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
  PenTool,
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
import { JobChatBox } from "@/features/jobs/chat/components/job-chat-box";
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

type JsonRecord = Record<string, unknown>;

type JobDetailRow = {
  id: string;
  request_id: string;
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
    is_urgent: boolean | null;
    preferred_styles: string[] | null;
  } | null;
};

type PaymentRow = {
  id: string;
  job_id: string;
  status: string;
  designer_revenue_vnd: number | null;
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

type DesignerBriefDisplay = {
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
        is_urgent,
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

  const [
    briefResult,
    paymentResult,
    updateResult,
    feedbackResult,
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
          status,
          designer_revenue_vnd,
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
  const jobStatus = getSafeJobStatus(job.status);
  const paymentStatus = getSafePaymentStatus(payment?.status ?? null);

  const isUrgentRequest = Boolean(request?.is_urgent);
  const receiveTimeLabel = isUrgentRequest ? "1 ngày" : "Ít nhất 3 ngày";
  const urgencyBadgeLabel = isUrgentRequest ? "Đơn gấp" : "Đơn thường";

  const canUpdateJob = job.status === "active";
  const isPaymentPending = job.status === "payment_pending";
  const isCompleted = job.status === "completed";
  const isCancelled = job.status === "cancelled";

  const designerPayoutVnd =
    typeof payment?.designer_revenue_vnd === "number"
      ? payment.designer_revenue_vnd
      : Number(job.designer_revenue_vnd ?? 0);

  const designerBrief = brief ? normalizeDesignerBrief(brief) : null;

  const briefIsConfirmed =
    brief?.status === "confirmed" ||
    Boolean(brief?.confirmed_at) ||
    Object.keys(asRecord(brief?.final_brief_json)).length > 0;

  return (
    <DashboardShell
      role="designer"
      title={job.title}
      description="Chi tiết job, trạng thái thanh toán, brief khách hàng, concept direction, visual preview, cập nhật tiến độ và feedback."
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

          <StatusPill tone={isUrgentRequest ? "warning" : "success"}>
            {urgencyBadgeLabel}
          </StatusPill>

          {briefIsConfirmed ? (
            <StatusPill tone="success">Brief đã chốt</StatusPill>
          ) : brief ? (
            <StatusPill tone="warning">Brief chưa chốt rõ</StatusPill>
          ) : (
            <StatusPill tone="neutral">Chưa có brief</StatusPill>
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
                Đây là workspace làm việc của designer. Hãy đọc kỹ brief đã
                chốt, concept direction và visual preview trước khi gửi bản nháp
                hoặc final delivery.
              </p>
            </div>

            <div className="grid size-14 place-items-center rounded-2xl bg-[#061a3a] text-white">
              <BriefcaseBusiness className="size-6" aria-hidden="true" />
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <InfoBox
              icon={<CircleDollarSign className="size-4" />}
              label="Thu nhập của bạn"
              value={formatCurrencyVnd(designerPayoutVnd)}
            />

            <InfoBox
              icon={<CalendarDays className="size-4" />}
              label="Ngày nhận hàng"
              value={
                request?.deadline
                  ? formatDateVi(request.deadline)
                  : job.due_at
                    ? formatDateVi(job.due_at)
                    : "Chưa có deadline"
              }
            />

            <InfoBox
              icon={<WalletCards className="size-4" />}
              label="Loại đơn"
              value={urgencyBadgeLabel}
            />

            <InfoBox
              icon={<Clock3 className="size-4" />}
              label="Thời gian nhận hàng"
              value={receiveTimeLabel}
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

        <PaymentPanel
          payment={payment}
          paymentStatus={paymentStatus}
          designerPayoutVnd={designerPayoutVnd}
        />
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

            <div className="mt-3 flex flex-wrap gap-2">
              <StatusPill tone={isUrgentRequest ? "warning" : "success"}>
                {urgencyBadgeLabel}
              </StatusPill>

              <StatusPill tone="info">{receiveTimeLabel}</StatusPill>
            </div>

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
                icon={<CalendarDays className="size-4" />}
                label="Deadline"
                value={
                  request.deadline ? formatDateVi(request.deadline) : "Chưa có"
                }
              />

              <InfoBox
                icon={<WalletCards className="size-4" />}
                label="Loại đơn"
                value={urgencyBadgeLabel}
              />

              <InfoBox
                icon={<Clock3 className="size-4" />}
                label="Thời gian nhận hàng"
                value={receiveTimeLabel}
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
        <JobChatBox jobId={job.id} role="designer" />
      </section>

      <section className="mt-6">
        <JobCreativeDirectionPanel
          concept={selectedConcept}
          preview={selectedPreview}
          audience="designer"
        />
      </section>

      <section className="mt-6">
        {brief && designerBrief ? (
          <DesignerBriefPanel
            brief={brief}
            designerBrief={designerBrief}
            isConfirmed={briefIsConfirmed}
          />
        ) : (
          <SurfaceCard className="grid place-items-center p-8 text-center">
            <Sparkles className="size-8 text-blue-700" />

            <h2 className="mt-4 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
              Chưa có brief đã chốt.
            </h2>

            <p className="mt-2 max-w-xl text-sm font-medium leading-7 text-slate-600">
              Customer chưa tạo hoặc chưa chốt AI brief cho request này.
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
              <BriefInfoBlock
                icon={<PenTool className="size-4" />}
                title="Typography direction"
                value={concept.typography_direction}
              />
            ) : null}

            {concept.layout_direction ? (
              <BriefInfoBlock
                icon={<Layers3 className="size-4" />}
                title="Layout direction"
                value={concept.layout_direction}
              />
            ) : null}

            {concept.content_direction ? (
              <BriefInfoBlock
                icon={<MessageSquareText className="size-4" />}
                title="Content direction"
                value={concept.content_direction}
              />
            ) : null}

            {concept.designer_guidance ? (
              <BriefInfoBlock
                icon={<Target className="size-4" />}
                title={
                  audience === "designer"
                    ? "Guidance dành cho bạn"
                    : "Guidance cho designer"
                }
                value={concept.designer_guidance}
                tone="warning"
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

function DesignerBriefPanel({
  brief,
  designerBrief,
  isConfirmed,
}: {
  brief: AiBriefRow;
  designerBrief: DesignerBriefDisplay;
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
              Brief đã chốt cho designer
            </h2>

            <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-white/70">
              Đây là brief chính thức để bạn thực hiện job. Hãy ưu tiên các mục
              deliverables, yêu cầu nội dung, kỹ thuật và định hướng thị giác.
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
          <BriefInfoBlock
            icon={<FileText className="size-4" />}
            title="Tên dự án"
            value={designerBrief.project_title}
          />

          <BriefInfoBlock
            icon={<Target className="size-4" />}
            title="Thông điệp chính"
            value={designerBrief.key_message || "Chưa có thông điệp chính"}
          />

          <BriefInfoBlock
            icon={<Store className="size-4" />}
            title="Bối cảnh kinh doanh"
            value={designerBrief.business_context}
          />

          <BriefInfoBlock
            icon={<Sparkles className="size-4" />}
            title="Mục tiêu thiết kế"
            value={designerBrief.design_objective}
          />

          <BriefInfoBlock
            icon={<Target className="size-4" />}
            title="Đối tượng mục tiêu"
            value={designerBrief.target_audience}
          />

          {designerBrief.designer_notes ? (
            <BriefInfoBlock
              icon={<MessageSquareText className="size-4" />}
              title="Ghi chú riêng từ khách hàng"
              value={designerBrief.designer_notes}
              tone="warning"
            />
          ) : null}
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <BriefListPanel
            icon={<CheckCircle2 className="size-4" />}
            title="Deliverables"
            items={designerBrief.deliverables}
            emptyText="Chưa có deliverables cụ thể."
          />

          <BriefListPanel
            icon={<PenTool className="size-4" />}
            title="Yêu cầu nội dung"
            items={designerBrief.content_requirements}
            emptyText="Chưa có yêu cầu nội dung."
          />

          <BriefListPanel
            icon={<FileText className="size-4" />}
            title="Yêu cầu kỹ thuật"
            items={designerBrief.technical_requirements}
            emptyText="Chưa có yêu cầu kỹ thuật."
          />
        </div>

        {designerBrief.product_specific_requirements.length > 0 ? (
          <div className="rounded-[1.25rem] border border-blue-100 bg-blue-50/60 p-5">
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-blue-600">
              <LayoutTemplate className="size-4" />
              Yêu cầu riêng theo loại ấn phẩm
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              {designerBrief.product_specific_requirements.map((section) => (
                <div
                  key={section.section_title}
                  className="rounded-2xl border border-blue-100 bg-white p-4"
                >
                  <p className="text-sm font-extrabold text-[#061a3a]">
                    {section.section_title}
                  </p>

                  {section.requirements.length > 0 ? (
                    <ul className="mt-3 grid gap-2">
                      {section.requirements.map((item, index) => (
                        <li
                          key={`${String(item)}-${index}`}
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

        <VisualDirectionPanel visualDirection={designerBrief.visual_direction} />

        <LayoutHierarchyPanel layoutHierarchy={designerBrief.layout_hierarchy} />

        <BriefListPanel
          icon={<FileText className="size-4" />}
          title="Tài liệu cần thu thập / cần khách cung cấp"
          items={designerBrief.references_to_collect}
          emptyText="Không có tài liệu bổ sung được ghi rõ."
        />

        {brief.risk_notes && brief.risk_notes.length > 0 ? (
          <BriefListPanel
            icon={<ShieldCheck className="size-4" />}
            title="Risk notes"
            items={brief.risk_notes}
            emptyText="Không có risk note."
            tone="warning"
          />
        ) : null}
      </div>
    </SurfaceCard>
  );
}

function VisualDirectionPanel({
  visualDirection,
}: {
  visualDirection: VisualDirection;
}) {
  return (
    <div className="rounded-[1.25rem] border border-blue-100 bg-white p-5">
      <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-blue-600">
        <Palette className="size-4" />
        Định hướng thị giác
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <BriefListPanel
          icon={<Sparkles className="size-4" />}
          title="Mood / cảm giác"
          items={visualDirection.mood}
          emptyText="Chưa có mood cụ thể."
        />

        <BriefListPanel
          icon={<Palette className="size-4" />}
          title="Style tags"
          items={visualDirection.style_tags}
          emptyText="Chưa có style tag."
        />

        <BriefListPanel
          icon={<Palette className="size-4" />}
          title="Màu sắc"
          items={visualDirection.color_direction}
          emptyText="Chưa có màu sắc cụ thể."
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <BriefInfoBlock
          icon={<PenTool className="size-4" />}
          title="Typography"
          value={visualDirection.typography_direction || "Chưa có định hướng"}
        />

        <BriefInfoBlock
          icon={<Layers3 className="size-4" />}
          title="Bố cục"
          value={visualDirection.layout_direction || "Chưa có định hướng"}
        />

        <BriefInfoBlock
          icon={<ImageIcon className="size-4" />}
          title="Hình ảnh"
          value={visualDirection.image_direction || "Chưa có định hướng"}
        />
      </div>
    </div>
  );
}

function LayoutHierarchyPanel({
  layoutHierarchy,
}: {
  layoutHierarchy: LayoutHierarchy;
}) {
  return (
    <div className="rounded-[1.25rem] border border-blue-100 bg-blue-50/60 p-5">
      <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-blue-600">
        <Layers3 className="size-4" />
        Layout & hierarchy
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <BriefListPanel
          icon={<Layers3 className="size-4" />}
          title="Thứ tự ưu tiên thông tin"
          items={layoutHierarchy.priority_order}
          emptyText="Chưa có thứ tự ưu tiên cụ thể."
        />

        <div className="grid gap-4">
          <BriefInfoBlock
            icon={<LayoutTemplate className="size-4" />}
            title="Ghi chú bố cục"
            value={layoutHierarchy.composition_notes || "Chưa có ghi chú"}
          />

          <BriefInfoBlock
            icon={<FileText className="size-4" />}
            title="Khả năng đọc"
            value={layoutHierarchy.readability_notes || "Chưa có ghi chú"}
          />

          <BriefInfoBlock
            icon={<CalendarDays className="size-4" />}
            title="Kênh sử dụng / in ấn"
            value={
              layoutHierarchy.print_or_platform_notes || "Chưa có ghi chú"
            }
          />
        </div>
      </div>
    </div>
  );
}

function BriefInfoBlock({
  icon,
  title,
  value,
  tone = "normal",
}: {
  icon: ReactNode;
  title: string;
  value: string;
  tone?: "normal" | "warning";
}) {
  return (
    <div
      className={`rounded-[1.15rem] border p-4 ${
        tone === "warning"
          ? "border-amber-200 bg-amber-50"
          : "border-blue-100 bg-blue-50/60"
      }`}
    >
      <div
        className={`flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] ${
          tone === "warning" ? "text-amber-700" : "text-blue-600"
        }`}
      >
        {icon}
        {title}
      </div>

      <p className="mt-2 whitespace-pre-line text-sm font-medium leading-7 text-slate-700">
        {value || "Chưa có"}
      </p>
    </div>
  );
}

function BriefListPanel({
  icon,
  title,
  items,
  emptyText,
  tone = "normal",
}: {
  icon: ReactNode;
  title: string;
  items: string[];
  emptyText: string;
  tone?: "normal" | "warning";
}) {
  const realItems = items.filter(Boolean);

  return (
    <div
      className={`rounded-[1.15rem] border p-4 ${
        tone === "warning"
          ? "border-amber-200 bg-amber-50"
          : "border-blue-100 bg-white"
      }`}
    >
      <div
        className={`flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] ${
          tone === "warning" ? "text-amber-700" : "text-blue-600"
        }`}
      >
        {icon}
        {title}
      </div>

      {realItems.length > 0 ? (
        <ul className="mt-3 grid gap-2">
          {realItems.map((item, index) => (
            <li
              key={`${String(item)}-${index}`}
              className="flex gap-2 text-sm font-medium leading-6 text-slate-700"
            >
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
          {emptyText}
        </p>
      )}
    </div>
  );
}

function PaymentPanel({
  payment,
  paymentStatus,
  designerPayoutVnd,
}: {
  payment: PaymentRow | null;
  paymentStatus: ReturnType<typeof getSafePaymentStatus>;
  designerPayoutVnd: number;
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

  const isConfirmed = payment.status === "confirmed";

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
            Trạng thái thanh toán
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
          label="Thu nhập của bạn"
          value={formatCurrencyVnd(designerPayoutVnd)}
        />

        <InfoBox
          icon={<Banknote className="size-4" />}
          label="Payment status"
          value={paymentStatus.label}
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
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

function normalizeDesignerBrief(brief: AiBriefRow): DesignerBriefDisplay {
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
      label: "Chờ customer chuyển khoản",
      tone: "warning" as const,
    };
  }

  if (status === "waiting_admin_confirm") {
    return {
      label: "Chờ admin xác nhận",
      tone: "warning" as const,
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

