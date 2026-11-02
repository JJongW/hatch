/** 참가자 설문처럼 앱 밖 사람이 여는 화면이 그리는 표시. 네비바와 데모 안내를 숨기고 본문을 640px 한 열로 둔다 (app-shell의 :has).
 *  wide-page와 같은 방식. 화면 모양이 세 가지를 넘으면 페이지가 모양을 직접 넘기는 방식으로 바꾼다 */
export default function FocusPage() {
  return <span data-focus-page hidden />;
}
