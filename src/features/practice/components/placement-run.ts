/** What a Reading or Listening screen needs when it runs one skill of a placement test instead of a practice test. */
export interface PlacementRun {
  /** Hands the skill in (and the whole test when it was the last one), then leaves the screen. */
  onFinish: () => Promise<void>;
  /** Where "leave" goes: the placement hub rather than the practice catalog. */
  exitHref: string;
}
