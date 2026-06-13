export type UserRole = "customer" | "designer" | "admin";

export type RequestStatus =
  | "draft"
  | "ai_processing"
  | "ready_to_match"
  | "matched"
  | "in_progress"
  | "completed"
  | "cancelled";

export type JobStatus =
  | "proposal_pending"
  | "payment_pending"
  | "active"
  | "reviewing"
  | "completed"
  | "disputed";

export type PaymentStatus =
  | "not_required"
  | "waiting_transfer"
  | "waiting_admin_confirm"
  | "confirmed"
  | "rejected";

export type DesignCategory =
  | "social_post"
  | "poster"
  | "logo"
  | "brand_identity"
  | "menu"
  | "banner"
  | "packaging";

export type VisualStyle =
  | "minimal"
  | "pastel"
  | "bold"
  | "editorial"
  | "premium"
  | "playful"
  | "retro"
  | "korean"
  | "local_warm";

export type BusinessIndustry =
  | "fnb"
  | "beauty"
  | "fashion"
  | "education"
  | "retail"
  | "service"
  | "other";

export type DesignerProfile = {
  id: string;
  displayName: string;
  avatarUrl?: string;
  headline: string;
  bio: string;
  location: string;
  industries: BusinessIndustry[];
  categories: DesignCategory[];
  styles: VisualStyle[];
  minBudgetVnd: number;
  maxBudgetVnd: number;
  responseTimeHours: number;
  rating: number;
  completedJobs: number;
  isVerified: boolean;
  availability: "available" | "limited" | "unavailable";
};

export type PortfolioItem = {
  id: string;
  designerId: string;
  title: string;
  industry: BusinessIndustry;
  category: DesignCategory;
  styles: VisualStyle[];
  imageUrl?: string;
  description: string;
  year: number;
};

export type DesignRequest = {
  id: string;
  customerId: string;
  title: string;
  businessName: string;
  industry: BusinessIndustry;
  category: DesignCategory;
  description: string;
  targetAudience: string;
  budgetMinVnd: number;
  budgetMaxVnd: number;
  deadline: string;
  preferredStyles: VisualStyle[];
  status: RequestStatus;
  createdAt: string;
};

export type AiBrief = {
  id: string;
  requestId: string;
  objective: string;
  visualDirection: string;
  keyMessage: string;
  deliverables: string[];
  recommendedStyles: VisualStyle[];
  riskLevel: "low" | "medium" | "high";
  riskNotes: string[];
  briefCompletenessScore: number;
};

export type DesignerMatch = {
  id: string;
  requestId: string;
  designerId: string;
  matchScore: number;
  tasteGap: number;
  reason: string;
  matchedPortfolioIds: string[];
};

export type Job = {
  id: string;
  requestId: string;
  customerId: string;
  designerId: string;
  title: string;
  status: JobStatus;
  agreedPriceVnd: number;
  startedAt?: string;
  dueAt: string;
};

export type Payment = {
  id: string;
  jobId: string;
  amountVnd: number;
  status: PaymentStatus;
  transferNote: string;
  adminNote?: string;
  confirmedAt?: string;
};