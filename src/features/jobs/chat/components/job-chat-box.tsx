"use client";

import {
  Bot,
  CheckCircle2,
  CircleAlert,
  Loader2,
  MessageSquareText,
  RefreshCw,
  SendHorizonal,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { StatusPill } from "@/components/common/status-pill";
import { SurfaceCard } from "@/components/common/surface-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type JobChatRole = "customer" | "designer";

type JobChatThread = {
  id: string;
  job_id: string;
  status: "open" | "closed";
  opened_at: string;
  closed_at: string | null;
  auto_close_at: string | null;
  closed_reason: string | null;
  last_message_at: string | null;
};

type JobChatMessage = {
  id: string;
  thread_id: string;
  job_id: string;
  sender_role: "customer" | "designer" | "ai" | "system" | "admin";
  sender_profile_id: string | null;
  message_type: "user_message" | "ai_warning" | "system_event";
  content: string;
  ai_relevance_status: "allowed" | "blocked" | "not_checked" | "error";
  ai_design_category: string | null;
  ai_reason: string | null;
  created_at: string;
};

type JobChatResponse = {
  thread: JobChatThread;
  messages: JobChatMessage[];
  canSend: {
    allowed: boolean;
    message: string;
  };
  blocked?: boolean;
  message?: string;
};

type JobChatBoxProps = {
  jobId: string;
  role: JobChatRole;
};

const MAX_MESSAGE_LENGTH = 2000;

export function JobChatBox({ jobId, role }: JobChatBoxProps) {
  const [thread, setThread] = useState<JobChatThread | null>(null);
  const [messages, setMessages] = useState<JobChatMessage[]>([]);
  const [canSend, setCanSend] = useState({
    allowed: false,
    message: "Đang kiểm tra trạng thái chat...",
  });
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const messageListRef = useRef<HTMLDivElement | null>(null);

  const remainingCharacters = MAX_MESSAGE_LENGTH - draft.length;

  const chatStatus = useMemo(() => {
    if (!thread) {
      return {
        label: "Đang tải",
        tone: "info" as const,
      };
    }

    if (thread.status === "closed") {
      return {
        label: "Chat đã đóng",
        tone: "warning" as const,
      };
    }

    return {
      label: "Chat đang mở",
      tone: "success" as const,
    };
  }, [thread]);

  const loadMessages = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) {
        setIsLoading(true);
      }

      try {
        const response = await fetch(`/api/jobs/${jobId}/chat/messages`, {
          method: "GET",
          cache: "no-store",
        });

        const result = (await response.json()) as JobChatResponse;

        if (!response.ok) {
          if (!silent) {
            toast.error("Không thể tải chat", {
              description: result.message ?? "Đã có lỗi xảy ra.",
            });
          }

          return;
        }

        setThread(result.thread);
        setMessages(result.messages ?? []);
        setCanSend(
          result.canSend ?? {
            allowed: false,
            message: "Không thể gửi tin nhắn.",
          },
        );
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [jobId],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = draft.trim();

    if (!content) {
      toast.error("Tin nhắn trống", {
        description: "Vui lòng nhập nội dung trước khi gửi.",
      });

      return;
    }

    if (content.length > MAX_MESSAGE_LENGTH) {
      toast.error("Tin nhắn quá dài", {
        description: `Tin nhắn tối đa ${MAX_MESSAGE_LENGTH} ký tự.`,
      });

      return;
    }

    if (!canSend.allowed) {
      toast.warning("Chưa thể gửi tin nhắn", {
        description: canSend.message,
      });

      return;
    }

    setIsSending(true);

    try {
      const response = await fetch(`/api/jobs/${jobId}/chat/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
        }),
      });

      const result = (await response.json()) as JobChatResponse;

      if (!response.ok) {
        toast.error("Không thể gửi tin nhắn", {
          description: result.message ?? "Đã có lỗi xảy ra.",
        });

        return;
      }

      setDraft("");
      setThread(result.thread);
      setMessages(result.messages ?? []);

      if (result.blocked) {
        toast.warning("Tin nhắn đã được AI chặn", {
          description:
            result.message ??
            "Tin nhắn không liên quan đến thiết kế nên không được gửi cho bên còn lại.",
        });
      }
    } finally {
      setIsSending(false);
    }
  }

  useEffect(() => {
    const firstLoadTimeoutId = window.setTimeout(() => {
      void loadMessages();
    }, 0);

    const intervalId = window.setInterval(() => {
      void loadMessages({ silent: true });
    }, 12000);

    return () => {
      window.clearTimeout(firstLoadTimeoutId);
      window.clearInterval(intervalId);
    };
  }, [loadMessages]);

  useEffect(() => {
    messageListRef.current?.scrollTo({
      top: messageListRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  return (
    <SurfaceCard className="overflow-hidden p-0">
      <div className="border-b border-blue-100 bg-gradient-to-br from-blue-50 via-white to-sky-50 p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-blue-600">
              <MessageSquareText className="size-4" />
              Job chat
            </div>

            <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.045em] text-[#061a3a]">
              Trao đổi thiết kế trong dự án
            </h2>

            <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-slate-600">
              Chat này chỉ dùng để trao đổi về brief, thiết kế, feedback, file
              bàn giao, deadline và yêu cầu làm rõ trong job. Tin nhắn không
              liên quan sẽ bị AI chặn và không gửi cho bên còn lại.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusPill tone={chatStatus.tone}>{chatStatus.label}</StatusPill>

            {thread?.auto_close_at ? (
              <StatusPill tone="info">
                {`Tự đóng: ${formatDateTimeVi(thread.auto_close_at)}`}
              </StatusPill>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-0">
        <div
          ref={messageListRef}
          className="max-h-[520px] min-h-[340px] overflow-y-auto bg-white p-5"
        >
          {isLoading && messages.length === 0 ? (
            <div className="grid min-h-[260px] place-items-center text-center">
              <div>
                <Loader2 className="mx-auto size-8 animate-spin text-blue-700" />
                <p className="mt-3 text-sm font-bold text-slate-600">
                  Đang tải chat...
                </p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <EmptyChat />
          ) : (
            <div className="grid gap-4">
              {messages.map((message) => (
                <ChatMessageBubble
                  key={message.id}
                  message={message}
                  currentRole={role}
                />
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-blue-100 bg-blue-50/65 p-5">
          {!canSend.allowed ? (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-2">
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-700" />
                <p className="text-sm font-semibold leading-6 text-amber-900">
                  {canSend.message}
                </p>
              </div>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="grid gap-3">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={!canSend.allowed || isSending}
              placeholder="Nhập câu hỏi, feedback hoặc yêu cầu làm rõ về thiết kế..."
              className="min-h-28 rounded-2xl border-blue-100 bg-white"
            />

            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                <ShieldCheck className="size-4 text-blue-700" />
                <span>AI sẽ kiểm tra nội dung trước khi gửi.</span>
                <span
                  className={
                    remainingCharacters < 0 ? "text-red-600" : "text-slate-400"
                  }
                >
                  {remainingCharacters} ký tự còn lại
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void loadMessages()}
                  disabled={isLoading || isSending}
                  className="rounded-full border-blue-200 bg-white font-extrabold"
                >
                  <RefreshCw className="mr-2 size-4" />
                  Làm mới
                </Button>

                <Button
                  type="submit"
                  disabled={!canSend.allowed || isSending}
                  className="rounded-full bg-[#061a3a] px-5 font-extrabold text-white hover:bg-[#0b2a61] disabled:bg-slate-300 disabled:text-slate-500"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Đang gửi
                    </>
                  ) : (
                    <>
                      <SendHorizonal className="mr-2 size-4" />
                      Gửi tin nhắn
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </SurfaceCard>
  );
}

function ChatMessageBubble({
  message,
  currentRole,
}: {
  message: JobChatMessage;
  currentRole: JobChatRole;
}) {
  const isOwnMessage = message.sender_role === currentRole;
  const isAiWarning = message.message_type === "ai_warning";

  if (isAiWarning) {
    return (
      <div className="flex justify-center">
        <div className="max-w-2xl rounded-[1.15rem] border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-2xl bg-amber-600 text-white">
              <Bot className="size-4" />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">
                AI chat guard
              </p>

              <p className="mt-1 text-sm font-semibold leading-6 text-amber-950">
                {message.content}
              </p>

              {message.ai_reason ? (
                <p className="mt-2 text-xs font-medium leading-5 text-amber-800">
                  Lý do: {message.ai_reason}
                </p>
              ) : null}

              <p className="mt-2 text-xs font-bold text-amber-700">
                {formatDateTimeVi(message.created_at)}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] rounded-[1.15rem] px-4 py-3 ${
          isOwnMessage
            ? "bg-[#061a3a] text-white"
            : "border border-blue-100 bg-blue-50 text-[#061a3a]"
        }`}
      >
        <div className="flex items-center gap-2">
          {isOwnMessage ? (
            <UserRound className="size-4 text-sky-200" />
          ) : (
            <UserRound className="size-4 text-blue-700" />
          )}

          <p
            className={`text-xs font-black uppercase tracking-[0.16em] ${
              isOwnMessage ? "text-sky-200/80" : "text-blue-600"
            }`}
          >
            {getSenderLabel(message.sender_role, currentRole)}
          </p>
        </div>

        <p
          className={`mt-2 whitespace-pre-wrap break-words text-sm font-medium leading-7 ${
            isOwnMessage ? "text-white/90" : "text-slate-700"
          }`}
        >
          {message.content}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {message.ai_relevance_status === "allowed" ? (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[0.68rem] font-black uppercase tracking-[0.12em] ${
                isOwnMessage
                  ? "bg-white/10 text-sky-100"
                  : "bg-white text-emerald-700"
              }`}
            >
              <CheckCircle2 className="size-3" />
              Design related
            </span>
          ) : null}

          <span
            className={`text-xs font-bold ${
              isOwnMessage ? "text-white/45" : "text-slate-400"
            }`}
          >
            {formatDateTimeVi(message.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptyChat() {
  return (
    <div className="grid min-h-[260px] place-items-center text-center">
      <div>
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
          <MessageSquareText className="size-6" />
        </div>

        <h3 className="mt-4 text-xl font-extrabold tracking-[-0.04em] text-[#061a3a]">
          Chưa có tin nhắn nào
        </h3>

        <p className="mt-2 max-w-lg text-sm font-medium leading-7 text-slate-600">
          Bắt đầu bằng câu hỏi làm rõ brief, feedback về thiết kế, file bàn giao
          hoặc deadline của job.
        </p>
      </div>
    </div>
  );
}

function getSenderLabel(
  senderRole: JobChatMessage["sender_role"],
  currentRole: JobChatRole,
) {
  if (senderRole === currentRole) {
    return "Bạn";
  }

  if (senderRole === "customer") {
    return "Customer";
  }

  if (senderRole === "designer") {
    return "Designer";
  }

  if (senderRole === "ai") {
    return "AI";
  }

  if (senderRole === "admin") {
    return "Admin";
  }

  return "System";
}

function formatDateTimeVi(value: string) {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}