// Shared browser-print path for the hidden print iframes (receipt, KOT,
// invoice, return receipt, debit note).
//
// Printing used to sit behind a fixed 500ms setTimeout between writing the
// document and calling print(), every print paid the full half second even
// when the frame was ready in 50ms, while a logo that took longer than 500ms
// still lost the race and printed as a broken image. Wait instead for what
// actually gates a complete print, images decoded and fonts loaded, and
// print the moment they are done. The timeout is only a safety net for an
// image that never fires load/error; it is not the normal path.
const PRINT_READY_TIMEOUT_MS = 1500;

export const printHtmlInFrame = (frame, html) => {
  if (!frame) return;

  const win = frame.contentWindow;
  const doc = win.document;
  doc.open();
  doc.write(html);
  doc.close();

  const imagesReady = Promise.all(
    Array.from(doc.images, (img) =>
      img.complete
        ? Promise.resolve()
        : new Promise((resolve) => {
            img.addEventListener('load', resolve, { once: true });
            img.addEventListener('error', resolve, { once: true });
          })
    )
  );
  // A font that fails to load must not block the print.
  const fontsReady = doc.fonts ? doc.fonts.ready.catch(() => {}) : Promise.resolve();
  const safetyNet = new Promise((resolve) => setTimeout(resolve, PRINT_READY_TIMEOUT_MS));

  Promise.race([Promise.all([imagesReady, fontsReady]), safetyNet]).then(() => {
    win.focus();
    win.print();
  });
};
