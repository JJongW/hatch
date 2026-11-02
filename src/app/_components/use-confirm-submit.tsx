'use client';

import { useRef } from 'react';
import { AlertActionAreaButton, useAlert } from '@montage-ui/core';

import type { FormEvent } from 'react';

type Ask = { title: string; content: string; confirm: string; negative?: boolean };

/**
 * 폼을 보내기 전에 Montage Alert로 묻는다 (`window.confirm` 대신). 확인하면 같은 폼을 다시 보낸다.
 * 사용: `const ask = useConfirmSubmit();` → `<form onSubmit={ask({ title, content, confirm })}>`.
 * 다시 보낼 때는 막지 않으므로, 제출 시점에 하는 일(생성 중 표시 등)은 `e.defaultPrevented`를 보고 한다
 */
export function useConfirmSubmit() {
  const alert = useAlert();
  // 확인 뒤 다시 보내는 제출은 한 번 통과시킨다
  const passed = useRef(false);
  return ({ title, content, confirm, negative }: Ask) =>
    (e: FormEvent<HTMLFormElement>) => {
      if (passed.current) {
        passed.current = false;
        return;
      }
      e.preventDefault();
      const form = e.currentTarget;
      void alert({
        title,
        content,
        // 취소 왼쪽, 확인 오른쪽
        direction: 'reverse',
        confirm: <AlertActionAreaButton variant={negative ? 'negative' : 'normal'}>{confirm}</AlertActionAreaButton>,
        cancel: <AlertActionAreaButton variant="assistive">취소</AlertActionAreaButton>,
      }).then((answer) => {
        if (answer !== 'confirm') return;
        // submit은 동기로 나가 핸들러가 바로 통과시킨다. 폼이 사라져 submit이 안 나가도 다음 제출이 확인 없이 지나가지 않게 되돌린다
        passed.current = true;
        try {
          form.requestSubmit();
        } finally {
          passed.current = false;
        }
      });
    };
}
