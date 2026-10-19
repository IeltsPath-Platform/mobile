import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Bookmark, CheckCircle2, Flag, Heart, Lightbulb, MessageCircle, MoreHorizontal, Send, ThumbsUp } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { Button } from '@/src/components/ui/button';
import { Card } from '@/src/components/ui/card';
import { Text } from '@/src/components/ui/text';
import { useCurrentUser } from '@/src/features/auth/auth-provider';
import { communityApi, type Comment, type CommunityPost, type ReactionType } from '@/src/features/community/api';
import { CommunityAvatar, CommunityImage } from '@/src/features/community/components/community-image';
import { colors } from '@/src/theme';

const reactions: { type: ReactionType; label: string; Icon: typeof ThumbsUp; color: string }[] = [
  { type: 'LIKE', label: 'Thích', Icon: ThumbsUp, color: '#1877f2' }, { type: 'LOVE', label: 'Yêu thích', Icon: Heart, color: '#e41e3f' },
  { type: 'HELPFUL', label: 'Hữu ích', Icon: Lightbulb, color: '#d97706' }, { type: 'ACCURATE', label: 'Chính xác', Icon: CheckCircle2, color: '#059669' },
];
const backgroundColors: Record<string, string> = { VIOLET: '#5b21b6', CRIMSON: '#9f1239', MIDNIGHT: '#0f172a', SUNSET: '#9a3412', OCEAN: '#075985', FOREST: '#065f46', ROSE: '#86198f', AURORA: '#115e59' };

