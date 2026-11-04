import { Volume2, VolumeX } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable } from 'react-native';

import { useAppSettings } from '@/src/features/settings/use-app-settings';
import { haptics } from '@/src/lib/haptics';
import { sound } from '@/src/lib/sound';
import { colors } from '@/src/theme';

/** Header button for study screens: mutes / unmutes every sound (effects, voice, music) at once. */
export function SoundToggle() {
  const { settings, update } = useAppSettings();
  const on = settings.soundEnabled || settings.musicEnabled;
  const Icon = on ? Volume2 : VolumeX;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={on ? 'Tắt âm thanh' : 'Bật âm thanh'}
      accessibilityState={{ selected: on }}
      hitSlop={6}
      onPress={() => { haptics.tap(); void update({ soundEnabled: !on, musicEnabled: !on }); }}
      className="h-11 w-11 items-center justify-center rounded-full active:opacity-70"
      style={{ backgroundColor: on ? colors.accentSoft : colors.surfaceTint }}>
      <Icon size={19} color={on ? colors.accentDeep : colors.muted} />
    </Pressable>
  );
}

/** Plays the calm study loop for as long as the calling screen is mounted. */
export function useStudyMusic(active = true) {
  useEffect(() => {
    if (!active) return;
    void sound.startMusic();
    return () => sound.stopMusic();
  }, [active]);
}
