# BookBinder 실제 백엔드 연결

백엔드 `feat/dls-catalog`의 OpenAPI 계약을 사용한다. `VITE_STUDENT_BACKEND=true`로 Vite를 시작하면 공개 로그인·학생 가입, 학생 검색·상세·신청·알림 화면, 사서 신청 관리가 플라스크 서버를 사용한다. 기존 샘플 모드는 환경변수가 꺼져 있을 때 열린다. Vite는 `/api`를 `BOOKBINDER_BACKEND_URL`(기본 `http://127.0.0.1:5000`)로 전달한다.

```sh
VITE_STUDENT_BACKEND=true BOOKBINDER_BACKEND_URL=http://127.0.0.1:5000 npm run dev -- --host 127.0.0.1 --port 5174
```

실제 연동은 일반 로그인 `/login`, 학생 가입 `/signup`, 관리자 로그인 `/admin/login`에서 시작한다. 기존 샘플 계정과 localStorage 세션은 서버 계정과 별도다. 신규 가입은 4자리 학번을 입력하며, 예를 들어 `1407`은 1학년 4반 7번이다. 서버가 학년·반을 검증하고 저장한다.

`/books`는 교내 소장 목록부터 5건씩 보여 준다. 전체 도서는 검색어를 제출하면 결과를 표시한다. ISBN 없는 교내 결과의 상세 URL은 서버가 준 `dls-` 식별자를 사용한다. 전체 검색 결과의 `ownership: UNKNOWN`은 소장 여부 미확인으로 표시하고 신청 버튼을 비활성화한다. 로컬 시연 서버는 `BOOKBINDER_DEMO_ASSUME_UNOWNED`로 미확인 ISBN의 신청을 허용하며, 화면에 시연 모드를 표시한다. 검색·알림·학생 신청 이력에는 번호 버튼 옆에 현재와 전체 페이지를 표시한다.

관리자 계정은 운영자가 백엔드의 `auth create-admin` 명령으로 발급한다. 관리자는 `/admin/requests`의 표에서 필터링·정렬, 일괄 처리·되돌리기, 승인 도서 발주 엑셀 다운로드를 할 수 있다. `/admin/budget`에서 예산과 월별 내역을 확인하고 정가·구매 수량을 수정한다. 공통 `/mypage`는 학생 신청 내역 또는 관리자 처리 현황을 표시한다.

검증 명령은 `node --test tests/student-api.test.mjs`와 `npm run build`다.
