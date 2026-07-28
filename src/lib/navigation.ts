import {
  editorNavigationContent,
  navigationContent,
  readerNavigationContent,
} from "@/content";
import type {
  NavigationItem,
  NavigationNode,
} from "@/types/navigation";

export const navigationItems: readonly NavigationItem[] =
  navigationContent.items;

export const readerNavigationItems: readonly NavigationItem[] =
  readerNavigationContent.items;

export const editorNavigationItems: readonly NavigationNode[] =
  editorNavigationContent.items;
