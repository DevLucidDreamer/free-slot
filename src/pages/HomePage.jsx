import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import TopNav from "../components/TopNav";
import Card from "../components/Card";
import Button from "../components/Button";
import Toast from "../components/Toast";
import Modal from "../components/Modal";
import { makeRoomId } from "../lib/id";
import { sheetdb } from "../lib/sheetdb";

function clamp(s, n) {
  return String(s || "").slice(0, n);
}

function Bubble({ side = "left", children }) {
  const isRight = side === "right";
  return (
    <div className={`flex ${isRight ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "max-w-[78%] rounded-[18px] px-4 py-3 text-[14px] leading-snug shadow-sm",
          isRight ? "bg-[#2F6BFF] text-white" : "bg-black/5 text-black",
        ].join(" ")}
      >
        {children}
      </div>
    </div>
  );
}

function IntroChatCard() {
  return (
    <div className="h-full rounded-[20px] bg-white border border-black/10 shadow-sm p-4 flex flex-col">
      <div className="rounded-[18px] bg-white border border-black/5 shadow-[0_10px_30px_rgba(0,0,0,0.08)] p-4">
        <div className="grid gap-3">
          <Bubble side="left">이때 시간 괜찮아?</Bubble>
          <Bubble side="right">나 그날 알바있어서..</Bubble>
          <Bubble side="right">토요일은 어때?</Bubble>
          <Bubble side="left">그때는 선약있는데..</Bubble>
          <Bubble side="right">스케줄 맞추기 힘드네..ㅠㅠ</Bubble>
          <Bubble side="left">일정 잡기 편한 앱 없나?</Bubble>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-[15px] font-semibold">채팅하다가 약속 잡기 어려울 때</div>
        <div className="mt-1 text-[12px] text-[color:var(--muted)]">
          각자 “바쁜 시간”만 입력하면, 겹치는 빈 시간을 한눈에 볼 수 있어요.
        </div>
      </div>

      <div className="mt-auto" />
    </div>
  );
}

function Calendar3D() {
  return (
    <div className="relative w-full h-[210px] flex items-center justify-center">
      <div
        className="absolute w-[220px] h-[150px] rounded-[18px] bg-black/5"
        style={{ transform: "translate(18px, 18px) rotate(-10deg) skewX(-8deg)" }}
      />
      <div
        className="absolute w-[240px] h-[160px] rounded-[18px] bg-white border border-black/10 shadow-[0_18px_40px_rgba(0,0,0,0.12)] overflow-hidden"
        style={{ transform: "rotate(-10deg) skewX(-8deg)" }}
      >
        <div className="h-[42px] bg-[#2F6BFF] relative">
          <div className="absolute left-4 top-3 flex gap-2">
            <span className="w-3 h-3 rounded-full bg-white/90" />
            <span className="w-3 h-3 rounded-full bg-white/70" />
            <span className="w-3 h-3 rounded-full bg-white/50" />
          </div>
          <div className="absolute right-4 top-2 text-white/90 text-[12px] font-semibold">CAL</div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 28 }).map((_, i) => (
              <div
                key={i}
                className="h-3 rounded bg-black/5"
                style={{ opacity: i % 9 === 0 ? 0.22 : 1 }}
              />
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <div className="h-6 w-20 rounded bg-[#2F6BFF]/15 border border-[#2F6BFF]/25" />
            <div className="h-6 w-14 rounded bg-black/5" />
            <div className="h-6 w-16 rounded bg-black/5" />
          </div>
        </div>
      </div>

      <div
        className="absolute w-[70px] h-[70px] rounded-[18px] bg-[#2F6BFF]/10 border border-[#2F6BFF]/20"
        style={{ transform: "translate(-110px, 70px) rotate(-10deg) skewX(-8deg)" }}
      />
    </div>
  );
}

function IntroCalendarCard() {
  return (
    <div className="h-full rounded-[20px] bg-white border border-black/10 shadow-sm p-4 flex flex-col">
      <Calendar3D />
      <div className="mt-2">
        <div className="text-[15px] font-semibold">각자 캘린더에 “바쁜 시간”만 입력</div>
        <div className="mt-1 text-[12px] text-[color:var(--muted)]">
          자동으로 가능한 날(가능/주의/불가능)이 색으로 표시돼요.
        </div>
      </div>
      <div className="mt-auto" />
    </div>
  );
}

function IntroShareCard() {
  return (
    <div className="h-full rounded-[20px] bg-white border border-black/10 shadow-sm p-4 flex flex-col">
      <div className="rounded-[18px] border border-black/10 bg-white p-4 shadow-sm">
        <div className="text-[14px] font-semibold">링크 공유로 참여</div>
        <div className="mt-2 text-[12px] text-[color:var(--muted)]">
          로그인 없이 링크 하나로 친구들이 바로 들어와 일정 입력 가능
        </div>

        <div className="mt-4 grid gap-2">
          <div className="h-10 rounded-[14px] bg-black/5 flex items-center px-3 text-[12px] text-black/60">
            https://.../r/3S8R6S
          </div>
          <div className="h-10 rounded-[14px] bg-[#2F6BFF] text-white flex items-center justify-center text-[13px] font-semibold">
            공유하고 바로 시작
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-[15px] font-semibold">가장 빠른 방식: 링크 공유</div>
        <div className="mt-1 text-[12px] text-[color:var(--muted)]">
          한 명이 룸 만들고 공유하면, 나머지는 접속해서 일정만 입력하면 끝.
        </div>
      </div>

      <div className="mt-auto" />
    </div>
  );
}

export default function HomePage() {
  const nav = useNavigate();

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  const [joinRoomId, setJoinRoomId] = useState("");

  // 이름(필수)
  const [openName, setOpenName] = useState(false);
  const [nameInput, setNameInput] = useState(() => localStorage.getItem("free-slot.participantName") || "");

  // 슬라이드 구성
  const slides = useMemo(
    () => [
      { key: "chat", node: <IntroChatCard /> },
      { key: "calendar", node: <IntroCalendarCard /> },
      { key: "share", node: <IntroShareCard /> },
    ],
    []
  );

  // 반응형: md 이상이면 2장씩 보여주고 2장 단위로 넘김
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)").matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const perPage = isDesktop ? 2 : 1;

  // “페이지” 배열로 재구성 (예: perPage=2면 [ [0,1], [2,0] ] 형태로 순환)
  const pages = useMemo(() => {
    const out = [];
    const n = slides.length;
    if (n === 0) return out;

    // 순환 페이지 생성
    // perPage=2면 i=0,2,4...로 잡고 각 페이지는 i, i+1
    for (let i = 0; i < n; i += perPage) {
      const items = [];
      for (let j = 0; j < perPage; j++) {
        items.push(slides[(i + j) % n]);
      }
      out.push(items);
    }
    return out;
  }, [slides, perPage]);

  const [pageIndex, setPageIndex] = useState(0);

  // perPage 바뀌면 인덱스 보정
  useEffect(() => {
    setPageIndex(0);
  }, [perPage]);

  // 자동 넘김 + 부드러운 애니메이션
  const timerRef = useRef(null);
  useEffect(() => {
    if (!pages.length) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setPageIndex((v) => (v + 1) % pages.length);
    }, 3800);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pages.length]);

  function normalizeRoomId(input) {
    const s = (input || "").trim();
    if (!s) return "";
    const m = s.match(/\/r\/([A-Za-z0-9_-]+)/);
    if (m?.[1]) return m[1];
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

  function onClickStart() {
    setOpenName(true);
  }

  async function onCreateWithName() {
    const nm = (nameInput || "").trim();
    if (!nm) {
      alert("이름을 입력하세요.");
      return;
    }
    localStorage.setItem("free-slot.participantName", nm);

    try {
      setBusy(true);

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

      await sheetdb.postSheet("rooms", {
        roomId,
        createdAt: nowISO,
        rangeStart,
        rangeEnd,
        settingsJson,
        roomName: "",
      });

      setToast("룸을 만들었어요");
      setOpenName(false);
      nav(`/r/${roomId}`);
    } catch (e) {
      console.error(e);
      alert(`룸 생성 실패: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  // ✅ 카드 “크기 통일”: 슬라이드 뷰포트 높이를 고정
  // 모바일/데스크톱에 따라 높이만 다르게
  const viewportH = isDesktop ? "min-h-[360px]" : "min-h-[420px]";

  return (
    <AppShell top={<TopNav title="이때어때" />}>
      <div className="grid gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[18px] font-semibold">서로 비는 시간, 빠르게 찾기</div>
              <div className="mt-1 text-[12px] text-[color:var(--muted)]">
                바쁜 시간만 입력하면 가능한 날을 바로 확인할 수 있어요.
              </div>
            </div>

            {/* (선택) 수동 버튼 - 원하면 제거 가능 */}
            <div className="hidden md:flex gap-2">
              <Button variant="ghost" onClick={() => setPageIndex((v) => (v - 1 + pages.length) % pages.length)}>
                이전
              </Button>
              <Button variant="ghost" onClick={() => setPageIndex((v) => (v + 1) % pages.length)}>
                다음
              </Button>
            </div>
          </div>

          {/* ✅ 슬라이드 뷰포트 */}
          <div className={`mt-4 overflow-hidden ${viewportH}`}>
            {/* ✅ 트랙: 페이지 수 만큼 가로로 */}
            <div
              className="flex"
              style={{
                width: `${pages.length * 100}%`,
                transform: `translateX(-${pageIndex * (100 / pages.length)}%)`,
                transition: "transform 600ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              {pages.map((page, pi) => (
                <div
                  key={`page_${pi}`}
                  className="shrink-0"
                  style={{
                    width: `${100 / pages.length}%`,
                  }}
                >
                  {/* 페이지 안에서 1장 or 2장 */}
                  <div className={`grid gap-3 ${isDesktop ? "grid-cols-2" : "grid-cols-1"} h-full`}>
                    {page.map((s) => (
                      <div key={s.key} className="h-full">
                        {s.node}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-5">
            <Button onClick={onClickStart} disabled={busy} className="w-full">
              {busy ? "생성 중…" : "새 일정 맞추기 시작"}
            </Button>
            <div className="mt-3 text-[12px] text-[color:var(--muted)]">
              * 로그인 없이 링크로 참여합니다. (이름만 입력)
            </div>
          </div>
        </Card>

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

      {/* 이름 입력 모달 */}
      <Modal open={openName} onClose={() => setOpenName(false)} title="이름 입력">
        <div className="grid gap-3">
          <div className="text-[12px] text-[color:var(--muted)]">
            룸을 만들기 전에, 표시할 이름을 입력해주세요. (필수)
          </div>

          <input
            className="w-full rounded-[14px] px-3 py-2 text-[14px] bg-white border border-black/10 outline-none focus:ring-2 focus:ring-black/10"
            value={nameInput}
            onChange={(e) => setNameInput(clamp(e.target.value, 20))}
            placeholder="예: 유빈"
            maxLength={20}
            onKeyDown={(e) => {
              if (e.key === "Enter") onCreateWithName();
            }}
          />

          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setOpenName(false)} disabled={busy}>
              취소
            </Button>
            <Button onClick={onCreateWithName} disabled={busy}>
              {busy ? "생성 중…" : "시작하기"}
            </Button>
          </div>
        </div>
      </Modal>

      <Toast message={toast} />
    </AppShell>
  );
}
