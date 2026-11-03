/**
 * webauthn.ts
 * Client-only WebAuthn (Passkey) helpers for Finizer lock screens.
 *
 * Security model: Platform authenticator (fingerprint / Face ID / Windows Hello)
 * is used as a "presence + user-verification" gate. We do NOT verify the
 * assertion server-side — the browser's on-device biometric check is trusted.
 * This is appropriate for Finizer's threat model (kiosk PIN replacement).
 */

// ── Encoding helpers ──────────────────────────────────────────────────────────

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function randomBytes(length = 32): Uint8Array {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return arr;
}

// ── Feature detection ─────────────────────────────────────────────────────────

export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined" &&
    typeof navigator.credentials?.create === "function" &&
    typeof navigator.credentials?.get === "function"
  );
}

/**
 * Checks if the device has a platform authenticator available
 * (i.e. fingerprint sensor, Face ID, Windows Hello etc.).
 * Returns false in environments where the API is absent.
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

// ── Storage ───────────────────────────────────────────────────────────────────

export function hasRegisteredPasskey(storageKey: string): boolean {
  try {
    return !!localStorage.getItem(storageKey);
  } catch {
    return false;
  }
}

export function removePasskey(storageKey: string): void {
  try {
    localStorage.removeItem(storageKey);
  } catch {
    // ignore – storage may be unavailable
  }
}

// ── Registration ──────────────────────────────────────────────────────────────

/**
 * Registers a platform passkey for the given logical user.
 * Stores the credential ID in localStorage under `storageKey`.
 * Returns true on success, false if the user cancelled or the device has no sensor.
 */
export async function registerPasskey(
  storageKey: string,
  username: string
): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;

  try {
    const challenge = randomBytes(32);
    const userId = new TextEncoder().encode(username);

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: challenge as unknown as BufferSource,
        rp: {
          name: "Finizer",
          id: window.location.hostname,
        },
        user: {
          id: userId as unknown as BufferSource,
          name: username,
          displayName: username,
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },   // ES256  (preferred)
          { alg: -257, type: "public-key" },  // RS256  (fallback)
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform", // device biometric only
          userVerification: "required",         // must pass biometric
          residentKey: "preferred",
        },
        timeout: 60_000,
      },
    });

    if (!credential) return false;

    const pkCred = credential as PublicKeyCredential;
    const credId = bufferToBase64url(pkCred.rawId);
    localStorage.setItem(storageKey, credId);
    return true;
  } catch (err) {
    // NotAllowedError = user cancelled; ignore silently
    if (err instanceof Error && err.name !== "NotAllowedError") {
      console.warn("[webauthn] Registration error:", err);
    }
    return false;
  }
}

// ── Authentication ────────────────────────────────────────────────────────────

/**
 * Triggers a biometric assertion using the stored credential.
 * Returns true if the user verified successfully, false otherwise.
 */
export async function authenticatePasskey(storageKey: string): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;

  const credId = localStorage.getItem(storageKey);
  if (!credId) return false;

  try {
    const challenge = randomBytes(32);

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: challenge as unknown as BufferSource,
        allowCredentials: [
          {
            id: base64urlToBuffer(credId),
            type: "public-key",
            transports: ["internal"],
          },
        ],
        userVerification: "required",
        timeout: 60_000,
      },
    });

    // Browser confirmed the biometric matched — we trust it.
    return !!assertion;
  } catch (err) {
    if (err instanceof Error && err.name !== "NotAllowedError") {
      console.warn("[webauthn] Authentication error:", err);
    }
    return false;
  }
}
