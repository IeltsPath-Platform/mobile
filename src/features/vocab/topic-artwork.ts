import type { VocabularyTopic } from './api';

// Topic covers use the image authored in the catalog when available. These
// curated Unsplash CDN images keep the seeded public topics visually distinct.
const TOPIC_COVERS: Record<string, string> = {
  education: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=900&q=82',
  environment: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=900&q=82',
  technology: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=82',
  health: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=900&q=82',
  'work-business': 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=82',
  society: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=82',
  restaurant: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=82',
  dining: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=82',
  greetings: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=82',
  'basic-communication': 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=82',
  data: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=82',
  argument: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=900&q=82',
  science: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=900&q=82',
  government: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=900&q=82',
  travel: 'https://images.unsplash.com/photo-1488647592970-9f9c7a0b2e8f?auto=format&fit=crop&w=900&q=82',
};

export function topicCover(topic: Pick<VocabularyTopic, 'slug' | 'coverUrl'>) {
  return topic.coverUrl || TOPIC_COVERS[topic.slug.toLowerCase()] || null;
}
