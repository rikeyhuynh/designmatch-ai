import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileImage,
  Palette,
  ShieldCheck,
  Sparkles,
  Star,
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
  image_url: string | null;
};

type JobRow = {
  id: string;
  designer_id: string;
  status: string;
  agreed_price_vnd: number;
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

  const [designersResult, portfolioResult, jobsResult, reviewsResult] =
    await Promise.all([
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
        .select("id, designer_id, image_url"),

      adminSupabase
        .from("jobs")
        .select("id, designer_id, status, agreed_price_vnd"),

      adminSupabase
        .from("job_reviews")
        .select("id, designer_id, rating"),
    ]);

  const designers = (designersResult.data ?? []) as unknown as DesignerRow[];
  const portfolioItems = (portfolioResult.data ??
    []) as unknown as PortfolioRow[];
  const jobs = (jobsResult.data ?? []) as unknown as JobRow[];
  const reviews = (reviewsResult.data ?? []) as unknown as ReviewRow[];

  const approvedDesigners = designers.filter((designer) =>
    ["approved", "verified"].includes(String(designer.verification_status)),
  );

  const pendingDesigners = designers.filter((designer) =>
    [null, undefined, "", "pending", "in_review"].includes(
      designer.verification_status,
    ),
  );

  const rejectedDesigners = designers.filter(
    (designer) => designer.verification_status === "rejected",
  );

  const totalDesignerRevenue = jobs.reduce((total, job) => {
    if (["active", "completed"].includes(job.status)) {
      return total + Number(job.agreed_price_vnd ?? 0);
    }

    return total;
  }, 0);

  return (
    <DashboardShell
      role="admin"
      title="Designers"
      description="Duyệt hồ sơ designer, kiểm tra portfolio, rating và tín hiệu hoạt động."
      userName={profile.full_name}
      userEmail={authState.userEmail}
    >
      <ErrorPanel
        errors={[
          designersResult.error?.message,
          portfolioResult.error?.message,
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
          label="Approved"
          value={`${approvedDesigners.length}`}
          description="Designer đã được duyệt"
          icon={<CheckCircle2 className="size-5" />}
          tone="success"
        />

        <MetricCard
          label="Pending"
          value={`${pendingDesigners.length}`}
          description="Designer đang chờ duyệt"
          icon={<Clock3 className="size-5" />}
          tone={pendingDesigners.length > 0 ? "warning" : "normal"}
        />

        <MetricCard
          label="Tracked value"
          value={formatCurrencyVnd(totalDesignerRevenue)}
          description="Tổng giá trị job designer đã nhận"
          icon={<WalletCards className="size-5" />}
        />
      </section>

      <section className="mt-5">
        <SurfaceCard className="p-6">
          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr] xl:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Designer control center
              </p>

              <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.055em] text-[#061a3a]">
                Quản lý chất lượng designer
              </h2>

              <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-slate-600">
                Admin dùng trang này để kiểm tra hồ sơ designer, số lượng
                portfolio, rating, job đã nhận và quyết định duyệt hoặc từ chối
                designer.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  asChild
                  className="rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61]"
                >
                  <Link href="/admin/jobs">
                    Xem jobs
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="rounded-full border-blue-200 bg-white font-extrabold"
                >
                  <Link href="/admin/reviews">
                    Xem reviews
                    <Star className="ml-2 size-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <SignalBox
                icon={<ShieldCheck className="size-4" />}
                label="Approved"
                value={`${approvedDesigners.length} designer`}
              />

              <SignalBox
                icon={<Clock3 className="size-4" />}
                label="Pending"
                value={`${pendingDesigners.length} chờ duyệt`}
                tone={pendingDesigners.length > 0 ? "warning" : "normal"}
              />

              <SignalBox
                icon={<Sparkles className="size-4" />}
                label="Rejected"
                value={`${rejectedDesigners.length} bị từ chối`}
                tone={rejectedDesigners.length > 0 ? "warning" : "normal"}
              />
            </div>
          </div>
        </SurfaceCard>
      </section>

      <section className="mt-5">
        <SurfaceCard className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-600">
                Designer list
              </p>

              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
                Danh sách designer
              </h2>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-600">
                Xem toàn bộ designer trong hệ thống và xử lý trạng thái xác minh
                hồ sơ.
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

                return (
                  <DesignerCard
                    key={designer.id}
                    designer={designer}
                    portfolioCount={designerPortfolio.length}
                    portfolioWithImages={designerPortfolio.filter((item) =>
                      Boolean(item.image_url),
                    ).length}
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
  portfolioCount,
  portfolioWithImages,
  jobs,
  reviews,
}: {
  designer: DesignerRow;
  portfolioCount: number;
  portfolioWithImages: number;
  jobs: JobRow[];
  reviews: ReviewRow[];
}) {
  const completedJobs = jobs.filter((job) => job.status === "completed").length;
  const activeJobs = jobs.filter((job) => job.status === "active").length;

  const trackedValue = jobs.reduce((total, job) => {
    if (["active", "completed"].includes(job.status)) {
      return total + Number(job.agreed_price_vnd ?? 0);
    }

    return total;
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

  return (
    <div className="rounded-[1.35rem] border border-blue-100 bg-blue-50/65 p-5">
      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={getVerificationTone(designer.verification_status)}>
              {getVerificationLabel(designer.verification_status)}
            </StatusPill>

            <StatusPill tone={getAvailabilityTone(designer.availability)}>
              {getAvailabilityLabel(designer.availability)}
            </StatusPill>

            <RatingPill rating={averageRating} />
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

        <div className="shrink-0">
          <p className="text-right text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            {`Created ${formatDateVi(designer.created_at)}`}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <InfoBox
          icon={<FileImage className="size-4" />}
          label="Portfolio"
          value={`${portfolioCount} items / ${portfolioWithImages} có ảnh`}
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
        <div className="rounded-[1.15rem] border border-blue-100 bg-white p-5">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-blue-600">
            <Sparkles className="size-4" />
            Specialties
          </div>

          {specialties.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {specialties.map((item) => (
                <StatusPill key={item} tone="neutral">
                  {item}
                </StatusPill>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm font-medium leading-7 text-slate-500">
              Chưa có specialties.
            </p>
          )}
        </div>

        <div className="rounded-[1.15rem] border border-blue-100 bg-white p-5">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-blue-600">
            <Palette className="size-4" />
            Visual styles
          </div>

          {styles.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {styles.map((item) => (
                <StatusPill key={item} tone="neutral">
                  {item}
                </StatusPill>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm font-medium leading-7 text-slate-500">
              Chưa có visual styles.
            </p>
          )}
        </div>
      </div>

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

          <div className="text-left md:text-right">
            <p className="text-sm font-black text-[#061a3a]">
              {formatCurrencyVnd(trackedValue)}
            </p>

            <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Tracked job value
            </p>
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
  return "Chưa rõ";
}

function getAvailabilityTone(status: string | null) {
  if (status === "available" || status === "open") return "success" as const;
  if (status === "busy") return "warning" as const;
  if (status === "unavailable") return "neutral" as const;
  return "neutral" as const;
}