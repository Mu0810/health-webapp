/**
 * lib/device.ts — Anonymous per-browser identity.
 * Until real auth exists, each browser gets a stable random device id stored in
 * localStorage. It's used as the key for that browser's profile + food logs.
 */
"use client";

const KEY = "hv_device_id";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    window.localStorage.setItem(KEY, id);
  }
  return id;
}
