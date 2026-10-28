const ID_PATTERN = /^\d{8}-\d{4}-[a-z0-9]{4}$/;

export const isValidId = (id: string) => ID_PATTERN.test(id);

/** `YYYYMMDD-HHmm-xxxx`. 정렬되고, 폴더명에 한글이 들어가지 않는다. */
export function newId(now = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}`;
  const time = `${p(now.getHours())}${p(now.getMinutes())}`;
  const rand = Math.random().toString(36).slice(2, 6).padEnd(4, '0');
  return `${date}-${time}-${rand}`;
}

export function assertValidId(id: string) {
  if (!isValidId(id)) throw new Error(`잘못된 아이디어 id예요: ${id}`);
}
