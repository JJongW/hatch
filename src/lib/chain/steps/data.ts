import { z } from 'zod';

import { DATA_PROMPT } from '@/lib/prompts/chain/data';

import type { ChainStep } from '../types';

// mermaid 식별자는 한국어를 못 쓰므로 영문 key를 따로 받는다 (개발에서도 그대로 쓰는 이름)
const key = z.string().regex(/^[a-z][a-z0-9_]*$/);

const field = z.object({
  key,
  name: z.string().min(1),
  type: z.enum(['text', 'number', 'boolean', 'date', 'enum', 'file', 'ref']),
  required: z.boolean(),
  example: z.string(),
  screens: z.array(z.string()),
});

const KINDS = { '1:1': '||--||', '1:N': '||--o{', 'N:M': '}o--o{' } as const;

const dupOf = (keys: string[]) => keys.find((k, i) => keys.indexOf(k) !== i);

export const dataSchema = z
  .object({
    entities: z
      .array(z.object({ key, name: z.string().min(1), description: z.string().min(1), fields: z.array(field).min(1) }))
      .min(1),
    relations: z.array(
      z.object({ from: key, to: key, kind: z.enum(['1:1', '1:N', 'N:M']), label: z.string().min(1) }),
    ),
    openQuestions: z.array(z.string()),
  })
  // JSON Schema로 옮겨지지 않는 규칙이라 프롬프트에도 같은 말을 적었다 (prompts/chain/data.ts)
  .superRefine((o, ctx) => {
    const keys = o.entities.map((e) => e.key);
    const dup = dupOf(keys);
    if (dup) ctx.addIssue({ code: 'custom', message: `엔티티 key 중복: ${dup}` });
    for (const e of o.entities) {
      const f = dupOf(e.fields.map((x) => x.key));
      if (f) ctx.addIssue({ code: 'custom', message: `${e.key}의 필드 key 중복: ${f}` });
    }
    for (const r of o.relations) {
      for (const k of [r.from, r.to]) {
        if (!keys.includes(k)) ctx.addIssue({ code: 'custom', message: `관계가 없는 엔티티를 가리킴: ${k}` });
      }
    }
  });

export type DataOutput = z.infer<typeof dataSchema>;

const list = (items: string[]) => items.map((s) => `- ${s}`).join('\n');
/** mermaid 문자열 안에서 " 는 문자열을 닫아 버린다 */
const quote = (s: string) => `"${s.replace(/"/g, "'")}"`;

const diagram = (o: DataOutput) => {
  const entities = o.entities.map((e) => {
    const fields = e.fields.map((f) => `    ${f.type} ${f.key} ${quote(f.required ? `${f.name}, 필수` : f.name)}`);
    return `  ${e.key}[${quote(e.name)}] {\n${fields.join('\n')}\n  }`;
  });
  const relations = o.relations.map((r) => `  ${r.from} ${KINDS[r.kind]} ${r.to} : ${quote(r.label)}`);
  return ['```mermaid', 'erDiagram', ...entities, ...relations, '```'].join('\n');
};

export const dataStep: ChainStep<DataOutput> = {
  key: 'data',
  schema: dataSchema,
  prompt: DATA_PROMPT,
  render: (o) => {
    const nameOf = new Map(o.entities.map((e) => [e.key, e.name]));
    return [
      `## 구성도\n${diagram(o)}`,
      `## 엔티티\n${o.entities
        .map((e) => {
          const fields = e.fields.map(
            (f) =>
              `- **${f.name}** (${f.key}, ${f.type}, ${f.required ? '필수' : '선택'}): 예 "${f.example}", 화면 ${f.screens.join(', ') || '-'}`,
          );
          return `### ${e.name} (${e.key})\n${e.description}\n\n${fields.join('\n')}`;
        })
        .join('\n\n')}`,
      `## 관계\n${list(o.relations.map((r) => `${nameOf.get(r.from)} ${r.kind} ${nameOf.get(r.to)} — ${r.label}`)) || '- 없음'}`,
      `## 확인 필요\n${list(o.openQuestions) || '- 없음'}`,
    ].join('\n\n');
  },
};
