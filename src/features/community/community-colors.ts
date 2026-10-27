import type { PostCategory } from './api';
import { colors } from '@/src/theme';

export function communityCategoryColor(category: PostCategory) {
  switch (category) {
    case 'GENERAL': return colors.community.general;
    case 'QUESTION': return colors.community.question;
    case 'DISCUSSION': return colors.community.discussion;
    case 'WRITING_SHARING': return colors.community.writing;
    case 'SPEAKING_PARTNER': return colors.community.speaking;
    case 'RESOURCE_TIPS': return colors.community.resources;
  }
}
