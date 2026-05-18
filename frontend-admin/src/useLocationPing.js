import { useEffect, useRef } from 'react';
import { userApi } from './api.js';

const INTERVAL_MS = 30 * 60 * 1000; // ping every 30 minutes
const MIN_GAP_MS  = 25 * 60 * 1000; // minimum gap between pings

// Module-level guard — prevents duplicate pings on re-renders/remounts
let _lastPingTime = 0;
let _timerHandle  = null;
let _started      = false;

// ── Reverse geocoding ─────────────────────────────────────────────────────────
async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18`;
    const res  = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent':      'FleetProApp/1.0',
      },
    });
    const data = await res.json();
    const a    = data.address || {};
    const parts = [
      a.road || a.pedestrian || a.footway || a.path,
      a.suburb || a.neighbourhood || a.quarter,
      a.city   || a.town || a.village || a.county,
    ].filter(Boolean);
    return parts.join(', ') ||
      data.display_name?.split(',').slice(0, 3).join(',').trim() || '';
  } catch { return ''; }
}

// ── Send ping ─────────────────────────────────────────────────────────────────
async function sendPing(lat, lng, accuracy) {
  const now = Date.now();
  if (now - _lastPingTime < MIN_GAP_MS) return;
  _lastPingTime = now;

  const address = await reverseGeocode(lat, lng);

  try {
    await userApi.post('/user/location', {
      lat:      parseFloat(lat.toFixed(6)),
      lng:      parseFloat(lng.toFixed(6)),
      accuracy: accuracy ?? null,
      address,
    });
  } catch { /* silent */ }
}

// ── Web tracking ──────────────────────────────────────────────────────────────
function startWebTracking() {
  if (!navigator?.geolocation) return;

  async function ping() {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await sendPing(
          pos.coords.latitude,
          pos.coords.longitude,
          pos.coords.accuracy ?? null
        );
      },
      () => {},
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 5 * 60 * 1000 }
    );
  }

  ping(); // immediate on first call
  if (_timerHandle) clearInterval(_timerHandle);
  _timerHandle = setInterval(ping, INTERVAL_MS);
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useLocationPing(active = true) {
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!active || mountedRef.current || _started) return;
    mountedRef.current = true;
    _started           = true;
    startWebTracking();
  }, [active]); // eslint-disable-line
}
