import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, type AudioPlayer } from 'expo-audio';
import { Headphones, Pause, Play, RotateCcw, RotateCw, RefreshCw, Volume1, Volume2, VolumeX } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, AppState, PanResponder, Pressable, View, type LayoutChangeEvent } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

import { formatClock } from '../model/clock';
import { skillInk } from '../model/skill-meta';

const RATES = [0.75, 1, 1.25, 1.5] as const;
const VOLUMES = [1, 0.75, 0.5, 0.25] as const;

/** Plays through the silent switch and keeps playing with the screen locked, like a media app. */
export function usePlaybackAudioMode() {
  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix', allowsRecording: false }).catch(() => undefined);
  }, []);
}

/**
 * The audio address a player was opened with. The attempt is reloaded when the app comes back to the foreground (after a
 * phone call, for one) and a signed address then comes back with a new signature; following it would load the recording
 * again from the start. A player keeps the address it began with for as long as it is shown.
 */
function useFirstSource(src: string) {
  const [first] = useState(src);
  return first;
}

/**
 * Loads the recording again from the latest address (a signed link comes back fresh when the attempt is reloaded) and
 * carries on from the second where it stopped, so a dropped connection never leaves the learner without the audio.
 */
function useRetryPlayback(player: AudioPlayer, src: string, currentTime: number) {
  const lastTime = useRef(0);
  useEffect(() => { if (currentTime > 0) lastTime.current = currentTime; }, [currentTime]);
  return useCallback(() => {
    player.replace(src);
    if (lastTime.current > 0) void player.seekTo(lastTime.current).catch(() => undefined);
    player.play();
  }, [player, src]);
}

function RetryButton({ onPress, label = 'Thử lại' }: { onPress: () => void; label?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Thử phát lại bài nghe" className="min-h-11 flex-row items-center gap-1.5 rounded-full px-4" style={{ backgroundColor: tint() }}>
      <RefreshCw size={14} color="#ffffff" />
      <Text weight="black" style={{ color: '#ffffff' }}>{label}</Text>
    </Pressable>
  );
}

/**
 * The practice player of one section: play/pause, jump 5 s, a seek bar to drag or tap, speed and volume.
 * Reports `onPlayingChange` so study time counts while audio plays.
 */
