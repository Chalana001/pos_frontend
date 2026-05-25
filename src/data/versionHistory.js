export const APP_VERSION = "1.9.0";

export const VERSION_HISTORY = [
  {
    version: "1.9.0",
    title: "Stock Processing, Actual Recipe Costing, Promotions, Import Refinements",
    releaseDate: "2026-05-24",
    summary:
      "This release completes the stock processing workflow, improves actual batch-based recipe costing, adds promotion management, refines Excel imports, and keeps category and measured-item setup cleaner for real shop operations.",
    highlights: [
      "Stock Processing now converts source items such as whole chicken into output stock items and waste history through a modal workflow with detailed processing history.",
      "Recipe sales now calculate cost from the actual ingredient batches consumed, including processing-created batches first and purchased batches after that.",
      "Promotion rules support active date ranges, item/category targeting, and controlled discount behavior while still allowing manual cart discounts.",
      "Excel import now separates item import from recipe ingredient linking, supports ingredient names, and avoids category lazy-loading/import template issues.",
      "Category structure, branch selector behavior, item active/deactivate control, and single-category style setup are cleaner across configuration and item screens.",
      "Volume items with L and ML are supported alongside weight items, so products like coconut oil can be purchased, stocked, sold, and reported correctly.",
      "Items now have a guarded delete flow: unused items can be deleted permanently, while used items show reference reasons and can be deactivated instead.",
    ],
    sections: [
      {
        label: "Added",
        items: [
          "Stock Processing screen under Stock with source selection, output quantity entry, waste tracking, and processing history.",
          "Stock processing configuration on item setup, allowing any normal, weight, or volume item to act as a processing source.",
          "Processing output links on source items with simple output item and waste flags.",
          "Separate stock batch source types for PURCHASE, PROCESSING, TRANSFER, OVERRIDE, and AUTO batches.",
          "Item active/deactivate control in item edit.",
          "Promotion management section with active promotions, edit/status handling, date range rules, and item/category targeting.",
          "Dedicated Recipe Ingredients Excel Import tab with item id, ingredient id or ingredient name, quantity, and unit columns.",
          "Volume item type with L and ML support across item setup, purchase, stock, POS, receipts, reports, and import.",
          "Safe item delete-check API and item list delete dialog using the single item delete endpoint.",
        ],
      },
      {
        label: "Improved",
        items: [
          "Stock Processing create flow now opens in a popup instead of taking over the page body.",
          "Processing history rows now open a full detail popup with source, consumed quantity, output quantities, waste flags, created batch ids, cost, user, and note.",
          "Default stock deduction now consumes PROCESSING batches first, then normal purchased stock for the same item.",
          "Recipe sale costing now uses actual consumed ingredient batch cost instead of only item default cost.",
          "Recipe costing was verified for mixed ingredients such as drumstick, rice, and onion with correct stock reduction and line cost.",
          "Excel import now keeps item rows and recipe ingredient linking in separate flows, reducing sheet confusion.",
          "Recipe ingredient uploads can resolve ingredients by valid item name as well as item id.",
          "Item forms, imports, and POS filtering follow the selected category structure more consistently.",
          "Item deletion now checks sales, stock, purchases, recipes, processing, promotions, warranties, and pending orders before allowing hard delete.",
        ],
      },
      {
        label: "Changed",
        items: [
          "Item cost price is treated as a default/reference value when batch stock is available; actual sale cost comes from consumed batches.",
          "Processing-created output stock is stored as PROCESSING stock so it can be distinguished from separately purchased stock.",
          "Existing items are initialized with stock processing disabled; source items can be enabled intentionally from item edit.",
          "Item DELETE now deletes unused items and deactivates protected items that already have history or active references.",
          "Recipe ingredient import is no longer part of the normal item import sheet flow.",
          "Volume items follow the same measured-stock behavior pattern as weight items.",
        ],
      },
      {
        label: "Fixed",
        items: [
          "Excel import preview no longer fails from lazy category loading while resolving category names.",
          "Recipe item imports no longer fail when reorder level is blank.",
          "Recipe ingredient quantity units now normalize PCS, G, KG, ML, and L correctly.",
          "Excel import template and upload buttons no longer jump to the wrong tab area.",
          "Recipe ingredient search results now render above the ingredient panel instead of being hidden inside the UI.",
          "Single-branch PRO package behavior can keep branch context selected without forcing unnecessary branch UI decisions.",
          "Processing output batches now carry a source type so stock deduction and history behave predictably.",
        ],
      },
    ],
    flowMap: [
      {
        title: "Stock Processing Flow",
        steps: [
          "Enable stock processing on a source item and link the output stock items, marking waste rows where needed.",
          "Open Stock Processing, click New Processing, select source, source batch, consumed quantity, and output quantities.",
          "The source batch is reduced, non-waste output batches are created as PROCESSING stock, and waste rows are stored in history only.",
          "Click a history row to review the full processing details, costs, outputs, waste, batch ids, user, and note.",
        ],
      },
      {
        title: "Actual Recipe Cost Flow",
        steps: [
          "Create recipe items using stock-tracked ingredients such as drumstick, rice, onion, oil, or other measured items.",
          "When a recipe is sold, the system consumes ingredient batches automatically, using PROCESSING batches before purchased batches.",
          "The order line cost is saved from the actual consumed batch costs, and reports use line total minus line cost for profit.",
        ],
      },
      {
        title: "Promotion Flow",
        steps: [
          "Open Promotions from the sidebar and configure date-ranged item or category discounts.",
          "POS applies the active controlled promotion and still allows manual cart discount stacking.",
          "Edit, activate, deactivate, and review active promotions from the Promotions screen.",
        ],
      },
      {
        title: "Excel Item and Recipe Ingredient Flow",
        steps: [
          "Import normal, weight, volume, service, and recipe items from the Items import flow.",
          "Import recipe ingredient links later from the Recipe Ingredients tab using item id plus ingredient id or ingredient name.",
          "Preview rows, fix validation issues, and commit valid rows without blocking the whole upload.",
        ],
      },
    ],
  },
  {
    version: "1.8.0",
    title: "Category Structure, Promotions, Excel Recipes, Volume Items",
    releaseDate: "2026-05-23",
    summary:
      "This release adds configurable category structure, controlled promotion rules, separate recipe ingredient Excel import, and volume-based stock items for selling products by L or ML.",
    highlights: [
      "Category structure can now be selected from App Configuration, supporting the normal main-and-sub flow or a single-category style flow.",
      "Promotion rules now support active date ranges, item/category targeting, bill/customer phase-ready design, and POS discount stacking with manual cart discounts.",
      "Excel import is cleaner: item import stays on the main tab, recipe ingredients import has its own tab, and recipe ingredients can resolve by item id or item name.",
      "Recipe items can be imported without ingredients first, then ingredients can be linked later through the dedicated recipe ingredients upload.",
      "Volume-based items are now supported with L and ML units for products such as coconut oil, using the same stock, purchase, POS, receipt, and report behavior as weight items.",
    ],
    sections: [
      {
        label: "Added",
        items: [
          "Category structure selector in App Configuration for main-and-sub or single-category operation.",
          "Promotions section with active promotion configuration, item/category targeting, date range control, and edit/status management.",
          "Dedicated Recipe Ingredients Excel Import tab with item id, ingredient id or ingredient name, quantity, and unit columns.",
          "Volume item type with L and ML unit support across item setup, POS selling, stock, purchase, transfer, adjustment, receipts, invoices, reports, and Excel import.",
          "Recipe ingredient import support for normal, weight, and volume stock items.",
        ],
      },
      {
        label: "Improved",
        items: [
          "Item Excel import template now focuses on item rows only, while recipe ingredient linking is handled in a separate tab.",
          "Excel category and subcategory handling now supports name-based resolution and avoids unnecessary branch requirements for non-service items.",
          "Recipe item imports now tolerate blank reorder levels and allow ingredients to be linked after the item rows are created.",
          "POS item discounts and promotion discounts can stack so both controlled promotions and manual cart discounts are reflected in the final line total.",
          "Purchase, stock adjustment, stock transfer, POS cart, receipt, invoice, and report quantity formatting now share measured-item behavior for KG/G and L/ML.",
        ],
      },
      {
        label: "Changed",
        items: [
          "Recipe ingredients are no longer managed as a second sheet in the normal item import page; they are imported from the recipe ingredients tab.",
          "Volume items use L as the primary display/selling unit and ML as the base stock unit, matching the existing KG/G pattern.",
          "The existing weight item feature visibility setting also controls volume items because both are measured stock item types.",
        ],
      },
      {
        label: "Fixed",
        items: [
          "Excel import preview no longer hits lazy category loading errors while resolving category names.",
          "Recipe ingredient uploads now work when a valid ingredient name is provided instead of an id.",
          "Excel import template and upload buttons now stay inside their active tab instead of jumping between page header and tab content.",
          "Ingredient search results now render above the recipe ingredient panel instead of being hidden behind the next section.",
          "Recipe item imports no longer fail when reorder level is blank.",
          "Recipe ingredient quantity units now validate and normalize PCS, G, KG, ML, and L correctly.",
        ],
      },
    ],
    flowMap: [
      {
        title: "Category Structure Flow",
        steps: [
          "Open App Configuration and choose the category structure mode.",
          "Use main-and-sub categories for the full hierarchy, or single-category mode when the shop only needs one visible category level.",
          "Item forms, import preview, and POS/category filters follow the selected structure.",
        ],
      },
      {
        title: "Promotion Flow",
        steps: [
          "Open Promotions from the sidebar and create a date-ranged discount rule.",
          "Target the promotion to items, categories, bill totals, or customer-ready rules depending on the configured phase.",
          "POS applies the best active promotion and still allows a manual cart discount to stack on top.",
        ],
      },
      {
        title: "Excel Item and Recipe Ingredient Flow",
        steps: [
          "Import normal, weight, volume, service, and recipe items from the Items tab.",
          "Import recipe ingredient links later from the Recipe Ingredients tab using item id plus ingredient id or ingredient name.",
          "Review preview rows, fix errors, and commit valid rows without blocking the whole upload.",
        ],
      },
      {
        title: "Volume Item Flow",
        steps: [
          "Create a volume item such as coconut oil and choose L or ML as the default unit.",
          "Purchase, adjust, transfer, and sell it with L/ML quantity conversion.",
          "Receipts, invoices, stock pages, and reports display volume quantities using the same measured-item rules as weight stock.",
        ],
      },
    ],
  },
  {
    version: "1.7.0",
    title: "Excel Item Import, Recipe Ingredients, Advanced Reports",
    releaseDate: "2026-05-20",
    summary:
      "This release adds the new Excel item import workflow, recipe ingredient linking, POS visibility controls, detailed paginated reports with Excel export, and a cleaner premium Basic Reports dashboard.",
    highlights: [
      "Items can now be imported from Excel through a dedicated preview page with row statuses, validation errors, skip behavior, and manual category correction.",
      "Bulk import supports barcode auto-generation when barcode cells are empty, plus category and subcategory mapping by names or valid ids.",
      "Recipe items now import with a second sheet for ingredients, linking existing stock items by import key and required quantity/unit instead of creating separate ingredient-only records.",
      "Items now include a POS visibility option, so stock items can be kept for recipes or inventory without showing on the POS screen.",
      "Sales, product, customer, and supplier reports now have separate paginated pages with time filters, top/lowest sorting, and Excel export for the selected range or all time.",
      "Basic Reports now focuses on executive overview charts only, with premium summary cards, donut charts, trend metrics, and ranked performance snapshots.",
      "Mobile sidebar close behavior is fixed so the drawer can be dismissed reliably from the close button, backdrop, or route changes.",
      "Mobile hamburger menu button now stays above the header layer so users can reopen the sidebar after closing it.",
    ],
    sections: [
      {
        label: "Added",
        items: [
          "Dedicated Excel item import page with preview table, row status tracking, and partial import handling.",
          "Two-sheet Excel import structure for item rows and recipe ingredient rows.",
          "POS visibility control for normal, weight, service, and recipe items.",
          "Advanced report pages for sales, product performance, customer performance, and supplier performance.",
          "Excel export for advanced reports using the active branch, date range, sort, and report filters.",
        ],
      },
      {
        label: "Improved",
        items: [
          "Bulk item import now auto-generates barcodes when barcode is blank, matching the manual item form behavior.",
          "Import category handling now resolves main category from subcategory data and allows manual dropdown correction for invalid rows.",
          "Basic Reports was redesigned into an executive summary with premium charts instead of mixing detailed tables into the overview.",
          "Round charts, bar charts, and sales trend charts now use richer dashboard-style cards, gradients, center values, and ranked side summaries.",
          "Low stock dashboard and header alerts now open the existing Stock page with the Reorder Level filter selected.",
          "Mobile sidebar drawer animation now respects the closed state instead of forcing the drawer to stay visible.",
          "Mobile sidebar hamburger button layering was adjusted so the menu can be reopened whenever needed.",
        ],
      },
      {
        label: "Changed",
        items: [
          "Basic Reports is now a quick overview area; detailed business data lives in the separate advanced report sections.",
          "Low stock no longer has a separate page. It reuses the Stock page filter flow.",
          "Recipe ingredient imports link already-created stock items instead of treating ingredients as a separate item type.",
        ],
      },
      {
        label: "Fixed",
        items: [
          "Excel imports no longer fail just because barcode is empty.",
          "Import templates no longer require main category id when subcategory details can resolve the category relationship.",
          "Failed import rows can remain visible with error state while valid rows continue importing.",
          "Report date filters now support all-time mode without forcing a date range.",
          "Mobile sidebar close button now hides the drawer correctly after the sidebar open animation has run.",
          "Mobile sidebar open button no longer sits underneath the header layer.",
        ],
      },
    ],
    flowMap: [
      {
        title: "Excel Item Import Flow",
        steps: [
          "Download or prepare the item import workbook with the Items sheet and Recipe Ingredients sheet.",
          "Upload the workbook into the import page and review every row in the preview table.",
          "Fix invalid category or subcategory mappings directly in the preview dropdowns.",
          "Run import; valid rows are saved, imported rows are marked, and failed rows stay visible with their error message.",
        ],
      },
      {
        title: "Recipe Ingredient Flow",
        steps: [
          "Create or import stock items that can be sold or used as recipe ingredients.",
          "Reference those items from the recipe ingredient sheet by import key, quantity, and unit.",
          "Keep ingredient-only stock hidden from POS by disabling POS visibility on the item row.",
        ],
      },
      {
        title: "Reports Flow",
        steps: [
          "Use Basic Reports for a quick executive dashboard with charts and KPI context.",
          "Open Sales, Product, Customer, or Supplier Reports from the sidebar for paginated report data.",
          "Apply time range, sorting, top/lowest direction, and report-specific filters.",
          "Export the currently selected report range to Excel, including all-time exports.",
        ],
      },
      {
        title: "Low Stock Flow",
        steps: [
          "Click the dashboard low stock card or header stock alert.",
          "The Stock page opens with the Reorder Level filter already selected.",
          "Users can adjust, transfer, search, or clear the filter from the same Stock page.",
        ],
      },
    ],
  },
  {
    version: "1.6.1",
    title: "Shift Modal Layering Fix",
    releaseDate: "2026-05-18",
    summary:
      "This patch fixes the shift management open and close modal overlay so it renders above the full app shell instead of being trapped inside the page content stack.",
    highlights: [
      "Shift open and close dialogs now render through a document-body portal, so the overlay covers the full viewport reliably.",
      "The modal stacking issue that left background controls visible above the dialog has been removed.",
      "Shift management flows keep the same behavior, but the confirmation UI now behaves consistently across the shell layout.",
    ],
    sections: [
      {
        label: "Fixed",
        items: [
          "Shift open and close popups now overlay the full application instead of being clipped by the page stacking context.",
          "Backdrop and dialog layering now stay above the shell header, sidebar, and animated main content area.",
          "Modal rendering is now consistent across shift management and other shared dialog flows.",
        ],
      },
    ],
  },
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
