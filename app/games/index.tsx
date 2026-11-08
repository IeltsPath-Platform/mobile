import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/src/components/navigation/back-header';
import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { GAME_META } from '@/src/features/games/game-meta';
import { SetupForm } from '@/src/features/games/setup/setup-form';
import { ActiveGameBanner, GamePicker, JoinRoomCard } from '@/src/features/games/setup/setup-sections';
import { useGameSetup } from '@/src/features/games/setup/use-game-setup';
import { colors } from '@/src/theme';

export default function GameCatalogScreen() {
  const setup = useGameSetup();
  const insets = useSafeAreaInsets();
  const { kind, currentGame, catalog, enabled } = setup;
  const hasActive = Boolean(setup.active.data);
  const showForm = Boolean(kind && currentGame);

  const summary = !kind
    ? ''
    : kind === 'ROCKET'
      ? `${setup.questionCount} câu`
      : setup.playMode === 'ENDLESS'
        ? 'Vô hạn'
        : `${setup.wordLimit} từ`;

  return (
    <View className="flex-1 bg-canvas">
      <View className="flex-row items-center gap-3 px-4 pb-2 pt-1">
        <BackButton fallbackHref="/(tabs)/practice" />
        <View className="flex-1">
          <Text weight="bold" className="text-[11px] uppercase tracking-widest text-accent">Trò chơi</Text>
          <Text accessibilityRole="header" weight="black" className="text-2xl">
            {kind ? GAME_META[kind].name : 'Chọn trò chơi'}
          </Text>
        </View>
        {kind && !setup.requestedKind ? (
          <Pressable accessibilityRole="button" onPress={() => setup.selectKind(null)} className="min-h-11 justify-center px-2">
            <Text weight="semibold" className="text-sm text-accent">Đổi trò</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: showForm ? 24 : Math.max(insets.bottom, 16) + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {!enabled ? (
          <View className="mt-4 rounded-3xl border border-line bg-surface p-5">
            <Text weight="bold">Đăng nhập để chơi</Text>
            <Text className="mt-2 text-sm text-muted">Phòng chơi và kết quả sẽ được đồng bộ với tài khoản.</Text>
            <Button className="mt-4" label="Đăng nhập" onPress={() => setup.router.push('/(auth)/login' as never)} />
          </View>
        ) : null}

        <ActiveGameBanner setup={setup} />

        {enabled && catalog.isPending ? <ActivityIndicator className="py-10" color={colors.accent} /> : null}
        {enabled && catalog.isError ? (
          <View className="mt-4 rounded-3xl border border-line bg-surface p-5">
            <Text weight="bold">Không tải được danh sách trò chơi</Text>
            <Text className="mt-2 text-sm text-muted">{catalog.error.message}</Text>
            <Button className="mt-4" variant="secondary" label="Thử lại" onPress={() => void catalog.refetch()} />
          </View>
        ) : null}

        {enabled && catalog.isSuccess ? (
          <>
            {!kind ? <GamePicker setup={setup} /> : null}
            {kind && !currentGame ? (
              <View className="mt-4 rounded-3xl border border-line bg-surface p-5">
                <Text weight="bold">Trò chơi này chưa sẵn sàng</Text>
                <Text className="mt-2 text-sm text-muted">Hãy chọn trò khác hoặc quay lại sau.</Text>
                <Button className="mt-4" variant="secondary" label="Chọn trò khác" onPress={() => setup.selectKind(null)} />
              </View>
            ) : null}
            {showForm && kind ? <SetupForm setup={setup} kind={kind} /> : null}
            <JoinRoomCard setup={setup} />
            {setup.error && !showForm ? (
              <Text accessibilityRole="alert" className="mt-3 text-center text-sm text-danger">{setup.error}</Text>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      {showForm && enabled ? (
        <View className="gap-2 border-t border-line bg-surface px-4 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
          {setup.error ? <Text accessibilityRole="alert" className="text-center text-sm text-danger">{setup.error}</Text> : null}
          {hasActive ? <Text className="text-center text-xs text-muted">Hoàn tất hoặc rời ván đang chơi trước khi tạo ván mới.</Text> : null}
          <Button
            label={setup.mode === 'SOLO' ? `Bắt đầu chơi · ${summary}` : 'Tạo phòng bạn bè'}
            loading={setup.create.isPending}
            loadingLabel="Đang tạo…"
            disabled={!currentGame || hasActive || setup.insufficientWords}
            onPress={() => {
              setup.clearError();
              setup.create.mutate();
            }}
          />
        </View>
      ) : null}
    </View>
  );
}
