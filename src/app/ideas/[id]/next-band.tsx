"use client";

import Link from "next/link";
import { Box, Button, FlexBox, Typography } from "@montage-ui/core";

import Panel from "@/components/panel";

import type { Doc, DocKey } from "@/lib/storage";
import type { NextAction } from "@/lib/summary";

export type ToolLink = "voc" | "prd-review";

type Props = {
  next: NextAction;
  docs: Doc[];
  ideaId: string;
  onOpenDoc: (key: DocKey) => void;
  /** 있으면 도구 버튼이 주소 이동 대신 이 함수를 부른다 (흐름 체험) */
  goTool?: (tool: ToolLink) => void;
};

type Step = {
  text: string;
  open?: { doc: DocKey; label: string };
  go?: { tool: ToolLink; label: string };
};

function stepOf(next: NextAction, label: (key: DocKey) => string): Step {
  switch (next.kind) {
    case "wait":
      return { text: `${label(next.doc)} 만드는 중이에요.` };
    case "check-stale":
      return {
        text: `앞 문서가 바뀌어서 ${label(next.doc)} 내용이 예전 기준이에요.`,
        open: { doc: next.doc, label: `${label(next.doc)} 확인하기` },
      };
    case "make-doc":
      return {
        text: `다음으로 만들 문서는 ${label(next.doc)}예요.`,
        open: { doc: next.doc, label: `${label(next.doc)} 열기` },
      };
    case "collect-voc":
      return {
        text: "모르는 것이 남았는데 고객 근거가 없어요. 고객 의견부터 모아 봐요.",
        go: { tool: "voc", label: "고객 의견 정리하기" },
      };
    case "review-prd":
      return {
        text: "PRD를 아직 리뷰받지 않았어요.",
        go: { tool: "prd-review", label: "PRD 리뷰 받기" },
      };
    case "done":
      return { text: "문서가 모두 있어요. 바뀐 게 생기면 여기서 알려 줘요." };
  }
}

/** 머리 바로 아래 "다음 할 일" 한 줄 + 주 버튼 하나 (spec detail-dashboard §2-2) */
export default function NextBand({
  next,
  docs,
  ideaId,
  onOpenDoc,
  goTool,
}: Props) {
  const step = stepOf(
    next,
    (key) => docs.find((d) => d.key === key)?.label ?? key,
  );
  return (
    <Box as="section" aria-label="다음 할 일">
      <Panel>
        <FlexBox
          justifyContent="space-between"
          alignItems="center"
          gap="12px"
          sx={{ flexWrap: "wrap" }}
        >
          <FlexBox
            flexDirection="column"
            gap="2px"
            sx={{ minWidth: 0, flex: "1 1 240px" }}
          >
            <Typography
              variant="label2"
              weight="bold"
              color="semantic.foreground.brand.primary"
            >
              다음 할 일
            </Typography>
            <Typography variant="body1" weight="medium">
              {step.text}
            </Typography>
          </FlexBox>
          {step.open && (
            <Button size="medium" onClick={() => onOpenDoc(step.open!.doc)}>
              {step.open.label}
            </Button>
          )}
          {step.go &&
            (goTool ? (
              <Button size="medium" onClick={() => goTool(step.go!.tool)}>
                {step.go.label}
              </Button>
            ) : (
              <Button
                as={Link}
                href={`/tools/${step.go.tool}?idea=${ideaId}`}
                size="medium"
              >
                {step.go.label}
              </Button>
            ))}
        </FlexBox>
      </Panel>
    </Box>
  );
}
