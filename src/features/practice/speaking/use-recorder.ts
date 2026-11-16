import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioStream, type AudioStreamBuffer } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';

import type { SavedRecording } from '../model/speaking-session';

export type RecorderStatus = 'idle' | 'requesting' | 'recording' | 'processing' | 'recorded' | 'denied' | 'error';

/** Bars of the live waveform. */
const LEVEL_COUNT = 28;
/** Peak (0..1) under which a whole recording counts as silent. */
const SILENT_PEAK = 0.02;

/** Peak of an int16 PCM buffer, 0..1. */
function peakOf(buffer: AudioStreamBuffer) {
  const samples = new Int16Array(buffer.data);
  let peak = 0;
  for (let index = 0; index < samples.length; index += 4) {
    const value = Math.abs(samples[index] ?? 0);
    if (value > peak) peak = value;
  }
  return peak / 32768;
}

/**
 * Records one answer straight to a 16 kHz mono 16-bit WAV file (the format the grader accepts) on Android and iOS, with
 * live levels for the waveform. A recording that never rose above a whisper is flagged `silent`. Going to the
 * background stops the recording and keeps what was said.
 */
export function useRecorder({ saved, onSaved }: { saved?: SavedRecording | null; onSaved?: (recording: SavedRecording) => void }) {
  const [status, setStatus] = useState<RecorderStatus>(saved ? 'recorded' : 'idle');
  const [elapsed, setElapsed] = useState(saved?.durationSeconds ?? 0);
  const [levels, setLevels] = useState<number[]>(() => Array.from({ length: LEVEL_COUNT }, () => 0));
  const [recording, setRecording] = useState<SavedRecording | null>(saved ?? null);
  const [error, setError] = useState('');
  const peak = useRef(0);
  const started = useRef(0);
  const statusRef = useRef(status);
  statusRef.current = status;
  const savedRef = useRef(onSaved);
  savedRef.current = onSaved;

  const { stream } = useAudioStream({
    sampleRate: 16000,
    channels: 1,
    encoding: 'int16',
    onBuffer: (buffer) => {
      const level = peakOf(buffer);
      if (level > peak.current) peak.current = level;
      setLevels((current) => [...current.slice(1), Math.min(1, level * 3)]);
    },
  });

  const stop = useCallback(async () => {
    if (statusRef.current !== 'recording') return;
    setStatus('processing');
    try {
      const result = await stream.stopFileRecordingAsync();
      stream.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
      const next: SavedRecording = { uri: result.uri, durationSeconds: Math.max(0, Math.round(result.duration)), silent: peak.current < SILENT_PEAK, size: result.size };
      setRecording(next);
      setElapsed(next.durationSeconds);
      setStatus('recorded');
      savedRef.current?.(next);
    } catch {
      setError('Chưa lưu được bản ghi. Hãy ghi lại.');
      setStatus('error');
    }
  }, [stream]);

  const start = useCallback(async () => {
    setError('');
    setStatus('requesting');
    try {
      let permission = await getRecordingPermissionsAsync();
      if (!permission.granted && permission.canAskAgain) permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) { setStatus('denied'); return; }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      peak.current = 0;
      setLevels(Array.from({ length: LEVEL_COUNT }, () => 0));
      await stream.start();
      await stream.startFileRecordingAsync({ format: 'wav', directory: 'document' });
      started.current = Date.now();
      setElapsed(0);
      setStatus('recording');
    } catch {
      try { stream.stop(); } catch { /* not running */ }
      setError('Không bật được micro. Hãy kiểm tra quyền micro rồi thử lại.');
      setStatus('error');
    }
  }, [stream]);

  useEffect(() => {
    if (status !== 'recording') return;
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started.current) / 1000)), 250);
    return () => clearInterval(timer);
  }, [status]);

  // A call or switching apps ends the answer here; what was said is kept.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => { if (state !== 'active') void stop(); });
    return () => subscription.remove();
  }, [stop]);

  // Leaving the question while recording keeps the answer too.
  useEffect(() => () => { if (statusRef.current === 'recording') void stop(); }, [stop]);

  return { status, elapsed, levels, recording, error, start, stop, openSettings: () => void Linking.openSettings() };
}
