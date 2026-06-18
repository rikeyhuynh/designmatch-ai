import { NextResponse } from "next/server";

import { getCurrentAuthState } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<Record<string, string>>;
};

type DesignRequestRow = {
  id: string;
  customer_id: string;
  brief_review_status: string | null;
};

type ConceptDirectionRow = {
  id: string;
  design_request_id: string;
  concept_key: string | null;
  concept_name: string | null;
  concept_summary: string | null;
  is_selected: boolean | null;
};

export async function POST(_request: Request, context: RouteContext) {
  const routeParams = await context.params;
  const requestId = routeParams.requestId ?? routeParams.requestID;
  const conceptId = routeParams.conceptId ?? routeParams.conceptID;

  if (!requestId || !conceptId) {
    return NextResponse.json(
      {
        message: "Thiếu request ID hoặc concept ID.",
      },
      { status: 400 },
    );
  }

  const authState = await getCurrentAuthState();

  if (!authState.isAuthenticated || !authState.profile) {
    return NextResponse.json(
      {
        message: "Bạn cần đăng nhập để chọn concept.",
      },
      { status: 401 },
    );
  }

  if (authState.profile.role !== "customer" || !authState.customerProfile) {
    return NextResponse.json(
      {
        message: "Chỉ customer mới có thể chọn concept.",
      },
      { status: 403 },
    );
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  const { data: requestData, error: requestError } = await adminSupabase
    .from("design_requests")
    .select("id, customer_id, brief_review_status")
    .eq("id", requestId)
    .eq("customer_id", authState.customerProfile.id)
    .maybeSingle();

  if (requestError) {
    return NextResponse.json(
      {
        message: requestError.message,
      },
      { status: 500 },
    );
  }

  if (!requestData) {
    return NextResponse.json(
      {
        message:
          "Không tìm thấy request hoặc bạn không có quyền chọn concept cho request này.",
      },
      { status: 404 },
    );
  }

  const designRequest = requestData as DesignRequestRow;

  const { data: conceptData, error: conceptError } = await adminSupabase
    .from("ai_concept_directions")
    .select(
      `
      id,
      design_request_id,
      concept_key,
      concept_name,
      concept_summary,
      is_selected
    `,
    )
    .eq("id", conceptId)
    .eq("design_request_id", designRequest.id)
    .maybeSingle();

  if (conceptError) {
    return NextResponse.json(
      {
        message: conceptError.message,
      },
      { status: 500 },
    );
  }

  if (!conceptData) {
    return NextResponse.json(
      {
        message: "Không tìm thấy concept direction cần chọn.",
      },
      { status: 404 },
    );
  }

  await adminSupabase
    .from("ai_concept_directions")
    .update({
      is_selected: false,
    })
    .eq("design_request_id", designRequest.id);

  const { data: selectedConcept, error: selectError } = await adminSupabase
    .from("ai_concept_directions")
    .update({
      is_selected: true,
    })
    .eq("id", conceptId)
    .eq("design_request_id", designRequest.id)
    .select(
      `
      id,
      design_request_id,
      concept_key,
      concept_name,
      concept_summary,
      is_selected
    `,
    )
    .maybeSingle();

  if (selectError) {
    return NextResponse.json(
      {
        message: selectError.message,
      },
      { status: 500 },
    );
  }

  const concept = selectedConcept as ConceptDirectionRow | null;

  return NextResponse.json({
    message: "Đã chọn concept direction.",
    selectedConcept: concept,
  });
}