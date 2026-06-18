import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Award,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
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
} from "lucide-react";
import type { ReactNode } from "react";

import { StatusPill } from "@/components/common/status-pill";
import { SurfaceCard } from "@/components/common/surface-card";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { CreatePortfolioItemForm } from "@/features/designer/portfolio/components/create-portfolio-item-form";
import { DeletePortfolioItemButton } from "@/features/designer/portfolio/components/delete-portfolio-item-button";
import { requireRole } from "@/lib/auth/guards";
import { getCategoryLabel, getIndustryLabel } from "@/lib/domain/labels";
import { formatDateVi } from "@/lib/format";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type DesignerProfileRow = {
  id: string;
  display_name: string;
  headline: string | null;
  rating: number | null;
  completed_jobs: number | null;
  response_time_hours: number | null;
  availability: string | null;
  verification_status: string | null;
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
  ai_analyzed_at: string | null;
  ai_style_tags: string[] | null;
  ai_industry_tags: string[] | null;
  ai_category_tags: string[] | null;
  ai_visual_summary: string | null;
  ai_confidence_score: number | null;
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
  status: string;
};

type ReviewRow = {
  id: string;
  rating: number;
};

export default async function DesignerPortfolioPage() {
  const authState = await requireRole(["designer"]);
  const profile = authState.profile;
  const designerProfile = authState.designerProfile;

  if (!profile || !designerProfile) {
    redirect("/auth-check");
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  const [
    designerResult,
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
        rating,
        completed_jobs,
        response_time_hours,
        availability,
        verification_status
      `,
      )
      .eq("id", designerProfile.id)
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
        ai_analyzed_at,
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
      .from("jobs")
      .select("id, status")
      .eq("designer_id", designerProfile.id),

    adminSupabase
      .from("job_reviews")
      .select("id, rating")
      .eq("designer_id", designerProfile.id),
  ]);

  const designer = designerResult.data as DesignerProfileRow | null;
  const portfolioItems = (portfolioResult.data ?? []) as unknown as PortfolioRow[];
  const styleDna = styleDnaResult.data as DesignerStyleDnaRow | null;
  const jobs = (jobsResult.data ?? []) as unknown as JobRow[];
  const reviews = (reviewsResult.data ?? []) as unknown as ReviewRow[];

  const displayName =
    designer?.display_name ?? designerProfile.display_name ?? "Designer";

  const headline = designer?.headline ?? designerProfile.headline ?? "Designer";

  const portfolioWithImages = portfolioItems.filter((item) =>
    Boolean(item.image_url),
  ).length;

  const portfolioWithoutImages = portfolioItems.length - portfolioWithImages;

  const analyzedPortfolioItems = portfolioItems.filter((item) =>
    ["completed", "success"].includes(item.ai_analysis_status ?? ""),
  );

  const failedPortfolioItems = portfolioItems.filter(
    (item) => item.ai_analysis_status === "failed",
  );

  const pendingPortfolioItems = portfolioItems.filter((item) =>
    ["not_started", "pending", "processing", null, undefined].includes(
      item.ai_analysis_status,
    ),
  );

  const uniqueCategories = uniqueTags(
    portfolioItems.map((item) => item.category).filter(Boolean),
  );

  const uniqueIndustries = uniqueTags(
    portfolioItems.map((item) => item.industry ?? "").filter(Boolean),
  );

  const liveStyleTags = uniqueTags(
    analyzedPortfolioItems.flatMap((item) => item.ai_style_tags ?? []),
  );

  const liveIndustryTags = uniqueTags(
    analyzedPortfolioItems.flatMap((item) => item.ai_industry_tags ?? []),
  );

  const liveCategoryTags = uniqueTags(
    analyzedPortfolioItems.flatMap((item) => item.ai_category_tags ?? []),
  );

  const activeJobs = jobs.filter((job) => job.status === "active").length;

  const completedJobs =
    jobs.filter((job) => job.status === "completed").length ||
    Number(designer?.completed_jobs ?? 0);

  const averageReviewRating =
    reviews.length > 0
      ? Math.round(
          (reviews.reduce((total, review) => total + review.rating, 0) /
            reviews.length) *
            10,
        ) / 10
      : Number(designer?.rating ?? 0);

  const dnaIsStale =
    Boolean(styleDna) &&
    Number(styleDna?.analyzed_portfolio_count ?? 0) !==
      analyzedPortfolioItems.length;

  const liveConfidence =
    analyzedPortfolioItems.length > 0
      ? Math.round(
          analyzedPortfolioItems.reduce(
            (total, item) => total + Number(item.ai_confidence_score ?? 0),
            0,
          ) / analyzedPortfolioItems.length,
        )
      : 0;

  const dnaConfidence = dnaIsStale
    ? liveConfidence
    : Number(styleDna?.confidence_score ?? liveConfidence);

  const analyzedCount = analyzedPortfolioItems.length;

  const styleTags =
    liveStyleTags.length > 0 ? liveStyleTags : styleDna?.style_tags ?? [];

  const industryTags =
    liveIndustryTags.length > 0
      ? liveIndustryTags
      : styleDna?.industry_tags ?? uniqueIndustries;

  const categoryTags =
    liveCategoryTags.length > 0
      ? liveCategoryTags
      : styleDna?.category_tags ?? uniqueCategories;

  return (
    <DashboardShell
      role="designer"
      title="Portfolio"
      description="Quản lý portfolio, AI analysis và Designer Style DNA dùng cho matching."
      userName={profile.full_name}
      userEmail={authState.userEmail}
    >
      <ErrorPanel
        errors={[
          designerResult.error?.message,
          portfolioResult.error?.message,
          styleDnaResult.error?.message,
          jobsResult.error?.message,
          reviewsResult.error?.message,
        ]}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Portfolio items"
          value={`${portfolioItems.length}`}
          description="Tổng sản phẩm portfolio hiện có"
          icon={<FileImage className="size-5" />}
          tone="dark"
        />

        <MetricCard
          label="AI analyzed"
          value={`${analyzedPortfolioItems.length}`}
          description="Portfolio đã được AI phân tích"
          icon={<Sparkles className="size-5" />}
          tone={analyzedPortfolioItems.length > 0 ? "success" : "normal"}
        />

        <MetricCard
          label="DNA confidence"
          value={
            analyzedPortfolioItems.length > 0 ? `${dnaConfidence}/100` : "Chưa có"
          }
          description="Độ tin cậy phân tích AI"
          icon={<Gauge className="size-5" />}
          tone={
            analyzedPortfolioItems.length > 0
              ? dnaConfidence >= 70
                ? "success"
                : "warning"
              : "normal"
          }
        />

        <MetricCard
          label="Rating"
          value={`${averageReviewRating.toFixed(1)}/5`}
          description="Rating hiện tại của hồ sơ"
          icon={<Star className="size-5 fill-current" />}
          tone="warning"
        />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)] xl:items-start">
        <div className="grid min-w-0 gap-5 xl:sticky xl:top-28">
          <SurfaceCard className="p-6">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
              Portfolio workspace
            </p>

            <h2 className="mt-3 break-words text-3xl font-extrabold tracking-[-0.055em] text-[#061a3a]">
              {displayName}
            </h2>

            <p className="mt-2 text-sm font-bold text-blue-700">{headline}</p>

            <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
              Portfolio là dữ liệu chính để AI hiểu phong cách thiết kế, ngành
              phù hợp và mức độ match của bạn với từng brief khách hàng.
            </p>

            <div className="mt-5 grid gap-3">
              <SignalBox
                icon={<CheckCircle2 className="size-4" />}
                label="Completed jobs"
                value={`${completedJobs} job hoàn thành`}
              />

              <SignalBox
                icon={<BriefcaseBusiness className="size-4" />}
                label="Active jobs"
                value={`${activeJobs} job đang làm`}
              />

              <SignalBox
                icon={<ImageIcon className="size-4" />}
                label="Missing images"
                value={`${portfolioWithoutImages} item chưa có ảnh`}
                tone={portfolioWithoutImages > 0 ? "warning" : "normal"}
              />
            </div>

            <div className="mt-5">
              <Button
                asChild
                variant="outline"
                className="rounded-full border-blue-200 bg-white font-extrabold"
              >
                <Link href="/designer/profile">
                  Xem hồ sơ designer
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
          </SurfaceCard>

          <CreatePortfolioItemForm />
        </div>

        <StyleDnaDashboard
          styleDna={styleDna}
          dnaIsStale={dnaIsStale}
          analyzedCount={analyzedCount}
          pendingCount={pendingPortfolioItems.length}
          failedCount={failedPortfolioItems.length}
          portfolioCount={portfolioItems.length}
          dnaConfidence={dnaConfidence}
          styleTags={styleTags}
          industryTags={industryTags}
          categoryTags={categoryTags}
          moodTags={styleDna?.common_moods ?? []}
          colorTags={styleDna?.color_preferences ?? []}
          typographyTags={styleDna?.typography_preferences ?? []}
          layoutTags={styleDna?.layout_preferences ?? []}
          visualStrengths={styleDna?.visual_strengths ?? []}
        />
      </section>

      <section className="mt-5">
        <SurfaceCard className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Portfolio list
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Danh sách portfolio
              </h2>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-600">
                Mỗi portfolio giữ dữ liệu style riêng. Khi xóa một portfolio,
                các style của portfolio đó sẽ không còn được tính vào Style DNA
                tổng hợp.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusPill tone="info">{`${portfolioItems.length} items`}</StatusPill>
              <StatusPill tone="success">{`${analyzedPortfolioItems.length} analyzed`}</StatusPill>
              {failedPortfolioItems.length > 0 ? (
                <StatusPill tone="warning">{`${failedPortfolioItems.length} failed`}</StatusPill>
              ) : null}
            </div>
          </div>

          {portfolioItems.length === 0 ? (
            <EmptyState
              title="Chưa có portfolio item."
              description="Hãy dùng form bên trái để thêm portfolio đầu tiên. Portfolio có ảnh sẽ được AI phân tích để tạo Designer Style DNA."
            />
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {portfolioItems.map((item) => (
                <PortfolioCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </SurfaceCard>
      </section>

      <section className="mt-5">
        <SurfaceCard className="p-6">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
            Portfolio categories
          </p>

          <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
            Nhóm thiết kế đang có
          </h2>

          {uniqueCategories.length === 0 ? (
            <p className="mt-5 text-sm font-medium leading-7 text-slate-600">
              Chưa có category nào vì bạn chưa có portfolio item.
            </p>
          ) : (
            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {uniqueCategories.map((category) => {
                const count = portfolioItems.filter(
                  (item) => item.category === category,
                ).length;

                return (
                  <div
                    key={category}
                    className="rounded-[1.15rem] border border-blue-100 bg-blue-50/65 p-4"
                  >
                    <TagChip>{getSafeCategoryLabel(category)}</TagChip>

                    <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                      {`${count} portfolio item`}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </SurfaceCard>
      </section>
    </DashboardShell>
  );
}

function StyleDnaDashboard({
  styleDna,
  dnaIsStale,
  analyzedCount,
  pendingCount,
  failedCount,
  portfolioCount,
  dnaConfidence,
  styleTags,
  industryTags,
  categoryTags,
  moodTags,
  colorTags,
  typographyTags,
  layoutTags,
  visualStrengths,
}: {
  styleDna: DesignerStyleDnaRow | null;
  dnaIsStale: boolean;
  analyzedCount: number;
  pendingCount: number;
  failedCount: number;
  portfolioCount: number;
  dnaConfidence: number;
  styleTags: string[];
  industryTags: string[];
  categoryTags: string[];
  moodTags: string[];
  colorTags: string[];
  typographyTags: string[];
  layoutTags: string[];
  visualStrengths: string[];
}) {
  if (analyzedCount === 0) {
    return (
      <SurfaceCard className="border-blue-100 bg-white p-6">
        <div className="flex items-start gap-3">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
            <Sparkles className="size-5" />
          </div>

          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
              AI Style DNA
            </p>

            <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.055em] text-[#061a3a]">
              Chưa có Style DNA
            </h2>

            <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
              Hãy upload ít nhất một portfolio có ảnh. Sau khi AI phân tích, hệ
              thống sẽ tạo Style DNA gồm style, mood, màu sắc, typography,
              layout và điểm mạnh thị giác của bạn.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <SignalBox
                icon={<FileImage className="size-4" />}
                label="Portfolio"
                value={`${portfolioCount} item`}
              />

              <SignalBox
                icon={<Sparkles className="size-4" />}
                label="Analyzed"
                value={`${analyzedCount} item`}
              />

              <SignalBox
                icon={<CircleAlert className="size-4" />}
                label="Pending"
                value={`${pendingCount} item`}
                tone={pendingCount > 0 ? "warning" : "normal"}
              />
            </div>
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
            <p className="text-sm font-black uppercase tracking-[0.22em] text-sky-200/70">
              AI Style DNA
            </p>

            <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.055em] text-white">
              Hồ sơ phong cách thị giác
            </h2>

            <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-white/72">
              Style DNA được tổng hợp từ các portfolio hiện còn trong hồ sơ.
              Mỗi portfolio vẫn giữ style riêng; Style DNA chỉ là lớp tổng hợp
              để phục vụ matching.
            </p>
          </div>

          <div className="rounded-[1.25rem] border border-white/10 bg-white/10 px-5 py-4 text-center">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-200/75">
              AI confidence
            </p>

            <p className="mt-2 text-5xl font-black tracking-[-0.08em] text-white">
              {dnaConfidence}
            </p>

            <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-white/50">
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

        <div className="grid gap-3 md:grid-cols-4">
          <SignalBox
            icon={<FileImage className="size-4" />}
            label="Portfolio"
            value={`${portfolioCount} item`}
          />

          <SignalBox
            icon={<Sparkles className="size-4" />}
            label="Analyzed"
            value={`${analyzedCount} portfolio`}
          />

          <SignalBox
            icon={<CircleAlert className="size-4" />}
            label="Pending"
            value={`${pendingCount} portfolio`}
            tone={pendingCount > 0 ? "warning" : "normal"}
          />

          <SignalBox
            icon={<CircleAlert className="size-4" />}
            label="Failed"
            value={`${failedCount} portfolio`}
            tone={failedCount > 0 ? "warning" : "normal"}
          />
        </div>

        <DnaSummaryPanel
          analyzedCount={analyzedCount}
          styleTags={styleTags}
          industryTags={industryTags}
          categoryTags={categoryTags}
          moodTags={moodTags}
          colorTags={colorTags}
          typographyTags={typographyTags}
          layoutTags={layoutTags}
          visualStrengths={visualStrengths}
        />

        <div className="grid gap-4 xl:grid-cols-2">
          <TagPanel
            title="Phong cách chính"
            icon={<Tags className="size-4" />}
            items={styleTags}
            emptyText="Chưa có style tag."
          />

          <TagPanel
            title="Mood nổi bật"
            icon={<Sparkles className="size-4" />}
            items={moodTags}
            emptyText="Chưa có mood nổi bật."
          />

          <TagPanel
            title="Điểm mạnh thị giác"
            icon={<Award className="size-4" />}
            items={visualStrengths}
            emptyText="Chưa có điểm mạnh thị giác."
          />

          <TagPanel
            title="Màu sắc thường dùng"
            icon={<Palette className="size-4" />}
            items={colorTags}
            emptyText="Chưa có dữ liệu màu sắc."
          />

          <TagPanel
            title="Typography"
            icon={<Type className="size-4" />}
            items={typographyTags}
            emptyText="Chưa có dữ liệu typography."
          />

          <TagPanel
            title="Layout"
            icon={<Layers3 className="size-4" />}
            items={layoutTags}
            emptyText="Chưa có dữ liệu layout."
          />

          <TagPanel
            title="Ngành phù hợp"
            icon={<Store className="size-4" />}
            items={industryTags.map(getSafeIndustryLabel)}
            emptyText="Chưa có ngành phù hợp."
          />

          <TagPanel
            title="Category phù hợp"
            icon={<Palette className="size-4" />}
            items={categoryTags.map(getSafeCategoryLabel)}
            emptyText="Chưa có category phù hợp."
          />
        </div>

        <div className="rounded-[1.15rem] border border-blue-100 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-blue-600">
            <CalendarDays className="size-4" />
            Cập nhật gần nhất
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
          label="Phong cách"
          items={styleTags.slice(0, 5)}
        />

        <SummaryLine
          label="Mood"
          items={moodTags.slice(0, 5)}
        />

        <SummaryLine
          label="Ngành"
          items={industryTags.slice(0, 5).map(getSafeIndustryLabel)}
        />

        <SummaryLine
          label="Hạng mục"
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
    <div className="grid gap-2 rounded-2xl bg-white/75 p-4 ring-1 ring-blue-100 md:grid-cols-[130px_minmax(0,1fr)]">
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

function PortfolioCard({ item }: { item: PortfolioRow }) {
  const aiStatus = getAiAnalysisStatusView(item.ai_analysis_status);

  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-blue-100 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
      <div className="grid aspect-[4/3] place-items-center bg-blue-50">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt={item.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid place-items-center text-center">
            <ImageIcon className="mx-auto size-12 text-blue-700" />
            <p className="mt-3 text-sm font-bold text-blue-700">
              Chưa có ảnh preview
            </p>
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex flex-wrap gap-2">
          <StatusPill tone="neutral">
            {getSafeCategoryLabel(item.category)}
          </StatusPill>

          {item.industry ? (
            <StatusPill tone="info">{getSafeIndustryLabel(item.industry)}</StatusPill>
          ) : null}

          <StatusPill tone={aiStatus.tone}>{aiStatus.label}</StatusPill>
        </div>

        <h3 className="mt-4 break-words text-xl font-extrabold tracking-[-0.04em] text-[#061a3a]">
          {item.title}
        </h3>

        {item.description ? (
          <p className="mt-3 line-clamp-4 text-sm font-medium leading-7 text-slate-600">
            {item.description}
          </p>
        ) : (
          <p className="mt-3 text-sm font-medium leading-7 text-slate-500">
            Portfolio item này chưa có mô tả.
          </p>
        )}

        {item.ai_visual_summary ? (
          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/65 p-4">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-blue-600">
              <Sparkles className="size-4" />
              AI visual summary
            </div>

            <p className="mt-2 line-clamp-6 whitespace-pre-wrap break-words text-sm font-medium leading-7 text-slate-700">
              {item.ai_visual_summary}
            </p>
          </div>
        ) : null}

        <div className="mt-5 grid gap-3">
          <TagPanel
            title="AI style tags"
            icon={<Tags className="size-4" />}
            items={item.ai_style_tags ?? []}
            emptyText="Chưa có tag AI."
            compact
          />

          <TagPanel
            title="AI industry/category"
            icon={<Store className="size-4" />}
            items={[
              ...(item.ai_industry_tags ?? []).map(getSafeIndustryLabel),
              ...(item.ai_category_tags ?? []).map(getSafeCategoryLabel),
            ]}
            emptyText="Chưa có tag ngành/category."
            compact
          />
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/65 p-4">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-blue-600">
              <Gauge className="size-4" />
              AI confidence
            </div>

            <p className="mt-2 text-sm font-extrabold leading-6 text-[#061a3a]">
              {Number(item.ai_confidence_score ?? 0)}/100
            </p>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/65 p-4">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-blue-600">
              <CalendarDays className="size-4" />
              Created
            </div>

            <p className="mt-2 text-sm font-extrabold leading-6 text-[#061a3a]">
              {formatDateVi(item.created_at)}
            </p>
          </div>
        </div>

        {item.ai_analyzed_at ? (
          <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
            AI analyzed: {formatDateVi(item.ai_analyzed_at)}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <DeletePortfolioItemButton
            portfolioId={item.id}
            portfolioTitle={item.title}
          />
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
  compact = false,
}: {
  title: string;
  icon: ReactNode;
  items: string[];
  emptyText: string;
  compact?: boolean;
}) {
  const realItems = uniqueTags(items).map(formatTagLabel).filter(Boolean);
  const shortItems = realItems.filter((item) => item.length <= 28);
  const longItems = realItems.filter((item) => item.length > 28);

  return (
    <div
      className={`min-w-0 rounded-[1.15rem] border border-blue-100 bg-white ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-blue-600">
        {icon}
        {title}
      </div>

      {realItems.length > 0 ? (
        <div className="mt-3 grid gap-3">
          {shortItems.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {shortItems.slice(0, compact ? 8 : 12).map((item) => (
                <TagChip key={item}>{item}</TagChip>
              ))}
            </div>
          ) : null}

          {longItems.length > 0 ? (
            <div className="grid gap-2">
              {longItems.slice(0, compact ? 4 : 8).map((item) => (
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
        <FileImage className="size-6" />
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