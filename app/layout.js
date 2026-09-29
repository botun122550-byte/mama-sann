export const metadata = {
  title: 'มาม่าซัง',
  description: 'ระบบสั่งอาหารร้านบุฟเฟต์มาม่าซัง',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
