import { z } from 'zod';

/** claude --json-schema는 $schema 키(draft URL)를 못 풀어 실패한다. 최상위 $schema만 뺀다 */
export function toClaudeSchema(schema: z.ZodType): object {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  delete json.$schema;
  return json;
}
