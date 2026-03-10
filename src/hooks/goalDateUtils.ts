function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function getLocalDateKey(date: Date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function getWeekId(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return `${d.getFullYear()}-W${Math.ceil(((d.getTime() - week1.getTime()) / 86400000 + week1.getDay() + 1) / 7)}`;
}

export function getMonthId(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

export function getDayOfWeekIndex(date: Date = new Date()) {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}
