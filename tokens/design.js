// ── Design Tokens — Luxury Grooming Suite ─────────────────────────────────────
export const C = {
  surface: "#fcf9f8",
  surfaceDim: "#dcd9d9",
  surfaceLow: "#f6f3f2",
  surfaceContainer: "#f0eded",
  surfaceHigh: "#eae7e7",
  surfaceHighest: "#e4e2e1",
  surfaceLowest: "#ffffff",
  primary: "#000000",
  onPrimary: "#ffffff",
  primaryContainer: "#1c1b1b",
  onPrimaryContainer: "#858383",
  secondary: "#735c00",
  secondaryContainer: "#fed65b",
  onSecondary: "#ffffff",
  onSurface: "#1b1c1c",
  onSurfaceVariant: "#444748",
  outline: "#747878",
  outlineVariant: "#c4c7c7",
  error: "#ba1a1a",
  errorContainer: "#ffdad6",
  inverseSurface: "#303030",
  inverseOnSurface: "#f3f0f0",
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
  dashboard:  { title: "Dashboard",  subtitle: "Welcome back, Managing Director"                   },
  stylists:   { title: "Stylists",   subtitle: "Manage your team"                                  },
  clients:    { title: "Clients",    subtitle: "Your client records and history"                    },
  inventory:  { title: "Inventory",  subtitle: "Curate and monitor your premium grooming supplies"  },
  sales:      { title: "Sales",      subtitle: "Track revenue and transactions"                     },
  reports:    { title: "Reports",    subtitle: "Fiscal Year 2024 Performance Overview"              },
  settings:   { title: "Settings",   subtitle: "System configuration"                              },
};