export default function PostDetailScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>(); const router = useRouter(); const qc = useQueryClient(); const user = useCurrentUser();
  const post = useQuery({ queryKey: ['community', 'detail', postId], queryFn: () => communityApi.post(postId), enabled: Boolean(postId) });
  const comments = useQuery({ queryKey: ['community', 'comments', postId], queryFn: () => communityApi.comments(postId), enabled: Boolean(postId) });
  const [draft, setDraft] = useState(''); const [replyTo, setReplyTo] = useState<Comment>(); const [suggestions, setSuggestions] = useState<{ id: string; displayName: string }[]>([]);
  const [editing, setEditing] = useState<Comment>(); const [editDraft, setEditDraft] = useState(''); const [busy, setBusy] = useState(false);
  const refresh = async () => { await Promise.all([post.refetch(), comments.refetch()]); };
  const sync = async () => { await Promise.all([refresh(), qc.invalidateQueries({ queryKey: ['community', 'feed'] }), qc.invalidateQueries({ queryKey: ['community', 'bookmarks'] })]); };
  const send = async () => {
    if (!draft.trim() || busy) return; setBusy(true);
    try { await communityApi.comment(postId, draft.trim(), replyTo?.parentCommentId ?? replyTo?.id); setDraft(''); setReplyTo(undefined); await sync(); }
    catch (error) { Alert.alert('Không gửi được bình luận', error instanceof Error ? error.message : 'Vui lòng thử lại.'); }
    finally { setBusy(false); }
  };
  const react = async (item: CommunityPost, type: ReactionType) => { try { await (item.myReaction === type ? communityApi.removeReaction(item.id, type) : communityApi.react(item.id, type)); await sync(); } catch (error) { Alert.alert('Không thể thả cảm xúc', error instanceof Error ? error.message : 'Vui lòng thử lại.'); } };
  const report = (type: 'POST' | 'COMMENT', id: string) => Alert.alert(type === 'POST' ? 'Báo cáo bài viết' : 'Báo cáo bình luận', 'Chọn lý do phù hợp:', [
    ...['Spam', 'Nội dung không phù hợp', 'Thông tin sai lệch'].map((reason) => ({ text: reason, onPress: () => void communityApi.report(type, id, reason).then(() => Alert.alert('Đã gửi báo cáo')).catch((error) => Alert.alert('Không gửi được báo cáo', error instanceof Error ? error.message : 'Vui lòng thử lại.')) })),
    { text: 'Hủy', style: 'cancel' },
  ]);
  const saveComment = async () => { if (!editing || !editDraft.trim()) return; try { await communityApi.updateComment(editing.id, editDraft.trim()); setEditing(undefined); setEditDraft(''); await sync(); } catch (error) { Alert.alert('Không thể sửa bình luận', error instanceof Error ? error.message : 'Vui lòng thử lại.'); } };
  const renderComment = (comment: Comment, nested = false) => <View key={comment.id} className={`mt-3 flex-row ${nested ? 'ml-10' : ''}`}>
    <Pressable onPress={() => router.push(`/community/users/${comment.authorId}` as never)}><CommunityAvatar uri={comment.author?.avatarUrl} name={comment.author?.displayName} size={34} /></Pressable>
    <View className="ml-2 flex-1">
      <View className="rounded-2xl bg-slate-100 px-3 py-2.5"><Pressable onPress={() => router.push(`/community/users/${comment.authorId}` as never)}><Text weight="bold" className="text-xs">{comment.author?.displayName ?? 'Thành viên'}</Text></Pressable><Text className="mt-1 text-sm leading-5">{comment.body}</Text></View>
      <View className="mt-1 flex-row items-center gap-4 px-2"><Pressable onPress={() => setReplyTo(comment)}><Text weight="semibold" className="text-xs text-muted">Trả lời</Text></Pressable>{comment.myComment || comment.authorId === user.data?.id ? <><Pressable onPress={() => { setEditing(comment); setEditDraft(comment.body); }}><Text weight="semibold" className="text-xs text-muted">Sửa</Text></Pressable><Pressable onPress={() => Alert.alert('Xóa bình luận?', undefined, [{ text: 'Hủy', style: 'cancel' }, { text: 'Xóa', style: 'destructive', onPress: () => void communityApi.deleteComment(comment.id).then(sync).catch((error) => Alert.alert('Không thể xóa', error instanceof Error ? error.message : 'Vui lòng thử lại.')) }])}><Text weight="semibold" className="text-xs text-muted">Xóa</Text></Pressable></> : <Pressable onPress={() => report('COMMENT', comment.id)}><Text weight="semibold" className="text-xs text-muted">Báo cáo</Text></Pressable>}</View>
      {comment.replyCount > 0 && !nested ? <Replies parent={comment} onReply={setReplyTo} renderComment={renderComment} /> : null}
    </View>
  </View>;
  if (post.isPending) return <View className="flex-1 items-center justify-center bg-canvas"><ActivityIndicator color={colors.accent} /></View>;
  if (post.isError || !post.data) return <View className="flex-1 justify-center bg-canvas px-5"><Text>Không tải được bài viết.</Text><View className="mt-3"><Button label="Thử lại" onPress={() => void refresh()} /></View></View>;
  const item = post.data; const own = item.authorId === user.data?.id;
  const ownerMenu = () => Alert.alert('Quản lý bài viết', undefined, [{ text: 'Sửa', onPress: () => router.push({ pathname: '/community/composer', params: { id: item.id } } as never) }, { text: 'Xóa', style: 'destructive', onPress: () => Alert.alert('Xóa bài viết?', undefined, [{ text: 'Hủy', style: 'cancel' }, { text: 'Xóa', style: 'destructive', onPress: () => void communityApi.delete(item.id).then(async () => { await qc.invalidateQueries({ queryKey: ['community'] }); router.replace('/(tabs)/community' as never); }).catch((error) => Alert.alert('Không thể xóa bài viết', error instanceof Error ? error.message : 'Vui lòng thử lại.')) }]) }, { text: 'Đóng', style: 'cancel' }]);
  return <View className="flex-1 bg-canvas">
    <View className="flex-row items-center border-b border-line bg-white px-4 py-2"><Pressable onPress={() => router.back()} className="h-11 w-11 items-center justify-center rounded-full" accessibilityLabel="Quay lại"><ArrowLeft size={21} color={colors.ink} /></Pressable><Text weight="bold" className="ml-2 flex-1 text-base">Bài viết</Text>{own ? <Pressable onPress={ownerMenu} className="h-11 w-11 items-center justify-center"><MoreHorizontal color={colors.ink} /></Pressable> : null}</View>
    <ScrollView contentContainerClassName="px-4 pb-5 pt-3" refreshControl={<RefreshControl refreshing={post.isRefetching || comments.isRefetching} onRefresh={() => void refresh()} tintColor={colors.accent} />}>
      <View className="overflow-hidden rounded-2xl border border-line bg-white">
        <View className="flex-row items-center px-4 pb-3 pt-4"><Pressable onPress={() => router.push(`/community/users/${item.authorId}` as never)}><CommunityAvatar uri={item.author?.avatarUrl} name={item.author?.displayName} size={44} /></Pressable><View className="ml-3 flex-1"><Pressable onPress={() => router.push(`/community/users/${item.authorId}` as never)}><Text weight="bold" className="text-sm">{item.author?.displayName ?? 'Thành viên'}</Text></Pressable><Text className="mt-0.5 text-xs text-muted">{new Date(item.createdAt).toLocaleString('vi-VN')}</Text></View>{!own ? <Pressable onPress={() => void communityApi.follow(item.authorId, item.followingAuthor).then(sync).catch((error) => Alert.alert('Không thể cập nhật theo dõi', error instanceof Error ? error.message : 'Vui lòng thử lại.'))} className="rounded-full bg-blue-50 px-3 py-2"><Text weight="bold" className="text-xs text-accent">{item.followingAuthor ? 'Đang theo dõi' : 'Theo dõi'}</Text></Pressable> : null}</View>
        {item.title ? <Text weight="bold" className="px-4 pb-1 text-lg">{item.title}</Text> : null}<Text className={`px-4 pb-4 text-sm leading-6 ${item.background && !item.imageUrls.length ? 'py-5 text-white' : ''}`} style={item.background && !item.imageUrls.length ? { backgroundColor: backgroundColors[item.background] ?? colors.accentDeep } : undefined}>{item.body}</Text>
        {item.imageUrls?.map((url, index) => <CommunityImage key={url} uri={url} label={`Ảnh ${index + 1} trong bài viết`} className="mb-1 h-64 w-full" />)}
        {item.videoUrl ? <Pressable onPress={() => void Linking.openURL(item.videoUrl!).catch(() => Alert.alert('Không mở được video'))} className="mx-4 mb-3 min-h-11 flex-row items-center justify-center rounded-xl bg-blue-50"><Text weight="bold" className="text-sm text-accent">Mở video đính kèm ↗</Text></Pressable> : null}
        <View className="mx-4 border-t border-line" />
        <View className="flex-row items-center justify-around px-2 py-1">{reactions.map(({ type, label, Icon, color }) => <Pressable key={type} onPress={() => void react(item, type)} className="min-h-11 flex-1 flex-row items-center justify-center gap-1"><Icon size={18} color={item.myReaction === type ? color : colors.muted} fill={type === 'LOVE' && item.myReaction === type ? color : 'transparent'} /><Text className="text-[10px]" style={{ color: item.myReaction === type ? color : colors.muted }}>{label}</Text></Pressable>)}<Pressable onPress={() => void communityApi.bookmark(item.id, item.bookmarkedByMe).then(sync)} className="h-11 w-10 items-center justify-center"><Bookmark size={18} color={item.bookmarkedByMe ? colors.accent : colors.muted} fill={item.bookmarkedByMe ? colors.accent : 'transparent'} /></Pressable>{!own ? <Pressable onPress={() => report('POST', item.id)} className="h-11 w-10 items-center justify-center"><Flag size={17} color={colors.muted} /></Pressable> : null}</View>
      </View>
      <View className="mt-4 flex-row items-center justify-between"><Text weight="bold" className="text-lg">Bình luận</Text><Text className="text-sm text-muted">{item.commentCount}</Text></View>
      {comments.isPending ? <ActivityIndicator color={colors.accent} className="py-8" /> : comments.isError ? <View className="py-4"><Button label="Tải lại bình luận" onPress={() => void comments.refetch()} /></View> : comments.data?.content.length ? comments.data.content.map((comment) => renderComment(comment)) : <Text className="py-6 text-center text-sm text-muted">Chưa có bình luận. Hãy bắt đầu cuộc trò chuyện.</Text>}
    </ScrollView>
    <View className="border-t border-line bg-white px-4 pb-3 pt-2">{replyTo ? <View className="mb-2 flex-row items-center justify-between"><Text className="text-xs text-muted">Đang trả lời {replyTo.author?.displayName ?? 'thành viên'}</Text><Pressable onPress={() => setReplyTo(undefined)}><Text weight="bold" className="text-xs text-accent">Hủy</Text></Pressable></View> : null}
      {suggestions.length ? <View className="mb-2 rounded-xl border border-line bg-white">{suggestions.map((suggestion) => <Pressable key={suggestion.id} className="p-3" onPress={() => { setDraft((value) => value.replace(/@[\w.-]*$/, `@${suggestion.displayName} `)); setSuggestions([]); }}><Text>{suggestion.displayName}</Text></Pressable>)}</View> : null}
      <View className="flex-row items-center"><TextInput value={draft} onChangeText={(value) => { setDraft(value); const match = value.match(/@([\w.-]*)$/); if (match && match[1].length >= 2) void communityApi.mentionSuggestions(match[1]).then(setSuggestions).catch(() => setSuggestions([])); else setSuggestions([]); }} placeholder={replyTo ? 'Viết câu trả lời…' : 'Viết bình luận…'} placeholderTextColor={colors.muted} className="mr-2 min-h-11 flex-1 rounded-full bg-slate-100 px-4 text-ink" maxLength={5000} /><Pressable disabled={!draft.trim() || busy} onPress={() => void send()} className="h-11 w-11 items-center justify-center rounded-full bg-accent"><Send size={18} color="white" /></Pressable></View>
    </View>
    <Modal visible={Boolean(editing)} transparent animationType="fade" onRequestClose={() => setEditing(undefined)}><View className="flex-1 justify-center bg-black/40 px-5"><View className="rounded-3xl bg-white p-5"><Text weight="extrabold" className="text-lg">Sửa bình luận</Text><TextInput value={editDraft} onChangeText={setEditDraft} multiline className="mt-4 min-h-24 rounded-2xl bg-slate-100 p-3 text-ink"/><View className="mt-4 flex-row gap-3"><View className="flex-1"><Button label="Hủy" variant="secondary" onPress={() => setEditing(undefined)} /></View><View className="flex-1"><Button label="Lưu" disabled={!editDraft.trim()} onPress={() => void saveComment()} /></View></View></View></View></Modal>
  </View>;
}

function Replies({ parent, onReply, renderComment }: { parent: Comment; onReply: (comment: Comment) => void; renderComment: (comment: Comment, nested?: boolean) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const query = useQuery({ queryKey: ['community', 'replies', parent.id], queryFn: () => communityApi.replies(parent.id), enabled: open });
  return <View className="mt-1 px-2"><Pressable onPress={() => setOpen((value) => !value)} className="min-h-8 justify-center"><Text weight="semibold" className="text-xs text-accent">{open ? 'Ẩn phản hồi' : `Xem ${parent.replyCount} phản hồi`}</Text></Pressable>{open ? query.isError ? <Pressable onPress={() => void query.refetch()}><Text className="text-xs text-red-600">Không tải được phản hồi · Thử lại</Text></Pressable> : query.data?.content.map((reply) => <View key={reply.id}>{renderComment(reply, true)}<Pressable onPress={() => onReply({ ...reply, parentCommentId: parent.id })} className="ml-12 mt-1"><Text className="text-xs text-accent">Trả lời</Text></Pressable></View>) : null}</View>;
}
