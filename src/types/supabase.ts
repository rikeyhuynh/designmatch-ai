export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole = "customer" | "designer" | "admin";

export type BusinessIndustry =
  | "fnb"
  | "beauty"
  | "fashion"
  | "education"
  | "retail"
  | "service"
  | "other";

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

export type VerificationStatus = "pending" | "approved" | "rejected";

export type DesignerAvailability = "available" | "limited" | "unavailable";

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

type GenericRow = {
  id: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: Json | Json[] | string | number | boolean | null | undefined;
};

type GenericTable = {
  Row: GenericRow;
  Insert: Partial<GenericRow>;
  Update: Partial<GenericRow>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: GenericTable;
      customer_profiles: GenericTable;
      designer_profiles: GenericTable;
      portfolio_items: GenericTable;
      design_requests: GenericTable;
      ai_briefs: GenericTable;
      designer_matches: GenericTable;
      jobs: GenericTable;
      payments: GenericTable;
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_request_owner: {
        Args: {
          target_request_id: string;
        };
        Returns: boolean;
      };
      is_designer_owner: {
        Args: {
          target_designer_id: string;
        };
        Returns: boolean;
      };
      set_updated_at: {
        Args: Record<string, never>;
        Returns: unknown;
      };
    };
    Enums: {
      app_role: AppRole;
      business_industry: BusinessIndustry;
      design_category: DesignCategory;
      visual_style: VisualStyle;
      verification_status: VerificationStatus;
      designer_availability: DesignerAvailability;
      request_status: RequestStatus;
      job_status: JobStatus;
      payment_status: PaymentStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};