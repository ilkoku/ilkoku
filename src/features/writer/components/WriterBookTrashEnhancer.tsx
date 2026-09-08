"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { loadBookStructureAction } from "@/features/works/book-structure-actions";
import { bookSectionDetails, type BookStructureItem } from "@/features/works/book-structure";
import {
  emptyBookTrashAction,
  loadBookTrashAction,
  restoreBookTrashItemAction,
  trashBookStructureItemAction,
} from "@/features/works/book-trash-actions";
import type { BookTrashItem } from "@/features/works/book-trash";

type TrashTarget = {
  screen: HTMLElement;
  listHost: HTMLElement;
  enhancedList: HTMLElement;
  workIdInput: HTMLInputElement;
};

const UNAVAILABLE = "writer-book-trash-unavailable";

function getTarget(): TrashTarget | null {
  if (typeof document === "undefined") return null;

  const screen = document.querySelector<HTMLElement>(".writer-screen");
  const listHost = screen?.querySelector<HTMLElement>(".writer-chapters__list");
  const enhancedList = listHost?.querySelector<HTMLElement>(
    ":scope > .writer-book-structure__list",
  );
  const workIdInput = screen?.querySelector<HTMLInputElement>('input[name="workId"]');

  if (!screen || !listHost || !enhancedList || !workIdInput) return null;

  return { screen, listHost, enhancedList, workIdInput };
}

function getSnapshot() {
  const target = getTarget();
  if (!target) return UNAVAILABLE;

  const buttons = Array.from(
    target.enhancedList.querySelectorAll<HTMLButtonElement>(
      ":scope > .writer-book-structure__item",
    ),
  );
  const activeIndex = buttons.findIndex((button) => button.dataset.active === "true");
  const order = buttons
    .map((button) => button.querySelector(".writer-book-structure__position")?.textContent ?? "")
    .join(",");
  const specialSaveState =
    target.screen.querySelector<HTMLElement>(
      '.writer-book-structure__toolbar-actions span[data-state="unsaved"]',
    )
      ? "unsaved"
      : "saved";

  return `${target.workIdInput.value}|${buttons.length}|${activeIndex}|${order}|${specialSaveState}`;
}

function getServerSnapshot() {
  return UNAVAILABLE;
}

function subscribe(onStoreChange: () => void) {
  if (typeof document === "undefined") return () => undefined;

  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["data-active", "data-state"],
    childList: true,
    subtree: true,
  });

  return () => observer.disconnect();
}

function activeIndexFromSnapshot(snapshot: string) {
  if (snapshot === UNAVAILABLE) return -1;
  return Number(snapshot.split("|")[2] ?? -1);
}

export function WriterBookTrashEnhancer() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const target = getTarget();
  const workId = target?.workIdInput.value ?? "";
  const activeIndex = activeIndexFromSnapshot(snapshot);
  const [items, setItems] = useState<BookStructureItem[]>([]);
  const [trash, setTrash] = useState<BookTrashItem[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!workId || snapshot === UNAVAILABLE) return;

    let cancelled = false;

    void Promise.all([
      loadBookStructureAction(workId),
      loadBookTrashAction(workId),
    ]).then(([structureResult, trashResult]) => {
      if (cancelled) return;

      if (structureResult.status === "success" && structureResult.items) {
        setItems(structureResult.items);
      }
      if (trashResult.status === "success" && trashResult.trash) {
        setTrash(trashResult.trash);
      }
      if (structureResult.status === "error") setMessage(structureResult.message);
      else if (trashResult.status === "error") setMessage(trashResult.message);
    });

    return () => {
      cancelled = true;
    };
  }, [snapshot, workId]);

  const selectedItem = useMemo(
    () => (activeIndex >= 0 ? items[activeIndex] ?? null : null),
    [activeIndex, items],
  );
  const hasUnsavedSpecialPage = snapshot.endsWith("|unsaved");

  if (!target || snapshot === UNAVAILABLE) return null;

  async function moveSelectedToTrash() {
    if (!selectedItem || !workId || busy) return;

    if (hasUnsavedSpecialPage) {
      setMessage("Önce seçili kitap sayfasını kaydetmelisin.");
      return;
    }

    const label = selectedItem.title || bookSectionDetails[selectedItem.kind].label;
    const confirmed = window.confirm(
      `“${label}” çöp kutusuna taşınacak. Daha sonra geri yükleyebilirsin. Devam edilsin mi?`,
    );
    if (!confirmed) return;

    setBusy(true);
    const result = await trashBookStructureItemAction({
      workId,
      structureItemId: selectedItem.id,
    });
    setBusy(false);

    if (result.status !== "success") {
      setMessage(result.message);
      return;
    }

    window.location.reload();
  }

  async function restore(item: BookTrashItem) {
    if (busy) return;

    setBusy(true);
    const result = await restoreBookTrashItemAction({
      workId,
      trashItemId: item.id,
    });
    setBusy(false);

    if (result.status !== "success") {
      setMessage(result.message);
      return;
    }

    window.location.reload();
  }

  async function emptyTrash() {
    if (!trash.length || busy) return;

    const confirmed = window.confirm(
      `Çöp kutusundaki ${trash.length} öğe kalıcı olarak silinecek. Bu işlem geri alınamaz. Çöp kutusu boşaltılsın mı?`,
    );
    if (!confirmed) return;

    setBusy(true);
    const result = await emptyBookTrashAction(workId);
    setBusy(false);

    if (result.status !== "success") {
      setMessage(result.message);
      return;
    }

    setTrash([]);
    setMessage(result.message);
  }

  return createPortal(
    <aside className="writer-book-trash" aria-label="Kitap çöp kutusu">
      <button
        type="button"
        className="writer-book-trash__move"
        disabled={!selectedItem || busy || hasUnsavedSpecialPage}
        onClick={() => void moveSelectedToTrash()}
        title={
          hasUnsavedSpecialPage
            ? "Silmeden önce kitap sayfasını kaydet"
            : selectedItem
              ? `${selectedItem.title} öğesini çöp kutusuna taşı`
              : "Önce bir kitap öğesi seç"
        }
      >
        <span aria-hidden="true">⌫</span>
        <span>{busy ? "İşleniyor…" : "Seçili öğeyi sil"}</span>
      </button>

      <details className="writer-book-trash__drawer">
        <summary>
          <span aria-hidden="true">🗑</span>
          <span>Çöp Kutusu</span>
          <strong>{trash.length}</strong>
        </summary>

        <div className="writer-book-trash__panel">
          {trash.length ? (
            <>
              <div className="writer-book-trash__items">
                {trash.map((item) => (
                  <article className="writer-book-trash__item" key={item.id}>
                    <div>
                      <small>{bookSectionDetails[item.kind].label}</small>
                      <strong>{item.title}</strong>
                      <span>{item.wordCount.toLocaleString("tr-TR")} kelime</span>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void restore(item)}
                    >
                      Geri Yükle
                    </button>
                  </article>
                ))}
              </div>

              <button
                type="button"
                className="writer-book-trash__empty"
                disabled={busy}
                onClick={() => void emptyTrash()}
              >
                Çöp Kutusunu Boşalt
              </button>
            </>
          ) : (
            <p>Çöp kutusu boş.</p>
          )}
        </div>
      </details>

      {message ? <p className="writer-book-trash__message" role="status">{message}</p> : null}
    </aside>,
    target.listHost,
  );
}
