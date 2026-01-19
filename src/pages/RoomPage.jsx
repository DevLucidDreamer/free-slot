import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import AppShell from "../components/AppShell";
import TopNav from "../components/TopNav";
import Card from "../components/Card";
import Button from "../components/Button";
import Modal from "../components/Modal";
import Toast from "../components/Toast";

import { sheetdb } from "../lib/sheetdb";

/* ---------------- utils ---------------- */
function sheetSerialToYmd(serial) {
  // Google Sheets date serial: 1899-12-30 기준
  const ms = Math.round((Number(serial) - 25569) * 86400 * 1000);
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function normalizeYmd(v) {
  if (v == null) return "";
  if (typeof v === "number") return sheetSerialToYmd(v);
  const s = String(v).trim();
  if (!s) return "";
  // 숫자 문자열(예: "46041")도 처리
  if (/^\d+(\.\d+)?$/.test(s)) return sheetSerialToYmd(s);
  // 이미 "YYYY-MM-DD"면 그대로
  return s;
}

function pickLiveEvents(rows) {
  const sorted = [...(rows || [])].sort((a, b) =>
    String(a.createdAt || "").localeCompare(String(b.createdAt || ""))
  );

  const map = new Map(); // eventId -> latest row
  for (const r of sorted) {
    if (!r?.eventId) continue;
    map.set(r.eventId, r);
  }

  // 최신 row가 deletedAt 있으면 화면에서 제외
  return [...map.values()].filter((r) => !r.deletedAt);
}

function makeId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
}

function getOrCreateParticipantId() {
  const key = "free-slot.participantId";
  let v = localStorage.getItem(key);
  if (!v) {
    v = makeId("p");
    localStorage.setItem(key, v);
  }
  return v;
}

function safeJsonParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function clampDateStr(s) {
  return (s || "").slice(0, 10);
}

// ✅ 로컬 기준 yyyy-mm-dd (UTC 밀림 버그 방지)
function yyyyMmDdLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDayLocal(dateStr) {
  // dateStr: yyyy-mm-dd
  return new Date(`${dateStr}T00:00:00`);
}

function addDaysLocal(d, days) {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + days);
  return x;
}

