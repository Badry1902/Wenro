"use client";

import { useEffect, useRef } from "react";

/**
 * One behaviour for every pop-up layer (menus, sheets, dialogs, the photo viewer):
 *  - Escape closes the top layer only;
 *  - the phone's Back button / back swipe closes the layer instead of leaving the page
 *    (the layer adds one history entry while open and takes it away again when closed);
 *  - the page behind does not scroll.
 * Links inside a layer navigate normally (the layer's history entry is then simply kept).
 */
type Layer = { key: string; close: () => void; history: boolean };
type State = Record<string, unknown> | null;

const stack: Layer[] = [];
let pendingBacks = 0;          // history.back() calls we made ourselves (their popstate is not a user "Back")
let navigating = false;        // a link inside a layer was clicked
let afterBack: (() => void)[] = [];
let listening = false;

function onPop() {
  if (pendingBacks > 0) {
    pendingBacks -= 1;
    if (pendingBacks === 0) { const q = afterBack; afterBack = []; q.forEach((f) => f()); }
    return;
  }
  const top = stack[stack.length - 1];
  if (top?.history && (window.history.state as State)?.wenroLayer !== top.key) top.close();
}

/** Call right before a programmatic navigation (router.push) from inside a layer. */
export const markOverlayNavigation = () => { navigating = true; };

/** Runs `fn` once our own history.back() has landed (or right away): for code that edits the address bar. */
export function afterOverlayHistory(fn: () => void) {
  if (pendingBacks > 0) afterBack.push(fn); else fn();
}

export function useOverlay(open: boolean, close: () => void, { lockScroll = true, history: useHistory = true } = {}) {
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (!open) return;
    if (!listening) { window.addEventListener("popstate", onPop); listening = true; }
    const key = Math.random().toString(36).slice(2);
    const layer: Layer = { key, close: () => { popped = true; closeRef.current(); }, history: useHistory };
    let popped = false;
    stack.push(layer);
    const isTop = () => stack[stack.length - 1] === layer;

    if (useHistory) window.history.pushState({ ...((window.history.state ?? {}) as object), wenroLayer: key }, "");
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && isTop()) { e.stopPropagation(); closeRef.current(); } };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (a && !a.target && !a.hasAttribute("download") && !a.getAttribute("href")?.startsWith("#")) navigating = true;
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick, true);
    const root = document.documentElement;
    if (lockScroll) root.style.overflow = "hidden";

    return () => {
      stack.splice(stack.indexOf(layer), 1);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick, true);
      if (lockScroll && stack.length === 0) root.style.overflow = "";
      if (!useHistory || popped) return;
      const s = window.history.state as State;
      if (s?.wenroLayer !== key) return; // a navigation already replaced our entry
      if (navigating) {
        navigating = false; // a link inside the layer takes over: keep the entry, just forget it was ours
        const rest = { ...s }; delete rest.wenroLayer;
        window.history.replaceState(rest, "");
      } else {
        pendingBacks += 1;
        window.history.back();
      }
    };
  }, [open, lockScroll, useHistory]);
}
