import { NextResponse } from "next/server";

import { suggestAIJobFeedback } from "@/lib/ai/tasks/feedback-assistant";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    jobId: string;
    updateId: string;
  }>;
};

type AssistFeedbackBody = {
  message?: string;
};

type CustomerProfileForFeedback = {
  id: string;
  profile_id: string;
};

type JobForFeedbackAssist = {
  id: string;
  request_id: string;
  customer_id: string;
  designer_id: string;
  title: string;
  status: string;
  agreed_price_vnd: number;
  design_requests: Record<string, unknown> | null;
};

type JobUpdateForFeedbackAssist = {
  id: string;
  job_id: string;
  designer_id: string;
  update_type: string;
  title: string;
  message: string;
  attachment_url: string | null;
  created_at: string;
};

export async function POST(request: Request, context: RouteContext) {
  const { jobId, updateId } = await context.params;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      {
        message: "Bạn cần đăng nhập bằng tài khoản customer.",
      },
      {
        status: 401,
      },
    );
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  const { data: customerProfileData, error: customerProfileError } =
    await adminSupabase
      .from("customer_profiles")
      .select("id, profile_id")
      .eq("profile_id", user.id)
      .maybeSingle();

  const customerProfile =
    customerProfileData as CustomerProfileForFeedback | null;

  if (customerProfileError || !customerProfile) {
    return NextResponse.json(
      {
        message: "Không tìm thấy customer profile của tài khoản đang đăng nhập.",
      },
      {
        status: 403,
      },
    );
  }

  const { data: jobData, error: jobError } = await adminSupabase
    .from("jobs")
    .select(
      `
      id,
      request_id,
      customer_id,
      designer_id,
      title,
      status,
      agreed_price_vnd,
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
        brief_review_status,
        brief_confirmed_at
      )
    `,
    )
    .eq("id", jobId)
    .maybeSingle();

  const job = jobData as unknown as JobForFeedbackAssist | null;

  if (jobError || !job) {
    return NextResponse.json(
      {
        message: "Không tìm thấy job.",
      },
      {
        status: 404,
      },
    );
  }

  if (job.customer_id !== customerProfile.id) {
    return NextResponse.json(
      {
        message: "Job này không thuộc customer đang đăng nhập.",
      },
      {
        status: 403,
      },
    );
  }

  if (job.status === "completed") {
    return NextResponse.json(
      {
        message: "Job đã hoàn thành nên không thể tạo feedback mới.",
      },
      {
        status: 400,
      },
    );
  }

  const { data: updateData, error: updateError } = await adminSupabase
    .from("job_updates")
    .select(
      `
      id,
      job_id,
      designer_id,
      update_type,
      title,
      message,
      attachment_url,
      created_at
    `,
    )
    .eq("id", updateId)
    .eq("job_id", job.id)
    .maybeSingle();

  const jobUpdate = updateData as JobUpdateForFeedbackAssist | null;

  if (updateError || !jobUpdate) {
    return NextResponse.json(
      {
        message: "Không tìm thấy cập nhật tiến độ để phân tích feedback.",
      },
      {
        status: 404,
      },
    );
  }

  let body: AssistFeedbackBody;

  try {
    body = (await request.json()) as AssistFeedbackBody;
  } catch {
    return NextResponse.json(
      {
        message: "Dữ liệu gửi lên không hợp lệ.",
      },
      {
        status: 400,
      },
    );
  }

  const rawFeedback = body.message?.trim() ?? "";

  if (rawFeedback.length < 5) {
    return NextResponse.json(
      {
        message: "Nội dung feedback cần ít nhất 5 ký tự để AI có thể hỗ trợ.",
      },
      {
        status: 400,
      },
    );
  }

  const [briefResult, selectedConceptResult] = await Promise.all([
    adminSupabase
      .from("ai_briefs")
      .select(
        `
        id,
        request_id,
        design_request_id,
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
      .from("ai_concept_directions")
      .select(
        `
        id,
        design_request_id,
        concept_key,
        concept_name,
        concept_summary,
        strategic_role,
        best_for,
        mood_tags,
        style_tags,
        color_palette,
        typography_direction,
        layout_direction,
        image_direction,
        content_direction,
        preview_image_prompt,
        designer_guidance,
        customer_explanation,
        suitability_score,
        differentiation_score,
        risk_notes,
        created_at
      `,
      )
      .eq("design_request_id", job.request_id)
      .eq("is_selected", true)
      .limit(1)
      .maybeSingle(),
  ]);

  if (briefResult.error) {
    return NextResponse.json(
      {
        message: briefResult.error.message,
      },
      {
        status: 500,
      },
    );
  }

  if (selectedConceptResult.error) {
    return NextResponse.json(
      {
        message: selectedConceptResult.error.message,
      },
      {
        status: 500,
      },
    );
  }

  const selectedConcept = selectedConceptResult.data as Record<
    string,
    unknown
  > | null;

  const previewResult: any = selectedConcept
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

  if (previewResult.error) {
    return NextResponse.json(
      {
        message: previewResult.error.message,
      },
      {
        status: 500,
      },
    );
  }

  try {
    const aiFeedback = await suggestAIJobFeedback({
      rawFeedback,
      job: {
        id: job.id,
        title: job.title,
        status: job.status,
        agreed_price_vnd: job.agreed_price_vnd,
      },
      jobUpdate: {
        id: jobUpdate.id,
        update_type: jobUpdate.update_type,
        title: jobUpdate.title,
        message: jobUpdate.message,
        attachment_url: jobUpdate.attachment_url,
        created_at: jobUpdate.created_at,
      },
      designRequest: job.design_requests,
      aiBrief: briefResult.data as Record<string, unknown> | null,
      selectedConcept,
      visualPreview: previewResult.data as Record<string, unknown> | null,
    });

    return NextResponse.json({
      message: "AI đã gợi ý phiên bản feedback rõ ràng hơn.",
      feedback_assist: aiFeedback,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "AI Feedback Assistant chưa thể xử lý yêu cầu này.";

    return NextResponse.json(
      {
        message: errorMessage,
      },
      {
        status: 500,
      },
    );
  }
}