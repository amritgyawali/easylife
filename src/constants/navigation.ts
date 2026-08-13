import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface NavItem {
  label: string;
  href: string;
  icon: IconName;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

/**
 * The app's information architecture, in one place.
 *
 * Twenty-one flat sidebar links was a wall of text you had to read top to
 * bottom to find anything. Grouping them by what the user is trying to do —
 * plan the day, manage money, handle paperwork — means each group is short
 * enough to scan, and the same grouping drives the mobile "More" menu, so the
 * two form factors teach each other rather than presenting different maps.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/', icon: 'grid-outline' },
      { label: 'Today', href: '/today', icon: 'today-outline' },
      { label: 'Calendar', href: '/calendar', icon: 'calendar-outline' },
    ],
  },
  {
    title: 'Plan',
    items: [
      { label: 'Tasks', href: '/tasks', icon: 'checkbox-outline' },
      { label: 'Habits', href: '/habits', icon: 'repeat-outline' },
      { label: 'Notes', href: '/notes', icon: 'document-text-outline' },
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
    ],
  },
  {
    title: 'Records',
    items: [
      { label: 'Documents', href: '/documents', icon: 'folder-outline' },
      { label: 'Reader', href: '/reader', icon: 'reader-outline' },
      { label: 'Scan', href: '/scan', icon: 'scan-outline' },
      { label: 'Imports', href: '/imports', icon: 'cloud-upload-outline' },
      { label: 'People', href: '/people', icon: 'people-outline' },
    ],
  },
];

/** Always reachable, pinned below the grouped sections. */
export const UTILITY_ITEMS: NavItem[] = [
  { label: 'Search', href: '/search', icon: 'search-outline' },
  { label: 'Settings', href: '/settings', icon: 'settings-outline' },
];

/**
 * Mobile bottom tab bar. Four destinations plus "More": five targets is what
 * fits on a 360px-wide phone without the labels truncating, and these four are
 * the screens opened many times a day. Everything else lives in "More", which
 * shows the same grouping as the desktop sidebar.
 */
export const MOBILE_TABS: NavItem[] = [
  { label: 'Home', href: '/', icon: 'home-outline' },
  { label: 'Today', href: '/today', icon: 'today-outline' },
  { label: 'Tasks', href: '/tasks', icon: 'checkbox-outline' },
  { label: 'Money', href: '/finance', icon: 'wallet-outline' },
];

const TAB_HREFS = new Set(MOBILE_TABS.map((item) => item.href));

/** Everything not on the mobile tab bar, grouped as in the sidebar. */
export const MORE_MENU_SECTIONS: NavSection[] = [
  ...NAV_SECTIONS.map((section) => ({
    title: section.title,
    items: section.items.filter((item) => !TAB_HREFS.has(item.href)),
  })).filter((section) => section.items.length > 0),
  { title: 'You', items: UTILITY_ITEMS },
];

/** Flat list of the overflow routes — used to light up the "More" tab. */
export const MORE_MENU_ITEMS: NavItem[] = MORE_MENU_SECTIONS.flatMap((section) => section.items);

/** Flat desktop sidebar list, for anything that needs every destination. */
export const SIDEBAR_ITEMS: NavItem[] = [
  ...NAV_SECTIONS.flatMap((section) => section.items),
  ...UTILITY_ITEMS,
];

/** Breakpoint at which the shell switches from mobile tabs to the desktop sidebar. */
export const DESKTOP_BREAKPOINT = 768;
