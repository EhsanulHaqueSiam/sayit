import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";
import { Copy, Download, Trash2 } from "lucide-react";
import { InlineLanguage } from "./InlineLanguage";
import { cn, countWords, formatDuration, tsFilename, downloadText } from "@/lib/utils";

export interface TranscriptPanelHandle {
  /** Freeze insertion to current cursor/selection for this dictation session. */
  captureInsertionAnchor: () => void;
  /** Release frozen insertion anchor after dictation ends. */
  releaseInsertionAnchor: () => void;
  /** Insert a finalized chunk at cursor/selection directly in the DOM — no React render. */
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
    const tailCaretRef = useRef<HTMLSpanElement>(null);
    const lastCaretRangeRef = useRef<Range | null>(null);
    const dictationAnchorRef = useRef<Range | null>(null);
    const anchoredInterimRef = useRef<HTMLSpanElement | null>(null);
    const anchoredCaretRef = useRef<HTMLSpanElement | null>(null);
    const listeningRef = useRef(listening);
    const onTextChangeRef = useRef(onTextChange);

    useEffect(() => {
      onTextChangeRef.current = onTextChange;
    }, [onTextChange]);

    useEffect(() => {
      listeningRef.current = listening;
      const anchoredCaret = anchoredCaretRef.current;
      if (anchoredCaret) {
        anchoredCaret.className = listening ? "caret-on" : "";
      }
    }, [listening]);

    const rangeInCommitted = useCallback((range: Range): boolean => {
      const committed = committedRef.current;
      if (!committed) return false;
      return (
        committed.contains(range.startContainer) &&
        committed.contains(range.endContainer)
      );
    }, []);

    const textOffsetFromPoint = useCallback((
      root: Node,
      container: Node,
      offset: number,
    ): number => {
      const r = document.createRange();
      r.selectNodeContents(root);
      r.setEnd(container, offset);
      return r.toString().length;
    }, []);

    const pointInCommittedFromCharOffset = useCallback((chars: number) => {
      const committed = committedRef.current;
      if (!committed) return null;
      let remaining = Math.max(0, chars);
      const walker = document.createTreeWalker(committed, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode() as Text | null;
      let lastText: Text | null = null;
      while (node) {
        lastText = node;
        const len = node.data.length;
        if (remaining <= len) {
          return { container: node as Node, offset: remaining };
        }
        remaining -= len;
        node = walker.nextNode() as Text | null;
      }
      if (lastText) {
        return { container: lastText as Node, offset: lastText.data.length };
      }
      return { container: committed as Node, offset: committed.childNodes.length };
    }, []);

    const normalizeRangeToCommitted = useCallback((range: Range): Range | null => {
      const committed = committedRef.current;
      const editor = editorRef.current;
      if (!committed || !editor) return null;
      if (rangeInCommitted(range)) return range.cloneRange();
      if (!editor.contains(range.startContainer) || !editor.contains(range.endContainer)) {
        return null;
      }
      const startChars = textOffsetFromPoint(editor, range.startContainer, range.startOffset);
      const endChars = textOffsetFromPoint(editor, range.endContainer, range.endOffset);
      const startPoint = pointInCommittedFromCharOffset(startChars);
      const endPoint = pointInCommittedFromCharOffset(endChars);
      if (!startPoint || !endPoint) return null;
      const normalized = document.createRange();
      normalized.setStart(startPoint.container, startPoint.offset);
      normalized.setEnd(endPoint.container, endPoint.offset);
      return normalized;
    }, [pointInCommittedFromCharOffset, rangeInCommitted, textOffsetFromPoint]);

    const cacheCaretRange = useCallback(() => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const normalized = normalizeRangeToCommitted(selection.getRangeAt(0));
      if (normalized) {
        lastCaretRangeRef.current = normalized;
      }
    }, [normalizeRangeToCommitted]);

