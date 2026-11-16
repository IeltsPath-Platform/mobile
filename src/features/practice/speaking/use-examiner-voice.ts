// Mobile counterpart of frontend/src/features/practice/hooks/useSpokenPrompt.ts, reading with the device voice (expo-speech).
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';

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
 * off) and stops when the text changes again or the screen goes away.
 */
export function useExaminerVoice(text: string) {
  const [speaking, setSpeaking] = useState(false);
  const [autoRead, setAutoReadState] = useState(true);
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => { setAutoReadState(value !== 'off'); loaded.current = true; }).catch(() => { loaded.current = true; });
  }, []);

  const stop = useCallback(() => { void Speech.stop(); setSpeaking(false); }, []);

  const replay = useCallback(() => {
    if (!text) return;
    void Speech.stop();
    void pickVoice().then((voice) => {
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
    return () => { clearTimeout(timer); void Speech.stop(); };
  }, [text, autoRead, replay]);

  useEffect(() => () => { void Speech.stop(); }, []);

  const setAutoRead = useCallback((on: boolean) => {
    setAutoReadState(on);
    void AsyncStorage.setItem(STORAGE_KEY, on ? 'on' : 'off').catch(() => undefined);
    if (!on) void Speech.stop();
  }, []);

  return { speaking, autoRead, setAutoRead, replay, stop };
}
