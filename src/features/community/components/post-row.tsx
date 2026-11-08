import { useQueryClient } from '@tanstack/react-query';
import { Bookmark, MessageCircle, MoreHorizontal } from 'lucide-react-native';
import { memo, useEffect, useRef, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { haptics } from '@/src/lib/haptics';
import { colors } from '@/src/theme';

import type { CommunityPost, PublicProfile, ReactionType } from '../api';
import { communityCategoryColor } from '../community-colors';
import { CATEGORY_LABELS, timeAgo, totalReactions } from '../format';
import { reactToPost, toggleBookmark } from '../post-actions';
import { CommunityPostContent } from './community-post-content';
import { CommunityAvatar, CommunityImage } from './community-image';
import { CommunityReactionControl } from './community-reaction-control';
import { HeartBurst } from './heart-burst';

type PostRowProps = {
  post: CommunityPost;
  /** Used when the API omits `author` (e.g. a profile's own post list). */
  authorOverride?: PublicProfile | null;
  onOpen: (postId: string) => void;
  onOpenProfile: (userId: string) => void;
  onMenu: (post: CommunityPost) => void;
};

const DOUBLE_TAP_MS = 260;

/**
 * Edge-to-edge post: no card chrome, a hairline separator, and a compact icon+count action bar.
 * Hold the heart for the reaction tray; double-tap the media to love it.
 */
export const PostRow = memo(function PostRow({ post, authorOverride, onOpen, onOpenProfile, onMenu }: PostRowProps) {
  const qc = useQueryClient();
  const author = post.author ?? authorOverride;
  const category = communityCategoryColor(post.category);
  const images = post.imageUrls ?? [];
  const reactions = totalReactions(post.reactionCounts);
  const myReaction = post.myReaction as ReactionType | null | undefined;
  const [burst, setBurst] = useState(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(tapTimer.current), []);

  // First tap opens the post after a beat; a second tap inside that beat is a "love".
  const onMediaTap = () => {
    if (tapTimer.current) {
      clearTimeout(tapTimer.current);
      tapTimer.current = undefined;
      setBurst((value) => value + 1);
      haptics.tap();
      if (myReaction !== 'LOVE') void reactToPost(qc, post, 'LOVE');
      return;
    }
    tapTimer.current = setTimeout(() => {
      tapTimer.current = undefined;
      onOpen(post.id);
    }, DOUBLE_TAP_MS);
  };

  const label = `Bài của ${author?.displayName ?? 'thành viên'}, ${CATEGORY_LABELS[post.category] ?? ''}, ${post.commentCount} bình luận`;

  return (
    <View className="border-b border-line bg-canvas pb-1 pt-3" accessibilityLabel={label}>
      <View className="flex-row items-center px-4">
        <Pressable onPress={() => onOpenProfile(post.authorId)} accessibilityRole="button" accessibilityLabel={`Hồ sơ ${author?.displayName ?? 'thành viên'}`} hitSlop={4}>
          <CommunityAvatar uri={author?.avatarUrl} name={author?.displayName} size={42} />
        </Pressable>
        <View className="ml-3 flex-1">
          <View className="flex-row items-center">
            <Pressable onPress={() => onOpenProfile(post.authorId)} className="shrink">
              <Text weight="bold" numberOfLines={1} className="text-[15px]">{author?.displayName ?? 'Học viên IELTSPath'}</Text>
            </Pressable>
            <Text className="ml-1.5 text-[13px] text-muted">· {timeAgo(post.createdAt)}</Text>
          </View>
          <View className="mt-1 flex-row items-center">
            <View className="h-2 w-2 rounded-full" style={{ backgroundColor: category.foreground }} />
            <Text weight="semibold" className="ml-1.5 text-xs" style={{ color: category.foreground }}>{CATEGORY_LABELS[post.category] ?? post.category}</Text>
            {post.targetBand != null ? <Text className="ml-2 text-xs text-muted">Band {post.targetBand}</Text> : null}
          </View>
        </View>
        <Pressable onPress={() => onMenu(post)} className="h-11 w-11 items-center justify-center rounded-full active:bg-tint" accessibilityRole="button" accessibilityLabel="Tùy chọn bài viết">
          <MoreHorizontal size={21} color={colors.muted} />
        </Pressable>
      </View>

      <Pressable onPress={() => onOpen(post.id)} className="mt-2.5" accessibilityRole="button" accessibilityLabel="Mở bài viết">
        <CommunityPostContent title={post.title} body={post.body} background={post.background} imageCount={images.length} numberOfLines={6} />
      </Pressable>

      {images.length ? (
        <Pressable onPress={onMediaTap} className="mx-4 mt-1 overflow-hidden rounded-2xl" accessibilityRole="imagebutton" accessibilityLabel={`${images.length} ảnh. Chạm hai lần để thả tim`}>
          <MediaGrid urls={images} />
          <HeartBurst burst={burst} />
        </Pressable>
      ) : null}

      {reactions > 0 || post.commentCount > 0 ? (
        <Text className="mt-2.5 px-4 text-[13px] text-muted">
          {reactions > 0 ? `${reactions} cảm xúc` : ''}{reactions > 0 && post.commentCount > 0 ? ' · ' : ''}{post.commentCount > 0 ? `${post.commentCount} bình luận` : ''}
        </Text>
      ) : null}

      <View className="mt-1 flex-row items-center px-2">
        <CommunityReactionControl compact count={reactions} selected={myReaction} onSelect={(type) => void reactToPost(qc, post, type)} />
        <Pressable onPress={() => onOpen(post.id)} className="min-h-11 min-w-11 flex-row items-center justify-center gap-1.5 rounded-full px-2.5 active:opacity-60" accessibilityRole="button" accessibilityLabel={`Bình luận, ${post.commentCount}`}>
          <MessageCircle size={21} color={colors.muted} />
          {post.commentCount > 0 ? <Text weight="semibold" className="text-[13px] text-muted">{post.commentCount}</Text> : null}
        </Pressable>
        <View className="flex-1" />
        <Pressable
          onPress={() => { haptics.tap(); void toggleBookmark(qc, post); }}
          className="h-11 w-11 items-center justify-center rounded-full active:opacity-60"
          accessibilityRole="button"
          accessibilityLabel={post.bookmarkedByMe ? 'Bỏ lưu bài viết' : 'Lưu bài viết'}
          accessibilityState={{ selected: post.bookmarkedByMe }}>
          <Bookmark size={21} color={post.bookmarkedByMe ? colors.accent : colors.muted} fill={post.bookmarkedByMe ? colors.accent : 'transparent'} />
        </Pressable>
      </View>
    </View>
  );
});

function MediaGrid({ urls }: { urls: string[] }) {
  if (urls.length === 1) {
    return <SinglePostImage uri={urls[0]} />;
  }
  const shown = urls.slice(0, 3);
  const extra = urls.length - shown.length;
  return (
    <View className="h-44 flex-row gap-1">
      {shown.map((url, index) => (
        <View key={`${url}-${index}`} className={index === 0 && shown.length === 3 ? 'flex-[2]' : 'flex-1'}>
          <CommunityImage uri={url} label={`Ảnh ${index + 1} trong bài viết`} className="h-full w-full" />
          {index === shown.length - 1 && extra > 0 ? (
            <View className="absolute inset-0 items-center justify-center bg-black/45">
              <Text weight="black" className="text-2xl text-white">+{extra}</Text>
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function SinglePostImage({ uri }: { uri: string }) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const frameWidth = Math.max(1, screenWidth - 32);
  const maxHeight = Math.max(240, screenHeight * 0.72);
  const aspectRatio = dimensions ? dimensions.width / dimensions.height : null;
  const imageHeight = aspectRatio ? Math.min(frameWidth / aspectRatio, maxHeight) : Math.min(256, maxHeight);
  const imageWidth = aspectRatio ? Math.min(frameWidth, imageHeight * aspectRatio) : frameWidth;

  return (
    <View className="w-full items-center justify-center bg-surface" style={{ height: imageHeight }}>
      <CommunityImage
        uri={uri}
        label="Ảnh trong bài viết"
        resizeMode="contain"
        style={{ width: imageWidth, height: imageHeight }}
        onLoad={({ source }) => {
          if (source.width > 0 && source.height > 0) {
            setDimensions((current) => current?.width === source.width && current.height === source.height
              ? current
              : { width: source.width, height: source.height });
          }
        }}
      />
    </View>
  );
}
