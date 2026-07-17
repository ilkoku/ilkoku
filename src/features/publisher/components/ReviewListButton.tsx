"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { publisherContent } from "@/content";

interface ReviewListButtonProps {
  compact?: boolean;
  title: string;
}

export function ReviewListButton({ compact = false, title }: ReviewListButtonProps) {
  const [isAdded, setIsAdded] = useState(false);

  return (
    <div className={compact ? "publisher-review-action publisher-review-action--compact" : "publisher-review-action"}>
      <Button variant={isAdded ? "secondary" : "outline"} aria-pressed={isAdded} onClick={() => setIsAdded((current) => !current)}>
        {isAdded ? publisherContent.reviewList.added : publisherContent.reviewList.add}
      </Button>
      <span className="sr-only" role="status" aria-live="polite">
        {isAdded ? publisherContent.reviewList.status(title) : ""}
      </span>
    </div>
  );
}
