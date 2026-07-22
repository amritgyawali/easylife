import { useMemo } from 'react';

import { REGIONAL_DEFAULTS } from '@/constants/app';
import { useProfile } from '@/features/auth/useProfile';
import { todayInTimeZone, type IsoDate } from '@/utils/date';

export interface TodayContext {
  /** Today's calendar date in the user's configured timezone. */
  today: IsoDate;
  timeZone: string;
  /** 0 = Sunday. Drives week grouping on the habits and calendar screens. */
  weekStart: number;
}

/**
 * Resolves "today" against the user's saved timezone rather than the device's.
 *
 * Falls back to the regional default while preferences are still loading, so
 * screens can render immediately instead of flashing a spinner; the value
 * corrects itself once the query resolves. This matters in Nepal (UTC+05:45),
 * where the device and the configured zone can disagree about the date.
 */
export function useToday(): TodayContext {
  const { data } = useProfile();

  const timeZone = data?.preferences.timezone ?? REGIONAL_DEFAULTS.timezone;
  const weekStart = data?.preferences.week_start ?? REGIONAL_DEFAULTS.weekStart;

  // Recomputed whenever the timezone changes; a mounted screen crossing
  // midnight is refreshed by TanStack Query refetches rather than a timer.
  const today = useMemo(() => todayInTimeZone(timeZone), [timeZone]);

  return { today, timeZone, weekStart };
}
