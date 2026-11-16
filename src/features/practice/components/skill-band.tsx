import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/src/components/ui/text';

type SkillBandProps = {
  /** Background colour, normally the skill colour. */
  color: string;
  title: string;
  subtitle?: string;
  /** Shown at the right of the title row (e.g. the skill icon). */
  right?: ReactNode;
  onBack?: () => void;
  fallbackHref?: string;
  /** Content inside the band under the title (part chips, score...). */
  children?: ReactNode;
};

/** Coloured top band of the practice screens: runs under the status bar, back button, title, and room for a hero below. */
export function SkillBand({ color, title, subtitle, right, onBack, fallbackHref = '/(tabs)', children }: SkillBandProps) {
  const insets = useSafeAreaInsets();
  const back = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace(fallbackHref as never)));
  return (
    <View style={{ backgroundColor: color, paddingTop: insets.top + 6, paddingBottom: 16, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' }}>
      <View pointerEvents="none" style={{ position: 'absolute', right: -50, top: -30, width: 180, height: 180, borderRadius: 90, backgroundColor: '#ffffff', opacity: 0.12 }} />
      <View pointerEvents="none" style={{ position: 'absolute', right: 70, bottom: -60, width: 120, height: 120, borderRadius: 60, backgroundColor: '#ffffff', opacity: 0.08 }} />
      <View className="flex-row items-center gap-3 px-4">
        <Pressable onPress={back} accessibilityRole="button" accessibilityLabel="Quay lại" hitSlop={6} className="h-11 w-11 items-center justify-center rounded-full active:opacity-70" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
          <ArrowLeft size={20} color="#ffffff" strokeWidth={2.4} />
        </Pressable>
        <View className="min-w-0 flex-1">
          <Text accessibilityRole="header" weight="black" className="text-xl" style={{ color: '#ffffff' }} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text className="text-xs" style={{ color: 'rgba(255,255,255,0.85)' }} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

/** A big score inside the band: label, value, optional formula, a comment and extra chips. */
export function BandScore({ label, value, formula, comment, extra }: { label: string; value: string; formula?: string; comment?: string; extra?: ReactNode }) {
  return (
    <View className="mt-4 px-5">
      <Text weight="bold" className="text-[11px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.85)' }}>{label}</Text>
      <Text weight="black" style={{ color: '#ffffff', fontSize: 56, lineHeight: 62 }}>{value}</Text>
      {formula ? <Text className="text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>{formula}</Text> : null}
      {comment ? <Text className="mt-1.5 text-sm leading-5" style={{ color: '#ffffff' }}>{comment}</Text> : null}
      {extra}
    </View>
  );
}

/** White rounded square with an icon, for the right slot of the band. */
export function BandIcon({ children }: { children: ReactNode }) {
  return <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: '#ffffff' }}>{children}</View>;
}
