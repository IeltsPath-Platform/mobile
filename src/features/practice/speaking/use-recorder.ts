import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioStream, type AudioPlayer, type AudioStreamBuffer } from 'expo-audio';
import { File } from 'expo-file-system';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';

import type { SavedRecording } from '../model/speaking-session';

export type RecorderStatus = 'idle' | 'requesting' | 'recording' | 'processing' | 'recorded' | 'denied' | 'error';

/** Bars of the live waveform. */
const LEVEL_COUNT = 28;
/** Peak (0..1) under which a whole recording counts as silent. */
const SILENT_PEAK = 0.02;
/** A WAV file no larger than its header holds no sound. */
const WAV_HEADER_BYTES = 44;

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

/** The answer left on disk at `uri` once the stream has stopped, or null (and the file removed) when it holds no sound. */
function keptRecording(uri: string, startedAt: number, silent: boolean): SavedRecording | null {
  try {
    const file = new File(uri);
    const size = file.exists ? file.size ?? 0 : 0;
    if (size > WAV_HEADER_BYTES) return { uri, durationSeconds: Math.max(0, Math.round((Date.now() - startedAt) / 1000)), silent, size };
    if (file.exists) file.delete();
  } catch { /* unreadable: the answer is lost */ }
  return null;
}

const releaseMic = () => setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);

/**
 * Plays a recorded answer from its start. On iOS the microphone stream puts the audio session in record-only mode; the
 * session is set back to playback (loudspeaker, also with the silent switch on) before every play, so a release that did
 * not happen, or happened too late, cannot leave the answer silent.
 */
export async function playFromStart(player: AudioPlayer) {
  await releaseMic();
  try { await player.seekTo(0); } catch { /* not loaded yet: it starts from 0 anyway */ }
  player.play();
}

/**
 * Records one answer straight to a 16 kHz mono 16-bit WAV file (the format the grader accepts) on Android and iOS, with
 * live levels for the waveform. A recording that never rose above a whisper is flagged `silent`. Going to the
 * background, or leaving the question, stops the recording and keeps what was said.
 */
export function useRecorder({ saved, onSaved }: { saved?: SavedRecording | null; onSaved?: (recording: SavedRecording) => void }) {
  const [status, setStatus] = useState<RecorderStatus>(saved ? 'recorded' : 'idle');
  const [elapsed, setElapsed] = useState(saved?.durationSeconds ?? 0);
  const [levels, setLevels] = useState<number[]>(() => Array.from({ length: LEVEL_COUNT }, () => 0));
  const [recording, setRecording] = useState<SavedRecording | null>(saved ?? null);
  const [error, setError] = useState('');
  const peak = useRef(0);
  const started = useRef(0);
  const lastLevelUpdate = useRef(0);
  /** The file being written, known from the moment recording starts so an unmount can still keep it. */
  const fileUri = useRef<string | null>(null);
  const mounted = useRef(true);
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
      // PCM arrives far more often than the waveform needs to paint.
      if (Date.now() - lastLevelUpdate.current < 80) return;
      lastLevelUpdate.current = Date.now();
      setLevels((current) => [...current.slice(1), Math.min(1, level * 3)]);
    },
  });

  // The saved list of a test is read from storage after the screen opens; an answer found then is shown as recorded.
  useEffect(() => {
    if (!saved || statusRef.current !== 'idle') return;
    statusRef.current = 'recorded';
    setRecording(saved);
    setElapsed(saved.durationSeconds);
    setStatus('recorded');
  }, [saved]);

  const stop = useCallback(async () => {
    if (statusRef.current !== 'recording') return;
    statusRef.current = 'processing';
    setStatus('processing');
    const uri = fileUri.current;
    fileUri.current = null;
    let result: { uri: string; duration: number; size: number } | null = null;
    try { result = await stream.stopFileRecordingAsync(); } catch { /* stop() below still finalizes the file */ }
    try { stream.stop(); } catch { /* already released */ }
    await releaseMic();
    const silent = peak.current < SILENT_PEAK;
    const next = result
      ? { uri: result.uri, durationSeconds: Math.max(0, Math.round(result.duration)), silent, size: result.size }
      : uri ? keptRecording(uri, started.current, silent) : null;
    if (!next) {
      setError('Chưa lưu được bản ghi. Hãy ghi lại.');
      setStatus('error');
      statusRef.current = 'error';
      return;
    }
    setRecording(next);
    setElapsed(next.durationSeconds);
    setStatus('recorded');
    statusRef.current = 'recorded';
    savedRef.current?.(next);
  }, [stream]);

  const start = useCallback(async () => {
    if (statusRef.current === 'recording' || statusRef.current === 'requesting' || statusRef.current === 'processing') return;
    statusRef.current = 'requesting';
    setError('');
    setStatus('requesting');
    try {
      let permission = await getRecordingPermissionsAsync();
      if (!permission.granted && permission.canAskAgain) permission = await requestRecordingPermissionsAsync();
      if (!mounted.current) return;
      if (!permission.granted) { statusRef.current = 'denied'; setStatus('denied'); return; }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      peak.current = 0;
      setLevels(Array.from({ length: LEVEL_COUNT }, () => 0));
      await stream.start();
      const file = await stream.startFileRecordingAsync({ format: 'wav', directory: 'document' });
      // The question was left while the microphone was opening: nothing was said yet, so nothing is kept.
      if (!mounted.current) {
        try { stream.stop(); } catch { /* released */ }
        try { new File(file.uri).delete(); } catch { /* not written */ }
        await releaseMic();
        return;
      }
      fileUri.current = file.uri;
      started.current = Date.now();
      setElapsed(0);
      setStatus('recording');
      statusRef.current = 'recording';
    } catch {
      try { stream.stop(); } catch { /* not running */ }
      await releaseMic();
      setError('Không bật được micro. Hãy kiểm tra quyền micro rồi thử lại.');
      setStatus('error');
      statusRef.current = 'error';
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

  // Leaving the question while recording keeps the answer. A cleanup cannot wait for the async stop and the stream is
  // released right after it, so the file is finalized synchronously by stop() and read from disk.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (statusRef.current !== 'recording') return;
      statusRef.current = 'idle';
      const uri = fileUri.current;
      fileUri.current = null;
      try { stream.stop(); } catch { /* released */ }
      void releaseMic();
      const kept = uri ? keptRecording(uri, started.current, peak.current < SILENT_PEAK) : null;
      if (kept) savedRef.current?.(kept);
    };
  }, [stream]);

  return { status, elapsed, levels, recording, error, start, stop, openSettings: () => void Linking.openSettings() };
}
