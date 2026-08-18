"use client";

type NotificationBackButtonProps = {
  className?: string;
  fallbackHref: string;
};

export function NotificationBackButton({
  className,
  fallbackHref,
}: NotificationBackButtonProps) {
  function handleBack() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.assign(fallbackHref);
  }

  return (
    <button className={className} onClick={handleBack} type="button">
      <span aria-hidden="true">←</span>
      Geri
    </button>
  );
}