export function PracticePlayer({ src, durationHint, onPlayingChange, compact = false, label }: { src: string; durationHint: number | null; onPlayingChange?: (playing: boolean) => void; compact?: boolean; label?: string }) {
  usePlaybackAudioMode();
  const player = useAudioPlayer(useFirstSource(src), { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const [rateIndex, setRateIndex] = useState(1);
  const [volumeIndex, setVolumeIndex] = useState(0);
  const duration = status.duration || durationHint || 0;
  const retry = useRetryPlayback(player, src, status.currentTime);

  useEffect(() => { onPlayingChange?.(status.playing); }, [status.playing, onPlayingChange]);
  useEffect(() => () => { onPlayingChange?.(false); }, [onPlayingChange]);
  useEffect(() => { player.volume = VOLUMES[volumeIndex]; }, [player, volumeIndex]);
  useEffect(() => { player.shouldCorrectPitch = true; player.setPlaybackRate(RATES[rateIndex]); }, [player, rateIndex]);
  useEffect(() => { if (status.didJustFinish) void player.seekTo(0); }, [status.didJustFinish, player]);

  const toggle = () => { if (status.playing) player.pause(); else player.play(); };
  const seek = (seconds: number) => { void player.seekTo(Math.max(0, Math.min(duration || seconds, seconds))); };
  const VolumeIcon = volumeIndex === 0 ? Volume2 : volumeIndex === VOLUMES.length - 1 ? VolumeX : Volume1;

  if (status.error) {
    return (
      <PlayerCard compact={compact}>
        <View className="flex-row items-center gap-3">
          <Text className="min-w-0 flex-1 text-sm text-danger">Không phát được bài nghe. Kiểm tra mạng rồi thử lại.</Text>
          <RetryButton onPress={() => { try { retry(); } catch { /* the error stays on screen */ } }} />
        </View>
      </PlayerCard>
    );
  }

  return (
    <PlayerCard compact={compact}>
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: `${tint()}1f` }}>
          <Headphones size={20} color={skillInk('listening')} />
        </View>
        <View className="min-w-0 flex-1">
          <Text weight="black" numberOfLines={1} className="text-sm text-ink">{label ?? 'Bài nghe'}</Text>
          <Text weight="bold" className="text-xs text-muted" style={{ fontVariant: ['tabular-nums'] }}>{formatClock(status.currentTime)} / {formatClock(duration)}</Text>
        </View>
        <Pressable onPress={() => setVolumeIndex((index) => (index + 1) % VOLUMES.length)} accessibilityRole="button" accessibilityLabel={`Âm lượng ${Math.round(VOLUMES[volumeIndex] * 100)}%`} hitSlop={6} className="h-9 w-9 items-center justify-center rounded-full bg-canvas active:opacity-70">
          <VolumeIcon size={18} color={colors.ink} />
        </Pressable>
        <Pressable onPress={() => setRateIndex((index) => (index + 1) % RATES.length)} accessibilityRole="button" accessibilityLabel={`Tốc độ ${RATES[rateIndex]}x, chạm để đổi`} hitSlop={6} className="h-9 min-w-[52px] items-center justify-center rounded-full px-2 active:opacity-70" style={{ backgroundColor: RATES[rateIndex] === 1 ? colors.canvas : tint() }}>
          <Text weight="black" className="text-xs" style={{ color: RATES[rateIndex] === 1 ? colors.ink : '#ffffff' }}>{RATES[rateIndex]}x</Text>
        </Pressable>
      </View>
      <View className="mt-2"><SeekBar current={status.currentTime} duration={duration} onSeek={seek} /></View>
      <View className="mt-1 flex-row items-center justify-center gap-6">
        <Pressable onPress={() => seek(status.currentTime - 5)} accessibilityRole="button" accessibilityLabel="Tua lại 5 giây" hitSlop={6} className="h-11 w-11 items-center justify-center rounded-full active:opacity-60">
          <RotateCcw size={24} color={colors.ink} />
          <Text weight="black" style={{ position: 'absolute', fontSize: 8, color: colors.ink }}>5</Text>
        </Pressable>
        <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel={status.playing ? 'Tạm dừng' : 'Phát'} className="h-14 w-14 items-center justify-center rounded-full active:opacity-80" style={{ backgroundColor: tint(), borderBottomWidth: 3, borderBottomColor: 'rgba(0,0,0,0.25)' }}>
          {status.isBuffering && !status.isLoaded ? <ActivityIndicator color="#ffffff" /> : status.playing ? <Pause size={24} color="#ffffff" fill="#ffffff" /> : <Play size={24} color="#ffffff" fill="#ffffff" style={{ marginLeft: 3 }} />}
        </Pressable>
        <Pressable onPress={() => seek(status.currentTime + 5)} accessibilityRole="button" accessibilityLabel="Tua tới 5 giây" hitSlop={6} className="h-11 w-11 items-center justify-center rounded-full active:opacity-60">
          <RotateCw size={24} color={colors.ink} />
          <Text weight="black" style={{ position: 'absolute', fontSize: 8, color: colors.ink }}>5</Text>
        </Pressable>
      </View>
    </PlayerCard>
  );
}

const tint = () => colors.skill.listening;

