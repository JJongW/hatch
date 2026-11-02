# Montage 사용 점검: 화면별로 직접 그린 것과 바꿀 컴포넌트 (2026-11-02)

## 1. 결론
디자인 시스템은 Montage로 정했지만, 화면은 대부분 원시 요소(Box, FlexBox, Typography)에 테두리와 여백을 손으로 입혀 만들었다.
그래서 색과 글꼴은 Montage인데, 섹션 구분, 카드, 목록, 위계 같은 "정돈"을 해 주는 부품이 빠져 있다.
고칠 것은 시스템 선택이 아니라 **Montage 컴포넌트를 실제로 쓰는 것**이다.

## 2. 지금 숫자 (`src/app`, `.tsx` 33개 파일)
| 구분 | 쓴 횟수 |
| --- | --- |
| 원시 요소 FlexBox, Typography, Box | 67 |
| Button | 12 |
| SectionMessage, TextArea, TextField 등 입력 | 약 25 |
| Card, ListCell, Tab, Table, Divider, SegmentedControl | 각 1~2 |
| SectionHeader, ListCard, List, Accordion, ProgressTracker, Toast, Snackbar, Alert, Tooltip, Modal, Menu, Avatar, Thumbnail | **0** |

손으로 그린 테두리 상자 5곳, 손으로 그린 섹션 제목 여러 벌(`SectionTitle`, `PageHeader`, 도구 틀과 사용량 화면의 직접 h2), `window.confirm` 3곳, 복사 알림 글자 바꾸기 2곳, 직접 그린 표 2곳.

## 3. 화면 전체에 걸친 것 (먼저 바꾸면 모든 화면이 같이 좋아진다)
| 직접 그린 것 | 위치 | 바꿀 컴포넌트 |
| --- | --- | --- |
| 섹션 제목 (h2 + margin 40px) | `section-title.tsx`, `tool-frame.tsx:47`, `usage-view.tsx:72,106`, `survey-form.tsx:124` | `SectionHeader` (headingContent, trailingContent에 수정 버튼) |
| 페이지 머리 (제목 + 설명) | `page-header.tsx` | `SectionHeader` 큰 크기 또는 Typography 위계 정리 (title1, body2 secondary) |
| 테두리 상자 (border 1px + radius 12px) 5곳 복사본 | `idea-summary.tsx:27`, `tool-frame.tsx:52`, `code-block.tsx:20`, `mermaid-block.tsx:67`, `usage-view.tsx:41` | 공용 `Panel` 하나 (`src/components/panel/index.tsx`, Montage 토큰). Montage `Card`는 썸네일, 제목, 캡션을 가진 콘텐츠 카드라 테두리 묶음 상자로 쓰지 않는다 |
| `window.confirm` (휴지통, 다시 만들기, 결정 지우기) | `idea-detail.tsx:79`, `doc-card.tsx:63`, `idea-summary.tsx:186` | `Alert` (AlertHeading, AlertDescription, AlertActionArea) |
| 복사 버튼 글자를 "복사했어요"로 바꾸기 | `code-block.tsx:76`, `mermaid-block.tsx:79` | `Toast` (복사했어요) + 버튼은 그대로 |
| 글머리표 목록 (ul + disc) | `idea-summary`, `questions-panel`, `context-panel`, `start-guide` | `List` + `ListCell` (description에 출처, trailingContent에 버튼) |

