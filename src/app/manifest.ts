import type { MetadataRoute } from 'next';

// 홈 화면에 추가(웹앱 설치)할 때 쓰는 이름과 아이콘
// 브라우저 탭은 favicon.ico와 icon.png, iPhone 홈 화면은 apple-icon.png (모두 이 폴더)
// icon-512는 icon.png와 같은 파일이다. 그림을 바꾸면 두 곳을 같이 바꾼다
// maskable은 안드로이드가 원, 물방울 모양으로 잘라도 그림이 남게 80% 안쪽에 둔 판
// 색은 theme.css --bg-default 라이트 값. manifest는 CSS 변수를 못 쓴다
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Hatch',
    short_name: 'Hatch',
    description: '아이디어 한 줄을 기획안, PRD, 기능명세, 프롬프트로 부화시키는 PO용 아이디어 뱅크',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFFDF7',
    theme_color: '#FFFDF7',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
