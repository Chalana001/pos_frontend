import React from "react";

/**
 * Sidebar nav icon set — original line-art glyphs, one per top-level entry.
 *
 * Why custom instead of the lucide defaults: recognition by shape, and a single
 * consistent hand so the rail does not read as an off-the-shelf icon dump.
 * Every glyph is stroke-only line art on a 24x24 grid, stroke = currentColor, so
 * the icon inherits whatever colour the nav item's text token resolves to — the
 * set flips light/dark with the rest of the sidebar with no extra code.
 *
 * Conventions (match MechanicPicker.jsx):
 *   - strokeWidth 1.6, round caps and joins
 *   - paths default to fill="none"; only deliberate dots use fill="currentColor"
 *   - aria-hidden, colour comes from className, never hardcoded
 */

const Svg = ({ size = 20, className, children }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const DashboardIcon = (props) => (
  <Svg {...props}>
    <rect x="3.5" y="3.5" width="7" height="9" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="5" rx="1.5" />
    <rect x="13.5" y="11.5" width="7" height="9" rx="1.5" />
    <rect x="3.5" y="15.5" width="7" height="5" rx="1.5" />
  </Svg>
);

export const PosIcon = (props) => (
  <Svg {...props}>
    <path d="M4 5.5h13.5a1 1 0 0 1 1 1V16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1z" />
    <path d="M7 9h8" />
    <path d="M7 12.5h5" />
    <path d="M9 20.5h6" />
    <path d="M12 17v-3.5" />
  </Svg>
);

export const SalesIcon = (props) => (
  <Svg {...props}>
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <path d="M3 10h18" />
    <path d="M6.5 14.5h4" />
  </Svg>
);

export const PromotionsIcon = (props) => (
  <Svg {...props}>
    <path d="M4 4h6.5L20 13.5a1.6 1.6 0 0 1 0 2.3l-4.2 4.2a1.6 1.6 0 0 1-2.3 0L4 10.5V4z" />
    <circle cx="8.5" cy="8.5" r="1.4" />
  </Svg>
);

export const LoyaltyIcon = (props) => (
  <Svg {...props}>
    <path d="M12 3.8l1.9 4.1 4.5.5-3.4 3 .9 4.4-3.9-2.2-3.9 2.2.9-4.4-3-3 4.5-.5L12 3.8z" />
  </Svg>
);

export const ItemsIcon = (props) => (
  <Svg {...props}>
    <path d="M12 3.5l7.5 4v9L12 20.5 4.5 16.5v-9L12 3.5z" />
    <path d="M4.5 7.5L12 11.5l7.5-4" />
    <path d="M12 11.5v9" />
  </Svg>
);

export const CustomersIcon = (props) => (
  <Svg {...props}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 19.5c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5" />
    <path d="M15.5 8.5a2.8 2.8 0 1 1 1.5 5.2" />
    <path d="M17.5 15.5c1.7.4 2.8 1.7 3.1 4" />
  </Svg>
);

export const WarrantiesIcon = (props) => (
  <Svg {...props}>
    <path d="M12 3l6.5 2.7v5.1c0 4.3-2.7 7.4-6.5 9.2-3.8-1.6-6.5-4.7-6.5-9.2V5.7L12 3z" />
    <path d="M8.8 11.8l2.2 2.2 4.2-4.2" />
  </Svg>
);

export const SuppliersIcon = (props) => (
  <Svg {...props}>
    <path d="M3 7h10.5v8.5H3z" />
    <path d="M13.5 10.5h3.8l3.2 3.2v1.8h-7" />
    <circle cx="7" cy="17.5" r="1.8" />
    <circle cx="16.8" cy="17.5" r="1.8" />
  </Svg>
);

export const ShiftsIcon = (props) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 7v5.2l3.4 2" />
  </Svg>
);

export const ExpensesIcon = (props) => (
  <Svg {...props}>
    <ellipse cx="9" cy="7" rx="5" ry="2.6" />
    <path d="M4 7v4.5c0 1.4 2.2 2.6 5 2.6" />
    <path d="M4 11.5V16c0 1.4 2.2 2.6 5 2.6" />
    <path d="M14 12.6c1.2.5 2 1.3 2 2.4" />
    <path d="M14 17c1.2.5 2 1.3 2 2.4" />
    <path d="M16 12.6c1.2-.5 2-1.3 2-2.4" />
  </Svg>
);

export const CashDropsIcon = (props) => (
  <Svg {...props}>
    <path d="M4 4h16v4.5H4z" />
    <path d="M12 8.5V15" />
    <path d="M8.5 12.5L12 16l3.5-3.5" />
    <path d="M5 19.5h14" />
  </Svg>
);

export const StockIcon = (props) => (
  <Svg {...props}>
    <path d="M4 20V9.5L12 4l8 5.5V20" />
    <path d="M4 20h16" />
    <path d="M9 20v-5h6v5" />
  </Svg>
);

export const PurchaseIcon = (props) => (
  <Svg {...props}>
    <path d="M12 3.5l7.5 4v9L12 20.5 4.5 16.5v-9L12 3.5z" />
    <path d="M4.5 7.5L12 11.5l7.5-4" />
    <path d="M12 11.5v9" />
    <path d="M9 6.5l3-1.6 3 1.6" />
  </Svg>
);

export const ReportsIcon = (props) => (
  <Svg {...props}>
    <path d="M4 20h16" />
    <path d="M7 20v-6" />
    <path d="M12 20V9" />
    <path d="M17 20v-9" />
    <path d="M6.5 8.5L11 5l3 2.5 4.5-4" />
  </Svg>
);

export const ConfigurationIcon = (props) => (
  <Svg {...props}>
    <path d="M5 7h7" />
    <circle cx="15" cy="7" r="2.2" />
    <path d="M17.2 7H20" />
    <path d="M4 12h3" />
    <circle cx="10" cy="12" r="2.2" />
    <path d="M12.2 12H20" />
    <path d="M5 17h9" />
    <circle cx="17" cy="17" r="2.2" />
    <path d="M19.2 17H20" />
  </Svg>
);
