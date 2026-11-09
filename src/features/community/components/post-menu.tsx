import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Flag, Pencil, Trash2, UserCheck, UserPlus } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { ActionSheet, type ActionSheetItem } from '@/src/components/ui/action-sheet';

import type { CommunityPost } from '../api';
import { REPORT_REASONS, deletePost, reportContent, toggleFollowAuthor } from '../post-actions';

/**
 * Shared "more" menu for posts (feed, saved, profile, detail).
 * Returns `open(post)` plus the sheets to render once at the screen root.
 */
export function usePostMenu(currentUserId?: string, onDeleted?: () => void) {
  const qc = useQueryClient();
  const router = useRouter();
  const [menuPost, setMenuPost] = useState<CommunityPost | null>(null);
  const [reportPost, setReportPost] = useState<CommunityPost | null>(null);

  const open = useCallback((post: CommunityPost) => setMenuPost(post), []);
  const closeMenu = useCallback(() => setMenuPost(null), []);

  const items: ActionSheetItem[] = [];
  if (menuPost) {
    const post = menuPost;
    if (post.authorId === currentUserId) {
      items.push(
        { label: 'Sửa bài viết', icon: Pencil, onPress: () => router.push({ pathname: '/community/composer', params: { id: post.id } } as never) },
        {
          label: 'Xóa bài viết',
          icon: Trash2,
          destructive: true,
          onPress: () => Alert.alert('Xóa bài viết?', 'Bài viết sẽ bị gỡ khỏi cộng đồng và không thể khôi phục.', [
            { text: 'Hủy', style: 'cancel' },
            { text: 'Xóa', style: 'destructive', onPress: () => void deletePost(qc, post, onDeleted) },
          ]),
        },
      );
    } else {
      items.push(
        {
          label: post.followingAuthor ? 'Bỏ theo dõi' : `Theo dõi ${post.author?.displayName ?? 'tác giả'}`,
          icon: post.followingAuthor ? UserCheck : UserPlus,
          onPress: () => void toggleFollowAuthor(qc, post),
        },
        // iOS cannot present a second modal while the first is still dismissing.
        { label: 'Báo cáo bài viết', icon: Flag, destructive: true, onPress: () => { setTimeout(() => setReportPost(post), 280); } },
      );
    }
  }

  const element = (
    <>
      <ActionSheet visible={Boolean(menuPost)} title="Tùy chọn bài viết" items={items} onClose={closeMenu} />
      <ActionSheet
        visible={Boolean(reportPost)}
        title="Lý do báo cáo"
        items={REPORT_REASONS.map((reason) => ({
          label: reason,
          onPress: () => { if (reportPost) void reportContent('POST', reportPost.id, reason); },
        }))}
        onClose={() => setReportPost(null)}
      />
    </>
  );

  return { open, element };
}
