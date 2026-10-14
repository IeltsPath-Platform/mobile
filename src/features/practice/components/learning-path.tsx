import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

import type { PathNode, PathUnit } from '../path';
import { flattenNodes } from '../path';
import { PathMascot, type MascotPoint } from './path-mascot';
import { PathNodeButton, type NodeAlign } from './path-node';

type LearningPathProps = {
  units: PathUnit[];
  onSelectNode: (node: PathNode) => void;
  /** Node the mascot currently stands on. */
  mascotNodeId: string | null;
  /** When set, mascot runs toward this node. */
  travelToNodeId?: string | null;
  onMascotArrived?: () => void;
  /** Skip the inline title for the unit already shown as the Home banner. */
  quietUnitId?: string | null;
};

const zigZag: NodeAlign[] = ['center', 'right', 'center', 'left'];

type PointMap = Record<string, MascotPoint>;

export function LearningPath({
  units,
  onSelectNode,
  mascotNodeId,
  travelToNodeId = null,
  onMascotArrived,
  quietUnitId = null,
}: LearningPathProps) {
  const mapRef = useRef<View>(null);
  const ringRefs = useRef<Record<string, View | null>>({});
  const [points, setPoints] = useState<PointMap>({});
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });

  const remasure = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    map.measureInWindow((mapX, mapY) => {
      const next: PointMap = {};
      const ids = Object.keys(ringRefs.current);
      let pending = ids.length;
      if (pending === 0) return;

      for (const id of ids) {
        const ring = ringRefs.current[id];
        if (!ring) {
          pending -= 1;
          continue;
        }
        ring.measureInWindow((x, y, width, height) => {
          next[id] = { x: x - mapX + width / 2, y: y - mapY + height / 2 };
          pending -= 1;
          if (pending <= 0) setPoints((prev) => ({ ...prev, ...next }));
        });
      }
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(remasure, 80);
    return () => clearTimeout(timer);
  }, [units, remasure, mapSize.width, mapSize.height]);

  useEffect(() => {
    if (!travelToNodeId) return;
    if (points[travelToNodeId] && mascotNodeId && points[mascotNodeId]) return;
    const timer = setTimeout(remasure, 60);
    return () => clearTimeout(timer);
  }, [travelToNodeId, mascotNodeId, points, remasure]);

  const trail = buildTrailPath(flattenNodes(units), points);
  const mascotAt = mascotNodeId ? points[mascotNodeId] ?? null : null;
  const travelTo = travelToNodeId ? points[travelToNodeId] ?? null : null;

  return (
    <View
      ref={mapRef}
      collapsable={false}
      className="overflow-hidden bg-canvas"
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setMapSize({ width, height });
        requestAnimationFrame(remasure);
      }}>
      {/* Soft light map ground — not dark mode */}
      <View pointerEvents="none" className="absolute inset-0">
        <View className="absolute -left-10 top-8 h-40 w-40 rounded-full bg-[#e7f6ec] opacity-90" />
        <View className="absolute -right-8 top-48 h-48 w-48 rounded-full bg-[#eef3ff] opacity-90" />
        <View className="absolute left-16 top-[420px] h-36 w-36 rounded-full bg-[#fff1e6] opacity-80" />
        <View className="absolute -right-6 bottom-24 h-44 w-44 rounded-full bg-[#e8f5f2] opacity-85" />
        <View className="absolute left-0 right-0 top-0 h-24 bg-[#f3f6ff]" />
      </View>

      {mapSize.width > 0 && trail ? (
        <Svg
          pointerEvents="none"
          width={mapSize.width}
          height={Math.max(mapSize.height, 1)}
          style={{ position: 'absolute', left: 0, top: 0 }}>
          <Path d={trail.d} stroke={colors.line} strokeWidth={10} strokeLinecap="round" fill="none" />
          <Path
            d={trail.d}
            stroke={colors.accentWarm}
            strokeWidth={5}
            strokeLinecap="round"
            fill="none"
            strokeDasharray="14 10"
            opacity={0.85}
          />
          {trail.dots.map((dot, i) => (
            <Circle key={`dot-${i}`} cx={dot.x} cy={dot.y} r={4} fill={colors.accentSoft} stroke={colors.accent} strokeWidth={1.5} />
          ))}
        </Svg>
      ) : null}

      <View className="relative z-10 gap-7 px-3 pb-16 pt-5">
        {units.map((unit) => (
          <View key={unit.id} className="gap-1">
            {unit.id === quietUnitId ? null : (
              <View className="mx-2 mb-1 flex-row items-baseline justify-between px-1">
                <Text weight="extrabold" className="text-sm text-ink">
                  {unit.title}
                </Text>
                <Text weight="bold" className="text-xs text-muted">
                  {Math.round(unit.progress * 100)}%
                </Text>
              </View>
            )}

            <View className="items-center px-1 pt-2">
              {unit.nodes.map((node, index) => (
                <PathNodeButton
                  key={node.id}
                  node={node}
                  align={zigZag[index % zigZag.length]}
                  showConnector={index < unit.nodes.length - 1}
                  onPress={() => onSelectNode(node)}
                  ringRef={(ref) => {
                    ringRefs.current[node.id] = ref;
                  }}
                />
              ))}
            </View>
          </View>
        ))}
      </View>

      <PathMascot at={mascotAt} travelTo={travelTo} onArrived={onMascotArrived} />
    </View>
  );
}

function buildTrailPath(nodes: PathNode[], points: PointMap): { d: string; dots: MascotPoint[] } | null {
  const pts = nodes.map((n) => points[n.id]).filter(Boolean) as MascotPoint[];
  if (pts.length < 2) return null;

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const midY = (prev.y + curr.y) / 2;
    d += ` C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`;
  }
  return { d, dots: pts };
}
