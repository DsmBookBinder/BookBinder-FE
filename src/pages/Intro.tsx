import type { ReactNode } from "react";
import { Link } from "react-router";
import { useDb } from "../store/db";
import { currentUser, homePathFor } from "../store/selectors";

const icon = (children: ReactNode) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const FEATURES = [
  {
    title: "도서 검색",
    desc: "전체 도서와 교내 소장 도서를 제목·저자·키워드로 검색해요.",
    icon: icon(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>),
  },
  {
    title: "도서 신청",
    desc: "원하는 책을 신청하면 신청 수가 누적되어 인기 도서가 드러나요.",
    icon: icon(<><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" /><path d="M12 9v6M9 12h6" /></>),
  },
  {
    title: "처리 알림",
    desc: "승인·반려·구매완료 등 상태가 바뀌면 알림으로 알려드려요.",
    icon: icon(<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>),
  },
  {
    title: "사서 선생님용",
    desc: "신청 목록 필터링, 엑셀 추출, 총 예상 예산을 한눈에.",
    icon: icon(<><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>),
  },
];

/** [x, 너비, 높이, 강조 여부] — 책장 위에 꽂힌 책들 */
const SPINES: [number, number, number, boolean?][] = [
  [96, 30, 150], [130, 22, 172], [156, 36, 136], [196, 26, 160, true], [226, 20, 144],
  [250, 34, 176], [288, 24, 152], [316, 30, 128], [350, 22, 166], [376, 32, 148],
];

function HeroArt() {
  const shelfY = 258;
  return (
    <svg viewBox="0 0 520 340" role="img" aria-label="책이 꽂힌 책장 일러스트">
      {SPINES.map(([x, w, h, accent]) => (
        <g key={x}>
          <rect x={x} y={shelfY - h} width={w} height={h} rx="3" fill={accent ? "var(--accent)" : "var(--surface)"} stroke={accent ? "var(--accent)" : "var(--border)"} />
          <rect x={x + 6} y={shelfY - h + 16} width={w - 12} height="3" rx="1.5" fill={accent ? "#fff" : "var(--border)"} />
          <rect x={x + 6} y={shelfY - h + 24} width={w - 12} height="3" rx="1.5" fill={accent ? "#fff" : "var(--border)"} opacity="0.6" />
        </g>
      ))}
      <rect x="64" y={shelfY} width="392" height="8" rx="2" fill="var(--text)" />
    </svg>
  );
}

export function Intro() {
  const user = currentUser(useDb());
  const isLibrarian = user?.role === "librarian";

  return (
    <>
      <main className="main intro">
        <section className="hero">
          <div className="hero__copy">
            <span className="hero__eyebrow">학교 도서관 희망도서 신청</span>
            <h1 className="hero__title">
              읽고 싶은 책,
              <br />
              도서관에 직접 신청하세요
            </h1>
            <p className="hero__desc">
              언제 어디서든 책을 검색하고 신청하면, 사서 선생님이 확인해 구입 여부를 알려드려요.
            </p>
            <div className="hero__cta">
              <Link to={isLibrarian ? homePathFor(user) : "/books"} className="btn btn--primary">
                {isLibrarian ? "신청 목록 보기" : "도서 검색하기"}
              </Link>
              {!user && (
                <Link to="/login" className="btn">
                  로그인
                </Link>
              )}
            </div>
          </div>
          <div className="hero__art">
            <HeroArt />
          </div>
        </section>

        <section className="features">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="card feature">
              <div className="feature__icon">{feature.icon}</div>
              <h3 className="feature__title">{feature.title}</h3>
              <p className="feature__desc">{feature.desc}</p>
            </div>
          ))}
        </section>
      </main>
      <footer className="footer">
        <div className="footer__inner">BookBinder · 학교 도서관</div>
      </footer>
    </>
  );
}
