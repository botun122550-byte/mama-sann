import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>มาม่าซัง</h1>
      <p>ระบบสั่งอาหารร้านบุฟเฟต์</p>
      <nav style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <Link href="/generate-qr">สร้าง QR Code</Link>
        <Link href="/kitchen">หน้าครัว</Link>
      </nav>
    </main>
  );
}
