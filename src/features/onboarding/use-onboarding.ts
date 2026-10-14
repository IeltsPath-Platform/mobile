import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

export type OnboardingAnswers = {
  band: string;
  skill: string;
  minutes: string;
  goal: string;
  experience: string;
  reminder: string;
};

export type OnboardingProfile = OnboardingAnswers & {
  completed: boolean;
};

const STORAGE_KEY = '@ielts/onboarding/v1';

const EMPTY: OnboardingProfile = {
  completed: false,
  band: '',
  skill: '',
  minutes: '',
  goal: '',
  experience: '',
  reminder: '',
};

let memory: OnboardingProfile | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

async function readProfile(): Promise<OnboardingProfile> {
  if (memory) return memory;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    memory = raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<OnboardingProfile>) } : { ...EMPTY };
  } catch {
    memory = { ...EMPTY };
  }
  loaded = true;
  return memory;
}

export async function saveOnboarding(profile: OnboardingProfile) {
  memory = profile;
  loaded = true;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  notify();
}

export function useOnboarding() {
  const [profile, setProfile] = useState<OnboardingProfile>(memory ?? EMPTY);
  const [ready, setReady] = useState(loaded);

  useEffect(() => {
    let alive = true;
    void readProfile().then((value) => {
      if (!alive) return;
      setProfile(value);
      setReady(true);
    });
    const onChange = () => {
      if (memory) setProfile(memory);
    };
    listeners.add(onChange);
    return () => {
      alive = false;
      listeners.delete(onChange);
    };
  }, []);

  const complete = useCallback(async (answers: OnboardingAnswers) => {
    await saveOnboarding({ ...answers, completed: true });
    setProfile({ ...answers, completed: true });
  }, []);

  return {
    ready,
    profile,
    onboarded: profile.completed,
    complete,
  };
}
