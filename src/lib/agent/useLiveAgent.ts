import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useEveAgent, type EveMessage } from "eve/react";
import type { Message, Thread } from "../chat";
import { accessToken } from '../supabase';

function textMessages(messages: readonly EveMessage[]): Message[] {
  return messages.filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({
      id: message.id,
      role: message.role as Message["role"],
      content: message.parts.flatMap((part) => part.type === "text" ? [part.text] : []).join(""),
    })).filter((message) => message.content.length > 0);
}

export function useLiveAgent(thread: Thread, onChange: (thread: Thread) => void) {
  const latest = useRef(thread);
  useLayoutEffect(() => { latest.current = thread; }, [thread]);
  const [controlError, setControlError] = useState("");
  function save(patch: Partial<Thread>) {
    latest.current = { ...latest.current, ...patch };
    onChange(latest.current);
  }
  const agent = useEveAgent({
    auth: { bearer: accessToken },
    prewarm: false,
    initialSession: thread.sessionId ? { sessionId: thread.sessionId, streamIndex: 0 } : undefined,
    resume: Boolean(thread.sessionId),
    followIdle: false,
    onSessionChange(session) {
      if (session && latest.current.sessionId !== session.sessionId) save({ sessionId: session.sessionId });
    },
    onFinish(snapshot) { save({ messages: textMessages(snapshot.data.messages) }); },
  });
  const messages = useMemo(() => textMessages(agent.data.messages), [agent.data.messages]);
  const lastTurn = Object.values(agent.conversation.turns).at(-1);
  const activity = agent.data.messages.flatMap((message) => message.parts.flatMap((part) =>
    part.type === "dynamic-tool" && part.state !== "output-available" && part.state !== "output-error"
      ? [part.toolMetadata?.eve?.label ?? "Arbetar i workspace"] : []));
  return {
    messages: messages.length ? messages : thread.messages,
    pending: agent.status === "submitted" || agent.status === "streaming",
    blocked: agent.status === "resuming",
    error: controlError || (agent.error || lastTurn?.status === "failed" ? "Svaret kunde inte slutföras. Försök igen. Om chatten inte återansluter efter en serveromstart, ladda om sidan." : ""),
    activity,
    note: agent.status === "resuming" ? "Återansluter till samtalet…" : "Samtalet sparas i ditt workspace",
    send(text: string, style: string) {
      setControlError("");
      if (!thread.messages.length) save({ title: text.slice(0, 42) });
      void agent.send(text, { headers: { 'x-cancer-reasoning': style }, clientContext: { workspaceId: thread.workspaceId ?? '' } }).catch(() => {
        // The Eve hook exposes the request failure through agent.error.
      });
    },
    stop() {
      void agent.cancel().catch(() => setControlError("Kunde inte stoppa körningen. Försök igen."));
    },
  };
}
