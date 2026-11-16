import { Platform } from 'react-native';

// The products an activation key can carry, as the web pricing data lists them (frontend/src/features/home/pricingData.ts).
export type ActivationProduct =
  | { code: 'PREMIUM_30D' | 'PREMIUM_90D'; name: string; type: 'PREMIUM'; premiumDays: number; humanGradingCredits: number; featured: boolean }
  | { code: 'POINT_50' | 'POINT_100'; name: string; type: 'POINTS'; points: number };

export const PREMIUM_PRODUCTS = [
  { code: 'PREMIUM_30D', name: 'Premium 30 Ngày', type: 'PREMIUM', premiumDays: 30, humanGradingCredits: 4, featured: false },
  { code: 'PREMIUM_90D', name: 'Premium 90 Ngày', type: 'PREMIUM', premiumDays: 90, humanGradingCredits: 12, featured: true },
] as const satisfies readonly ActivationProduct[];

export const POINT_PRODUCTS = [
  { code: 'POINT_50', name: 'Thẻ Point 50', type: 'POINTS', points: 50 },
  { code: 'POINT_100', name: 'Thẻ Point 100', type: 'POINTS', points: 100 },
] as const satisfies readonly ActivationProduct[];

/**
 * Whether the app may offer key activation. Store rules can forbid unlocking digital content with a key inside an iOS
 * app; `EXPO_PUBLIC_HIDE_IOS_KEY_ACTIVATION=true` hides it there and points the learner to the website instead.
 */
export function keyActivationAllowed() {
  return !(Platform.OS === 'ios' && process.env.EXPO_PUBLIC_HIDE_IOS_KEY_ACTIVATION === 'true');
}
