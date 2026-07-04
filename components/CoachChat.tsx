/**
 * CoachChat.tsx — AI nutrition coach chat.
 * Sends the conversation plus the user's live context to /api/coach and renders
 * a personalized reply. Conversation is session-only (not persisted).
 */
"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./CoachChat.module.css";

export interface CoachContext {
  profile?: Record<string, unknown> | null;
  nutrition?: { energyIntake?: number; protein?: number; carbs?: number; fats?: number };
  targets?: { calories?: number; protein?: number; carbs?: number; fats?: number };
  ea?: number;
  eaStatus?: string;
  vitalityScore?: number;
  vitalityStatus?: string;
  recentFoods?: string[];
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  context: CoachContext;
}

const SUGGESTIONS = [
  "What should I eat next today?",
  "Why is my Energy Availability low?",
  "Suggest a high-protein snack",
  "Am I on track for my goal?",
];

export default function CoachChat({ context }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;

    const next: Message[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, context }),
      });
      const data = await res.json();
      if (!res.ok || !data.reply) {
        throw new Error(data.error || "The coach is unavailable right now.");
      }
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.avatar}>🤖</div>
        <div>
          <h3 className={styles.title}>Vibe — AI Coach</h3>
          <p className={styles.sub}>Personalized to your profile, macros &amp; Energy Availability</p>
        </div>
      </div>

      <div className={styles.messages} ref={scrollRef} role="log" aria-live="polite" aria-label="Conversation with your coach">
        {messages.length === 0 && !loading && (
          <div className={styles.empty}>
            <p className={styles.emptyText}>
              Ask me anything about your nutrition, fuelling, or today&apos;s numbers.
            </p>
            <div className={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <button key={s} className={styles.suggestion} onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`${styles.bubble} ${m.role === "user" ? styles.user : styles.assistant}`}
          >
            {m.content}
          </div>
        ))}

        {loading && (
          <div
            className={`${styles.bubble} ${styles.assistant} ${styles.typing}`}
            role="status"
            aria-label="Coach is typing"
          >
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
          </div>
        )}

        {error && <div className={styles.error} role="alert">{error}</div>}
      </div>

      <form
        className={styles.inputRow}
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          id="coachInput"
          className={styles.input}
          aria-label="Message your coach"
          value={input}
          placeholder="Message your coach…"
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button className={styles.sendBtn} type="submit" disabled={loading || !input.trim()}>
          {loading ? "…" : "Send"}
        </button>
      </form>
    </div>
  );
}
