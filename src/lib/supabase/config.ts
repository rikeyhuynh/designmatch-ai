type SupabaseKeySource = "publishable" | "anon" | "missing";
type SupabaseSecretKeySource = "secret" | "service_role" | "missing";

export type SupabaseConfigStatus = {
  isConfigured: boolean;
  hasUrl: boolean;
  hasPublicKey: boolean;
  hasSecretKey: boolean;
  keySource: SupabaseKeySource;
  secretKeySource: SupabaseSecretKeySource;
  urlPreview: string;
  message: string;
};

export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

export function getSupabasePublicKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ""
  );
}

export function getSupabaseSecretKey() {
  return (
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    ""
  );
}

export function getSupabaseKeySource(): SupabaseKeySource {
  if (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return "publishable";
  }

  if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return "anon";
  }

  return "missing";
}

export function getSupabaseSecretKeySource(): SupabaseSecretKeySource {
  if (process.env.SUPABASE_SECRET_KEY) {
    return "secret";
  }

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return "service_role";
  }

  return "missing";
}

export function getSupabaseConfigStatus(): SupabaseConfigStatus {
  const url = getSupabaseUrl();
  const publicKey = getSupabasePublicKey();
  const secretKey = getSupabaseSecretKey();
  const keySource = getSupabaseKeySource();
  const secretKeySource = getSupabaseSecretKeySource();

  const hasUrl = Boolean(url);
  const hasPublicKey = Boolean(publicKey);
  const hasSecretKey = Boolean(secretKey);

  const isConfigured =
    hasUrl &&
    hasPublicKey &&
    url.startsWith("https://") &&
    url.includes(".supabase.co") &&
    publicKey.length > 20;

  return {
    isConfigured,
    hasUrl,
    hasPublicKey,
    hasSecretKey,
    keySource,
    secretKeySource,
    urlPreview: hasUrl ? maskSupabaseUrl(url) : "Chưa cấu hình",
    message: isConfigured
      ? "Supabase environment đã sẵn sàng."
      : "Thiếu Supabase URL hoặc public key.",
  };
}

export function requireSupabaseConfig() {
  const url = getSupabaseUrl();
  const publicKey = getSupabasePublicKey();
  const status = getSupabaseConfigStatus();

  if (!status.isConfigured) {
    throw new Error(
      "Supabase chưa được cấu hình. Hãy kiểm tra NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY trong .env.local.",
    );
  }

  return {
    url,
    publicKey,
  };
}

export function requireSupabaseAdminConfig() {
  const url = getSupabaseUrl();
  const secretKey = getSupabaseSecretKey();

  if (!url || !secretKey) {
    throw new Error(
      "Thiếu Supabase admin config. Hãy kiểm tra NEXT_PUBLIC_SUPABASE_URL và SUPABASE_SECRET_KEY trong .env.local.",
    );
  }

  return {
    url,
    secretKey,
  };
}

function maskSupabaseUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname;
  } catch {
    return "URL không hợp lệ";
  }
}