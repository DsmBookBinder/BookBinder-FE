import { useEffect } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router";
import { Header } from "./components/Header";
import { Forbidden } from "./pages/Forbidden";
import { Intro } from "./pages/Intro";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { Budget } from "./pages/librarian/Budget";
import { LibrarianMyPage } from "./pages/librarian/MyPage";
import { Requests } from "./pages/librarian/Requests";
import { BookDetail } from "./pages/student/BookDetail";
import { StudentMyPage } from "./pages/student/MyPage";
import { Notifications } from "./pages/student/Notifications";
import { Search } from "./pages/student/Search";
import { logout, useDb } from "./store/db";
import { currentUser } from "./store/selectors";
import type { Role } from "./types";

function Layout() {
  return (
    <div className="app">
      <Header />
      <Outlet />
    </div>
  );
}

/** 로그인하지 않았으면 로그인으로 보내고, 역할이 맞지 않으면 403을 보여 준다. role이 없으면 로그인만 확인한다. */
function RequireAuth({ role }: { role?: Role }) {
  const user = currentUser(useDb());
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (role && user.role !== role) return <Forbidden />;
  return <Outlet />;
}

/** 경로는 하나지만 역할에 따라 내용이 다르다. */
function MyPage() {
  const user = currentUser(useDb());
  return user?.role === "librarian" ? <LibrarianMyPage /> : <StudentMyPage />;
}

/** 보호된 화면에서 바로 로그아웃하면 로그인 화면으로 튕기므로, 전용 경로를 거쳐 소개 화면으로 보낸다. */
function Logout() {
  useEffect(() => logout(), []);
  return <Navigate to="/" replace />;
}

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Intro />} />
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />
        <Route path="logout" element={<Logout />} />

        <Route element={<RequireAuth />}>
          <Route path="mypage" element={<MyPage />} />
        </Route>

        <Route element={<RequireAuth role="student" />}>
          <Route path="books" element={<Search />} />
          <Route path="books/:bookId" element={<BookDetail />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>

        <Route element={<RequireAuth role="librarian" />}>
          <Route path="admin/requests" element={<Requests />} />
          <Route path="admin/budget" element={<Budget />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
