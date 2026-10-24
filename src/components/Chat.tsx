import { Button } from "./ui/Button";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Square,
  Plus,
  Sparkles,
  Copy,
  Check,
  Microscope,
  BookOpen,
  X,
} from "lucide-react";
import {
  type Thread,
  type Message,
} from "../lib/chat";
import { reasoningOptions } from "../../shared/agent-config";
import { Select } from "./ui/Select";
import { useAgent } from "../lib/agent/useAgent";
export function Chat({
  thread, previousMessages, onReconnect, reconnecting,
  initialDraft, onDraftSent,
  onChange,
}: {
  previousMessages?: Message[]; onReconnect?: () => void; reconnecting?: boolean;
  initialDraft?: string; onDraftSent?: () => void;
  thread: Thread;
  onChange: (thread: Thread) => void;
}) {
  const [draft, setDraft] = useState(initialDraft ?? '');
  const agent = useAgent(thread, onChange, previousMessages);
  const { pending } = agent;
  const [style, setStyle] = useState("Auto");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [copyError, setCopyError] = useState("");
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => { if (initialDraft) input.current?.focus(); }, [initialDraft]);
  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [agent.messages, pending]);
  function send(text = draft) {
    if (!text.trim() || pending || agent.blocked) return;
    agent.send(text.trim() + (attachments.length ? `\n\nBifogade filnamn (innehållet är inte uppladdat): ${attachments.join(", ")}` : ""), style);
    setDraft("");
    onDraftSent?.();
    setAttachments([]);
    if (input.current) input.current.style.height = "auto";
  }
  async function copy(message: Message) {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(message.id);
      setCopyError("");
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopyError("Kunde inte kopiera. Markera texten och kopiera manuellt.");
    }
  }
  return (
    <section className="chat-pane" aria-label="Chatt">
      <div
        className="conversation"
        role="log"
        aria-label="Meddelanden"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {agent.messages.length === 0 ? (
          <div className="chat-welcome">
            <div className="welcome-icon">
              <Microscope size={24} />
            </div>
            <p className="eyebrow">DIN YTA FÖR CANCERFORSKNING</p>
            <h1>Vad vill du undersöka?</h1>
            <p>Utgå från en forskningsfråga, utforska en hypotes eller planera nästa steg i din forskning.</p>
            <div className="suggestions">
              <Button
                variant="secondary"
                onClick={() => send("Hjälp mig formulera en forskningsfråga inom cancerforskning. Fråga först vilket område och kunskapsgap jag vill undersöka.")}
              >
                <Microscope size={16} />
                Utforska en hypotes<span>↗</span>
              </Button>
              <Button
                variant="secondary"
                onClick={() => send("Hjälp mig planera en litteraturöversikt inom cancerforskning. Fråga först om mitt fokus, och hjälp mig med sökbegrepp, urvalskriterier och värdering av evidens.")}
              >
                <BookOpen size={16} />
                Planera en översikt<span>↗</span>
              </Button>
            </div>

          </div>
        ) : (
          <div className="message-list">
            {agent.messages.map((message) => (
              <article
                key={message.id}
                className={`message ${message.role}`}
                aria-label={message.role === "user" ? "Du" : "OpenCancer"}
              >
                {message.role === "assistant" && (
                  <div className="assistant-label">
                    <span className="agent-symbol">
                      <Sparkles size={14} />
                    </span>
                    OpenCancer
                  </div>
                )}
                <div className="message-body">{message.content}</div>
                {message.role === "assistant" && (
                  <Button
                    shape="icon"
                    className="icon-button copy-button"
                    aria-label={
                      copied === message.id ? "Kopierat" : "Kopiera svar"
                    }
                    onClick={() => void copy(message)}
                  >
                    {copied === message.id ? (
                      <Check size={14} />
                    ) : (
                      <Copy size={14} />
                    )}
                  </Button>
                )}
              </article>
            ))}
          </div>
        )}
        {pending && (
          <div className="thinking" role="status">
            <Sparkles size={16} />
            <span>OpenCancer skriver</span>
            <span className="typing-dots">•••</span>
          </div>
        )}
        {agent.activity.map((label, index) => (
          <div className="thinking" role="status" key={`${label}-${index}`}><Sparkles size={14} />{label}</div>
        ))}
        {agent.error && <div className="agent-error" role="alert"><p>{agent.error}</p>{onReconnect && <Button disabled={reconnecting} onClick={onReconnect}>{reconnecting ? "Återansluter…" : "Återanslut chatten"}</Button>}</div>}
        <div ref={bottom} />
      </div>
      <div className="composer-area">
        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          {attachments.length > 0 && (
            <div className="attachments">
              {attachments.map((name) => (
                <span key={name}>
                  {name}
                  <Button
                    type="button"
                    aria-label={`Ta bort ${name}`}
                    onClick={() =>
                      setAttachments((prev) => prev.filter((n) => n !== name))
                    }
                  >
                    <X size={12} />
                  </Button>
                </span>
              ))}
            </div>
          )}
          <label className="sr-only" htmlFor="message">
            Ditt meddelande
          </label>
          <textarea
            ref={input}
            id="message"
            rows={2}
            placeholder="Ställ en forskningsfråga…"
            disabled={agent.blocked}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
            }}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                send();
              }
            }}
          />
          <div className="composer-toolbar">
            <div className="composer-tools">
              <Button
                type="button"
                shape="icon"
                className="icon-button"
                aria-label="Bifoga fil (demo, endast filnamn)"
                onClick={() => file.current?.click()}
              >
                <Plus size={18} />
              </Button>
              <input
                ref={file}
                type="file"
                multiple
                hidden
                onChange={(e) => {
                  setAttachments((prev) => [
                    ...new Set([
                      ...prev,
                      ...Array.from(e.target.files ?? [], (f) => f.name),
                    ]),
                  ]);
                  e.target.value = "";
                }}
              />
              <span className="model-label">
                <Sparkles size={14} />
                Luna
              </span>
              <Select
                aria-label="Resonemangsnivå"
                className="reasoning-select"
                value={style}
                onValueChange={setStyle}
                options={reasoningOptions}
              />
            </div>
            {pending ? (
              <Button
                type="button"
                shape="icon"
                variant="primary"
                className="send-button"
                aria-label="Stoppa svar"
                onClick={agent.stop}
              >
                <Square size={13} fill="currentColor" />
              </Button>
            ) : (
              <Button
                shape="icon"
                variant="primary"
                type="submit"
                className="send-button"
                aria-label="Skicka meddelande"
                disabled={!draft.trim() || agent.blocked}
              >
                <ArrowUp size={19} />
              </Button>
            )}
          </div>
        </form>
        <p className="composer-note" role="status">
          {copyError || agent.note}
        </p>
      </div>
    </section>
  );
}
