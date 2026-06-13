"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      toast.error("Đăng xuất thất bại", {
        description: error.message,
      });
      return;
    }

    toast.success("Đã đăng xuất.");
    router.push("/login");
    router.refresh();
  }

  return (
    <Button
      type="button"
      onClick={handleLogout}
      variant="outline"
      className="rounded-full border-blue-200 bg-white px-5 font-extrabold text-slate-800 shadow-sm hover:bg-blue-50 hover:text-blue-800"
    >
      <LogOut className="mr-2 size-4" />
      Đăng xuất
    </Button>
  );
}