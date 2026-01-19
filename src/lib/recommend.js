import { addMinutes, differenceInMinutes, eachDayOfInterval } from "date-fns";
import { clampInterval, combineDateTime, safeParseISO, toISODate } from "./time";

// intervals: Array<[Date, Date]>
export function mergeIntervals(intervals) {
  const xs = intervals
    .filter(Boolean)
    .map(([s, e]) => [s, e])
    .sort((a, b) => a[0].getTime() - b[0].getTime());

  const merged = [];
  for (const it of xs) {
    if (!merged.length) {
      merged.push(it);
      continue;
    }
    const last = merged[merged.length - 1];
    if (it[0] > last[1]) {
      merged.push(it);
    } else {
      last[1] = it[1] > last[1] ? it[1] : last[1];
    }
  }
  return merged;
}

function roundUpToStep(date, stepMins) {
  const ms = date.getTime();
  const step = stepMins * 60 * 1000;
  return new Date(Math.ceil(ms / step) * step);
}

function scoreSlot(start, end) {
  // 단순 MVP 점수: 길이 + 너무 이른/늦은 시간 패널티
  const dur = differenceInMinutes(end, start);
  let score = dur;

  const sh = start.getHours() + start.getMinutes() / 60;
  const eh = end.getHours() + end.getMinutes() / 60;

  if (sh < 10) score -= 20;
  if (eh > 21.5) score -= 20;

  return score;
}

export function computeRecommendations({
  events,
  rangeStart, // yyyy-MM-dd
  rangeEnd,   // yyyy-MM-dd
  workStart = "09:00",
  workEnd = "22:00",
  minMins = 60,
  stepMins = 15,
  topN = 10,
}) {
  // 1) 모든 참가자의 busy를 union으로 합치면 => "모두가 비는 시간"이 남음
  const busy = [];
  for (const e of events || []) {
    const s = safeParseISO(e.startISO);
    const t = safeParseISO(e.endISO);
    if (!s || !t || t <= s) continue;
    busy.push([s, t]);
  }
  const mergedBusy = mergeIntervals(busy);

  // 2) 날짜별 working hours에서 busy를 빼서 free interval 생성
  const days = eachDayOfInterval({
    start: new Date(rangeStart + "T00:00:00"),
    end: new Date(rangeEnd + "T00:00:00"),
  });

  const slots = [];

  for (const day of days) {
    const dayStr = toISODate(day);
    const dayStart = combineDateTime(dayStr, workStart);
    const dayEnd = combineDateTime(dayStr, workEnd);
    if (dayEnd <= dayStart) continue;

    // day와 겹치는 busy만 수집 + clamp
    const dayBusy = [];
    for (const [s, t] of mergedBusy) {
      if (t <= dayStart) continue;
      if (s >= dayEnd) break;
      const clamped = clampInterval([s, t], [dayStart, dayEnd]);
      if (clamped) dayBusy.push(clamped);
    }
    const dayBusyMerged = mergeIntervals(dayBusy);

    let cursor = dayStart;
    const pushFree = (fs, fe) => {
      const dur = differenceInMinutes(fe, fs);
      if (dur < minMins) return;

      // MVP 옵션 A: free interval 자체를 한 개 추천으로 넣기(가장 간단)
      // slots.push({ date: dayStr, start: fs, end: fe, durationMinutes: dur, score: scoreSlot(fs, fe) });

      // MVP 옵션 B: step 단위로 시작 시간을 밀면서 여러 후보 생성(추천 후보가 풍부해짐)
      let st = roundUpToStep(fs, stepMins);
      while (addMinutes(st, minMins) <= fe) {
        const en = addMinutes(st, minMins);
        slots.push({
          date: dayStr,
          start: st,
          end: en,
          durationMinutes: minMins,
          score: scoreSlot(st, en),
        });
        st = addMinutes(st, stepMins);
      }
    };

    for (const [bs, be] of dayBusyMerged) {
      if (bs > cursor) pushFree(cursor, bs);
      cursor = be > cursor ? be : cursor;
    }
    if (cursor < dayEnd) pushFree(cursor, dayEnd);
  }

  // 3) 정렬 + TOP
  const sorted = slots.sort((a, b) => b.score - a.score || a.start - b.start);
  const top = sorted.slice(0, topN);

  return { top, all: sorted };
}
