import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  ImageIcon,
  MessageSquareText,
  Palette,
  SendHorizonal,
  Sparkles,
  Star,
  TriangleAlert,
  UploadCloud,
} from "lucide-react";
import type { ReactNode } from "react";

import { StatusPill } from "@/components/common/status-pill";
import { SurfaceCard } from "@/components/common/surface-card";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/guards";
import { getCategoryLabel } from "@/lib/domain/labels";
import { formatCurrencyVnd, formatDateVi } from "@/lib/format";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type DesignerStatsRow = {
  id: string;
  display_name: string;
  headline: string | null;
  rating: number;
  completed_jobs: number;
  response_time_hours: number;
  availability: string | null;
  verification_status: string | null;
  minimum_project_budget_vnd: number | null;
};

type PaymentRow = {
  id: string;
  status: string;
  designer_revenue_vnd: number | null;
  confirmed_at: string | null;
  created_at: string;
};

type JobRow = {
  id: string;
  title: string;
  status: string;
  designer_revenue_vnd: number | null;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
  design_requests: {
    id: string;
    title: string;
    business_name: string;
    category: string;
  } | null;
  payments: PaymentRow[] | PaymentRow | null;
};

type JobUpdateRow = {
  id: string;
  job_id: string;
  update_type: string;
  title: string;
  message: string;
  attachment_url: string | null;
  created_at: string;
  jobs: {
    id: string;
    title: string;
    design_requests: {
      business_name: string;
      category: string;
    } | null;
  } | null;
};

type FeedbackRow = {
  id: string;
  job_id: string;
  update_id: string;
  message: string;
  created_at: string;
};

type ReviewRow = {
  id: string;
  job_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  jobs: {
    id: string;
    title: string;
    design_requests: {
      business_name: string;
      category: string;
    } | null;
  } | null;
};

type PortfolioRow = {
  id: string;
  designer_id: string;
  title: string;
  category: string;
  industry: string | null;
  image_url: string | null;
  ai_analysis_status: string | null;
  ai_visual_summary: string | null;
  ai_style_tags: string[] | null;
  ai_industry_tags: string[] | null;
  ai_category_tags: string[] | null;
  ai_confidence_score: number | null;
  created_at: string;
};

type DesignerStyleDnaRow = {
  designer_id: string | null;
  analyzed_portfolio_count: number | null;
  style_tags: string[] | null;
  industry_tags: string[] | null;
  category_tags: string[] | null;
  visual_strengths: string[] | null;
  common_moods: string[] | null;
  color_preferences: string[] | null;
  typography_preferences: string[] | null;
  layout_preferences: string[] | null;
  dna_summary: string | null;
  confidence_score: number | null;
  last_analyzed_at: string | null;
};

