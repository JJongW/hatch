/** 참가자 설문, 공유 링크처럼 앱 밖 사람이 여는 화면이 그리는 표시. 네비바와 데모 안내를 숨기고 본문을 한 열로 둔다 (app-shell의 :has).
 *  기본 640px, `wide`면 880px(공유 링크 문서). wide-page와 같은 방식. 모양이 하나 더 늘면 페이지가 모양을 직접 넘기는 방식으로 바꾼다 */
export default function FocusPage({ wide = false }: { wide?: boolean }) {
  return <span data-focus-page={wide ? 'wide' : ''} hidden />;
}
