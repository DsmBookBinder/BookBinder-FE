import { useEffect } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router";
import { Header } from "./components/Header";
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
import { currentUser, homePathFor } from "./store/selectors";
import type { Role } from "./types";

function Layout() {
  return (
    <div className="app">
      <Header />
      <Outlet />
    </div>
  );
}

/** 로그인하지 않았으면 로그인으로, 역할이 다르면 그 역할의 첫 화면으로 보낸다. */
function RequireRole({ role }: { role: Role }) {
  const user = currentUser(useDb());
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (user.role !== role) return <Navigate to={homePathFor(user)} replace />;
  return <Outlet />;
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

        <Route element={<RequireRole role="student" />}>
          <Route path="books" element={<Search />} />
          <Route path="books/:bookId" element={<BookDetail />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="mypage" element={<StudentMyPage />} />
        </Route>

        <Route element={<RequireRole role="librarian" />}>
          <Route path="librarian/requests" element={<Requests />} />
          <Route path="librarian/budget" element={<Budget />} />
          <Route path="librarian/mypage" element={<LibrarianMyPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
