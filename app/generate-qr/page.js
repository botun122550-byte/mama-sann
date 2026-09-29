'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const minutesSince = (iso) =>
  Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));

export default function GenerateQrPage() {
  const [table, setTable] = useState('');
  const [adults, setAdults] = useState('');
  const [children, setChildren] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [existing, setExisting] = useState(null); // session เก่าที่ยังเปิดค้าง
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [openedMinutes, setOpenedMinutes] = useState(0);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const t = Number(table);
    const a = Number(adults || 0);
    const c = Number(children || 0);
    if (!Number.isInteger(t) || t < 1) return setError('กรอกเลขโต๊ะเป็นตัวเลข 1 ขึ้นไป');
    if (!Number.isInteger(a) || a < 0 || !Number.isInteger(c) || c < 0)
      return setError('จำนวนคนต้องเป็นตัวเลขเต็ม 0 ขึ้นไป');
    if (a + c < 1) return setError('ต้องมีลูกค้าอย่างน้อย 1 คน');

    setBusy(true);
    try {
      // 1) เช็คว่าโต๊ะนี้มี session ที่ยังเปิดอยู่หรือไม่
      const { data: open, error: findErr } = await supabase
        .from('sessions')
        .select('id, table_number, adult_count, child_count, created_at')
        .eq('table_number', t)
        .eq('status', 'open')
        .order('created_at', { ascending: true })
        .limit(1);
      if (findErr) throw findErr;

      if (open && open.length > 0) {
        setExisting(open[0]);
        return;
      }

      // 2) ไม่มี -> สร้าง session ใหม่
      const { error: insErr } = await supabase
        .from('sessions')
        .insert({ table_number: t, adult_count: a, child_count: c, status: 'open' });
      if (insErr) throw insErr;

      const url = `${window.location.origin}/order/${t}`;
      setResult({ table: t, adults: a, children: c, url });
    } catch (err) {
      setError(`เปิดโต๊ะไม่สำเร็จ: ${err.message || 'ลองอีกครั้ง'}`);
    } finally {
      setBusy(false);
    }
  };

  const openConfirm = () => {
    setOpenedMinutes(minutesSince(existing.created_at));
    setConfirmOpen(true);
  };

  const closeOldSession = async () => {
    setBusy(true);
    setError('');
    try {
      // เช็คซ้ำว่ายัง open อยู่ กันกดซ้ำ/พนักงานอีกคนปิดไปแล้ว
      const { error: updErr } = await supabase
        .from('sessions')
        .update({ status: 'closed' })
        .eq('id', existing.id)
        .eq('status', 'open')
        .select('id');
      if (updErr) throw updErr;

      setConfirmOpen(false);
      setExisting(null);
    } catch (err) {
      setConfirmOpen(false);
      setError(`ปิดโต๊ะเดิมไม่สำเร็จ: ${err.message || 'ลองอีกครั้ง'}`);
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('คัดลอกไม่ได้ กดค้างที่ลิงก์เพื่อคัดลอกเอง');
    }
  };

  const resetAll = () => {
    setTable('');
    setAdults('');
    setChildren('');
    setResult(null);
    setExisting(null);
    setError('');
    setCopied(false);
  };

  const qrSrc = result
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(result.url)}`
    : '';

  return (
    <main className="page">
      <style>{css}</style>

      <header className="band">
        <p className="brand">มาม่าซัง</p>
        <h1>เปิดโต๊ะ</h1>
      </header>

      <section className="card">
        {result ? (
          <div className="result">
            <img className="qr" src={qrSrc} width={300} height={300} alt={`QR โต๊ะ ${result.table}`} />
            <p className="summary">
              โต๊ะ {result.table} · ผู้ใหญ่ {result.adults} · เด็ก {result.children}
            </p>
            <div className="linkrow">
              <span className="link">{result.url}</span>
              <button type="button" className="btn small" onClick={copyLink}>
                {copied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}
              </button>
            </div>
            {error && <p className="error">{error}</p>}
            <button type="button" className="btn primary" onClick={resetAll}>
              เปิดโต๊ะใหม่
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <label className="field big">
              <span>เลขโต๊ะ</span>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                value={table}
                onChange={(e) => {
                  setTable(e.target.value);
                  setExisting(null);
                }}
                placeholder="7"
                autoFocus
              />
            </label>

            <div className="pair">
              <label className="field">
                <span>ผู้ใหญ่</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={adults}
                  onChange={(e) => setAdults(e.target.value)}
                  placeholder="0"
                />
              </label>
              <label className="field">
                <span>เด็ก</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={children}
                  onChange={(e) => setChildren(e.target.value)}
                  placeholder="0"
                />
              </label>
            </div>

            {existing && (
              <div className="warn" role="alert">
                <p>โต๊ะนี้มีลูกค้าอยู่ระหว่างทานอาหาร กรุณาปิดออเดอร์เดิมก่อน</p>
                <button type="button" className="btn danger" onClick={openConfirm} disabled={busy}>
                  ปิดออเดอร์เดิม
                </button>
              </div>
            )}

            {error && <p className="error">{error}</p>}

            <button type="submit" className="btn primary" disabled={busy}>
              {busy ? 'กำลังดำเนินการ…' : 'เปิดโต๊ะ'}
            </button>
          </form>
        )}
      </section>

      {confirmOpen && existing && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <div className="dialog">
            <h2 id="confirm-title">ปิดโต๊ะเดิม?</h2>
            <dl>
              <div>
                <dt>โต๊ะ</dt>
                <dd>{existing.table_number}</dd>
              </div>
              <div>
                <dt>ผู้ใหญ่</dt>
                <dd>{existing.adult_count}</dd>
              </div>
              <div>
                <dt>เด็ก</dt>
                <dd>{existing.child_count}</dd>
              </div>
            </dl>
            <p className="elapsed">เปิดมาแล้ว {openedMinutes} นาที</p>
            <div className="actions">
              <button type="button" className="btn" onClick={() => setConfirmOpen(false)} disabled={busy}>
                ยกเลิก
              </button>
              <button type="button" className="btn danger" onClick={closeOldSession} disabled={busy}>
                {busy ? 'กำลังปิด…' : 'ยืนยันปิดโต๊ะเดิม'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Kanit:wght@400;600;800&display=swap');

.page {
  --red: #c8102e;
  --red-dark: #8f0b21;
  --yellow: #ffd21f;
  --ink: #2a1208;
  --paper: #fffdf5;
  --alert: #e8590c;
  min-height: 100vh;
  background: var(--yellow);
  color: var(--ink);
  font-family: 'Kanit', system-ui, sans-serif;
  padding-bottom: 3rem;
}
.band {
  background: var(--red);
  color: #fff;
  padding: 1.5rem 1.25rem 3.5rem;
  text-align: center;
  border-bottom: 6px solid var(--ink);
}
.brand { margin: 0; font-size: 1.25rem; font-weight: 600; color: var(--yellow); }
.band h1 { margin: 0; font-size: clamp(3rem, 9vw, 4.5rem); font-weight: 800; line-height: 1.1; }

.card {
  max-width: 34rem;
  margin: -2rem auto 0;
  padding: 1.5rem;
  background: var(--paper);
  border: 4px solid var(--ink);
  border-radius: 1.25rem;
  box-shadow: 8px 8px 0 var(--ink);
}
.field { display: block; margin-bottom: 1.25rem; }
.field span { display: block; font-size: 1.5rem; font-weight: 600; margin-bottom: 0.4rem; }
.field input {
  width: 100%;
  box-sizing: border-box;
  font: inherit;
  font-size: 2.25rem;
  font-weight: 800;
  text-align: center;
  padding: 0.6rem;
  border: 3px solid var(--ink);
  border-radius: 0.75rem;
  background: #fff;
  color: var(--ink);
}
.field.big input { font-size: 3.5rem; }
.field input:focus-visible, .btn:focus-visible {
  outline: 4px solid var(--red);
  outline-offset: 2px;
}
.pair { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }

.btn {
  font: inherit;
  font-size: 1.5rem;
  font-weight: 600;
  padding: 0.9rem 1.25rem;
  border: 3px solid var(--ink);
  border-radius: 0.75rem;
  background: #fff;
  color: var(--ink);
  cursor: pointer;
}
.btn:disabled { opacity: 0.55; cursor: not-allowed; }
.btn.primary {
  width: 100%;
  background: var(--red);
  color: #fff;
  font-size: 2rem;
  font-weight: 800;
  padding: 1.1rem;
  box-shadow: 0 5px 0 var(--red-dark);
}
.btn.primary:active:not(:disabled) { transform: translateY(3px); box-shadow: 0 2px 0 var(--red-dark); }
.btn.danger { background: var(--alert); color: #fff; }
.btn.small { font-size: 1.1rem; padding: 0.5rem 0.9rem; white-space: nowrap; }

.warn {
  margin-bottom: 1.25rem;
  padding: 1rem 1.1rem;
  background: #fff1e0;
  border: 4px solid var(--alert);
  border-radius: 0.9rem;
}
.warn p { margin: 0 0 0.9rem; font-size: 1.4rem; font-weight: 600; line-height: 1.35; }
.warn .btn { width: 100%; }
.error { margin: 0 0 1rem; color: var(--red-dark); font-size: 1.2rem; font-weight: 600; }

.result { display: flex; flex-direction: column; align-items: center; gap: 1rem; text-align: center; }
.qr { max-width: 100%; height: auto; border: 3px solid var(--ink); border-radius: 0.75rem; background: #fff; }
.summary { margin: 0; font-size: 2rem; font-weight: 800; }
.linkrow { display: flex; align-items: center; gap: 0.75rem; width: 100%; }
.link { flex: 1; min-width: 0; overflow-wrap: anywhere; text-align: left; font-size: 1.1rem; }

.overlay {
  position: fixed; inset: 0; z-index: 10;
  display: flex; align-items: center; justify-content: center;
  padding: 1rem;
  background: rgba(42, 18, 8, 0.75);
}
.dialog {
  width: 100%; max-width: 30rem;
  padding: 1.5rem;
  background: #fff;
  border: 5px solid var(--alert);
  border-radius: 1.25rem;
}
.dialog h2 { margin: 0 0 1rem; font-size: 2rem; font-weight: 800; color: var(--alert); }
.dialog dl { margin: 0 0 0.75rem; }
.dialog dl div { display: flex; justify-content: space-between; padding: 0.35rem 0; border-bottom: 2px dashed #ddd; font-size: 1.5rem; }
.dialog dt { font-weight: 400; }
.dialog dd { margin: 0; font-weight: 800; }
.elapsed { margin: 0 0 1.25rem; font-size: 1.5rem; font-weight: 600; }
.actions { display: grid; grid-template-columns: 1fr 1.4fr; gap: 0.75rem; }

@media (prefers-reduced-motion: reduce) { .btn { transition: none; } }
`;
