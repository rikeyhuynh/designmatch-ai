import { NextResponse } from "next/server";

import { classifyJobChatDesignRelevance } from "@/lib/ai/tasks/job-chat-design-filter";
import { getCurrentAuthState } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<Record<string, string>>;
};

type JobRow = {
  id: string;
  title: string;
  customer_id: string;
  designer_id: string;
  status: string;
  completed_at: string | null;
  created_at: string;
};

type ChatThreadRow = {
  id: string;
  job_id: string;
  status: "open" | "closed";
  opened_at: string;
  closed_at: string | null;
  auto_close_at: string | null;
  closed_reason: string | null;
  last_message_at: string | null;
};

type SenderRole = "customer" | "designer";

const MAX_MESSAGE_LENGTH = 2000;

export async function GET(_request: Request, context: RouteContext) {
  const routeParams = await context.params;
  const jobId = routeParams.jobId ?? routeParams.jobID;

  if (!jobId) {
    return NextResponse.json(
      {
        message: "Thiếu job ID.",
      },
      { status: 400 },
    );
  }

  const authState = await getCurrentAuthState();
  const adminSupabase = createSupabaseAdminClient() as any;

  const authResult = await loadAuthorizedJob({
    adminSupabase,
    authState,
    jobId,
  });

  if ("response" in authResult) {
    return authResult.response;
  }

  const { job, role } = authResult;

  const threadResult = await ensureChatThread({
    adminSupabase,
    job,
  });

  if ("response" in threadResult) {
    return threadResult.response;
  }

  const thread = await closeExpiredThreadIfNeeded({
    adminSupabase,
    thread: threadResult.thread,
  });

  const messages = await readVisibleMessages({
    adminSupabase,
    threadId: thread.id,
    role,
  });

  return NextResponse.json({
    thread,
    messages,
    canSend: canSendMessage({
      job,
      thread,
    }),
  });
}

