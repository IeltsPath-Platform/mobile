import { ImageOff } from 'lucide-react-native';
import { useState } from 'react';
import { Image, View, type ImageProps } from 'react-native';
import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

type CommunityImageProps = Pick<ImageProps, 'className' | 'resizeMode' | 'style'> & {
  uri?: string | null;
  label?: string;
};

export function CommunityImage({ uri, label = 'Ảnh không tải được', className, resizeMode = 'cover', style }: CommunityImageProps) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  if (!uri || failedUri === uri) {
    return <View className={`items-center justify-center bg-tint ${className ?? ''}`} style={style}>
      <ImageOff size={22} color={colors.muted} />
      <Text className="mt-1 text-xs text-muted">{label}</Text>
    </View>;
  }
  return <Image source={{ uri }} resizeMode={resizeMode} className={className} style={style} onError={() => setFailedUri(uri)} accessibilityLabel={label} />;
}

export function CommunityAvatar({ uri, name, size = 44 }: { uri?: string | null; name?: string | null; size?: number }) {
  const initial = name?.trim().slice(0, 1).toLocaleUpperCase() || 'H';
  const [failedUri, setFailedUri] = useState<string | null>(null);
  return <View className="items-center justify-center overflow-hidden rounded-full border border-line bg-accent-soft" style={{ width: size, height: size }}>
    {uri && failedUri !== uri ? <Image source={{ uri }} resizeMode="cover" style={{ width: size, height: size }} onError={() => setFailedUri(uri)} accessibilityLabel={`Ảnh đại diện ${name ?? ''}`} /> : <Text weight="bold" className="text-accent">{initial}</Text>}
  </View>;
}
