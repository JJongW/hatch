---
version: 1
createdAt: '2026-10-29T06:58:22.831Z'
labels:
  - 취향 입력 항목
  - 예약과 결제 처리 방식
  - 예약 완료 측정 방식
  - 개인정보 동의 정책
  - 지역 밖 입력 처리
  - MVP 포함 여부
  - 빈 결과 처리 방식
  - 첫 출시 지역
  - 예약 전환율 목표
  - 경쟁 서비스 현황
  - 사용자 조사
  - 필수 항목 범위
  - 클래스 이미지 확보
  - 동선 정보 표시 방식
  - 동일 위치 처리
  - 추천 정렬 기준
  - 빈 항목 표시 정책
  - 채널 정보 누락 처리
  - 중복 예약 정책
  - 대시보드 접근 권한
  - 집계 주기
  - 로그인 필요 여부
  - 퇴근 시간 입력 단위
  - 결제 방식과 공방 예약 시스템 연동 범위
  - 공급 현황 조사
  - 첫 출시 지역과 데이터 확보 방식
  - 일정
  - R9 MVP 포함 여부
  - 지도와 경로 기술 선택
  - 우회 허용 기준
items:
  - label: 취향 입력 항목
    kind: customer
    role: ''
    question: 원데이 클래스를 고를 때 무엇을 먼저 보고 어떤 순서로 정하나요?
  - label: 예약과 결제 처리 방식
    kind: owner
    role: 기획
    question: 'MVP에서 예약과 결제를 서비스 안에서 처리하나요, 아니면 공방 예약 채널로 넘기나요?'
  - label: 예약 완료 측정 방식
    kind: owner
    role: 데이터
    question: 공방 채널로 넘긴 예약은 어떤 이벤트를 완료 1건으로 셀까요?
  - label: 개인정보 동의 정책
    kind: owner
    role: 법무
    question: 회사와 집 위치를 받으려면 위치 정보 이용 동의를 따로 받아야 하나요?
  - label: 지역 밖 입력 처리
    kind: owner
    role: 기획
    question: 첫 출시 지역 밖 위치를 입력하면 안내만 하고 진행을 막나요?
  - label: MVP 포함 여부
    kind: owner
    role: 기획
    question: R9 취향과 동선 수정 기능을 MVP에 넣나요?
  - label: 빈 결과 처리 방식
    kind: owner
    role: 기획
    question: '추천 결과가 없을 때 안내 문구 외에 대안을 제시하나요, 제시한다면 무엇인가요?'
  - label: 첫 출시 지역
    kind: owner
    role: 기획
    question: 첫 출시 지역을 어디로 할 것인가?
  - label: 예약 전환율 목표
    kind: owner
    role: 데이터
    question: 대시보드에 기준으로 보여 줄 예약 전환율 목표값은 몇 %인가요?
  - label: 경쟁 서비스 현황
    kind: customer
    role: ''
    question: '원데이 클래스를 찾고 예약할 때 지금 어떤 앱이나 경로를 쓰고, 그때 불편한 점은 무엇인가요?'
  - label: 사용자 조사
    kind: customer
    role: ''
    question: 최근 퇴근 후나 주말 오전에 클래스를 들어 본 적이 있다면 어떻게 찾아서 갔나요?
  - label: 필수 항목 범위
    kind: owner
    role: 기획
    question: 취향 입력 항목 중 필수로 받을 항목은 무엇인가요?
  - label: 클래스 이미지 확보
    kind: owner
    role: 운영
    question: 공방에서 클래스 대표 이미지를 받아 올 수 있나요?
  - label: 동선 정보 표시 방식
    kind: owner
    role: 디자인
    question: 퇴근길 이동 정보에 보여 줄 항목은 무엇인가요?
  - label: 동일 위치 처리
    kind: owner
    role: 기획
    question: 회사와 집 위치가 같으면 입력을 막나요?
  - label: 추천 정렬 기준
    kind: owner
    role: 기획
    question: 추천 목록의 1순위 정렬 기준은 무엇인가요?
  - label: 빈 항목 표시 정책
    kind: owner
    role: 기획
    question: 준비물 등 일부 항목이 비면 해당 항목을 숨기나요?
  - label: 채널 정보 누락 처리
    kind: owner
    role: 기획
    question: 공방 채널 정보가 없는 클래스는 추천에서 빼나요?
  - label: 중복 예약 정책
    kind: owner
    role: 기획
    question: 같은 사용자가 같은 일정에 중복 예약을 요청하면 막나요?
  - label: 대시보드 접근 권한
    kind: owner
    role: 운영
    question: 대시보드에 접근할 수 있는 권한 등급은 무엇인가요?
  - label: 집계 주기
    kind: owner
    role: 데이터
    question: 대시보드 지표 갱신 주기는 얼마인가요?
  - label: 로그인 필요 여부
    kind: owner
    role: 기획
    question: MVP에서 추천을 받으려면 로그인이 필요한가요?
  - label: 퇴근 시간 입력 단위
    kind: customer
    role: ''
    question: 한 주 동안 퇴근 시간이 요일마다 어떻게 달라지나요?
  - label: 결제 방식과 공방 예약 시스템 연동 범위
    kind: owner
    role: 개발
    question: MVP에서 공방 예약 시스템과 실시간 연동을 하나요?
  - label: 공급 현황 조사
    kind: owner
    role: 운영
    question: 첫 출시 지역 공방 중 평일 퇴근 시간대 클래스를 운영하는 곳은 몇 곳인가요?
  - label: 첫 출시 지역과 데이터 확보 방식
    kind: owner
    role: 운영
    question: 첫 출시 지역 클래스 데이터는 운영팀이 대신 입력하는 방식으로 확보하나요?
  - label: 일정
    kind: owner
    role: 기획
    question: MVP 출시 목표일은 언제인가요?
  - label: R9 MVP 포함 여부
    kind: owner
    role: 기획
    question: 동선 요약 화면에 수정 진입점을 MVP부터 넣나요?
  - label: 지도와 경로 기술 선택
    kind: owner
    role: 개발
    question: 퇴근 경로 계산에 쓸 지도, 경로 서비스는 무엇인가요?
  - label: 우회 허용 기준
    kind: owner
    role: 기획
    question: 퇴근 경로에서 들를 수 있다고 볼 최대 추가 이동 시간은 몇 분인가요?
---

