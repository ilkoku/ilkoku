"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { editorsContent, validationContent } from "@/content";

interface EvaluationRequestProps {
  editorName: string;
}

export function EvaluationRequest({ editorName }: EvaluationRequestProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSuccessful, setIsSuccessful] = useState(false);
  const openerRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    modalRef.current?.querySelector<HTMLSelectElement>("select")?.focus();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        window.requestAnimationFrame(() => openerRef.current?.focus());
      }

      if (event.key === "Tab") {
        const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
          "button:not([disabled]), select:not([disabled]), textarea:not([disabled])",
        );
        if (!focusable?.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  function openModal() {
    setIsSuccessful(false);
    setIsOpen(true);
  }

  function closeModal() {
    setIsOpen(false);
    window.requestAnimationFrame(() => openerRef.current?.focus());
  }

  function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSuccessful(true);
  }

  return (
    <>
      <button className="button button--primary editor-request-trigger" ref={openerRef} type="button" onClick={openModal}>
        <span className="button__label">{editorsContent.request.trigger}</span>
      </button>

      {isOpen && (
        <div className="editor-modal-layer">
          <section className="editor-modal" ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="talep-basligi" aria-describedby="talep-aciklamasi">
            <button className="editor-modal__close" type="button" onClick={closeModal} aria-label={editorsContent.request.closeLabel}>×</button>

            {!isSuccessful ? (
              <>
                <header className="editor-modal__heading">
                  <p>{editorsContent.request.eyebrow}</p>
                  <h2 id="talep-basligi">{editorsContent.request.title}</h2>
                  <span id="talep-aciklamasi">{editorsContent.request.description(editorName)}</span>
                </header>
                <form className="editor-request-form" onSubmit={submitRequest}>
                  <Field control="select" label={editorsContent.request.workLabel} name="eser" required defaultValue="">
                    <option value="" disabled>{editorsContent.request.workPlaceholder}</option>
                    {editorsContent.request.works.map((work) => <option key={work}>{work}</option>)}
                  </Field>
                  <Field control="select" label={editorsContent.request.typeLabel} name="degerlendirme-turu" required defaultValue="">
                    <option value="" disabled>{editorsContent.request.typePlaceholder}</option>
                    {editorsContent.request.types.map((type) => <option key={type}>{type}</option>)}
                  </Field>
                  <Field control="textarea" label={editorsContent.request.expectationLabel} name="beklenti" required rows={5} maxLength={800} placeholder={editorsContent.request.expectationPlaceholder} message={validationContent.maximumCharacters(800)} />
                  <Field control="select" label={editorsContent.request.deliveryLabel} name="teslim-suresi" required defaultValue="">
                    <option value="" disabled>{editorsContent.request.deliveryPlaceholder}</option>
                    {editorsContent.request.deliveryOptions.map((option) => <option key={option}>{option}</option>)}
                  </Field>
                  <p className="editor-request-form__note">{editorsContent.request.note}</p>
                  <Button type="submit">{editorsContent.request.submit}</Button>
                </form>
              </>
            ) : (
              <div className="editor-request-success" role="status">
                <span aria-hidden="true">✓</span>
                <p>{editorsContent.request.successEyebrow}</p>
                <h2 id="talep-basligi">{editorsContent.request.successTitle}</h2>
                <p id="talep-aciklamasi">{editorsContent.request.successDescription}</p>
                <Button onClick={closeModal}>{editorsContent.request.done}</Button>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
