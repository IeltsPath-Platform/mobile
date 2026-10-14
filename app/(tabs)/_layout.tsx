import { useQueryClient } from "@tanstack/react-query";
import { Tabs, useRouter } from "expo-router";
import { Flame, Gem, X, Zap } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Image, Modal, Pressable, View } from "react-native";

import {
  ColorfulTabBar,
  type ColorfulTabBarProps,
} from "@/src/components/navigation/colorful-tab-bar";
import { Text } from "@/src/components/ui/text";
import { learnerStats } from "@/src/features/practice/path";
import { useStreak } from "@/src/features/progress/use-streak";
import { colors } from "@/src/theme";

type StatKey = "streak" | "xp" | "league";

const STAT_META: Record<
  StatKey,
  {
    title: string;
    shortLabel: string;
    description: string;
    tip: string;
    color: string;
    bg: string;
  }
> = {
  streak: {
    title: "Streak · Ngày học liên tiếp",
    shortLabel: "Ngày",
    description:
      "Số ngày bạn duy trì hoàn thành ít nhất 1 bài học không bị ngắt quãng.",
    tip: "Học đều mỗi ngày để giữ lửa sáng và hình thành thói quen ôn IELTS.",
    color: "#ff7624",
    bg: "#fff7ed",
  },
  xp: {
    title: "XP · Điểm kinh nghiệm",
    shortLabel: "XP",
    description:
      "Điểm kinh nghiệm tích lũy mỗi khi bạn hoàn thành bài học trên lộ trình hoặc luyện tập kỹ năng.",
    tip: "Làm đủ các bước trong bài học để nhận trọn vẹn XP.",
    color: "#d97706",
    bg: "#fef3c7",
  },
  league: {
    title: "Hạng · Bảng xếp hạng",
    shortLabel: "Hạng",
    description:
      "Thứ hạng hiện tại của bạn dựa trên điểm tích lũy và tiến độ học tập.",
    tip: "Tích lũy thêm XP mỗi tuần để thăng hạng từ Đồng → Bạc → Vàng.",
    color: "#2563eb",
    bg: "#eff6ff",
  },
};

