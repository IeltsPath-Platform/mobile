import { View } from 'react-native';

import { Card } from '@/src/components/ui/card';
import { Text } from '@/src/components/ui/text';

import type { Skill } from '../skills';

type SkillCardProps = {
  skill: Skill;
  badge?: string;
  className?: string;
};

export function SkillCard({ skill, badge, className }: SkillCardProps) {
  const { Icon, color, label, description } = skill;

  return (
    <Card className={`p-4 ${className ?? ''}`} accessibilityLabel={`${label}. ${description}`}>
      <View className="flex-row items-start justify-between">
        <View className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: `${color}1a` }}>
          <Icon size={22} color={color} />
        </View>
        {badge ? (
          <View className="rounded-full bg-accent-soft px-2.5 py-1">
            <Text weight="bold" className="text-[11px] text-accent-deep">
              {badge}
            </Text>
          </View>
        ) : null}
      </View>
      <Text weight="extrabold" className="mt-3 text-base" style={{ color }}>
        {label}
      </Text>
      <Text className="mt-1 text-sm leading-5 text-muted">{description}</Text>
    </Card>
  );
}
