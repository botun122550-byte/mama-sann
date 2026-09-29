"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

// ====== ตั้งค่าราคา (แก้ตรงนี้ให้ตรงกับร้าน) ======
const ADULT_PRICE = 167; // ราคาบุฟเฟต์ผู้ใหญ่ ต่อคน (บาท)
const CHILD_PRICE = 99; // ราคาบุฟเฟต์เด็ก ต่อคน (บาท)
const SERVICE_CHARGE_PERCENT = 3; // ค่าบริการ % (ใส่ 10 ถ้าเก็บ 10%)
const CLOSED_STATUS = "closed"; // ค่า status ของ session ที่ปิดโต๊ะแล้ว
// =================================================

const PENDING_ORDER_STATUSES = ["received", "cooking"];

const baht = (n) => Number(n).toLocaleString("th-TH");

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });
}

function minutesSince(iso, now) {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
}

function formatDuration(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h} ชม. ${m} นาที` : `${m} นาที`;
}

function calcBill(session) {
  const adults = Number(session.adult_count) || 0;
  const children = Number(session.child_count) || 0;
  const adultTotal = adults * ADULT_PRICE;
  const childTotal = children * CHILD_PRICE;
  const subtotal = adultTotal + childTotal;
  const service = Math.round((subtotal * SERVICE_CHARGE_PERCENT) / 100);
  return { adults, children, adultTotal, childTotal, subtotal, service, total: subtotal + service };
}

export default function BillPage() {
  const [sessions, setSessions] = useState([]);
  const [pendingBySession, setPendingBySession] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [closingId, setClosingId] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  const fetchData = useCallback(async () => {
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .neq("status", CLOSED_STATUS)
      .order("created_at", { ascending: true });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const list = data ?? [];
    const ids = list.map((s) => s.id);
    const pending = {};

    if (ids.length > 0) {
      const { data: orders } = await supabase
        .from("orders")
        .select("id, session_id")
        .in("session_id", ids)
        .in("status", PENDING_ORDER_STATUSES);

      (orders ?? []).forEach((o) => {
        pending[o.session_id] = (pending[o.session_id] || 0) + 1;
      });
    }

    setError(null);
    setSessions(list);
    setPendingBySession(pending);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const refresh = setInterval(fetchData, 30000);
    const clock = setInterval(() => setNow(Date.now()), 30000);
    return () => {
      clearInterval(refresh);
      clearInterval(clock);
    };
  }, [fetchData]);

  async function closeTable(session) {
    const pending = pendingBySession[session.id] || 0;
    const bill = calcBill(session);
    const warn = pending > 0 ? `\n\n⚠️ ยังมี ${pending} ออเดอร์ค้างอยู่ในครัว` : "";
    const ok = window.confirm(
      `ปิดโต๊ะ ${session.table_number} ยอด ${baht(bill.total)} บาท ใช่ไหม?${warn}`
    );
    if (!ok) return;

    setClosingId(session.id);
    const { error } = await supabase
      .from("sessions")
      .update({ status: CLOSED_STATUS })
      .eq("id", session.id);
    setClosingId(null);

    if (error) {
      setError(`ปิดโต๊ะไม่สำเร็จ: ${error.message}`);
      return;
    }
    setSessions((prev) => prev.filter((s) => s.id !== session.id));
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>🧾 สรุปบิล / ปิดโต๊ะ</h1>
        <div style={styles.headerRight}>
          <span style={styles.count}>โต๊ะที่เปิดอยู่ {sessions.length}</span>
          <button style={styles.refreshBtn} onClick={fetchData}>
            รีเฟรช
          </button>
        </div>
      </header>

      <p style={styles.priceNote}>
        ผู้ใหญ่ {baht(ADULT_PRICE)} บาท / เด็ก {baht(CHILD_PRICE)} บาท
        {SERVICE_CHARGE_PERCENT > 0 ? ` / ค่าบริการ ${SERVICE_CHARGE_PERCENT}%` : ""}
      </p>

      {error && <div style={styles.error}>⚠️ {error}</div>}

      {loading ? (
        <p style={styles.empty}>กำลังโหลด...</p>
      ) : sessions.length === 0 ? (
        <p style={styles.empty}>ไม่มีโต๊ะที่เปิดอยู่</p>
      ) : (
        <div style={styles.grid}>
          {sessions.map((s) => {
            const bill = calcBill(s);
            const pending = pendingBySession[s.id] || 0;
            const mins = minutesSince(s.created_at, now);

            return (
              <section key={s.id} style={styles.card}>
                <div style={styles.cardTop}>
                  <div>
                    <div style={styles.tableLabel}>โต๊ะ</div>
                    <div style={styles.tableNumber}>{s.table_number}</div>
                  </div>
                  <div style={styles.timeBox}>
                    <div style={styles.small}>เปิดโต๊ะ {formatTime(s.created_at)}</div>
                    <div style={styles.small}>นั่งมา {formatDuration(mins)}</div>
                  </div>
                </div>

                {pending > 0 && (
                  <div style={styles.pending}>🍳 ยังมี {pending} ออเดอร์ค้างในครัว</div>
                )}

                <div style={styles.lines}>
                  <div style={styles.line}>
                    <span>
                      ผู้ใหญ่ {bill.adults} × {baht(ADULT_PRICE)}
                    </span>
                    <span>{baht(bill.adultTotal)}</span>
                  </div>
                  <div style={styles.line}>
                    <span>
                      เด็ก {bill.children} × {baht(CHILD_PRICE)}
                    </span>
                    <span>{baht(bill.childTotal)}</span>
                  </div>
                  {bill.service > 0 && (
                    <div style={styles.line}>
                      <span>ค่าบริการ {SERVICE_CHARGE_PERCENT}%</span>
                      <span>{baht(bill.service)}</span>
                    </div>
                  )}
                </div>

                <div style={styles.totalRow}>
                  <span>รวมทั้งสิ้น</span>
                  <span>{baht(bill.total)} ฿</span>
                </div>

                <button
                  style={{ ...styles.closeBtn, opacity: closingId === s.id ? 0.6 : 1 }}
                  disabled={closingId === s.id}
                  onClick={() => closeTable(s)}
                >
                  {closingId === s.id ? "กำลังปิด..." : "ชำระเงินแล้ว / ปิดโต๊ะ"}
                </button>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#0f172a", padding: "1.25rem", color: "#0f172a" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "1rem",
    color: "#f8fafc",
  },
  title: { margin: 0, fontSize: "2rem" },
  headerRight: { display: "flex", alignItems: "center", gap: "1rem" },
  count: { fontSize: "1.4rem", fontWeight: 700 },
  refreshBtn: {
    background: "#334155",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "0.5rem 1rem",
    fontSize: "1.1rem",
    cursor: "pointer",
  },
  priceNote: { color: "#94a3b8", fontSize: "1.1rem", margin: "0.5rem 0 1.25rem" },
  error: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "0.75rem 1rem",
    borderRadius: 8,
    marginBottom: "1rem",
    fontSize: "1.15rem",
  },
  empty: { color: "#94a3b8", fontSize: "1.8rem", textAlign: "center", marginTop: "20vh" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: "1.25rem",
    alignItems: "start",
  },
  card: {
    background: "#fff",
    border: "4px solid #cbd5e1",
    borderRadius: 16,
    padding: "1rem 1.25rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  tableLabel: { fontSize: "1.1rem", fontWeight: 600, color: "#475569" },
  tableNumber: { fontSize: "4rem", fontWeight: 800, lineHeight: 1 },
  timeBox: { textAlign: "right" },
  small: { fontSize: "1.05rem", color: "#475569", fontWeight: 600 },
  pending: {
    background: "#fef3c7",
    color: "#92400e",
    padding: "0.4rem 0.75rem",
    borderRadius: 8,
    fontSize: "1.1rem",
    fontWeight: 600,
  },
  lines: {
    borderTop: "2px dashed #94a3b8",
    paddingTop: "0.6rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.3rem",
  },
  line: { display: "flex", justifyContent: "space-between", fontSize: "1.3rem" },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    borderTop: "2px solid #0f172a",
    paddingTop: "0.6rem",
    fontSize: "1.9rem",
    fontWeight: 800,
  },
  closeBtn: {
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    fontSize: "1.4rem",
    fontWeight: 700,
    padding: "0.9rem 0.5rem",
    cursor: "pointer",
  },
};
