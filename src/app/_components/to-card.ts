import type { Idea } from '@/lib/storage';

import type { IdeaCardData } from './idea-card';

const dateFormat = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Seoul' });

/** 서버에서 카드용 데이터로 바꾼다 (날짜를 서버에서 포맷해 hydration 차이를 없앤다) */
export const toCard = ({ idea, progress }: { idea: Idea; progress: string }): IdeaCardData => ({
  id: idea.id,
  title: idea.title,
  summary: idea.memo.split('\n')[0] ?? '',
  date: dateFormat.format(new Date(idea.createdAt)),
  progress,
  folder: idea.folder,
});
