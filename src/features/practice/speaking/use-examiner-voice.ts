// Mobile counterpart of frontend/src/features/practice/hooks/useSpokenPrompt.ts, reading with the device voice (expo-speech).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'practice.speaking.autoRead';
/** A short pause before the first word so the screen has settled. */
const START_DELAY_MS = 400;
const RATE = 0.9;

let voiceId: string | undefined | null = null;

/** British English first (the examiner's accent), then American, then any English voice. */
async function pickVoice() {
  if (voiceId !== null) return voiceId;
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const tag = (language: string) => language.toLowerCase().replace('_', '-');
    voiceId = (voices.find((voice) => tag(voice.language) === 'en-gb') ?? voices.find((voice) => tag(voice.language) === 'en-us') ?? voices.find((voice) => tag(voice.language).startsWith('en')))?.identifier;
  } catch {
    voiceId = undefined;
  }
  return voiceId;
}

/**
 * Reads a question aloud like an examiner. It starts by itself when the text changes (unless the learner turned that
 * off) and stops when the text changes again or the screen goes away. While `muted` (the microphone is live) it never
 * speaks, so the examiner's voice is not recorded into the answer.
 */
export function useExaminerVoice(text: string, muted = false) {
  const [speaking, setSpeaking] = useState(false);
  const [autoRead, setAutoReadState] = useState(true);
  /** Bumped by every stop, so a reading still choosing its voice does not start after it was cancelled. */
  const generation = useRef(0);
  const mutedRef = useRef(muted);
  useLayoutEffect(() => { mutedRef.current = muted; });

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => setAutoReadState(value !== 'off')).catch(() => undefined);
  }, []);

  const stop = useCallback(() => { generation.current += 1; void Speech.stop(); setSpeaking(false); }, []);

  const replay = useCallback(() => {
    if (!text || mutedRef.current) return;
    void Speech.stop();
    const turn = ++generation.current;
    // On iPhone the device voice is silent while the ring switch is on unless the app plays as media; the microphone
    // is closed here (the voice never reads while recording), so this does not interfere with the answer.
    const ready = Promise.all([pickVoice(), setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => undefined)]);
    void ready.then(([voice]) => {
      if (turn !== generation.current || mutedRef.current) return;
      Speech.speak(text, {
        language: 'en-GB', rate: RATE, voice,
        onStart: () => setSpeaking(true),
        onDone: () => setSpeaking(false),
        onStopped: () => setSpeaking(false),
        onError: () => setSpeaking(false),
      });
    });
  }, [text]);

  useEffect(() => {
    if (!text || !autoRead) return;
    const timer = setTimeout(replay, START_DELAY_MS);
    return () => { clearTimeout(timer); stop(); };
  }, [text, autoRead, replay, stop]);

  useEffect(() => { if (muted) stop(); }, [muted, stop]);
  useEffect(() => stop, [stop]);

  const setAutoRead = useCallback((on: boolean) => {
    setAutoReadState(on);
    void AsyncStorage.setItem(STORAGE_KEY, on ? 'on' : 'off').catch(() => undefined);
    if (!on) stop();
  }, [stop]);

  return { speaking, autoRead, setAutoRead, replay, stop };
}
