/** 읽기 전용 데모(Vercel). 생성은 맥의 claude -p라 인터넷에선 못 한다 → 저장과 생성을 막고 안내만 띄운다 */
export const isDemo = () => process.env.HATCH_DEMO === '1';

export const DEMO_MESSAGE = '데모에서는 저장과 생성을 할 수 없어요. 내 맥에서 실행하면 직접 만들 수 있어요 (README).';

export const REPO_URL = 'https://github.com/JJongW/hatch';

/** 도구 4종 샘플 결과가 모두 들어 있는 데모 아이디어 (demo-data/ideas/). 데모 데이터를 바꾸면 같이 바꾼다 */
export const DEMO_SAMPLE_IDEA = '20261028-1441-n9rp';
