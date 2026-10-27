import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Award, RotateCcw, Trophy } from 'lucide-react-native';
import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { gameApi } from '@/src/features/games/api';
import type { GameResult } from '@/src/features/games/types';
import { colors } from '@/src/theme';

export default function WordlyResultScreen() {
  const { matchId, gameType } = useLocalSearchParams<{ matchId: string; gameType?: string }>(); const router = useRouter();
  const rocket = gameType === 'ROCKET';
  const result = useQuery<GameResult>({ queryKey: ['games', 'result', gameType, matchId], queryFn: async () => rocket ? gameApi.rocketResult(matchId) : gameApi.result(matchId), enabled: Boolean(matchId), retry: 1 });
  const ranking = useQuery({ queryKey: ['games', 'ranking', matchId], queryFn: () => gameApi.ranking(matchId), enabled: Boolean(matchId) && rocket, retry: 1 });
  if (result.isPending) return <View className="flex-1 items-center justify-center bg-canvas"><ActivityIndicator color={colors.accent}/><Text className="mt-3 text-sm text-muted">Đang tổng kết ván chơi…</Text></View>;
  if (!result.data) return <View className="flex-1 justify-center bg-canvas px-5"><Text weight="bold">Chưa tải được kết quả.</Text><Button className="mt-4" label="Thử lại" onPress={() => void result.refetch()}/><Button className="mt-3" variant="secondary" label="Về trò chơi" onPress={() => router.replace('/games' as never)}/></View>;
  const data = result.data; const elapsed = Math.max(0, Math.round(data.durationMs / 60000));
  const rocketStats = rocket && 'correctCount' in data ? data : null;
  const wordlyStats = !rocket && 'player' in data ? data : null;
  const players = rocket ? ranking.data?.players : wordlyStats?.players;
  const displayName = wordlyStats?.player.displayName ?? 'Bạn';
  const score = rocketStats?.totalScore ?? wordlyStats?.player.totalScore ?? 0;
  const lives = rocketStats?.livesRemaining ?? wordlyStats?.player.livesRemaining ?? 0;
  return <View className="flex-1 bg-canvas"><ScrollView contentContainerClassName="px-5 pb-12 pt-3"><Pressable onPress={() => router.replace('/games' as never)} className="h-11 w-11 items-center justify-center rounded-full bg-surface"><ArrowLeft size={20} color={colors.ink}/></Pressable><View className="mt-8 items-center rounded-3xl border border-line bg-surface px-6 py-8"><View className="h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: colors.warmSoft }}><Trophy size={31} color={colors.accentWarm}/></View><Text weight="black" className="mt-4 text-2xl">Ván chơi hoàn tất</Text><Text className="mt-2 text-sm text-muted">{rocket ? 'Rocket' : 'Wordly'} · {displayName} · {elapsed} phút</Text><Text weight="black" className="mt-5 text-5xl text-accent">{score}</Text><Text weight="bold" className="mt-1 text-sm text-muted">điểm</Text><View className="mt-6 w-full flex-row justify-around">{rocketStats ? <><Stat icon={<Award size={18} color={colors.success}/>} value={`${rocketStats.correctCount}/${rocketStats.totalRounds}`} label="Câu đúng"/><Stat icon={<Text>♥</Text>} value={`${rocketStats.livesRemaining}`} label="Mạng còn"/><Stat icon={<RotateCcw size={18} color={colors.accent}/>} value={`${rocketStats.answered}`} label="Đã trả lời"/></> : wordlyStats ? <><Stat icon={<Award size={18} color={colors.success}/>} value={`${wordlyStats.player.wordsSolved}/${wordlyStats.player.wordsProcessed}`} label="Từ giải được"/><Stat icon={<Text>♥</Text>} value={`${wordlyStats.player.livesRemaining}`} label="Mạng còn lại"/><Stat icon={<RotateCcw size={18} color={colors.accent}/>} value={`${wordlyStats.player.bestStreak}`} label="Chuỗi tốt nhất"/></> : <Stat icon={<Text>♥</Text>} value={`${lives}`} label="Mạng còn lại"/>}</View></View>{players?.length ? <View className="mt-5 rounded-3xl border border-line bg-surface p-5"><Text weight="bold" className="text-lg">Xếp hạng</Text>{players.map((item) => <View key={item.userId} className="mt-4 flex-row items-center justify-between"><View><Text weight="bold">#{item.rank} {item.displayName ?? 'Người chơi'}</Text><Text className="mt-1 text-xs text-muted">{item.wordsSolved} {rocket ? 'câu đúng' : 'từ'} · {item.livesRemaining} mạng</Text></View><Text weight="black" className="text-base text-accent">{item.totalScore}</Text></View>)}</View> : null}<View className="mt-5 gap-3"><Button label="Chơi tiếp" onPress={() => router.replace('/games' as never)}/><Button label="Về trang chủ" variant="secondary" onPress={() => router.replace('/(tabs)' as never)}/></View></ScrollView></View>;
}
function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) { return <View className="items-center gap-1">{icon}<Text weight="bold" className="text-sm">{value}</Text><Text className="text-center text-[10px] text-muted">{label}</Text></View>; }
