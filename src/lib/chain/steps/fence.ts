/** 본문을 ~~~text 펜스로 감싼다. 본문 안 가장 긴 ~ 연속보다 하나 길게 해서 중간에 닫히지 않게 한다 */
export const fenced = (body: string) => {
  const longest = Math.max(2, ...(body.match(/~+/g) ?? []).map((m) => m.length));
  const fence = '~'.repeat(longest + 1);
  return `${fence}text\n${body}\n${fence}`;
};
