import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import { AppState } from 'react-native';

import { getAppSettings, subscribeAppSettings } from '@/src/features/settings/use-app-settings';

const effects = {
  tap: require('@/assets/audio/tap.wav'),
  correct: require('@/assets/audio/correct.wav'),
  wrong: require('@/assets/audio/wrong.wav'),
  match: require('@/assets/audio/match.wav'),
  complete: require('@/assets/audio/complete.wav'),
} as const;

export type SoundName = keyof typeof effects;

const MUSIC_VOLUME = 0.22;
const players = new Map<SoundName, AudioPlayer>();
let music: AudioPlayer | null = null;
let pronunciation: AudioPlayer | null = null;
let musicWanted = false;
let configured = false;

/** Audio is a nicety: every failure is swallowed so it can never break a lesson. */
async function configure() {
  if (configured) return;
  configured = true;
  // Respect the silent switch and let other apps' audio finish naturally.
  await setAudioModeAsync({ playsInSilentMode: false, shouldPlayInBackground: false, interruptionMode: 'mixWithOthers' }).catch(() => undefined);
}

async function effectPlayer(name: SoundName) {
  await configure();
  let player = players.get(name);
  if (!player) {
    player = createAudioPlayer(effects[name]);
    players.set(name, player);
  }
  return player;
}

export const sound = {
  async play(name: SoundName) {
    try {
      if (!(await getAppSettings()).soundEnabled) return;
      const player = await effectPlayer(name);
      await player.seekTo(0);
      player.play();
    } catch {
      /* ignore */
    }
  },

  /** Read a word or sentence aloud with the device voice. */
  async speak(text: string, language = 'en-US') {
    try {
      if (!(await getAppSettings()).soundEnabled || !text.trim()) return;
      await configure();
      pronunciation?.pause();
      Speech.stop();
      Speech.speak(text, { language, rate: 0.9 });
    } catch {
      /* ignore */
    }
  },

  /** Play a pronunciation recording whose URL was returned by the vocabulary API. */
  async playPronunciation(uri: string) {
    try {
      if (!(await getAppSettings()).soundEnabled || !uri.trim()) return false;
      await configure();
      Speech.stop();
      if (!pronunciation) pronunciation = createAudioPlayer(uri);
      else {
        pronunciation.pause();
        pronunciation.replace(uri);
      }
      pronunciation.play();
      return true;
    } catch {
      return false;
    }
  },

  stopSpeaking() {
    try { Speech.stop(); } catch { /* ignore */ }
    try { pronunciation?.pause(); } catch { /* ignore */ }
  },

  async startMusic() {
    musicWanted = true;
    try {
      if (!(await getAppSettings()).musicEnabled || !musicWanted) return;
      await configure();
      if (!music) {
        music = createAudioPlayer(require('@/assets/audio/study-loop.wav'));
        music.loop = true;
        music.volume = MUSIC_VOLUME;
      }
      music.play();
    } catch {
      /* ignore */
    }
  },

  stopMusic() {
    musicWanted = false;
    try { music?.pause(); } catch { /* ignore */ }
  },
};

// Settings toggles and app backgrounding apply immediately to a running loop.
subscribeAppSettings(() => {
  void getAppSettings().then((settings) => {
    if (!settings.musicEnabled) { try { music?.pause(); } catch { /* ignore */ } }
    else if (musicWanted) void sound.startMusic();
    if (!settings.soundEnabled) sound.stopSpeaking();
  });
});
AppState.addEventListener('change', (state) => {
  if (state !== 'active') { try { music?.pause(); } catch { /* ignore */ } sound.stopSpeaking(); }
  else if (musicWanted) void sound.startMusic();
});
