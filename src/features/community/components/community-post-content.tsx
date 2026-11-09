import { View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { postBackgroundColor, usesTextPostBackground } from '@/src/features/community/post-background';

type Props = {
  title?: string | null;
  body: string;
  background?: string | null;
  imageCount?: number;
  numberOfLines?: number;
};

/** Long bodies get a "Xem thêm" hint when the feed clamps them. */
const CLAMP_HINT_LENGTH = 260;

export function CommunityPostContent({ title, body, background, imageCount = 0, numberOfLines }: Props) {
  if (usesTextPostBackground(background, imageCount)) {
    // Colour-card posts read like a poster: big, centred, rounded.
    return (
      <View className="mx-4 min-h-[168px] justify-center overflow-hidden rounded-2xl px-6 py-8" style={{ backgroundColor: postBackgroundColor(background) }}>
        {title ? <Text weight="extrabold" className="mb-2 text-center text-xl text-white">{title}</Text> : null}
        <Text numberOfLines={numberOfLines} weight="bold" className="text-center text-lg leading-7 text-white">{body}</Text>
      </View>
    );
  }

  return (
    <View className="px-4 pb-2">
      {title ? <Text weight="bold" className="pb-1 text-[17px] leading-6">{title}</Text> : null}
      <Text numberOfLines={numberOfLines} className="text-[15px] leading-6 text-ink">{body}</Text>
      {numberOfLines && body.length > CLAMP_HINT_LENGTH ? <Text weight="semibold" className="mt-1 text-sm text-accent-deep">Xem thêm</Text> : null}
    </View>
  );
}
