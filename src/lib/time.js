import { format, parseISO } from "date-fns";

export function toISODate(d) {
  return format(d, "yyyy-MM-dd");
}

export function safeParseISO(iso) {
  try {
    return parseISO(iso);
  } catch {
    return null;
  }
}

// "2026-01-19" + "09:00" -> Date (local)
export function combineDateTime(dateStr, timeStr) {
  // local time으로 조합 (Asia/Seoul 환경 가정)
  // dateStr: yyyy-MM-dd, timeStr: HH:mm
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
}

export function fmtDayLabel(date) {
  // 예: 1/19 (월)
  const dayMap = ["일", "월", "화", "수", "목", "금", "토"];
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${m}/${d} (${dayMap[date.getDay()]})`;
}

export function fmtTime(date) {
  return format(date, "HH:mm");
}

export function clampInterval([s, e], [min, max]) {
  const ns = s < min ? min : s;
  const ne = e > max ? max : e;
  if (ne <= ns) return null;
  return [ns, ne];
}
