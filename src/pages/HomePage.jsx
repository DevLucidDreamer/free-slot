import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import TopNav from "../components/TopNav";
import Card from "../components/Card";
import Button from "../components/Button";
import Toast from "../components/Toast";
import { makeRoomId } from "../lib/id";
import { sheetdb } from "../lib/sheetdb";

export default function HomePage() {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  // ✅ 룸 입장용
  const [joinRoomId, setJoinRoomId] = useState("");

  async function onCreate() {
    try {
      setBusy(true);

      const base = import.meta.env.VITE_SHEETDB_BASE;
      if (!base) {
        alert("VITE_SHEETDB_BASE가 비어있습니다. .env 확인 후 dev 서버를 재시작하세요.");
        return;
      }

      const roomId = makeRoomId();
      const nowISO = new Date().toISOString();

      const start = new Date();
      const end = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      const rangeStart = start.toISOString().slice(0, 10);
      const rangeEnd = end.toISOString().slice(0, 10);

      const settingsJson = JSON.stringify({
        workStart: "09:00",
        workEnd: "22:00",
        minMins: 60,
        stepMins: 15,
        topN: 10,
        tz: "Asia/Seoul",
      });

      // ✅ query 방식
      await sheetdb.postSheet("rooms", {
        roomId,
        createdAt: nowISO,
        rangeStart,
        rangeEnd,
        settingsJson,
      });

      setToast("룸을 만들었어요");
      nav(`/r/${roomId}`);
    } catch (e) {
      console.error(e);
      alert(`룸 생성 실패: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  function normalizeRoomId(input) {
    // 사용자가 전체 링크를 붙여넣어도 roomId만 추출
    const s = (input || "").trim();
    if (!s) return "";

    // 예: http://localhost:5173/r/3S8R6S
    const m = s.match(/\/r\/([A-Za-z0-9_-]+)/);
    if (m?.[1]) return m[1];

    // roomId만 입력한 경우
    return s;
  }

  function onJoin() {
    const rid = normalizeRoomId(joinRoomId);
    if (!rid) {
      alert("룸 코드(또는 링크)를 입력하세요.");
      return;
    }
    nav(`/r/${rid}`);
  }

  return (
    <AppShell top={<TopNav title="이때어때" />}>
      <div className="grid gap-4">
        <Card className="p-5">
          <div className="text-[18px] font-semibold">서로 비는 시간 빠르게 찾기</div>
          <p className="mt-2 text-[13px] text-[color:var(--muted)]">
            여러 명이 각자 일정(바쁜 시간)을 입력하면, 모두가 비는 시간 슬롯을 추천합니다.
          </p>

          <div className="mt-4">
            <Button onClick={onCreate} disabled={busy} className="w-full">
              {busy ? "생성 중…" : "새 일정 맞추기 시작"}
            </Button>
          </div>

          <div className="mt-3 text-[12px] text-[color:var(--muted)]">
            * 현재는 로그인 없이 링크로 참여합니다.
          </div>
        </Card>

        {/* ✅ 디버그 제거 → 룸 입장하기 */}
        <Card className="p-5">
          <div className="text-[15px] font-semibold">룸 입장하기</div>
          <div className="mt-2 text-[12px] text-[color:var(--muted)]">
            룸 코드(예: 3S8R6S) 또는 공유 링크를 붙여넣으세요.
          </div>

          <div className="mt-3 grid gap-2">
            <input
              className="w-full rounded-[14px] px-3 py-2 text-[14px] bg-white border border-black/10 outline-none focus:ring-2 focus:ring-black/10"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value)}
              placeholder="룸 코드 또는 링크"
              autoCapitalize="none"
              autoCorrect="off"
            />
            <Button onClick={onJoin} variant="ghost" className="w-full">
              룸 입장하기
            </Button>
          </div>
        </Card>
      </div>

      <Toast message={toast} />
    </AppShell>
  );
}
