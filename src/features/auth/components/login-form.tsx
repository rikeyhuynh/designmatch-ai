"use client";

import { Loader2, LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDashboardPathByRole } from "@/lib/auth/roles";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error("Đăng nhập thất bại", {
          description: error.message,
        });
        return;
      }

      const userId = data.user?.id;

      if (!userId) {
        toast.error("Không tìm thấy tài khoản sau khi đăng nhập.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (profileError) {
        toast.error("Không đọc được profile", {
          description: profileError.message,
        });
        return;
      }

      toast.success("Đăng nhập thành công.");
      router.push(getDashboardPathByRole(profile?.role));
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Mật khẩu</Label>
        <Input
          id="password"
          type="password"
          placeholder="Nhập mật khẩu"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="h-12 w-full rounded-2xl bg-[#061a3a] font-extrabold text-white hover:bg-[#0b2a61]"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Đang đăng nhập
          </>
        ) : (
          <>
            <LogIn className="mr-2 size-4" />
            Đăng nhập
          </>
        )}
      </Button>

      <p className="text-center text-sm font-medium text-slate-600">
        Chưa có tài khoản?{" "}
        <Link href="/register" className="font-extrabold text-blue-700">
          Đăng ký ngay
        </Link>
      </p>
    </form>
  );
}