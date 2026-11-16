import { useLocalSearchParams } from 'expo-router';

import { CatalogScreen } from '@/src/features/practice/catalog/catalog-screen';
import { parseSkill } from '@/src/features/practice/model/skill-meta';

export default function PracticeCatalogRoute() {
  const params = useLocalSearchParams<{ skill: string; part?: string; format?: string }>();
  const skill = parseSkill(params.skill);
  return <CatalogScreen key={skill} skill={skill} initialPart={params.part} initialFormat={params.format} />;
}
