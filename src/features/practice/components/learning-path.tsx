import { View } from 'react-native';

import { Text } from '@/src/components/ui/text';

import type { PathNode, PathUnit } from '../path';
import { PathNodeButton } from './path-node';

type LearningPathProps = {
  units: PathUnit[];
  onSelectNode: (node: PathNode) => void;
};

const zigZag: Array<'center' | 'right' | 'center' | 'left'> = ['center', 'right', 'center', 'left'];

export function LearningPath({ units, onSelectNode }: LearningPathProps) {
  return (
    <View className="gap-8">
      {units.map((unit) => (
        <View key={unit.id} className="gap-2">
          <View className="rounded-3xl border border-line border-b-4 border-b-edge bg-surface px-4 py-3">
            <Text weight="bold" className="text-xs uppercase tracking-widest text-accent-deep">
              {unit.label}
            </Text>
            <Text weight="black" className="mt-1 text-lg">
              {unit.title}
            </Text>
            <View className="mt-3 h-2.5 overflow-hidden rounded-full bg-line">
              <View className="h-full rounded-full bg-accent" style={{ width: `${unit.progress * 100}%` }} />
            </View>
            <Text weight="bold" className="mt-1.5 text-xs text-muted">
              {Math.round(unit.progress * 100)}% · chạm vào vòng tròn để xem bài
            </Text>
          </View>

          <View className="items-center px-2 pt-4">
            {unit.nodes.map((node, index) => (
              <PathNodeButton
                key={node.id}
                node={node}
                align={zigZag[index % zigZag.length]}
                showConnector={index < unit.nodes.length - 1}
                onPress={() => onSelectNode(node)}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
