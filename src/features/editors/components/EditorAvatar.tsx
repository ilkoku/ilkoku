interface EditorAvatarProps {
  initials: string;
  name: string;
  size?: "small" | "medium" | "large";
}

export function EditorAvatar({ initials, name, size = "medium" }: EditorAvatarProps) {
  return (
    <span
      className={`editor-avatar editor-avatar--${size}`}
      role="img"
      aria-label={`${name} ${editorsContent.profile.eyebrow.toLocaleLowerCase("tr")}`}
    >
      <span aria-hidden="true">{initials}</span>
    </span>
  );
}
import { editorsContent } from "@/content";
