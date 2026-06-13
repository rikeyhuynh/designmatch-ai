import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";

import { StatusPill } from "@/components/common/status-pill";
import { SurfaceCard } from "@/components/common/surface-card";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/guards";
import { getCategoryLabel } from "@/lib/domain/labels";
import { formatDateVi } from "@/lib/format";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AdminReviewRow = {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;
  designer_profiles: {
    id: string;
    display_name: string;
    headline: string | null;
    rating: number;
    completed_jobs: number;
  } | null;
  jobs: {
    id: string;
    title: string;
    status: string;
    completed_at: string | null;
    design_requests: {
      id: string;
      title: string;
      business_name: string;
      category: string;
    } | null;
  } | null;
};

type DesignerQualityRow = {
  id: string;
  display_name: string;
  headline: string | null;
  rating: number;
  completed_jobs: number;
};

export default async function AdminReviewsPage() {
  const authState = await requireRole(["admin"]);
  const profile = authState.profile;

  if (!profile) {
    redirect("/auth-check");
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  const { data: reviewData, error: reviewError } = await adminSupabase
    .from("job_reviews")
    .select(
      `
      id,
      rating,
      comment,
      created_at,
      updated_at,
      designer_profiles (
        id,
        display_name,
        headline,
        rating,
        completed_jobs
      ),
      jobs (
        id,
        title,
        status,
        completed_at,
        design_requests (
          id,
          title,
          business_name,
          category
        )
      )
    `,
    )
    .order("created_at", { ascending: false });

  const { data: designerData, error: designerError } = await adminSupabase
    .from("designer_profiles")
    .select("id, display_name, headline, rating, completed_jobs")
    .order("rating", { ascending: false });

  const reviews = (reviewData ?? []) as unknown as AdminReviewRow[];
  const designers = (designerData ?? []) as unknown as DesignerQualityRow[];

  const totalReviews = reviews.length;

  const averageRating =
    totalReviews > 0
      ? Math.round(
          (reviews.reduce((total, review) => total + review.rating, 0) /
            totalReviews) *
            10,
        ) / 10
      : 0;

  const fiveStarReviews = reviews.filter((review) => review.rating === 5).length;
  const lowRatingReviews = reviews.filter((review) => review.rating <= 3).length;

  const reviewedDesignerIds = new Set(
    reviews
      .map((review) => review.designer_profiles?.id)
      .filter((designerId): designerId is string => Boolean(designerId)),
  );

  const topDesigners = designers.slice(0, 6);
  const latestReviews = reviews.slice(0, 8);

  return (
    <DashboardShell
      role="admin"
      title="Review Quality"
      description="Theo dõi chất lượng designer, review customer và tín hiệu vận hành marketplace."
      userName={profile.full_name}
      userEmail={authState.userEmail}
    >
      {reviewError ? (
        <SurfaceCard className="mb-5 border-red-200 bg-red-50 p-6">
          <p className="text-sm font-semibold leading-7 text-red-600">
            {reviewError.message}
          </p>
        </SurfaceCard>
      ) : null}

      {designerError ? (
        <SurfaceCard className="mb-5 border-red-200 bg-red-50 p-6">
          <p className="text-sm font-semibold leading-7 text-red-600">
            {designerError.message}
          </p>
        </SurfaceCard>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Marketplace rating"
          value={`${averageRating.toFixed(1)}/5`}
          description="Điểm trung bình toàn hệ thống"
          icon={<Star className="size-5 fill-current" />}
          tone="dark"
        />

        <MetricCard
          label="Total reviews"
          value={`${totalReviews}`}
          description="Tổng đánh giá đã ghi nhận"
          icon={<MessageSquareText className="size-5" />}
        />

        <MetricCard
          label="5-star reviews"
          value={`${fiveStarReviews}`}
          description="Review chất lượng cao"
          icon={<CheckCircle2 className="size-5" />}
        />

        <MetricCard
          label="Needs check"
          value={`${lowRatingReviews}`}
          description="Review từ 3 sao trở xuống"
          icon={<TriangleAlert className="size-5" />}
          tone={lowRatingReviews > 0 ? "warning" : "normal"}
        />
      </section>

      <section className="mt-5">
        <SurfaceCard className="p-6">
          <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr] xl:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Admin quality signal
              </p>

              <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.055em] text-[#061a3a]">
                Tổng quan chất lượng marketplace
              </h2>

              <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-slate-600">
                Review giúp admin nhận biết designer nổi bật, designer cần hỗ
                trợ, và các job có trải nghiệm chưa tốt để can thiệp kịp thời.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <SignalBox
                icon={<ShieldCheck className="size-4" />}
                label="Review coverage"
                value={
                  totalReviews > 0
                    ? "Đã có dữ liệu customer review"
                    : "Chưa có review nào"
                }
              />

              <SignalBox
                icon={<Sparkles className="size-4" />}
                label="Designers reviewed"
                value={`${reviewedDesignerIds.size} designer`}
              />

              <SignalBox
                icon={<TriangleAlert className="size-4" />}
                label="Quality risk"
                value={
                  lowRatingReviews > 0
                    ? `${lowRatingReviews} review cần kiểm tra`
                    : "Chưa có tín hiệu rủi ro"
                }
              />
            </div>
          </div>
        </SurfaceCard>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
        <SurfaceCard className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Designer quality
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Xếp hạng designer
              </h2>

              <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                Theo rating hiện tại và số job đã hoàn thành.
              </p>
            </div>

            <StatusPill tone="info">{`${designers.length} designers`}</StatusPill>
          </div>

          {topDesigners.length === 0 ? (
            <EmptyState
              title="Chưa có designer."
              description="Sau khi seed hoặc duyệt designer, danh sách sẽ hiển thị tại đây."
            />
          ) : (
            <div className="mt-6 grid gap-3">
              {topDesigners.map((designer, index) => (
                <DesignerQualityCard
                  key={designer.id}
                  designer={designer}
                  rank={index + 1}
                />
              ))}
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Latest reviews
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Review mới nhất
              </h2>

              <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                Các nhận xét mới nhất từ customer sau khi job hoàn thành.
              </p>
            </div>

            <StatusPill tone="info">{`${totalReviews} reviews`}</StatusPill>
          </div>

          {latestReviews.length === 0 ? (
            <EmptyState
              title="Chưa có review nào."
              description="Khi customer đánh giá designer sau job hoàn thành, review sẽ hiển thị tại đây."
            />
          ) : (
            <div className="mt-6 grid gap-4">
              {latestReviews.map((review) => (
                <AdminReviewCard key={review.id} review={review} />
              ))}
            </div>
          )}
        </SurfaceCard>
      </section>
    </DashboardShell>
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
  tone?: "normal" | "dark" | "warning";
}) {
  const cardClass =
    tone === "dark"
      ? "border-[#061a3a] bg-[#061a3a] text-white shadow-[0_18px_50px_rgba(6,26,58,0.22)]"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-[#061a3a]"
        : "border-blue-100 bg-white text-[#061a3a]";

  const iconClass =
    tone === "dark"
      ? "bg-white/10 text-amber-200 ring-white/10"
      : tone === "warning"
        ? "bg-white text-amber-700 ring-amber-200"
        : "bg-blue-50 text-blue-700 ring-blue-100";

  const subTextClass = tone === "dark" ? "text-white/68" : "text-slate-500";
  const labelClass = tone === "dark" ? "text-sky-200/75" : "text-blue-600";

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

      <p className={`mt-3 text-sm font-medium leading-6 ${subTextClass}`}>
        {description}
      </p>
    </div>
  );
}

function SignalBox({
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

      <p className="mt-2 text-sm font-extrabold leading-6 text-[#061a3a]">
        {value}
      </p>
    </div>
  );
}

function DesignerQualityCard({
  designer,
  rank,
}: {
  designer: DesignerQualityRow;
  rank: number;
}) {
  return (
    <div className="rounded-[1.15rem] border border-blue-100 bg-blue-50/65 p-4 transition hover:bg-blue-50">
      <div className="flex items-start gap-4">
        <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white text-sm font-black text-blue-700 ring-1 ring-blue-100">
          #{rank}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <RatingPill rating={designer.rating ?? 0} />

            <StatusPill tone="neutral">
              {`${designer.completed_jobs ?? 0} completed`}
            </StatusPill>
          </div>

          <h3 className="mt-3 text-lg font-extrabold tracking-[-0.035em] text-[#061a3a]">
            {designer.display_name}
          </h3>

          <p className="mt-1 line-clamp-2 text-sm font-bold leading-6 text-blue-700">
            {designer.headline ?? "Designer"}
          </p>
        </div>
      </div>
    </div>
  );
}

function AdminReviewCard({ review }: { review: AdminReviewRow }) {
  const job = review.jobs;
  const request = job?.design_requests;
  const designer = review.designer_profiles;

  return (
    <div className="rounded-[1.25rem] border border-blue-100 bg-blue-50/65 p-5 transition hover:bg-blue-50">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <RatingPill rating={review.rating} />

            {request ? (
              <StatusPill tone="neutral">
                {getCategoryLabel(
                  request.category as Parameters<typeof getCategoryLabel>[0],
                )}
              </StatusPill>
            ) : null}

            {review.rating <= 3 ? (
              <StatusPill tone="warning">Cần kiểm tra</StatusPill>
            ) : null}
          </div>

          <h3 className="mt-4 text-xl font-extrabold tracking-[-0.04em] text-[#061a3a]">
            {job?.title ?? "Job không xác định"}
          </h3>

          <p className="mt-2 text-sm font-bold text-blue-700">
            Designer: {designer?.display_name ?? "Không rõ designer"}
          </p>
        </div>

        <Button
          asChild
          variant="outline"
          className="w-fit shrink-0 rounded-full border-blue-200 bg-white font-extrabold"
        >
          <Link href="/admin/jobs">
            Mở Jobs
            <ArrowRight className="ml-2 size-4" />
          </Link>
        </Button>
      </div>

      <div className="mt-4 rounded-[1.1rem] border border-blue-100 bg-white p-4">
        <p className="text-sm font-medium leading-7 text-slate-700">
          {review.comment}
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <MiniInfo
          icon={<CalendarDays className="size-4" />}
          label="Reviewed"
          value={formatDateVi(review.created_at)}
        />

        <MiniInfo
          icon={<Store className="size-4" />}
          label="Business"
          value={request?.business_name ?? "N/A"}
        />

        <MiniInfo
          icon={<BriefcaseBusiness className="size-4" />}
          label="Status"
          value={job?.status ?? "N/A"}
        />
      </div>
    </div>
  );
}

function RatingPill({ rating }: { rating: number }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-amber-700">
      <Star className="size-3.5 fill-current" />
      {rating}/5
    </div>
  );
}

function MiniInfo({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-white/80 p-3">
      <div className="flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.16em] text-blue-600">
        {icon}
        {label}
      </div>

      <p className="mt-2 break-words text-sm font-extrabold leading-6 text-[#061a3a]">
        {value}
      </p>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mt-6 grid place-items-center rounded-[1.25rem] border border-blue-100 bg-blue-50/65 p-8 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-white text-blue-700 ring-1 ring-blue-100">
        <MessageSquareText className="size-6" />
      </div>

      <h3 className="mt-5 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
        {title}
      </h3>

      <p className="mt-3 max-w-xl text-sm font-medium leading-7 text-slate-600">
        {description}
      </p>
    </div>
  );
}