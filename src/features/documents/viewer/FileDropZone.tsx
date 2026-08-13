import type { PropsWithChildren } from 'react';
import { View } from 'react-native';

import type { PickedFile } from '@/features/documents/api';

export interface FileDropZoneProps extends PropsWithChildren {
  onFileDropped: (file: PickedFile) => void;
}

/**
 * Native build: there is nothing to drag a file from, so this is the plain
 * container. The camera and file pickers are the equivalent entry points.
 */
export function FileDropZone({ children }: FileDropZoneProps) {
  return <View style={{ flex: 1 }}>{children}</View>;
}
