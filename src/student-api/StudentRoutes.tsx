import { useEffect, useState } from 'react';
import { Link, Navigate, Outlet, useLocation, useOutletContext } from 'react-router';
import { Header } from '../components/Header';
import { Intro } from '../pages/Intro';
import { ApiError, studentApi, type StudentUser } from './api';

const errorMessage = (error: unknown) => error instanceof Error ? error.message : '요청을 처리하지 못했어요.';
type Session = { user: StudentUser; demo: boolean };
export type LiveContext = Session & { refreshUnread: () => Promise<void>; updateUser: (user: StudentUser) => void };

export function LiveShell() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [failure, setFailure] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();
  const home = location.pathname === '/';
  const adminPage = location.pathname.startsWith('/admin/');
  useEffect(() => {
    let active = true;
    studentApi.session().then((value) => { if (active) { setFailure(''); setSession(value); } })
      .catch((err: unknown) => {
        if (active) { setSession(null); setFailure(err instanceof ApiError && err.status === 401 ? '' : errorMessage(err)); }
      });
    return () => { active = false; };
  }, [location.pathname]);

  async function refreshUnread() {
    try { setUnreadCount((await studentApi.notifications()).unread_count); }
    catch { setUnreadCount(0); }
  }
  const role = session?.user.role;
  useEffect(() => {
    if (role !== 'STUDENT') return;
    let active = true;
    studentApi.notifications().then((result) => { if (active) setUnreadCount(result.unread_count); })
      .catch(() => { if (active) setUnreadCount(0); });
    return () => { active = false; };
  }, [role, location.pathname]);

  if (session === undefined) return <main className="main"><p>로그인 상태를 확인하고 있어요.</p></main>;
  if (!session) {
    if (home) return <div className="app"><Header live /><Outlet context={null} /></div>;
    const login = adminPage ? '/admin/login' : '/login';
    return failure
      ? <main className="main"><p role="alert">{failure}</p><Link to={login}>로그인</Link></main>
      : <Navigate to={login} replace state={{ from: location.pathname + location.search }} />;
  }
  const admin = session.user.role === 'LIBRARIAN';
  const allowed = home || location.pathname === '/mypage' || adminPage === admin;
  function updateUser(user: StudentUser) {
    setSession((current) => current ? { ...current, user } : current);
  }

  return <div className="app">
    <Header live account={{ role: admin ? 'librarian' : 'student', name: session.user.name, classNo: session.user.grade_class }} liveUnread={unreadCount} />
    {allowed ? <Outlet context={{ ...session, refreshUnread, updateUser }} /> : (
      <main className="main"><p role="alert">{adminPage ? '관리자 전용 화면이에요.' : '학생 전용 화면이에요.'}</p>
        <Link to={admin ? '/admin/requests' : '/books'}>내 화면으로 이동</Link>
      </main>
    )}
  </div>;
}

export function LiveHome() {
  const context = useOutletContext<LiveContext | null>();
  const role = context ? context.user.role === 'LIBRARIAN' ? 'librarian' : 'student' : null;
  return <Intro live liveRole={role} />;
}
