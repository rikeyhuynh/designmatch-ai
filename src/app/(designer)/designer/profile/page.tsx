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
  Sparkles,
  Star,
  Store,
  Tags,
  Type,
  UserRound,
  WalletCards,
} from "lucide-react";
import type { ReactNode } from "react";

import { StatusPill } from "@/components/common/status-pill";
import { SurfaceCard } from "@/components/common/surface-card";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { UpdateDesignerProfileForm } from "@/features/designer/profile/components/update-designer-profile-form";
import { requireRole } from "@/lib/auth/guards";
import { getCategoryLabel, getIndustryLabel } from "@/lib/domain/labels";
import { formatCurrencyVnd, formatDateVi } from "@/lib/format";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type DesignerProfileRow = {
  id: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
  specialties: string[] | null;
  styles: string[] | null;
  minimum_project_budget_vnd: number | null;
  rating: number | null;
  completed_jobs: number | null;
  response_time_hours: number | null;
  availability: string | null;
  verification_status: string | null;
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

type PortfolioRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  industry: string | null;
  image_url: string | null;
  created_at: string;
  ai_analysis_status: string | null;
  ai_style_tags: string[] | null;
  ai_industry_tags: string[] | null;
  ai_category_tags: string[] | null;
  ai_visual_summary: string | null;
  ai_confidence_score: number | null;
};

type JobRow = {
  id: string;
  status: string;
};

type ReviewRow = {
  id: string;
  rating: number;
};