## 4. 화면별
### 아이디어 상세 `/ideas/[id]` (가장 심함)
| 지금 | 바꿀 것 |
| --- | --- |
| 섹션이 한 줄로 이어 붙음, 간격 기준 없음 | 목업 구조: 머리 → 다음 할 일 → 현황 → 본문 탭 |
| 프로젝트 맥락 글머리표 | 머리 아래 `Chip`(읽기 전용) 또는 `ContentBadge` 줄 |
| 추천 다음 행동이 카드 4칸 중 하나 | 맨 위 `Panel` 한 장 + 주 버튼 하나 |
| 요약 4칸 손 그린 상자 | 현황 3칸 `Panel` (숫자 + 캡션), 누르면 탭 이동 |
| 확인 질문 29줄 글머리표 | 탭 안 `Accordion`(고객, 담당자 역할별) + `List`/`ListCell`(질문, description에 출처, trailing에 답 적기) |
| 결정 칸 글머리표 | 탭 안 `List`/`ListCell`, 정한 것은 `labelTrailing`에 결정 값 |
| 문서 탭 7개 가로 + 손 그린 점 | 세로 `List`/`ListCell`(selected, trailing에 상태 `ContentBadge`) + 오른쪽 본문. 좁으면 `Category` 가로 스크롤 |
| 사용량 줄 떠 있음 | 머리 오른쪽 캡션 |
| `window.confirm` 2곳 | `Alert` |

### 도구 4종 `/tools/*` (공통 틀)
| 지금 | 바꿀 것 |
| --- | --- |
| 섹션 제목 직접 h2 | `SectionHeader` |
| 결과 상자 손 그린 테두리 | `Panel` |
| 재리뷰 비교 표, VOC 표 직접 `table` | Montage `Table` (사용량 화면이 이미 씀) |
| 지난 결과 `ListCell` | 그대로 (이미 Montage) |
| 실행 중 안내 `running-note` 왼쪽 선 손 그림 | `ProgressTracker` vertical 또는 `ProgressStepIndicator` |

### 문서 본문 (`doc-markdown`, 상세와 도구 결과가 같이 씀)
| 지금 | 바꿀 것 |
| --- | --- |
| h1과 h2가 같은 크기(headline1) | h1 title3, h2 headline1, h3 headline2로 위계 |
| 목록, 문단 간격 제각각 | body1, 문단 12px, 목록 8px로 통일 |
| 마크다운 표가 생기면 기본 표 | `Table` 매핑 |
| `[확인 필요: …]`가 그냥 글자 | `ContentBadge` (주의 색) 로 강조 |

### 아이디어 모음 `/ideas`
| 지금 | 바꿀 것 |
| --- | --- |
| `Card` 사용 (콘텐츠 카드라 맞는 쓰임) | 그대로 |
| 폴더 `Chip` | 그대로 |
| 빈 화면 `FallbackView` | 그대로 (이미 Montage) |

### 쓰기 `/`, 설문 `/survey`, 시작 `/start`, 사용량 `/usage`
| 화면 | 지금 | 바꿀 것 |
| --- | --- | --- |
| 쓰기 | 입력은 Montage | 섹션 제목만 `SectionHeader` |
| 설문 | 섹션 제목 직접 h2 | `SectionHeader`, 문항 묶음 `Panel` |
| 시작 | 글머리표 목록 | `List`/`ListCell`, 실행 순서는 `Stepper` |
| 사용량 | 숫자 상자 손 그림 | `Panel`, 표는 이미 `Table` |

## 5. 나누는 순서 (PR 하나 = 이슈 하나)
1. **공통 부품** (15파일 안으로 둘로 나눔)
   - 1a: 섹션 제목과 페이지 머리를 `SectionHeader`로, 테두리 상자를 공용 `Panel`로
   - 1b: `window.confirm`을 `Alert`로, 복사 알림을 `Toast`로
2. **아이디어 상세 재구성**: 4절 첫 표 (화면 구조 변경, spec 먼저)
3. **문서 본문 위계**: `doc-markdown`
4. **도구 화면**: 표를 `Table`로, 실행 중 안내를 `ProgressTracker`로
5. **나머지 화면**: 설문, 시작, 사용량

각 PR은 agent-browser로 데스크톱과 iPhone 14 폭 전후 캡처를 남긴다.

## 6. 하지 않는 것
- TDS 패키지와 토큰 추가 (2026-10-28 결정 유지: 섞으면 같은 화면에서 버튼 모양이 갈린다)
- Montage에 없는 부품을 새로 만드는 것 (필요해지면 먼저 Montage에서 조합 가능한지 확인)
