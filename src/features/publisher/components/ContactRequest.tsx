"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { publisherContent, validationContent } from "@/content";

interface ContactRequestProps {
  authorName: string;
}

export function ContactRequest({ authorName }: ContactRequestProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSuccessful, setIsSuccessful] = useState(false);
  const openerRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    modalRef.current?.querySelector<HTMLElement>("select")?.focus();

    const handleKeyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        window.requestAnimationFrame(() => openerRef.current?.focus());
      }
      if (event.key !== "Tab") return;
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
    };

    document.addEventListener("keydown", handleKeyboard);
    return () => document.removeEventListener("keydown", handleKeyboard);
  }, [isOpen]);

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
      <button className="button button--primary publisher-contact-trigger" ref={openerRef} type="button" onClick={() => { setIsSuccessful(false); setIsOpen(true); }}>
        <span className="button__label">{publisherContent.contact.trigger}</span>
      </button>

      {isOpen && (
        <div className="publisher-modal-layer">
          <section className="publisher-modal" ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="iletisim-basligi" aria-describedby="iletisim-aciklamasi">
            <button className="publisher-modal__close" type="button" onClick={closeModal} aria-label={publisherContent.contact.closeLabel}>×</button>
            {!isSuccessful ? (
              <>
                <header className="publisher-modal__heading">
                  <p>{publisherContent.contact.eyebrow}</p>
                  <h2 id="iletisim-basligi">{publisherContent.contact.title}</h2>
                  <span id="iletisim-aciklamasi">{publisherContent.contact.description(authorName)}</span>
                </header>
                <form className="publisher-contact-form" onSubmit={submitRequest}>
                  <Field control="select" label={publisherContent.contact.typeLabel} name="talep-turu" required defaultValue="">
                    <option value="" disabled>{publisherContent.contact.typePlaceholder}</option>
                    {publisherContent.contact.types.map((type) => <option key={type}>{type}</option>)}
                  </Field>
                  <Field control="textarea" label={publisherContent.contact.messageLabel} name="mesaj" required rows={5} maxLength={800} placeholder={publisherContent.contact.messagePlaceholder} message={validationContent.maximumCharacters(800)} />
                  <Field control="select" label={publisherContent.contact.materialLabel} name="materyal" required defaultValue="">
                    <option value="" disabled>{publisherContent.contact.materialPlaceholder}</option>
                    {publisherContent.contact.materials.map((material) => <option key={material}>{material}</option>)}
                  </Field>
                  <Field control="select" label={publisherContent.contact.meetingLabel} name="gorusme" required defaultValue="">
                    <option value="" disabled>{publisherContent.contact.meetingPlaceholder}</option>
                    {publisherContent.contact.meetingOptions.map((option) => <option key={option}>{option}</option>)}
                  </Field>
                  <p className="publisher-contact-form__note">{publisherContent.contact.note}</p>
                  <Button type="submit">{publisherContent.contact.submit}</Button>
                </form>
              </>
            ) : (
              <div className="publisher-contact-success" role="status">
                <span aria-hidden="true">✓</span><p>{publisherContent.contact.successEyebrow}</p>
                <h2 id="iletisim-basligi">{publisherContent.contact.successTitle}</h2>
                <p id="iletisim-aciklamasi">{publisherContent.contact.successDescription}</p>
                <Button onClick={closeModal}>{publisherContent.contact.done}</Button>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
