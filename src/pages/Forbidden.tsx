import { Link } from "react-router";
import { useDb } from "../store/db";
import { currentUser, homePathFor } from "../store/selectors";

/** 로그인은 했지만 역할이 맞지 않는 화면에 들어왔을 때 보여 준다. */
export function Forbidden() {
  const user = currentUser(useDb());
  return (
    <main className="main main--center">
      <div className="card auth-card" style={{ textAlign: "center" }}>
        <p className="page-desc">403</p>
        <h1 className="page-title">이 화면을 볼 권한이 없어요</h1>
        <p className="page-desc">
          {user?.role === "librarian" ? "학생 전용 화면이에요." : "사서 선생님 전용 화면이에요."}
        </p>
        <Link to={homePathFor(user)} className="btn btn--primary btn--block">
          내 화면으로 돌아가기
        </Link>
      </div>
    </main>
  );
}
