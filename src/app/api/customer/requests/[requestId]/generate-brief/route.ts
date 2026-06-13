import { NextResponse } from "next/server";

import { buildMockAiBrief, type MockBriefInput } from "@/lib/ai/mock-brief-builder";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    requestId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { requestId } = await context.params;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      {
        message: "Bạn cần đăng nhập để tạo AI brief.",
      },
      {
        status: 401,
      },
    );
  }

  const { data: customerProfile, error: customerError } = await supabase
    .from("customer_profiles")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (customerError || !customerProfile) {
    return NextResponse.json(
      {
        message: "Không tìm thấy customer profile.",
      },
      {
        status: 403,
      },
    );
  }

  const { data: requestRow, error: requestError } = await supabase
    .from("design_requests")
    .select(
      "id, customer_id, title, business_name, industry, category, description, target_audience, budget_min_vnd, budget_max_vnd, deadline, preferred_styles",
    )
    .eq("id", requestId)
    .eq("customer_id", customerProfile.id)
    .maybeSingle();

  if (requestError || !requestRow) {
    return NextResponse.json(
      {
        message: "Không tìm thấy request hoặc bạn không có quyền truy cập.",
      },
      {
        status: 404,
      },
    );
  }

  const requestInput = requestRow as unknown as MockBriefInput & {
    id: string;
    customer_id: string;
  };

  const generatedBrief = buildMockAiBrief(requestInput);
  const adminSupabase = createSupabaseAdminClient();

  const { error: briefError } = await adminSupabase.from("ai_briefs").upsert(
    {
      request_id: requestInput.id,
      objective: generatedBrief.objective,
      visual_direction: generatedBrief.visual_direction,
      key_message: generatedBrief.key_message,
      deliverables: generatedBrief.deliverables,
      recommended_styles: generatedBrief.recommended_styles,
      risk_level: generatedBrief.risk_level,
      risk_notes: generatedBrief.risk_notes,
      brief_completeness_score: generatedBrief.brief_completeness_score,
      raw_ai_output: generatedBrief.raw_ai_output,
    },
    {
      onConflict: "request_id",
    },
  );

  if (briefError) {
    return NextResponse.json(
      {
        message: briefError.message,
      },
      {
        status: 500,
      },
    );
  }

  const { error: statusError } = await adminSupabase
    .from("design_requests")
    .update({
      status: "ready_to_match",
    })
    .eq("id", requestInput.id);

  if (statusError) {
    return NextResponse.json(
      {
        message: statusError.message,
      },
      {
        status: 500,
      },
    );
  }

  return NextResponse.json({
    message: "AI brief đã được tạo.",
    brief: generatedBrief,
  });
}