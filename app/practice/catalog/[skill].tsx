import { useLocalSearchParams } from 'expo-router';

import { CatalogScreen } from '@/src/features/practice/catalog/catalog-screen';
import { parseSkill } from '@/src/features/practice/model/skill-meta';

export default function PracticeCatalogRoute() {
  const params = useLocalSearchParams<{ skill: string; part?: string; format?: string }>();
  const skill = parseSkill(params.skill);
  // ?part= and ?format= only seed the screen's state, so a link that changes them starts the screen afresh.
  return <CatalogScreen key={`${skill}|${params.part ?? ''}|${params.format ?? ''}`} skill={skill} initialPart={params.part} initialFormat={params.format} />;
}
