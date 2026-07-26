import {
  editorNavigationContent,
  navigationContent,
  readerNavigationContent,
} from "@/content";
import type { NavigationItem } from "@/types/navigation";

export const navigationItems: readonly NavigationItem[] = navigationContent.items;
export const editorNavigationItems: readonly NavigationItem[] =
  editorNavigationContent.items;
export const readerNavigationItems: readonly NavigationItem[] =
  readerNavigationContent.items;
