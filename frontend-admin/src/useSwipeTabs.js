import { useRef, useState, useCallback } from 'react';

const SWIPE_THRESHOLD = 55;   // min px horizontal to trigger tab change
const RATIO_THRESHOLD = 1.4;  // horizontal must be > vertical * this
const PEEK_THRESHOLD  = 20;   // px before peek label appears

export function useSwipeTabs({ current, tabs, enabled, onChange }) {
  const startX   = useRef(null);
  const startY   = useRef(null);
  const peekRef  = useRef({ dir: null, label: '', progress: 0 });
  const [peek, setPeekState] = useState({ dir: null, label: '', progress: 0 });

  function setPeek(val) {
    peekRef.current = val;
    setPeekState(val);
  }

  const getAdjacent = useCallback((dir) => {
    const idx = tabs.indexOf(current);
    if (idx === -1) return null;
    const next = dir === 'left' ? idx + 1 : idx - 1;
    if (next < 0 || next >= tabs.length) return null;
    return tabs[next];
  }, [current, tabs]);

  const onTouchStart = useCallback((e) => {
    if (!enabled) return;
    const tag = e.target?.tagName?.toLowerCase();
    if (['input', 'select', 'textarea', 'button'].includes(tag)) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  }, [enabled]);

  const onTouchMove = useCallback((e) => {
    if (!enabled || startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    if (Math.abs(dx) < PEEK_THRESHOLD || Math.abs(dx) < Math.abs(dy) * RATIO_THRESHOLD) {
      if (peekRef.current.dir) setPeek({ dir: null, label: '', progress: 0 });
      return;
    }

    const dir      = dx < 0 ? 'left' : 'right';
    const adjacent = getAdjacent(dir);
    if (!adjacent) {
      if (peekRef.current.dir) setPeek({ dir: null, label: '', progress: 0 });
      return;
    }

    const progress = Math.min(1, Math.abs(dx) / SWIPE_THRESHOLD);
    setPeek({ dir, label: adjacent, progress });
  }, [enabled, getAdjacent]);

  const onTouchEnd = useCallback((e) => {
    if (!enabled || startX.current === null) {
      setPeek({ dir: null, label: '', progress: 0 });
      return;
    }

    const dx = e.changedTouches[0].clientX - startX.current;
    const dy = e.changedTouches[0].clientY - startY.current;

    startX.current = null;
    startY.current = null;
    setPeek({ dir: null, label: '', progress: 0 });

    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    if (Math.abs(dx) < Math.abs(dy) * RATIO_THRESHOLD) return;

    const adjacent = getAdjacent(dx < 0 ? 'left' : 'right');
    if (adjacent) onChange(adjacent);
  }, [enabled, getAdjacent, onChange]);

  return { handlers: { onTouchStart, onTouchMove, onTouchEnd }, peek };
}
