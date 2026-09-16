"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { createPortal } from "react-dom";

type TextSelection = {
  start: number;
  end: number;
};

type WriterHistory = {
  past: string[];
  present: string;
  future: string[];
  source: HTMLTextAreaElement | null;
};

const HISTORY_LIMIT = 100;
const EMPTY_SELECTION: TextSelection = { start: 0, end: 0 };

function getToolbarTarget() {
  if (typeof document === "undefined") return null;
  return document.querySelector<HTMLElement>(".writer-context-bar");
}

function getServerToolbarTarget() {
  return null;
}

function subscribeToolbarTarget(onStoreChange: () => void) {
  if (typeof document === "undefined") return () => undefined;

  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}

function getCanonicalBody() {
  return document.querySelector<HTMLTextAreaElement>(
    ".writer-canvas > .writer-textarea",
  );
}

function getPageTextareas() {
  return Array.from(
    document.querySelectorAll<HTMLTextAreaElement>(
      ".writer-manuscript-pages .writer-page-textarea",
    ),
  );
}

function setNativeTextareaValue(element: HTMLTextAreaElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    "value",
  );
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function normalizePastedText(value: string) {
  return value
    .replace(/\r\n?/gu, "\n")
    .replace(/\u00a0/gu, " ")
    .replace(/[\u200b\u200c\u200d\ufeff]/gu, "");
}

function countWords(value: string) {
  const normalized = value.trim();
  return normalized ? normalized.split(/\s+/u).length : 0;
}

function readActiveSelection(): TextSelection | null {
  const active = document.activeElement;
  if (!(active instanceof HTMLTextAreaElement)) return null;

  const pages = getPageTextareas();
  const pageIndex = pages.indexOf(active);
  if (pageIndex < 0) return null;

  const pageStart = pages
    .slice(0, pageIndex)
    .reduce((total, textarea) => total + textarea.value.length, 0);

  return {
    start: pageStart + (active.selectionStart ?? 0),
    end: pageStart + (active.selectionEnd ?? active.selectionStart ?? 0),
  };
}

function focusAbsoluteSelection(selection: TextSelection, attempt = 0) {
  if (attempt > 8) return;

  window.requestAnimationFrame(() => {
    const pages = getPageTextareas();
    if (!pages.length) {
      focusAbsoluteSelection(selection, attempt + 1);
      return;
    }

    let pageStart = 0;
    let target = pages[pages.length - 1];
    let targetStart = pages
      .slice(0, -1)
      .reduce((total, textarea) => total + textarea.value.length, 0);

    for (const page of pages) {
      const pageEnd = pageStart + page.value.length;
      if (selection.start <= pageEnd) {
        target = page;
        targetStart = pageStart;
        break;
      }
      pageStart = pageEnd;
    }

    const localStart = Math.max(
      0,
      Math.min(selection.start - targetStart, target.value.length),
    );
    const localEnd = Math.max(
      localStart,
      Math.min(selection.end - targetStart, target.value.length),
    );

    target.focus();
    target.setSelectionRange(localStart, localEnd);
  });
}

function countMatches(content: string, query: string, matchCase: boolean) {
  if (!query) return 0;
  const haystack = matchCase ? content : content.toLocaleLowerCase("tr-TR");
  const needle = matchCase ? query : query.toLocaleLowerCase("tr-TR");
  let count = 0;
  let cursor = 0;

  while (cursor <= haystack.length - needle.length) {
    const index = haystack.indexOf(needle, cursor);
    if (index < 0) break;
    count += 1;
    cursor = index + Math.max(needle.length, 1);
  }

  return count;
}

function findNextMatch(
  content: string,
  query: string,
  from: number,
  matchCase: boolean,
) {
  if (!query) return null;
  const haystack = matchCase ? content : content.toLocaleLowerCase("tr-TR");
  const needle = matchCase ? query : query.toLocaleLowerCase("tr-TR");
  let index = haystack.indexOf(needle, Math.max(0, from));
  if (index < 0 && from > 0) index = haystack.indexOf(needle, 0);
  return index < 0 ? null : { start: index, end: index + query.length };
}

function preventToolbarFocus(event: ReactMouseEvent<HTMLButtonElement>) {
  event.preventDefault();
}

