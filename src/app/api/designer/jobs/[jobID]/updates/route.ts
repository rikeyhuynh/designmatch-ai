import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<Record<string, string>>;
};

type DesignerProfileForUpdate = {
  id: string;
  profile_id: string;
  display_name: string;
};

type JobForUpdate = {
  id: string;
  designer_id: string;
  status: string;
};

const allowedUpdateTypes = ["progress", "draft", "final"] as const;
const allowedImageTypes = ["image/png", "image/jpeg", "image/webp"];
const maxImageSize = 5 * 1024 * 1024;
const storageBucket = "job-update-images";

export async function POST(request: Request, context: RouteContext) {
  const routeParams = await context.params;
  const jobId = routeParams.jobId ?? routeParams.jobID;

  if (!jobId) {
    return NextResponse.json(
      {
        message: "Không tìm thấy job ID trên URL.",
      },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      {
        message: "Bạn cần đăng nhập bằng tài khoản designer.",
      },
      { status: 401 },
    );
  }

  const adminSupabase = createSupabaseAdminClient() as any;

  const { data: designerProfileData, error: designerProfileError } =
    await adminSupabase
      .from("designer_profiles")
      .select("id, profile_id, display_name")
      .eq("profile_id", user.id)
      .maybeSingle();

  const designerProfile =
    designerProfileData as DesignerProfileForUpdate | null;

  if (designerProfileError) {
    return NextResponse.json(
      {
        message: designerProfileError.message,
      },
      { status: 500 },
    );
  }

  if (!designerProfile) {
    return NextResponse.json(
      {
        message:
          "Không tìm thấy designer profile của tài khoản đang đăng nhập. Hãy kiểm tra bạn có đang đăng nhập đúng tài khoản designer không.",
      },
      { status: 403 },
    );
  }

  const { data: jobData, error: jobError } = await adminSupabase
    .from("jobs")
    .select("id, designer_id, status")
    .eq("id", jobId)
    .maybeSingle();

  const job = jobData as JobForUpdate | null;

  if (jobError) {
    return NextResponse.json(
      {
        message: jobError.message,
      },
      { status: 500 },
    );
  }

  if (!job) {
    return NextResponse.json(
      {
        message:
          "Không tìm thấy job trong Supabase. Hãy kiểm tra job ID trên URL có đúng với bảng jobs không.",
      },
      { status: 404 },
    );
  }

  if (job.designer_id !== designerProfile.id) {
    return NextResponse.json(
      {
        message:
          "Job này không thuộc designer đang đăng nhập. Hãy đăng nhập đúng tài khoản designer đã được customer chọn.",
      },
      { status: 403 },
    );
  }

  const jobStatus = String(job.status ?? "");

  if (jobStatus === "payment_pending") {
    return NextResponse.json(
      {
        message:
          "Customer chưa thanh toán hoặc admin chưa xác nhận payment. Bạn chỉ có thể gửi cập nhật sau khi job chuyển sang trạng thái đang thực hiện.",
      },
      { status: 400 },
    );
  }

  if (jobStatus === "completed") {
    return NextResponse.json(
      {
        message:
          "Job này đã hoàn thành nên không thể gửi thêm cập nhật mới.",
      },
      { status: 400 },
    );
  }

  if (jobStatus === "cancelled") {
    return NextResponse.json(
      {
        message:
          "Job này đã bị hủy nên không thể gửi cập nhật mới.",
      },
      { status: 400 },
    );
  }

  if (jobStatus !== "active") {
    return NextResponse.json(
      {
        message: `Job hiện đang ở trạng thái "${jobStatus}", chưa thể gửi cập nhật. Chỉ job đang thực hiện mới được cập nhật tiến độ.`,
      },
      { status: 400 },
    );
  }

  const formData = await request.formData();

  const updateType = String(formData.get("updateType") ?? "progress");
  const title = String(formData.get("title") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const imageFile = formData.get("image");

  if (
    !allowedUpdateTypes.includes(
      updateType as (typeof allowedUpdateTypes)[number],
    )
  ) {
    return NextResponse.json(
      {
        message: "Loại cập nhật không hợp lệ.",
      },
      { status: 400 },
    );
  }

  if (title.length < 3) {
    return NextResponse.json(
      {
        message: "Tiêu đề cập nhật cần ít nhất 3 ký tự.",
      },
      { status: 400 },
    );
  }

  if (message.length < 10) {
    return NextResponse.json(
      {
        message: "Nội dung cập nhật cần ít nhất 10 ký tự.",
      },
      { status: 400 },
    );
  }

  let attachmentUrl: string | null = null;
  let uploadedFilePath: string | null = null;

  if (imageFile instanceof File && imageFile.size > 0) {
    if (!allowedImageTypes.includes(imageFile.type)) {
      return NextResponse.json(
        {
          message: "Chỉ hỗ trợ ảnh PNG, JPG/JPEG hoặc WEBP.",
        },
        { status: 400 },
      );
    }

    if (imageFile.size > maxImageSize) {
      return NextResponse.json(
        {
          message: "Ảnh không được vượt quá 5MB.",
        },
        { status: 400 },
      );
    }

    const safeFileName = sanitizeFileName(imageFile.name);
    const filePath = `jobs/${job.id}/${designerProfile.id}/${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await adminSupabase.storage
      .from(storageBucket)
      .upload(filePath, imageFile, {
        contentType: imageFile.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        {
          message: uploadError.message,
        },
        { status: 500 },
      );
    }

    const { data: publicUrlData } = adminSupabase.storage
      .from(storageBucket)
      .getPublicUrl(filePath);

    attachmentUrl = publicUrlData.publicUrl;
    uploadedFilePath = filePath;
  }

  const { error: insertError } = await adminSupabase.from("job_updates").insert({
    job_id: job.id,
    designer_id: designerProfile.id,
    update_type: updateType,
    title,
    message,
    attachment_url: attachmentUrl,
  });

  if (insertError) {
    if (uploadedFilePath) {
      await adminSupabase.storage
        .from(storageBucket)
        .remove([uploadedFilePath]);
    }

    return NextResponse.json(
      {
        message: insertError.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: attachmentUrl
      ? "Đã gửi cập nhật tiến độ kèm hình ảnh."
      : "Đã gửi cập nhật tiến độ.",
  });
}

function sanitizeFileName(fileName: string) {
  const normalizedFileName = fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return normalizedFileName
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}