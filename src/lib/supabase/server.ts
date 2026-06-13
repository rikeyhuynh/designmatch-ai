import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { requireSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/types/supabase";

export async function createSupabaseServerClient() {
  const { url, publicKey } = requireSupabaseConfig();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, publicKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components không phải lúc nào cũng được phép set cookie.
          // Auth middleware sẽ xử lý phần này ở bước sau.
        }
      },
    },
  });
}