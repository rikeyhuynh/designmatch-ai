"use client";

import {
  CheckCircle2,
  Loader2,
  MessageSquareText,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type CreateUpdateFeedbackFormProps = {
  jobId: string;
  updateId: string;
};

type AIFeedbackAssistResult = {
  summary: string;
  improved_feedback: string;
  designer_friendly_feedback: string;
  scope_assessment: "within_scope" | "possible_scope_creep" | "unclear";
  scope_notes: string[];
  concrete_change_requests: string[];
  unclear_points_to_ask: string[];
  tone_notes: string[];
  priority: "low" | "medium" | "high";
  suggested_next_step: string;
};

export function CreateUpdateFeedbackForm({
  jobId,
  updateId,
}: CreateUpdateFeedbackFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [aiFeedback, setAiFeedback] = useState<AIFeedbackAssistResult | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAssisting, setIsAssisting] = useState(false);

  async function handleAssist() {
    const trimmedMessage = message.trim();

    if (trimmedMessage.length < 5) {
      toast.error("Feedback còn quá ngắn", {
        description: "Hãy nhập ít nhất vài ý feedback để AI có thể hỗ trợ.",
      });
      return;
    }

    setIsAssisting(true);

    try {
      const response = await fetch(
        `/api/customer/jobs/${jobId}/updates/${updateId}/feedback-assist`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: trimmedMessage,
          }),
        },
      );

      const result = (await response.json()) as {
        message?: string;
        feedback_assist?: AIFeedbackAssistResult;
      };

      if (!response.ok || !result.feedback_assist) {
        toast.error("AI chưa thể hỗ trợ feedback", {
          description: result.message ?? "Unknown error",
        });
        return;
      }

      setAiFeedback(result.feedback_assist);

      if (result.feedback_assist.improved_feedback) {
        setMessage(result.feedback_assist.improved_feedback);
      }

      toast.success("AI đã làm rõ feedback", {
        description:
          result.message ??
          "Bạn có thể chỉnh lại bản gợi ý trước khi gửi cho designer.",
      });
    } finally {
      setIsAssisting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedMessage = message.trim();

    if (trimmedMessage.length < 5) {
      toast.error("Feedback còn quá ngắn", {
        description: "Nội dung phản hồi cần ít nhất 5 ký tự.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/customer/jobs/${jobId}/updates/${updateId}/feedback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: trimmedMessage,
          }),
        },
      );

      const result = (await response.json()) as {
        message?: string;
      };

      if (!response.ok) {
        toast.error("Gửi phản hồi thất bại", {
          description: result.message ?? "Unknown error",
        });
        return;
      }

      toast.success("Đã gửi phản hồi", {
        description: result.message,
      });

      setMessage("");
      setAiFeedback(null);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
      <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white text-blue-700 ring-1 ring-blue-100">
            <Sparkles className="size-4" />
          </div>

          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-blue-700">
              AI Feedback Assistant
            </p>

            <p className="mt-2 text-sm font-medium leading-7 text-slate-600">
              Nhập feedback thô, sau đó bấm AI hỗ trợ để biến feedback thành yêu
              cầu chỉnh sửa rõ ràng, lịch sự, đúng brief và hạn chế scope creep.
            </p>
          </div>
        </div>
      </div>

      <Textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        disabled={isSubmitting || isAssisting}
        placeholder="Nhập feedback thô, ví dụ: màu hơi tối, chữ CTA chưa nổi, bố cục hơi rối, muốn làm giống concept hơn..."
        rows={5}
        className="rounded-xl border-blue-100 bg-white font-medium leading-7"
        required
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting || isAssisting || message.trim().length < 5}
          onClick={handleAssist}
          className="min-h-11 rounded-xl border-blue-200 bg-white px-5 text-sm font-extrabold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        >
          {isAssisting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              AI đang phân tích
            </>
          ) : (
            <>
              <Sparkles className="mr-2 size-4" />
              AI làm rõ feedback
            </>
          )}
        </Button>

        <Button
          type="submit"
          disabled={isSubmitting || isAssisting}
          className="min-h-11 rounded-xl bg-[#061a3a] px-5 text-sm font-extrabold text-white shadow-[0_12px_26px_rgba(6,26,58,0.18)] hover:bg-[#0b2a61] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Đang gửi
            </>
          ) : (
            <>
              <MessageSquareText className="mr-2 size-4" />
              Gửi feedback
            </>
          )}
        </Button>
      </div>

      {aiFeedback ? (
        <AIFeedbackAssistPanel
          feedback={aiFeedback}
          onUseImproved={() => setMessage(aiFeedback.improved_feedback)}
          onUseShort={() => setMessage(aiFeedback.designer_friendly_feedback)}
        />
      ) : null}
    </form>
  );
}

