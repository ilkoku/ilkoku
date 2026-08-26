"use client";

import { useEffect } from "react";

const STACK_KEY = "ilkoku:public:navigation-stack";
const MAX_STACK_LENGTH = 40;
const MAX_PATH_LENGTH = 1500;

export function isSafeInternalHistoryPath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_PATH_LENGTH &&
    value.startsWith("/") &&
    !value.startsWith("//")
  );
}

function currentLocationPath() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function trimStack(stack: string[]) {
  return stack.slice(-MAX_STACK_LENGTH);
}

function readStack() {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(STACK_KEY) || "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return trimStack(parsed.filter(isSafeInternalHistoryPath));
  } catch {
    return [];
  }
}

function writeStack(stack: string[]) {
  try {
    window.sessionStorage.setItem(STACK_KEY, JSON.stringify(trimStack(stack)));
  } catch {
    // Storage failures must never block navigation.
  }
}

function pushTransition(source: string, destination: string) {
  if (!isSafeInternalHistoryPath(source) || !isSafeInternalHistoryPath(destination)) return;

  const stack = readStack();
  if (stack.at(-1) !== source) stack.push(source);
  if (destination !== source && stack.at(-1) !== destination) stack.push(destination);
  writeStack(stack);
}

function reconcileBrowserHistory(currentPath: string) {
  if (!isSafeInternalHistoryPath(currentPath)) return;

  const stack = readStack();
  if (stack.at(-1) === currentPath) return;

  for (let index = stack.length - 2; index >= 0; index -= 1) {
    if (stack[index] === currentPath) {
      writeStack(stack.slice(0, index + 1));
      return;
    }
  }

  stack.push(currentPath);
  writeStack(stack);
}

function internalReferrerPath() {
  if (!document.referrer) return null;

  try {
    const referrer = new URL(document.referrer);
    if (referrer.origin !== window.location.origin) return null;
    const path = `${referrer.pathname}${referrer.search}${referrer.hash}`;
    return isSafeInternalHistoryPath(path) ? path : null;
  } catch {
    return null;
  }
}

export function consumePublicNavigationBackTarget(currentPath: string) {
  if (!isSafeInternalHistoryPath(currentPath)) return null;

  const stack = readStack();
  const currentIndex = stack.lastIndexOf(currentPath);
  if (currentIndex <= 0) return null;

  const target = stack[currentIndex - 1];
  if (!isSafeInternalHistoryPath(target) || target === currentPath) return null;

  writeStack(stack.slice(0, currentIndex));
  return target;
}

export function PublicNavigationHistory() {
  useEffect(() => {
    const currentPath = currentLocationPath();
    const initialStack = readStack();

    if (initialStack.at(-1) !== currentPath) {
      const referrerPath = internalReferrerPath();
      if (referrerPath && referrerPath !== currentPath) {
        pushTransition(referrerPath, currentPath);
      } else {
        writeStack([currentPath]);
      }
    }

    const rememberInternalNavigation = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.hasAttribute("download")) return;
      if (anchor.target && anchor.target !== "_self") return;

      try {
        const destination = new URL(anchor.href, window.location.href);
        if (destination.origin !== window.location.origin) return;

        const destinationPath = `${destination.pathname}${destination.search}${destination.hash}`;
        pushTransition(currentLocationPath(), destinationPath);
      } catch {
        // Malformed links must never block the user's click.
      }
    };

    const reconcileAfterBrowserNavigation = () => {
      window.setTimeout(() => reconcileBrowserHistory(currentLocationPath()), 0);
    };

    document.addEventListener("click", rememberInternalNavigation, true);
    window.addEventListener("popstate", reconcileAfterBrowserNavigation);

    return () => {
      document.removeEventListener("click", rememberInternalNavigation, true);
      window.removeEventListener("popstate", reconcileAfterBrowserNavigation);
    };
  }, []);

  return null;
}