export async function POST(request: Request, context: RouteContext) {
  const routeParams = await context.params;
  const jobId = routeParams.jobId ?? routeParams.jobID;

  if (!jobId) {
    return NextResponse.json(
      {
        message: "Thiếu job ID.",
      },
      { status: 400 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    content?: string;
  };

  const content = String(body.content ?? "").trim();

  if (!content) {
    return NextResponse.json(
      {
        message: "Tin nhắn không được để trống.",
      },
      { status: 400 },
    );
  }

  if (content.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      {
        message: `Tin nhắn tối đa ${MAX_MESSAGE_LENGTH} ký tự.`,
      },
      { status: 400 },
    );
  }

  const authState = await getCurrentAuthState();
  const adminSupabase = createSupabaseAdminClient() as any;

  const authResult = await loadAuthorizedJob({
    adminSupabase,
    authState,
    jobId,
  });

  if ("response" in authResult) {
    return authResult.response;
  }

  const { job, role, senderProfileId } = authResult;

  const threadResult = await ensureChatThread({
    adminSupabase,
    job,
  });

  if ("response" in threadResult) {
    return threadResult.response;
  }

  const thread = await closeExpiredThreadIfNeeded({
    adminSupabase,
    thread: threadResult.thread,
  });

  const sendValidation = canSendMessage({
    job,
    thread,
  });

  if (!sendValidation.allowed) {
    return NextResponse.json(
      {
        message: sendValidation.message,
      },
      { status: 409 },
    );
  }

  const aiCheck = await classifyJobChatDesignRelevance({
    message: content,
    jobTitle: job.title,
  });

  const now = new Date().toISOString();

  if (!aiCheck.isDesignRelated) {
    const warningContent =
      aiCheck.warningMessage ??
      "Vui lòng chỉ trao đổi các thông tin liên quan đến thiết kế trong dự án này.";

    const { error: insertWarningError } = await adminSupabase
      .from("job_chat_messages")
      .insert({
        thread_id: thread.id,
        job_id: job.id,
        sender_role: "ai",
        sender_profile_id: null,
        message_type: "ai_warning",
        content: warningContent,
        original_content: content,
        ai_relevance_status: "blocked",
        ai_design_category: aiCheck.category,
        ai_reason: aiCheck.reason,
        is_visible_to_customer: role === "customer",
        is_visible_to_designer: role === "designer",
        created_at: now,
      });

    if (insertWarningError) {
      return NextResponse.json(
        {
          message: insertWarningError.message,
        },
        { status: 500 },
      );
    }

    await adminSupabase
      .from("job_chat_threads")
      .update({
        last_message_at: now,
        updated_at: now,
      })
      .eq("id", thread.id);

    const messages = await readVisibleMessages({
      adminSupabase,
      threadId: thread.id,
      role,
    });

    return NextResponse.json({
      thread,
      messages,
      blocked: true,
      aiCheck,
      message:
        "Tin nhắn không liên quan đến thiết kế nên đã được chặn và không gửi cho bên còn lại.",
    });
  }

  const { error: insertMessageError } = await adminSupabase
    .from("job_chat_messages")
    .insert({
      thread_id: thread.id,
      job_id: job.id,
      sender_role: role,
      sender_profile_id: senderProfileId,
      message_type: "user_message",
      content,
      original_content: null,
      ai_relevance_status: "allowed",
      ai_design_category: aiCheck.category,
      ai_reason: aiCheck.reason,
      is_visible_to_customer: true,
      is_visible_to_designer: true,
      created_at: now,
    });

  if (insertMessageError) {
    return NextResponse.json(
      {
        message: insertMessageError.message,
      },
      { status: 500 },
    );
  }

  await adminSupabase
    .from("job_chat_threads")
    .update({
      last_message_at: now,
      updated_at: now,
    })
    .eq("id", thread.id);

  const messages = await readVisibleMessages({
    adminSupabase,
    threadId: thread.id,
    role,
  });

  return NextResponse.json({
    thread,
    messages,
    blocked: false,
    aiCheck,
    message: "Đã gửi tin nhắn.",
  });
}

async function loadAuthorizedJob({
  adminSupabase,
  authState,
  jobId,
}: {
  adminSupabase: any;
  authState: Awaited<ReturnType<typeof getCurrentAuthState>>;
  jobId: string;
}): Promise<
  | {
      job: JobRow;
      role: SenderRole;
      senderProfileId: string;
    }
  | {
      response: NextResponse;
    }
> {
  if (!authState.isAuthenticated || !authState.profile) {
    return {
      response: NextResponse.json(
        {
          message: "Bạn cần đăng nhập để sử dụng chat.",
        },
        { status: 401 },
      ),
    };
  }

  const { data: jobData, error: jobError } = await adminSupabase
    .from("jobs")
    .select(
      `
      id,
      title,
      customer_id,
      designer_id,
      status,
      completed_at,
      created_at
    `,
    )
    .eq("id", jobId)
    .maybeSingle();

  if (jobError) {
    return {
      response: NextResponse.json(
        {
          message: jobError.message,
        },
        { status: 500 },
      ),
    };
  }

  if (!jobData) {
    return {
      response: NextResponse.json(
        {
          message: "Không tìm thấy job.",
        },
        { status: 404 },
      ),
    };
  }

  const job = jobData as JobRow;

  if (
    authState.profile.role === "customer" &&
    authState.customerProfile?.id === job.customer_id
  ) {
    return {
      job,
      role: "customer",
      senderProfileId: authState.customerProfile.id,
    };
  }

  if (
    authState.profile.role === "designer" &&
    authState.designerProfile?.id === job.designer_id
  ) {
    return {
      job,
      role: "designer",
      senderProfileId: authState.designerProfile.id,
    };
  }

  return {
    response: NextResponse.json(
      {
        message: "Bạn không có quyền truy cập chat của job này.",
      },
      { status: 403 },
    ),
  };
}

async function ensureChatThread({
  adminSupabase,
  job,
}: {
  adminSupabase: any;
  job: JobRow;
}): Promise<
  | {
      thread: ChatThreadRow;
    }
  | {
      response: NextResponse;
    }
> {
  const { data: existingThread, error: threadError } = await adminSupabase
    .from("job_chat_threads")
    .select(
      `
      id,
      job_id,
      status,
      opened_at,
      closed_at,
      auto_close_at,
      closed_reason,
      last_message_at
    `,
    )
    .eq("job_id", job.id)
    .maybeSingle();

  if (threadError) {
    return {
      response: NextResponse.json(
        {
          message: threadError.message,
        },
        { status: 500 },
      ),
    };
  }

  if (existingThread) {
    const thread = existingThread as ChatThreadRow;

    if (job.status === "completed" && !thread.auto_close_at) {
      const autoCloseAt = getAutoCloseAt(job.completed_at);

      const { data: updatedThread, error: updateError } = await adminSupabase
        .from("job_chat_threads")
        .update({
          auto_close_at: autoCloseAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", thread.id)
        .select(
          `
          id,
          job_id,
          status,
          opened_at,
          closed_at,
          auto_close_at,
          closed_reason,
          last_message_at
        `,
        )
        .maybeSingle();

      if (updateError) {
        return {
          response: NextResponse.json(
            {
              message: updateError.message,
            },
            { status: 500 },
          ),
        };
      }

      return {
        thread: updatedThread as ChatThreadRow,
      };
    }

    return {
      thread,
    };
  }

  const now = new Date().toISOString();

  const { data: createdThread, error: createError } = await adminSupabase
    .from("job_chat_threads")
    .insert({
      job_id: job.id,
      status: "open",
      opened_at: now,
      auto_close_at:
        job.status === "completed" ? getAutoCloseAt(job.completed_at) : null,
      last_message_at: null,
    })
    .select(
      `
      id,
      job_id,
      status,
      opened_at,
      closed_at,
      auto_close_at,
      closed_reason,
      last_message_at
    `,
    )
    .maybeSingle();

  if (createError) {
    return {
      response: NextResponse.json(
        {
          message: createError.message,
        },
        { status: 500 },
      ),
    };
  }

  return {
    thread: createdThread as ChatThreadRow,
  };
}

async function closeExpiredThreadIfNeeded({
  adminSupabase,
  thread,
}: {
  adminSupabase: any;
  thread: ChatThreadRow;
}) {
  if (
    thread.status === "open" &&
    thread.auto_close_at &&
    new Date(thread.auto_close_at).getTime() <= Date.now()
  ) {
    const now = new Date().toISOString();

    const { data: closedThread } = await adminSupabase
      .from("job_chat_threads")
      .update({
        status: "closed",
        closed_at: now,
        closed_reason: "auto_closed_after_30_days",
        updated_at: now,
      })
      .eq("id", thread.id)
      .select(
        `
        id,
        job_id,
        status,
        opened_at,
        closed_at,
        auto_close_at,
        closed_reason,
        last_message_at
      `,
      )
      .maybeSingle();

    if (closedThread) {
      return closedThread as ChatThreadRow;
    }
  }

  return thread;
}

async function readVisibleMessages({
  adminSupabase,
  threadId,
  role,
}: {
  adminSupabase: any;
  threadId: string;
  role: SenderRole;
}) {
  let query = adminSupabase
    .from("job_chat_messages")
    .select(
      `
      id,
      thread_id,
      job_id,
      sender_role,
      sender_profile_id,
      message_type,
      content,
      ai_relevance_status,
      ai_design_category,
      ai_reason,
      created_at
    `,
    )
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (role === "customer") {
    query = query.eq("is_visible_to_customer", true);
  } else {
    query = query.eq("is_visible_to_designer", true);
  }

  const { data, error } = await query;

  if (error) {
    return [];
  }

  return data ?? [];
}

function canSendMessage({
  job,
  thread,
}: {
  job: JobRow;
  thread: ChatThreadRow;
}): {
  allowed: boolean;
  message: string;
} {
  if (thread.status === "closed") {
    return {
      allowed: false,
      message:
        "Đoạn chat này đã đóng. Chat chỉ được mở trong quá trình làm việc và 30 ngày sau khi job hoàn thành.",
    };
  }

  if (job.status === "payment_pending") {
    return {
      allowed: false,
      message:
        "Chat sẽ mở sau khi thanh toán được admin xác nhận và job chuyển sang trạng thái đang thực hiện.",
    };
  }

  if (job.status === "cancelled") {
    return {
      allowed: false,
      message: "Job đã bị hủy nên không thể gửi tin nhắn mới.",
    };
  }

  return {
    allowed: true,
    message: "Có thể gửi tin nhắn.",
  };
}

function getAutoCloseAt(completedAt: string | null) {
  const baseDate = completedAt ? new Date(completedAt) : new Date();
  baseDate.setDate(baseDate.getDate() + 30);

  return baseDate.toISOString();
}