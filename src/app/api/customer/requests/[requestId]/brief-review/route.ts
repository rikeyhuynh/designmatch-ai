import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<Record<string, string>>;
};

type BriefReviewAction = "save" | "confirm";

function getEnvValue(key: string) {
  const value = process.env[key];

  if (!value || value.trim().length === 0) {
    return null;
  }

  return value.trim();
}

function createSupabaseAdminClient() {
  const supabaseUrl = getEnvValue("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey =
    getEnvValue("SUPABASE_SERVICE_ROLE_KEY") ??
    getEnvValue("SUPABASE_SECRET_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Thiếu Supabase admin env. Cần NEXT_PUBLIC_SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }) as any;
}

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .slice(0, 40);
}

function normalizeBriefPayload(value: unknown) {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  const visualDirection =
    record.visual_direction &&
    typeof record.visual_direction === "object" &&
    !Array.isArray(record.visual_direction)
      ? (record.visual_direction as Record<string, unknown>)
      : {};

  return {
    project_title: normalizeString(record.project_title),
    business_context: normalizeString(record.business_context),
    design_objective: normalizeString(record.design_objective),
    target_audience: normalizeString(record.target_audience),
    key_message: normalizeString(record.key_message),
    deliverables: normalizeStringArray(record.deliverables),
    visual_direction: {
      mood: normalizeStringArray(visualDirection.mood),
      style_tags: normalizeStringArray(visualDirection.style_tags),
      color_direction: normalizeStringArray(visualDirection.color_direction),
      typography_direction: normalizeString(
        visualDirection.typography_direction,
      ),
      layout_direction: normalizeString(visualDirection.layout_direction),
      image_direction: normalizeString(visualDirection.image_direction),
    },
    content_requirements: normalizeStringArray(record.content_requirements),
    technical_requirements: normalizeStringArray(record.technical_requirements),
    references_to_collect: normalizeStringArray(record.references_to_collect),
    designer_notes: normalizeString(record.designer_notes),
  };
}

function buildVisualDirectionText(brief: ReturnType<typeof normalizeBriefPayload>) {
  return [
    `Mood: ${brief.visual_direction.mood.join(", ") || "Chưa xác định"}`,
    `Style: ${brief.visual_direction.style_tags.join(", ") || "Chưa xác định"}`,
    `Màu sắc: ${
      brief.visual_direction.color_direction.join(", ") || "Chưa xác định"
    }`,
    `Typography: ${brief.visual_direction.typography_direction}`,
    `Bố cục: ${brief.visual_direction.layout_direction}`,
    `Hình ảnh: ${brief.visual_direction.image_direction}`,
  ].join("\n");
}

function buildBriefContent(brief: ReturnType<typeof normalizeBriefPayload>) {
  return [
    `Tên dự án: ${brief.project_title}`,
    "",
    `Bối cảnh kinh doanh: ${brief.business_context}`,
    "",
    `Mục tiêu thiết kế: ${brief.design_objective}`,
    "",
    `Đối tượng mục tiêu: ${brief.target_audience}`,
    "",
    `Thông điệp chính: ${brief.key_message}`,
    "",
    "Deliverables:",
    ...brief.deliverables.map((item) => `- ${item}`),
    "",
    "Định hướng thị giác:",
    buildVisualDirectionText(brief),
    "",
    "Yêu cầu nội dung:",
    ...brief.content_requirements.map((item) => `- ${item}`),
    "",
    "Yêu cầu kỹ thuật:",
    ...brief.technical_requirements.map((item) => `- ${item}`),
    "",
    "Tài liệu cần thu thập:",
    ...brief.references_to_collect.map((item) => `- ${item}`),
    "",
    `Ghi chú cho designer: ${brief.designer_notes}`,
  ].join("\n");
}

function getErrorPayload(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return {
    name: "UnknownError",
    message: "Không thể lưu brief.",
  };
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const routeParams = await context.params;
    const requestId = routeParams.requestId ?? routeParams.id;

    if (!requestId) {
      return NextResponse.json(
        {
          status: "failed",
          message: "Thiếu requestId.",
        },
        {
          status: 400,
        },
      );
    }

    const body = await request.json();

    const action: BriefReviewAction =
      body?.action === "confirm" ? "confirm" : "save";

    const briefPayload = normalizeBriefPayload(body?.brief);
    const content = buildBriefContent(briefPayload);
    const visualDirectionText = buildVisualDirectionText(briefPayload);

    if (!briefPayload.project_title || !briefPayload.design_objective) {
      return NextResponse.json(
        {
          status: "failed",
          message: "Brief cần có tên dự án và mục tiêu thiết kế.",
        },
        {
          status: 400,
        },
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data: existingBrief, error: findError } = await supabase
      .from("ai_briefs")
      .select("id")
      .or(`request_id.eq.${requestId},design_request_id.eq.${requestId}`)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findError) {
      return NextResponse.json(
        {
          status: "failed",
          message: "Không tìm được AI brief để cập nhật.",
          error: findError,
        },
        {
          status: 500,
        },
      );
    }

    if (!existingBrief?.id) {
      return NextResponse.json(
        {
          status: "failed",
          message:
            "Request này chưa có AI brief. Hãy tạo AI brief trước khi review.",
        },
        {
          status: 404,
        },
      );
    }

    const isConfirmed = action === "confirm";

    const { data: updatedBrief, error: updateBriefError } = await supabase
      .from("ai_briefs")
      .update({
        project_title: briefPayload.project_title,
        business_context: briefPayload.business_context,
        design_objective: briefPayload.design_objective,
        objective: briefPayload.design_objective,
        target_audience: briefPayload.target_audience,
        key_message: briefPayload.key_message,
        deliverables: briefPayload.deliverables,
        visual_direction: visualDirectionText,
        content_requirements: briefPayload.content_requirements,
        technical_requirements: briefPayload.technical_requirements,
        references_to_collect: briefPayload.references_to_collect,
        designer_notes: briefPayload.designer_notes,
        customer_edited_brief_json: briefPayload,
        final_brief_json: isConfirmed ? briefPayload : {},
        content,
        summary: briefPayload.design_objective,
        status: isConfirmed ? "confirmed" : "draft",
        is_user_confirmed: isConfirmed,
        confirmed_at: isConfirmed ? new Date().toISOString() : null,
      })
      .eq("id", existingBrief.id)
      .select("id, status, is_user_confirmed, confirmed_at")
      .single();

    if (updateBriefError) {
      return NextResponse.json(
        {
          status: "failed",
          message: "Không thể cập nhật AI brief.",
          error: updateBriefError,
        },
        {
          status: 500,
        },
      );
    }

    const { error: updateRequestError } = await supabase
      .from("design_requests")
      .update({
        brief_review_status: isConfirmed ? "confirmed" : "editing",
        brief_confirmed_at: isConfirmed ? new Date().toISOString() : null,
      })
      .eq("id", requestId);

    if (updateRequestError) {
      return NextResponse.json(
        {
          status: "failed",
          message: "Đã lưu brief nhưng chưa cập nhật được trạng thái request.",
          error: updateRequestError,
          savedBriefId: updatedBrief.id,
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      status: "success",
      message: isConfirmed
        ? "Đã chốt brief để gửi cho designer."
        : "Đã lưu bản chỉnh sửa brief.",
      action,
      savedBriefId: updatedBrief.id,
      briefStatus: updatedBrief.status,
      isUserConfirmed: updatedBrief.is_user_confirmed,
      confirmedAt: updatedBrief.confirmed_at,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "failed",
        message: "Lưu/chốt brief thất bại.",
        error: getErrorPayload(error),
      },
      {
        status: 500,
      },
    );
  }
}