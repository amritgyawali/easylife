import { useEffect, useState } from 'react';
import { Image, ScrollView, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';
import { Skeleton } from '@/components/ui/Skeleton';

export interface ImageDocumentViewProps {
  url: string;
  title: string;
  zoom: number;
  /** Degrees clockwise; only right angles are offered. */
  rotation: number;
}

interface NaturalSize {
  width: number;
  height: number;
}

/**
 * A photographed or scanned document.
 *
 * The image is laid out at its fitted size rather than stretched to the pane,
 * so a receipt photographed in portrait doesn't come out distorted, and
 * zooming past "fit" turns the pane into a scrollable canvas in both axes —
 * which is what makes small print on a scan readable.
 */
export function ImageDocumentView({ url, title, zoom, rotation }: ImageDocumentViewProps) {
  const [natural, setNatural] = useState<NaturalSize | null>(null);
  const [failed, setFailed] = useState(false);
  const [pane, setPane] = useState({ width: 0, height: 0 });

  useEffect(() => {
    let cancelled = false;

    setNatural(null);
    setFailed(false);

    Image.getSize(
      url,
      (width, height) => {
        if (!cancelled) setNatural({ width, height });
      },
      () => {
        if (!cancelled) setFailed(true);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (failed) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
        <ThemedText variant="body" tone="negative" style={{ textAlign: 'center' }}>
          This image could not be decoded. The file may be damaged, or in a format this device doesn&apos;t
          support.
        </ThemedText>
      </View>
    );
  }

  const quarterTurned = Math.abs(rotation % 180) === 90;

  // Fit against the *rotated* footprint, otherwise a landscape scan turned
  // upright is clipped by the pane it was measured against.
  const footprint = natural
    ? {
        width: quarterTurned ? natural.height : natural.width,
        height: quarterTurned ? natural.width : natural.height,
      }
    : null;

  const fit =
    footprint && pane.width > 0 && pane.height > 0
      ? Math.min(pane.width / footprint.width, pane.height / footprint.height)
      : 1;

  const displayed = natural
    ? { width: natural.width * fit * zoom, height: natural.height * fit * zoom }
    : { width: 0, height: 0 };

  // The wrapper takes the rotated bounding box so the scroll extents match
  // what is actually on screen.
  const boxWidth = quarterTurned ? displayed.height : displayed.width;
  const boxHeight = quarterTurned ? displayed.width : displayed.height;

  return (
    <View
      style={{ flex: 1 }}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setPane((current) =>
          current.width === width && current.height === height ? current : { width, height }
        );
      }}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        maximumZoomScale={3}
        minimumZoomScale={1}
      >
        <ScrollView
          horizontal
          contentContainerStyle={{
            flexGrow: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.md,
          }}
        >
          {natural ? (
            <View
              style={{ width: boxWidth, height: boxHeight, alignItems: 'center', justifyContent: 'center' }}
            >
              <Image
                accessibilityLabel={title}
                source={{ uri: url }}
                resizeMode="contain"
                style={{
                  width: displayed.width,
                  height: displayed.height,
                  transform: [{ rotate: `${rotation}deg` }],
                }}
              />
            </View>
          ) : (
            <Skeleton width={240} height={320} />
          )}
        </ScrollView>
      </ScrollView>
    </View>
  );
}
