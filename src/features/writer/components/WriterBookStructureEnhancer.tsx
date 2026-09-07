"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type DragEvent,
} from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/Button";
import {
  createBookSectionAction,
  loadBookStructureAction,
  prepareBookForPublicationAction,
  reorderBookStructureAction,
  saveBookSectionAction,
} from "@/features/works/book-structure-actions";
import {
  bookSectionDetails,
  specialBookSectionKinds,
  type BookStructureItem,
  type SpecialBookSectionKind,
} from "@/features/works/book-structure";

import { PagedManuscriptEditor } from "./PagedManuscriptEditor";

type WriterTarget = {
  screen: HTMLElement;
  header: HTMLElement;
  list: HTMLElement;
  canvas: HTMLElement;
  toolbarActions: HTMLElement;
  workIdInput: HTMLInputElement;
  workTitleInput: HTMLInputElement;
  originalAddButton: HTMLButtonElement | null;
  originalPublishButton: HTMLButtonElement | null;
  originalChapterButtons: HTMLButtonElement[];
};

type SpecialDraft = {
  title: string;
  content: string;
};

function getWriterTarget(): WriterTarget | null {
  if (typeof document === "undefined") {
    return null;
  }

  const screen = document.querySelector<HTMLElement>(".writer-screen");
  const header = screen?.querySelector<HTMLElement>(".writer-chapters__header");
  const list = screen?.querySelector<HTMLElement>(".writer-chapters__list");
  const canvas = screen?.querySelector<HTMLElement>(".writer-canvas");
  const toolbarActions = screen?.querySelector<HTMLElement>(
    ".writer-toolbar__actions",
  );
  const workIdInput = screen?.querySelector<HTMLInputElement>(
    'input[name="workId"]',
  );
  const workTitleInput = canvas?.querySelector<HTMLInputElement>(
    ":scope > .writer-work-title",
  );

  if (
    !screen ||
    !header ||
    !list ||
    !canvas ||
    !toolbarActions ||
    !workIdInput ||
    !workTitleInput
  ) {
    return null;
  }

  const originalChapterButtons = Array.from(
    list.querySelectorAll<HTMLButtonElement>(":scope > .writer-chapter-item"),
  );
  const originalHeaderButtons = Array.from(
    header.querySelectorAll<HTMLButtonElement>(":scope > button"),
  );
  const toolbarButtons = Array.from(
    toolbarActions.querySelectorAll<HTMLButtonElement>(":scope > button"),
  );

  return {
    screen,
    header,
    list,
    canvas,
    toolbarActions,
    workIdInput,
    workTitleInput,
    originalAddButton: originalHeaderButtons[0] ?? null,
    originalPublishButton: toolbarButtons.at(-1) ?? null,
    originalChapterButtons,
  };
}

function getWriterTargetSnapshot() {
  const target = getWriterTarget();

  if (!target) {
    return "writer-book-structure-unavailable";
  }

  const activeChapterIndex = target.originalChapterButtons.findIndex(
    (button) => button.dataset.active === "true",
  );
  const saveState = target.screen.querySelector<HTMLElement>(
    ".writer-save-status",
  )?.dataset.state;

  return [
    target.workIdInput.value,
    target.originalChapterButtons.length,
    activeChapterIndex,
    saveState ?? "",
  ].join("|");
}

function getServerSnapshot() {
  return "writer-book-structure-unavailable";
}

function subscribeWriterTarget(onStoreChange: () => void) {
  if (typeof document === "undefined") {
    return () => undefined;
  }

  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["data-active", "data-state"],
    childList: true,
    subtree: true,
  });

  return () => observer.disconnect();
}

function fingerprint(draft: SpecialDraft) {
  return `${draft.title}\u0000${draft.content}`;
}

function sortItems(items: BookStructureItem[]) {
  return [...items].sort((left, right) => left.position - right.position);
}

function moveItem(
  items: BookStructureItem[],
  draggedId: string,
  targetId: string,
) {
  const fromIndex = items.findIndex((item) => item.id === draggedId);
  const targetIndex = items.findIndex((item) => item.id === targetId);

  if (fromIndex < 0 || targetIndex < 0 || fromIndex === targetIndex) {
    return items;
  }

  const next = [...items];
  const [dragged] = next.splice(fromIndex, 1);

  if (!dragged) {
    return items;
  }

  next.splice(targetIndex, 0, dragged);

  return next.map((item, index) => ({
    ...item,
    position: index + 1,
  }));
}

