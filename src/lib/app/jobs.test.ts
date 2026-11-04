import { beforeEach, describe, expect, it } from 'vitest';

import { docJob, FINISHED_MAX, jobsSnapshot, questionsJob, resetJobsForTest, startJob, toolJob, toolResultPath } from './jobs';

beforeEach(() => resetJobsForTest());

describe('작업 목록', () => {
  it('시작하면 running, 끝나면 finished로 옮긴다', () => {
    const done = startJob(docJob('i1', 'PT 예약 앱', 'PRD'));
    expect(jobsSnapshot().running).toMatchObject([{ ideaId: 'i1', title: 'PT 예약 앱', doing: 'PRD 만드는 중' }]);
    done({ ok: true });
    const { running, finished } = jobsSnapshot();
    expect(running).toEqual([]);
    expect(finished).toMatchObject([{ ideaId: 'i1', title: 'PT 예약 앱', body: 'PRD를 만들었어요', ok: true, path: '/ideas/i1' }]);
    expect(finished[0].id).toBeTruthy();
  });

  it('실패하면 이유를 알림 본문에 붙인다', () => {
    startJob(docJob('i1', 'PT 예약 앱', '기획안'))({ ok: false, message: '5분 안에 끝나지 않았어요. 다시 만들어 주세요.' });
    expect(jobsSnapshot().finished[0]).toMatchObject({ ok: false, body: '기획안을 만들지 못했어요. 5분 안에 끝나지 않았어요. 다시 만들어 주세요.' });
  });

  it('끝을 두 번 알려도 한 번만 남긴다', () => {
    const done = startJob(questionsJob('i1', '앱'));
    done({ ok: true });
    done({ ok: false, message: 'x' });
    expect(jobsSnapshot().finished).toHaveLength(1);
  });

  it(`finished는 새것부터 ${FINISHED_MAX}개까지`, () => {
    for (let i = 0; i < FINISHED_MAX + 3; i++) startJob(docJob(`i${i}`, `앱${i}`, 'PRD'))({ ok: true });
    const { finished } = jobsSnapshot();
    expect(finished).toHaveLength(FINISHED_MAX);
    expect(finished[0].ideaId).toBe(`i${FINISHED_MAX + 2}`);
  });

  it('도구는 끝날 때 결과 주소로 바꿀 수 있다', () => {
    const done = startJob(toolJob('voc', 'VOC 우선순위', null, null));
    expect(jobsSnapshot().running[0]).toMatchObject({ title: 'VOC 우선순위', doing: 'VOC 우선순위 실행 중' });
    done({ ok: true, path: toolResultPath('voc', null, 'r1') });
    expect(jobsSnapshot().finished[0]).toMatchObject({ body: 'VOC 우선순위 결과가 나왔어요', path: '/tools/voc?result=r1' });
  });
});

describe('알림 문구', () => {
  it('받침에 맞춰 을/를', () => {
    expect(docJob('i', 't', '개발 로드맵').doneText).toBe('개발 로드맵을 만들었어요');
    expect(docJob('i', 't', '기능명세').doneText).toBe('기능명세를 만들었어요');
    expect(docJob('i', 't', 'PRD').doneText).toBe('PRD를 만들었어요');
    expect(toolJob('negotiation', '이해관계자 협상', null, null).failText).toBe('이해관계자 협상을 실행하지 못했어요.');
  });
  it('확인 질문은 아이디어 상세로', () => {
    expect(questionsJob('i9', '앱')).toMatchObject({ doing: '확인 질문 만드는 중', doneText: '확인 질문을 만들었어요', path: '/ideas/i9' });
  });
  it('아이디어 문서로 돌린 도구는 아이디어 제목이 알림 제목, 주소에 idea가 붙는다', () => {
    expect(toolJob('prd-review', 'PRD 리뷰 위원회', 'i2', 'PT 예약 앱')).toMatchObject({ title: 'PT 예약 앱', path: '/tools/prd-review?idea=i2' });
    expect(toolResultPath('prd-review', 'i2', 'r5')).toBe('/tools/prd-review?idea=i2&result=r5');
  });
});
