"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { recordReadingProgressAction } from "../progress";

type SaveState =
  | "idle"
  | "waiting"
  | "saving"
  | "saved"
  | "completed"
  | "error";

function clampProgress(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function calculateChapterProgress() {
  const chapter = document.getElementById("bolum-metni");

  if (!chapter) {
    return 0;
  }

  const rectangle = chapter.getBoundingClientRect();
  const documentTop = window.scrollY + rectangle.top;
  const chapterHeight = Math.max(
    chapter.scrollHeight,
    rectangle.height,
    1,
  );

  /*
   * Okurun ekranda gördüğü alanın yaklaşık alt üçte birlik
   * noktası, bölümde ulaşılan konum olarak kabul edilir.
   */
  const readingMarker =
    window.scrollY + window.innerHeight * 0.72;

  return clampProgress(
    ((readingMarker - documentTop) / chapterHeight) * 100,
  );
}

export function ReadingProgressTracker({
  chapterId,
  enabled,
  initialProgress,
}: {
  chapterId: string;
  enabled: boolean;
  initialProgress: number | null;
}) {
  const [displayedProgress, setDisplayedProgress] = useState(
    initialProgress ?? 0,
  );
  const [saveState, setSaveState] = useState<SaveState>(
    initialProgress === null ? "waiting" : "idle",
  );
  const [hasStarted, setHasStarted] = useState(
    initialProgress !== null,
  );

  const activeSecondsRef = useRef(0);
  const currentChapterProgressRef = useRef(0);
  const lastSentChapterProgressRef = useRef(0);
  const lastSentAtRef = useRef(0);
  const requestInProgressRef = useRef(false);
  const hasStartedRef = useRef(initialProgress !== null);

  const saveProgress = useCallback(
    async (complete = false) => {
    if (
      !enabled ||
      requestInProgressRef.current ||
      activeSecondsRef.current < 20 ||
      currentChapterProgressRef.current < 10
    ) {
      return;
    }

    requestInProgressRef.current = true;
    setSaveState("saving");

    try {
      const result = await recordReadingProgressAction({
        activeSeconds: activeSecondsRef.current,
        chapterId,
        chapterProgressPercent:
          currentChapterProgressRef.current,
        complete,
      });

      if (
        result.started &&
        typeof result.progressPercent === "number"
      ) {
        hasStartedRef.current = true;
        setHasStarted(true);
        lastSentChapterProgressRef.current =
          currentChapterProgressRef.current;
        lastSentAtRef.current = Date.now();

        setDisplayedProgress(result.progressPercent);
        setSaveState(
          result.completed ? "completed" : "saved",
        );
      } else if (result.status === "waiting") {
        setSaveState("waiting");
      } else if (result.status === "invalid") {
        setSaveState("error");
      }
    } catch (error) {
      console.error(
        "[ReadingProgressTracker]",
        error,
      );
      setSaveState("error");
    } finally {
      requestInProgressRef.current = false;
    }
  },
    [chapterId, enabled],
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let frameId = 0;

    function updateChapterProgress() {
      currentChapterProgressRef.current =
        calculateChapterProgress();

      frameId = 0;
    }

    function requestProgressCalculation() {
      if (frameId !== 0) {
        return;
      }

      frameId = window.requestAnimationFrame(
        updateChapterProgress,
      );
    }

    updateChapterProgress();

    window.addEventListener(
      "scroll",
      requestProgressCalculation,
      { passive: true },
    );
    window.addEventListener(
      "resize",
      requestProgressCalculation,
    );

    const timer = window.setInterval(() => {
      const isActive =
        document.visibilityState === "visible" &&
        document.hasFocus();

      if (!isActive) {
        return;
      }

      activeSecondsRef.current += 1;

      const chapterProgress =
        currentChapterProgressRef.current;

      const qualifies =
        activeSecondsRef.current >= 20 &&
        chapterProgress >= 10;

      if (!qualifies) {
        setSaveState("waiting");
        return;
      }

      const firstSave = !hasStartedRef.current;

      const meaningfulProgress =
        chapterProgress >=
        lastSentChapterProgressRef.current + 5;

      const completionThresholdReached =
        chapterProgress >= 90 &&
        lastSentChapterProgressRef.current < 90;

      const periodicSave =
        Date.now() - lastSentAtRef.current >= 15000;

      /*
       * İlk kayıt aynı anda tamamlanamaz.
       * Tamamlama yalnızca daha önce başlamış bir okumada
       * yüzde 90 eşiği sonradan geçildiğinde gönderilir.
       */
      const shouldComplete =
        hasStartedRef.current &&
        completionThresholdReached;

      if (
        firstSave ||
        meaningfulProgress ||
        completionThresholdReached ||
        periodicSave
      ) {
        void saveProgress(shouldComplete);
      }
    }, 1000);

    return () => {
      window.clearInterval(timer);

      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }

      window.removeEventListener(
        "scroll",
        requestProgressCalculation,
      );
      window.removeEventListener(
        "resize",
        requestProgressCalculation,
      );
    };
  }, [enabled, saveProgress]);

  if (!enabled) {
    return null;
  }

  const statusText =
    saveState === "completed"
      ? "Eser tamamlandı"
      : saveState === "saving"
        ? "İlerleme kaydediliyor…"
        : saveState === "saved"
          ? "Kaldığın yer kaydedildi"
          : saveState === "error"
            ? "İlerleme kaydedilemedi"
            : hasStarted
              ? "Okuma ilerlemen"
              : "20 saniye ve %10 ilerleme sonrası kaydedilir";

  return (
    <div className="reading-progress-tracker">
      <div>
        <span>{statusText}</span>
        <strong>%{displayedProgress}</strong>
      </div>

      <progress
        aria-label={`Okuma ilerlemesi yüzde ${displayedProgress}`}
        max={100}
        value={displayedProgress}
      >
        %{displayedProgress}
      </progress>
    </div>
  );
}
