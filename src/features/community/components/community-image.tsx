import { ImageOff, X } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Modal, Pressable, View, type ImageProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

type CommunityImageProps = Pick<ImageProps, 'className' | 'resizeMode' | 'style'> & {
  uri?: string | null;
  label?: string;
  preview?: boolean;
};

export function CommunityImage({ uri, label = 'Ảnh không tải được', className, resizeMode = 'cover', style, preview = false }: CommunityImageProps) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const insets = useSafeAreaInsets();
  if (!uri || failedUri === uri) {
    return <View className={`items-center justify-center bg-tint ${className ?? ''}`} style={style}>
      <ImageOff size={22} color={colors.muted} />
      <Text className="mt-1 text-xs text-muted">{label}</Text>
    </View>;
  }
  return <>
    {preview ? <Pressable className={className} style={style} onPress={() => setViewerOpen(true)} accessibilityRole="button" accessibilityLabel="Xem ảnh toàn màn hình">
      <Image source={{ uri }} resizeMode={resizeMode} className="h-full w-full" onError={() => setFailedUri(uri)} accessibilityLabel={label} />
    </Pressable> : <Image source={{ uri }} resizeMode={resizeMode} className={className} style={style} onError={() => setFailedUri(uri)} accessibilityLabel={label} />}
    {preview ? <Modal visible={viewerOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setViewerOpen(false)}>
      <View className="flex-1 items-center justify-center bg-black">
        <Pressable onPress={() => setViewerOpen(false)} className="absolute right-5 z-10 h-11 w-11 items-center justify-center rounded-full bg-[#202329]" style={{ top: insets.top + 12 }} accessibilityRole="button" accessibilityLabel="Đóng ảnh toàn màn hình">
          <X size={24} color="white" />
        </Pressable>
        <Pressable className="h-full w-full items-center justify-center" onPress={() => setViewerOpen(false)} accessibilityRole="button" accessibilityLabel="Đóng ảnh">
          <Image source={{ uri }} resizeMode="contain" style={{ width: '100%', height: '100%' }} accessibilityLabel={label} />
        </Pressable>
      </View>
    </Modal> : null}
  </>;
}

export function CommunityAvatar({ uri, name, size = 44 }: { uri?: string | null; name?: string | null; size?: number }) {
  const initial = name?.trim().slice(0, 1).toLocaleUpperCase() || 'H';
  const [failedUri, setFailedUri] = useState<string | null>(null);
  return <View className="items-center justify-center overflow-hidden rounded-full border border-line bg-accent-soft" style={{ width: size, height: size }}>
    {uri && failedUri !== uri ? <Image source={{ uri }} resizeMode="cover" style={{ width: size, height: size }} onError={() => setFailedUri(uri)} accessibilityLabel={`Ảnh đại diện ${name ?? ''}`} /> : <Text weight="bold" className="text-accent">{initial}</Text>}
  </View>;
}
