import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Award,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileImage,
  Gauge,
  ImageIcon,
  Layers3,
  Palette,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Tags,
  Type,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import type { ReactNode } from "react";

import { StatusPill } from "@/components/common/status-pill";
import { SurfaceCard } from "@/components/common/surface-card";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { DesignerVerificationActions } from "@/features/admin/designers/components/designer-verification-actions";
import { requireRole } from "@/lib/auth/guards";
import { getCategoryLabel, getIndustryLabel } from "@/lib/domain/labels";
import { formatCurrencyVnd, formatDateVi } from "@/lib/format";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type DesignerRow = {
  id: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
  specialties: string[] | null;
  styles: string[] | null;
  minimum_project_budget_vnd: number | null;
  rating: number;
  completed_jobs: number;
  response_time_hours: number;
  availability: string | null;
  verification_status: string | null;
  created_at: string;
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
  designer_profile_id: string | null;
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
  updated_at: string | null;
};

type JobRow = {
  id: string;
  designer_id: string;
  status: string;
  agreed_price_vnd: number;
  designer_revenue_vnd: number | null;
};

type ReviewRow = {
  id: string;
  designer_id: string;
  rating: number;
};

export default async function AdminDesignersPage() {
  const authState = await requireRole(["admin"]);
  const profile = authState.profile;

  if (!profile) {
    redirect("/auth-check");
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  const [
    designersResult,
    portfolioResult,
    styleDnaResult,
    jobsResult,
    reviewsResult,
  ] = await Promise.all([
    adminSupabase
      .from("designer_profiles")
      .select(
        `
        id,
        display_name,
        headline,
        bio,
        specialties,
        styles,
        minimum_project_budget_vnd,
        rating,
        completed_jobs,
        response_time_hours,
        availability,
        verification_status,
        created_at
      `,
      )
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
      .order("created_at", { ascending: false }),

    adminSupabase
      .from("designer_style_dna")
      .select(
        `
        designer_id,
        designer_profile_id,
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
        last_analyzed_at,
        updated_at
      `,
      )
      .order("updated_at", { ascending: false }),

    adminSupabase
      .from("jobs")
      .select("id, designer_id, status, agreed_price_vnd, designer_revenue_vnd"),

    adminSupabase.from("job_reviews").select("id, designer_id, rating"),
  ]);

  const designers = (designersResult.data ?? []) as unknown as DesignerRow[];
  const portfolioItems = (portfolioResult.data ??
    []) as unknown as PortfolioRow[];
  const styleDnas = (styleDnaResult.data ??
    []) as unknown as DesignerStyleDnaRow[];
  const jobs = (jobsResult.data ?? []) as unknown as JobRow[];
  const reviews = (reviewsResult.data ?? []) as unknown as ReviewRow[];

  const approvedDesigners = designers.filter((designer) =>
    isApprovedDesigner(designer.verification_status),
  );

  const pendingDesigners = designers.filter((designer) =>
    isPendingDesigner(designer.verification_status),
  );

  const rejectedDesigners = designers.filter(
    (designer) => designer.verification_status === "rejected",
  );

  const totalDesignerRevenue = jobs.reduce((total, job) => {
    if (!["active", "completed"].includes(job.status)) {
      return total;
    }

    return (
      total + Number(job.designer_revenue_vnd ?? job.agreed_price_vnd ?? 0)
    );
  }, 0);

  const analyzedPortfolioCount = portfolioItems.filter(
    (item) => item.ai_analysis_status === "completed",
  ).length;

  const totalPortfolioCount = portfolioItems.length;

  const averageRating =
    reviews.length > 0
      ? Math.round(
          (reviews.reduce((total, review) => total + review.rating, 0) /
            reviews.length) *
            10,
        ) / 10
      : 0;

  return (
    <DashboardShell
      role="admin"
      title="Designers"
      description="Duyệt hồ sơ designer, kiểm tra portfolio, Style DNA, rating và tín hiệu hoạt động."
      userName={profile.full_name}
      userEmail={authState.userEmail}
    >
      <ErrorPanel
        errors={[
          designersResult.error?.message,
          portfolioResult.error?.message,
          styleDnaResult.error?.message,
          jobsResult.error?.message,
          reviewsResult.error?.message,
        ]}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Designers"
          value={`${designers.length}`}
          description="Tổng hồ sơ designer"
          icon={<UsersRound className="size-5" />}
          tone="dark"
        />

        <MetricCard
          label="Pending approval"
          value={`${pendingDesigners.length}`}
          description="Designer cần admin duyệt"
          icon={<Clock3 className="size-5" />}
          tone={pendingDesigners.length > 0 ? "warning" : "normal"}
        />

        <MetricCard
          label="AI portfolio"
          value={`${analyzedPortfolioCount}/${totalPortfolioCount}`}
          description="Portfolio đã được AI phân tích"
          icon={<Sparkles className="size-5" />}
          tone={analyzedPortfolioCount > 0 ? "success" : "normal"}
        />

        <MetricCard
          label="Designer payout"
          value={formatCurrencyVnd(totalDesignerRevenue)}
          description="Tổng giá trị designer đã nhận"
          icon={<WalletCards className="size-5" />}
        />
      </section>

      <section className="mt-5">
        <SurfaceCard className="overflow-hidden p-0">
          <div className="bg-gradient-to-br from-[#061a3a] via-[#0b2a61] to-blue-700 p-6 text-white">
            <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr] xl:items-center">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-sky-200/75">
                  Designer approval center
                </p>

                <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.055em] text-white">
                  Trung tâm kiểm duyệt designer
                </h2>

                <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-white/70">
                  Admin dùng trang này để kiểm tra hồ sơ, portfolio, Style DNA,
                  rating và quyết định designer nào được phép xuất hiện trong hệ
                  thống matching.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button
                    asChild
                    className="rounded-full bg-white px-5 font-extrabold text-[#061a3a] hover:bg-sky-50"
                  >
                    <Link href="/admin/jobs">
                      Xem jobs
                      <ArrowRight className="ml-2 size-4" />
                    </Link>
                  </Button>

                  <Button
                    asChild
                    variant="outline"
                    className="rounded-full border-white/20 bg-white/10 font-extrabold text-white hover:bg-white/15"
                  >
                    <Link href="/admin/reviews">
                      Xem reviews
                      <Star className="ml-2 size-4" />
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <DarkSignalBox
                  icon={<ShieldCheck className="size-4" />}
                  label="Approved"
                  value={`${approvedDesigners.length} designer`}
                />

                <DarkSignalBox
                  icon={<Clock3 className="size-4" />}
                  label="Pending"
                  value={`${pendingDesigners.length} chờ duyệt`}
                />

                <DarkSignalBox
                  icon={<Star className="size-4" />}
                  label="Avg rating"
                  value={reviews.length > 0 ? `${averageRating}/5` : "N/A"}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-6 md:grid-cols-2 xl:grid-cols-4">
            <SignalBox
              icon={<CheckCircle2 className="size-4" />}
              label="Approved"
              value={`${approvedDesigners.length} designer đã duyệt`}
            />

            <SignalBox
              icon={<Clock3 className="size-4" />}
              label="Pending"
              value={`${pendingDesigners.length} chờ duyệt`}
              tone={pendingDesigners.length > 0 ? "warning" : "normal"}
            />

            <SignalBox
              icon={<CircleAlert className="size-4" />}
              label="Rejected"
              value={`${rejectedDesigners.length} bị từ chối`}
              tone={rejectedDesigners.length > 0 ? "warning" : "normal"}
            />

            <SignalBox
              icon={<Sparkles className="size-4" />}
              label="AI analyzed"
              value={`${analyzedPortfolioCount} portfolio đã phân tích`}
            />
          </div>
        </SurfaceCard>
      </section>

      <section className="mt-5">
        <SurfaceCard className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Approval queue
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Designer cần duyệt trước
              </h2>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-600">
                Chỉ designer được duyệt mới nên xuất hiện trong AI matching.
                Hãy kiểm tra portfolio, Style DNA và thông tin hồ sơ trước khi
                approve.
              </p>
            </div>

            <StatusPill tone={pendingDesigners.length > 0 ? "warning" : "success"}>
              {`${pendingDesigners.length} pending`}
            </StatusPill>
          </div>

          {pendingDesigners.length === 0 ? (
            <EmptyState
              title="Không có designer đang chờ duyệt."
              description="Designer pending hoặc in_review sẽ xuất hiện tại đây để admin kiểm tra nhanh."
            />
          ) : (
            <div className="mt-6 grid gap-5">
              {pendingDesigners.map((designer) => {
                const designerPortfolio = portfolioItems.filter(
                  (item) => item.designer_id === designer.id,
                );

                const designerJobs = jobs.filter(
                  (item) => item.designer_id === designer.id,
                );

                const designerReviews = reviews.filter(
                  (item) => item.designer_id === designer.id,
                );

                const styleDna = findDesignerDna(styleDnas, designer.id);

                return (
                  <DesignerCard
                    key={designer.id}
                    designer={designer}
                    portfolioItems={designerPortfolio}
                    styleDna={styleDna}
                    jobs={designerJobs}
                    reviews={designerReviews}
                    highlight
                  />
                );
              })}
            </div>
          )}
        </SurfaceCard>
      </section>

      <section className="mt-5">
        <SurfaceCard className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Designer database
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Toàn bộ designer
              </h2>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-600">
                Xem toàn bộ designer trong hệ thống, bao gồm trạng thái duyệt,
                portfolio, Style DNA, job và review.
              </p>
            </div>

            <StatusPill tone="info">{`${designers.length} designers`}</StatusPill>
          </div>

          {designers.length === 0 ? (
            <EmptyState
              title="Chưa có designer nào."
              description="Designer sẽ xuất hiện sau khi có tài khoản designer được tạo trong hệ thống."
            />
          ) : (
            <div className="mt-6 grid gap-5">
              {designers.map((designer) => {
                const designerPortfolio = portfolioItems.filter(
                  (item) => item.designer_id === designer.id,
                );

                const designerJobs = jobs.filter(
                  (item) => item.designer_id === designer.id,
                );

                const designerReviews = reviews.filter(
                  (item) => item.designer_id === designer.id,
                );

                const styleDna = findDesignerDna(styleDnas, designer.id);

                return (
                  <DesignerCard
                    key={designer.id}
                    designer={designer}
                    portfolioItems={designerPortfolio}
                    styleDna={styleDna}
                    jobs={designerJobs}
                    reviews={designerReviews}
                  />
                );
              })}
            </div>
          )}
        </SurfaceCard>
      </section>
    </DashboardShell>
  );
}

