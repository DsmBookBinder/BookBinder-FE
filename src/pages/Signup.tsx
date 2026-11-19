import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { parseStudentNumber } from "../lib/studentNumber";
import { signup, useDb } from "../store/db";
import { currentUser, homePathFor } from "../store/selectors";
import { ApiError, studentApi } from "../student-api/api";

const EMPTY = { name: "", loginId: "", password: "", password2: "", studentNo: "" };
type FieldName = keyof typeof EMPTY;

export function Signup({ live = false }: { live?: boolean }) {
  const user = currentUser(useDb());
  const navigate = useNavigate();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const student = parseStudentNumber(values.studentNo);

  if (!live && user) return <Navigate to={homePathFor(user)} replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const fields: Partial<Record<FieldName, string>> = {};
    if (!values.name.trim()) fields.name = "이름을 입력해 주세요.";
    if (!/^[a-zA-Z0-9]{4,20}$/.test(values.loginId.trim())) fields.loginId = "영문·숫자 4~20자로 입력해 주세요.";
    if (values.password.length < 8 || values.password.length > 128) fields.password = "8~128자로 입력해 주세요.";
    if (values.password2 !== values.password) fields.password2 = "비밀번호가 서로 달라요.";
    if (!student) fields.studentNo = "1407처럼 학년·반·번호로 구성된 숫자 4자리를 입력해 주세요.";
    setErrors(fields);
    setError("");
    if (!student || Object.keys(fields).length) return;

    const data = { ...values, name: values.name.trim(), loginId: values.loginId.trim(), studentNo: student.studentNo };
    setBusy(true);
    try {
      if (live) {
        await studentApi.signup(data);
      } else {
        const result = signup({ ...data, role: "student", classNo: student.classNo });
        if (!result.ok) { setErrors({ loginId: result.error }); return; }
      }
      navigate("/login", { state: { notice: "가입이 완료됐어요. 로그인해 주세요." } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "가입하지 못했어요.");
      if (err instanceof ApiError) setErrors(err.fields);
    } finally {
      setBusy(false);
    }
  }

  const field = (name: FieldName, label: string, placeholder: string, type = "text", autoComplete = "off") => (
    <div className="field">
      <label htmlFor={`su-${name}`} className="field__label">{label}</label>
      <input
        id={`su-${name}`}
        className="input"
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={values[name]}
        inputMode={name === "studentNo" ? "numeric" : undefined}
        maxLength={name === "studentNo" ? 4 : undefined}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={errors[name] ? `su-${name}-error` : name === "studentNo" && student ? "student-number-help" : undefined}
        onChange={(event) => setValues({ ...values, [name]: event.target.value })}
      />
      {errors[name] && <span id={`su-${name}-error`} className="form-error">{errors[name]}</span>}
      {name === "studentNo" && student && <span id="student-number-help" className="page-desc" aria-live="polite">
        {student.grade}학년 {student.classroom}반 {student.number}번
      </span>}
    </div>
  );

  return (
    <main className="main main--center">
      <form className="card auth-card auth-card--wide" onSubmit={handleSubmit} noValidate>
        <h1 className="page-title">학생 회원가입</h1>
        <div className="form-grid">
          {field("name", "이름", "홍길동", "text", "name")}
          {field("loginId", "아이디", "영문·숫자", "text", "username")}
          {field("password", "비밀번호", "8자 이상", "password", "new-password")}
          {field("password2", "비밀번호 확인", "한 번 더 입력", "password", "new-password")}
          {field("studentNo", "학번", "예: 1407")}
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="btn btn--primary btn--block btn--tall" disabled={busy}>가입하기</button>
        <div className="auth-card__switch">이미 계정이 있나요? <Link to="/login">로그인</Link></div>
      </form>
    </main>
  );
}
