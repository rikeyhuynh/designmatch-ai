"use client";

import { Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  authRoleOptions,
  AuthRole,
  getDashboardPathByRole,
} from "@/lib/auth/roles";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function RegisterForm() {
  const router = useRouter();

  const [role, setRole] = useState<AuthRole>("customer");
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
            full_name: fullName,
            display_name: fullName,
            business_name: businessName,
            headline,
            bio,
          },
        },
      });

      if (error) {
        toast.error("Đăng ký thất bại", {
          description: error.message,
        });
        return;
      }

      if (!data.session) {
        toast.success("Tài khoản đã được tạo", {
          description:
            "Nếu Supabase đang bật xác nhận email, hãy kiểm tra email để xác nhận trước khi đăng nhập.",
        });
        router.push("/login");
        return;
      }

      toast.success("Đăng ký thành công.");
      router.push(getDashboardPathByRole(role));
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label>Loại tài khoản</Label>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {authRoleOptions.map((option) => {
            const isActive = role === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setRole(option.id)}
                className={`rounded-[1.25rem] border p-4 text-left transition ${
                  isActive
                    ? "border-blue-500 bg-blue-50 shadow-[0_16px_40px_rgba(37,99,235,0.14)]"
                    : "border-blue-100 bg-white hover:bg-blue-50/60"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-extrabold tracking-[-0.03em] text-[#061a3a]">
                    {option.label}
                  </p>

                  {isActive ? (
                    <StatusPill tone="success">Selected</StatusPill>
                  ) : null}
                </div>

                <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                  {option.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fullName">Họ và tên</Label>
          <Input
            id="fullName"
            placeholder="Nguyễn Văn A"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
          />
        </div>

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
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Mật khẩu</Label>
        <Input
          id="password"
          type="password"
          placeholder="Tối thiểu 6 ký tự"
          minLength={6}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>

      {role === "customer" ? (
        <div className="space-y-2">
          <Label htmlFor="businessName">Tên thương hiệu / cửa hàng</Label>
          <Input
            id="businessName"
            placeholder="Ví dụ: Mây Milk Tea"
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
          />
        </div>
      ) : null}

      {role === "designer" ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="headline">Headline chuyên môn</Label>
            <Input
              id="headline"
              placeholder="Ví dụ: Brand & Social Designer cho F&B local"
              value={headline}
              onChange={(event) => setHeadline(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Mô tả ngắn</Label>
            <Textarea
              id="bio"
              placeholder="Mô tả phong cách, kinh nghiệm và loại dự án bạn muốn nhận."
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              rows={4}
            />
          </div>
        </div>
      ) : null}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="h-12 w-full rounded-2xl bg-[#061a3a] font-extrabold text-white hover:bg-[#0b2a61]"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Đang tạo tài khoản
          </>
        ) : (
          <>
            <Sparkles className="mr-2 size-4" />
            Tạo tài khoản
          </>
        )}
      </Button>

      <p className="text-center text-sm font-medium text-slate-600">
        Đã có tài khoản?{" "}
        <Link href="/login" className="font-extrabold text-blue-700">
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}