function AIFeedbackAssistPanel({
  feedback,
  onUseImproved,
  onUseShort,
}: {
  feedback: AIFeedbackAssistResult;
  onUseImproved: () => void;
  onUseShort: () => void;
}) {
  const scopeView = getScopeAssessmentView(feedback.scope_assessment);
  const priorityView = getPriorityView(feedback.priority);

  return (
    <div className="rounded-[1.15rem] border border-blue-100 bg-white p-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <div className="flex flex-wrap gap-2">
            <MiniPill className={scopeView.className}>
              {scopeView.label}
            </MiniPill>

            <MiniPill className={priorityView.className}>
              {priorityView.label}
            </MiniPill>
          </div>

          <p className="mt-3 text-sm font-black uppercase tracking-[0.16em] text-blue-700">
            AI gợi ý feedback
          </p>

          <p className="mt-2 text-sm font-medium leading-7 text-slate-600">
            {feedback.summary}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onUseImproved}
            className="rounded-full border-blue-200 bg-blue-50 text-xs font-extrabold text-blue-700"
          >
            Dùng bản đầy đủ
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onUseShort}
            className="rounded-full border-blue-200 bg-white text-xs font-extrabold text-blue-700"
          >
            Dùng bản ngắn
          </Button>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
          Bản feedback nên gửi
        </p>

        <p className="mt-2 whitespace-pre-line text-sm font-medium leading-7 text-slate-700">
          {feedback.improved_feedback}
        </p>
      </div>

      {feedback.concrete_change_requests.length > 0 ? (
        <AssistList
          title="Các yêu cầu chỉnh sửa cụ thể"
          items={feedback.concrete_change_requests}
        />
      ) : null}

      {feedback.scope_notes.length > 0 ? (
        <AssistList title="Ghi chú về scope" items={feedback.scope_notes} />
      ) : null}

      {feedback.unclear_points_to_ask.length > 0 ? (
        <AssistList
          title="Điểm còn mơ hồ nên hỏi lại"
          items={feedback.unclear_points_to_ask}
          tone="warning"
        />
      ) : null}

      {feedback.tone_notes.length > 0 ? (
        <AssistList title="Ghi chú giọng điệu" items={feedback.tone_notes} />
      ) : null}

      <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
        <div className="flex gap-2 text-sm font-semibold leading-7 text-emerald-900">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700" />
          <span>{feedback.suggested_next_step}</span>
        </div>
      </div>
    </div>
  );
}

function AssistList({
  title,
  items,
  tone = "normal",
}: {
  title: string;
  items: string[];
  tone?: "normal" | "warning";
}) {
  return (
    <div
      className={`mt-4 rounded-2xl border p-4 ${
        tone === "warning"
          ? "border-amber-200 bg-amber-50"
          : "border-blue-100 bg-blue-50/70"
      }`}
    >
      <p
        className={`text-xs font-black uppercase tracking-[0.16em] ${
          tone === "warning" ? "text-amber-700" : "text-blue-700"
        }`}
      >
        {title}
      </p>

      <ul className="mt-3 grid gap-2">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-2 text-sm font-medium leading-6 text-slate-700"
          >
            <CheckCircle2
              className={`mt-0.5 size-4 shrink-0 ${
                tone === "warning" ? "text-amber-700" : "text-emerald-600"
              }`}
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MiniPill({
  children,
  className,
}: {
  children: string;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] ${className}`}
    >
      {children}
    </span>
  );
}

function getScopeAssessmentView(
  scope: AIFeedbackAssistResult["scope_assessment"],
) {
  if (scope === "within_scope") {
    return {
      label: "Đúng scope",
      className: "border-emerald-200 bg-emerald-100 text-emerald-700",
    };
  }

  if (scope === "possible_scope_creep") {
    return {
      label: "Có thể vượt scope",
      className: "border-amber-200 bg-amber-100 text-amber-700",
    };
  }

  return {
    label: "Scope chưa rõ",
    className: "border-slate-200 bg-slate-100 text-slate-600",
  };
}

function getPriorityView(priority: AIFeedbackAssistResult["priority"]) {
  if (priority === "high") {
    return {
      label: "Ưu tiên cao",
      className: "border-red-200 bg-red-100 text-red-700",
    };
  }

  if (priority === "medium") {
    return {
      label: "Ưu tiên vừa",
      className: "border-blue-200 bg-blue-100 text-blue-700",
    };
  }

  return {
    label: "Ưu tiên thấp",
    className: "border-slate-200 bg-slate-100 text-slate-600",
  };
}