function fmtDateTimeLocalInput(d) {
  // yyyy-MM-ddTHH:mm
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function toISOFromLocalDateTimeInput(value) {
  // yyyy-MM-ddTHH:mm (local) -> ISO
  const d = new Date(value);
  return d.toISOString();
}

function minutesBetweenISO(startISO, endISO) {
  const a = new Date(startISO).getTime();
  const b = new Date(endISO).getTime();
  return Math.max(0, Math.round((b - a) / 60000));
}

function sortEventsByStartAsc(list) {
  return [...list].sort(
    (a, b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime()
  );
}

function parseHHMM(hhmm) {
  const [h, m] = (hhmm || "00:00").split(":").map((v) => parseInt(v, 10));
  return (isFinite(h) ? h : 0) * 60 + (isFinite(m) ? m : 0);
}

function toMinuteOfDayLocal(d) {
  return d.getHours() * 60 + d.getMinutes();
}

function mergeIntervals(intervals) {
  if (!intervals.length) return [];
  const arr = [...intervals].sort((a, b) => a[0] - b[0]);
  const out = [arr[0]];
  for (let i = 1; i < arr.length; i++) {
    const [s, e] = arr[i];
    const last = out[out.length - 1];
    if (s <= last[1]) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
}

function inRange(dayStr, rangeStart, rangeEnd) {
  if (!rangeStart || !rangeEnd) return false;
  return dayStr >= rangeStart && dayStr <= rangeEnd; // inclusive
}

// 그 날(workStart~workEnd) 내에서 minMins 이상 “빈 구간”이 하나라도 있으면 true
function hasFreeSlotInDay({ dayStr, events, workStartMin, workEndMin, minMins }) {
  const dayStart = startOfDayLocal(dayStr);
  const dayEnd = addDaysLocal(dayStart, 1);

  const intervals = [];
  for (const ev of events) {
    const s = new Date(ev.startISO);
    const e = new Date(ev.endISO);

    if (e <= dayStart || s >= dayEnd) continue;

    const ss = s < dayStart ? dayStart : s;
    const ee = e > dayEnd ? dayEnd : e;

    intervals.push([toMinuteOfDayLocal(ss), toMinuteOfDayLocal(ee)]);
  }

  const merged = mergeIntervals(intervals);

  let cursor = workStartMin;
  for (const [bs, be] of merged) {
    const s = Math.max(bs, workStartMin);
    const e = Math.min(be, workEndMin);
    if (e <= workStartMin || s >= workEndMin) continue;

    if (s - cursor >= minMins) return true;
    cursor = Math.max(cursor, e);
    if (cursor >= workEndMin) break;
  }
  return workEndMin - cursor >= minMins;
}

function monthMatrix(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const firstDay = first.getDay(); // 0~6
  const start = new Date(year, monthIndex, 1 - firstDay);

  const weeks = [];
  let cur = new Date(start.getTime());
  for (let w = 0; w < 6; w++) {
    const row = [];
    for (let d = 0; d < 7; d++) {
      row.push(new Date(cur.getTime()));
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(row);
  }
  return weeks;
}
/* -------------- /utils ---------------- */

export default function RoomPage() {
  const nav = useNavigate();
  const { roomId } = useParams();

  const participantId = useMemo(() => getOrCreateParticipantId(), []);
  const [participantName, setParticipantName] = useState(
    () => localStorage.getItem("free-slot.participantName") || ""
  );

  const [room, setRoom] = useState(null);
  const [events, setEvents] = useState([]);

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  // 룸 이름
  const [roomNameEdit, setRoomNameEdit] = useState("");

  // 룸 기간 편집
  const [rangeStartEdit, setRangeStartEdit] = useState("");
  const [rangeEndEdit, setRangeEndEdit] = useState("");

  // 캘린더
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState(() =>
    yyyyMmDdLocal(new Date())
  );

  // 일정 추가 모달
  const [openAdd, setOpenAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("");
  const [allDay, setAllDay] = useState(false);

  const [startLocal, setStartLocal] = useState(() =>
    fmtDateTimeLocalInput(new Date())
  );
  const [endLocal, setEndLocal] = useState(() =>
    fmtDateTimeLocalInput(new Date(Date.now() + 60 * 60000))
  );

  useEffect(() => {
    localStorage.setItem("free-slot.participantName", participantName);
  }, [participantName]);

  // ✅ room range 정규화(시트 숫자/문자열 시리얼 대응)
  const roomRangeStart = useMemo(
    () => normalizeYmd(room?.rangeStart) || "",
    [room?.rangeStart]
  );
  const roomRangeEnd = useMemo(
    () => normalizeYmd(room?.rangeEnd) || "",
    [room?.rangeEnd]
  );

  async function loadRoomAndEvents() {
    if (!roomId) return;
    setLoading(true);
    setError("");
    try {
      // rooms는 append-only 전략: 최신 createdAt을 사용
      const roomRows = await sheetdb.searchSheet("rooms", { roomId });
      const rooms = Array.isArray(roomRows) ? roomRows : [];
      const latest =
        rooms.length === 0
          ? null
          : rooms
              .slice()
              .sort(
                (a, b) =>
                  new Date(b.createdAt || 0).getTime() -
                  new Date(a.createdAt || 0).getTime()
              )[0];

      // ✅ rangeStart/rangeEnd 정규화해서 state에 저장
      const normalizedLatest = latest
        ? {
            ...latest,
            rangeStart: normalizeYmd(latest.rangeStart),
            rangeEnd: normalizeYmd(latest.rangeEnd),
          }
        : null;

      setRoom(normalizedLatest);

      const eventRows = await sheetdb.getSheet("events", { roomId });
      const inRoom = (eventRows || []).filter((r) => r?.roomId === roomId);
      setEvents(pickLiveEvents(inRoom));

      if (normalizedLatest?.rangeStart)
        setRangeStartEdit(clampDateStr(normalizedLatest.rangeStart));
      if (normalizedLatest?.rangeEnd)
        setRangeEndEdit(clampDateStr(normalizedLatest.rangeEnd));
      setRoomNameEdit(normalizedLatest?.roomName || "");
    } catch (e) {
      console.error(e);
      setError(e?.message || "로드 실패");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRoomAndEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const settings = useMemo(() => {
    const s = safeJsonParse(room?.settingsJson || "", null);
    return (
      s || {
        workStart: "09:00",
        workEnd: "22:00",
        minMins: 60,
        stepMins: 15,
        topN: 10,
        tz: "Asia/Seoul",
      }
    );
  }, [room]);

  const workStartMin = useMemo(() => parseHHMM(settings.workStart), [
    settings.workStart,
  ]);
  const workEndMin = useMemo(() => parseHHMM(settings.workEnd), [
    settings.workEnd,
  ]);
  const minMins = useMemo(() => Number(settings.minMins) || 60, [
    settings.minMins,
  ]);

  // ✅ dayStats: 날짜별 busyCount + hasFree
  const dayStats = useMemo(() => {
    const dayStatsMap = new Map();

    // 1) busyCount 계산
    for (const ev of events) {
      const s = new Date(ev.startISO);
      const e = new Date(ev.endISO);

      if (!isFinite(s.getTime()) || !isFinite(e.getTime()) || e <= s) continue;

      const firstDay = startOfDayLocal(yyyyMmDdLocal(s));
      const lastDay = startOfDayLocal(yyyyMmDdLocal(e));

      let cur = new Date(firstDay.getTime());
      for (let guard = 0; guard < 370; guard++) {
        const ds = yyyyMmDdLocal(cur);

        const dayStart = startOfDayLocal(ds);
        const dayEnd = addDaysLocal(dayStart, 1);
        const overlaps = !(e <= dayStart || s >= dayEnd);

        if (overlaps) {
          const v = dayStatsMap.get(ds) || { busyCount: 0, hasFree: false };
          v.busyCount += 1;
          dayStatsMap.set(ds, v);
        }

        cur = addDaysLocal(cur, 1);
        if (cur > lastDay) break;
      }
    }

    // 2) room range 안 hasFree 계산 (✅ 정규화된 range 사용)
    const rs = roomRangeStart;
    const re = roomRangeEnd;

    if (rs && re) {
      let cur = startOfDayLocal(rs);
      const end = startOfDayLocal(re);

      for (let guard = 0; guard < 370; guard++) {
        const ds = yyyyMmDdLocal(cur);

        const v = dayStatsMap.get(ds) || { busyCount: 0, hasFree: false };
        v.hasFree = hasFreeSlotInDay({
          dayStr: ds,
          events,
          workStartMin,
          workEndMin,
          minMins,
        });
        dayStatsMap.set(ds, v);

        if (ds === re) break;
        cur = addDaysLocal(cur, 1);
        if (cur > end) break;
      }
    }

    return dayStatsMap;
  }, [events, roomRangeStart, roomRangeEnd, workStartMin, workEndMin, minMins]);

  const weeks = useMemo(() => monthMatrix(calYear, calMonth), [calYear, calMonth]);

  const selectedDayEvents = useMemo(() => {
    const dayStart = startOfDayLocal(selectedDay);
    const dayEnd = addDaysLocal(dayStart, 1);

    return events.filter((ev) => {
      const s = new Date(ev.startISO);
      const e = new Date(ev.endISO);
      if (!isFinite(s.getTime()) || !isFinite(e.getTime())) return false;
      return !(e <= dayStart || s >= dayEnd);
    });
  }, [events, selectedDay]);

  function onCopyLink() {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => setToast("링크를 복사했어요"))
      .catch(() => setToast("복사에 실패했어요"));
  }

  async function onSaveRange() {
    setError("");
    const rs = clampDateStr(rangeStartEdit);
    const re = clampDateStr(rangeEndEdit);

    if (!rs || !re) {
      setError("기간(시작/종료)을 입력하세요.");
      return;
    }
    if (re < rs) {
      setError("종료일은 시작일 이후여야 합니다.");
      return;
    }

    try {
      setLoading(true);
      await sheetdb.postSheet("rooms", {
        roomId,
        createdAt: new Date().toISOString(),
        rangeStart: rs,
        rangeEnd: re,
        settingsJson: room?.settingsJson || JSON.stringify(settings),
        roomName: roomNameEdit || room?.roomName || "",
      });

      setToast("기간을 저장했어요");
      await loadRoomAndEvents();
    } catch (e) {
      console.error(e);
      setError(e?.message || "기간 저장 실패");
    } finally {
      setLoading(false);
    }
  }

  async function onSaveRoomName() {
    setError("");
    const name = (roomNameEdit || "").trim();

    if (!name) {
      setError("룸 이름을 입력하세요.");
      return;
    }
    if (name.length > 30) {
      setError("룸 이름은 30자 이하로 입력하세요.");
      return;
    }

    try {
      setLoading(true);
      await sheetdb.postSheet("rooms", {
        roomId,
        createdAt: new Date().toISOString(),
        rangeStart: roomRangeStart || rangeStartEdit || "",
        rangeEnd: roomRangeEnd || rangeEndEdit || "",
        settingsJson: room?.settingsJson || JSON.stringify(settings),
        roomName: name,
      });

      setToast("룸 이름을 저장했어요");
      await loadRoomAndEvents();
    } catch (e) {
      console.error(e);
      setError(e?.message || "룸 이름 저장 실패");
    } finally {
      setLoading(false);
    }
  }

  function openAddModalForDay(dayStr) {
    setSelectedDay(dayStr);

    const base = startOfDayLocal(dayStr);
    const s = new Date(base.getTime());
    s.setHours(9, 0, 0, 0);
    const e = new Date(base.getTime());
    e.setHours(10, 0, 0, 0);

    setAllDay(false);
    setStartLocal(fmtDateTimeLocalInput(s));
    setEndLocal(fmtDateTimeLocalInput(e));
    setTitle("");
    setTag("");
    setError("");
    setOpenAdd(true);
  }

  async function onAddEvent() {
    setError("");

    try {
      let startISO;
      let endISO;

      if (allDay) {
        const d0 = startOfDayLocal(selectedDay);
        const d1 = addDaysLocal(d0, 1);
        startISO = d0.toISOString();
        endISO = d1.toISOString();
      } else {
        if (!startLocal || !endLocal) {
          setError("시작/종료 시간을 입력하세요.");
          return;
        }
        startISO = toISOFromLocalDateTimeInput(startLocal);
        endISO = toISOFromLocalDateTimeInput(endLocal);
      }

      const mins = minutesBetweenISO(startISO, endISO);
      if (mins <= 0) {
        setError("종료 시간이 시작 시간보다 이후여야 합니다.");
        return;
      }
      if (!allDay && mins < 15) {
        setError("최소 15분 이상으로 입력하세요.");
        return;
      }

      setLoading(true);

      const row = {
        eventId: makeId("evt"),
        roomId,
        participantId,
        participantName: participantName || "",
        title: title || "",
        tag: tag || "",
        startISO,
        endISO,
        createdAt: new Date().toISOString(),
        allDay: allDay ? "true" : "false",
        deletedAt: "", // ✅ 소프트 삭제 대비
      };

      await sheetdb.postSheet("events", row);

      setEvents((prev) => sortEventsByStartAsc([...prev, row]));
      setOpenAdd(false);
      setToast("일정을 추가했어요");
    } catch (e) {
      console.error(e);
      setError(e?.message || "일정 추가 실패");
    } finally {
      setLoading(false);
    }
  }

  // ✅ 삭제(소프트 삭제): tombstone row 추가
  async function onDeleteEvent(ev) {
    if (!ev?.eventId) return;

    const ok = window.confirm("이 일정을 삭제할까요?");
    if (!ok) return;

    try {
      setLoading(true);

      await sheetdb.postSheet("events", {
        eventId: ev.eventId,
        roomId: ev.roomId,
        participantId: ev.participantId,
        participantName: ev.participantName || "",
        title: ev.title || "",
        tag: ev.tag || "",
        startISO: ev.startISO,
        endISO: ev.endISO,
        createdAt: ev.createdAt || new Date().toISOString(),
        allDay: ev.allDay || "false",
        deletedAt: new Date().toISOString(), // ✅ tombstone
      });

      // 로컬에서 즉시 제거(UX)
      setEvents((prev) => prev.filter((x) => x.eventId !== ev.eventId));
      setToast("삭제했어요");
    } catch (e) {
      console.error(e);
      setError(e?.message || "삭제 실패");
    } finally {
      setLoading(false);
    }
  }

  function prevMonth() {
    const d = new Date(calYear, calMonth, 1);
    d.setMonth(d.getMonth() - 1);
    setCalYear(d.getFullYear());
    setCalMonth(d.getMonth());
  }

  function nextMonth() {
    const d = new Date(calYear, calMonth, 1);
    d.setMonth(d.getMonth() + 1);
    setCalYear(d.getFullYear());
    setCalMonth(d.getMonth());
  }

  const topTitle = room?.roomName ? room.roomName : "이때어때";

  return (
    <AppShell
      top={
        <TopNav
          title={topTitle}
          left={
            <Button variant="ghost" onClick={() => nav("/")}>
              홈
            </Button>
          }
          right={
            <Button variant="ghost" onClick={onCopyLink}>
              공유
            </Button>
          }
        />
      }
    >
      {/* room id 작은 표시 */}
      <div className="text-[12px] text-[color:var(--muted)] mb-2">
        room id: <span className="font-mono">{roomId}</span>
      </div>

      {/* ---------- 캘린더 ---------- */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-[15px] font-semibold">캘린더</div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={prevMonth}>
              이전
            </Button>
            <Button variant="ghost" onClick={nextMonth}>
              다음
            </Button>
          </div>
        </div>

        <div className="mt-2 text-[12px] text-[color:var(--muted)]">
          회색: 기간 밖 · 점: 일정 존재 · 녹색=가능(완전 비어있음) · 주황=주의(일부 시간 가능) · 빨강=불가능(최소{" "}
          {minMins}분 공통 시간 없음)
        </div>

        <div className="mt-4 grid grid-cols-7 gap-2 text-[12px] text-[color:var(--muted)]">
          {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
            <div key={d} className="text-center">
              {d}
            </div>
          ))}
        </div>

        <div className="mt-2 grid gap-2">
          {weeks.map((row, i) => (
            <div key={i} className="grid grid-cols-7 gap-2">
              {row.map((d) => {
                const dayStr = yyyyMmDdLocal(d);
                const stat = dayStats.get(dayStr) || { busyCount: 0, hasFree: false };

                const isThisMonth = d.getMonth() === calMonth;
                const isInRoom = inRange(dayStr, roomRangeStart, roomRangeEnd);
                const isSelected = dayStr === selectedDay;

                const isBusy = (stat.busyCount || 0) > 0;

                // ✅ 상태 결정
                let status = "none"; // ok/warn/no
                if (isInRoom) {
                  if (!isBusy) status = "ok";
                  else if (stat.hasFree) status = "warn";
                  else status = "no";
                }

                const baseCls =
                  "rounded-[14px] border border-black/10 bg-white px-2 py-2 text-left min-h-[52px] relative";
                const dimCls = !isThisMonth || !isInRoom ? "opacity-40" : "";
                const selCls = isSelected ? "ring-2 ring-black/10" : "";

                const statusBorderCls =
                  status === "ok"
                    ? "border-emerald-400"
                    : status === "warn"
                    ? "border-orange-400"
                    : status === "no"
                    ? "border-red-400"
                    : "";

                return (
                  <button
                    key={dayStr}
                    className={`${baseCls} ${dimCls} ${selCls} ${statusBorderCls}`}
                    onClick={() => setSelectedDay(dayStr)}
                    onDoubleClick={() => openAddModalForDay(dayStr)}
                    title="클릭: 선택 / 더블클릭: 일정 추가"
                  >
                    <div className="text-[13px] font-semibold">{d.getDate()}</div>

                    {/* 일정 점(회색) */}
                    {isInRoom && isBusy ? (
                      <div className="absolute bottom-2 left-2 flex gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-black/40" />
                        {stat.busyCount > 3 ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-black/20" />
                        ) : null}
                      </div>
                    ) : null}

                    {/* 상태 라벨 */}
                    {isInRoom && status !== "none" ? (
                      <div
                        className={`absolute bottom-2 right-2 text-[10px] font-semibold ${
                          status === "ok"
                            ? "text-emerald-600"
                            : status === "warn"
                            ? "text-orange-600"
                            : "text-red-600"
                        }`}
                      >
                        {status === "ok" ? "가능" : status === "warn" ? "주의" : "불가능"}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={() => openAddModalForDay(selectedDay)} disabled={loading}>
            + 일정 추가
          </Button>
        </div>
      </Card>

      {/* ---------- 아래 섹션 ---------- */}
      <div className="grid gap-4 md:grid-cols-2 mt-4">
        {/* 내 정보 */}
        <Card className="p-5">
          <div className="text-[15px] font-semibold">내 정보</div>

          <div className="mt-3">
            <div className="text-[12px] text-[color:var(--muted)] mb-1">내 이름(옵션)</div>
            <input
              className="w-full rounded-[14px] px-3 py-2 text-[14px] bg-white border border-black/10 outline-none focus:ring-2 focus:ring-black/10"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="예: 유빈"
            />
          </div>

          <div className="mt-3 text-[12px] text-[color:var(--muted)]">
            내 ID: <span className="font-mono">{participantId}</span>
          </div>
        </Card>

        {/* 룸 설정(룸 이름 + 기간 변경) */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div className="text-[15px] font-semibold">룸 설정</div>
            <Button variant="ghost" onClick={loadRoomAndEvents} disabled={loading}>
              새로고침
            </Button>
          </div>

          {/* 룸 이름 */}
          <div className="mt-3">
            <div className="text-[12px] text-[color:var(--muted)] mb-1">룸 이름</div>
            <div className="flex gap-2">
              <input
                className="w-full rounded-[14px] px-3 py-2 text-[14px] bg-white border border-black/10 outline-none focus:ring-2 focus:ring-black/10"
                value={roomNameEdit}
                onChange={(e) => setRoomNameEdit(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSaveRoomName();
                }}
                placeholder="예: 2026 1월 밥약"
                maxLength={30}
              />
              <Button onClick={onSaveRoomName} disabled={loading} className="whitespace-nowrap px-4">
                저장
              </Button>
            </div>
          </div>

          {/* 기간 */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div>
              <div className="text-[12px] text-[color:var(--muted)] mb-1">시작일</div>
              <input
                type="date"
                className="w-full rounded-[14px] px-3 py-2 text-[14px] bg-white border border-black/10 outline-none focus:ring-2 focus:ring-black/10"
                value={rangeStartEdit}
                onChange={(e) => setRangeStartEdit(clampDateStr(e.target.value))}
              />
            </div>
            <div>
              <div className="text-[12px] text-[color:var(--muted)] mb-1">종료일</div>
              <input
                type="date"
                className="w-full rounded-[14px] px-3 py-2 text-[14px] bg-white border border-black/10 outline-none focus:ring-2 focus:ring-black/10"
                value={rangeEndEdit}
                onChange={(e) => setRangeEndEdit(clampDateStr(e.target.value))}
              />
            </div>
          </div>

          <div className="mt-3 text-[12px] text-[color:var(--muted)]">
            기준 시간: {settings.workStart}~{settings.workEnd} / 최소 {minMins}분
          </div>

          <div className="mt-4 flex justify-end">
            <Button onClick={onSaveRange} disabled={loading}>
              기간 저장
            </Button>
          </div>

          {error ? (
            <div className="mt-3 text-[12px] text-red-600 whitespace-pre-wrap">{error}</div>
          ) : null}
        </Card>

        {/* 선택한 날짜 일정 목록 */}
        <Card className="p-5 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="text-[15px] font-semibold">
              {selectedDay} 일정{" "}
              <span className="ml-2 text-[12px] text-[color:var(--muted)]">
                ({selectedDayEvents.length}개)
              </span>
            </div>
            <Button variant="ghost" onClick={() => openAddModalForDay(selectedDay)} disabled={loading}>
              + 추가
            </Button>
          </div>

          <div className="mt-4 grid gap-2">
            {selectedDayEvents.length === 0 ? (
              <div className="text-[13px] text-[color:var(--muted)]">이 날에는 일정이 없어요.</div>
            ) : (
              selectedDayEvents.map((ev) => {
                const mins = minutesBetweenISO(ev.startISO, ev.endISO);
                const isAllDay = String(ev.allDay) === "true";
                return (
                  <div key={ev.eventId} className="rounded-[14px] bg-white border border-black/10 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[14px] font-semibold truncate">
                          {ev.title || "(제목 없음)"}{" "}
                          {ev.tag ? (
                            <span className="text-[12px] text-[color:var(--muted)]">#{ev.tag}</span>
                          ) : null}
                          {isAllDay ? (
                            <span className="ml-2 text-[12px] text-[color:var(--muted)]">하루종일</span>
                          ) : null}
                        </div>
                      </div>

                      {/* ✅ 삭제 버튼(UI 유지, 버튼만 추가) */}
                      <Button
                        variant="ghost"
                        className="text-red-600 whitespace-nowrap shrink-0"
                        onClick={() => onDeleteEvent(ev)}
                        disabled={loading}
                      >
                        삭제
                      </Button>
                    </div>

                    <div className="mt-1 text-[12px] text-[color:var(--muted)]">
                      {new Date(ev.startISO).toLocaleString()} ~ {new Date(ev.endISO).toLocaleString()} · {mins}분
                    </div>
                    <div className="mt-1 text-[12px] text-[color:var(--muted)]">
                      작성자: {ev.participantName || ev.participantId}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* ---------- 일정 추가 모달 ---------- */}
      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title="일정 추가">
        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <div className="text-[12px] text-[color:var(--muted)]">선택한 날짜: {selectedDay}</div>

            {/* 하루종일 토글 */}
            <button
              type="button"
              onClick={() => setAllDay((v) => !v)}
              className="flex items-center gap-2 rounded-[14px] border border-black/10 bg-white px-3 py-2 text-[12px]"
              title="하루종일"
            >
              <span
                className={`h-4 w-7 rounded-full relative border border-black/10 ${
                  allDay ? "bg-black/10" : "bg-white"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-3 w-3 rounded-full bg-black/50 transition-all ${
                    allDay ? "left-[14px]" : "left-0.5"
                  }`}
                />
              </span>
              하루종일
            </button>
          </div>

          <div>
            <div className="text-[12px] text-[color:var(--muted)] mb-1">제목(옵션)</div>
            <input
              className="w-full rounded-[14px] px-3 py-2 text-[14px] bg-white border border-black/10 outline-none focus:ring-2 focus:ring-black/10"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 알바"
            />
          </div>

          <div>
            <div className="text-[12px] text-[color:var(--muted)] mb-1">태그(옵션)</div>
            <input
              className="w-full rounded-[14px] px-3 py-2 text-[14px] bg-white border border-black/10 outline-none focus:ring-2 focus:ring-black/10"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="work / class"
            />
          </div>

          {!allDay ? (
            <>
              <div>
                <div className="text-[12px] text-[color:var(--muted)] mb-1">시작</div>
                <input
                  type="datetime-local"
                  className="w-full rounded-[14px] px-3 py-2 text-[14px] bg-white border border-black/10 outline-none focus:ring-2 focus:ring-black/10"
                  value={startLocal}
                  onChange={(e) => setStartLocal(e.target.value)}
                />
              </div>

              <div>
                <div className="text-[12px] text-[color:var(--muted)] mb-1">종료</div>
                <input
                  type="datetime-local"
                  className="w-full rounded-[14px] px-3 py-2 text-[14px] bg-white border border-black/10 outline-none focus:ring-2 focus:ring-black/10"
                  value={endLocal}
                  onChange={(e) => setEndLocal(e.target.value)}
                />
              </div>

              <div className="text-[12px] text-[color:var(--muted)]">* 최소 15분 이상</div>
            </>
          ) : (
            <div className="text-[12px] text-[color:var(--muted)]">
              하루종일은 <span className="font-mono">00:00 ~ 다음날 00:00</span>으로 저장됩니다.
            </div>
          )}

          {error ? (
            <div className="text-[12px] text-red-600 whitespace-pre-wrap">{error}</div>
          ) : null}

          <div className="flex gap-2 justify-end mt-2">
            <Button variant="ghost" onClick={() => setOpenAdd(false)} disabled={loading}>
              취소
            </Button>
            <Button onClick={onAddEvent} disabled={loading}>
              {loading ? "저장 중…" : "저장"}
            </Button>
          </div>
        </div>
      </Modal>

      <Toast message={toast} />
    </AppShell>
  );
}