    const resolveInsertionRange = useCallback((): Range | null => {
      const committed = committedRef.current;
      if (!committed) return null;

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const normalized = normalizeRangeToCommitted(selection.getRangeAt(0));
        if (normalized) return normalized;
      }

      if (lastCaretRangeRef.current && rangeInCommitted(lastCaretRangeRef.current)) {
        return lastCaretRangeRef.current.cloneRange();
      }

      const atEnd = document.createRange();
      atEnd.selectNodeContents(committed);
      atEnd.collapse(false);
      return atEnd;
    }, [normalizeRangeToCommitted, rangeInCommitted]);

    const setTailPreviewVisible = useCallback((visible: boolean) => {
      const tailCaret = tailCaretRef.current;
      if (!tailCaret) return;
      tailCaret.style.display = visible ? "" : "none";
      if (!visible) {
        const i = interimRef.current;
        if (i) i.textContent = "";
      }
    }, []);

    const removeAnchoredPreview = useCallback(() => {
      anchoredInterimRef.current?.remove();
      anchoredCaretRef.current?.remove();
    }, []);

    const getAnchoredPreviewNodes = useCallback(() => {
      if (!anchoredInterimRef.current) {
        const node = document.createElement("span");
        node.setAttribute("data-interim", "");
        node.contentEditable = "false";
        node.className = "interim-ghost";
        anchoredInterimRef.current = node;
      }
      if (!anchoredCaretRef.current) {
        const node = document.createElement("span");
        node.setAttribute("data-caret", "");
        node.setAttribute("aria-hidden", "true");
        node.contentEditable = "false";
        anchoredCaretRef.current = node;
      }
      anchoredCaretRef.current.className = listeningRef.current ? "caret-on" : "";
      return {
        interimNode: anchoredInterimRef.current,
        caretNode: anchoredCaretRef.current,
      };
    }, []);

    useEffect(() => {
      const onSelectionChange = () => cacheCaretRange();
      document.addEventListener("selectionchange", onSelectionChange);
      return () => {
        document.removeEventListener("selectionchange", onSelectionChange);
      };
    }, [cacheCaretRange]);

    useImperativeHandle(
      ref,
      () => ({
        captureInsertionAnchor() {
          const range = resolveInsertionRange();
          dictationAnchorRef.current = range ? range.cloneRange() : null;
        },
        releaseInsertionAnchor() {
          dictationAnchorRef.current = null;
          removeAnchoredPreview();
          setTailPreviewVisible(true);
        },
        appendFinal(chunk) {
          const span = committedRef.current;
          if (!span) return;
          removeAnchoredPreview();
          const anchored =
            dictationAnchorRef.current &&
            rangeInCommitted(dictationAnchorRef.current)
              ? dictationAnchorRef.current.cloneRange()
              : null;
          setTailPreviewVisible(!anchored);
          const range = anchored ?? resolveInsertionRange();
          if (!range) return;
          const cur = span.textContent ?? "";
          const start = textOffsetFromPoint(
            span,
            range.startContainer,
            range.startOffset,
          );
          const end = textOffsetFromPoint(span, range.endContainer, range.endOffset);
          const left = start > 0 ? cur[start - 1] : "";
          const right = end < cur.length ? cur[end] : "";
          const needsLeadingSpace = !!left && !/\s/.test(left);
          const needsTrailingSpace = !!right && !/\s/.test(right);
          const payload = `${needsLeadingSpace ? " " : ""}${chunk}${needsTrailingSpace ? " " : ""}`;

          range.deleteContents();
          const node = document.createTextNode(payload);
          range.insertNode(node);

          const selection = window.getSelection();
          const after = document.createRange();
          after.setStartAfter(node);
          after.collapse(true);
          dictationAnchorRef.current = after.cloneRange();
          const active = document.activeElement;
          const shouldMoveVisualCaret = active === editorRef.current;
          if (selection && shouldMoveVisualCaret) {
            selection.removeAllRanges();
            selection.addRange(after);
          }
          lastCaretRangeRef.current = after.cloneRange();
          if (anchored) {
            const { caretNode } = getAnchoredPreviewNodes();
            const caretRange = dictationAnchorRef.current?.cloneRange();
            if (caretRange) caretRange.insertNode(caretNode);
          } else {
            const interim = interimRef.current;
            if (interim) interim.textContent = "";
          }
          onTextChangeRef.current(span.textContent ?? "");
        },
        setInterim(t) {
          const i = interimRef.current;
          const span = committedRef.current;
          if (!i || !span) return;
          const anchored =
            dictationAnchorRef.current &&
            rangeInCommitted(dictationAnchorRef.current);
          if (anchored) {
            setTailPreviewVisible(false);
            removeAnchoredPreview();
            const anchorRange = dictationAnchorRef.current!.cloneRange();
            const cur = span.textContent ?? "";
            const start = textOffsetFromPoint(
              span,
              anchorRange.startContainer,
              anchorRange.startOffset,
            );
            const left = start > 0 ? cur[start - 1] : "";
            const needsLeadingSpace = !!left && !/\s/.test(left);
            const { interimNode, caretNode } = getAnchoredPreviewNodes();
            interimNode.textContent = t ? `${needsLeadingSpace ? " " : ""}${t}` : "";
            if (t) {
              anchorRange.insertNode(interimNode);
              const after = document.createRange();
              after.setStartAfter(interimNode);
              after.collapse(true);
              after.insertNode(caretNode);
            } else {
              anchorRange.insertNode(caretNode);
            }
            return;
          }
          removeAnchoredPreview();
          setTailPreviewVisible(true);
          if (i.textContent !== t) i.textContent = t;
        },
        clearInterim() {
          const anchored =
            dictationAnchorRef.current &&
            rangeInCommitted(dictationAnchorRef.current);
          if (anchored) {
            removeAnchoredPreview();
            setTailPreviewVisible(false);
            const anchorRange = dictationAnchorRef.current!.cloneRange();
            const { caretNode } = getAnchoredPreviewNodes();
            anchorRange.insertNode(caretNode);
            return;
          }
          removeAnchoredPreview();
          setTailPreviewVisible(true);
          const i = interimRef.current;
          if (i) i.textContent = "";
        },
        reset() {
          const c = committedRef.current;
          if (c) c.textContent = "";
          const i = interimRef.current;
          if (i) i.textContent = "";
          removeAnchoredPreview();
          setTailPreviewVisible(true);
          lastCaretRangeRef.current = null;
          dictationAnchorRef.current = null;
        },
        setText(t) {
          const c = committedRef.current;
          if (c) c.textContent = t;
          dictationAnchorRef.current = null;
          removeAnchoredPreview();
          setTailPreviewVisible(true);
          const selection = window.getSelection();
          if (c && selection) {
            const atEnd = document.createRange();
            atEnd.selectNodeContents(c);
            atEnd.collapse(false);
            selection.removeAllRanges();
            selection.addRange(atEnd);
            lastCaretRangeRef.current = atEnd.cloneRange();
          }
        },
      }),
      [
        getAnchoredPreviewNodes,
        rangeInCommitted,
        removeAnchoredPreview,
        resolveInsertionRange,
        setTailPreviewVisible,
        textOffsetFromPoint,
      ],
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
      cacheCaretRange();
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
          onMouseUp={cacheCaretRange}
          onKeyUp={cacheCaretRange}
          onBlur={cacheCaretRange}
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
            ref={tailCaretRef}
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
