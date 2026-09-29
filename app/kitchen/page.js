"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const ACTIVE_STATUSES = ["received", "cooking"];

const isActive = (order) => ACTIVE_STATUSES.includes(order.status);

const sortOldestFirst = (list) =>
  [...list].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

// items เป็น jsonb — รองรับหลายรูปแบบ เช่น
// [{name:"หมูสไลด์", qty:2}], [{name, quantity}], ["หมูสไลด์"], {"หมูสไลด์":2}
function normalizeItems(raw) {
  let items = raw;
  if (typeof items === "string") {
    try {
      items = JSON.parse(items);
    } catch {
      return [{ name: items, qty: 1 }];
    }
  }
  if (!items) return [];
  if (Array.isArray(items)) {
    return items.map((it) => {
      if (typeof it === "string") return { name: it, qty: 1 };
      return {
        name: it.name ?? it.item_name ?? it.title ?? "(ไม่ทราบชื่อ)",
        qty: it.qty ?? it.quantity ?? it.count ?? it.amount ?? 1,
      };
    });
  }
  if (typeof items === "object") {
    return Object.entries(items).map(([name, qty]) => ({ name, qty }));
  }
  return [];
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });
}

function minutesAgo(iso, now) {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
}

export default function KitchenPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const fetchOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .in("status", ACTIVE_STATUSES)
      .order("created_at", { ascending: true });

    if (error) {
      setError(error.message);
    } else {
      setError(null);
      setOrders(data ?? []);
    }
    setLoading(false);
  }, []);

  // โหลดครั้งแรก + Realtime
  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel("kitchen-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const row = payload.new;
          if (!isActive(row)) return;
          setOrders((prev) =>
            sortOldestFirst([...prev.filter((o) => o.id !== row.id), row])
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          const row = payload.new;
          setOrders((prev) => {
            const rest = prev.filter((o) => o.id !== row.id);
            return isActive(row) ? sortOldestFirst([...rest, row]) : rest;
          });
        }
      )
      .subscribe((status) => {
        const ok = status === "SUBSCRIBED";
        setConnected(ok);
        // เชื่อมต่อใหม่ (เช่น เน็ตหลุดแล้วกลับมา) → ดึงข้อมูลใหม่กันออเดอร์ตกหล่น
        if (ok) fetchOrders();
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders]);

  // จอเปิดทิ้งไว้ตลอด: อัปเดตนาฬิกาทุก 30 วิ + ดึงข้อมูลซ้ำทุก 60 วิ เป็นตัวสำรอง
  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 30000);
    const backup = setInterval(fetchOrders, 60000);
    return () => {
      clearInterval(clock);
      clearInterval(backup);
    };
  }, [fetchOrders]);

  async function updateStatus(id, newStatus) {
    const previous = orders;

    // อัปเดตหน้าจอทันที (ถ้า served จะเอาการ์ดออกเลย)
    setOrders((prev) =>
      newStatus === "served"
        ? prev.filter((o) => o.id !== id)
        : prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o))
    );

    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      setOrders(previous); // ย้อนกลับถ้าบันทึกไม่สำเร็จ
      setError(`อัปเดตออเดอร์ไม่สำเร็จ: ${error.message}`);
    }
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>🍳 ครัวมาม่าซัง</h1>
        <div style={styles.headerRight}>
          <span style={styles.count}>รอทำ {orders.length} ออเดอร์</span>
          <span
            style={{
              ...styles.dot,
              background: connected ? "#22c55e" : "#ef4444",
            }}
          />
          <span style={styles.connText}>
            {connected ? "เชื่อมต่อแล้ว" : "ขาดการเชื่อมต่อ"}
          </span>
        </div>
      </header>

      {error && <div style={styles.error}>⚠️ {error}</div>}

      {loading ? (
        <p style={styles.empty}>กำลังโหลด...</p>
      ) : orders.length === 0 ? (
        <p style={styles.empty}>ยังไม่มีออเดอร์ค้าง 🎉</p>
      ) : (
        <div style={styles.grid}>
          {orders.map((order) => {
            const cooking = order.status === "cooking";
            const items = normalizeItems(order.items);
            const waited = minutesAgo(order.created_at, now);

            return (
              <section
                key={order.id}
                style={{
                  ...styles.card,
                  background: cooking ? "#fff3c4" : "#ffffff",
                  borderColor: cooking ? "#f59e0b" : "#cbd5e1",
                }}
              >
                <div style={styles.cardTop}>
                  <div>
                    <div style={styles.tableLabel}>โต๊ะ</div>
                    <div style={styles.tableNumber}>{order.table_number}</div>
                  </div>
                  <div style={styles.timeBox}>
                    <div style={styles.time}>{formatTime(order.created_at)}</div>
                    <div
                      style={{
                        ...styles.waited,
                        color: waited >= 15 ? "#dc2626" : "#475569",
                      }}
                    >
                      รอมา {waited} นาที
                    </div>
                    {cooking && <div style={styles.badge}>กำลังทำ</div>}
                  </div>
                </div>

                <ul style={styles.itemList}>
                  {items.length === 0 ? (
                    <li style={styles.item}>(ไม่มีรายการ)</li>
                  ) : (
                    items.map((it, i) => (
                      <li key={i} style={styles.item}>
                        <span>{it.name}</span>
                        <strong style={styles.qty}>× {it.qty}</strong>
                      </li>
                    ))
                  )}
                </ul>

                <div style={styles.actions}>
                  {!cooking && (
                    <button
                      style={{ ...styles.btn, background: "#f59e0b" }}
                      onClick={() => updateStatus(order.id, "cooking")}
                    >
                      เริ่มทำ
                    </button>
                  )}
                  <button
                    style={{ ...styles.btn, background: "#16a34a" }}
                    onClick={() => updateStatus(order.id, "served")}
                  >
                    จัดเสิร์ฟแล้ว
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0f172a",
    padding: "1.25rem",
    color: "#0f172a",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "1rem",
    marginBottom: "1.25rem",
    color: "#f8fafc",
  },
  title: { margin: 0, fontSize: "2.5rem" },
  headerRight: { display: "flex", alignItems: "center", gap: "0.75rem" },
  count: { fontSize: "1.75rem", fontWeight: 700 },
  dot: { width: 16, height: 16, borderRadius: "50%", display: "inline-block" },
  connText: { fontSize: "1.1rem" },
  error: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "0.75rem 1rem",
    borderRadius: 8,
    marginBottom: "1rem",
    fontSize: "1.25rem",
  },
  empty: {
    color: "#94a3b8",
    fontSize: "2.25rem",
    textAlign: "center",
    marginTop: "20vh",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
    gap: "1.25rem",
    alignItems: "start",
  },
  card: {
    border: "5px solid",
    borderRadius: 16,
    padding: "1rem 1.25rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  tableLabel: { fontSize: "1.25rem", fontWeight: 600, color: "#475569" },
  tableNumber: { fontSize: "5rem", fontWeight: 800, lineHeight: 1 },
  timeBox: { textAlign: "right" },
  time: { fontSize: "2rem", fontWeight: 700 },
  waited: { fontSize: "1.25rem", fontWeight: 600 },
  badge: {
    display: "inline-block",
    marginTop: 6,
    background: "#f59e0b",
    color: "#fff",
    padding: "2px 12px",
    borderRadius: 999,
    fontSize: "1.1rem",
    fontWeight: 700,
  },
  itemList: {
    listStyle: "none",
    margin: 0,
    padding: "0.5rem 0",
    borderTop: "2px dashed #94a3b8",
    borderBottom: "2px dashed #94a3b8",
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  item: {
    display: "flex",
    justifyContent: "space-between",
    gap: "1rem",
    fontSize: "1.75rem",
    fontWeight: 600,
  },
  qty: { fontSize: "2rem", whiteSpace: "nowrap" },
  actions: { display: "flex", gap: "0.75rem" },
  btn: {
    flex: 1,
    border: "none",
    borderRadius: 12,
    color: "#fff",
    fontSize: "1.6rem",
    fontWeight: 700,
    padding: "1rem 0.5rem",
    cursor: "pointer",
  },
};
