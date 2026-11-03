import { createHash, randomBytes } from 'node:crypto';

// 공유 토큰: 24바이트 난수(192비트)를 base64url로 → 32자 (spec §3-4)
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;

export const newShareToken = () => randomBytes(24).toString('base64url');

/** 형식만 본다. 틀리면 DB를 묻지 않는다 */
export const isShareToken = (token: string) => TOKEN_PATTERN.test(token);

/** DB에는 이 값만 둔다. DB가 새어도 링크를 만들 수 없다 */
export const hashShareToken = (token: string) => createHash('sha256').update(token).digest('hex');
