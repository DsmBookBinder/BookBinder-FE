# BookBinder-FE

학교 도서관 희망도서 신청 서비스의 프론트엔드입니다. `BookBinder 와이어프레임`의 10개 화면을 React로 구현했습니다.

## 실행

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 타입 검사 + 프로덕션 빌드 (dist/)
```

## 화면

| 경로 | 화면 | 대상 |
| --- | --- | --- |
| `/` | 소개 페이지 | 모두 |
| `/login`, `/signup` | 로그인 · 회원가입 | 비로그인 |
| `/books` | 도서 검색/신청 | 학생 |
| `/books/:bookId` | 도서 상세 | 학생 |
| `/notifications` | 알림 | 학생 |
| `/mypage` | 마이페이지 (학생) | 학생 |
| `/librarian/requests` | 신청 도서 목록 · 조치 · 내보내기 | 사서 |
| `/librarian/budget` | 총 예산 조회 | 사서 |
| `/librarian/mypage` | 마이페이지 (사서) | 사서 |

로그인하지 않았거나 역할이 다르면 `App.tsx`의 `RequireRole`이 알맞은 화면으로 돌려보냅니다.

## 데모 계정

| 역할 | 아이디 | 비밀번호 |
| --- | --- | --- |
| 학생 | `student` | `student1234` |
| 사서 | `librarian` | `librarian1234` |

개발 서버(`npm run dev`)에서는 로그인 화면 아래에 데모 계정 채우기 · 샘플 데이터 초기화 버튼이 보입니다.

## 구조

```
src/
  App.tsx              라우팅, 역할별 접근 제어
  types.ts             User, Book, BookRequest, Review 등 데이터 타입
  data/seed.ts         샘플 데이터 (도서 24권, 학생 7명, 사서 1명)
  store/db.ts          목(mock) 저장소 — 로그인, 신청, 승인/반려 등 모든 쓰기 동작
  store/selectors.ts   화면에서 쓰는 조회 함수
  lib/                 날짜·금액 포맷, CSV 내보내기
  components/          Header, Modal, 배지·표·페이지네이션 등 공통 UI
  pages/               화면별 컴포넌트 (student/, librarian/)
  styles/global.css    디자인 토큰과 전체 스타일
```

## 아직 목(mock)인 부분

백엔드가 없어서 데이터는 브라우저 `localStorage`(`bookbinder:v1`)에 저장됩니다.

- **API 연동**: `src/store/db.ts`의 함수들을 실제 API 호출로 바꾸면 됩니다. 비밀번호도 지금은 평문으로 저장하니 실서비스에 그대로 쓰면 안 됩니다.
- **도서 검색**: 와이어프레임의 "교내 소장 목록(DLS 엑셀) → 없으면 독서로 검색 연동" 대신 샘플 도서 24권 안에서만 검색합니다. 샘플 도서의 ISBN·가격은 실제와 다를 수 있습니다.
- **엑셀 내보내기**: `.xlsx`가 아니라 엑셀에서 바로 열리는 CSV(UTF-8 BOM) 파일로 내려받습니다.
- **표지 · 대표 이미지**: 표지는 `Book.cover`가 없으면 자리표시로 그립니다.

## 동작 규칙

- 처리 상태는 도서 단위입니다: 대기 → 승인 → 구매완료, 또는 대기 → 반려.
- 상태가 바뀌면 그 책을 신청한 모든 학생에게 알림이 갑니다.
- 구매완료된 책은 교내 소장 도서가 됩니다.
- 학생은 대기 상태일 때만 신청을 취소할 수 있고, 반려된 책은 다시 신청할 수 없습니다.
- 예산은 `단가 × 구매 수량`의 합이며, 가격이 없는 책은 합계에서 빠집니다(예산 화면에서 직접 입력 가능).
