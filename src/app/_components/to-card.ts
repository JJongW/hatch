import type { Idea } from '@/lib/storage';

import type { IdeaCardData } from './idea-card';

const dateFormat = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Seoul' });

type Item = { idea: Idea; progress: string; done: number; total: number; evidence?: number; decided?: number; prdReviewed?: boolean };

/** 서버에서 카드용 데이터로 바꾼다 (날짜를 서버에서 포맷해 hydration 차이를 없앤다) */
export const toCard = ({ idea, progress, done, total, evidence = 0, decided = 0, prdReviewed = false }: Item): IdeaCardData => ({
  id: idea.id,
  title: idea.title,
  summary: idea.memo.split('\n')[0] ?? '',
  date: dateFormat.format(new Date(idea.createdAt)),
  progress,
  docs: done > 0 ? { done, total } : null,
  folder: idea.folder,
  // 있는 것만 배지로. 0이면 배지를 만들지 않는다 (없는 진행을 있는 것처럼 보이지 않게)
  facts: [evidence > 0 && `근거 ${evidence}`, decided > 0 && `결정 ${decided}`, prdReviewed && 'PRD 리뷰함'].filter((f): f is string => !!f),
});
