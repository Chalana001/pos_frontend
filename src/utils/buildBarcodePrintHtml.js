// Wraps an already-rendered `.print-container` DOM subtree (captured via a ref
// in BarcodePrintPage) in a standalone HTML document for the local print-agent.
// Reuses the exact markup BarcodeLabel already rendered — no parallel/duplicate
// layout logic — so direct print always matches the on-screen preview.
export const buildBarcodePrintHtml = (containerOuterHtml, settings) => {
  const pageWidth = Number(settings?.labelWidthMm) || 40;
  const pageHeight = Number(settings?.labelHeightMm) || 25;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; }
  .print-container {
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
  }
  .barcode-sticker {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    page-break-inside: avoid;
    overflow: hidden;
  }
  .barcode-canvas {
    max-width: 100%;
    height: auto;
    display: block;
  }
  @page {
    size: ${pageWidth}mm ${pageHeight}mm;
    margin: 0;
  }
</style>
</head>
<body>
${containerOuterHtml}
</body>
</html>`;
};
