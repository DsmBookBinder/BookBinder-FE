import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { Segmented } from "../components/ui";
import { signup, useDb } from "../store/db";
import { currentUser, homePathFor } from "../store/selectors";
import type { Role } from "../types";

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "student", label: "학생" },
  { value: "librarian", label: "사서 선생님" },
];

const EMPTY = { name: "", loginId: "", password: "", password2: "", classNo: "", studentNo: "" };
type FieldName = keyof typeof EMPTY;

function validate(role: Role, v: typeof EMPTY): Partial<Record<FieldName, string>> {
  const errors: Partial<Record<FieldName, string>> = {};
  if (!v.name.trim()) errors.name = "이름을 입력해 주세요.";
  if (!/^[a-zA-Z0-9]{4,20}$/.test(v.loginId.trim())) errors.loginId = "영문·숫자 4~20자로 입력해 주세요.";
  if (v.password.length < 8) errors.password = "8자 이상 입력해 주세요.";
  if (v.password2 !== v.password) errors.password2 = "비밀번호가 서로 달라요.";
  if (role === "student") {
    if (!/^[1-3]-\d{1,2}$/.test(v.classNo.trim())) errors.classNo = "2-3처럼 학년-반으로 입력해 주세요.";
    if (!/^\d{4,6}$/.test(v.studentNo.trim())) errors.studentNo = "숫자로 된 학번을 입력해 주세요.";
  }
  return errors;
}

export function Signup() {
  const user = currentUser(useDb());
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("student");
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});

  if (user) return <Navigate to={homePathFor(user)} replace />;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const found = validate(role, values);
    if (Object.keys(found).length === 0) {
      const result = signup({ role, ...values });
      if (result.ok) {
        navigate("/login", { state: { notice: "가입이 완료됐어요. 로그인해 주세요." } });
        return;
      }
      found.loginId = result.error;
    }
    setErrors(found);
  };

  const field = (name: FieldName, label: string, placeholder: string, type = "text", autoComplete = "off") => (
    <div className="field">
      <label htmlFor={`su-${name}`} className="field__label">
        {label}
      </label>
      <input
        id={`su-${name}`}
        className="input"
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={values[name]}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={errors[name] ? `su-${name}-error` : undefined}
        onChange={(e) => setValues({ ...values, [name]: e.target.value })}
      />
      {errors[name] && (
        <span id={`su-${name}-error`} className="form-error">
          {errors[name]}
        </span>
      )}
    </div>
  );

  return (
    <main className="main main--center">
      <form className="card auth-card auth-card--wide" onSubmit={handleSubmit} noValidate>
        <h1 className="page-title">회원가입</h1>
        <div className="field">
          <span className="field__label">역할 선택</span>
          <Segmented label="역할 선택" options={ROLE_OPTIONS} value={role} onChange={setRole} />
        </div>
        <div className="form-grid">
          {field("name", "이름", "홍길동", "text", "name")}
          {field("loginId", "아이디", "영문·숫자", "text", "username")}
          {field("password", "비밀번호", "8자 이상", "password", "new-password")}
          {field("password2", "비밀번호 확인", "한 번 더 입력", "password", "new-password")}
        </div>
        {role === "student" && (
          <fieldset className="fieldset">
            <legend className="sr-only">학생 정보</legend>
            <div className="form-grid">
              {field("classNo", "학년/반", "예: 2-3")}
              {field("studentNo", "학번", "예: 20315")}
            </div>
          </fieldset>
        )}
        <button type="submit" className="btn btn--primary btn--block btn--tall">
          가입하기
        </button>
        <div className="auth-card__switch">
          이미 계정이 있나요? <Link to="/login">로그인</Link>
        </div>
      </form>
    </main>
  );
}
