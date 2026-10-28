import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { PaperBlock, Polaroid, Postmark, Tape } from '@/components/scrapbook/Paper';
import { formatDayRange } from '@/lib/dates';
import type { TripStop } from '@/lib/trips/types';

// Page colours alternate like pages pulled from different notebooks.
const PAGES = ['#D5DCCC', '#CFD6D3', '#D8D3C3', '#E2D6C8'];

/**
 * One leg of a trip laid out as a scrapbook page: a torn paper backdrop, a
 * taped label with the place and dates, a postmark, and a polaroid of the
 * screenshot it came from. The interactive details (`children`) sit below on
 * a clean card so they stay easy to read and tap.
 */
export function ScrapbookPage({ stop, index, children }: { stop: TripStop; index: number; children: ReactNode }) {
  const page = PAGES[index % PAGES.length];
  const tilt = index % 2 === 0 ? -1.2 : 1;

  return (
    <View className="-mx-5">
      <PaperBlock color={page} seed={index * 13 + 5}>
        <View className="flex-row justify-between px-5 pb-4 pt-3">
          <View style={{ transform: [{ rotate: `${tilt}deg` }], maxWidth: '58%' }} className="bg-[#F4EFE3] px-3.5 pb-3 pt-2.5">
            <Tape width={58} rotate={-6} style={{ top: -10, left: 22 }} />
            <Text className="font-display text-[24px] leading-[28px] text-[#3B3A30]">{stop.place.name.toUpperCase()}</Text>
            <Text className="mt-1 font-mono text-[12px] text-[#5D5A4D]">{formatDayRange(stop.startDate, stop.nights).toUpperCase()}</Text>
            <Text numberOfLines={1} className="mt-1 font-sans-medium text-[11px] uppercase tracking-[1.2px] text-[#5D5A4D]">
              ⌖ {stop.place.region}
            </Text>
          </View>
          <View>
            <Polaroid uri={stop.sourceImageUri} rotate={-tilt * 2.5} caption={stop.scan?.sourcePlatform === 'tiktok' ? 'from TikTok' : undefined} />
            <Tape width={44} rotate={14} style={{ top: -8, right: 8 }} />
          </View>
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', left: 120, bottom: -6, transform: [{ rotate: '-12deg' }] }}>
          <Postmark text={stop.place.name} kind={stop.kind} />
        </View>
        <View className="px-4 pb-4">{children}</View>
      </PaperBlock>
    </View>
  );
}
