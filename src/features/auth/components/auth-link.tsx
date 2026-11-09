import { Link, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Text } from '@/src/components/ui/text';

type AuthLinkProps = {
  prompt?: string;
  label: string;
  href: Href;
  replace?: boolean;
};

export function AuthLink({ prompt, label, href, replace = true }: AuthLinkProps) {
  return (
    <View className="flex-row flex-wrap items-center justify-center gap-1">
      {prompt ? <Text className="text-sm text-muted">{prompt}</Text> : null}
      <Link href={href} replace={replace} asChild>
        <Pressable accessibilityRole="link" hitSlop={10}>
          <Text weight="bold" className="text-sm text-accent-deep">
            {label}
          </Text>
        </Pressable>
      </Link>
    </View>
  );
}
