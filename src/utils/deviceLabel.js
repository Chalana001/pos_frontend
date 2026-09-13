/**
 * A human name for this terminal, e.g. "Windows PC" or "Android tablet".
 *
 * The device id stored in appMeta is four random characters, fine for telling terminals
 * apart in code, useless to the person being asked "which of these two drafts do you
 * want?". What actually settles that question in a shop is the back-office PC versus the
 * tablet on the floor, and the user agent is enough to say which is which without adding a
 * naming step to setup.
 *
 * Deliberately coarse. This is a label on a choice the user is already making, not device
 * fingerprinting, and a wrong-but-plausible guess costs nothing.
 */
export const getDeviceLabel = () => {
  if (typeof navigator === "undefined") return "This device";

  const ua = navigator.userAgent || "";

  if (/iPad/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) {
    return "iPad";
  }
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/Android/i.test(ua)) {
    return /Mobile/i.test(ua) ? "Android phone" : "Android tablet";
  }
  if (/Windows/i.test(ua)) return "Windows PC";
  if (/Macintosh|Mac OS X/i.test(ua)) return "Mac";
  if (/CrOS/i.test(ua)) return "Chromebook";
  if (/Linux/i.test(ua)) return "Linux PC";

  return "This device";
};
