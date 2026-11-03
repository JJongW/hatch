import { connection } from 'next/server';

import { getShare, shareConfig } from '@/lib/share/store';
import { hashShareToken, isShareToken } from '@/lib/share/token';

import ShareView from './share-view';

import type { Metadata } from 'next';

// 공유 링크: PO가 올린 읽기 전용 사본 (spec 2026-11-03-hosted-po §3-4). 매번 DB에서 읽는다 — 끄면 바로 안 보이게 ('use cache' 쓰지 않음)
export const instant = false;
export const metadata: Metadata = { title: 'Hatch 공유', robots: { index: false, follow: false } };

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const config = shareConfig();
  // 형식 틀림 · 없음 · 끈 링크 · 저장소 오류는 모두 같은 화면 (링크가 있는지 알 수 없게)
  const payload =
    config && isShareToken(token) ? await getShare(config, hashShareToken(token)).catch(() => null) : null;
  return <ShareView payload={payload} />;
}
