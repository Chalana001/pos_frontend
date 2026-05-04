const encoder = new TextEncoder();

const toBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const fromBase64 = (value) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

const sha256 = async (value) => {
  const buffer = await window.crypto.subtle.digest("SHA-256", encoder.encode(value));
  return toBase64(buffer);
};

export const createLocalPinRecord = async (pin) => {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const saltBase64 = toBase64(salt);
  const hash = await sha256(`${saltBase64}:${pin}`);
  return {
    pinSalt: saltBase64,
    pinHash: hash,
  };
};

export const verifyLocalPin = async (pin, pinRecord) => {
  if (!pinRecord?.pinSalt || !pinRecord?.pinHash) {
    return false;
  }
  const normalizedSalt = toBase64(fromBase64(pinRecord.pinSalt));
  const hash = await sha256(`${normalizedSalt}:${pin}`);
  return hash === pinRecord.pinHash;
};
