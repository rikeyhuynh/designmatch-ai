import { NextResponse } from "next/server";

import { getCurrentAuthState } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<Record<string, string>>;
};

type PaymentRow = {
  id: string;
  job_id: string;
  status: string;
};

type JobRow = {
  id: string;
  status: string;
  started_at: string | null;
};

export async function POST(_request: Request, context: RouteContext) {
  const routeParams = await context.params;
  const paymentId = routeParams.paymentId ?? routeParams.paymentID;

  if (!paymentId) {
    return NextResponse.json(
      {
        message: "Thiếu payment ID.",
      },
      { status: 400 },
    );
  }

  const authState = await getCurrentAuthState();

  if (!authState.isAuthenticated || !authState.profile) {
    return NextResponse.json(
      {
        message: "Bạn cần đăng nhập bằng tài khoản admin.",
      },
      { status: 401 },
    );
  }

  if (authState.profile.role !== "admin") {
    return NextResponse.json(
      {
        message: "Bạn không có quyền xác nhận thanh toán.",
      },
      { status: 403 },
    );
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  const { data: paymentData, error: paymentError } = await adminSupabase
    .from("payments")
    .select("id, job_id, status")
    .eq("id", paymentId)
    .maybeSingle();

  if (paymentError) {
    return NextResponse.json(
      {
        message: paymentError.message,
      },
      { status: 500 },
    );
  }

  if (!paymentData) {
    return NextResponse.json(
      {
        message: "Không tìm thấy payment.",
      },
      { status: 404 },
    );
  }

  const payment = paymentData as PaymentRow;

  const { data: jobData, error: jobError } = await adminSupabase
    .from("jobs")
    .select("id, status, started_at")
    .eq("id", payment.job_id)
    .maybeSingle();

  if (jobError) {
    return NextResponse.json(
      {
        message: jobError.message,
      },
      { status: 500 },
    );
  }

  if (!jobData) {
    return NextResponse.json(
      {
        message: "Không tìm thấy job liên kết với payment này.",
      },
      { status: 404 },
    );
  }

  const job = jobData as JobRow;

  if (["confirmed", "paid", "completed"].includes(payment.status)) {
    if (job.status !== "active" && job.status !== "completed") {
      const now = new Date().toISOString();

      const { error: jobRepairError } = await adminSupabase
        .from("jobs")
        .update({
          status: "active",
          started_at: job.started_at ?? now,
        })
        .eq("id", job.id);

      if (jobRepairError) {
        return NextResponse.json(
          {
            message: jobRepairError.message,
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      message: "Payment này đã được xác nhận trước đó.",
      paymentId: payment.id,
      jobId: job.id,
    });
  }

  if (payment.status === "rejected") {
    return NextResponse.json(
      {
        message:
          "Payment này đã bị từ chối trước đó. Hãy tạo payment mới nếu customer cần thanh toán lại.",
      },
      { status: 400 },
    );
  }

  if (job.status === "cancelled") {
    return NextResponse.json(
      {
        message: "Job đã bị hủy nên không thể xác nhận payment.",
      },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();

  const { error: updatePaymentError } = await adminSupabase
    .from("payments")
    .update({
      status: "confirmed",
      confirmed_at: now,
      reviewed_at: now,
      reviewed_by: authState.profile.id,
      admin_note: "Admin confirmed manual bank transfer.",
    })
    .eq("id", payment.id);

  if (updatePaymentError) {
    return NextResponse.json(
      {
        message: updatePaymentError.message,
      },
      { status: 500 },
    );
  }

  const { error: updateJobError } = await adminSupabase
    .from("jobs")
    .update({
      status: "active",
      started_at: job.started_at ?? now,
    })
    .eq("id", payment.job_id);

  if (updateJobError) {
    return NextResponse.json(
      {
        message: updateJobError.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: "Đã xác nhận thanh toán và kích hoạt job.",
    paymentId: payment.id,
    jobId: payment.job_id,
  });
}