export function WriterBookStructureEnhancer() {
  const snapshot = useSyncExternalStore(
    subscribeWriterTarget,
    getWriterTargetSnapshot,
    getServerSnapshot,
  );
  const target = getWriterTarget();
  const workId = target?.workIdInput.value ?? "";
  const [items, setItems] = useState<BookStructureItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [specialDraft, setSpecialDraft] = useState<SpecialDraft | null>(null);
  const [savedSpecialFingerprint, setSavedSpecialFingerprint] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingSpecial, setIsSavingSpecial] = useState(false);
  const [isStructureBusy, setIsStructureBusy] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const chapterButtonMapRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const addMenuRef = useRef<HTMLDetailsElement | null>(null);
  const publishBypassRef = useRef(false);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId],
  );
  const selectedSpecialItem =
    selectedItem && selectedItem.chapterId === null ? selectedItem : null;
  const specialDirty = Boolean(
    selectedSpecialItem &&
      specialDraft &&
      fingerprint(specialDraft) !== savedSpecialFingerprint,
  );

  useEffect(() => {
    if (!target || !workId || snapshot === "writer-book-structure-unavailable") {
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    void loadBookStructureAction(workId).then((result) => {
      if (cancelled) {
        return;
      }

      setIsLoading(false);

      if (result.status !== "success" || !result.items) {
        setMessage(result.message);
        return;
      }

      const nextItems = sortItems(result.items);
      setItems(nextItems);
      setMessage("");

      const activeChapterIndex = target.originalChapterButtons.findIndex(
        (button) => button.dataset.active === "true",
      );
      const chapterItems = nextItems
        .filter((item) => item.chapterId !== null)
        .sort(
          (left, right) =>
            (left.chapterPosition ?? Number.MAX_SAFE_INTEGER) -
            (right.chapterPosition ?? Number.MAX_SAFE_INTEGER),
        );
      const activeItem =
        chapterItems[activeChapterIndex] ?? chapterItems[0] ?? nextItems[0] ?? null;

      if (activeItem) {
        setSelectedItemId(activeItem.id);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [snapshot, target, workId]);

  useEffect(() => {
    const currentTarget = getWriterTarget();

    if (!currentTarget || !items.length) {
      return;
    }

    const chapterItems = items
      .filter((item) => item.chapterId !== null)
      .sort(
        (left, right) =>
          (left.chapterPosition ?? Number.MAX_SAFE_INTEGER) -
          (right.chapterPosition ?? Number.MAX_SAFE_INTEGER),
      );
    const map = new Map<string, HTMLButtonElement>();

    chapterItems.forEach((item, index) => {
      const button = currentTarget.originalChapterButtons[index];

      if (button) {
        map.set(item.id, button);
      }
    });

    chapterButtonMapRef.current = map;
  }, [items, snapshot]);

  useEffect(() => {
    const currentTarget = getWriterTarget();
    const publishButton = currentTarget?.originalPublishButton;

    if (!currentTarget || !publishButton || !workId) {
      return;
    }

    const handlePublish = (event: MouseEvent) => {
      if (publishBypassRef.current) {
        publishBypassRef.current = false;
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      void (async () => {
        setIsStructureBusy(true);
        const result = await prepareBookForPublicationAction(workId);
        setIsStructureBusy(false);

        if (result.status !== "success" || !result.items) {
          setMessage(result.message);
          window.alert(result.message);
          return;
        }

        const nextItems = sortItems(result.items);
        setItems(nextItems);
        setMessage(result.message);

        if (
          selectedSpecialItem?.kind === "toc" &&
          selectedSpecialItem.id === result.tocItemId &&
          typeof result.tocContent === "string"
        ) {
          const nextDraft = {
            title: "İçindekiler",
            content: result.tocContent,
          };
          setSpecialDraft(nextDraft);
          setSavedSpecialFingerprint(fingerprint(nextDraft));
        }

        if (publishButton.disabled) {
          setMessage(
            "Yayınlamak için önce metin içeren bir ana bölüm seçmelisin.",
          );
          return;
        }

        publishBypassRef.current = true;
        publishButton.click();
      })();
    };

    publishButton.addEventListener("click", handlePublish, true);

    return () => publishButton.removeEventListener("click", handlePublish, true);
  }, [snapshot, selectedSpecialItem, workId]);

  useEffect(() => {
    if (!selectedSpecialItem || !specialDraft || !specialDirty || !workId) {
      return;
    }

    const itemId = selectedSpecialItem.id;
    const draftToSave = { ...specialDraft };
    const timeout = window.setTimeout(() => {
      void saveBookSectionAction({
        workId,
        itemId,
        title: draftToSave.title,
        content: draftToSave.content,
      }).then((result) => {
        if (result.status !== "success" || !result.item) {
          setMessage(result.message);
          return;
        }

        setItems((current) =>
          current.map((item) => (item.id === result.item?.id ? result.item : item)),
        );
        setSavedSpecialFingerprint(fingerprint(draftToSave));
        setMessage("Otomatik kaydedildi.");
      });
    }, 15000);

    return () => window.clearTimeout(timeout);
  }, [selectedSpecialItem, specialDirty, specialDraft, workId]);

  if (!target || snapshot === "writer-book-structure-unavailable") {
    return null;
  }

  async function saveSelectedSpecial() {
    if (!selectedSpecialItem || !specialDraft || !workId) {
      return true;
    }

    setIsSavingSpecial(true);
    const result = await saveBookSectionAction({
      workId,
      itemId: selectedSpecialItem.id,
      title: specialDraft.title,
      content: specialDraft.content,
    });
    setIsSavingSpecial(false);

    if (result.status !== "success" || !result.item) {
      setMessage(result.message);
      return false;
    }

    setItems((current) =>
      current.map((item) => (item.id === result.item?.id ? result.item : item)),
    );
    setSavedSpecialFingerprint(fingerprint(specialDraft));
    setMessage(result.message);
    return true;
  }

  async function prepareBeforeStructureChange() {
    if (!specialDirty) {
      return true;
    }

    return saveSelectedSpecial();
  }

  async function handleAddSpecial(kind: SpecialBookSectionKind) {
    if (!(await prepareBeforeStructureChange())) {
      return;
    }

    setIsStructureBusy(true);
    const result = await createBookSectionAction(workId, kind);
    setIsStructureBusy(false);
    addMenuRef.current?.removeAttribute("open");

    if (result.status !== "success" || !result.item) {
      setMessage(result.message);
      return;
    }

    const nextItems = sortItems([...items, result.item]);
    setItems(nextItems);
    setSelectedItemId(result.item.id);
    const nextDraft = {
      title: result.item.title,
      content: result.item.content,
    };
    setSpecialDraft(nextDraft);
    setSavedSpecialFingerprint(fingerprint(nextDraft));
    setMessage(result.message);
  }

  async function handleAddChapter() {
    if (!(await prepareBeforeStructureChange())) {
      return;
    }

    addMenuRef.current?.removeAttribute("open");

    if (!target.originalAddButton) {
      setMessage("Yeni bölüm düğmesi bulunamadı.");
      return;
    }

    target.originalAddButton.click();
  }

  function handleSelectItem(item: BookStructureItem) {
    if (item.id === selectedItemId) {
      return;
    }

    if (specialDirty) {
      const shouldSwitch = window.confirm(
        "Bu kitap sayfasında kaydedilmemiş değişiklikler var. Sayfayı değiştirmek istediğine emin misin?",
      );

      if (!shouldSwitch) {
        return;
      }
    }

    if (item.chapterId) {
      const originalButton = chapterButtonMapRef.current.get(item.id);

      if (!originalButton) {
        setMessage("Bölüm bağlantısı güncel değil. Sayfayı yenileyip tekrar dene.");
        return;
      }

      originalButton.click();

      window.requestAnimationFrame(() => {
        if (originalButton.dataset.active === "true") {
          setSelectedItemId(item.id);
          setSpecialDraft(null);
          setSavedSpecialFingerprint("");
          setMessage("");
        }
      });
      return;
    }

    setSelectedItemId(item.id);
    const nextDraft = {
      title: item.title,
      content: item.content,
    };
    setSpecialDraft(nextDraft);
    setSavedSpecialFingerprint(fingerprint(nextDraft));
    setMessage("");
  }

  async function handleDrop(targetId: string) {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    if (!(await prepareBeforeStructureChange())) {
      setDraggedId(null);
      return;
    }

    const previousItems = items;
    const nextItems = moveItem(items, draggedId, targetId);
    setItems(nextItems);
    setDraggedId(null);
    setIsStructureBusy(true);

    const result = await reorderBookStructureAction({
      workId,
      orderedItemIds: nextItems.map((item) => item.id),
    });

    setIsStructureBusy(false);

    if (result.status !== "success" || !result.items) {
      setItems(previousItems);
      setMessage(result.message);
      return;
    }

    setItems(sortItems(result.items));
    setMessage(result.message);
  }

  async function handleSpecialPublish() {
    if (!(await saveSelectedSpecial())) {
      return;
    }

    const currentTarget = getWriterTarget();
    const publishButton = currentTarget?.originalPublishButton;

    if (!publishButton || publishButton.disabled) {
      setMessage("Yayınlamak için önce metin içeren bir ana bölüm oluşturmalısın.");
      return;
    }

    publishButton.click();
  }

  const specialDetails = selectedSpecialItem
    ? bookSectionDetails[selectedSpecialItem.kind]
    : null;

  return (
    <>
      {createPortal(
        <div className="writer-book-structure__header">
          <div>
            <span>Kitap Yapısı</span>
            <strong>{items.length}</strong>
          </div>

          <details className="writer-book-structure__add" ref={addMenuRef}>
            <summary
              aria-label="Kitaba sayfa veya bölüm ekle"
              title="Kitaba sayfa veya bölüm ekle"
            >
              +
            </summary>
            <div className="writer-book-structure__add-menu">
              <button
                type="button"
                onClick={() => void handleAddChapter()}
                disabled={isStructureBusy || isLoading}
              >
                <strong>Bölüm</strong>
                <small>Yeni ana metin bölümü</small>
              </button>

              <span>Ek sayfalar</span>

              {specialBookSectionKinds.map((kind) => (
                <button
                  type="button"
                  key={kind}
                  onClick={() => void handleAddSpecial(kind)}
                  disabled={isStructureBusy || isLoading}
                >
                  <strong>{bookSectionDetails[kind].label}</strong>
                  <small>{bookSectionDetails[kind].description}</small>
                </button>
              ))}
            </div>
          </details>
        </div>,
        target.header,
      )}

      {createPortal(
        <div className="writer-book-structure__list" aria-label="Kitap sırası">
          {isLoading && !items.length ? (
            <p className="writer-book-structure__empty">Kitap yapısı yükleniyor…</p>
          ) : (
            items.map((item) => {
              const isActive = item.id === selectedItemId;
              const details = bookSectionDetails[item.kind];

              return (
                <button
                  type="button"
                  className="writer-book-structure__item"
                  data-active={isActive}
                  data-dragging={item.id === draggedId}
                  draggable={!isStructureBusy}
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  onDragStart={(event: DragEvent<HTMLButtonElement>) => {
                    setDraggedId(item.id);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", item.id);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    void handleDrop(item.id);
                  }}
                  onDragEnd={() => setDraggedId(null)}
                  aria-current={isActive ? "page" : undefined}
                  title="Sürükleyip kitap sırasını değiştirebilirsin"
                >
                  <span className="writer-book-structure__drag" aria-hidden="true">
                    ⋮⋮
                  </span>
                  <span className="writer-book-structure__position">{item.position}</span>
                  <span className="writer-book-structure__content">
                    <small>{details.label}{item.isAutomatic ? " · otomatik" : ""}</small>
                    <strong>{item.title}</strong>
                    <em>{item.wordCount.toLocaleString("tr-TR")} kelime</em>
                  </span>
                  <span className="writer-book-structure__chevron" aria-hidden="true">
                    {isActive ? "●" : "›"}
                  </span>
                </button>
              );
            })
          )}

          {message && (
            <p className="writer-book-structure__message" role="status">
              {message}
            </p>
          )}
        </div>,
        target.list,
      )}

      {selectedSpecialItem && specialDraft && specialDetails &&
        createPortal(
          <div className="writer-special-page-editor" data-kind={selectedSpecialItem.kind}>
            <PagedManuscriptEditor
              workTitle={target.workTitleInput.value}
              chapterTitle={specialDraft.title}
              subtitle={specialDetails.description}
              content={specialDraft.content}
              workTitleLabel="Eser başlığı"
              chapterTitleLabel={`${specialDetails.label} başlığı`}
              bodyLabel={`${specialDetails.label} metni`}
              bodyPlaceholder={specialDetails.bodyPlaceholder}
              onWorkTitleChange={() => undefined}
              onChapterTitleChange={(value) =>
                setSpecialDraft((current) =>
                  current ? { ...current, title: value } : current,
                )
              }
              onContentChange={(value) =>
                setSpecialDraft((current) =>
                  current ? { ...current, content: value } : current,
                )
              }
            />
          </div>,
          target.canvas,
        )}

      {selectedSpecialItem && specialDraft &&
        createPortal(
          <div className="writer-book-structure__toolbar-actions">
            <span data-state={specialDirty ? "unsaved" : "saved"}>
              {isSavingSpecial
                ? "Kaydediliyor…"
                : specialDirty
                  ? "Kaydedilmedi"
                  : "Kaydedildi"}
            </span>
            <Button
              type="button"
              variant="outline"
              loading={isSavingSpecial}
              onClick={() => void saveSelectedSpecial()}
            >
              Sayfayı Kaydet
            </Button>
            <Button
              type="button"
              loading={isStructureBusy}
              onClick={() => void handleSpecialPublish()}
            >
              Yayınla
            </Button>
          </div>,
          target.toolbarActions,
        )}
    </>
  );
}