export default async function DesignerProfilePage() {
  const authState = await requireRole(["designer"]);
  const profile = authState.profile;
  const designerProfile = authState.designerProfile;

  if (!profile || !designerProfile) {
    redirect("/auth-check");
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  const [
    designerResult,
    styleDnaResult,
    portfolioResult,
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
      .eq("id", designerProfile.id)
      .maybeSingle(),

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
      .or(
        `designer_id.eq.${designerProfile.id},designer_profile_id.eq.${designerProfile.id}`,
      )
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    adminSupabase
      .from("portfolio_items")
      .select(
        `
        id,
        title,
        description,
        category,
        industry,
        image_url,
        created_at,
        ai_analysis_status,
        ai_style_tags,
        ai_industry_tags,
        ai_category_tags,
        ai_visual_summary,
        ai_confidence_score
      `,
      )
      .eq("designer_id", designerProfile.id)
      .order("created_at", { ascending: false }),

    adminSupabase
      .from("jobs")
      .select("id, status")
      .eq("designer_id", designerProfile.id),

    adminSupabase
      .from("job_reviews")
      .select("id, rating")
      .eq("designer_id", designerProfile.id),
  ]);

  const designer = designerResult.data as DesignerProfileRow | null;
  const styleDna = styleDnaResult.data as DesignerStyleDnaRow | null;
  const portfolioItems = (portfolioResult.data ??
    []) as unknown as PortfolioRow[];
  const jobs = (jobsResult.data ?? []) as unknown as JobRow[];
  const reviews = (reviewsResult.data ?? []) as unknown as ReviewRow[];

  const displayName =
    designer?.display_name ?? designerProfile.display_name ?? "Designer";

  const headline = designer?.headline ?? designerProfile.headline ?? "Designer";
  const bio = designer?.bio ?? "";
  const specialties = designer?.specialties ?? [];
  const styles = designer?.styles ?? [];
  const minimumBudget = Number(designer?.minimum_project_budget_vnd ?? 300000);
  const rating = Number(designer?.rating ?? 0);
  const completedJobsFromProfile = Number(designer?.completed_jobs ?? 0);
  const responseTimeHours = Number(designer?.response_time_hours ?? 24);
  const availability = designer?.availability ?? "available";
  const verificationStatus = designer?.verification_status ?? null;
  const createdAt = designer?.created_at ?? new Date().toISOString();

  const activeJobs = jobs.filter((job) => job.status === "active").length;

  const completedJobsFromJobs = jobs.filter(
    (job) => job.status === "completed",
  ).length;

  const completedJobs = Math.max(completedJobsFromJobs, completedJobsFromProfile);

  const analyzedPortfolioItems = portfolioItems.filter((item) =>
    ["completed", "success"].includes(item.ai_analysis_status ?? ""),
  );

  const pendingPortfolioItems = portfolioItems.filter((item) =>
    ["not_started", "pending", "processing", null, undefined].includes(
      item.ai_analysis_status,
    ),
  );

  const averageReviewRating =
    reviews.length > 0
      ? Math.round(
          (reviews.reduce((total, review) => total + review.rating, 0) /
            reviews.length) *
            10,
        ) / 10
      : rating;

  const liveStyleTags = uniqueTags(
    analyzedPortfolioItems.flatMap((item) => item.ai_style_tags ?? []),
  );

  const liveIndustryTags = uniqueTags(
    analyzedPortfolioItems.flatMap((item) => item.ai_industry_tags ?? []),
  );

  const liveCategoryTags = uniqueTags(
    analyzedPortfolioItems.flatMap((item) => item.ai_category_tags ?? []),
  );

  const dnaIsStale =
    Boolean(styleDna) &&
    Number(styleDna?.analyzed_portfolio_count ?? 0) !==
      analyzedPortfolioItems.length;

  const strongStyles =
    liveStyleTags.length > 0
      ? liveStyleTags
      : (styleDna?.style_tags ?? []).length > 0
        ? styleDna?.style_tags ?? []
        : styles;

  const strongIndustries =
    liveIndustryTags.length > 0 ? liveIndustryTags : styleDna?.industry_tags ?? [];

  const strongCategories =
    liveCategoryTags.length > 0
      ? liveCategoryTags
      : (styleDna?.category_tags ?? []).length > 0
        ? styleDna?.category_tags ?? []
        : specialties;

  const dnaConfidence = dnaIsStale
    ? Math.round(
        analyzedPortfolioItems.reduce(
          (total, item) => total + Number(item.ai_confidence_score ?? 0),
          0,
        ) / Math.max(analyzedPortfolioItems.length, 1),
      )
    : Number(styleDna?.confidence_score ?? 0);

  return (
    <DashboardShell
      role="designer"
      title="Hồ sơ designer"
      description="Quản lý hồ sơ công khai, portfolio và Style DNA dùng cho hệ thống matching."
      userName={profile.full_name}
      userEmail={authState.userEmail}
    >
      <ErrorPanel
        errors={[
          designerResult.error?.message,
          styleDnaResult.error?.message,
          portfolioResult.error?.message,
          jobsResult.error?.message,
          reviewsResult.error?.message,
        ]}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Rating"
          value={`${averageReviewRating.toFixed(1)}/5`}
          description="Điểm đánh giá từ customer"
          icon={<Star className="size-5 fill-current" />}
          tone="warning"
        />

        <MetricCard
          label="Completed"
          value={`${completedJobs}`}
          description="Job đã hoàn thành"
          icon={<CheckCircle2 className="size-5" />}
          tone="success"
        />

        <MetricCard
          label="Portfolio"
          value={`${portfolioItems.length}`}
          description={`${analyzedPortfolioItems.length} item đã được AI phân tích`}
          icon={<FileImage className="size-5" />}
        />

        <MetricCard
          label="Style DNA"
          value={
            analyzedPortfolioItems.length > 0 ? `${dnaConfidence}/100` : "Chưa có"
          }
          description={
            analyzedPortfolioItems.length > 0
              ? `${analyzedPortfolioItems.length} portfolio hiện đang dùng`
              : "Cần portfolio có ảnh để AI phân tích"
          }
          icon={<Gauge className="size-5" />}
          tone={
            analyzedPortfolioItems.length > 0
              ? dnaConfidence >= 70
                ? "success"
                : "warning"
              : "normal"
          }
        />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">
        <div className="grid min-w-0 gap-5">
          <SurfaceCard className="p-6">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
              <div className="min-w-0">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                  Public profile
                </p>

                <h1 className="mt-3 break-words text-4xl font-extrabold tracking-[-0.065em] text-[#061a3a]">
                  {displayName}
                </h1>

                <p className="mt-2 text-base font-bold leading-7 text-blue-700">
                  {headline}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <StatusPill tone={getVerificationTone(verificationStatus)}>
                    {getVerificationLabel(verificationStatus)}
                  </StatusPill>

                  <StatusPill tone={getAvailabilityTone(availability)}>
                    {getAvailabilityLabel(availability)}
                  </StatusPill>

                  <StatusPill tone="info">
                    {`${responseTimeHours}h response`}
                  </StatusPill>
                </div>
              </div>

              <div className="grid size-16 shrink-0 place-items-center rounded-3xl bg-[#061a3a] text-white shadow-[0_18px_45px_rgba(6,26,58,0.25)]">
                <UserRound className="size-7" />
              </div>
            </div>

            <div className="mt-6 rounded-[1.2rem] border border-blue-100 bg-blue-50/65 p-5">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-600">
                Bio
              </p>

              <p className="mt-3 whitespace-pre-wrap break-words text-sm font-medium leading-7 text-slate-700">
                {bio ||
                  "Bạn chưa có phần giới thiệu hồ sơ. Hãy cập nhật bio để customer hiểu rõ hơn về phong cách, kinh nghiệm và cách làm việc của bạn."}
              </p>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <InfoBox
                icon={<Star className="size-4" />}
                label="Current rating"
                value={`${averageReviewRating.toFixed(1)}/5`}
              />

              <InfoBox
                icon={<Clock3 className="size-4" />}
                label="Response time"
                value={`${responseTimeHours} giờ`}
              />

              <InfoBox
                icon={<BriefcaseBusiness className="size-4" />}
                label="Active jobs"
                value={`${activeJobs}`}
              />

              <InfoBox
                icon={<CalendarDays className="size-4" />}
                label="Created at"
                value={formatDateVi(createdAt)}
              />
            </div>
          </SurfaceCard>

          <StyleDnaCard
            styleDna={styleDna}
            dnaIsStale={dnaIsStale}
            strongStyles={strongStyles}
            strongCategories={strongCategories}
            strongIndustries={strongIndustries}
            minimumBudget={minimumBudget}
            responseTimeHours={responseTimeHours}
            rating={averageReviewRating}
            completedJobs={completedJobs}
            portfolioCount={portfolioItems.length}
            analyzedCount={analyzedPortfolioItems.length}
            pendingCount={pendingPortfolioItems.length}
            dnaConfidence={dnaConfidence}
          />
        </div>

        <div className="min-w-0 xl:sticky xl:top-28">
          <UpdateDesignerProfileForm
            initialDisplayName={displayName}
            initialHeadline={headline}
            initialBio={bio}
            initialSpecialties={specialties}
            initialStyles={styles}
            initialMinimumProjectBudgetVnd={minimumBudget}
            initialAvailability={availability}
          />

          <SurfaceCard className="mt-5 p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
              Profile strength
            </p>

            <div className="mt-4 grid gap-3">
              <ChecklistItem checked={Boolean(bio)} label="Có bio giới thiệu" />
              <ChecklistItem
                checked={portfolioItems.length > 0}
                label="Có portfolio"
              />
              <ChecklistItem
                checked={analyzedPortfolioItems.length > 0}
                label="Có Style DNA từ AI"
              />
              <ChecklistItem
                checked={strongStyles.length > 0}
                label="Có phong cách chính"
              />
              <ChecklistItem
                checked={minimumBudget > 0}
                label="Có mức giá tối thiểu"
              />
            </div>
          </SurfaceCard>
        </div>
      </section>

      <section className="mt-5">
        <SurfaceCard className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Portfolio preview
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Portfolio gần đây
              </h2>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-600">
                Portfolio là nguồn dữ liệu chính để AI nhận diện phong cách,
                ngành mạnh và loại thiết kế phù hợp của bạn.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusPill tone="info">{`${portfolioItems.length} items`}</StatusPill>
              <StatusPill tone="success">{`${analyzedPortfolioItems.length} analyzed`}</StatusPill>
            </div>
          </div>

          {portfolioItems.length === 0 ? (
            <EmptyState
              title="Chưa có portfolio item."
              description="Bạn cần thêm portfolio để hệ thống có dữ liệu phân tích Style DNA và matching chính xác hơn."
              href="/designer/portfolio"
              buttonLabel="Thêm portfolio"
            />
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {portfolioItems.slice(0, 6).map((item) => (
                <PortfolioPreviewCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </SurfaceCard>
      </section>
    </DashboardShell>
  );
}

function StyleDnaCard({
  styleDna,
  dnaIsStale,
  strongStyles,
  strongCategories,
  strongIndustries,
  minimumBudget,
  responseTimeHours,
  rating,
  completedJobs,
  portfolioCount,
  analyzedCount,
  pendingCount,
  dnaConfidence,
}: {
  styleDna: DesignerStyleDnaRow | null;
  dnaIsStale: boolean;
  strongStyles: string[];
  strongCategories: string[];
  strongIndustries: string[];
  minimumBudget: number;
  responseTimeHours: number;
  rating: number;
  completedJobs: number;
  portfolioCount: number;
  analyzedCount: number;
  pendingCount: number;
  dnaConfidence: number;
}) {
  if (analyzedCount === 0) {
    return (
      <SurfaceCard className="border-amber-200 bg-amber-50 p-6">
        <div className="flex items-start gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-amber-700 ring-1 ring-amber-200">
            <CircleAlert className="size-5" />
          </div>

          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-amber-700">
              Style DNA
            </p>

            <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
              Chưa có Style DNA
            </h2>

            <p className="mt-3 text-sm font-medium leading-7 text-amber-950">
              Hãy thêm portfolio có ảnh để AI phân tích phong cách. Style DNA sẽ
              được dùng để hệ thống match bạn với brief phù hợp hơn.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <InfoBox
                icon={<FileImage className="size-4" />}
                label="Portfolio"
                value={`${portfolioCount} items`}
              />

              <InfoBox
                icon={<Sparkles className="size-4" />}
                label="AI analyzed"
                value={`${analyzedCount}`}
              />

              <InfoBox
                icon={<CircleAlert className="size-4" />}
                label="Pending"
                value={`${pendingCount}`}
              />
            </div>

            <Button
              asChild
              className="mt-5 rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61]"
            >
              <Link href="/designer/portfolio">
                Thêm portfolio
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard className="overflow-hidden p-0">
      <div className="bg-gradient-to-br from-[#061a3a] via-[#0b2a61] to-blue-700 p-6 text-white">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-sky-200/75">
              Designer Style DNA
            </p>

            <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.055em] text-white">
              Hồ sơ phong cách dùng cho matching
            </h2>

            <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-white/72">
              Style DNA được tổng hợp từ portfolio hiện còn trong hồ sơ và các
              tín hiệu vận hành như rating, response time, completed jobs và
              minimum budget.
            </p>
          </div>

          <div className="rounded-[1.2rem] border border-white/10 bg-white/10 px-5 py-4 text-center">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-200/75">
              Confidence
            </p>

            <p className="mt-2 text-5xl font-black tracking-[-0.08em] text-white">
              {dnaConfidence}
            </p>

            <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
              / 100
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-6">
        {dnaIsStale ? (
          <div className="rounded-[1.15rem] border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-bold leading-7 text-amber-900">
              Style DNA đang được hiển thị theo portfolio hiện còn. Sau lần
              thêm/xóa/phân tích portfolio tiếp theo, dữ liệu tổng hợp sẽ được
              cập nhật lại trong hệ thống.
            </p>
          </div>
        ) : null}

        <DnaSummaryPanel
          analyzedCount={analyzedCount}
          styleTags={strongStyles}
          industryTags={strongIndustries}
          categoryTags={strongCategories}
          moodTags={styleDna?.common_moods ?? []}
          colorTags={styleDna?.color_preferences ?? []}
          typographyTags={styleDna?.typography_preferences ?? []}
          layoutTags={styleDna?.layout_preferences ?? []}
          visualStrengths={styleDna?.visual_strengths ?? []}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <TagPanel
            title="Phong cách chính"
            icon={<Tags className="size-4" />}
            items={strongStyles}
            emptyText="Chưa có phong cách chính."
          />

          <TagPanel
            title="Ngành mạnh"
            icon={<Store className="size-4" />}
            items={strongIndustries.map(getSafeIndustryLabel)}
            emptyText="Chưa có ngành mạnh."
          />

          <TagPanel
            title="Loại thiết kế mạnh"
            icon={<Palette className="size-4" />}
            items={strongCategories.map(getSafeCategoryLabel)}
            emptyText="Chưa có loại thiết kế mạnh."
          />

          <TagPanel
            title="Mood nổi bật"
            icon={<Sparkles className="size-4" />}
            items={styleDna?.common_moods ?? []}
            emptyText="Chưa có mood nổi bật."
          />

          <TagPanel
            title="Màu sắc thường dùng"
            icon={<Palette className="size-4" />}
            items={styleDna?.color_preferences ?? []}
            emptyText="Chưa có dữ liệu màu sắc."
          />

          <TagPanel
            title="Typography"
            icon={<Type className="size-4" />}
            items={styleDna?.typography_preferences ?? []}
            emptyText="Chưa có dữ liệu typography."
          />

          <TagPanel
            title="Layout"
            icon={<Layers3 className="size-4" />}
            items={styleDna?.layout_preferences ?? []}
            emptyText="Chưa có dữ liệu layout."
          />

          <TagPanel
            title="Điểm mạnh thị giác"
            icon={<Award className="size-4" />}
            items={styleDna?.visual_strengths ?? []}
            emptyText="Chưa có điểm mạnh thị giác."
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <InfoBox
            icon={<WalletCards className="size-4" />}
            label="Minimum budget"
            value={formatCurrencyVnd(minimumBudget)}
          />

          <InfoBox
            icon={<Clock3 className="size-4" />}
            label="Response time"
            value={`${responseTimeHours} giờ`}
          />

          <InfoBox
            icon={<CheckCircle2 className="size-4" />}
            label="Completed jobs"
            value={`${completedJobs}`}
          />

          <InfoBox
            icon={<Star className="size-4" />}
            label="Satisfaction"
            value={`${rating.toFixed(1)}/5`}
          />
        </div>

        <div className="rounded-[1.15rem] border border-blue-100 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-blue-600">
            <CalendarDays className="size-4" />
            Last analyzed
          </div>

          <p className="mt-2 text-sm font-extrabold leading-6 text-[#061a3a]">
            {styleDna?.last_analyzed_at
              ? formatDateVi(styleDna.last_analyzed_at)
              : styleDna?.updated_at
                ? formatDateVi(styleDna.updated_at)
                : "Chưa có thời gian cập nhật"}
          </p>
        </div>
      </div>
    </SurfaceCard>
  );
}

function DnaSummaryPanel({
  analyzedCount,
  styleTags,
  industryTags,
  categoryTags,
  moodTags,
  colorTags,
  typographyTags,
  layoutTags,
  visualStrengths,
}: {
  analyzedCount: number;
  styleTags: string[];
  industryTags: string[];
  categoryTags: string[];
  moodTags: string[];
  colorTags: string[];
  typographyTags: string[];
  layoutTags: string[];
  visualStrengths: string[];
}) {
  return (
    <div className="rounded-[1.15rem] border border-blue-100 bg-blue-50/65 p-5">
      <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-blue-600">
        <Sparkles className="size-4" />
        DNA summary
      </div>

      <div className="mt-4 grid gap-3">
        <SummaryLine
          label="Đã phân tích"
          value={`${analyzedCount} portfolio hiện còn trong hồ sơ`}
        />

        <SummaryLine
          label="Phong cách nổi bật"
          items={styleTags.slice(0, 5)}
        />

        <SummaryLine label="Mood thường gặp" items={moodTags.slice(0, 5)} />

        <SummaryLine
          label="Ngành phù hợp"
          items={industryTags.slice(0, 5).map(getSafeIndustryLabel)}
        />

        <SummaryLine
          label="Hạng mục mạnh"
          items={categoryTags.slice(0, 5).map(getSafeCategoryLabel)}
        />

        <SummaryLine
          label="Màu sắc"
          items={colorTags.slice(0, 5)}
        />

        <SummaryLine
          label="Typography"
          items={typographyTags.slice(0, 5)}
        />

        <SummaryLine
          label="Layout"
          items={layoutTags.slice(0, 5)}
        />

        <SummaryLine
          label="Điểm mạnh visual"
          items={visualStrengths.slice(0, 6)}
          long
        />
      </div>
    </div>
  );
}

function SummaryLine({
  label,
  value,
  items,
  long = false,
}: {
  label: string;
  value?: string;
  items?: string[];
  long?: boolean;
}) {
  const cleanItems = uniqueTags(items ?? []).map(formatTagLabel).filter(Boolean);

  if (!value && cleanItems.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-2 rounded-2xl bg-white/75 p-4 ring-1 ring-blue-100 md:grid-cols-[160px_minmax(0,1fr)]">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">
        {label}
      </p>

      <div className="min-w-0">
        {value ? (
          <p className="text-sm font-semibold leading-6 text-slate-700">
            {value}
          </p>
        ) : null}

        {cleanItems.length > 0 ? (
          long ? (
            <div className="grid gap-2">
              {cleanItems.map((item) => (
                <p
                  key={item}
                  className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-medium leading-6 text-slate-700"
                >
                  {item}
                </p>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {cleanItems.map((item) => (
                <TagChip key={item}>{item}</TagChip>
              ))}
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}

function PortfolioPreviewCard({ item }: { item: PortfolioRow }) {
  const aiStatus = getAiAnalysisStatusView(item.ai_analysis_status);

  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-blue-100 bg-white">
      <div className="grid aspect-[4/3] place-items-center bg-blue-50">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt={item.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <ImageIcon className="size-10 text-blue-700" />
        )}
      </div>

      <div className="p-4">
        <div className="flex flex-wrap gap-2">
          <StatusPill tone="neutral">
            {getSafeCategoryLabel(item.category)}
          </StatusPill>

          {item.industry ? (
            <StatusPill tone="info">{getSafeIndustryLabel(item.industry)}</StatusPill>
          ) : null}

          <StatusPill tone={aiStatus.tone}>{aiStatus.label}</StatusPill>
        </div>

        <h3 className="mt-3 break-words text-lg font-extrabold tracking-[-0.035em] text-[#061a3a]">
          {item.title}
        </h3>

        {item.description ? (
          <p className="mt-2 line-clamp-3 text-sm font-medium leading-6 text-slate-600">
            {item.description}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {(item.ai_style_tags ?? []).slice(0, 5).map((tag) => (
            <TagChip key={tag}>{formatTagLabel(tag)}</TagChip>
          ))}
        </div>
      </div>
    </div>
  );
}

function TagPanel({
  title,
  icon,
  items,
  emptyText,
}: {
  title: string;
  icon: ReactNode;
  items: string[];
  emptyText: string;
}) {
  const realItems = uniqueTags(items).map(formatTagLabel).filter(Boolean);
  const shortItems = realItems.filter((item) => item.length <= 28);
  const longItems = realItems.filter((item) => item.length > 28);

  return (
    <div className="min-w-0 rounded-[1.15rem] border border-blue-100 bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-blue-600">
        {icon}
        {title}
      </div>

      {realItems.length > 0 ? (
        <div className="mt-3 grid gap-3">
          {shortItems.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {shortItems.slice(0, 12).map((item) => (
                <TagChip key={item}>{item}</TagChip>
              ))}
            </div>
          ) : null}

          {longItems.length > 0 ? (
            <div className="grid gap-2">
              {longItems.slice(0, 8).map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-blue-100 bg-blue-50/65 px-4 py-3 text-sm font-semibold leading-6 text-slate-700"
                >
                  {item}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
          {emptyText}
        </p>
      )}
    </div>
  );
}

function TagChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-left text-xs font-bold leading-5 text-slate-700">
      <span className="max-w-full whitespace-normal break-words">{children}</span>
    </span>
  );
}

function ChecklistItem({ checked, label }: { checked: boolean; label: string }) {
  return (
    <div className="flex items-start gap-2 rounded-2xl border border-blue-100 bg-blue-50/65 p-3">
      {checked ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
      ) : (
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
      )}

      <p className="text-sm font-bold leading-6 text-slate-700">{label}</p>
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

function EmptyState({
  title,
  description,
  href,
  buttonLabel,
}: {
  title: string;
  description: string;
  href: string;
  buttonLabel: string;
}) {
  return (
    <div className="mt-6 grid place-items-center rounded-[1.25rem] border border-blue-100 bg-blue-50/65 p-8 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-white text-blue-700 ring-1 ring-blue-100">
        <ImageIcon className="size-6" />
      </div>

      <h3 className="mt-5 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
        {title}
      </h3>

      <p className="mt-3 max-w-xl text-sm font-medium leading-7 text-slate-600">
        {description}
      </p>

      <Button
        asChild
        className="mt-6 rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61]"
      >
        <Link href={href}>{buttonLabel}</Link>
      </Button>
    </div>
  );
}

function getAiAnalysisStatusView(status: string | null) {
  if (status === "completed" || status === "success") {
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

function getVerificationLabel(status: string | null) {
  if (status === "approved" || status === "verified") return "Đã duyệt";
  if (status === "rejected") return "Từ chối";
  if (status === "in_review") return "Đang duyệt";
  return "Chờ duyệt";
}

function getVerificationTone(status: string | null) {
  if (status === "approved" || status === "verified") return "success" as const;
  if (status === "rejected") return "warning" as const;
  if (status === "in_review") return "info" as const;
  return "warning" as const;
}

function getAvailabilityLabel(status: string | null) {
  if (status === "available" || status === "open") return "Đang nhận job";
  if (status === "busy") return "Đang bận";
  if (status === "unavailable") return "Tạm nghỉ";
  return "Chưa rõ availability";
}

function getAvailabilityTone(status: string | null) {
  if (status === "available" || status === "open") return "success" as const;
  if (status === "busy") return "warning" as const;
  if (status === "unavailable") return "neutral" as const;
  return "neutral" as const;
}

function getSafeCategoryLabel(category: string) {
  try {
    return getCategoryLabel(category as Parameters<typeof getCategoryLabel>[0]);
  } catch {
    return formatTagLabel(category);
  }
}

function getSafeIndustryLabel(industry: string) {
  try {
    return getIndustryLabel(industry as Parameters<typeof getIndustryLabel>[0]);
  } catch {
    return formatTagLabel(industry);
  }
}

function uniqueTags(items: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const trimmed = String(item ?? "").trim();
    const key = trimmed.toLowerCase();

    if (!trimmed || seen.has(key)) continue;

    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

function formatTagLabel(value: string) {
  const raw = String(value ?? "").trim();

  if (!raw) return "";

  const normalized = raw
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return "";

  const hasVietnamese =
    /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(
      normalized,
    );

  if (hasVietnamese) {
    return toVietnameseSentenceCase(normalized);
  }

  return normalized
    .toLowerCase()
    .split(" ")
    .map((word) => {
      if (!word) return word;
      if (word === "ui") return "UI";
      if (word === "ux") return "UX";
      if (word === "ai") return "AI";
      if (word === "fnb") return "F&B";

      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function toVietnameseSentenceCase(value: string) {
  const lower = value.toLocaleLowerCase("vi-VN");
  return lower.charAt(0).toLocaleUpperCase("vi-VN") + lower.slice(1);
}