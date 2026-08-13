import { activeNavHref, MOBILE_TABS, MORE_MENU_ITEMS, NAV_SECTIONS } from '@/constants/navigation';

describe('activeNavHref', () => {
  it('matches a destination exactly', () => {
    expect(activeNavHref('/tasks')).toBe('/tasks');
    expect(activeNavHref('/settings')).toBe('/settings');
  });

  it('treats the dashboard as active only at the root', () => {
    expect(activeNavHref('/')).toBe('/');
    expect(activeNavHref('/tasks')).not.toBe('/');
  });

  it('picks the most specific destination, not the first prefix', () => {
    // Both "Transactions" (/finance) and "Accounts" (/finance/accounts) are
    // prefixes here; lighting up both is the bug this exists to prevent.
    expect(activeNavHref('/finance/accounts')).toBe('/finance/accounts');
    expect(activeNavHref('/finance/budgets')).toBe('/finance/budgets');
    expect(activeNavHref('/finance')).toBe('/finance');
  });

  it('keeps a parent destination active for its own sub-routes', () => {
    expect(activeNavHref('/imports/abc-123')).toBe('/imports');
  });

  it('does not match a destination that is only a string prefix', () => {
    expect(activeNavHref('/tasks-archive')).toBeNull();
  });

  it('returns null for a route outside the navigation', () => {
    expect(activeNavHref('/onboarding')).toBeNull();
  });

  it('reaches every destination from either the tab bar or the More menu', () => {
    const reachable = new Set([...MOBILE_TABS, ...MORE_MENU_ITEMS].map((item) => item.href));

    for (const section of NAV_SECTIONS) {
      for (const item of section.items) {
        expect(reachable.has(item.href)).toBe(true);
      }
    }
  });
});