function MascotAvatar() {
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="IELTSPath"
      className="h-9 w-9 overflow-hidden rounded-full"
      style={{ backgroundColor: "#ff7624" }}
    >
      <Image
        source={require("@/assets/images/icon.png")}
        style={{ width: 36, height: 36 }}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

function StatChip({
  icon,
  value,
  color,
  label,
  onPress,
}: {
  icon: ReactNode;
  value: string | number;
  color: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="h-9 flex-row items-center gap-1 rounded-full px-2 active:bg-slate-100"
    >
      {icon}
      <Text weight="extrabold" className="text-sm" style={{ color }}>
        {value}
      </Text>
    </Pressable>
  );
}

function HeaderStats() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentDays } = useStreak();
  const [activeStat, setActiveStat] = useState<StatKey | null>(null);

  const sessionXp =
    queryClient.getQueryData<number>(["progress", "sessionXp"]) ?? 0;
  const streak = currentDays;
  const xp = learnerStats.xp + sessionXp;
  const league = xp >= 500 ? learnerStats.league : xp >= 200 ? "Bạc" : "Đồng";

  const renderIcon = (key: StatKey, size = 18) => {
    if (key === "streak")
      return (
        <Flame size={size} color="#ff7624" fill="#ff7624" strokeWidth={2.2} />
      );
    if (key === "xp")
      return (
        <Zap size={size} color="#f59e0b" fill="#f59e0b" strokeWidth={2.2} />
      );
    return <Gem size={size} color="#2563eb" strokeWidth={2.2} />;
  };

  const getStatDisplayValue = (key: StatKey) => {
    if (key === "streak") return `${streak} ngày`;
    if (key === "xp") return `${xp} XP`;
    return `Hạng ${league}`;
  };

  return (
    <>
      <View className="flex-row items-center gap-1">
        <StatChip
          icon={renderIcon("streak", 18)}
          value={streak}
          color="#ff7624"
          label={`Streak ${streak} ngày liên tiếp`}
          onPress={() => setActiveStat("streak")}
        />
        <StatChip
          icon={renderIcon("xp", 18)}
          value={xp}
          color="#d97706"
          label={`Điểm kinh nghiệm ${xp} XP`}
          onPress={() => setActiveStat("xp")}
        />
        <StatChip
          icon={renderIcon("league", 17)}
          value={league}
          color="#2563eb"
          label={`Xếp hạng ${league}`}
          onPress={() => setActiveStat("league")}
        />
      </View>

      <Modal
        visible={activeStat !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveStat(null)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/45"
          onPress={() => setActiveStat(null)}
        >
          <Pressable
            className="rounded-t-3xl bg-white px-5 pb-8 pt-5"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="mb-4 h-1.5 w-12 self-center rounded-full bg-slate-200" />

            {activeStat ? (
              <>
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 flex-row items-center gap-3 pr-2">
                    <View
                      className="h-12 w-12 items-center justify-center rounded-2xl"
                      style={{ backgroundColor: STAT_META[activeStat].bg }}
                    >
                      {renderIcon(activeStat, 24)}
                    </View>
                    <View className="flex-1">
                      <Text weight="black" className="text-base text-slate-900">
                        {STAT_META[activeStat].title}
                      </Text>
                      <Text
                        weight="extrabold"
                        className="mt-0.5 text-sm"
                        style={{ color: STAT_META[activeStat].color }}
                      >
                        Hiện tại: {getStatDisplayValue(activeStat)}
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    onPress={() => setActiveStat(null)}
                    hitSlop={10}
                    className="h-8 w-8 items-center justify-center rounded-full bg-slate-100"
                  >
                    <X size={16} color="#64748b" />
                  </Pressable>
                </View>

                <Text className="mt-3 text-sm leading-5 text-slate-600">
                  {STAT_META[activeStat].description}
                </Text>

                {/* Tóm tắt cả 3 chỉ số */}
                <View className="mt-4 flex-row gap-2">
                  {(["streak", "xp", "league"] as StatKey[]).map((key) => {
                    const selected = key === activeStat;
                    return (
                      <Pressable
                        key={key}
                        onPress={() => setActiveStat(key)}
                        className="flex-1 items-center rounded-2xl border p-2.5"
                        style={{
                          borderColor: selected
                            ? STAT_META[key].color
                            : "#e2e8f0",
                          backgroundColor: selected
                            ? STAT_META[key].bg
                            : "#f8fafc",
                        }}
                      >
                        <View className="flex-row items-center gap-1">
                          {renderIcon(key, 15)}
                          <Text
                            weight="extrabold"
                            className="text-xs"
                            style={{ color: STAT_META[key].color }}
                          >
                            {key === "streak"
                              ? streak
                              : key === "xp"
                                ? xp
                                : league}
                          </Text>
                        </View>
                        <Text className="mt-0.5 text-[11px] text-slate-500">
                          {STAT_META[key].shortLabel}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View className="mt-3 rounded-2xl bg-slate-50 px-3.5 py-2.5">
                  <Text className="text-xs leading-4 text-slate-500">
                    Mẹo: {STAT_META[activeStat].tip}
                  </Text>
                </View>

                <View className="mt-5 flex-row gap-2.5">
                  <Pressable
                    onPress={() => setActiveStat(null)}
                    className="flex-1 items-center justify-center rounded-2xl border border-slate-200 py-3 active:bg-slate-50"
                  >
                    <Text weight="extrabold" className="text-sm text-slate-600">
                      Đóng
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setActiveStat(null);
                      router.push("/profile");
                    }}
                    className="flex-1 items-center justify-center rounded-2xl py-3 active:opacity-90"
                    style={{ backgroundColor: "#123ab5" }}
                  >
                    <Text
                      weight="extrabold"
                      className="text-sm"
                      style={{ color: "#ffffff" }}
                    >
                      Xem tiến độ
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => (
        <ColorfulTabBar {...(props as unknown as ColorfulTabBarProps)} />
      )}
      screenOptions={{
        sceneStyle: { backgroundColor: colors.canvas },
        headerStyle: { backgroundColor: colors.surface },
        headerShadowVisible: false,
        headerRight: () => <HeaderStats />,
        headerTitle: () => null,
        headerLeft: () => <MascotAvatar />,
        headerLeftContainerStyle: { paddingLeft: 14 },
        headerRightContainerStyle: { paddingRight: 14 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Học" }} />
      <Tabs.Screen name="practice" options={{ title: "Luyện" }} />
      <Tabs.Screen name="community" options={{ title: "Cộng đồng" }} />
      <Tabs.Screen name="profile" options={{ title: "Tiến độ" }} />
      <Tabs.Screen name="account" options={{ title: "Hồ sơ" }} />
    </Tabs>
  );
}
