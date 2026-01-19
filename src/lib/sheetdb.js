const BASE = import.meta.env.VITE_SHEETDB_BASE;

if (!BASE) {
  console.warn("VITE_SHEETDB_BASE is not set. Create .env and restart dev server.");
}

function withSheet(path, sheet) {
  // path는 보통 "" 또는 "/search" 같은 부가 경로만 받음
  const p = path?.startsWith("/") ? path : path ? `/${path}` : "";
  const url = new URL(`${BASE}${p}`);
  url.searchParams.set("sheet", sheet);
  return url.toString();
}

async function req(url, options) {
  const res = await fetch(url, options);
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(`${options?.method || "GET"} ${url} failed: ${res.status} ${text}`);
  }
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

export const sheetdb = {
  // ✅ 시트 지정 GET
  getSheet: (sheet) => req(withSheet("", sheet), { method: "GET" }),

  // ✅ 시트 지정 POST (row 또는 rows)
  postSheet: async (sheet, rowOrRows) => {
    const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];

    // payload 키는 data/rows/row 케이스가 있어서 fallback
    try {
      return await req(withSheet("", sheet), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: rows }),
      });
    } catch {
      try {
        return await req(withSheet("", sheet), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows }),
        });
      } catch {
        return await req(withSheet("", sheet), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ row: rows[0] }),
        });
      }
    }
  },

  // ✅ 시트 지정 search (SheetDB가 search를 지원하면)
  searchSheet: (sheet, queryParamsObj) => {
    const url = new URL(withSheet("search", sheet));
    for (const [k, v] of Object.entries(queryParamsObj || {})) {
      url.searchParams.set(k, String(v));
    }
    return req(url.toString(), { method: "GET" });
  },
};
