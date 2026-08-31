/* The sidebar switches behaviour at two widths, and they have to be the same
   widths the CSS uses - that mismatch was the bug. Sidebar.jsx pins the panel
   with `lg:translate-x-0`, so from 1024px up the drawer's open/close state
   cannot move it at all; only its width can change. The JS was still testing
   1280px, so between the two a cashier on a laptop got a full 256px column and
   a close button that did nothing when pressed.
 
   Below lg the sidebar is an overlay drawer and translate-x drives it.
   From xl up there is room for the full column.
   Between them the 72px rail is the only thing that fits, so that is the
   default there - the nav stays reachable and the POS grid gets the width. */

export const SIDEBAR_INLINE_MIN = 1024; // Tailwind lg - sidebar joins the flow
export const SIDEBAR_FULL_MIN = 1280;   // Tailwind xl - room for the full column

/* True once the panel is in the flow, where only its width can change. */
export const isSidebarInline = () => window.innerWidth >= SIDEBAR_INLINE_MIN;

/* The band where the rail fits but the full column does not. */
export const prefersCollapsedSidebar = () =>
  window.innerWidth >= SIDEBAR_INLINE_MIN && window.innerWidth < SIDEBAR_FULL_MIN;
