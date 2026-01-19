import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import TopNav from "../components/TopNav";
import Card from "../components/Card";
import Button from "../components/Button";
import Toast from "../components/Toast";
import { useRoomStore } from "../store/useRoomStore";
import { computeRecommendations } from "../lib/recommend";
import { fmtDayLabel, fmtTime, safeParseISO } from "../lib/time";

export default function RecommendPage() {
  const nav = useNavigate();
  const { roomId } = useParams();
  const { room, events, loading, error, refresh } = useRoomStore();

  const [toast, setToast] = useState("");

  useEffect(() => {
    refresh(roomId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 1400);
    return () => clearTimeout(t);
  }, [toast]);

  const settings = useMemo(() => {
    try {
      return room?.settingsJson ? JSON.parse(room.settingsJson) : {};
    } catch {
      return {};
    }
  }, [room]);

  const rec = useMemo(() => {
    if (!room) return { top: [], all: [] };
    return computeRecommendations({
      events: (events || []).map((e) => ({
        ...e,
        // 방어: 혹시 start/end가 비어있으면 skip됨
        startISO: e.startISO,
        endISO: e.endISO,
      })),
      rangeStart: room.rangeStart,
      rangeEnd: room.rangeEnd,
      workStart: settings.workStart || "09:00",
      workEnd: settings.workEnd || "22:00",
      minMins: settings.minMins || 60,
      stepMins: settings.stepMins || 15,
      topN: settings.topN || 10,
    });
  }, [events, room, settings]);

  const groupedAll = useMemo(() => {
    const map = new Map();
    for (const s of rec.all) {
      if (!map.has(s.date)) map.set(s.date, []);
      map.get(s.date).push(s);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rec.all]);

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href.replace("/recommend", ""));
    setToast("룸 링크를 복사했어요");
  }

  return (
    <AppShell
      top={
        <TopNav
          left={
            <Button variant="ghost" onClick={() => nav(`/r/${roomId}`)}>
              뒤로
            </Button>
          }
          title="추천 시간"
          right={
            <Button variant="ghost" onClick={copyLink}>
              공유
            </Button>
          }
        />
      }
    >
      <div className="grid gap-4 md:grid-cols-[420px,1fr]">
        <div className="grid gap-4">
          <Card className="p-4">
            <div className="text-[15px] font-semibold">설정</div>
            <div className="mt-2 text-[13px] text-[color:var(--muted)]">
              기간: {room?.rangeStart || "-"} ~ {room?.rangeEnd || "-"}
            </div>
            <div className="mt-1 text-[13px] text-[color:var(--muted)]">
              추천 시간대: {settings.workStart || "09:00"} ~ {settings.workEnd || "22:00"}
            </div>
            <div className="mt-1 text-[13px] text-[color:var(--muted)]">
              최소 길이: {settings.minMins || 60}분 / 간격: {settings.stepMins || 15}분
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-[15px] font-semibold">추천 TOP</div>
            {loading ? (
              <div className="mt-3 text-[13px] text-[color:var(--muted)]">계산 중…</div>
            ) : error ? (
              <div className="mt-3 text-[13px] text-red-600">에러: {error}</div>
            ) : rec.top.length === 0 ? (
              <div className="mt-3 text-[13px] text-[color:var(--muted)]">
                공통으로 비는 시간이 없어요. 기간/시간대를 조정하거나 일정을 확인해보세요.
              </div>
            ) : (
              <div className="mt-3 grid gap-2">
                {rec.top.map((s, idx) => (
                  <div
                    key={`${s.date}-${idx}-${s.start.toISOString()}`}
                    className="rounded-2xl border border-[color:var(--border)] bg-white px-3 py-3"
                  >
                    <div className="text-[14px] font-semibold">
                      {s.date} · {fmtTime(s.start)}–{fmtTime(s.end)}
                    </div>
                    <div className="mt-1 text-[12px] text-[color:var(--muted)]">
                      {s.durationMinutes}분 · score {Math.round(s.score)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="grid gap-4">
          <Card className="p-4">
            <div className="text-[15px] font-semibold">전체 빈 시간</div>
            {rec.all.length === 0 ? (
              <div className="mt-3 text-[13px] text-[color:var(--muted)]">
                표시할 슬롯이 없습니다.
              </div>
            ) : (
              <div className="mt-3 grid gap-3">
                {groupedAll.map(([date, list]) => {
                  const d = safeParseISO(date + "T00:00:00");
                  return (
                    <div key={date} className="rounded-2xl border border-[color:var(--border)] bg-white">
                      <div className="border-b border-[color:var(--border)] px-3 py-3 text-[14px] font-semibold">
                        {d ? fmtDayLabel(d) : date}
                      </div>
                      <div className="grid gap-2 p-3">
                        {list.slice(0, 12).map((s, idx) => (
                          <div
                            key={`${date}-${idx}-${s.start.toISOString()}`}
                            className="flex items-center justify-between rounded-xl bg-black/5 px-3 py-2"
                          >
                            <div className="text-[13px] font-semibold">
                              {fmtTime(s.start)}–{fmtTime(s.end)}
                            </div>
                            <div className="text-[12px] text-[color:var(--muted)]">
                              {s.durationMinutes}분
                            </div>
                          </div>
                        ))}
                        {list.length > 12 ? (
                          <div className="text-[12px] text-[color:var(--muted)]">
                            +{list.length - 12}개 더 있음(필터/스크롤 v2)
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Toast message={toast} />
    </AppShell>
  );
}
