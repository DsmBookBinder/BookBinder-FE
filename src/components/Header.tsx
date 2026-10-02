import { Link, NavLink } from "react-router";
import { useDb } from "../store/db";
import { currentUser, unreadCount } from "../store/selectors";

const STUDENT_NAV = [
  { to: "/books", label: "도서 검색/신청" },
  { to: "/notifications", label: "알림" },
  { to: "/mypage", label: "마이페이지" },
];

const LIBRARIAN_NAV = [
  { to: "/librarian/requests", label: "신청 도서 목록" },
  { to: "/librarian/budget", label: "총 예산 조회" },
  { to: "/librarian/mypage", label: "마이페이지" },
];

export function Header() {
  const db = useDb();
  const user = currentUser(db);
  const isLibrarian = user?.role === "librarian";
  const unread = user && !isLibrarian ? unreadCount(db, user.id) : 0;

  return (
    <header className="header">
      <div className="header__inner">
        <Link to="/" className="logo">
          <span className="logo__mark">B</span>
          BookBinder
        </Link>
        {isLibrarian && <span className="role-tag">사서</span>}

        {user && (
          <nav className="nav">
            {(isLibrarian ? LIBRARIAN_NAV : STUDENT_NAV).map((item) => (
              <NavLink key={item.to} to={item.to} className="nav__link">
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}

        <div className="spacer" />

        {user ? (
          <div className="header__user">
            {!isLibrarian && (
              <Link to="/notifications" className="bell" aria-label={`알림, 읽지 않음 ${unread}건`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
                {unread > 0 && <span className="bell__count">{unread > 99 ? "99+" : unread}</span>}
              </Link>
            )}
            <span>{isLibrarian ? `${user.name} 선생님` : `${user.name} · ${user.classNo ?? "-"}`}</span>
            <Link to="/logout" className="link-button">
              로그아웃
            </Link>
          </div>
        ) : (
          <div className="header__actions">
            <Link to="/login" className="btn">
              로그인
            </Link>
            <Link to="/signup" className="btn btn--primary">
              회원가입
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
