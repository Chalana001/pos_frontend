export const APP_VERSION = "2.3.0";

export const VERSION_HISTORY = [
  {
    version: "2.3.0",
    title: "Demand Forecasting, Procurement Planning & Scheduled Report Exports",
    releaseDate: "2026-08-19",
    summary:
      "Reports now cover the full planning cycle, not just history: a Demand Forecast report predicts what each item will need with a tracked accuracy score, and a new Procurement Planning workspace turns that forecast into a reorder plan you can submit, approve, and convert straight into purchase drafts. Reports can also run as background jobs — stored locally or in S3, and optionally emailed on a schedule — instead of blocking the screen while they generate. Underneath, the Reports page and Dashboard were rebuilt into separate, reusable pieces, which fixed the flicker and lost-page bugs that came from the old single-file version, and a database-level fix now stops double-clicking from ever creating two open shifts at once.",
    highlights: [
      "New Demand Forecast report — confidence-labelled predictions per item, with accuracy tracked against what actually sold.",
      "New Procurement Planning workspace — build a reorder plan from stock and demand data, submit it, get admin approval, and generate purchase drafts from the approved lines.",
      "Reports can now export as background jobs — stored to local disk or S3, downloadable when ready, with optional recurring email delivery on a schedule.",
      "13 new report views added: Inventory Valuation, Stock Health, Cash Flow, Profit & Loss, Credit Aging, Supplier Payables, Stock Movement, Stock Transfers, Customer Behavior, Performance Comparison, Commercial Intelligence, Exception Center, and GRN/Purchases.",
      "Switching a report's filter or date range no longer flashes a spinner and drops you back to page 1 — your place is held while it refreshes.",
      "Fixed a bug where double-clicking Open Shift (a common habit on Windows) could create two open shifts for the same cashier and branch; now blocked at the database level, not just in the app.",
      "Dashboard and Reports now share one color and chart system across every tile and chart, and a fabricated \"+12.5%\" growth figure that was shown on every Dashboard load regardless of the real numbers has been removed.",
      "New Animation Level setting so each user can turn interface motion up or down.",
    ],
    sections: [
      {
        label: "Added",
        items: [
          "Demand Forecast report with confidence-labelled forecasts per item, backed by forecast snapshots that are compared against realized sales to keep an accuracy score visible over time.",
          "Procurement Planning workspace: create a reorder plan, submit it for approval, have an Admin or Super Admin approve or reject it, generate purchase drafts from the approved lines, and mark the plan converted once handed off to a real purchase.",
          "Report export jobs — generate a report in the background and download it when ready, instead of waiting on the request. Configurable storage backend (local disk or S3), automatic retry on failure, and scheduled cleanup of old exports.",
          "Recurring report schedules with optional email delivery once SMTP is configured.",
          "13 new report pages: Inventory Valuation, Stock Health, Cash Flow, Profit & Loss, Credit Aging, Supplier Payables, Stock Movement, Stock Transfers (with a transfer details drill-down), Customer Behavior, Performance Comparison, Commercial Intelligence, Exception Center, and GRN/Purchases.",
          "Owner Command Center summary card on the reports dashboard.",
          "Per-user Animation Level setting controlling how much motion the interface uses.",
          "A shared chart color and theme system used consistently across every report chart and the Dashboard.",
          "9 new database migrations (V19–V27) supporting report export jobs, forecast accuracy snapshots, reorder plans, and the duplicate-shift-prevention constraint below.",
        ],
      },
      {
        label: "Improved",
        items: [
          "The Reports page was broken apart from a single 2,264-line file into one component per report — the underlying cause of switching a filter or tab silently unmounting the whole report and losing table pagination and scroll position.",
          "Changing a filter or date on the report you're already viewing now keeps your data on screen (dimmed, with an \"Updating…\" indicator) instead of flashing a full spinner and resetting the table to page 1.",
          "Switching between report tabs no longer flashes the previous report's data under the new title, then an empty state, then a blank chart area before the real numbers land.",
          "Currency formatting is now consistent everywhere — no more charts mixing \"LKR\" and \"Rs.\" on the same axis.",
          "Report tables now paginate instead of rendering unbounded datasets in one page.",
          "Report metric labels clarified after an internal audit: \"Returns\" is now \"Return txns\" (it counts return transactions, not units), and the Return Rate and Inventory Valuation potential labels now state what they actually measure.",
          "Procurement demand sources and units are now shown on the Procurement Planning and Forecast reports instead of being hidden.",
          "Category-mode filtering is now respected consistently across all report views.",
          "Build target raised to modern browsers only (Chrome/Edge/Firefox 100+, Safari 15+), with a bundle-size budget check added to the build pipeline.",
        ],
      },
      {
        label: "Fixed",
        items: [
          "Double-clicking Open Shift could create two open shifts for the same branch and cashier before the first request finished. Now closed with a request-deduplication filter plus a real database unique constraint, so it can no longer happen even under a race — and any duplicates the old bug had already created are cleaned up automatically.",
          "Removed a fabricated \"+12.5%\" growth figure shown on every Dashboard load next to Today's Sales, regardless of the actual numbers — including next to LKR 0.00.",
          "Fixed low-contrast text across all report pages and chart legend labels that were inheriting their series color instead of using readable text color.",
          "The Dashboard's third Quick Action was labelled \"Add User\" but actually opened Add Customer; relabeled to match what it does.",
        ],
      },
    ],
    flowMap: [
      {
        title: "Procurement Planning Flow",
        steps: [
          "Open Procurement Planning from Reports and review the suggested reorder lines built from stock and demand data.",
          "Adjust quantities as needed and submit the plan for approval.",
          "An Admin or Super Admin approves or rejects the plan.",
          "Generate purchase drafts from the approved plan, then mark it converted once the purchase is created.",
        ],
      },
      {
        title: "Demand Forecast Flow",
        steps: [
          "Open the Demand Forecast report to see confidence-labelled predictions per item.",
          "Forecast snapshots are recorded automatically and compared against what actually sold.",
          "Forecast accuracy history shows how reliable recent predictions have been.",
        ],
      },
      {
        title: "Report Export & Scheduling Flow",
        steps: [
          "Request a report export instead of waiting for it to generate inline.",
          "The export runs as a background job and can be downloaded once ready, or retried if it fails.",
          "Optionally schedule a report to run and email itself on a recurring basis.",
        ],
      },
    ],
  },
  {
    version: "2.2.0",
    title: "Barcode Label Designer, Direct Printing & Print Fixes",
    releaseDate: "2026-07-22",
    summary:
      "Barcode labels now have a full per-branch designer that works just like the receipt layout designer — reorder every element, add custom text lines, and style each line with its own font size, bold/italic/underline, and alignment. Direct and browser printing were made reliable, and the bugs that caused barcodes to disappear on label paper sizes are fixed.",
    highlights: [
      "New per-branch Barcode Label Designer — reorder Shop Name, Item Name, Barcode, Price, Expiry, and Footer, show/hide any element, and rename its text.",
      "Add unlimited custom text lines (warranty, weight, made-in, etc.) anywhere on the label.",
      "Each label element now has its own font size, bold, italic, underline, and left/center/right alignment.",
      "Barcodes that were printing blank on smaller label paper sizes now print reliably.",
      "The barcode number now prints in the same font as the price and other lines, instead of the old monospace style.",
      "Direct printing through the local printer service, plus a browser-print fallback that prints only the labels at the correct label size.",
    ],
    sections: [
      {
        label: "Added",
        items: [
          "Barcode Label Designer with a reorderable element list (up/down), per-element show/hide, rename, font size, bold/italic/underline, and alignment — mirroring the receipt layout designer.",
          "Custom text lines on labels that can be placed anywhere in the label order.",
          "Per-branch label layout stored as JSON, with automatic fallback to the previous fixed layout for branches that have not customized yet.",
          "Label size presets plus custom width/height with mm and inch entry.",
          "Expiry date on labels using the earliest-expiry sellable stock batch (FEFO), scoped per branch.",
          "Branch-aware recent items and search on the Print Barcodes page.",
        ],
      },
      {
        label: "Improved",
        items: [
          "The label preview and the printed label are now rendered by one shared component, so the on-screen preview always matches the real print output.",
          "Browser printing now prints an isolated document containing only the labels, at the correct label page size, instead of trying to print through the whole app screen.",
          "Barcode value text is rendered as normal label text, so it lines up with the price and other elements in the same font.",
        ],
      },
      {
        label: "Fixed",
        items: [
          "Barcodes were printing as blank labels because the barcode canvas was not captured into the print output; the barcode is now an image that prints reliably.",
          "Barcodes disappeared when a label paper size was selected in the browser print dialog.",
          "The barcode number printed in a different (monospace) font than the rest of the label; it now matches the label font.",
        ],
      },
    ],
    flowMap: [
      {
        title: "Barcode Label Design Flow",
        steps: [
          "Open Receipt Design and switch to the Barcode tab for a selected branch.",
          "Reorder, show/hide, rename, and style each label element, or add custom text lines.",
          "Watch the live preview update as you edit, then Save.",
          "Print from the Print Barcodes page — labels print with your saved layout.",
        ],
      },
    ],
  },
  {
    version: "2.1.0",
    title: "Sales Value Costing, Item Alt Names, Super Admin Fix",
    releaseDate: "2026-06-20",
    summary:
      "Stock processing cost allocation now uses the sales value method so each output part receives a cost share proportional to its expected selling revenue, not its weight. Items can now carry an alternative name for multilingual receipt printing, and a bug that blocked super admin login after a session expired has been fixed.",
    highlights: [
      "Stock processing cost is now allocated by selling price × quantity ratio — a chicken leg gets a bigger cost share than bones because it sells for more, not just because it weighs more.",
      "A default selling price per processing output can be saved on the item setup form so the right ratio is pre-filled every time stock is processed.",
      "The processing modal now shows a live estimated cost, expected revenue, and margin preview before you confirm.",
      "Items can now store an alternative name — useful for Sinhala or Tamil names alongside the primary English name.",
      "Receipt template settings now let you choose whether to print the primary item name or the alternative name on customer receipts.",
      "Super admin panel login no longer fails with a token expiry error when the previous session had already expired.",
    ],
    sections: [
      {
        label: "Added",
        items: [
          "Sales Value Method for stock processing cost allocation — allocated cost = source cost × (output qty × selling price) / total expected revenue.",
          "Default selling price field per processing output link on the item setup form.",
          "Real-time estimated cost, expected revenue, and margin preview per output row in the New Processing modal.",
          "alt_name column on items for storing a secondary item name (e.g. Sinhala or Tamil).",
          "item_name_source setting in receipt template so receipts can print the primary or alternative item name.",
          "alt_name captured on order items at time of sale so historical receipts always reflect the name used at checkout.",
          "DB migration V5 adding default_selling_price to stock_processing_output_links.",
        ],
      },
      {
        label: "Improved",
        items: [
          "Stock processing cost allocation is now revenue-aware — output parts with higher market value absorb proportionally more of the source cost.",
          "Waste outputs continue to receive zero cost allocation; only usable outputs participate in the ratio.",
          "Rounding drift is absorbed by the last non-waste output row so the sum of all allocated costs always equals the exact source cost.",
          "Selling price priority in processing: request override → link default → item selling price.",
          "If all selling prices are zero the system falls back to the previous quantity-based ratio to avoid divide-by-zero.",
        ],
      },
      {
        label: "Fixed",
        items: [
          "Super admin panel login was blocked by the JWT auth filter when an expired Bearer token was sent in the login request headers. JwtAuthFilter now skips the /auth/login endpoint entirely.",
          "Debug token print statement (System.out.println) removed from JwtAuthFilter.",
        ],
      },
    ],
    flowMap: [
      {
        title: "Sales Value Cost Allocation Flow",
        steps: [
          "Open an item with stock processing enabled and set a default selling price for each non-waste output.",
          "When processing stock, the selling price is pre-filled from the link default or the item's current price.",
          "The modal shows an estimated allocated cost per row and a total revenue and margin preview.",
          "On save, each output batch receives a cost proportional to its share of total expected revenue.",
        ],
      },
      {
        title: "Alt Name Receipt Flow",
        steps: [
          "Open an item and enter an alternative name in the Alt Name field (e.g. the Sinhala product name).",
          "Open Receipt Template Settings and choose Primary Name or Alternative Name as the item name source.",
          "At checkout, the alt name is captured on the order line so the receipt always prints the name that was active at the time of sale.",
        ],
      },
    ],
  },
  {
    version: "2.0.0",
    title: "Multi-DB Architecture — Per-Tenant Isolated Databases",
    releaseDate: "2026-06-19",
    summary:
      "Each shop now runs in its own dedicated database (pos_<slug>) instead of sharing a single database with all other tenants. This eliminates cross-tenant data risk, improves query performance, and lays the foundation for per-tenant backups and scaling.",
    highlights: [
      "Every shop's data is now stored in a fully isolated database — no shared tables with other tenants.",
      "Tenant routing is handled automatically at the connection level; no changes are required in the app workflow.",
      "The legacy shared database (pos_db) is preserved as a read-only rollback anchor and is no longer written to.",
      "New shops onboarded via the SaaS admin panel get their own database provisioned instantly with Flyway.",
      "All queries are faster — no tenant_id filter predicate on every table scan.",
      "The migration runner copies existing tenant data with row-count verification per table before cutover.",
    ],
    sections: [
      {
        label: "Added",
        items: [
          "Per-tenant database provisioning (pos_<slug>) via Flyway baseline on new shop onboarding.",
          "TenantDataMigrationRunner with explicit-column copy, FK-order awareness, and per-table row-count verification.",
          "COPIED migration status so tenant data can be verified before traffic is switched over.",
          "Master Flyway V2 migration that adds COPIED to the tenant_databases status enum.",
          "SaasApiIntegrationTest re-enabled with Testcontainers MySQL (skips gracefully when Docker is absent).",
          "application-tc.properties test profile for real MySQL integration tests.",
        ],
      },
      {
        label: "Improved",
        items: [
          "Query performance across all tenant-scoped tables — tenant_id predicate removed from every query.",
          "Unique constraints are now tighter — e.g. barcode is unique per shop DB, not per (barcode, tenant_id) composite.",
          "TenantProvisioningService now uses Flyway migrate instead of schema LIKE clone, so new DBs always match the current baseline.",
          "MasterFlywayRunner and MasterDataCopyRunner are profile-guarded and handle empty legacy DB gracefully.",
        ],
      },
      {
        label: "Changed",
        items: [
          "TenantEntity is now an empty @MappedSuperclass — tenant_id column removed from all 45 per-tenant tables.",
          "All repository native queries rewritten to drop tenant_id predicate (DashboardRepository, ReportRepository, and others).",
          "TenantFilterAspect deleted — Hibernate session filter is no longer needed with per-DB isolation.",
          "allow-legacy-fallback is now false in production — all tenants must be MIGRATED before deploy.",
        ],
      },
      {
        label: "Fixed",
        items: [
          "Migration runner no longer picks up ad-hoc backup tables from pos_db (table list sourced from provisioned target schema).",
          "ItemService native queries that still referenced tenant_id column causing 500 on item delete.",
          "Branch unique constraint violations in integration tests after removing tenant_id from composite keys.",
        ],
      },
    ],
    flowMap: [],
  },
  {
    version: "1.13.0",
    title: "Printer Service Integration, Direct Printing, and Receipt Stability",
    releaseDate: "2026-06-07",
    summary:
      "This release adds direct printer service integration for faster local receipt and KOT printing, improves printer discovery, and fixes printer reliability for the POS workflow.",
    highlights: [
      "Printer service is now connected and available for local direct printing from the POS.",
      "Receipt and KOT printing use the printer agent for faster, more reliable output.",
      "Test print support was added so users can verify printer service connectivity before checkout.",
      "Printer options are now refreshed from the local agent and selected printer names are preserved.",
      "Browser fallback printing remains available when the local printer service is unavailable.",
    ],
    sections: [
      {
        label: "Added",
        items: [
          "Local printer service integration for direct receipt and KOT printing.",
          "Printer health and discovery flow in receipt settings so printers can be loaded from the agent.",
          "Test print action for validating the selected printer before using it in the live POS.",
          "Receipt settings now show printer service connection status and enable direct printer selection.",
        ],
      },
      {
        label: "Improved",
        items: [
          "POS print reliability for receipts and kitchen orders when the printer agent is available.",
          "Printer state handling no longer blocks checkout if the service is offline; fallback printing is used instead.",
          "Printer errors are shown with clearer messages for unavailable or failed local service calls.",
        ],
      },
      {
        label: "Fixed",
        items: [
          "Printer options were not always refreshed after reconnecting the print agent.",
          "Direct print service communication failures now trigger browser fallback instead of silent failures.",
        ],
      },
    ],
  },
  {
    version: "1.12.0",
    title: "Purchase Cash Sources, Branch Purchase Rules, Bill Printing, Recipe Flexibility",
    releaseDate: "2026-06-06",
    summary:
      "This release tightens purchase cash handling, limits manager purchase work to their own branch, adds restaurant-style pre-bill printing, and allows recipe items to be created and sold before ingredients are linked.",
    highlights: [
      "Purchases now record whether cash came from branch cash, an open cash drawer, bank, or no cash source depending on the payment method.",
      "Old purchases are migrated to Branch Cash automatically so previous records keep a valid source after the update.",
      "Managers can only create, search, and view purchase stock for their assigned branch, while admins can still work across branches.",
      "Admin and manager drawer purchases now resolve against the logged-in user's open branch shift without a manual shift selector.",
      "POS now supports printing an unpaid bill before checkout, with a setting to decide whether a final receipt should also print after checkout.",
      "Recipe items can now be saved with zero ingredients and sold even when ingredient stock is empty or ingredients will be linked later.",
    ],
    sections: [
      {
        label: "Added",
        items: [
          "Purchase cash source tracking with Branch Cash, Cash Drawer, Bank, and None source states.",
          "Cash source fields on purchase and supplier payment records, including linked shift, cashier, source amount, and source branch.",
          "Startup migration that backfills existing purchases to Branch Cash.",
          "App Configuration option to control whether POS prints the final receipt automatically after checkout.",
          "POS Print Bill action before checkout for restaurant-style unpaid bills.",
          "Unpaid bill receipt label so pre-checkout prints are not confused with paid receipts.",
        ],
      },
      {
        label: "Improved",
        items: [
          "Purchase payment UI now shows the cash source selector only for Cash payments with a paid amount.",
          "Bank, card, cheque, and non-cash payment methods now set their source automatically and cannot be changed incorrectly.",
          "Admin drawer purchases now use the admin's own open shift in the selected branch.",
          "Managers now see available purchase stock only from their assigned branch.",
          "Shift context now loads the logged-in user's open shift per branch for admin and manager users.",
          "Recipe checkout now allows empty ingredient lists and can continue even when linked ingredient stock is zero.",
        ],
      },
      {
        label: "Changed",
        items: [
          "Only one open shift per branch is allowed for the same admin or manager user.",
          "Opening a branch shift now uses the logged-in user instead of selecting another cashier user.",
          "Cash Drawer source requires an open shift for the selected branch and current logged-in user.",
          "Recipe items are treated as sellable POS items without direct stock availability blocking.",
          "Ingredient stock consumption for recipes can go negative when checkout is allowed.",
        ],
      },
      {
        label: "Fixed",
        items: [
          "Managers can no longer purchase for another branch.",
          "Purchase source selection no longer appears for non-cash payments.",
          "Cash source selection no longer gets stuck after changing payment method.",
          "Drawer source errors are clearer because the system now resolves the user's own open shift.",
          "Recipe item creation no longer fails when no ingredients are added.",
          "Blank recipe ingredient rows are ignored instead of blocking a zero-ingredient recipe save.",
          "POS no longer blocks adding or checking out recipe items only because ingredients are missing or out of stock.",
        ],
      },
    ],
    flowMap: [
      {
        title: "Purchase Cash Source Flow",
        steps: [
          "Select the purchase branch and payment method.",
          "If the payment method is Cash, choose Branch Cash or Cash Drawer.",
          "Cash Drawer uses the logged-in user's open shift for that branch.",
          "Non-cash methods automatically use Bank or None and keep the source locked.",
        ],
      },
      {
        title: "Manager Purchase Branch Flow",
        steps: [
          "Manager users open purchase screens from their assigned branch context.",
          "Purchase create and search requests are restricted to that assigned branch.",
          "Available stock search only returns the manager's branch stock.",
          "Admin users keep cross-branch purchase access.",
        ],
      },
      {
        title: "Bill And Receipt Printing Flow",
        steps: [
          "Cashier can print an unpaid bill before checkout.",
          "Customer pays after reviewing the bill.",
          "Checkout completes the sale.",
          "The App Configuration receipt toggle decides whether the final paid receipt prints automatically.",
        ],
      },
      {
        title: "Zero-Ingredient Recipe Flow",
        steps: [
          "Create a recipe item without adding ingredient rows.",
          "Add ingredients later when the kitchen costing is ready.",
          "Recipe items remain sellable on POS even before ingredients are linked.",
          "Checkout is not blocked by missing ingredients or zero ingredient stock.",
        ],
      },
    ],
  },
  {
    version: "1.11.0",
    title: "Branch Configuration, Expense Branch Mode, Processing Cancel, Timezone Fixes",
    releaseDate: "2026-05-29",
    summary:
      "This release makes app configuration branch-aware, allows non-drawer branch expenses without an open shift, adds reversible stock processing with cancel history, and fixes production time offsets by pinning the app to Sri Lanka time.",
    highlights: [
      "App Configuration is now managed per branch, so admins can switch branch context and managers can edit only their assigned branch settings.",
      "Expenses now support true branch expenses for admin and manager users without forcing an open cashier shift when the cost does not come from the drawer.",
      "Stock Processing history now supports a cancel flow that restores source stock and removes untouched processing output batches.",
      "Existing stock processing records are normalized during startup so old rows do not appear canceled by mistake.",
      "Application time handling is now pinned to Asia/Colombo to stop the 3-hour production timestamp drift.",
      "POS item tiles, receipt logo flow, and other operational layout details were tightened for cleaner day-to-day use.",
    ],
    sections: [
      {
        label: "Added",
        items: [
          "Branch-scoped App Configuration APIs and UI flow.",
          "Branch-aware configuration fallback behavior with per-role access rules.",
          "Stock Processing cancel endpoint, status tracking, cancel reason, cancel user, and cancel time.",
          "One-time startup migration to normalize old stock processing rows that were backfilled with the wrong canceled state.",
          "Application-wide timezone configuration for Sri Lanka time handling.",
        ],
      },
      {
        label: "Improved",
        items: [
          "Expense recording now distinguishes drawer expenses from branch expenses more cleanly.",
          "Expense history now shows non-drawer rows as branch expenses instead of forcing a fake shift context.",
          "Stock Processing history now shows status clearly and exposes cancel behavior from the details flow.",
          "Receipt logo layout now keeps large logos in normal flow so the rest of the receipt content moves down cleanly.",
          "POS product tiles now balance icon, title, and price spacing better for longer item names.",
        ],
      },
      {
        label: "Changed",
        items: [
          "App Configuration ownership moved from tenant-wide only to branch-first configuration with tenant fallback.",
          "Stock processing records now carry a completed/canceled lifecycle state.",
          "Expense `shift_id` is now optional so branch expenses can exist without a cashier drawer session.",
          "Backend date serialization and persistence now assume Asia/Colombo instead of the host machine timezone.",
        ],
      },
      {
        label: "Fixed",
        items: [
          "Managers can no longer accidentally edit another branch's app configuration.",
          "Admin and manager users are no longer blocked from recording non-drawer expenses when no shift is open.",
          "Old stock processing history rows are no longer shown as canceled because of the new status rollout.",
          "Production-created timestamps no longer appear roughly three hours behind Sri Lanka local time.",
          "Receipt headers no longer let large logos overlap branch and address text.",
        ],
      },
    ],
    flowMap: [
      {
        title: "Branch Configuration Flow",
        steps: [
          "Select a branch from the header branch selector.",
          "Open App Configuration and save settings for that selected branch.",
          "Managers only see and update their assigned branch configuration.",
          "If a branch-specific setting is missing, the tenant default is used as fallback.",
        ],
      },
      {
        title: "Expense Recording Flow",
        steps: [
          "Choose an expense type and branch, then decide whether the cost comes from the drawer.",
          "Drawer expenses still require an open shift and increase shift expense totals.",
          "Branch expenses can be saved by admin or manager users without an open shift.",
          "Expense history labels rows without a shift as branch expenses.",
        ],
      },
      {
        title: "Stock Processing Cancel Flow",
        steps: [
          "Open a stock processing history row and review the processing details.",
          "Use Cancel Processing with a reason when the produced output stock is still untouched.",
          "The system restores the consumed source stock and removes created processing batches.",
          "If any output stock was already sold or adjusted, cancellation is blocked.",
        ],
      },
      {
        title: "Production Time Flow",
        steps: [
          "Backend startup now pins the application timezone to Asia/Colombo.",
          "New timestamps are created and serialized in Sri Lanka time.",
          "Frontend date displays now line up with the actual recorded business time.",
          "Production no longer shows records several hours behind the real event time.",
        ],
      },
    ],
  },
  {
    version: "1.10.0",
    title: "KOT Control, Expense Types, Stock Override Roles, Warranty Permissions",
    releaseDate: "2026-05-28",
    summary:
      "This release adds tenant-wide KOT control, configurable expense types for cleaner profit reporting, role-aware stock override permissions, and stronger warranty controls across POS, receipts, and invoices.",
    highlights: [
      "KOT can now be enabled or disabled from App Configuration for the full tenant, while item-level KOT flags stay preserved for when KOT is re-enabled.",
      "POS now disables manual KOT printing and skips automatic takeaway KOT after payment when the tenant KOT setting is off.",
      "Expense Types can be managed from configuration, including whether each type counts as a real profit-report expense or a recovered/non-profit cost.",
      "Stock shortage behavior now supports Block, Require Confirmation, and Always Allow modes with role-specific override permissions.",
      "Warranty usage can now be enabled or disabled globally and controlled per role for Admin, Manager, and Cashier users.",
      "Thermal receipts and A4 invoices now respect warranty visibility settings more consistently.",
    ],
    sections: [
      {
        label: "Added",
        items: [
          "Tenant-wide Kitchen Order Tickets toggle in App Configuration.",
          "KOT-aware POS behavior for manual Print KOT and automatic takeaway KOT after payment.",
          "Expense Types settings page with active/inactive state and profit-report inclusion control.",
          "Expense type APIs, persistence, migration, delete/deactivate behavior, and active type selection on expense entry.",
          "Stock shortage handling modes in App Configuration: Block Shortages, Require Confirmation, and Always Allow.",
          "Role-level stock override permissions for Admin, Manager, and Cashier.",
          "Warranty enable/disable setting plus role-level warranty permissions.",
          "Database migrations for KOT configuration, expense type defaults, stock override permissions, warranty permissions, and related item/stock defaults.",
        ],
      },
      {
        label: "Improved",
        items: [
          "KOT item controls remain visible but disabled when tenant KOT is off, so users understand why KOT cannot be selected.",
          "Existing item KOT flags are not wiped when KOT is disabled; re-enabling KOT restores previous item eligibility.",
          "Item list KOT badges and KOT filters now follow the tenant KOT setting.",
          "Receipt Design keeps the KOT tab visible but disabled when KOT is turned off.",
          "Expenses now use configured expense types instead of only free-form category text.",
          "Dashboard and profit report expense totals now ignore expense types marked as recovered/non-profit-report costs.",
          "POS stock shortage confirmation now checks the current user's role permission before allowing an override.",
          "Warranty selection in POS follows App Configuration and role permissions.",
        ],
      },
      {
        label: "Changed",
        items: [
          "KOT availability is now tenant-level first and item-level second.",
          "Expense categories are now centrally managed as tenant settings.",
          "Stock override behavior is controlled by App Configuration instead of relying on a single fixed confirmation flow.",
          "Warranty availability is now part of App Configuration rather than only receipt/item setup.",
        ],
      },
      {
        label: "Fixed",
        items: [
          "Automatic KOT no longer appears after payment when KOT is disabled.",
          "Disabled KOT controls no longer allow frontend bypass to enable KOT on items.",
          "Backend item create and update now reject attempts to enable KOT while tenant KOT is disabled.",
          "Expense totals in profit-focused dashboard/report areas now exclude expense types configured outside profit reporting.",
          "Warranty rows in printed layouts now follow the saved receipt/invoice layout settings.",
          "Stock override permission defaults are migrated safely for existing tenants.",
        ],
      },
    ],
    flowMap: [
      {
        title: "Tenant KOT Control Flow",
        steps: [
          "Open App Configuration and enable or disable Kitchen Order Tickets.",
          "When disabled, item KOT checkboxes, import KOT selectors, receipt KOT design, and POS Print KOT stay visible but cannot be used.",
          "Takeaway checkout completes normally without opening the automatic KOT print popup.",
          "When KOT is enabled again, previously tagged KOT items become eligible without re-tagging.",
        ],
      },
      {
        title: "Expense Type Flow",
        steps: [
          "Open Expense Types from App Configuration and create tenant-specific expense names.",
          "Mark each type as included in profit reports or recovered/non-profit-report cost.",
          "Record expenses using active types only.",
          "Dashboard and profit reports count only the configured expense types that affect profit.",
        ],
      },
      {
        title: "Stock Override Flow",
        steps: [
          "Choose Block, Require Confirmation, or Always Allow from App Configuration.",
          "Select which roles can confirm shortage sales.",
          "During checkout, POS asks for confirmation only when the mode and role permit an override.",
          "Backend stock processing records override context for shortage sales.",
        ],
      },
      {
        title: "Warranty Permission Flow",
        steps: [
          "Enable or disable Sales Warranty from App Configuration.",
          "Choose which roles can add warranty coverage during checkout.",
          "POS hides or disables warranty selection when the current role is not allowed.",
          "Receipt and invoice layout settings control whether warranty details print.",
        ],
      },
    ],
  },
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
