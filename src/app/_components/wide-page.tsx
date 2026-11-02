/** 두 칸 화면, 표 화면처럼 넓게 쓸 화면이 그리는 표시. 앱 셸의 본문 폭이 880px에서 1120px로 넓어진다 (app-shell의 :has).
 *  넓은 화면이 세 곳을 넘거나 폭 단계가 더 필요해지면 페이지가 폭 값을 직접 넘기는 방식으로 바꾼다 */
export default function WidePage() {
  return <span data-wide-page hidden />;
}