/** The floating card that holds a player, between the header and the questions. */
function PlayerCard({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return (
    <View className={compact ? 'px-2 pb-2 pt-1' : 'px-3 pb-2 pt-3'}>
      <View className="rounded-3xl bg-surface px-4 py-3" style={{ borderWidth: 1.5, borderBottomWidth: 3.5, borderColor: colors.line, borderBottomColor: colors.edge }}>
        {children}
      </View>
    </View>
  );
}

/** A seek bar that seeks on tap and follows the finger while dragging. */
function SeekBar({ current, duration, onSeek }: { current: number; duration: number; onSeek: (seconds: number) => void }) {
  const width = useRef(1);
  const [dragging, setDragging] = useState<number | null>(null);
  const ratioAt = (x: number) => Math.max(0, Math.min(1, x / width.current));
  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => setDragging(ratioAt(event.nativeEvent.locationX)),
    onPanResponderMove: (event) => setDragging(ratioAt(event.nativeEvent.locationX)),
    onPanResponderRelease: (event) => { const ratio = ratioAt(event.nativeEvent.locationX); setDragging(null); seekRef.current(ratio); },
    onPanResponderTerminate: () => setDragging(null),
  })).current;
  const seekRef = useRef((ratio: number) => onSeek(ratio * duration));
  seekRef.current = (ratio: number) => onSeek(ratio * duration);
  const ratio = dragging ?? (duration > 0 ? Math.min(1, current / duration) : 0);
  return (
    <View
      {...responder.panHandlers}
      onLayout={(event: LayoutChangeEvent) => { width.current = Math.max(1, event.nativeEvent.layout.width); }}
      accessibilityRole="adjustable"
      accessibilityLabel="Tiến độ bài nghe"
      accessibilityValue={{ min: 0, max: Math.round(duration), now: Math.round(current), text: `${formatClock(current)} trên ${formatClock(duration)}` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => onSeek(current + (event.nativeEvent.actionName === 'increment' ? 10 : -10))}
      style={{ height: 28, justifyContent: 'center' }}>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden' }}>
        <View style={{ width: `${ratio * 100}%`, height: 6, backgroundColor: colors.skill.listening }} />
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', left: `${ratio * 100}%`, marginLeft: -9, width: 18, height: 18, borderRadius: 9, backgroundColor: '#ffffff', borderWidth: 3, borderColor: colors.skill.listening }} />
    </View>
  );
}

type ExamPhase = 'starting' | 'playing' | 'interrupted' | 'blocked' | 'done' | 'failed';
const PHASE_LABEL: Record<ExamPhase, string> = {
  starting: 'Đang chuẩn bị bài nghe…',
  playing: 'Đang phát · chỉ nghe một lần',
  interrupted: 'Bài nghe bị ngắt',
  blocked: 'Chạm để bắt đầu bài nghe',
  done: 'Đã nghe xong phần này',
  failed: 'Không phát được bài nghe',
};

/**
 * The exam recording of one part, as in the real test: it starts by itself, plays once and has no controls. A part
 * heard before (even in an earlier session) does not play again. If the system refuses to start, one button starts it.
 * A phone call, an alarm or leaving the app stops the sound mid-way: it carries on from the same second when the app is
 * back, or with one button if the system does not let it, and never starts the part over.
 */
