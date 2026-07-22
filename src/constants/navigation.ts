import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface NavItem {
  label: string;
  href: string;
  icon: IconName;
}

/** Mobile bottom tab bar (section 5: "Mobile navigation"). Exactly 5 items. */
export const MOBILE_TABS: NavItem[] = [
  { label: 'Today', href: '/today', icon: 'today-outline' },
  { label: 'Planner', href: '/tasks', icon: 'checkbox-outline' },
  { label: 'Money', href: '/finance', icon: 'wallet-outline' },
  { label: 'Notes', href: '/notes', icon: 'document-text-outline' },
  { label: 'Scan', href: '/scan', icon: 'scan-outline' },
];

/** Everything not on the mobile tab bar lives in the "More" menu. */
export const MORE_MENU_ITEMS: NavItem[] = [
  { label: 'Calendar', href: '/calendar', icon: 'calendar-outline' },
  { label: 'Habits', href: '/habits', icon: 'repeat-outline' },
  { label: 'Accounts', href: '/finance/accounts', icon: 'card-outline' },
  { label: 'People', href: '/people', icon: 'people-outline' },
  { label: 'Loans', href: '/loans', icon: 'swap-horizontal-outline' },
  { label: 'Investments', href: '/investments', icon: 'trending-up-outline' },
  { label: 'Budgets', href: '/finance/budgets', icon: 'pie-chart-outline' },
  { label: 'Goals', href: '/finance/goals', icon: 'flag-outline' },
  { label: 'Documents', href: '/documents', icon: 'folder-outline' },
  { label: 'Imports', href: '/imports', icon: 'cloud-upload-outline' },
  { label: 'Reports', href: '/reports', icon: 'bar-chart-outline' },
  { label: 'Settings', href: '/settings', icon: 'settings-outline' },
];

/** Desktop/web sidebar (section 5: "Desktop and web navigation"). */
export const SIDEBAR_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: 'grid-outline' },
  { label: 'Today', href: '/today', icon: 'today-outline' },
  { label: 'Calendar', href: '/calendar', icon: 'calendar-outline' },
  { label: 'Tasks', href: '/tasks', icon: 'checkbox-outline' },
  { label: 'Habits', href: '/habits', icon: 'repeat-outline' },
  { label: 'Notes', href: '/notes', icon: 'document-text-outline' },
  { label: 'Accounts', href: '/finance/accounts', icon: 'card-outline' },
  { label: 'Transactions', href: '/finance', icon: 'swap-vertical-outline' },
  { label: 'People', href: '/people', icon: 'people-outline' },
  { label: 'Loans', href: '/loans', icon: 'cash-outline' },
  { label: 'Investments', href: '/investments', icon: 'trending-up-outline' },
  { label: 'Budgets', href: '/finance/budgets', icon: 'pie-chart-outline' },
  { label: 'Goals', href: '/finance/goals', icon: 'flag-outline' },
  { label: 'Documents', href: '/documents', icon: 'folder-outline' },
  { label: 'Imports', href: '/imports', icon: 'cloud-upload-outline' },
  { label: 'Reports', href: '/reports', icon: 'bar-chart-outline' },
  { label: 'Settings', href: '/settings', icon: 'settings-outline' },
];

/** Breakpoint at which the shell switches from mobile tabs to the desktop sidebar. */
export const DESKTOP_BREAKPOINT = 768;
