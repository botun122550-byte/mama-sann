import Link from "next/link";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.5rem",
        padding: "1rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "2.5rem", margin: 0 }}>มาม่าซัง</h1>
      <p style={{ margin: 0, color: "#555" }}>ระบบสั่งอาหารร้านบุฟเฟต์</p>
      <nav style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
        <Link href="/generate-qr">สร้าง QR Code</Link>
        <Link href="/kitchen">หน้าครัว</Link>
        <Link href="/bill">สรุปบิล</Link>
      </nav>
    </main>
  );
}
