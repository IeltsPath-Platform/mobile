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

export function CommunityPostContent({ title, body, background, imageCount = 0, numberOfLines }: Props) {
  if (usesTextPostBackground(background, imageCount)) {
    return (
      <View className="px-4 py-4" style={{ backgroundColor: postBackgroundColor(background) }}>
        {title ? <Text weight="bold" className="mb-1 text-base text-white">{title}</Text> : null}
        <Text numberOfLines={numberOfLines} className="text-sm leading-6 text-white">{body}</Text>
      </View>
    );
  }

  return (
    <View className="px-4 pb-3">
      {title ? <Text weight="bold" className="pb-1 text-base">{title}</Text> : null}
      <Text numberOfLines={numberOfLines} className="text-sm leading-6 text-ink">{body}</Text>
    </View>
  );
}
