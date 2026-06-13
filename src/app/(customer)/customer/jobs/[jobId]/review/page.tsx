import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  MessageSquareText,
  Star,
  Store,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";

import { StatusPill } from "@/components/common/status-pill";
import { SurfaceCard } from "@/components/common/surface-card";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { CreateJobReviewForm } from "@/features/customer/jobs/components/create-job-review-form";
import { requireRole } from "@/lib/auth/guards";
import {
  getCategoryLabel,
  getIndustryLabel,
  getJobStatusMeta,
} from "@/lib/domain/labels";
import { formatCurrencyVnd, formatDateVi } from "@/lib/format";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type CustomerJobReviewPageProps = {
  params: Promise<{
    jobId: string;
  }>;
};

type JobReviewDetailRow = {
  id: string;
  title: string;
  status: string;
  agreed_price_vnd: number;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
  designer_profiles: {
    id: string;
    display_name: string;
    headline: string | null;
    rating: number;
    completed_jobs: number;
  } | null;
  design_requests: {
    id: string;
    title: string;
    business_name: string;
    industry: string;
    category: string;
  } | null;
};

type ExistingReviewRow = {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;
};

export default async function CustomerJobReviewPage({
  params,
}: CustomerJobReviewPageProps) {
  const { jobId } = await params;

  const authState = await requireRole(["customer"]);
  const profile = authState.profile;
  const customerProfile = authState.customerProfile;

  if (!profile || !customerProfile) {
    redirect("/auth-check");
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  const { data: jobData, error: jobError } = await adminSupabase
    .from("jobs")
    .select(
      `
      id,
      title,
      status,
      agreed_price_vnd,
      due_at,
      completed_at,
      created_at,
      designer_profiles (
        id,
        display_name,
        headline,
        rating,
        completed_jobs
      ),
      design_requests (
        id,
        title,
        business_name,
        industry,
        category
      )
    `,
    )
    .eq("id", jobId)
    .eq("customer_id", customerProfile.id)
    .maybeSingle();

  if (jobError || !jobData) {
    notFound();
  }

  const job = jobData as unknown as JobReviewDetailRow;
  const designer = job.designer_profiles;
  const request = job.design_requests;

  const { data: reviewData } = await adminSupabase
    .from("job_reviews")
    .select("id, rating, comment, created_at, updated_at")
    .eq("job_id", job.id)
    .eq("customer_id", customerProfile.id)
    .maybeSingle();

  const existingReview = reviewData as ExistingReviewRow | null;

  const isCompleted = job.status === "completed";

  const jobStatus =
    job.status === "completed"
      ? ({ label: "Hoàn thành", tone: "success" } as const)
      : getJobStatusMeta(job.status as Parameters<typeof getJobStatusMeta>[0]);

  return (
    <DashboardShell
      role="customer"
      title="Đánh giá designer"
      description="Gửi đánh giá sau khi job đã hoàn thành để cải thiện chất lượng matching."
      userName={profile.full_name}
      userEmail={authState.userEmail}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Button
          asChild
          variant="outline"
          className="rounded-full border-blue-200 bg-white font-extrabold"
        >
          <Link href={`/customer/jobs/${job.id}`}>
            <ArrowLeft className="mr-2 size-4" />
            Quay lại job
          </Link>
        </Button>

        <div className="flex flex-wrap gap-2">
          <StatusPill tone={jobStatus.tone}>{jobStatus.label}</StatusPill>

          {existingReview ? (
            <StatusPill tone="success">Đã đánh giá</StatusPill>
          ) : (
            <StatusPill tone="warning">Chưa đánh giá</StatusPill>
          )}
        </div>
      </div>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-5">
          <SurfaceCard className="p-6">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
              Job summary
            </p>

            <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.055em] text-[#061a3a]">
              {job.title}
            </h1>

            <p className="mt-2 text-sm font-bold text-blue-700">
              {request?.business_name ?? "Chưa rõ thương hiệu"}
            </p>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <InfoBox
                icon={<CircleDollarSign className="size-4" />}
                label="Agreed price"
                value={formatCurrencyVnd(job.agreed_price_vnd)}
              />

              <InfoBox
                icon={<CalendarDays className="size-4" />}
                label="Completed at"
                value={
                  job.completed_at
                    ? formatDateVi(job.completed_at)
                    : "Chưa có thời gian"
                }
              />

              <InfoBox
                icon={<BriefcaseBusiness className="size-4" />}
                label="Request"
                value={request?.title ?? "N/A"}
              />

              <InfoBox
                icon={<Store className="size-4" />}
                label="Industry"
                value={
                  request
                    ? getIndustryLabel(
                        request.industry as Parameters<
                          typeof getIndustryLabel
                        >[0],
                      )
                    : "N/A"
                }
              />
            </div>

            {request ? (
              <div className="mt-5 flex flex-wrap gap-2">
                <StatusPill tone="neutral">
                  {getCategoryLabel(
                    request.category as Parameters<typeof getCategoryLabel>[0],
                  )}
                </StatusPill>
              </div>
            ) : null}
          </SurfaceCard>

          <SurfaceCard className="p-6">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
              Designer
            </p>

            <div className="mt-4 flex items-start gap-4">
              <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#061a3a] text-white">
                <UserRound className="size-6" />
              </div>

              <div>
                <h2 className="text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                  {designer?.display_name ?? "Chưa rõ designer"}
                </h2>

                <p className="mt-2 text-sm font-bold text-blue-700">
                  {designer?.headline ?? "Designer"}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <InfoBox
                icon={<Star className="size-4" />}
                label="Current rating"
                value={designer ? designer.rating.toString() : "N/A"}
              />

              <InfoBox
                icon={<CheckCircle2 className="size-4" />}
                label="Completed jobs"
                value={designer ? `${designer.completed_jobs} jobs` : "N/A"}
              />
            </div>
          </SurfaceCard>
        </div>

        <SurfaceCard className="p-6">
          <div className="flex items-start gap-4">
            <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-700 ring-1 ring-amber-200">
              <Star className="size-6 fill-current" />
            </div>

            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Review form
              </p>

              <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.055em] text-[#061a3a]">
                Đánh giá trải nghiệm làm việc
              </h2>

              <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                Đánh giá này giúp hệ thống xếp hạng designer và cải thiện chất
                lượng matching cho các job sau.
              </p>
            </div>
          </div>

          {!isCompleted ? (
            <div className="mt-6 rounded-[1.25rem] border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-start gap-3">
                <MessageSquareText className="mt-1 size-5 shrink-0 text-amber-700" />

                <div>
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-700">
                    Chưa thể đánh giá
                  </p>

                  <p className="mt-2 text-sm font-medium leading-7 text-amber-950">
                    Customer chỉ có thể đánh giá designer sau khi job đã được
                    duyệt hoàn thành.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6">
              <CreateJobReviewForm
                jobId={job.id}
                initialRating={existingReview?.rating ?? 5}
                initialComment={existingReview?.comment ?? ""}
              />
            </div>
          )}

          {existingReview ? (
            <div className="mt-6 rounded-[1.25rem] border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
                Review đã lưu
              </p>

              <p className="mt-2 text-sm font-medium leading-7 text-emerald-950">
                Bạn đã đánh giá {existingReview.rating}/5 sao. Bạn vẫn có thể
                chỉnh lại nội dung và lưu lại nếu cần.
              </p>
            </div>
          ) : null}
        </SurfaceCard>
      </section>
    </DashboardShell>
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