export default async function DesignerDashboardPage() {
  const authState = await requireRole(["designer"]);
  const profile = authState.profile;
  const designerProfile = authState.designerProfile;

  if (!profile || !designerProfile) {
    redirect("/auth-check");
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  const [
    designerResult,
    jobsResult,
    updatesResult,
    reviewsResult,
    portfolioResult,
    styleDnaResult,
  ] = await Promise.all([
    adminSupabase
      .from("designer_profiles")
      .select(
        `
        id,
        display_name,
        headline,
        rating,
        completed_jobs,
        response_time_hours,
        availability,
        verification_status,
        minimum_project_budget_vnd
      `,
      )
      .eq("id", designerProfile.id)
      .maybeSingle(),

    adminSupabase
      .from("jobs")
      .select(
        `
        id,
        title,
        status,
        designer_revenue_vnd,
        due_at,
        completed_at,
        created_at,
        design_requests (
          id,
          title,
          business_name,
          category
        ),
        payments (
          id,
          status,
          designer_revenue_vnd,
          confirmed_at,
          created_at
        )
      `,
      )
      .eq("designer_id", designerProfile.id)
      .order("created_at", { ascending: false }),

    adminSupabase
      .from("job_updates")
      .select(
        `
        id,
        job_id,
        update_type,
        title,
        message,
        attachment_url,
        created_at,
        jobs (
          id,
          title,
          design_requests (
            business_name,
            category
          )
        )
      `,
      )
      .eq("designer_id", designerProfile.id)
      .order("created_at", { ascending: false }),

    adminSupabase
      .from("job_reviews")
      .select(
        `
        id,
        job_id,
        rating,
        comment,
        created_at,
        jobs (
          id,
          title,
          design_requests (
            business_name,
            category
          )
        )
      `,
      )
      .eq("designer_id", designerProfile.id)
      .order("created_at", { ascending: false }),

    adminSupabase
      .from("portfolio_items")
      .select(
        `
        id,
        designer_id,
        title,
        category,
        industry,
        image_url,
        ai_analysis_status,
        ai_visual_summary,
        ai_style_tags,
        ai_industry_tags,
        ai_category_tags,
        ai_confidence_score,
        created_at
      `,
      )
      .eq("designer_id", designerProfile.id)
      .order("created_at", { ascending: false }),

    adminSupabase
      .from("designer_style_dna")
      .select(
        `
        designer_id,
        analyzed_portfolio_count,
        style_tags,
        industry_tags,
        category_tags,
        visual_strengths,
        common_moods,
        color_preferences,
        typography_preferences,
        layout_preferences,
        dna_summary,
        confidence_score,
        last_analyzed_at
      `,
      )
      .eq("designer_id", designerProfile.id)
      .maybeSingle(),
  ]);

  const designerStats = designerResult.data as DesignerStatsRow | null;
  const jobs = (jobsResult.data ?? []) as unknown as JobRow[];
  const updates = (updatesResult.data ?? []) as unknown as JobUpdateRow[];
  const reviews = (reviewsResult.data ?? []) as unknown as ReviewRow[];
  const portfolioItems = (portfolioResult.data ?? []) as unknown as PortfolioRow[];
  const styleDna = styleDnaResult.data as DesignerStyleDnaRow | null;

  const jobIds = jobs.map((job) => job.id);

  const feedbacksResult =
    jobIds.length > 0
      ? await adminSupabase
          .from("job_update_feedbacks")
          .select("id, job_id, update_id, message, created_at")
          .in("job_id", jobIds)
          .order("created_at", { ascending: false })
      : { data: [], error: null };

  const feedbacks = (feedbacksResult.data ?? []) as unknown as FeedbackRow[];

  const activeJobs = jobs.filter((job) => job.status === "active").length;
  const completedJobs = jobs.filter((job) => job.status === "completed").length;

  const paymentPendingJobs = jobs.filter((job) => {
    const payment = getPrimaryPayment(job.payments);

    return (
      job.status === "payment_pending" ||
      !payment ||
      ["waiting_transfer", "waiting_admin_confirm", "rejected"].includes(
        payment.status,
      )
    );
  }).length;

  const confirmedIncome = jobs.reduce((total, job) => {
    const payment = getPrimaryPayment(job.payments);

    if (!payment) return total;

    if (payment.status === "confirmed") {
      return (
        total +
        Number(payment.designer_revenue_vnd ?? job.designer_revenue_vnd ?? 0)
      );
    }

    return total;
  }, 0);

  const pendingIncome = jobs.reduce((total, job) => {
    const payment = getPrimaryPayment(job.payments);

    if (!payment) return total;

    if (payment.status !== "confirmed") {
      return (
        total +
        Number(payment.designer_revenue_vnd ?? job.designer_revenue_vnd ?? 0)
      );
    }

    return total;
  }, 0);

  const averageReviewRating =
    reviews.length > 0
      ? Math.round(
          (reviews.reduce((total, review) => total + review.rating, 0) /
            reviews.length) *
            10,
        ) / 10
      : designerStats?.rating ?? 0;

  const portfolioCount = portfolioItems.length;
  const analyzedPortfolioCount = portfolioItems.filter(
    (item) => item.ai_analysis_status === "completed",
  ).length;

  const finalUpdateCount = updates.filter(
    (update) => update.update_type === "final",
  ).length;

  const latestJobs = jobs.slice(0, 4);
  const latestUpdates = updates.slice(0, 4);
  const latestFeedbacks = feedbacks.slice(0, 4);
  const latestReviews = reviews.slice(0, 3);
  const latestPortfolio = portfolioItems.slice(0, 4);

  const designerDisplayName =
    designerStats?.display_name ?? designerProfile.display_name ?? "Designer";

  const designerHeadline =
    designerStats?.headline ?? designerProfile.headline ?? "Designer";

  const verification = getVerificationView(designerStats?.verification_status);
  const availability = getAvailabilityView(designerStats?.availability);

  const attentionItems = getAttentionItems({
    verificationStatus: designerStats?.verification_status,
    portfolioCount,
    analyzedPortfolioCount,
    paymentPendingJobs,
    activeJobs,
    feedbackCount: feedbacks.length,
  });

  return (
    <DashboardShell
      role="designer"
      title="Tổng quan"
      description="Theo dõi hồ sơ, portfolio, Style DNA, job, feedback, review và doanh thu của bạn."
      userName={profile.full_name}
      userEmail={authState.userEmail}
    >
      <ErrorPanel
        errors={[
          designerResult.error?.message,
          jobsResult.error?.message,
          updatesResult.error?.message,
          reviewsResult.error?.message,
          portfolioResult.error?.message,
          styleDnaResult.error?.message,
          feedbacksResult.error?.message,
        ]}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Active jobs"
          value={`${activeJobs}`}
          description="Job đang thực hiện"
          icon={<BriefcaseBusiness className="size-5" />}
          href="/designer/jobs"
          tone="dark"
        />

        <MetricCard
          label="Thu nhập đã xác nhận"
          value={formatCurrencyVnd(confirmedIncome)}
          description="Tổng tiền designer nhận từ payment confirmed"
          icon={<CircleDollarSign className="size-5" />}
          href="/designer/jobs"
          tone="success"
        />

        <MetricCard
          label="AI portfolio"
          value={`${analyzedPortfolioCount}/${portfolioCount}`}
          description="Portfolio đã được AI phân tích"
          icon={<Palette className="size-5" />}
          href="/designer/portfolio"
          tone={portfolioCount > 0 ? "normal" : "warning"}
        />

        <MetricCard
          label="Rating"
          value={`${averageReviewRating.toFixed(1)}/5`}
          description="Rating từ customer review"
          icon={<Star className="size-5 fill-current" />}
          href="/designer/reviews"
          tone="warning"
        />
      </section>

      <section className="mt-5">
        <SurfaceCard className="overflow-hidden p-0">
          <div className="bg-gradient-to-br from-[#061a3a] via-[#0b2a61] to-blue-700 p-6 text-white">
            <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr] xl:items-center">
              <div>
                <div className="flex flex-wrap gap-2">
                  <StatusPill tone={verification.tone}>
                    {verification.label}
                  </StatusPill>

                  <StatusPill tone={availability.tone}>
                    {availability.label}
                  </StatusPill>

                  <StatusPill tone="info">
                    {`${portfolioCount} portfolio`}
                  </StatusPill>
                </div>

                <p className="mt-5 text-sm font-black uppercase tracking-[0.22em] text-sky-200/75">
                  Designer workbench
                </p>

                <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.055em] text-white">
                  {designerDisplayName}
                </h2>

                <p className="mt-2 text-sm font-bold text-sky-100">
                  {designerHeadline}
                </p>

                <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-white/70">
                  Quản lý workflow của bạn: hồ sơ designer, portfolio, Style
                  DNA, job đang làm, feedback từ customer, bản final và thu nhập
                  designer sau khi payment được xác nhận.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button
                    asChild
                    className="rounded-full bg-white px-5 font-extrabold text-[#061a3a] hover:bg-sky-50"
                  >
                    <Link href="/designer/jobs">
                      Xem job đang làm
                      <ArrowRight className="ml-2 size-4" />
                    </Link>
                  </Button>

                  <Button
                    asChild
                    variant="outline"
                    className="rounded-full border-white/20 bg-white/10 font-extrabold text-white hover:bg-white/15"
                  >
                    <Link href="/designer/portfolio">
                      <UploadCloud className="mr-2 size-4" />
                      Upload portfolio
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <DarkSignalBox
                  icon={<CreditCard className="size-4" />}
                  label="Payment pending"
                  value={`${paymentPendingJobs} job`}
                />

                <DarkSignalBox
                  icon={<SendHorizonal className="size-4" />}
                  label="Updates sent"
                  value={`${updates.length} cập nhật`}
                />

                <DarkSignalBox
                  icon={<MessageSquareText className="size-4" />}
                  label="Feedback"
                  value={`${feedbacks.length} phản hồi`}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-6 md:grid-cols-2 xl:grid-cols-4">
            <SignalBox
              icon={<CheckCircle2 className="size-4" />}
              label="Completed"
              value={`${completedJobs} job hoàn thành`}
            />

            <SignalBox
              icon={<CircleDollarSign className="size-4" />}
              label="Thu nhập chờ xác nhận"
              value={formatCurrencyVnd(pendingIncome)}
              tone={pendingIncome > 0 ? "warning" : "normal"}
            />

            <SignalBox
              icon={<Sparkles className="size-4" />}
              label="Style DNA"
              value={
                styleDna
                  ? `${styleDna.confidence_score ?? 0}/100 confidence`
                  : "Chưa có DNA"
              }
              tone={!styleDna ? "warning" : "normal"}
            />

            <SignalBox
              icon={<SendHorizonal className="size-4" />}
              label="Final updates"
              value={`${finalUpdateCount} bản final`}
            />
          </div>
        </SurfaceCard>
      </section>

      {attentionItems.length > 0 ? (
        <section className="mt-5">
          <SurfaceCard className="border-amber-200 bg-amber-50 p-6">
            <div className="flex items-start gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-600 text-white">
                <TriangleAlert className="size-5" />
              </div>

              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-700">
                  Recommended actions
                </p>

                <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                  Việc nên xử lý trước
                </h2>

                <div className="mt-4 grid gap-2">
                  {attentionItems.map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-amber-200 bg-white/80 p-3 text-sm font-semibold leading-6 text-amber-950"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SurfaceCard>
        </section>
      ) : null}

      <section className="mt-5 grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <PortfolioDnaPanel
          styleDna={styleDna}
          portfolioCount={portfolioCount}
          analyzedPortfolioCount={analyzedPortfolioCount}
        />

        <SurfaceCard className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Latest portfolio
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Portfolio gần đây
              </h2>

              <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                Portfolio là dữ liệu chính để hệ thống phân tích Style DNA và
                matching đúng gu hơn.
              </p>
            </div>

            <Button
              asChild
              variant="outline"
              className="w-fit rounded-full border-blue-200 bg-white font-extrabold"
            >
              <Link href="/designer/portfolio">
                Quản lý portfolio
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>

          {latestPortfolio.length === 0 ? (
            <EmptyState
              title="Chưa có portfolio."
              description="Upload portfolio để AI phân tích phong cách và tăng khả năng được match."
              actionHref="/designer/portfolio"
              actionLabel="Upload portfolio"
            />
          ) : (
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {latestPortfolio.map((item) => (
                <PortfolioCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </SurfaceCard>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <SurfaceCard className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Latest jobs
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Job gần đây
              </h2>

              <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                Các job mới nhất được giao cho designer.
              </p>
            </div>

            <Button
              asChild
              variant="outline"
              className="w-fit rounded-full border-blue-200 bg-white font-extrabold"
            >
              <Link href="/designer/jobs">
                Xem tất cả
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>

          {latestJobs.length === 0 ? (
            <EmptyState
              title="Chưa có job nào."
              description="Khi customer chọn bạn cho một dự án, job sẽ xuất hiện tại đây."
              actionHref="/designer/jobs"
              actionLabel="Xem Jobs"
            />
          ) : (
            <div className="mt-6 grid gap-3">
              {latestJobs.map((job) => (
                <LatestJobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Customer feedback
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Phản hồi mới
              </h2>

              <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                Feedback customer gửi dưới các bản nháp hoặc ảnh tiến độ.
              </p>
            </div>

            <StatusPill tone={feedbacks.length > 0 ? "warning" : "info"}>
              {`${feedbacks.length} feedbacks`}
            </StatusPill>
          </div>

          {latestFeedbacks.length === 0 ? (
            <EmptyState
              title="Chưa có feedback nào."
              description="Khi customer phản hồi dưới update, feedback sẽ hiển thị tại đây."
            />
          ) : (
            <div className="mt-6 grid gap-3">
              {latestFeedbacks.map((feedback) => (
                <FeedbackCard
                  key={feedback.id}
                  feedback={feedback}
                  jobs={jobs}
                  updates={updates}
                />
              ))}
            </div>
          )}
        </SurfaceCard>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <SurfaceCard className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Recent updates
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Cập nhật bạn đã gửi
              </h2>

              <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                Các bản nháp, tiến độ hoặc bản hoàn thiện gần nhất.
              </p>
            </div>

            <StatusPill tone="info">{`${updates.length} updates`}</StatusPill>
          </div>

          {latestUpdates.length === 0 ? (
            <EmptyState
              title="Chưa gửi cập nhật nào."
              description="Vào trang job chi tiết để gửi ảnh tiến độ hoặc bản hoàn thiện."
              actionHref="/designer/jobs"
              actionLabel="Mở Jobs"
            />
          ) : (
            <div className="mt-6 grid gap-3">
              {latestUpdates.map((update) => (
                <RecentUpdateCard key={update.id} update={update} />
              ))}
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Recent reviews
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Đánh giá gần đây
              </h2>

              <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                Review customer gửi sau khi job hoàn thành.
              </p>
            </div>

            <Button
              asChild
              variant="outline"
              className="w-fit rounded-full border-blue-200 bg-white font-extrabold"
            >
              <Link href="/designer/reviews">
                Xem reviews
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>

          {latestReviews.length === 0 ? (
            <EmptyState
              title="Chưa có review nào."
              description="Sau khi customer duyệt hoàn thành và đánh giá, review sẽ hiển thị tại đây."
            />
          ) : (
            <div className="mt-6 grid gap-3">
              {latestReviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          )}
        </SurfaceCard>
      </section>
    </DashboardShell>
  );
}

function PortfolioDnaPanel({
  styleDna,
  portfolioCount,
  analyzedPortfolioCount,
}: {
  styleDna: DesignerStyleDnaRow | null;
  portfolioCount: number;
  analyzedPortfolioCount: number;
}) {
  return (
    <SurfaceCard variant="dark" className="p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-sky-200/70">
            AI Style DNA
          </p>

          <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-white">
            Hồ sơ phong cách của bạn
          </h2>

          <p className="mt-3 text-sm font-medium leading-7 text-white/65">
            Style DNA được tổng hợp từ portfolio đã được AI phân tích. Đây là dữ
            liệu quan trọng để match bạn với đúng brief.
          </p>
        </div>

        <StatusPill tone={styleDna ? "success" : "warning"}>
          {styleDna ? "DNA ready" : "Chưa có DNA"}
        </StatusPill>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <DarkMetric label="Portfolio" value={`${portfolioCount}`} />
        <DarkMetric label="AI analyzed" value={`${analyzedPortfolioCount}`} />
        <DarkMetric
          label="Confidence"
          value={`${styleDna?.confidence_score ?? 0}/100`}
        />
      </div>

      {styleDna?.dna_summary ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-200/60">
            DNA summary
          </p>

          <p className="mt-2 text-sm font-semibold leading-7 text-white">
            {styleDna.dna_summary}
          </p>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <DarkTagBlock title="Style tags" items={styleDna?.style_tags ?? []} />
        <DarkTagBlock title="Industries" items={styleDna?.industry_tags ?? []} />
        <DarkTagBlock title="Strengths" items={styleDna?.visual_strengths ?? []} />
        <DarkTagBlock title="Moods" items={styleDna?.common_moods ?? []} />
        <DarkTagBlock
          title="Colors"
          items={styleDna?.color_preferences ?? []}
        />
        <DarkTagBlock
          title="Typography"
          items={styleDna?.typography_preferences ?? []}
        />
      </div>

      {styleDna?.last_analyzed_at ? (
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-sky-100/55">
          {`Last analyzed ${formatDateVi(styleDna.last_analyzed_at)}`}
        </p>
      ) : null}
    </SurfaceCard>
  );
}

function PortfolioCard({ item }: { item: PortfolioRow }) {
  const aiStatus = getAiStatusView(item.ai_analysis_status);

  return (
    <div className="overflow-hidden rounded-[1.15rem] border border-blue-100 bg-blue-50/65">
      <div className="grid aspect-[4/3] place-items-center bg-white">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt={item.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <ImageIcon className="size-9 text-blue-700" />
        )}
      </div>

      <div className="p-4">
        <div className="flex flex-wrap gap-2">
          <StatusPill tone="neutral">
            {getSafeCategoryLabel(item.category)}
          </StatusPill>

          <StatusPill tone={aiStatus.tone}>{aiStatus.label}</StatusPill>
        </div>

        <h3 className="mt-3 text-base font-extrabold tracking-[-0.03em] text-[#061a3a]">
          {item.title}
        </h3>

        {item.ai_visual_summary ? (
          <p className="mt-2 line-clamp-3 text-sm font-medium leading-6 text-slate-600">
            {item.ai_visual_summary}
          </p>
        ) : null}

        {item.ai_style_tags && item.ai_style_tags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {item.ai_style_tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white px-2 py-1 text-[0.65rem] font-bold text-blue-700 ring-1 ring-blue-100"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LatestJobCard({ job }: { job: JobRow }) {
  const jobStatus = getSafeJobStatus(job.status);
  const payment = getPrimaryPayment(job.payments);
  const paymentStatus = getSafePaymentStatus(payment?.status ?? null);

  const designerRevenue = Number(
    payment?.designer_revenue_vnd ?? job.designer_revenue_vnd ?? 0,
  );

  return (
    <div className="rounded-[1.15rem] border border-blue-100 bg-blue-50/65 p-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <StatusPill tone={jobStatus.tone}>{jobStatus.label}</StatusPill>

            <StatusPill tone={paymentStatus.tone}>
              {paymentStatus.label}
            </StatusPill>

            {job.design_requests ? (
              <StatusPill tone="neutral">
                {getSafeCategoryLabel(job.design_requests.category)}
              </StatusPill>
            ) : null}
          </div>

          <h3 className="mt-3 text-lg font-extrabold tracking-[-0.035em] text-[#061a3a]">
            {job.title}
          </h3>

          <p className="mt-1 text-sm font-bold text-blue-700">
            {job.design_requests?.business_name ?? "Chưa rõ thương hiệu"}
          </p>
        </div>

        <Button
          asChild
          variant="outline"
          className="w-fit shrink-0 rounded-full border-blue-200 bg-white font-extrabold"
        >
          <Link href={`/designer/jobs/${job.id}`}>
            Mở job
            <ArrowRight className="ml-2 size-4" />
          </Link>
        </Button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <MiniInfo
          label="Thu nhập của bạn"
          value={formatCurrencyVnd(designerRevenue)}
        />

        <MiniInfo
          label="Due"
          value={job.due_at ? formatDateVi(job.due_at) : "Chưa có"}
        />
      </div>
    </div>
  );
}

function FeedbackCard({
  feedback,
  jobs,
  updates,
}: {
  feedback: FeedbackRow;
  jobs: JobRow[];
  updates: JobUpdateRow[];
}) {
  const job = jobs.find((item) => item.id === feedback.job_id);
  const update = updates.find((item) => item.id === feedback.update_id);

  return (
    <div className="rounded-[1.15rem] border border-amber-200 bg-amber-50 p-4">
      <div className="flex flex-wrap gap-2">
        <StatusPill tone="warning">Feedback</StatusPill>

        {update ? (
          <StatusPill tone="neutral">
            {getUpdateTypeLabel(update.update_type)}
          </StatusPill>
        ) : null}
      </div>

      <p className="mt-3 text-sm font-medium leading-7 text-amber-950">
        {feedback.message}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold text-[#061a3a]">
            {job?.title ?? "Job không xác định"}
          </p>

          <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-amber-700">
            {formatDateVi(feedback.created_at)}
          </p>
        </div>

        {job ? (
          <Button
            asChild
            variant="outline"
            className="rounded-full border-amber-200 bg-white font-extrabold text-amber-700"
          >
            <Link href={`/designer/jobs/${job.id}`}>Mở job</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function RecentUpdateCard({ update }: { update: JobUpdateRow }) {
  return (
    <div className="rounded-[1.15rem] border border-blue-100 bg-blue-50/65 p-4">
      <div className="flex flex-wrap gap-2">
        <StatusPill tone="neutral">
          {getUpdateTypeLabel(update.update_type)}
        </StatusPill>

        {update.attachment_url ? (
          <StatusPill tone="info">Có hình ảnh</StatusPill>
        ) : null}
      </div>

      <h3 className="mt-3 text-lg font-extrabold tracking-[-0.035em] text-[#061a3a]">
        {update.title}
      </h3>

      <p className="mt-2 line-clamp-2 text-sm font-medium leading-7 text-slate-600">
        {update.message}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-blue-700">
            {update.jobs?.design_requests?.business_name ?? "Chưa rõ thương hiệu"}
          </p>

          <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            {formatDateVi(update.created_at)}
          </p>
        </div>

        {update.attachment_url ? (
          <ImageIcon className="size-5 text-blue-700" />
        ) : (
          <SendHorizonal className="size-5 text-blue-700" />
        )}
      </div>
    </div>
  );
}

function ReviewCard({ review }: { review: ReviewRow }) {
  return (
    <div className="rounded-[1.15rem] border border-blue-100 bg-blue-50/65 p-4">
      <div className="flex flex-wrap gap-2">
        <RatingPill rating={review.rating} />

        {review.jobs?.design_requests ? (
          <StatusPill tone="neutral">
            {getSafeCategoryLabel(review.jobs.design_requests.category)}
          </StatusPill>
        ) : null}
      </div>

      <p className="mt-3 text-sm font-medium leading-7 text-slate-700">
        {review.comment ?? "Customer không để lại nhận xét chi tiết."}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold text-[#061a3a]">
            {review.jobs?.title ?? "Job không xác định"}
          </p>

          <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            {formatDateVi(review.created_at)}
          </p>
        </div>

        {review.jobs ? (
          <Button
            asChild
            variant="outline"
            className="rounded-full border-blue-200 bg-white font-extrabold"
          >
            <Link href={`/designer/jobs/${review.jobs.id}`}>Mở job</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function ErrorPanel({ errors }: { errors: Array<string | undefined> }) {
  const realErrors = errors.filter((error): error is string => Boolean(error));

  if (realErrors.length === 0) return null;

  return (
    <SurfaceCard className="mb-5 border-red-200 bg-red-50 p-6">
      <p className="text-sm font-black uppercase tracking-[0.18em] text-red-600">
        Data loading warning
      </p>

      <div className="mt-3 grid gap-2">
        {realErrors.map((error) => (
          <p key={error} className="text-sm font-semibold leading-7 text-red-600">
            {error}
          </p>
        ))}
      </div>
    </SurfaceCard>
  );
}

function MetricCard({
  label,
  value,
  description,
  icon,
  href,
  tone = "normal",
}: {
  label: string;
  value: string;
  description: string;
  icon: ReactNode;
  href: string;
  tone?: "normal" | "dark" | "success" | "warning";
}) {
  const cardClass =
    tone === "dark"
      ? "border-[#061a3a] bg-[#061a3a] text-white shadow-[0_18px_50px_rgba(6,26,58,0.22)]"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-[#061a3a]"
        : tone === "warning"
          ? "border-amber-200 bg-amber-50 text-[#061a3a]"
          : "border-blue-100 bg-white text-[#061a3a]";

  const iconClass =
    tone === "dark"
      ? "bg-white/10 text-sky-200 ring-white/10"
      : tone === "success"
        ? "bg-white text-emerald-700 ring-emerald-200"
        : tone === "warning"
          ? "bg-white text-amber-700 ring-amber-200"
          : "bg-blue-50 text-blue-700 ring-blue-100";

  const labelClass = tone === "dark" ? "text-sky-200/75" : "text-blue-600";
  const descriptionClass = tone === "dark" ? "text-white/68" : "text-slate-500";

  return (
    <Link
      href={href}
      className={`rounded-[1.35rem] border p-5 transition hover:-translate-y-0.5 ${cardClass}`}
    >
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

      <p className={`mt-3 text-sm font-medium leading-6 ${descriptionClass}`}>
        {description}
      </p>
    </Link>
  );
}

function SignalBox({
  icon,
  label,
  value,
  tone = "normal",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: "normal" | "warning";
}) {
  const boxClass =
    tone === "warning"
      ? "border-amber-200 bg-amber-50"
      : "border-blue-100 bg-blue-50/65";

  return (
    <div className={`rounded-[1.15rem] border p-4 ${boxClass}`}>
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

function DarkSignalBox({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.15rem] border border-white/10 bg-white/10 p-4">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-sky-200/75">
        {icon}
        {label}
      </div>

      <p className="mt-2 text-sm font-extrabold leading-6 text-white">
        {value}
      </p>
    </div>
  );
}

function DarkMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-200/60">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black tracking-[-0.05em] text-white">
        {value}
      </p>
    </div>
  );
}

function DarkTagBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-200/60">
        {title}
      </p>

      {items.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.slice(0, 8).map((item) => (
            <span
              key={item}
              className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold text-white"
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm font-semibold leading-6 text-white/55">
          Chưa có dữ liệu.
        </p>
      )}
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-white/75 p-3">
      <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-blue-600">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-extrabold leading-6 text-[#061a3a]">
        {value}
      </p>
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

function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="mt-6 grid place-items-center rounded-[1.25rem] border border-blue-100 bg-blue-50/65 p-8 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-white text-blue-700 ring-1 ring-blue-100">
        <Sparkles className="size-6" />
      </div>

      <h3 className="mt-5 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
        {title}
      </h3>

      <p className="mt-3 max-w-xl text-sm font-medium leading-7 text-slate-600">
        {description}
      </p>

      {actionHref && actionLabel ? (
        <Button
          asChild
          className="mt-6 rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61]"
        >
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}

function getPrimaryPayment(payments: JobRow["payments"]) {
  if (Array.isArray(payments)) {
    return payments[0] ?? null;
  }

  return payments;
}

function getAttentionItems({
  verificationStatus,
  portfolioCount,
  analyzedPortfolioCount,
  paymentPendingJobs,
  activeJobs,
  feedbackCount,
}: {
  verificationStatus: string | null | undefined;
  portfolioCount: number;
  analyzedPortfolioCount: number;
  paymentPendingJobs: number;
  activeJobs: number;
  feedbackCount: number;
}) {
  const items: string[] = [];

  if (verificationStatus !== "approved" && verificationStatus !== "verified") {
    items.push(
      "Hồ sơ designer chưa được admin duyệt, khả năng được match sẽ bị giới hạn.",
    );
  }

  if (portfolioCount === 0) {
    items.push(
      "Bạn chưa upload portfolio. Hãy thêm portfolio để hệ thống tạo Style DNA.",
    );
  }

  if (portfolioCount > 0 && analyzedPortfolioCount === 0) {
    items.push("Portfolio đã upload nhưng chưa có item nào được AI phân tích.");
  }

  if (paymentPendingJobs > 0) {
    items.push(
      "Có job đang chờ payment được xác nhận. Designer chỉ nên bắt đầu sau khi payment confirmed.",
    );
  }

  if (activeJobs > 0 && feedbackCount > 0) {
    items.push(
      "Có feedback từ customer. Hãy kiểm tra job để phản hồi hoặc gửi bản chỉnh sửa.",
    );
  }

  return items;
}

function getUpdateTypeLabel(updateType: string) {
  if (updateType === "draft") return "Bản nháp";
  if (updateType === "final") return "Bản hoàn thiện";
  return "Tiến độ";
}

function getVerificationView(status: string | null | undefined) {
  if (status === "approved" || status === "verified") {
    return {
      label: "Đã duyệt",
      tone: "success" as const,
    };
  }

  if (status === "rejected") {
    return {
      label: "Bị từ chối",
      tone: "warning" as const,
    };
  }

  if (status === "in_review") {
    return {
      label: "Đang xét duyệt",
      tone: "info" as const,
    };
  }

  return {
    label: "Chờ duyệt",
    tone: "warning" as const,
  };
}

function getAvailabilityView(status: string | null | undefined) {
  if (status === "available") {
    return {
      label: "Available",
      tone: "success" as const,
    };
  }

  if (status === "busy") {
    return {
      label: "Busy",
      tone: "warning" as const,
    };
  }

  if (status === "paused") {
    return {
      label: "Paused",
      tone: "neutral" as const,
    };
  }

  return {
    label: "Availability unknown",
    tone: "neutral" as const,
  };
}

function getAiStatusView(status: string | null) {
  if (status === "completed") {
    return {
      label: "AI analyzed",
      tone: "success" as const,
    };
  }

  if (status === "failed") {
    return {
      label: "AI failed",
      tone: "warning" as const,
    };
  }

  if (status === "processing" || status === "pending") {
    return {
      label: "AI processing",
      tone: "info" as const,
    };
  }

  return {
    label: "Not analyzed",
    tone: "neutral" as const,
  };
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

function getSafeCategoryLabel(category: string) {
  try {
    return getCategoryLabel(category as Parameters<typeof getCategoryLabel>[0]);
  } catch {
    return category;
  }
}