// 백엔드가 붙기 전까지 쓰는 샘플 데이터.
// 도서 정보(ISBN·가격 등)는 화면 확인용이라 실제와 다를 수 있다.
import type { Book, BookRequest, Db, LogEntry, Notification, Review, Status, User } from "../types";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** 데모 계정 — README에도 같은 값이 적혀 있다. */
export const DEMO_ACCOUNTS = {
  student: { loginId: "student", password: "student1234" },
  librarian: { loginId: "librarian", password: "librarian1234" },
} as const;

type BookSeed = [
  title: string,
  author: string,
  publisher: string,
  pubDate: string,
  isbn: string,
  price: number | null,
  owned: boolean,
  description: string,
];

const BOOKS: BookSeed[] = [
  ["소년이 온다", "한강", "창비", "2014.05.19", "9788936434120", 15000, false, "1980년 5월 광주에서 벌어진 일을, 남겨진 사람들의 목소리로 따라가는 장편소설."],
  ["불편한 편의점", "김호연", "나무옆의자", "2021.04.20", "9791161571188", 14000, false, "서울역 노숙인이 동네 편의점 야간 알바를 맡으며 이웃들과 가까워지는 이야기."],
  ["물고기는 존재하지 않는다", "룰루 밀러", "곰출판", "2021.12.17", "9791189327156", 17000, false, "한 분류학자의 삶을 추적하다 질서와 혼돈에 대한 믿음을 다시 묻게 되는 논픽션."],
  ["클린 코드", "로버트 C. 마틴", "인사이트", "2013.12.24", "9788966260959", 33000, false, "읽기 좋은 코드를 쓰기 위한 원칙과 사례를 정리한 프로그래밍 교양서."],
  ["달러구트 꿈 백화점", "이미예", "팩토리나인", "2020.07.08", "9791165341909", 13800, false, "잠들어야만 들어갈 수 있는 꿈 백화점에서 일하게 된 신입 직원의 이야기."],
  ["긴긴밤", "루리", "문학동네", "2021.02.03", "9788954677158", 11500, false, "세상에 하나 남은 흰바위코뿔소와 어린 펭귄이 바다를 찾아 떠나는 여정."],
  ["사피엔스", "유발 하라리", "김영사", "2015.11.24", "9788934972464", 22000, false, "인지·농업·과학 혁명을 축으로 인류의 역사를 훑어보는 교양서."],
  ["혼자 공부하는 파이썬", "윤인성", "한빛미디어", "2022.06.01", "9791162245651", 22000, false, "프로그래밍이 처음인 독자를 위한 파이썬 입문서."],
  ["모순", "양귀자", "쓰다", "2013.04.01", "9788998441012", null, false, "스물다섯 살 안진진이 자기 삶의 모순을 들여다보며 선택을 해 나가는 장편소설."],
  ["페인트", "이희영", "창비", "2019.04.19", "9788936456894", 12000, true, "부모를 직접 면접해 고를 수 있는 근미래를 그린 청소년 소설."],
  ["미움받을 용기", "기시미 이치로, 고가 후미타케", "인플루엔셜", "2014.11.17", "9788996991342", 14900, false, "철학자와 청년의 대화로 아들러 심리학을 풀어 쓴 책."],
  ["이기적 유전자", "리처드 도킨스", "을유문화사", "2018.10.20", "9788932473901", 20000, true, "유전자의 관점에서 진화와 생물의 행동을 설명하는 과학 교양서."],
  ["데미안", "헤르만 헤세", "민음사", "2000.12.20", "9788937460449", 8000, true, "소년 싱클레어가 자기 자신에게 이르는 길을 찾아가는 성장소설."],
  ["아몬드", "손원평", "창비", "2017.03.31", "9788936434267", 12000, true, "감정을 느끼지 못하는 소년 윤재가 타인과 관계 맺는 법을 배워 가는 이야기."],
  ["코스모스", "칼 세이건", "사이언스북스", "2006.12.20", "9788983711892", 19900, true, "우주와 생명, 과학의 역사를 한 권으로 풀어낸 과학 교양의 고전."],
  ["총 균 쇠", "재레드 다이아몬드", "김영사", "2023.05.10", "9788934942467", 29800, true, "대륙마다 문명의 속도가 달랐던 이유를 환경에서 찾는 책."],
  ["어린 왕자", "앙투안 드 생텍쥐페리", "문학동네", "2007.05.02", "9788954603072", 9000, true, "사막에 불시착한 조종사가 작은 별에서 온 왕자를 만나는 이야기."],
  ["채식주의자", "한강", "창비", "2007.10.30", "9788936433598", 15000, true, "어느 날 고기를 거부하기 시작한 영혜를 세 사람의 시선으로 그린 연작소설."],
  ["순례 주택", "유은실", "비룡소", "2021.03.05", "9788949123493", 13000, false, "빌라 '순례 주택'에 들어와 살게 된 가족과 열여섯 살 수림이의 이야기."],
  ["팩트풀니스", "한스 로슬링", "김영사", "2019.03.08", "9788934985068", 19800, false, "세상을 실제보다 나쁘게 보게 만드는 열 가지 본능을 데이터로 짚는 책."],
  ["정의란 무엇인가", "마이클 샌델", "와이즈베리", "2014.11.20", "9788937834790", 15000, false, "일상의 딜레마를 통해 정의에 대한 여러 철학적 관점을 살펴보는 책."],
  ["나미야 잡화점의 기적", "히가시노 게이고", "현대문학", "2012.12.19", "9788972756194", 14800, false, "오래된 잡화점에 숨어든 세 사람이 과거에서 온 고민 편지에 답장을 쓰게 되는 이야기."],
  ["파친코 1", "이민진", "인플루엔셜", "2022.07.27", "9791168340510", 15800, false, "일제강점기부터 이어지는 재일조선인 4대 가족의 삶을 그린 장편소설."],
  ["죽고 싶지만 떡볶이는 먹고 싶어", "백세희", "흔", "2018.06.20", "9791196394509", 13800, false, "기분부전장애를 겪는 저자가 정신과 상담 과정을 기록한 에세이."],
];

