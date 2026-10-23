export const responseStyles = [
  { value: "Auto", label: "Auto", description: "Anpassar svaret efter frågan" },
  {
    value: "Kortfattat",
    label: "Kortfattat",
    description: "Bara det viktigaste",
  },
  {
    value: "Utförligt",
    label: "Utförligt",
    description: "Mer sammanhang och detaljer",
  },
] as const;

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};
export type Thread = { id: string; title: string; messages: Message[]; sessionId?: string; workspaceId?: string };
const storageKey = import.meta.env.VITE_AGENT_MODE === "mock"
  ? "syna-demo-threads-v1" : "agent-workspace-threads-v1";
export function newThread(): Thread {
  return { id: crypto.randomUUID(), title: "Ny chatt", messages: [] };
}
export function loadThreads(): Thread[] {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(storageKey) ?? "null",
    );
    if (
      Array.isArray(value) &&
      value.length &&
      value.every(
        (t) =>
          typeof t.id === "string" &&
          typeof t.title === "string" &&
          (t.sessionId === undefined || typeof t.sessionId === "string") &&
          Array.isArray(t.messages) &&
          t.messages.every(
            (m: Message) =>
              typeof m.id === "string" &&
              ["user", "assistant"].includes(m.role) &&
              typeof m.content === "string",
          ),
      )
    )
      return value;
  } catch {
    /* Start clean if storage is unavailable or corrupt. */
  }
  return [newThread()];
}
export function saveThreads(threads: Thread[]) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(threads));
  } catch {
    /* Chat still works in memory. */
  }
}