export function ExamPlayer({ src, alreadyPlayed, onStarted, onEnded, onPlayingChange, label }: { src: string; alreadyPlayed: boolean; onStarted: () => void; onEnded: () => void; onPlayingChange?: (playing: boolean) => void; label?: string }) {
  usePlaybackAudioMode();
  const [wasPlayed] = useState(alreadyPlayed);
  const source = useFirstSource(src);
  const player = useAudioPlayer(wasPlayed ? null : source, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  const [phase, setPhase] = useState<ExamPhase>(wasPlayed ? 'done' : 'starting');
  const started = useRef(false);
  const ended = useRef(false);
  const retryPlayback = useRetryPlayback(player, src, status.currentTime);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const errorRef = useRef(status.error);
  useEffect(() => { errorRef.current = status.error; }, [status.error]);
  useEffect(() => () => { onPlayingChange?.(false); }, [onPlayingChange]);
  useEffect(() => () => clearTimeout(retryTimer.current), []);

  /** Plays the part again after a failure, from the same second; it never counts as a new listen. */
  const retry = () => {
    setPhase('starting');
    try { retryPlayback(); } catch { setPhase('failed'); return; }
    clearTimeout(retryTimer.current);
    // No sound after 4 s: the system wants a tap (blocked) or the address failed again.
    retryTimer.current = setTimeout(() => setPhase((current) => (current === 'starting' ? (errorRef.current ? 'failed' : 'blocked') : current)), 4000);
  };

  useEffect(() => {
    if (wasPlayed) return;
    player.play();
    const timer = setTimeout(() => { if (!started.current) setPhase('blocked'); }, 4000);
    return () => { clearTimeout(timer); try { player.pause(); } catch { /* released */ } };
  }, [player, wasPlayed]);

  useEffect(() => {
    onPlayingChange?.(status.playing);
    if (status.playing && !started.current) { started.current = true; setPhase('playing'); onStarted(); }
    else if (status.playing && started.current && !ended.current) setPhase('playing');
  }, [status.playing, onStarted, onPlayingChange]);

  // Stopped by the system after it began (a call, an alarm, the app sent to the background): offer to carry on, and
  // carry on by itself when the app is in front again.
  const interrupted = started.current && !ended.current && !status.playing && !status.didJustFinish;
  useEffect(() => {
    if (!interrupted) return;
    const timer = setTimeout(() => setPhase((current) => (current === 'playing' ? 'interrupted' : current)), 1200);
    return () => clearTimeout(timer);
  }, [interrupted]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && started.current && !ended.current) { try { player.play(); } catch { /* released */ } }
    });
    return () => subscription.remove();
  }, [player]);
  useEffect(() => {
    if (status.didJustFinish && !ended.current) { ended.current = true; setPhase('done'); onPlayingChange?.(false); onEnded(); }
  }, [status.didJustFinish, onEnded, onPlayingChange]);
  useEffect(() => { if (status.error) setPhase('failed'); }, [status.error]);

  const progress = status.duration > 0 ? Math.min(1, status.currentTime / status.duration) : 0;
  const live = phase === 'playing' || phase === 'interrupted';
  return (
    <PlayerCard>
      <View accessibilityRole="text" accessibilityLiveRegion="polite" className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: live ? colors.dangerSoft : `${tint()}1f` }}>
          {live ? <View className="h-3 w-3 rounded-full" style={{ backgroundColor: colors.danger }} /> : <Headphones size={20} color={skillInk('listening')} />}
        </View>
        <View className="min-w-0 flex-1">
          <Text weight="black" className="text-sm text-ink" numberOfLines={1}>{PHASE_LABEL[phase]}</Text>
          <Text className="text-xs text-muted" numberOfLines={1}>{phase === 'interrupted' ? `Dừng ở ${formatClock(status.currentTime)} · nghe tiếp từ chỗ này` : phase === 'failed' ? 'Kiểm tra mạng rồi thử lại · bài nghe tiếp tục từ chỗ đã dừng' : live ? `${formatClock(status.currentTime)} / ${formatClock(status.duration)} · không tua, không dừng` : label ?? 'Bài nghe thi thật'}</Text>
        </View>
        {phase === 'interrupted' ? (
          <Pressable onPress={() => player.play()} accessibilityRole="button" accessibilityLabel="Nghe tiếp bài nghe" className="min-h-11 flex-row items-center gap-1.5 rounded-full px-4" style={{ backgroundColor: tint() }}>
            <Play size={14} color="#ffffff" fill="#ffffff" />
            <Text weight="black" style={{ color: '#ffffff' }}>Nghe tiếp</Text>
          </Pressable>
        ) : null}
        {phase === 'failed' ? <RetryButton onPress={retry} /> : null}
        {phase === 'blocked' ? (
          <Pressable onPress={() => player.play()} accessibilityRole="button" accessibilityLabel="Bắt đầu bài nghe" className="min-h-11 flex-row items-center gap-1.5 rounded-full px-4" style={{ backgroundColor: tint() }}>
            <Play size={14} color="#ffffff" fill="#ffffff" />
            <Text weight="black" style={{ color: '#ffffff' }}>Bắt đầu</Text>
          </Pressable>
        ) : null}
      </View>
      {live ? (
        <View className="mt-3" style={{ height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden' }}>
          <View style={{ width: `${progress * 100}%`, height: 6, borderRadius: 3, backgroundColor: tint() }} />
        </View>
      ) : null}
    </PlayerCard>
  );
}