type StudentSeed = [loginId: string, name: string, classNo: string, studentNo: string, joinedDaysAgo: number];

const STUDENTS: StudentSeed[] = [
  [DEMO_ACCOUNTS.student.loginId, "김하늘", "2-3", "20315", 210],
  ["doyun04", "이도윤", "1-4", "10412", 200],
  ["seojun21", "박서준", "2-1", "20108", 198],
  ["jiwoo32", "최지우", "3-2", "30217", 190],
  ["yuna12", "정유나", "1-2", "10209", 185],
  ["minjae23", "강민재", "2-3", "20322", 170],
  ["chaewon35", "윤채원", "3-5", "30511", 160],
];

/** [도서 번호(1부터), 상태, 반려 사유, 처리 시점(ms 전), [학생 번호(1부터), 신청 시점(일 전)][]] */
type RequestSeed = [book: number, status: Status, reason: string | null, processedAgo: number, requesters: [student: number, daysAgo: number][]];

const REQUESTS: RequestSeed[] = [
  [1, "pending", null, 0, [[7, 0.2], [2, 1], [3, 2], [5, 3], [6, 5]]],
  [2, "approved", null, 12 * MIN, [[1, 12], [4, 10], [2, 9]]],
  [3, "purchased", null, 3 * HOUR, [[1, 22], [3, 20]]],
  [4, "rejected", "교과 연계 도서를 우선 구입하고 있어 이번 학기에는 어려워요", 2 * DAY, [[1, 18]]],
  [5, "pending", null, 0, [[5, 1], [1, 2]]],
  [6, "pending", null, 0, [[7, 3], [4, 4], [2, 6]]],
  [7, "approved", null, 3 * DAY, [[7, 11], [5, 13], [6, 14], [3, 15]]],
  [8, "pending", null, 0, [[1, 3], [6, 7]]],
  [9, "pending", null, 0, [[2, 8], [4, 8]]],
  [10, "purchased", null, 50 * DAY, [[2, 60], [7, 65], [5, 70]]],
  [11, "rejected", "같은 저자의 책을 이미 여러 권 소장하고 있어요", 20 * DAY, [[4, 25]]],
  [12, "purchased", null, 80 * DAY, [[6, 95], [3, 100]]],
  [19, "pending", null, 0, [[3, 40], [5, 45]]],
  [22, "approved", null, 110 * DAY, [[4, 125], [2, 130], [6, 132]]],
];

export function createSeed(now = Date.now()): Db {
  const users: User[] = STUDENTS.map(([loginId, name, classNo, studentNo, joined], i) => ({
    id: `u${i + 1}`,
    loginId,
    password: i === 0 ? DEMO_ACCOUNTS.student.password : "password1234",
    name,
    role: "student",
    classNo,
    studentNo,
    joinedAt: now - joined * DAY,
  }));
  users.push({
    id: "lib1",
    ...DEMO_ACCOUNTS.librarian,
    name: "박서연",
    role: "librarian",
    joinedAt: now - 400 * DAY,
  });

  const books: Book[] = BOOKS.map(([title, author, publisher, pubDate, isbn, price, owned, description], i) => ({
    id: `b${i + 1}`,
    title,
    author,
    publisher,
    year: Number(pubDate.slice(0, 4)),
    pubDate,
    isbn,
    price,
    description,
    owned,
  }));

  const requests: BookRequest[] = [];
  const reviews: Record<string, Review> = {};
  const notifications: Notification[] = [];
  const logs: LogEntry[] = [];

  for (const [bookNo, status, reason, processedAgo, requesters] of REQUESTS) {
    const bookId = `b${bookNo}`;
    for (const [studentNo, daysAgo] of requesters) {
      requests.push({
        id: `r${requests.length + 1}`,
        bookId,
        userId: `u${studentNo}`,
        createdAt: now - daysAgo * DAY,
      });
    }
    const updatedAt = status === "pending" ? now - requesters[0][1] * DAY : now - processedAgo;
    reviews[bookId] = { bookId, status, quantity: 1, updatedAt, ...(reason ? { reason } : {}) };

    if (status === "pending") continue;
    if (status === "purchased") books[bookNo - 1].owned = true;
    logs.push({ id: `l${logs.length + 1}`, at: updatedAt, bookId, status });
    for (const [studentNo] of requesters) {
      notifications.push({
        id: `n${notifications.length + 1}`,
        userId: `u${studentNo}`,
        bookId,
        status,
        createdAt: updatedAt,
        // 최근 하루 안에 처리된 것만 읽지 않은 상태로 둔다
        read: processedAgo > DAY,
        ...(reason ? { reason } : {}),
      });
    }
  }

  return { users, books, requests, reviews, notifications, logs, sessionUserId: null };
}
