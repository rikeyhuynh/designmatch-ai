import { NextResponse } from "next/server";

import { getCurrentAuthState } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<Record<string, string>>;
};

type CreateReviewBody = {
  rating?: number;
  comment?: string;
};

type JobForReview = {
  id: string;
  customer_id: string;
  designer_id: string;
  status: string;
};

type ExistingReviewRow = {
  id: string;
};

type ReviewRatingRow = {
  rating: number;
};

export async function POST(request: Request, context: RouteContext) {
  const routeParams = await context.params;
  const jobId = routeParams.jobId ?? routeParams.jobID;

  if (!jobId) {
    return NextResponse.json(
      {
        message: "Thiếu job ID.",
      },
      { status: 400 },
    );
  }

  const authState = await getCurrentAuthState();

  if (!authState.isAuthenticated || !authState.profile) {
    return NextResponse.json(
      {
        message: "Bạn cần đăng nhập bằng tài khoản customer.",
      },
      { status: 401 },
    );
  }

  if (authState.profile.role !== "customer" || !authState.customerProfile) {
    return NextResponse.json(
      {
        message: "Chỉ customer mới có thể đánh giá designer.",
      },
      { status: 403 },
    );
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  const { data: jobData, error: jobError } = await adminSupabase
    .from("jobs")
    .select("id, customer_id, designer_id, status")
    .eq("id", jobId)
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
        message: "Không tìm thấy job.",
      },
      { status: 404 },
    );
  }

  const job = jobData as JobForReview;

  if (job.customer_id !== authState.customerProfile.id) {
    return NextResponse.json(
      {
        message: "Job này không thuộc customer đang đăng nhập.",
      },
      { status: 403 },
    );
  }

  if (job.status !== "completed") {
    return NextResponse.json(
      {
        message: "Chỉ có thể đánh giá designer sau khi job đã hoàn thành.",
      },
      { status: 400 },
    );
  }

  const { data: existingReviewData, error: existingReviewError } =
    await adminSupabase
      .from("job_reviews")
      .select("id")
      .eq("job_id", job.id)
      .maybeSingle();

  if (existingReviewError) {
    return NextResponse.json(
      {
        message: existingReviewError.message,
      },
      { status: 500 },
    );
  }

  const existingReview = existingReviewData as ExistingReviewRow | null;

  if (existingReview) {
    return NextResponse.json(
      {
        message:
          "Job này đã được đánh giá rồi. Mỗi job chỉ được đánh giá một lần.",
      },
      { status: 409 },
    );
  }

  const body = (await request.json().catch(() => null)) as CreateReviewBody | null;

  const rating = Number(body?.rating);
  const comment = String(body?.comment ?? "").trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(
      {
        message: "Rating phải là số nguyên từ 1 đến 5.",
      },
      { status: 400 },
    );
  }

  if (comment.length < 10) {
    return NextResponse.json(
      {
        message: "Nhận xét cần ít nhất 10 ký tự.",
      },
      { status: 400 },
    );
  }

  const { error: insertError } = await adminSupabase.from("job_reviews").insert({
    job_id: job.id,
    customer_id: authState.customerProfile.id,
    designer_id: job.designer_id,
    rating,
    comment,
  });

  if (insertError) {
    return NextResponse.json(
      {
        message: insertError.message,
      },
      { status: 500 },
    );
  }

  const { data: reviewRatingsData, error: reviewRatingsError } =
    await adminSupabase
      .from("job_reviews")
      .select("rating")
      .eq("designer_id", job.designer_id);

  if (reviewRatingsError) {
    return NextResponse.json(
      {
        message: reviewRatingsError.message,
      },
      { status: 500 },
    );
  }

  const reviewRatings = (reviewRatingsData ?? []) as ReviewRatingRow[];

  if (reviewRatings.length > 0) {
    const totalRating = reviewRatings.reduce(
      (total, review) => total + Number(review.rating ?? 0),
      0,
    );

    const averageRating =
      Math.round((totalRating / reviewRatings.length) * 10) / 10;

    await adminSupabase
      .from("designer_profiles")
      .update({
        rating: averageRating,
      })
      .eq("id", job.designer_id);
  }

  return NextResponse.json({
    message: "Đã lưu đánh giá và cập nhật rating của designer.",
  });
}