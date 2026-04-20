import { forwardRef, memo, useEffect, useImperativeHandle, useLayoutEffect, useRef } from "react";
import { Copy, Download, Trash2 } from "lucide-react";
import { InlineLanguage } from "./InlineLanguage";
import { cn, countWords, formatDuration, tsFilename, downloadText } from "@/lib/utils";

export interface TranscriptPanelHandle {
  /** Append a finalized chunk directly to the DOM — no React render. */
  appendFinal: (chunk: string) => void;
  /** Update the inline ghost interim text — no React render. */
  setInterim: (text: string) => void;
  /** Wipe the inline interim ghost. */
  clearInterim: () => void;
  /** Wipe committed + interim. Called by Clear. */
  reset: () => void;
  /** Replace committed text wholesale. Called by AI-move / external hydrate. */
  setText: (text: string) => void;
}

interface Props {
  text: string;
  listening: boolean;
  language: string;
  elapsedMs: number;
  onTextChange: (next: string) => void;
  onLanguageChange: (lang: string) => void;
  onClear: () => void;
  onEnter?: () => void;
  onCopy: () => void;
}

/**
 * Hot-path strategy:
 *   - The editor is two <span>s inside a single contentEditable:
 *       [committed]  |  [interim ghost, non-editable, inline]
 *   - Final transcripts append directly to [committed]'s text node —
 *     no textContent rewrite of the entire string. O(1) instead of O(n).
 *   - Interim text mutates [interim]'s textContent via ref — never
 *     goes through React state, so the AI panel / topbar / stats never
 *     re-render on every partial word.
 *   - React state is only synced *after* the DOM update for persistence.
 */
