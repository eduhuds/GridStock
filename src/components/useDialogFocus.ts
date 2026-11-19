'use client';

import { useEffect } from 'react';

// Covers the app's dialogs, including dynamically loaded scanners and nested windows.
export function useDialogFocus() {
  useEffect(() => {
    let active: HTMLElement | null = null;
    let sequence = 0;
    let unlock = () => {};
    const origins = new Map<HTMLElement, HTMLElement | null>();
    const visible = (el: HTMLElement) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
    const controls = () => active ? [...active.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [tabindex]')]
      .filter(el => !el.matches(':disabled, [tabindex="-1"]') && !el.closest('[inert]') && visible(el)) : [];
    const focusStart = () => {
      if (!active) return;
      const heading = active.querySelector<HTMLElement>('h1,h2,h3');
      if (heading) {
        if (!heading.id) heading.id = `workspace-dialog-${++sequence}`;
        if (!active.hasAttribute('aria-label') && !active.hasAttribute('aria-labelledby')) active.setAttribute('aria-labelledby', heading.id);
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      } else {
        active.tabIndex = -1;
        (controls()[0] || active).focus({ preventScroll: true });
      }
    };
    const sync = () => {
      const dialogs = [...document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')].filter(visible);
      const next = dialogs.at(-1) || null;
      if (next === active) return;
      const previous = active;
      const restore = previous ? origins.get(previous) : null;
      unlock();
      active = next;
      if (next) {
        if (!origins.has(next)) origins.set(next, document.activeElement instanceof HTMLElement ? document.activeElement : null);
        const changed: Array<[HTMLElement, boolean]> = [];
        let branch: HTMLElement = next;
        while (branch.parentElement) {
          for (const sibling of branch.parentElement.children) {
            if (sibling !== branch && sibling instanceof HTMLElement) {
              changed.push([sibling, sibling.inert]);
              sibling.inert = true;
            }
          }
          branch = branch.parentElement;
          if (branch === document.body) break;
        }
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        unlock = () => {
          changed.forEach(([el, value]) => { el.inert = value; });
          document.body.style.overflow = overflow;
        };
        if (restore?.isConnected && next.contains(restore)) restore.focus({ preventScroll: true });
        else focusStart();
      } else {
        unlock = () => {};
        if (restore?.isConnected) restore.focus({ preventScroll: true });
      }
      for (const dialog of origins.keys()) if (!dialog.isConnected) origins.delete(dialog);
    };
    const keydown = (event: KeyboardEvent) => {
      if (!active) return;
      if (event.key === 'Escape') {
        const close = active.querySelector<HTMLButtonElement>('.modal-close, [aria-label="Fechar janela"]');
        if (close && !close.disabled) {
          event.preventDefault();
          event.stopImmediatePropagation();
          close.click();
        }
        return;
      }
      if (event.key !== 'Tab') return;
      const items = controls();
      const first = items[0], last = items.at(-1);
      if (!first || !last) { event.preventDefault(); focusStart(); return; }
      if (!items.includes(document.activeElement as HTMLElement)) {
        event.preventDefault(); (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    const focusin = (event: FocusEvent) => {
      if (active && !active.contains(event.target as Node)) focusStart();
    };
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['role', 'aria-modal', 'hidden'] });
    document.addEventListener('keydown', keydown, true);
    document.addEventListener('focusin', focusin);
    sync();
    return () => {
      observer.disconnect(); unlock();
      document.removeEventListener('keydown', keydown, true);
      document.removeEventListener('focusin', focusin);
    };
  }, []);
}
