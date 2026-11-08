import { useEffect, useRef, useState } from 'react';
import { Dimensions, Keyboard, Platform, Pressable, TextInput, View, type TextInputInstance, type ViewInstance } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Lightbulb, WifiOff } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfettiBurst } from '@/src/components/effects/confetti-burst';
import { DamageFlash } from '@/src/components/effects/damage-flash';
import { RewardToast } from '@/src/components/effects/reward-toast';
import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { useCurrentUser } from '@/src/features/auth/auth-provider';
import { PRACTICE_HOME } from '@/src/features/games/game-meta';
import { GameStateScreen, ProgressBar, StandingsStrip, TimerPill } from '@/src/features/games/ui/game-ui';
import { UsedLetters } from '@/src/features/games/wordly/used-letters';
import { useWordlyMatch } from '@/src/features/games/wordly/use-wordly-match';
import { WordlyBoard } from '@/src/features/games/wordly/wordly-board';
import { WordlyTopBar } from '@/src/features/games/wordly/wordly-top-bar';
import { colors } from '@/src/theme';
import { useTheme } from '@/src/theme/app-theme';

export default function WordlyMatchScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const user = useCurrentUser();
  const game = useWordlyMatch(matchId);
  const { match, current, word } = game;
  const inputRef = useRef<TextInputInstance>(null);
  const [keyboardUp, setKeyboardUp] = useState(false);

  // Lift the layout by exactly the part of the keyboard that covers it (works with or without OS resizing).
  const rootRef = useRef<ViewInstance>(null);
  const lift = useSharedValue(0);
  const keyboardShown = useRef(false);
  useEffect(() => {
    const lower = (event?: { duration?: number }) => {
      keyboardShown.current = false;
      lift.value = withTiming(0, { duration: event?.duration || 200 });
      setKeyboardUp(false);
    };
    const raise = (event: { endCoordinates: { screenY: number }; duration?: number }) => {
      // iOS also reports a frame change when the keyboard hides: its top edge is the screen bottom.
      if (event.endCoordinates.screenY >= Dimensions.get('window').height) {
        lower(event);
        return;
      }
      keyboardShown.current = true;
      rootRef.current?.measureInWindow((_x, y, _w, h) => {
        // measureInWindow is async: ignore it if the keyboard went away meanwhile.
        if (!keyboardShown.current) return;
        lift.value = withTiming(Math.max(0, y + h - event.endCoordinates.screenY), { duration: event.duration || 220 });
      });
      setKeyboardUp(true);
    };
    const subscriptions =
      Platform.OS === 'ios'
        ? [Keyboard.addListener('keyboardWillShow', raise), Keyboard.addListener('keyboardWillChangeFrame', raise), Keyboard.addListener('keyboardWillHide', lower)]
        : [Keyboard.addListener('keyboardDidShow', raise), Keyboard.addListener('keyboardDidHide', lower)];
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, [lift]);
  const liftStyle = useAnimatedStyle(() => ({ paddingBottom: lift.value }));

  // Bring the keyboard back whenever a new word starts or a submit finishes.
  const wordId = word?.playerWordId;
  const typingOpen = Boolean(word && word.wordStatus === 'ACTIVE' && !game.locked);
  useEffect(() => {
    if (!typingOpen) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(timer);
  }, [wordId, typingOpen]);

  if (match.isPending || current.isPending) {
    return <GameStateScreen loading title="Đang vào ván Wordly…" message="Đang đồng bộ từ và trạng thái của bạn" />;
  }
  if (match.isError || !match.data) {
    return (
      <GameStateScreen
        icon={WifiOff}
        title="Chưa tải được ván chơi"
        message="Kiểm tra kết nối mạng rồi thử lại."
        actions={[
          { label: 'Thử tải lại', onPress: () => { void match.refetch(); void current.refetch(); } },
          { label: 'Về trò chơi', variant: 'secondary', onPress: () => router.replace(PRACTICE_HOME) },
        ]}
      />
    );
  }
  if (!word) {
    return (
      <GameStateScreen
        icon={WifiOff}
        title="Chưa có lượt chơi"
        message="Có thể bạn chưa đến lượt trong ván nhiều người. Hãy đồng bộ lại sau ít giây."
        actions={[
          { label: 'Đồng bộ lại', onPress: () => void current.refetch() },
          { label: 'Về trò chơi', variant: 'secondary', onPress: () => router.replace(PRACTICE_HOME) },
        ]}
      />
    );
  }

  const totalSeconds = match.data.settings?.wordTimeLimitSeconds ?? null;
  const urgent = game.seconds !== null && game.seconds <= 5;
  const hinted = Boolean(word.hint?.hintUsed);
  const hintTint = hinted ? colors.success : colors.xpDeep;
  const message = game.error || game.feedback;
  const messageIsError = Boolean(game.error);

  return (
    <View ref={rootRef} collapsable={false} className="flex-1 bg-canvas">
    <Animated.View className="flex-1" style={liftStyle}>
      <WordlyTopBar
        wordNumber={word.wordNumber}
        wordLimit={word.wordLimit}
        streak={word.player.currentStreak}
        lives={word.player.livesRemaining}
        score={word.player.totalScore}
        leaving={game.leaving}
        onExit={game.confirmLeave}
      />
      {game.seconds !== null && totalSeconds ? (
        <View className="px-4 pb-2">
          <ProgressBar ratio={game.seconds / totalSeconds} color={urgent ? colors.danger : colors.accent} height={4} />
        </View>
      ) : null}
      {game.multiplayer && game.ranking.data ? <StandingsStrip players={game.ranking.data.players} meId={user.data?.id} /> : null}

      <View className="flex-1 justify-center">
      {/* Prompt */}
      <View className="px-5 pb-1 pt-1">
        <View className="flex-row items-center gap-2">
          <Text weight="bold" className="flex-1 text-[11px] uppercase tracking-widest text-muted">
            Đoán từ tiếng Anh · {word.columns} chữ
          </Text>
          {game.seconds !== null ? <TimerPill seconds={game.seconds} /> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hinted ? 'Đã dùng gợi ý' : 'Dùng gợi ý'}
            accessibilityState={{ disabled: game.hintDisabled }}
            disabled={game.hintDisabled}
            onPress={() => void game.useHint()}
            className="h-11 w-11 items-center justify-center rounded-full active:opacity-70"
            style={{ backgroundColor: hinted ? colors.successSoft : colors.warmSoft, opacity: game.hintDisabled && !hinted ? 0.5 : 1 }}
          >
            {hinted ? <Check size={18} color={hintTint} strokeWidth={3} /> : <Lightbulb size={19} color={hintTint} />}
          </Pressable>
        </View>
        <Text weight="black" className="mt-1 text-3xl leading-9">
          {word.meaning}
        </Text>
        {word.hint?.revealedCell ? (
          <Text className="mt-1 text-xs text-muted">
            Gợi ý: chữ thứ {word.hint.revealedCell.column + 1} là{' '}
            <Text weight="black" className="text-xs text-accentDeep">{word.hint.revealedCell.letter.toUpperCase()}</Text>
          </Text>
        ) : !hinted && game.hintReason ? (
          <Text className="mt-1 text-xs text-muted">{game.hintReason}</Text>
        ) : null}
      </View>

      {/* Board: tapping it brings the keyboard up; letters appear directly on the tiles. */}
      <Pressable className="mt-6 shrink" accessibilityRole="button" accessibilityLabel="Chạm để nhập đáp án" onPress={() => inputRef.current?.focus()}>
        <WordlyBoard word={word} guess={game.guess} shakeKey={game.shakeKey} />
      </Pressable>
      </View>

      {/* Hidden input drives the board with the device keyboard. */}
      <TextInput
        ref={inputRef}
        value={game.guess}
        onChangeText={game.changeGuess}
        // Stay editable while a guess is in flight: toggling it would dismiss the keyboard on every submit.
        editable={Boolean(word.wordStatus === 'ACTIVE' && game.myTurn)}
        maxLength={word.columns}
        autoCapitalize="characters"
        autoCorrect={false}
        spellCheck={false}
        autoComplete="off"
        textContentType="none"
        caretHidden
        keyboardType={Platform.OS === 'ios' ? 'ascii-capable' : 'visible-password'}
        keyboardAppearance={isDark ? 'dark' : 'light'}
        returnKeyType="send"
        submitBehavior="submit"
        onSubmitEditing={() => void game.submit()}
        accessibilityLabel={`Nhập đáp án gồm ${word.columns} chữ cái`}
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, bottom: 0 }}
      />

      <UsedLetters statuses={word.keyboard} />

      <View className="gap-2 px-4 pt-2" style={{ paddingBottom: keyboardUp ? 8 : Math.max(insets.bottom, 12) }}>
        <View className="min-h-5 items-center justify-center">
          {!game.myTurn ? (
            <Text weight="bold" className="text-sm text-accentDeep">Đang chờ đến lượt của bạn…</Text>
          ) : message ? (
            <Text
              accessibilityRole={messageIsError ? 'alert' : undefined}
              weight="bold"
              numberOfLines={2}
              className="text-center text-sm"
              style={{ color: messageIsError ? colors.danger : colors.accentDeep }}
            >
              {message}
            </Text>
          ) : (
            <Text className="text-sm text-muted">
              {game.guess.length}/{word.columns} chữ · Lượt {Math.min(word.attemptsUsed + 1, word.maxAttempts)}/{word.maxAttempts}
            </Text>
          )}
        </View>
        <Button label="ĐOÁN" loading={game.busy} disabled={!game.canSubmit} onPress={() => void game.submit()} />
      </View>

      <ConfettiBurst trigger={game.burst.n} size={game.burst.large ? 'large' : 'small'} originY={0.45} />
      <DamageFlash trigger={game.damage} />
      <RewardToast reward={game.reward} onDone={game.clearReward} top={insets.top > 0 ? 56 : 60} />
        </Animated.View>
    </View>
  );
}
