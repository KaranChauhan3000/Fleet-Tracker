import { useEffect, useRef } from 'react';

// Using marginLeft instead of transform intentionally:
// CSS transform creates a new containing block for position:fixed children,
// which breaks all overlay/sheet components. marginLeft does NOT do this.
const EASE_SNAP   = 'margin-left 0.30s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
const EASE_FLICK  = 'margin-left 0.20s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
const EASE_SPRING = 'margin-left 0.28s cubic-bezier(0.34, 1.3, 0.64, 1)';

const DIST_THRESHOLD = 48;
const VEL_THRESHOLD  = 0.3;

export function SwipeableTabView({ tabIds, currentTab, onTabChange, children }) {
  const trackRef = useRef(null);
  const $        = useRef({ tabIds, currentTab, onTabChange });
  $.current      = { tabIds, currentTab, onTabChange };

  // ── Animate on programmatic tab change ────────────────────────────────────
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    if (el._swipeJustFired) { el._swipeJustFired = false; return; }
    const idx = $.current.tabIds.indexOf(currentTab);
    if (idx < 0) return;
    el.style.transition = EASE_SNAP;
    el.style.marginLeft = `${-idx * window.innerWidth}px`;
  }, [currentTab]); // eslint-disable-line

  // ── Touch handlers ────────────────────────────────────────────────────────
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    let sx = 0, sy = 0, st = 0, dir = null, live = false;

    function start(e) {
      if (e.touches.length !== 1) return;
      sx   = e.touches[0].clientX;
      sy   = e.touches[0].clientY;
      st   = Date.now();
      dir  = null;
      live = false;
      el.style.transition = 'none';
    }

    function move(e) {
      if (e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - sx;
      const dy = e.touches[0].clientY - sy;

      if (!dir) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        dir = Math.abs(dx) > Math.abs(dy) * 0.8 ? 'h' : 'v';
      }
      if (dir === 'v') return;

      e.preventDefault();
      live = true;

      const { tabIds: ids, currentTab: ct } = $.current;
      const idx = ids.indexOf(ct);
      const vw  = window.innerWidth;

      let cdx = dx;
      if ((idx === 0 && dx > 0) || (idx === ids.length - 1 && dx < 0)) {
        cdx = dx * 0.15;
      }

      el.style.marginLeft = `${-idx * vw + cdx}px`;
    }

    function end(e) {
      if (!live) return;
      live = false;

      const { tabIds: ids, currentTab: ct, onTabChange: change } = $.current;
      const idx  = ids.indexOf(ct);
      const vw   = window.innerWidth;
      const dx   = e.changedTouches[0].clientX - sx;
      const vel  = Math.abs(dx) / Math.max(1, Date.now() - st);
      const flick  = vel > VEL_THRESHOLD;
      const commit = Math.abs(dx) > DIST_THRESHOLD || flick;

      if (commit && dx < 0 && idx < ids.length - 1) {
        el._swipeJustFired = true;
        el.style.transition = flick ? EASE_FLICK : EASE_SNAP;
        el.style.marginLeft = `${-(idx + 1) * vw}px`;
        change(ids[idx + 1]);
      } else if (commit && dx > 0 && idx > 0) {
        el._swipeJustFired = true;
        el.style.transition = flick ? EASE_FLICK : EASE_SNAP;
        el.style.marginLeft = `${-(idx - 1) * vw}px`;
        change(ids[idx - 1]);
      } else {
        el.style.transition = EASE_SPRING;
        el.style.marginLeft = `${-idx * vw}px`;
      }
    }

    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove',  move,  { passive: false });
    el.addEventListener('touchend',   end,   { passive: true });

    return () => {
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove',  move);
      el.removeEventListener('touchend',   end);
    };
  }, []);

  const N   = tabIds.length;
  const idx = Math.max(0, tabIds.indexOf(currentTab));

  return (
    <div style={{
      position: 'relative',
      width:    '100vw',
      height:   '100vh',
      overflow: 'hidden',
    }}>
      <div
        ref={trackRef}
        style={{
          display:    'flex',
          flexDirection: 'row',
          width:      `${N * 100}vw`,
          height:     '100vh',
          marginLeft: `${-idx * window.innerWidth}px`,
          // NO transform here — transform breaks position:fixed overlays
        }}
      >
        {children}
      </div>
    </div>
  );
}
