"use client";

import { useRef } from "react";

import { Button } from "@/components/ui/Button";
import styles from "./EditorPassportDialog.module.css";

export function EditorPassportDialog({
  workId,
}: {
  workId: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  function closeDialog() {
    dialogRef.current?.close();
  }

  return (
    <>
      <Button
        onClick={() => dialogRef.current?.showModal()}
        type="button"
        variant="outline"
      >
        Eser Pasaportu
      </Button>

      <dialog
        aria-labelledby={`eser-pasaportu-${workId}`}
        className={styles.dialog}
        onCancel={closeDialog}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeDialog();
          }
        }}
        ref={dialogRef}
      >
        <section className={styles.panel}>
          <header className={styles.header}>
            <div>
              <span>İnceleme yardımcısı</span>
              <strong id={`eser-pasaportu-${workId}`}>
                Eser Pasaportu
              </strong>
            </div>

            <button
              aria-label="Eser pasaportunu kapat"
              className={styles.close}
              onClick={closeDialog}
              type="button"
            >
              ×
            </button>
          </header>

          <div className={styles.frameShell}>
            <iframe
              className={styles.frame}
              loading="lazy"
              src={`/editor/incelemeler/${workId}/pasaport-modal`}
              title="Eser Pasaportu"
            />
          </div>
        </section>
      </dialog>
    </>
  );
}
