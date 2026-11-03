import { z } from 'zod';

// 공유 본문: 맥이 허용 목록(spec §3-3)으로 만들어 라벨까지 풀어서 보낸다. 공유 화면은 그리기만 한다.
// 이전 판, 사용량, 도구 결과, 머리말은 이 모양에 칸이 없어서 실을 수 없다 (strict: 모르는 칸이 있으면 거절)
const text = (max: number) => z.string().max(max);
const DOC_MAX = 200_000;
export const PAYLOAD_MAX_BYTES = 1_000_000;

export const sharePayloadSchema = z
  .object({
    v: z.literal(1),
    title: text(200).min(1),
    memo: text(5_000),
    context: z.array(z.object({ label: text(40), value: text(2_000) }).strict()).max(10),
    docs: z.array(z.object({ label: text(40), content: text(DOC_MAX) }).strict()).max(10),
    questions: z.array(z.object({ group: text(60), question: text(400) }).strict()).max(60),
    decisions: z
      .array(
        z
          .object({ question: text(400), status: z.enum(['decided', 'deferred']), answer: text(2_000), reason: text(2_000) })
          .strict(),
      )
      .max(100),
  })
  .strict();

export type SharePayload = z.infer<typeof sharePayloadSchema>;
