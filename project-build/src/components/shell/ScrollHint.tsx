'use client';
import { useEffect } from 'react';

/** Shows a pane's quiet scrollbar while it is being scrolled (wheel, trackpad, keys, touch), then hides it again. */
export function ScrollHint() {
  useEffect(() => {
    const timers = new WeakMap<Element, number>();
    const onScroll = (e: Event) => {
      const el = e.target;
      if (!(el instanceof Element)) return;
      el.setAttribute('data-scrolling', '');
      window.clearTimeout(timers.get(el));
      timers.set(el, window.setTimeout(() => el.removeAttribute('data-scrolling'), 800));
    };
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => document.removeEventListener('scroll', onScroll, { capture: true });
  }, []);
  return null;
}
