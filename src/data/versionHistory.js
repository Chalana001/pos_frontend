export const APP_VERSION = "1.4.0";

export const VERSION_HISTORY = [
  {
    version: "1.4.0",
    title: "Offline Sales, POS Fixes, Financial Updates",
    releaseDate: "2026-05-07",
    summary:
      "This release improves offline sales handling, POS cart totals, finalize bill flow, financial pages, and ZenSys POS branding.",
    highlights: [
      "Offline sales queue page with import, bulk import, retry failed imports, and receipt reprint support.",
      "Live stock validation before importing offline sales to prevent stock conflicts.",
      "POS cart and finalize bill calculation fixes for item count, subtotal, total, paid amount, and balance.",
      "Smaller, cleaner POS cart and finalize bill buttons.",
      "Expenses page improvements with filters, search, cashier/category filtering, pagination, and bug fixes.",
      "Cash Drops page improvements with date filters, search, cashier filtering, summary cards, pagination, and bug fixes.",
      "ZenSys POS logo and branding added to the user interface.",
      "Header notification system for offline queue, failed imports, low stock, open shift, and stock conflict alerts.",
      "Shift Details page with shift sales and expense records.",
      "Stock Item Details page with purchase history and supplier filters.",
      "Service worker and cache handling improvements so the latest frontend is loaded more reliably.",
    ],
    sections: [
      {
        label: "Added",
        items: [
          "Offline Sales Queue page.",
          "Offline sale bulk import and retry workflow.",
          "Offline receipt reprint support.",
          "Live stock conflict checks for offline sale imports.",
          "ZenSys POS branding and logo assets.",
          "Version update dialog shown after login.",
          "Version History page.",
          "Shift Details page.",
          "Stock Item Details page.",
          "Header notification center.",
        ],
      },
      {
        label: "Improved",
        items: [
          "POS cart item count, subtotal, and total calculations.",
          "Finalize bill amount handling and button sizing.",
          "Expenses filters, pagination, and cashier/category views.",
          "Cash Drops filters, summaries, pagination, and cashier views.",
          "Offline receipt settings cache and offline invoice numbering.",
          "Sidebar, header, branch selector, and language selector UI.",
          "Purchase, stock, sales, customer, item, and report screens.",
        ],
      },
      {
        label: "Fixed",
        items: [
          "Cart totals showing 0 after items were added.",
          "Dynamic text reset issue caused by the language translation observer.",
          "Finalize bill numeric safety issues.",
          "Weight item per-gram price sync issue.",
          "Offline import error handling and stock conflict messaging.",
          "Expenses and Cash Drops active shift and filtering issues.",
          "Stale service worker cache behavior.",
        ],
      },
    ],
  },
  {
    version: "1.3.0",
    title: "Offline Sales Foundation",
    releaseDate: "2026-05-06",
    summary: "Initial offline sales and PWA groundwork release.",
    highlights: [
      "Offline sale storage foundation.",
      "Offline page entry point.",
      "Basic service worker support.",
    ],
    sections: [
      {
        label: "Added",
        items: [
          "Offline page foundation.",
          "Offline sale storage preparation.",
          "PWA install metadata updates.",
        ],
      },
    ],
  },
];

export const LATEST_VERSION = VERSION_HISTORY[0];
