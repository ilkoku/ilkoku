"use client";

import { useEffect } from "react";

function isWriterForm(target: EventTarget | null): target is HTMLFormElement {
  return (
    target instanceof HTMLFormElement && target.matches("form.writer-screen")
  );
}

function findPublishButton(form: HTMLFormElement) {
  const buttons = Array.from(
    form.querySelectorAll<HTMLButtonElement>(
      '.writer-toolbar__actions button[type="submit"]',
    ),
  );

  return (
    buttons.find(
      (button) => !button.classList.contains("writer-save-button"),
    ) ?? null
  );
}

function removeFeedback(form?: HTMLFormElement | null) {
  const root = form ?? document;
  root
    .querySelectorAll<HTMLElement>(".writer-publish-feedback")
    .forEach((element) => element.remove());
}

export function WriterPublishFeedbackBridge() {
  useEffect(() => {
    let lastSubmitWasPublish = false;

    function syncPublishFeedback() {
      const form = document.querySelector<HTMLFormElement>("form.writer-screen");

      if (!form || !lastSubmitWasPublish) {
        removeFeedback(form);
        return;
      }

      const source = form.querySelector<HTMLElement>(
        '.writer-canvas .work-action-message[data-state="error"]',
      );
      const message = source?.textContent?.trim() ?? "";
      const publishButton = findPublishButton(form);

      if (!message || !publishButton) {
        removeFeedback(form);
        return;
      }

      const actions = publishButton.closest<HTMLElement>(
        ".writer-toolbar__actions",
      );

      if (!actions) return;

      let feedback = actions.querySelector<HTMLElement>(
        ".writer-publish-feedback",
      );

      if (!feedback) {
        feedback = document.createElement("p");
        feedback.className = "work-action-message writer-publish-feedback";
        feedback.dataset.state = "error";
        feedback.setAttribute("role", "alert");
        feedback.setAttribute("aria-live", "assertive");
        feedback.style.margin = "0";
        feedback.style.maxWidth = "28rem";
        feedback.style.fontSize = "0.82rem";
        feedback.style.lineHeight = "1.35";
        publishButton.insertAdjacentElement("afterend", feedback);
      }

      if (feedback.textContent !== message) {
        feedback.textContent = message;
      }
    }

    function rememberSubmitIntent(event: SubmitEvent) {
      if (!isWriterForm(event.target)) return;

      lastSubmitWasPublish =
        event.submitter instanceof HTMLButtonElement &&
        !event.submitter.classList.contains("writer-save-button");

      removeFeedback(event.target);
      window.requestAnimationFrame(syncPublishFeedback);
    }

    const observer = new MutationObserver(syncPublishFeedback);

    document.addEventListener("submit", rememberSubmitIntent, true);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-state"],
      characterData: true,
      childList: true,
      subtree: true,
    });

    return () => {
      document.removeEventListener("submit", rememberSubmitIntent, true);
      observer.disconnect();
      removeFeedback();
    };
  }, []);

  return null;
}
