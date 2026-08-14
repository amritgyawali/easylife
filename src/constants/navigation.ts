import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface NavItem {
  label: string;
  href: string;
  icon: IconName;
}

export interface NavGroup {
  /** Section heading in the sidebar and the More menu. */
  title: string;
  items: NavItem[];
}

/**
 * Mobile bottom tab bar (section 5: "Mobile navigation"). "Home" is the
 * dashboard (`/`, `DashboardScreen`) — the cross-life overview with a summary
 * from every module — and is deliberately first so it's both the default
 * landing screen and the first, always-visible way back to it.
 *
 * Five tabs plus "More" is the ceiling: past that, targets fall below the
 * 44pt minimum on a 360px phone.
 */
export const MOBILE_TABS: NavItem[] = [
  { label: 'Home', href: '/', icon: 'home-outline' },
  { label: 'Today', href: '/today', icon: 'today-outline' },
  { label: 'Planner', href: '/tasks', icon: 'checkbox-outline' },
  { label: 'Money', href: '/finance', icon: 'wallet-outline' },
  { label: 'Notes', href: '/notes', icon: 'document-text-outline' },
];

/**
 * The app's information architecture, in one place.
 *
 * Both the desktop sidebar and the mobile "More" sheet render from these
 * groups, so a screen added to a section shows up in both without anyone
 * remembering to update two lists — and the grouping itself is what makes a
 * 21-item navigation scannable rather than an undifferentiated column.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/', icon: 'grid-outline' },
      { label: 'Today', href: '/today', icon: 'today-outline' },
      { label: 'Calendar', href: '/calendar', icon: 'calendar-outline' },
      { label: 'Search', href: '/search', icon: 'search-outline' },
    ],
  },
  {
    title: 'Plan',
    items: [
      { label: 'Tasks', href: '/tasks', icon: 'checkbox-outline' },
      { label: 'Habits', href: '/habits', icon: 'repeat-outline' },
      { label: 'Notes', href: '/notes', icon: 'document-text-outline' },
      { label: 'People', href: '/people', icon: 'people-outline' },
    ],
  },
  {
    title: 'Money',
    items: [
      { label: 'Transactions', href: '/finance', icon: 'swap-vertical-outline' },
      { label: 'Accounts', href: '/finance/accounts', icon: 'card-outline' },
      { label: 'Budgets', href: '/finance/budgets', icon: 'pie-chart-outline' },
      { label: 'Goals', href: '/finance/goals', icon: 'flag-outline' },
      { label: 'Loans', href: '/loans', icon: 'cash-outline' },
      { label: 'Investments', href: '/investments', icon: 'trending-up-outline' },
      { label: 'Reports', href: '/reports', icon: 'bar-chart-outline' },
      { label: 'Categories', href: '/finance/categories', icon: 'pricetags-outline' },
      { label: 'Exchange rates', href: '/finance/rates', icon: 'swap-horizontal-outline' },
      { label: 'Imports', href: '/imports', icon: 'cloud-upload-outline' },
    ],
  },
  {
    title: 'Library',
    items: [
      { label: 'Documents', href: '/documents', icon: 'folder-outline' },
      { label: 'Reader', href: '/reader', icon: 'reader-outline' },
      { label: 'Scan', href: '/scan', icon: 'scan-outline' },
    ],
  },
  {
    title: 'System',
    items: [{ label: 'Settings', href: '/settings', icon: 'settings-outline' }],
  },
];

/** Flat view of {@link NAV_GROUPS}, for lookups by href. */
export const SIDEBAR_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

const TAB_HREFS = new Set(MOBILE_TABS.map((item) => item.href));

/**
 * Everything not already on the mobile tab bar, still grouped. Derived rather
 * than hand-maintained so a new screen can never be reachable on desktop but
 * orphaned on a phone.
 */
export const MORE_MENU_GROUPS: NavGroup[] = NAV_GROUPS.map((group) => ({
  title: group.title,
  items: group.items.filter((item) => !TAB_HREFS.has(item.href)),
})).filter((group) => group.items.length > 0);

/** Flat view of {@link MORE_MENU_GROUPS}, used to highlight the "More" tab. */
export const MORE_MENU_ITEMS: NavItem[] = MORE_MENU_GROUPS.flatMap((group) => group.items);

/** Breakpoint at which the shell switches from mobile tabs to the desktop sidebar. */
export const DESKTOP_BREAKPOINT = 768;
