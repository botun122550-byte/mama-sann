import Link from "next/link";
import { Mitr, Noto_Sans_Thai } from "next/font/google";

const display = Mitr({
  subsets: ["thai", "latin"],
  weight: ["500"],
  variable: "--font-display",
  display: "swap",
});

const body = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "600"],
  variable: "--font-body",
  display: "swap",
});

const links = [
  {
    href: "/generate-qr",
    icon: "📱",
    title: "สร้าง QR Code",
    desc: "พิมพ์ QR ให้ลูกค้าสแกนสั่งอาหารที่โต๊ะ",
  },
  {
    href: "/kitchen",
    icon: "🍳",
    title: "หน้าครัว",
    desc: "ดูออเดอร์ที่เข้ามาและกดเริ่มทำ",
  },
  {
    href: "/bill",
    icon: "🧾",
    title: "สรุปบิล",
    desc: "คิดเงินและปิดโต๊ะ",
  },
];

const css = `
.home {
  min-height: 100vh;
  background: #e6e9ee;
  color: #1e2b4d;
  font-family: var(--font-body), sans-serif;
  padding-bottom: 3rem;
}
.home-sign {
  text-align: center;
  padding: 3rem 1rem 2rem;
}
.home-name {
  font-family: var(--font-display), sans-serif;
  font-weight: 500;
  font-size: clamp(3.2rem, 10vw, 6.5rem);
  line-height: 1.15;
  margin: 0;
}
.home-tag {
  margin: 0.5rem 0 0;
  font-size: 1.15rem;
  color: #4a5674;
}
.home-rod {
  width: min(1100px, 92%);
  height: 14px;
  margin: 0 auto;
  background: #4a3426;
  border-radius: 7px;
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.18);
}
.home-noren {
  width: min(1100px, 92%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.home-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: clamp(280px, 46vh, 440px);
  padding: 2rem 1.5rem 2.5rem;
  background: #1e2b4d;
  color: #ffffff;
  text-decoration: none;
  border-bottom: 10px solid #c8102e;
  border-radius: 0 0 6px 6px;
  transform-origin: top center;
  animation: home-sway 1.6s ease-out both;
}
.home-panel:nth-child(2) { animation-delay: 0.15s; }
.home-panel:nth-child(3) { animation-delay: 0.3s; }
.home-panel:hover { background: #28396a; }
.home-panel:focus-visible { outline: 4px solid #f2b632; outline-offset: 4px; }
.home-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #c8102e;
  display: grid;
  place-items: center;
  font-size: 1.9rem;
}
.home-title {
  font-family: var(--font-display), sans-serif;
  font-weight: 500;
  font-size: clamp(1.8rem, 3vw, 2.4rem);
  margin: 0.5rem 0 0;
}
.home-desc {
  margin: 0;
  color: #c9d1e6;
  font-size: 1.05rem;
  line-height: 1.6;
}
@keyframes home-sway {
  0% { transform: rotate(-2.2deg); }
  35% { transform: rotate(1.4deg); }
  65% { transform: rotate(-0.6deg); }
  100% { transform: rotate(0); }
}
@media (max-width: 760px) {
  .home-noren { grid-template-columns: 1fr; }
  .home-panel { min-height: auto; }
}
@media (prefers-reduced-motion: reduce) {
  .home-panel { animation: none; }
}
`;

export default function HomePage() {
  return (
    <main className={`home ${display.variable} ${body.variable}`}>
      <style>{css}</style>

      <header className="home-sign">
        <h1 className="home-name">มาม่าซัง</h1>
        <p className="home-tag">ระบบหลังร้านบุฟเฟต์</p>
      </header>

      <div className="home-rod" />
      <nav className="home-noren">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="home-panel">
            <span className="home-icon">{l.icon}</span>
            <h2 className="home-title">{l.title}</h2>
            <p className="home-desc">{l.desc}</p>
          </Link>
        ))}
      </nav>
    </main>
  );
}