function DesignerCard({
  designer,
  portfolioItems,
  styleDna,
  jobs,
  reviews,
  highlight = false,
}: {
  designer: DesignerRow;
  portfolioItems: PortfolioRow[];
  styleDna?: DesignerStyleDnaRow;
  jobs: JobRow[];
  reviews: ReviewRow[];
  highlight?: boolean;
}) {
  const completedJobs = jobs.filter((job) => job.status === "completed").length;
  const activeJobs = jobs.filter((job) => job.status === "active").length;

  const trackedValue = jobs.reduce((total, job) => {
    if (!["active", "completed"].includes(job.status)) {
      return total;
    }

    return (
      total + Number(job.designer_revenue_vnd ?? job.agreed_price_vnd ?? 0)
    );
  }, 0);

  const averageRating =
    reviews.length > 0
      ? Math.round(
          (reviews.reduce((total, review) => total + review.rating, 0) /
            reviews.length) *
            10,
        ) / 10
      : Number(designer.rating ?? 0);

  const specialties = designer.specialties ?? [];
  const styles = designer.styles ?? [];

  const portfolioWithImages = portfolioItems.filter((item) =>
    Boolean(item.image_url),
  ).length;

  const analyzedPortfolio = portfolioItems.filter(
    (item) => item.ai_analysis_status === "completed",
  ).length;

  const failedPortfolio = portfolioItems.filter(
    (item) => item.ai_analysis_status === "failed",
  ).length;

  const verification = getVerificationView(designer.verification_status);
  const availability = getAvailabilityView(designer.availability);
  const dnaConfidence = Number(styleDna?.confidence_score ?? 0);

  return (
    <div
      className={`rounded-[1.35rem] border p-5 ${
        highlight
          ? "border-amber-200 bg-amber-50"
          : "border-blue-100 bg-blue-50/65"
      }`}
    >
      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={verification.tone}>{verification.label}</StatusPill>

            <StatusPill tone={availability.tone}>{availability.label}</StatusPill>

            <RatingPill rating={averageRating} />

            {styleDna ? (
              <StatusPill tone={dnaConfidence >= 70 ? "success" : "info"}>
                {`DNA ${dnaConfidence}/100`}
              </StatusPill>
            ) : (
              <StatusPill tone="neutral">Chưa có DNA</StatusPill>
            )}
          </div>

          <div className="mt-5 flex items-start gap-4">
            <div className="grid size-14 shrink-0 place-items-center rounded-3xl bg-[#061a3a] text-white shadow-[0_18px_45px_rgba(6,26,58,0.2)]">
              <UserRound className="size-6" />
            </div>

            <div>
              <h3 className="text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                {designer.display_name}
              </h3>

              <p className="mt-2 text-sm font-bold leading-6 text-blue-700">
                {designer.headline ?? "Designer"}
              </p>

              <p className="mt-3 max-w-4xl text-sm font-medium leading-7 text-slate-600">
                {designer.bio ||
                  "Designer này chưa cập nhật bio. Admin nên yêu cầu designer hoàn thiện hồ sơ để tăng chất lượng matching."}
              </p>
            </div>
          </div>
        </div>

        <div className="shrink-0 text-left xl:text-right">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            {`Created ${formatDateVi(designer.created_at)}`}
          </p>

          <p className="mt-2 text-sm font-black text-[#061a3a]">
            {formatCurrencyVnd(trackedValue)}
          </p>

          <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            Tracked job value
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <InfoBox
          icon={<FileImage className="size-4" />}
          label="Portfolio"
          value={`${portfolioItems.length} items / ${portfolioWithImages} có ảnh`}
        />

        <InfoBox
          icon={<Sparkles className="size-4" />}
          label="AI analyzed"
          value={`${analyzedPortfolio} done / ${failedPortfolio} failed`}
        />

        <InfoBox
          icon={<BriefcaseBusiness className="size-4" />}
          label="Jobs"
          value={`${activeJobs} active / ${completedJobs} done`}
        />

        <InfoBox
          icon={<Clock3 className="size-4" />}
          label="Response"
          value={`${designer.response_time_hours ?? 24} giờ`}
        />

        <InfoBox
          icon={<WalletCards className="size-4" />}
          label="Min budget"
          value={formatCurrencyVnd(
            Number(designer.minimum_project_budget_vnd ?? 0),
          )}
        />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <TagPanel
          title="Specialties"
          icon={<Sparkles className="size-4" />}
          items={specialties}
          emptyText="Chưa có specialties."
        />

        <TagPanel
          title="Visual styles"
          icon={<Palette className="size-4" />}
          items={styles}
          emptyText="Chưa có visual styles."
        />
      </div>

      {styleDna ? (
        <div className="mt-5 rounded-[1.2rem] border border-blue-100 bg-white p-5">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                <Sparkles className="size-4" />
                AI Style DNA
              </div>

              <h4 className="mt-2 text-lg font-extrabold tracking-[-0.035em] text-[#061a3a]">
                Hồ sơ phong cách thị giác
              </h4>
            </div>

            <StatusPill tone={dnaConfidence >= 70 ? "success" : "info"}>
              {`Confidence ${dnaConfidence}/100`}
            </StatusPill>
          </div>

          {styleDna.dna_summary ? (
            <p className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/65 p-4 text-sm font-medium leading-7 text-slate-700">
              {styleDna.dna_summary}
            </p>
          ) : null}

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <TagPanel
              title="Style tags"
              icon={<Tags className="size-4" />}
              items={styleDna.style_tags ?? []}
              emptyText="Chưa có style tags."
              compact
            />

            <TagPanel
              title="Mood nổi bật"
              icon={<Sparkles className="size-4" />}
              items={styleDna.common_moods ?? []}
              emptyText="Chưa có mood nổi bật."
              compact
            />

            <TagPanel
              title="Visual strengths"
              icon={<Award className="size-4" />}
              items={styleDna.visual_strengths ?? []}
              emptyText="Chưa có visual strengths."
              compact
            />

            <TagPanel
              title="Colors"
              icon={<Palette className="size-4" />}
              items={styleDna.color_preferences ?? []}
              emptyText="Chưa có dữ liệu màu."
              compact
            />

            <TagPanel
              title="Typography"
              icon={<Type className="size-4" />}
              items={styleDna.typography_preferences ?? []}
              emptyText="Chưa có typography preference."
              compact
            />

            <TagPanel
              title="Layout"
              icon={<Layers3 className="size-4" />}
              items={styleDna.layout_preferences ?? []}
              emptyText="Chưa có layout preference."
              compact
            />

            <TagPanel
              title="Industry tags"
              icon={<Store className="size-4" />}
              items={(styleDna.industry_tags ?? []).map(getSafeIndustryLabel)}
              emptyText="Chưa có industry tags."
              compact
            />

            <TagPanel
              title="Category tags"
              icon={<Palette className="size-4" />}
              items={(styleDna.category_tags ?? []).map(getSafeCategoryLabel)}
              emptyText="Chưa có category tags."
              compact
            />
          </div>

          <p className="mt-4 text-xs font-semibold leading-5 text-slate-500">
            {styleDna.last_analyzed_at
              ? `Last analyzed: ${formatDateVi(styleDna.last_analyzed_at)}`
              : styleDna.updated_at
                ? `Updated: ${formatDateVi(styleDna.updated_at)}`
                : "Chưa có thời gian cập nhật DNA."}
          </p>
        </div>
      ) : (
        <div className="mt-5 rounded-[1.2rem] border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <CircleAlert className="mt-1 size-5 shrink-0 text-amber-700" />

            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-amber-700">
                Chưa có AI Style DNA
              </p>

              <p className="mt-2 text-sm font-medium leading-7 text-amber-950">
                Designer nên upload portfolio có ảnh để AI phân tích phong cách
                trước khi admin duyệt. Nếu vẫn duyệt, hệ thống matching sẽ thiếu
                tín hiệu thị giác quan trọng.
              </p>
            </div>
          </div>
        </div>
      )}

      {portfolioItems.length > 0 ? (
        <div className="mt-5 rounded-[1.2rem] border border-blue-100 bg-white p-5">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                <FileImage className="size-4" />
                Portfolio evidence
              </div>

              <p className="mt-2 text-sm font-medium leading-7 text-slate-600">
                Một số portfolio gần nhất dùng để đánh giá chất lượng hồ sơ.
              </p>
            </div>

            <StatusPill tone="info">{`${portfolioItems.length} items`}</StatusPill>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {portfolioItems.slice(0, 3).map((item) => (
              <PortfolioPreviewCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5 rounded-[1.15rem] border border-blue-100 bg-white p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
              Admin actions
            </p>

            <p className="mt-2 text-sm font-medium leading-7 text-slate-600">
              Duyệt designer nếu hồ sơ đủ tin cậy, có portfolio phù hợp và thông
              tin chuyên môn rõ ràng.
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
            <Gauge className="size-4" />
            {styleDna
              ? `DNA ${dnaConfidence}/100`
              : "Chưa có Style DNA"}
          </div>
        </div>

        <DesignerVerificationActions
          designerId={designer.id}
          currentStatus={designer.verification_status}
        />
      </div>
    </div>
  );
}

function PortfolioPreviewCard({ item }: { item: PortfolioRow }) {
  const aiStatus = getAiStatusView(item.ai_analysis_status);

  return (
    <div className="overflow-hidden rounded-[1rem] border border-blue-100 bg-blue-50/65">
      <div className="grid aspect-[4/3] place-items-center bg-blue-50">
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

      <div className="p-3">
        <StatusPill tone={aiStatus.tone}>{aiStatus.label}</StatusPill>

        <p className="mt-3 line-clamp-2 text-sm font-extrabold leading-6 text-[#061a3a]">
          {item.title}
        </p>

        <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
          {getSafeCategoryLabel(item.category)}
        </p>
      </div>
    </div>
  );
}

function TagPanel({
  title,
  icon,
  items,
  emptyText,
  compact = false,
}: {
  title: string;
  icon: ReactNode;
  items: string[];
  emptyText: string;
  compact?: boolean;
}) {
  const realItems = items.filter(Boolean);

  return (
    <div
      className={`rounded-[1.15rem] border border-blue-100 bg-white ${
        compact ? "p-3" : "p-5"
      }`}
    >
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-blue-600">
        {icon}
        {title}
      </div>

      {realItems.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {realItems.slice(0, compact ? 8 : 12).map((item) => (
            <StatusPill key={item} tone="neutral">
              {item}
            </StatusPill>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm font-medium leading-7 text-slate-500">
          {emptyText}
        </p>
      )}
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
  tone = "normal",
}: {
  label: string;
  value: string;
  description: string;
  icon: ReactNode;
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

      <p className={`mt-3 text-sm font-medium leading-6 ${descriptionClass}`}>
        {description}
      </p>
    </div>
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
    <div className="rounded-[1.15rem] border border-blue-100 bg-white/75 p-4">
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

function RatingPill({ rating }: { rating: number }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-amber-700">
      <Star className="size-3.5 fill-current" />
      {rating.toFixed(1)}/5
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
        <UsersRound className="size-6" />
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

function findDesignerDna(items: DesignerStyleDnaRow[], designerId: string) {
  return items.find(
    (item) =>
      item.designer_id === designerId || item.designer_profile_id === designerId,
  );
}

function isApprovedDesigner(status: string | null) {
  return status === "approved" || status === "verified";
}

function isPendingDesigner(status: string | null) {
  return !status || status === "pending" || status === "in_review";
}

function getVerificationView(status: string | null) {
  if (status === "approved" || status === "verified") {
    return {
      label: "Đã duyệt",
      tone: "success" as const,
    };
  }

  if (status === "rejected") {
    return {
      label: "Từ chối",
      tone: "warning" as const,
    };
  }

  if (status === "in_review") {
    return {
      label: "Đang duyệt",
      tone: "info" as const,
    };
  }

  return {
    label: "Chờ duyệt",
    tone: "warning" as const,
  };
}

function getAvailabilityView(status: string | null) {
  if (status === "available" || status === "open") {
    return {
      label: "Đang nhận job",
      tone: "success" as const,
    };
  }

  if (status === "busy") {
    return {
      label: "Đang bận",
      tone: "warning" as const,
    };
  }

  if (status === "unavailable") {
    return {
      label: "Tạm nghỉ",
      tone: "neutral" as const,
    };
  }

  return {
    label: "Chưa rõ",
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

  if (status === "skipped") {
    return {
      label: "AI skipped",
      tone: "neutral" as const,
    };
  }

  return {
    label: "Not analyzed",
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

function getSafeIndustryLabel(industry: string) {
  try {
    return getIndustryLabel(industry as Parameters<typeof getIndustryLabel>[0]);
  } catch {
    return industry;
  }
}