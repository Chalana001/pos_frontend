const encoder = new TextEncoder();

// OWASP's floor for PBKDF2-HMAC-SHA256. A four-digit PIN is only 10,000 candidates, so
// stretching is the only thing standing between an attacker who can read IndexedDB — which
// is anyone with the Windows account — and the PIN itself. One round of SHA-256, which
// this replaces, made that search instant. This does not make a 4-digit PIN strong; it
// makes brute-forcing it cost hours per device instead of milliseconds.
const PBKDF2_ITERATIONS = 210000;
const PBKDF2_HASH = "SHA-256";
const DERIVED_KEY_BITS = 256;

export const PIN_ALGO_PBKDF2 = "PBKDF2";

const toBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const fromBase64 = (value) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

// Kept only so devices enrolled before the upgrade can still unlock; never used to write.
const legacySha256 = async (value) => {
  const buffer = await window.crypto.subtle.digest("SHA-256", encoder.encode(value));
  return toBase64(buffer);
};

const derivePbkdf2 = async (pin, saltBytes) => {
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await window.crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBytes, iterations: PBKDF2_ITERATIONS, hash: PBKDF2_HASH },
    keyMaterial,
    DERIVED_KEY_BITS
  );
  return toBase64(bits);
};

export const createLocalPinRecord = async (pin) => {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const saltBase64 = toBase64(salt);
  return {
    pinAlgo: PIN_ALGO_PBKDF2,
    pinIterations: PBKDF2_ITERATIONS,
    pinSalt: saltBase64,
    pinHash: await derivePbkdf2(pin, salt),
  };
};

/**
 * A record written before the PBKDF2 upgrade. Those still verify, so nobody is locked out
 * of a device by shipping this — but the caller should re-derive on the next successful
 * unlock, which is the one moment the plaintext PIN is available to do it with.
 */
export const isLegacyPinRecord = (pinRecord) =>
  Boolean(pinRecord?.pinHash) && pinRecord?.pinAlgo !== PIN_ALGO_PBKDF2;

export const verifyLocalPin = async (pin, pinRecord) => {
  if (!pinRecord?.pinSalt || !pinRecord?.pinHash) {
    return false;
  }

  if (isLegacyPinRecord(pinRecord)) {
    const normalizedSalt = toBase64(fromBase64(pinRecord.pinSalt));
    return (await legacySha256(`${normalizedSalt}:${pin}`)) === pinRecord.pinHash;
  }

  const iterations = Number(pinRecord.pinIterations) || PBKDF2_ITERATIONS;
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await window.crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: fromBase64(pinRecord.pinSalt), iterations, hash: PBKDF2_HASH },
    keyMaterial,
    DERIVED_KEY_BITS
  );
  return toBase64(bits) === pinRecord.pinHash;
};
