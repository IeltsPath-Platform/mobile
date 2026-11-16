// Ported from frontend/src/features/practice/lib/practiceFormatLabels.ts. Keep behaviour in step with the web version.
/** Display names for the question-format codes stored with the practice test library, for every skill. */
const FORMAT_LABELS: Record<string, string> = {
  // Reading and Listening question formats
  TRUE_FALSE_NOT_GIVEN: 'True / False / Not Given',
  YES_NO_NOT_GIVEN: 'Yes / No / Not Given',
  MULTIPLE_CHOICE: 'Multiple Choice',
  MULTIPLE_CHOICE_ONE: 'Multiple Choice (One Answer)',
  MULTIPLE_CHOICE_MANY: 'Multiple Choice (Many Answers)',
  GAP_FILLING: 'Gap Filling',
  FILL_IN_BLANK: 'Gap Filling',
  SENTENCE_COMPLETION: 'Sentence Completion',
  SUMMARY_COMPLETION: 'Summary Completion',
  FORM_COMPLETION: 'Form Completion',
  NOTE_COMPLETION: 'Note Completion',
  MATCHING: 'Matching',
  MAP_DIAGRAM_LABEL: 'Map, Diagram Label',
  MATCHING_INFORMATION: 'Matching Information',
  MATCHING_HEADINGS: 'Matching Headings',
  MATCHING_FEATURES: 'Matching Features',
  // Writing Task 1 chart types and Task 2 essay types
  LINE_GRAPH: 'Line Graph',
  BAR_CHART: 'Bar Chart',
  PIE_CHART: 'Pie Chart',
  TABLE_CHART: 'Table',
  PROCESS_DIAGRAM: 'Process',
  MAP_DIAGRAM: 'Map',
  OPINION_ESSAY: 'Opinion Essay',
  DISCUSSION_ESSAY: 'Discussion Essay',
  PROBLEM_SOLUTION_ESSAY: 'Problem & Solution',
  ADVANTAGES_DISADVANTAGES_ESSAY: 'Advantages & Disadvantages',
  TWO_PART_QUESTION: 'Two-part Question',
  // Speaking topics
  HOMETOWN: 'Hometown',
  STUDY_AND_WORK: 'Study & Work',
  FOOD_AND_COOKING: 'Food & Cooking',
  FAMILY_AND_FRIENDS: 'Family & Friends',
  DAILY_ROUTINE: 'Daily Routine',
  HOBBIES: 'Hobbies',
  TECHNOLOGY: 'Technology',
  EDUCATION: 'Education',
  TRAVEL: 'Travel',
  ENVIRONMENT: 'Environment',
  HEALTH: 'Health',
  CULTURE: 'Culture',
  OTHER: 'Other question types',
}

export function practiceFormatLabel(code: string): string {
  const known = FORMAT_LABELS[code]
  if (known) return known
  return code.toLowerCase().split('_').filter(Boolean).map((word) => word[0]!.toUpperCase() + word.slice(1)).join(' ')
}
