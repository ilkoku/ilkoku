"use client";

import { useState } from "react";
import { saveWriterMotivationsAction } from "@/features/cms/writer-motivation-actions";
import {
  WRITER_MOTIVATION_MAXIMUM,
  WRITER_MOTIVATION_MINIMUM,
} from "@/lib/writer-motivation-config";

type CmsWriterMotivationEditorProps = {
  canPublish: boolean;
  initialMotivations: string[];
};

export function CmsWriterMotivationEditor({
  canPublish,
  initialMotivations,
}: CmsWriterMotivationEditorProps) {
  const [motivations, setMotivations] = useState(initialMotivations);

  function updateMotivation(index: number, value: string) {
    setMotivations((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? value : item,
      ),
    );
  }

  function addMotivation() {
    setMotivations((current) =>
      current.length >= WRITER_MOTIVATION_MAXIMUM
        ? current
        : [...current, ""],
    );
  }

  function removeMotivation(index: number) {
    if (index < WRITER_MOTIVATION_MINIMUM) return;
    setMotivations((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  return (
    <form action={saveWriterMotivationsAction} className="content-form">
      <div className="cms-editor-section-label">
        <span>Aktif gün motivasyon serisi</span>
        <small>
          Her satır bir kullanıcının bir sonraki farklı aktif gününde gösterilir.
        </small>
      </div>

      <div className="content-metric-grid" style={{ marginBottom: "1rem" }}>
        <article className="content-metric-card">
          <span>Hazır motivasyon</span>
          <strong>{motivations.length}</strong>
          <small>1–30 başlangıç serisi, 31+ CMS ilavesi</small>
        </article>
        <article className="content-metric-card">
          <span>Başlangıç serisi</span>
          <strong>{WRITER_MOTIVATION_MINIMUM}</strong>
          <small>Silinemez; metinleri düzenlenebilir</small>
        </article>
        <article className="content-metric-card">
          <span>Üst sınır</span>
          <strong>{WRITER_MOTIVATION_MAXIMUM}</strong>
          <small>Aktif gün mesajı</small>
        </article>
      </div>

      <div
        style={{
          display: "grid",
          gap: ".8rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        }}
      >
        {motivations.map((motivation, index) => (
          <label key={`writer-motivation-${index + 1}`}>
            <span>
              Gün {index + 1}
              {index < WRITER_MOTIVATION_MINIMUM
                ? " · İlk seri"
                : " · Ek seri"}
            </span>
            <textarea
              name="motivation"
              rows={4}
              minLength={4}
              maxLength={240}
              required
              value={motivation}
              disabled={!canPublish}
              onChange={(event) =>
                updateMotivation(index, event.target.value)
              }
            />
            {index >= WRITER_MOTIVATION_MINIMUM && canPublish ? (
              <button
                type="button"
                onClick={() => removeMotivation(index)}
                style={{ marginTop: ".45rem" }}
              >
                Bu ek motivasyonu kaldır
              </button>
            ) : null}
          </label>
        ))}
      </div>

      <div className="content-form-actions" style={{ marginTop: "1rem", flexWrap: "wrap" }}>
        {canPublish ? (
          <button
            type="button"
            onClick={addMotivation}
            disabled={motivations.length >= WRITER_MOTIVATION_MAXIMUM}
          >
            + Yeni motivasyon ekle
          </button>
        ) : null}
        <span>
          Aynı kullanıcı aynı gün kaç kez girerse girsin yalnız bir aktif gün sayılır.
        </span>
      </div>

      <div className="cms-editor-savebar">
        <span>
          Kaydetme işlemi yazar panellerine doğrudan uygulanır.
        </span>
        <div className="cms-editor-savebar__actions">
          {canPublish ? (
            <button type="submit">Seriyi kaydet ve canlıya uygula</button>
          ) : (
            <span>Canlı seri için yayın yetkisi gerekir.</span>
          )}
        </div>
      </div>
    </form>
  );
}
