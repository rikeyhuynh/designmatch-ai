import type {
  BusinessIndustry,
  DesignCategory,
  VisualStyle,
} from "@/types/supabase";
import {
  getCategoryLabel,
  getIndustryLabel,
  getStyleLabel,
} from "@/lib/domain/labels";
import { formatCurrencyVnd } from "@/lib/format";

export type MatchingRequestInput = {
  id: string;
  industry: BusinessIndustry;
  category: DesignCategory;
  budget_min_vnd: number;
  budget_max_vnd: number;
  preferred_styles: VisualStyle[];
};

export type MatchingAiBriefInput = {
  recommended_styles: VisualStyle[];
  brief_completeness_score: number;
};

export type MatchingDesignerInput = {
  id: string;
  display_name: string;
  headline: string | null;
  industries: BusinessIndustry[];
  categories: DesignCategory[];
  styles: VisualStyle[];
  min_budget_vnd: number;
  max_budget_vnd: number;
  rating: number;
  completed_jobs: number;
  response_time_hours: number;
  portfolio_items: Array<{
    id: string;
    title: string;
    industry: BusinessIndustry;
    category: DesignCategory;
    styles: VisualStyle[];
  }>;
};

export type DesignerMatchResult = {
  designer_id: string;
  match_score: number;
  taste_gap: number;
  reason: string;
  matched_portfolio_ids: string[];
};

export function buildDesignerMatches({
  request,
  brief,
  designers,
}: {
  request: MatchingRequestInput;
  brief: MatchingAiBriefInput | null;
  designers: MatchingDesignerInput[];
}): DesignerMatchResult[] {
  const targetStyles = uniqueValues([
    ...request.preferred_styles,
    ...(brief?.recommended_styles ?? []),
  ]);

  return designers
    .map((designer) => {
      const styleScore = calculateStyleScore(targetStyles, designer.styles);
      const categoryScore = designer.categories.includes(request.category)
        ? 22
        : 6;
      const industryScore = designer.industries.includes(request.industry)
        ? 18
        : 5;
      const budgetScore = calculateBudgetScore({
        requestMin: request.budget_min_vnd,
        requestMax: request.budget_max_vnd,
        designerMin: designer.min_budget_vnd,
        designerMax: designer.max_budget_vnd,
      });
      const trustScore = calculateTrustScore({
        rating: designer.rating,
        completedJobs: designer.completed_jobs,
        responseTimeHours: designer.response_time_hours,
      });

      const matchedPortfolios = designer.portfolio_items
        .map((portfolio) => {
          const portfolioStyleScore = calculateStyleScore(
            targetStyles,
            portfolio.styles,
          );

          const portfolioCategoryScore =
            portfolio.category === request.category ? 12 : 0;

          const portfolioIndustryScore =
            portfolio.industry === request.industry ? 10 : 0;

          return {
            ...portfolio,
            score:
              portfolioStyleScore +
              portfolioCategoryScore +
              portfolioIndustryScore,
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 2);

      const matchScore = clampScore(
        styleScore + categoryScore + industryScore + budgetScore + trustScore,
      );

      const tasteGap = clampScore(100 - styleScore * 2);

      return {
        designer_id: designer.id,
        match_score: matchScore,
        taste_gap: tasteGap,
        reason: buildReason({
          request,
          designer,
          targetStyles,
          styleScore,
          categoryScore,
          industryScore,
          budgetScore,
        }),
        matched_portfolio_ids: matchedPortfolios.map(
          (portfolio) => portfolio.id,
        ),
      };
    })
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, 5);
}

function calculateStyleScore(
  targetStyles: VisualStyle[],
  designerStyles: VisualStyle[],
) {
  if (targetStyles.length === 0) {
    return 15;
  }

  const matchedStyles = targetStyles.filter((style) =>
    designerStyles.includes(style),
  );

  return Math.round((matchedStyles.length / targetStyles.length) * 30);
}

function calculateBudgetScore({
  requestMin,
  requestMax,
  designerMin,
  designerMax,
}: {
  requestMin: number;
  requestMax: number;
  designerMin: number;
  designerMax: number;
}) {
  const overlaps = requestMax >= designerMin && requestMin <= designerMax;

  if (overlaps) {
    return 18;
  }

  const isSlightlyBelow = requestMax >= designerMin * 0.75;

  if (isSlightlyBelow) {
    return 9;
  }

  return 2;
}

function calculateTrustScore({
  rating,
  completedJobs,
  responseTimeHours,
}: {
  rating: number;
  completedJobs: number;
  responseTimeHours: number;
}) {
  const ratingScore = Math.round((rating / 5) * 6);
  const jobScore = completedJobs >= 20 ? 4 : completedJobs >= 10 ? 3 : 1;
  const responseScore = responseTimeHours <= 12 ? 2 : responseTimeHours <= 24 ? 1 : 0;

  return ratingScore + jobScore + responseScore;
}

function buildReason({
  request,
  designer,
  targetStyles,
  styleScore,
  categoryScore,
  industryScore,
  budgetScore,
}: {
  request: MatchingRequestInput;
  designer: MatchingDesignerInput;
  targetStyles: VisualStyle[];
  styleScore: number;
  categoryScore: number;
  industryScore: number;
  budgetScore: number;
}) {
  const matchedStyles = targetStyles.filter((style) =>
    designer.styles.includes(style),
  );

  const styleText =
    matchedStyles.length > 0
      ? matchedStyles.map(getStyleLabel).join(", ")
      : "một phần phong cách gần với brief";

  const categoryText = getCategoryLabel(request.category);
  const industryText = getIndustryLabel(request.industry);

  const reasons: string[] = [];

  if (styleScore >= 18) {
    reasons.push(`phù hợp gu thị giác ${styleText}`);
  }

  if (categoryScore >= 20) {
    reasons.push(`có kinh nghiệm với ${categoryText}`);
  }

  if (industryScore >= 15) {
    reasons.push(`hiểu ngành ${industryText}`);
  }

  if (budgetScore >= 15) {
    reasons.push(
      `mức giá phù hợp ngân sách ${formatCurrencyVnd(
        request.budget_min_vnd,
      )} - ${formatCurrencyVnd(request.budget_max_vnd)}`,
    );
  }

  if (reasons.length === 0) {
    reasons.push("có portfolio và profile đủ dữ liệu để cân nhắc");
  }

  return `${designer.display_name} được đề xuất vì ${reasons.join(
    ", ",
  )}.`;
}

function uniqueValues<T>(items: T[]) {
  return Array.from(new Set(items));
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}