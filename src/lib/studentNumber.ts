export function parseStudentNumber(value: string) {
  const studentNo = value.trim();
  if (!/^[1-3][1-9](?!00)[0-9]{2}$/.test(studentNo)) return null;
  const grade = Number(studentNo[0]);
  const classroom = Number(studentNo[1]);
  const number = Number(studentNo.slice(2));
  return { studentNo, classNo: `${grade}-${classroom}`, grade, classroom, number };
}
