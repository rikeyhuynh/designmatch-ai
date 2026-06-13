import { NextResponse } from "next/server";

import { getCurrentAuthState } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<Record<string, string>>;
};

type DesignerVerificationPayload = {
  action?: unknown;
};

export async function PATCH(request: Request, context: RouteContext) {
  const routeParams = await context.params;
  const designerId = routeParams.designerId ?? routeParams.designerID;

  if (!designerId) {
    return NextResponse.json(
      {
        message: "Thiếu designer ID.",
      },
      { status: 400 },
    );
  }

  const authState = await getCurrentAuthState();

  if (!authState.isAuthenticated || !authState.profile) {
    return NextResponse.json(
      {
        message: "Bạn cần đăng nhập để xử lý designer.",
      },
      { status: 401 },
    );
  }

  if (authState.profile.role !== "admin") {
    return NextResponse.json(
      {
        message: "Chỉ admin mới có quyền duyệt designer.",
      },
      { status: 403 },
    );
  }

  const payload = (await request.json()) as DesignerVerificationPayload;
  const action = String(payload.action ?? "").trim();

  if (!["approve", "reject", "review"].includes(action)) {
    return NextResponse.json(
      {
        message: "Action không hợp lệ.",
      },
      { status: 400 },
    );
  }

  const nextStatus =
    action === "approve"
      ? "approved"
      : action === "reject"
        ? "rejected"
        : "in_review";

  const adminSupabase = createSupabaseAdminClient() as any;

  const { data: designer, error: findError } = await adminSupabase
    .from("designer_profiles")
    .select("id, display_name, verification_status")
    .eq("id", designerId)
    .maybeSingle();

  if (findError) {
    return NextResponse.json(
      {
        message: findError.message,
      },
      { status: 500 },
    );
  }

  if (!designer) {
    return NextResponse.json(
      {
        message: "Không tìm thấy designer.",
      },
      { status: 404 },
    );
  }

  const { data: updatedDesigner, error: updateError } = await adminSupabase
    .from("designer_profiles")
    .update({
      verification_status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", designerId)
    .select("id, display_name, verification_status")
    .single();

  if (updateError) {
    return NextResponse.json(
      {
        message: updateError.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message:
      action === "approve"
        ? "Đã duyệt designer."
        : action === "reject"
          ? "Đã từ chối designer."
          : "Đã chuyển designer sang trạng thái đang duyệt.",
    designer: updatedDesigner,
  });
}