export const TranscriptPanel = memo(
  forwardRef<TranscriptPanelHandle, Props>(function TranscriptPanel(props, ref) {
    const {
      text,
      listening,
      language,
      elapsedMs,
      onTextChange,
      onLanguageChange,
      onClear,
      onEnter,
      onCopy,
    } = props;

    const editorRef = useRef<HTMLDivElement>(null);
    const committedRef = useRef<HTMLSpanElement>(null);
    const interimRef = useRef<HTMLSpanElement>(null);
    const onTextChangeRef = useRef(onTextChange);

    useEffect(() => {
      onTextChangeRef.current = onTextChange;
    }, [onTextChange]);

    useImperativeHandle(
      ref,
      () => ({
        appendFinal(chunk) {
          const span = committedRef.current;
          if (!span) return;
          const cur = span.textContent ?? "";
          const sep = cur && !/\s$/.test(cur) ? " " : "";
          span.appendChild(document.createTextNode(sep + chunk));
          const interim = interimRef.current;
          if (interim) interim.textContent = "";
          onTextChangeRef.current(span.textContent ?? "");
        },
        setInterim(t) {
          const i = interimRef.current;
          if (i && i.textContent !== t) i.textContent = t;
        },
        clearInterim() {
          const i = interimRef.current;
          if (i) i.textContent = "";
        },
        reset() {
          const c = committedRef.current;
          if (c) c.textContent = "";
          const i = interimRef.current;
          if (i) i.textContent = "";
        },
        setText(t) {
          const c = committedRef.current;
          if (c) c.textContent = t;
        },
      }),
      [],
    );

    // One-shot hydration on mount: seed the DOM with whatever text arrived
    // as the initial prop (e.g. restored from localStorage). After this we
    // NEVER reactively sync text → DOM — the DOM is authoritative during
    // dictation, and parents call reset()/setText() explicitly for any
    // external replacement. This eliminates a race where a re-render
    // triggered by the listen-timer tick (arriving before appendFinal's
    // setState commits) would wipe freshly-spoken words.
    const hydratedRef = useRef(false);
    useLayoutEffect(() => {
      if (hydratedRef.current) return;
      hydratedRef.current = true;
      const span = committedRef.current;
      if (span && text && span.textContent !== text) {
        span.textContent = text;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleInput = () => {
      const span = committedRef.current;
      const editor = editorRef.current;
      if (!span || !editor) return;
      // If the user typed at the very end (past the interim span), the browser
      // creates bare text nodes in the editor. Absorb them into committed.
      for (const node of Array.from(editor.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE) {
          span.appendChild(node);
        }
      }
      onTextChangeRef.current(span.textContent ?? "");
    };

    const words = countWords(text);
    const chars = text.length;
    const mins = elapsedMs / 60000;
    const wpm = mins > 0.05 && words > 0 ? Math.round(words / mins) : null;

    return (
      <article
        className="relative rounded-2xl overflow-hidden
                        border border-[var(--color-line)]
                        bg-[var(--color-paper-2)]
                        shadow-[0_1px_0_0_var(--color-line-soft)]"
      >
        <header
          className="flex items-center justify-between flex-wrap gap-3
                           px-5 md:px-6 py-3
                           border-b border-[var(--color-line-soft)]
                           bg-[var(--color-paper-3)]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="font-display italic text-xl md:text-[22px] leading-none text-[var(--color-ink)]">
              Transcript
            </h2>
            <span className="text-[var(--color-ink-faint)]" aria-hidden>
              ·
            </span>
            <InlineLanguage value={language} onChange={onLanguageChange} />
          </div>
          <div className="flex items-center gap-1.5">
            <IconButton
              label="Download as .txt"
              onClick={() => downloadText(tsFilename("transcript"), text)}
            >
              <Download size={14} strokeWidth={1.8} />
            </IconButton>
            <IconButton label="Copy" onClick={onCopy} showText>
              <Copy size={14} strokeWidth={1.8} />
              <span className="ml-1.5">Copy</span>
            </IconButton>
            <IconButton label="Clear" onClick={onClear} showText>
              <Trash2 size={14} strokeWidth={1.8} />
              <span className="ml-1.5">Clear</span>
            </IconButton>
          </div>
        </header>

        <div
          ref={editorRef}
          contentEditable
          spellCheck
          suppressContentEditableWarning
          role="textbox"
          aria-label="Transcript"
          onInput={handleInput}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && onEnter) {
              e.preventDefault();
              onEnter();
            }
          }}
          className="min-h-[260px] md:min-h-[320px] px-6 md:px-8 py-7
                     font-display text-[22px] md:text-[26px] leading-[1.45]
                     text-[var(--color-ink)]"
        >
          <span
            ref={committedRef}
            data-committed
            data-placeholder="Your words appear here…"
          />
          <span
            ref={interimRef}
            data-interim
            contentEditable={false}
            suppressContentEditableWarning
            className="interim-ghost"
          />
          <span
            aria-hidden
            contentEditable={false}
            suppressContentEditableWarning
            data-caret
            className={listening ? "caret-on" : undefined}
          />
        </div>

        <footer
          className={cn(
            "flex flex-wrap items-center gap-5 px-6 md:px-8 py-3.5",
            "border-t border-[var(--color-line-soft)]",
            "font-mono text-[11px] tracking-wide",
            "text-[var(--color-ink-faint)] tabular",
          )}
        >
          <span className="inline-flex items-center gap-2">
            {listening ? (
              <span className="rec-dot" aria-hidden />
            ) : (
              <span
                className="inline-block w-[7px] h-[7px] rounded-full"
                style={{ background: "var(--color-ink-faint)" }}
                aria-hidden
              />
            )}
            <span className={listening ? "text-[var(--color-ink)]" : ""}>
              {formatDuration(elapsedMs)}
            </span>
          </span>
          <span className="text-[var(--color-line)]">/</span>
          <span>
            <strong className="font-medium text-[var(--color-ink-dim)]">
              {words}
            </strong>{" "}
            words
          </span>
          <span>
            <strong className="font-medium text-[var(--color-ink-dim)]">
              {chars}
            </strong>{" "}
            chars
          </span>
          <span>
            <strong className="font-medium text-[var(--color-ink-dim)]">
              {wpm ?? "—"}
            </strong>{" "}
            wpm
          </span>
        </footer>
      </article>
    );
  }),
);

function IconButton({
  label,
  children,
  onClick,
  showText,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  showText?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex items-center px-2.5 py-1.5",
        "rounded-lg border border-transparent text-[var(--color-ink-dim)]",
        "hover:border-[var(--color-line)] hover:text-[var(--color-ink)]",
        "transition-colors text-xs font-mono",
        !showText && "w-8 justify-center",
      )}
    >
      {children}
    </button>
  );
}
