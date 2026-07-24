import { createContext, useContext, type PropsWithChildren } from 'react';
import { useWindowDimensions } from 'react-native';

import { DESKTOP_BREAKPOINT } from '@/constants/navigation';

const CompactLayoutContext = createContext(false);

/**
 * Owns the single window-size subscription used by the responsive UI. This
 * avoids attaching a Dimensions subscriber for every text or card in a long
 * mobile list.
 */
export function CompactLayoutProvider({ children }: PropsWithChildren) {
  const { width } = useWindowDimensions();

  return (
    <CompactLayoutContext.Provider value={width < DESKTOP_BREAKPOINT}>
      {children}
    </CompactLayoutContext.Provider>
  );
}

/**
 * Shared narrow-layout switch used by the app shell and reusable UI pieces.
 * Keeping the breakpoint in one place prevents typography, cards, and screens
 * from changing density at slightly different widths.
 */
export function useCompactLayout(): boolean {
  return useContext(CompactLayoutContext);
}
