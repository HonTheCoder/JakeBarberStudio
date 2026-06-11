// ── Design Tokens — Luxury Grooming Suite ─────────────────────────────────────
// Values are CSS custom properties so dark-mode overrides cascade into
// every inline style that references C.* across all pages.
export const C = {
  surface:            "var(--c-surface)",
  surfaceDim:         "var(--c-surface-dim)",
  surfaceLow:         "var(--c-surface-low)",
  surfaceContainer:   "var(--c-surface-container)",
  surfaceHigh:        "var(--c-surface-high)",
  surfaceHighest:     "var(--c-surface-highest)",
  surfaceLowest:      "var(--c-surface-lowest)",
  primary:            "var(--c-primary)",
  onPrimary:          "var(--c-on-primary)",
  primaryContainer:   "var(--c-primary-container)",
  onPrimaryContainer: "var(--c-on-primary-container)",
  secondary:          "var(--c-secondary)",
  secondaryContainer: "var(--c-secondary-container)",
  onSecondary:        "var(--c-on-secondary)",
  onSurface:          "var(--c-on-surface)",
  onSurfaceVariant:   "var(--c-on-surface-variant)",
  outline:            "var(--c-outline)",
  outlineVariant:     "var(--c-outline-variant)",
  error:              "var(--c-error)",
  errorContainer:     "var(--c-error-container)",
  inverseSurface:     "var(--c-inverse-surface)",
  inverseOnSurface:   "var(--c-inverse-on-surface)",
};

// All nav items — each has an optional `roles` array.
// If `roles` is absent the item is visible to everyone.
// "barber" can only see items explicitly listed in their allowed roles.
const ALL_NAV_ITEMS = [
  { id: "dashboard",  label: "Dashboard",  icon: "dashboard",    roles: ["admin", "barber"] },
  { id: "stylists",   label: "Stylists",   icon: "content_cut",  roles: ["admin", "barber"] },
  { id: "clients",    label: "Clients",    icon: "group",        roles: ["admin", "barber"] },
  { id: "inventory",  label: "Inventory",  icon: "inventory_2",  roles: ["admin"] },
  { id: "sales",      label: "Sales",      icon: "payments",     roles: ["admin"] },
  { id: "reports",    label: "Reports",    icon: "analytics",    roles: ["admin"] },
  { id: "settings",   label: "Settings",   icon: "settings",     roles: ["admin"] },
];

/**
 * Returns nav items visible for the given role.
 * @param {"admin"|"barber"|null} role
 */
export const getNavItems = (role) =>
  ALL_NAV_ITEMS.filter(item =>
    !item.roles || item.roles.includes(role ?? "barber")
  );

// Keep a full list for page meta lookups (no filtering needed there)
export const navItems = ALL_NAV_ITEMS;

export const pageMeta = {
  dashboard:  { title: "Dashboard",  subtitle: ""                                                   },
  stylists:   { title: "Stylists",   subtitle: "Manage your team"                                  },
  clients:    { title: "Clients",    subtitle: "Your client records and history"                    },
  inventory:  { title: "Inventory",  subtitle: "Curate and monitor your premium grooming supplies"  },
  sales:      { title: "Sales",      subtitle: "Track revenue and transactions"                     },
  reports:    { title: "Reports",    get subtitle() { return `Fiscal Year ${new Date().getFullYear()} Performance Overview`; } },
  settings:   { title: "Settings",   subtitle: "System configuration"                              },
};