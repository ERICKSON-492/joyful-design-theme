const STOREFRONT_ORIGIN = "https://ushangachronicles.com";
const LOCAL_ORIGINS = new Set(["http://localhost:3000", "http://localhost:5173"]);

type AuthMessage = {
  type: "ushanga-books:auth";
  accessToken: string | null;
};

let accessToken: string | null = null;
let ready = false;
let resolveReady: (() => void) | null = null;
const readyPromise = new Promise<void>(resolve => {
  resolveReady = resolve;
});

function isAllowedParentOrigin(origin: string) {
  return origin === STOREFRONT_ORIGIN || LOCAL_ORIGINS.has(origin);
}

function parentOrigin() {
  try {
    const origin = document.referrer ? new URL(document.referrer).origin : "";
    if (isAllowedParentOrigin(origin)) return origin;
  } catch {
    // Fall back to the production storefront origin.
  }
  return STOREFRONT_ORIGIN;
}

function markReady() {
  if (ready) return;
  ready = true;
  resolveReady?.();
  resolveReady = null;
}

export function setupStorefrontAuthRelay() {
  if (typeof window === "undefined") return;

  window.addEventListener("message", event => {
    if (event.source !== window.parent || !isAllowedParentOrigin(event.origin)) return;
    const message = event.data as Partial<AuthMessage> | undefined;
    if (message?.type !== "ushanga-books:auth") return;
    accessToken = typeof message.accessToken === "string" && message.accessToken ? message.accessToken : null;
    markReady();
  });

  if (window.parent !== window) {
    window.parent.postMessage({ type: "ushanga-books:ready" }, parentOrigin());
  }

  window.setTimeout(markReady, 1500);
}

export function storefrontAuthReady() {
  return readyPromise;
}

export function getStorefrontAccessToken() {
  return accessToken;
}

export function isUsingStorefrontAuth() {
  return Boolean(accessToken);
}

export function requestStorefrontLogin() {
  if (typeof window === "undefined" || window.parent === window) return false;
  window.parent.postMessage({ type: "ushanga-books:login" }, parentOrigin());
  return true;
}

export function requestStorefrontLogout() {
  if (typeof window === "undefined" || window.parent === window) return false;
  window.parent.postMessage({ type: "ushanga-books:logout" }, parentOrigin());
  return true;
}
