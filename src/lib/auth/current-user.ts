import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CurrentUserProfile = {
  id: string;
  role: "customer" | "designer" | "admin";
  full_name: string;
  avatar_url: string | null;
  created_at: string;
};

export type CurrentCustomerProfile = {
  id: string;
  profile_id: string;
  business_name: string | null;
  business_industry: string | null;
  location: string | null;
};

export type CurrentDesignerProfile = {
  id: string;
  profile_id: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
  verification_status: string;
  availability: string;
};

export type CurrentAuthState = {
  isAuthenticated: boolean;
  userEmail: string | null;
  userId: string | null;
  profile: CurrentUserProfile | null;
  customerProfile: CurrentCustomerProfile | null;
  designerProfile: CurrentDesignerProfile | null;
  error: string | null;
};

export async function getCurrentAuthState(): Promise<CurrentAuthState> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return {
      isAuthenticated: false,
      userEmail: null,
      userId: null,
      profile: null,
      customerProfile: null,
      designerProfile: null,
      error: userError.message,
    };
  }

  if (!user) {
    return {
      isAuthenticated: false,
      userEmail: null,
      userId: null,
      profile: null,
      customerProfile: null,
      designerProfile: null,
      error: null,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, full_name, avatar_url, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return {
      isAuthenticated: true,
      userEmail: user.email ?? null,
      userId: user.id,
      profile: null,
      customerProfile: null,
      designerProfile: null,
      error: profileError.message,
    };
  }

  let customerProfile: CurrentCustomerProfile | null = null;
  let designerProfile: CurrentDesignerProfile | null = null;

  if (profile?.role === "customer") {
    const { data, error } = await supabase
      .from("customer_profiles")
      .select("id, profile_id, business_name, business_industry, location")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (error) {
      return {
        isAuthenticated: true,
        userEmail: user.email ?? null,
        userId: user.id,
        profile: profile as CurrentUserProfile,
        customerProfile: null,
        designerProfile: null,
        error: error.message,
      };
    }

    customerProfile = data as CurrentCustomerProfile | null;
  }

  if (profile?.role === "designer") {
    const { data, error } = await supabase
      .from("designer_profiles")
      .select(
        "id, profile_id, display_name, headline, bio, verification_status, availability",
      )
      .eq("profile_id", user.id)
      .maybeSingle();

    if (error) {
      return {
        isAuthenticated: true,
        userEmail: user.email ?? null,
        userId: user.id,
        profile: profile as CurrentUserProfile,
        customerProfile: null,
        designerProfile: null,
        error: error.message,
      };
    }

    designerProfile = data as CurrentDesignerProfile | null;
  }

  return {
    isAuthenticated: true,
    userEmail: user.email ?? null,
    userId: user.id,
    profile: profile as CurrentUserProfile | null,
    customerProfile,
    designerProfile,
    error: null,
  };
}