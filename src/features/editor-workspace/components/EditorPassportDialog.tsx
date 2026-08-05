"use client";

import {
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

import styles from "./EditorPassportDialog.module.css";

const subscribe = () => () => undefined;
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function EditorPassportDialog({
  workId,
}: {
  workId: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const [frameVersion, setFrameVersion] = useState(0);
  const canUseDom = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  function openDialog() {
    setFrameVersion((current) => current + 1);

    window.requestAnimationFrame(() => {
      dialogRef.current?.showModal();
    });
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  const dialog = (
    <dialog
      aria-describedby={`eser-pasaportu-aciklama-${workId}`}
      aria-labelledby={`eser-pasaportu-${workId}`}
      className={styles.dialog}
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          closeDialog();
        }
      }}
      onClose={() => openerRef.current?.focus()}
      ref={dialogRef}
    >
      <section className={styles.panel}>
        <header className={styles.header}>
          <div className={styles.heading}>
            <span>İnceleme yardımcısı</span>
            <strong id={`eser-pasaportu-${workId}`}>
              Eser Pasaportu
            </strong>
            <small id={`eser-pasaportu-aciklama-${workId}`}>
              Kayıt, sürüm ve bütünlük bilgileri
            </small>
          </div>

          <button
            aria-label="Eser pasaportunu kapat"
            className={styles.close}
            onClick={closeDialog}
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className={styles.frameShell}>
          <iframe
            className={styles.frame}
            key={frameVersion}
            loading="eager"
            src={`/editor/incelemeler/${workId}/pasaport-modal`}
            title="Eser Pasaportu"
          />
        </div>
      </section>
    </dialog>
  );

  return (
    <>
      <button
        className="button button--outline"
        onClick={openDialog}
        ref={openerRef}
        type="button"
      >
        <span className="button__label">Eser Pasaportu</span>
      </button>

      {canUseDom ? createPortal(dialog, document.body) : null}
    </>
  );
}
