import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation } from "react-router";
import { DEMO_ACCOUNTS } from "../data/seed";
import { login, resetDemoData, useDb } from "../store/db";
import { currentUser, homePathFor } from "../store/selectors";

interface LoginLocationState {
  from?: string;
  notice?: string;
}

export function Login() {
  const user = currentUser(useDb());
  const state = (useLocation().state ?? {}) as LoginLocationState;
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // 로그인에 성공하면 여기서 이동한다. 원래 가려던 화면은 학생용뿐이라 학생에게만 돌려보낸다.
  if (user) return <Navigate to={(user.role === "student" && state.from) || homePathFor(user)} replace />;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!loginId.trim() || !password) {
      setError("아이디와 비밀번호를 입력해 주세요.");
      return;
    }
    const result = login(loginId, password);
    if (!result.ok) setError(result.error);
  };

  const fillDemo = (role: keyof typeof DEMO_ACCOUNTS) => {
    setLoginId(DEMO_ACCOUNTS[role].loginId);
    setPassword(DEMO_ACCOUNTS[role].password);
    setError("");
  };

  return (
    <main className="main main--center">
      <form className="card auth-card" onSubmit={handleSubmit} noValidate>
        <div>
          <h1 className="page-title">로그인</h1>
          <p className="page-desc">BookBinder 계정으로 로그인하세요.</p>
        </div>
        {state.notice && <p className="form-notice">{state.notice}</p>}
        <div className="field">
          <label htmlFor="login-id" className="field__label">
            아이디
          </label>
          <input
            id="login-id"
            className="input"
            type="text"
            autoComplete="username"
            placeholder="아이디를 입력하세요"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="login-pw" className="field__label">
            비밀번호
          </label>
          <input
            id="login-pw"
            className="input"
            type="password"
            autoComplete="current-password"
            placeholder="비밀번호를 입력하세요"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn--primary btn--block btn--tall">
          로그인
        </button>
        <div className="auth-card__switch">
          계정이 없나요? <Link to="/signup">회원가입</Link>
        </div>
        <div className="auth-card__foot">
          로그인하면 역할(학생/사서)에 맞는 화면으로 이동해요.
          {import.meta.env.DEV && (
            <div className="row">
              <button type="button" className="link-button" onClick={() => fillDemo("student")}>
                학생 데모 계정 채우기
              </button>
              <button type="button" className="link-button" onClick={() => fillDemo("librarian")}>
                사서 데모 계정 채우기
              </button>
              <button type="button" className="link-button" onClick={resetDemoData}>
                샘플 데이터 초기화
              </button>
            </div>
          )}
        </div>
      </form>
    </main>
  );
}
