// src/lib/sheetdb.js
import { supabase } from "./supabaseClient";

/**
 * Supabase 어댑터 (기존 sheetdb API 모양 유지)
 * - postSheet(sheetName, row): insert 1 row (append-only)
 * - getSheet(sheetName, { roomId }): roomId 기준 select
 * - searchSheet(sheetName, { roomId }): 동일 (rooms 용)
 *
 * ✅ 현재 Supabase 테이블 컬럼이 전부 소문자(예: roomid, createdat, rangestart...)인 상태를 지원
 *    프론트는 기존대로 camelCase(roomId, createdAt, rangeStart...) 그대로 사용 가능
 */

const TABLES = {
  rooms: "rooms",
  events: "events",
};

// 프론트(camelCase) -> DB(소문자 컬럼명)
function toDbRow(table, row = {}) {
  if (table === "rooms") {
    return {
      roomid: row.roomId ?? row.roomid ?? null,
      createdat: row.createdAt ?? row.createdat ?? null,
      roomname: row.roomName ?? row.roomname ?? null,
      rangestart: row.rangeStart ?? row.rangestart ?? null,
      rangeend: row.rangeEnd ?? row.rangeend ?? null,
      settingsjson: row.settingsJson ?? row.settingsjson ?? null,
    };
  }

  if (table === "events") {
    return {
      eventid: row.eventId ?? row.eventid ?? null,
      roomid: row.roomId ?? row.roomid ?? null,
      participantid: row.participantId ?? row.participantid ?? null,
      participantname: row.participantName ?? row.participantname ?? null,
      title: row.title ?? null,
      tag: row.tag ?? null,
      startiso: row.startISO ?? row.startiso ?? null,
      endiso: row.endISO ?? row.endiso ?? null,
      createdat: row.createdAt ?? row.createdat ?? null,
      allday: row.allDay ?? row.allday ?? null,
      deletedat: row.deletedAt ?? row.deletedat ?? null,
    };
  }

  // 기본: 그대로
  return row;
}

// DB(소문자 컬럼명) -> 프론트(camelCase)
function fromDbRow(table, r = {}) {
  if (table === "rooms") {
    return {
      id: r.id,
      roomId: r.roomid,
      createdAt: r.createdat,
      roomName: r.roomname,
      rangeStart: r.rangestart,
      rangeEnd: r.rangeend,
      settingsJson: r.settingsjson,
    };
  }

  if (table === "events") {
    return {
      id: r.id,
      eventId: r.eventid,
      roomId: r.roomid,
      participantId: r.participantid,
      participantName: r.participantname,
      title: r.title,
      tag: r.tag,
      startISO: r.startiso,
      endISO: r.endiso,
      createdAt: r.createdat,
      allDay: r.allday,
      deletedAt: r.deletedat,
    };
  }

  return r;
}

async function insertRow(table, row) {
  const dbRow = toDbRow(table, row);

  const { error } = await supabase.from(table).insert([dbRow]);
  if (error) throw new Error(`insert ${table} failed: ${error.message}`);

  return true;
}

async function selectByRoomId(table, roomId) {
  if (!roomId) return [];

  // DB 컬럼이 roomid 이므로 eq("roomid", roomId)
  const { data, error } = await supabase.from(table).select("*").eq("roomid", roomId);

  if (error) throw new Error(`select ${table} failed: ${error.message}`);

  return (data || []).map((r) => fromDbRow(table, r));
}

export const sheetdb = {
  async postSheet(sheetName, row) {
    const table = TABLES[sheetName];
    if (!table) throw new Error(`Unknown sheetName: ${sheetName}`);
    return insertRow(table, row);
  },

  async getSheet(sheetName, { roomId } = {}) {
    const table = TABLES[sheetName];
    if (!table) return [];
    return selectByRoomId(table, roomId);
  },

  async searchSheet(sheetName, query = {}) {
    const table = TABLES[sheetName];
    if (!table) return [];
    return selectByRoomId(table, query.roomId);
  },
};
