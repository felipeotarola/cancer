import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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

export function useLiveAgent(thread: Thread, onChange: (thread: Thread) => void, previousMessages: Message[] = []) {
  const latest = useRef(thread);
  useLayoutEffect(() => { latest.current = thread; }, [thread]);
  const [controlError, setControlError] = useState("");
  function save(patch: Partial<Thread>) {
    latest.current = { ...latest.current, ...patch };
    onChange(latest.current);
  }
  function withHistory(live: Message[], stored: Message[]) {
    if (!live.length) return stored;
    const first = stored.findIndex(m => m.role === live[0].role && m.content === live[0].content);
    const prefix = first >= 0 ? stored.slice(0, first) : previousMessages;
    return [...prefix, ...live];
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
    onFinish(snapshot) { save({ messages: withHistory(textMessages(snapshot.data.messages), latest.current.messages) }); },
  });
  const [resumeStalled, setResumeStalled] = useState(false);
  useEffect(() => {
    if (agent.status !== 'resuming') return;
    const timer = setTimeout(() => setResumeStalled(true), 10000);
    return () => clearTimeout(timer);
  }, [agent.status]);
  const messages = useMemo(() => textMessages(agent.data.messages), [agent.data.messages]);
  const lastTurn = Object.values(agent.conversation.turns).at(-1);
  const activity = agent.data.messages.flatMap((message) => message.parts.flatMap((part) =>
    part.type === "dynamic-tool" && part.state !== "output-available" && part.state !== "output-error"
      ? [part.toolMetadata?.eve?.label ?? "Arbetar i workspace"] : []));
  return {
    messages: withHistory(messages, thread.messages),
    pending: agent.status === "submitted" || agent.status === "streaming",
    blocked: agent.status === "resuming",
    error: controlError || ((resumeStalled && agent.status === 'resuming') || agent.error || lastTurn?.status === "failed" ? "Svaret kunde inte slutföras. Återanslut chatten och skicka frågan igen. Din sparade historik finns kvar." : ""),
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
