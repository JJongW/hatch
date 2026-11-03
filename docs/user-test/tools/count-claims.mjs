// 사용 예: node docs/user-test/tools/count-claims.mjs <폴더>   (폴더에 plan.md · roadmap.md · prd.md)
// 판단 없이 코드로만 센다. 숫자+단위("30%", "3개월", "500명")를 "단정 수치"로 보고, [확인 필요: …] 안의 것은 빼고 센다.
// 근사치다: 입력에 원래 있던 숫자, 날짜 · 버전 같은 것도 섞일 수 있어 사람이 샘플을 같이 본다
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];
if (!dir) throw new Error('폴더를 주세요');
const UNIT = '(?:%|퍼센트|명|원|만\\s?원|천|억|개월|주|일|시간|분|초|배|건|회|개|곳|MAU|DAU)';
// 빼는 것: '1건당'(단위 표현), '3. 회원' · '1.2 배경' · '10. 일정'(목록 · 절 번호)
const NUM = new RegExp(`\\d[\\d,]*(?:\\.\\d+)?\\s?${UNIT}(?!당|원|경|정)`, 'g');
const TBD = /\[확인 필요[^\]]*\]/g;
const strip = (s) => s.replace(/^---\n[\s\S]*?\n---\n/, ''); // Hatch 문서 머리말
const claims = (t) => (t.replace(TBD, ' ').match(NUM) ?? []).map((x) => x.replace(/\s/g, ''));

const docs = Object.fromEntries(['plan', 'roadmap', 'prd'].map((k) => [k, strip(fs.readFileSync(path.join(dir, `${k}.md`), 'utf8'))]));
const per = Object.fromEntries(Object.entries(docs).map(([k, t]) => [k, { chars: t.length, tbd: (t.match(TBD) ?? []).length, claims: claims(t).length }]));
const upstream = new Set([...claims(docs.plan), ...claims(docs.roadmap)]);
const newInPrd = [...new Set(claims(docs.prd))].filter((c) => !upstream.has(c));
console.log(JSON.stringify({ per, newInPrd: newInPrd.length, newInPrdSample: newInPrd.slice(0, 10) }, null, 2));