export function WriterTextEditingCommands() {
  const target = useSyncExternalStore(
    subscribeToolbarTarget,
    getToolbarTarget,
    getServerToolbarTarget,
  );
  const historyRef = useRef<WriterHistory>({
    past: [],
    present: "",
    future: [],
    source: null,
  });
  const suppressInputRef = useRef(false);
  const lastSelectionRef = useRef<TextSelection>(EMPTY_SELECTION);
  const [selection, setSelection] = useState<TextSelection>(EMPTY_SELECTION);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [searchStatus, setSearchStatus] = useState("");
  const [contentSnapshot, setContentSnapshot] = useState("");

  function syncHistorySource() {
    const body = getCanonicalBody();
    const history = historyRef.current;

    if (!body) return null;
    if (history.source !== body) {
      historyRef.current = {
        past: [],
        present: body.value,
        future: [],
        source: body,
      };
      setHistoryVersion((value) => value + 1);
      setContentSnapshot(body.value);
    } else if (history.present !== body.value && !suppressInputRef.current) {
      historyRef.current = {
        ...history,
        present: body.value,
      };
      setContentSnapshot(body.value);
    }

    return body;
  }

  function captureSelection() {
    const next = readActiveSelection();
    if (!next) return;
    lastSelectionRef.current = next;
    setSelection(next);
  }

  function applyContent(nextContent: string, nextSelection: TextSelection) {
    const body = syncHistorySource();
    if (!body) return;

    const history = historyRef.current;
    if (nextContent === body.value) {
      lastSelectionRef.current = nextSelection;
      setSelection(nextSelection);
      focusAbsoluteSelection(nextSelection);
      return;
    }

    const past = [...history.past, body.value].slice(-HISTORY_LIMIT);
    historyRef.current = {
      past,
      present: nextContent,
      future: [],
      source: body,
    };
    suppressInputRef.current = true;
    setNativeTextareaValue(body, nextContent);
    setContentSnapshot(nextContent);
    setHistoryVersion((value) => value + 1);
    lastSelectionRef.current = nextSelection;
    setSelection(nextSelection);
    focusAbsoluteSelection(nextSelection);
  }

  function undo() {
    const body = syncHistorySource();
    if (!body) return;
    const history = historyRef.current;
    if (!history.past.length) return;

    const previous = history.past[history.past.length - 1];
    historyRef.current = {
      past: history.past.slice(0, -1),
      present: previous,
      future: [body.value, ...history.future].slice(0, HISTORY_LIMIT),
      source: body,
    };
    suppressInputRef.current = true;
    setNativeTextareaValue(body, previous);
    setContentSnapshot(previous);
    setHistoryVersion((value) => value + 1);
    const nextSelection = {
      start: Math.min(lastSelectionRef.current.start, previous.length),
      end: Math.min(lastSelectionRef.current.start, previous.length),
    };
    lastSelectionRef.current = nextSelection;
    setSelection(nextSelection);
    focusAbsoluteSelection(nextSelection);
  }

  function redo() {
    const body = syncHistorySource();
    if (!body) return;
    const history = historyRef.current;
    if (!history.future.length) return;

    const next = history.future[0];
    historyRef.current = {
      past: [...history.past, body.value].slice(-HISTORY_LIMIT),
      present: next,
      future: history.future.slice(1),
      source: body,
    };
    suppressInputRef.current = true;
    setNativeTextareaValue(body, next);
    setContentSnapshot(next);
    setHistoryVersion((value) => value + 1);
    const nextSelection = {
      start: Math.min(lastSelectionRef.current.start, next.length),
      end: Math.min(lastSelectionRef.current.start, next.length),
    };
    lastSelectionRef.current = nextSelection;
    setSelection(nextSelection);
    focusAbsoluteSelection(nextSelection);
  }

  function insertSceneDivider() {
    const body = syncHistorySource();
    if (!body) return;
    const activeSelection = readActiveSelection() ?? lastSelectionRef.current;
    const before = body.value.slice(0, activeSelection.start);
    const after = body.value.slice(activeSelection.end);
    const prefix = before.length === 0 ? "" : before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
    const suffix = after.length === 0 ? "" : after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n";
    const insertion = `${prefix}* * *${suffix}`;
    const nextContent = `${before}${insertion}${after}`;
    const cursor = before.length + insertion.length;
    applyContent(nextContent, { start: cursor, end: cursor });
  }

  function findNext() {
    const body = syncHistorySource();
    if (!body || !query) return;
    const activeSelection = readActiveSelection() ?? lastSelectionRef.current;
    const match = findNextMatch(body.value, query, activeSelection.end, matchCase);
    if (!match) {
      setSearchStatus("Eşleşme bulunamadı");
      return;
    }
    lastSelectionRef.current = match;
    setSelection(match);
    focusAbsoluteSelection(match);
    setSearchStatus(`${countMatches(body.value, query, matchCase)} eşleşme`);
  }

  function replaceCurrent() {
    const body = syncHistorySource();
    if (!body || !query) return;
    let activeSelection = readActiveSelection() ?? lastSelectionRef.current;
    const selected = body.value.slice(activeSelection.start, activeSelection.end);
    const equalsQuery = matchCase
      ? selected === query
      : selected.toLocaleLowerCase("tr-TR") === query.toLocaleLowerCase("tr-TR");

    if (!equalsQuery) {
      const match = findNextMatch(body.value, query, activeSelection.end, matchCase);
      if (!match) {
        setSearchStatus("Eşleşme bulunamadı");
        return;
      }
      activeSelection = match;
    }

    const nextContent =
      body.value.slice(0, activeSelection.start) +
      replacement +
      body.value.slice(activeSelection.end);
    const cursor = activeSelection.start + replacement.length;
    applyContent(nextContent, { start: cursor, end: cursor });
    setSearchStatus("1 eşleşme değiştirildi");
  }

  function replaceAll() {
    const body = syncHistorySource();
    if (!body || !query) return;
    const matchCount = countMatches(body.value, query, matchCase);
    if (!matchCount) {
      setSearchStatus("Eşleşme bulunamadı");
      return;
    }

    const source = body.value;
    const haystack = matchCase ? source : source.toLocaleLowerCase("tr-TR");
    const needle = matchCase ? query : query.toLocaleLowerCase("tr-TR");
    let cursor = 0;
    let nextContent = "";

    while (cursor < source.length) {
      const index = haystack.indexOf(needle, cursor);
      if (index < 0) {
        nextContent += source.slice(cursor);
        break;
      }
      nextContent += source.slice(cursor, index) + replacement;
      cursor = index + query.length;
    }

    const nextCursor = Math.min(lastSelectionRef.current.start, nextContent.length);
    applyContent(nextContent, { start: nextCursor, end: nextCursor });
    setSearchStatus(`${matchCount} eşleşme değiştirildi`);
  }

  useEffect(() => {
    if (!target) return;

    const body = getCanonicalBody();
    if (body && historyRef.current.source !== body) {
      historyRef.current = {
        past: [],
        present: body.value,
        future: [],
        source: body,
      };
      setContentSnapshot(body.value);
      setHistoryVersion((value) => value + 1);
    }

    function handleSelectionEvent() {
      captureSelection();
    }

    function handleInput(event: Event) {
      const canonical = getCanonicalBody();
      if (!canonical || event.target !== canonical) return;

      const history = historyRef.current;
      const next = canonical.value;

      if (suppressInputRef.current) {
        suppressInputRef.current = false;
        historyRef.current = { ...history, present: next, source: canonical };
      } else if (history.present !== next) {
        historyRef.current = {
          past: [...history.past, history.present].slice(-HISTORY_LIMIT),
          present: next,
          future: [],
          source: canonical,
        };
      }

      setContentSnapshot(next);
      setHistoryVersion((value) => value + 1);
    }

    function handlePaste(event: ClipboardEvent) {
      if (!(event.target instanceof HTMLTextAreaElement)) return;
      if (!event.target.classList.contains("writer-page-textarea")) return;
      const body = getCanonicalBody();
      if (!body) return;
      const pasted = normalizePastedText(event.clipboardData?.getData("text/plain") ?? "");
      if (!pasted) return;

      event.preventDefault();
      const activeSelection = readActiveSelection() ?? lastSelectionRef.current;
      const nextContent =
        body.value.slice(0, activeSelection.start) +
        pasted +
        body.value.slice(activeSelection.end);
      const cursor = activeSelection.start + pasted.length;
      applyContent(nextContent, { start: cursor, end: cursor });
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (!(event.target instanceof HTMLTextAreaElement)) return;
      if (!event.target.classList.contains("writer-page-textarea")) return;
      const modifier = event.metaKey || event.ctrlKey;
      if (!modifier) return;

      if (event.key.toLocaleLowerCase("tr-TR") === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }

      if (event.key.toLocaleLowerCase("tr-TR") === "y") {
        event.preventDefault();
        redo();
        return;
      }

      if (event.key.toLocaleLowerCase("tr-TR") === "f") {
        event.preventDefault();
        setSearchOpen(true);
      }
    }

    document.addEventListener("selectionchange", handleSelectionEvent);
    document.addEventListener("keyup", handleSelectionEvent, true);
    document.addEventListener("mouseup", handleSelectionEvent, true);
    document.addEventListener("input", handleInput, true);
    document.addEventListener("paste", handlePaste, true);
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionEvent);
      document.removeEventListener("keyup", handleSelectionEvent, true);
      document.removeEventListener("mouseup", handleSelectionEvent, true);
      document.removeEventListener("input", handleInput, true);
      document.removeEventListener("paste", handlePaste, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [target]);

  const selectedText = useMemo(
    () => contentSnapshot.slice(selection.start, selection.end),
    [contentSnapshot, selection],
  );
  const selectedWords = countWords(selectedText);
  const selectedCharacters = selectedText.length;
  const history = historyRef.current;
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;
  void historyVersion;

  if (!target || !getCanonicalBody()) return null;

  return createPortal(
    <>
      <div
        className="writer-text-commands"
        aria-label="Metin düzenleme araçları"
        role="toolbar"
      >
        <div className="writer-editing-tools__group" aria-label="Geri al ve yinele">
          <button
            aria-label="Geri al"
            disabled={!canUndo}
            onClick={undo}
            onMouseDown={preventToolbarFocus}
            title="Geri al (Ctrl/⌘ Z)"
            type="button"
          >
            ↶
          </button>
          <button
            aria-label="Yinele"
            disabled={!canRedo}
            onClick={redo}
            onMouseDown={preventToolbarFocus}
            title="Yinele (Ctrl/⌘ Shift Z)"
            type="button"
          >
            ↷
          </button>
        </div>

        <button
          className="writer-editing-tools__toggle"
          onClick={() => setSearchOpen((open) => !open)}
          onMouseDown={preventToolbarFocus}
          title="Bul ve değiştir (Ctrl/⌘ F)"
          type="button"
        >
          Bul / Değiştir
        </button>

        <button
          className="writer-editing-tools__toggle"
          onClick={insertSceneDivider}
          onMouseDown={preventToolbarFocus}
          title="İmlecin bulunduğu yere sahne ayracı ekle"
          type="button"
        >
          Sahne Ayracı
        </button>

        <output
          className="writer-selection-stats"
          aria-label="Seçili metin istatistikleri"
          aria-live="polite"
        >
          {selectedCharacters > 0
            ? `Seçim: ${selectedWords} kelime · ${selectedCharacters} karakter`
            : "Seçim: —"}
        </output>
      </div>

      {searchOpen ? (
        <section className="writer-find-replace" aria-label="Bul ve değiştir">
          <label>
            <span>Bul</span>
            <input
              autoFocus
              onChange={(event) => {
                setQuery(event.target.value);
                setSearchStatus("");
              }}
              placeholder="Aranacak metin"
              type="search"
              value={query}
            />
          </label>
          <label>
            <span>Değiştir</span>
            <input
              onChange={(event) => setReplacement(event.target.value)}
              placeholder="Yeni metin"
              type="text"
              value={replacement}
            />
          </label>
          <label className="writer-find-replace__case">
            <input
              checked={matchCase}
              onChange={(event) => setMatchCase(event.target.checked)}
              type="checkbox"
            />
            <span>Büyük/küçük harf eşleştir</span>
          </label>
          <div className="writer-find-replace__actions">
            <button disabled={!query} onClick={findNext} type="button">
              Sonrakini Bul
            </button>
            <button disabled={!query} onClick={replaceCurrent} type="button">
              Değiştir
            </button>
            <button disabled={!query} onClick={replaceAll} type="button">
              Tümünü Değiştir
            </button>
            <button onClick={() => setSearchOpen(false)} type="button">
              Kapat
            </button>
          </div>
          <p aria-live="polite">
            {searchStatus || (query ? `${countMatches(contentSnapshot, query, matchCase)} eşleşme` : "")}
          </p>
        </section>
      ) : null}
    </>,
    target,
  );
}
