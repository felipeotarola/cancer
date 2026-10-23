import { useEffect, useRef, useState } from "react";
import { mockReply } from "./mock-reply";
import type { Thread } from "../chat";

export function useMockAgent(thread: Thread, onChange: (thread: Thread) => void, _previousMessages?: Thread["messages"]) {
  const [pending, setPending] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return {
    messages: thread.messages, pending, blocked: false, error: "", activity: [] as string[],
    note: "Simulerade svar · Sparas bara i din webbläsare",
    send(text: string, style: string) {
      const updated = { ...thread,
        title: thread.messages.length ? thread.title : text.slice(0, 42),
        messages: [...thread.messages, { id: crypto.randomUUID(), role: "user" as const, content: text }],
      };
      onChange(updated);
      setPending(true);
      timer.current = setTimeout(() => {
        onChange({ ...updated, messages: [...updated.messages, {
          id: crypto.randomUUID(), role: "assistant", content: mockReply(text, style),
        }] });
        setPending(false); timer.current = null;
      }, 1000);
    },
    stop() { if (timer.current) clearTimeout(timer.current); timer.current = null; setPending(false); },
  };
}
