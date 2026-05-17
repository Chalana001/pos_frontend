export const APP_VERSION = "1.6.0";

export const VERSION_HISTORY = [
  {
    version: "1.6.0",
    title: "Warranty Workflow, Configuration Center, Invoice Upgrade",
    releaseDate: "2026-05-17",
    summary:
      "This release adds a full warranty workflow, centralizes shop configuration, enforces package-aware modules, upgrades invoice printing, and separates dine-in table management into a cleaner operational flow.",
    highlights: [
      "Warranty templates can now be maintained and selected item-by-item in POS, with warranty list, detail, and claims screens added for after-sales work.",
      "App Configuration now centralizes operational feature toggles and only exposes modules allowed by the active package.",
      "FREE, STANDARD, and PRO behavior is now reflected across item types, dining features, and POS visibility instead of relying on UI-only assumptions.",
      "Receipt and invoice printing now support a redesigned A4 invoice, warranty visibility, due/payment fields, and adjustable logo sizing.",
      "Dining tables now live in a dedicated Table Management page instead of Receipt Design, keeping print layout and floor operations separate.",
      "Saved dine-in table drafts now stay in sync when cart items are removed, including clearing the backend draft when the final line is deleted.",
      "POS received tighter cart spacing, per-item warranty selection, and cleaner quantity selector sizing for faster cashier work.",
      "Receipt Design is now focused on thermal, KOT, and full invoice layouts only.",
    ],
    sections: [
      {
        label: "Added",
        items: [
          "Warranty templates, warranty records, warranty details, and claims queue screens.",
          "Per-item warranty selection in POS with warranty data persisted into sales and printed documents.",
          "App Configuration page for shop-level feature visibility controls.",
          "Dedicated Table Management page for branch-wise dining tables.",
          "A4 full invoice printing flow from POS with the new invoice layout.",
        ],
      },
      {
        label: "Improved",
        items: [
          "Package-aware feature visibility for item types, dining modules, and configuration controls.",
          "Receipt and invoice layouts with warranty rows, due values, payment context, and logo sizing.",
          "POS spacing, cart density, warranty controls, and weight quantity defaults.",
          "Configuration navigation by grouping branches, users, receipt design, warranty settings, and table management together.",
        ],
      },
      {
        label: "Changed",
        items: [
          "Receipt Design now handles print layouts only; dining table CRUD moved to Table Management.",
          "Unsupported package features are hidden from configuration and also rejected by backend rules.",
          "Dine-in availability now follows both package capability and App Configuration state.",
        ],
      },
      {
        label: "Fixed",
        items: [
          "Saved table drafts now update immediately when cart lines are removed.",
          "Deleting the last item from a saved table draft now clears the backend pending order and releases the table.",
          "Warranty dropdown visibility, receipt/invoice warranty output, and old invoice print routing issues.",
          "Several POS spacing and dropdown sizing problems that reduced usable cart space.",
        ],
      },
    ],
  },
  {
    version: "1.5.0",
    title: "Supplier Ledger, Single-Branch SaaS Flow, Premium UI Refresh",
    releaseDate: "2026-05-13",
    summary:
      "This release expands supplier and purchase operations, standardizes tables and payments, adds package-aware branch behavior, and upgrades the full frontend with a more polished motion system and branding flow.",
    highlights: [
      "Supplier management now behaves more like customer management with due tracking, purchase history visibility, and supplier bank details display.",
      "Purchase flow supports discount amounts from supplier invoices and stronger payment visibility across purchase and sales screens.",
      "Sales, supplier, stock, finance, and history tables now share the same table styling, pagination controls, and animation behavior.",
      "Dropdowns were standardized through a shared custom select component with smoother menu animations.",
      "Free and Standard style plans now run in locked single-branch mode with the branch selector hidden and the user branch auto-selected for requests.",
      "The full app received phased premium motion upgrades across shell, POS, catalog, customers, suppliers, inventory, purchasing, finance, admin, and reports.",
      "Route-level lazy loading was added to reduce the initial frontend bundle and improve app loading.",
      "ZenSys branding was refined with a darker sidebar, split logo assets, and a rotating brand mark in the sidebar header.",
    ],
    sections: [
      {
        label: "Added",
        items: [
          "Supplier purchase history view and supplier bank details section.",
          "Reusable table pagination component shared across paged data screens.",
          "Shared custom dropdown component with animated menu and option reveal.",
          "ZenSys brand mark and wordmark assets for more flexible UI branding.",
          "Release flow map metadata for version history and update popups.",
        ],
      },
      {
        label: "Improved",
        items: [
          "Supplier list, sales history, purchase history, stock, shift, expense, and cash drop table consistency.",
          "Sales and purchase payment method presentation and due-related visibility.",
          "Header selectors and dropdown layering behavior.",
          "Sidebar branding, tone, and logo presentation.",
          "Route loading through lazy page chunks.",
          "App-wide motion and premium visual polish across all major modules.",
        ],
      },
      {
        label: "Changed",
        items: [
          "Branch selection behavior is now plan-aware for single-branch packages.",
          "Version popup now summarizes both release highlights and updated user flows.",
          "Version history now stores structured release flow maps instead of plain changelog text only.",
        ],
      },
      {
        label: "Fixed",
        items: [
          "Supplier bank details visibility mismatch between save and view screens.",
          "Dropdown clipping in top header selectors.",
          "Inconsistent pagination summaries between sales and purchase pages.",
          "Mixed table UI states across several modules.",
          "Sidebar color drift from the intended dark ZenSys theme.",
        ],
      },
    ],
    flowMap: [
      {
        title: "Supplier and Purchase Flow",
        steps: [
          "Suppliers list opens like customers, with direct row access instead of button-only navigation.",
          "Opening a supplier shows profile details, bank information, running due context, and linked purchase history.",
          "Opening a purchase from supplier history takes the user straight into the relevant purchase details screen.",
          "Purchase entries now support supplier-side discount values and clearer payment state visibility.",
        ],
      },
      {
        title: "Sales and Payment Flow",
        steps: [
          "Payment method selection is aligned across POS, due payment, purchase payment, and related forms.",
          "Mixed-payment and due-oriented sales flows now surface payment and remaining balance more clearly in history screens.",
          "Sales list and related paged tables use the same navigation footer and page-jump behavior.",
        ],
      },
      {
        title: "SaaS Branch Flow",
        steps: [
          "Free and Standard style plans now stay locked to the logged-in user's branch.",
          "The branch selector is hidden in that mode so users are not exposed to multi-branch switching controls they cannot use.",
          "Branch-based requests now resolve against the user's default branch automatically through shared branch context.",
        ],
      },
      {
        title: "UI System Flow",
        steps: [
          "Dropdowns, modals, cards, tables, and page entry states now follow the same shared motion language.",
          "Large data pages now share one table system for rows, hover states, empty states, and pagination.",
          "The sidebar now uses split brand assets, a darker ZenSys-aligned tone, and a rotating logo mark.",
        ],
      },
    ],
  },
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
    flowMap: [
      {
        title: "Offline Sales Flow",
        steps: [
          "Offline sales can be queued locally.",
          "Queued sales can be reviewed, retried, imported, and reprinted.",
          "Stock conflicts are checked before import.",
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
    flowMap: [],
  },
];

export const LATEST_VERSION = VERSION_HISTORY[0];
