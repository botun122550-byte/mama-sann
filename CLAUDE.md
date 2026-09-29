# มาม่าซัง — ระบบสั่งอาหารร้านบุฟเฟต์

Stack: Next.js (App Router, **JavaScript ไม่ใช่ TypeScript**) + Supabase, deploy บน Vercel

## Environment variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

ใช้ client จาก `lib/supabaseClient.js` (`import { supabase } from '@/lib/supabaseClient'` หรือ path สัมพัทธ์)

## กฎสำคัญ: Dynamic Route params เป็น Promise
โปรเจกต์นี้ใช้ Next.js เวอร์ชันล่าสุด `params` ของ Dynamic Route (เช่น `app/order/[sessionId]/page.js`) เป็น **Promise** ต้อง unwrap เสมอ:

```js
'use client';
import { use } from 'react';

export default function OrderPage({ params }) {
  const { sessionId } = use(params); // unwrap ด้วย use() จาก React
  // ...
}
```

หมายเหตุ: `use()` ใช้ใน Client Component (`'use client'`) ส่วน Server Component ให้ใช้ `const { sessionId } = await params;` ใน async function แทน (`use()` ก็ใช้ได้เช่นกัน แต่ `await` เป็นแบบมาตรฐานฝั่ง server)

## โครงสร้างตารางฐานข้อมูล (มีอยู่แล้วใน Supabase — ไม่ต้องสร้างใหม่)

**sessions**
| column | หมายเหตุ |
|---|---|
| id | |
| table_number | |
| adult_count | จำนวนผู้ใหญ่ |
| child_count | จำนวนเด็ก |
| status | |
| created_at | |

**menu_categories**
| column | หมายเหตุ |
|---|---|
| id | |
| name | |
| sort_order | ลำดับการแสดงผล |

**menu_items**
| column | หมายเหตุ |
|---|---|
| id | |
| category_id | อ้างอิง menu_categories.id |
| name | |

**orders**
| column | หมายเหตุ |
|---|---|
| id | |
| session_id | อ้างอิง sessions.id |
| table_number | |
| items | jsonb |
| status | |
| created_at | |

## หน้าที่มี / วางแผนไว้
- `/` หน้าแรก (ใช้ทดสอบ deploy)
- `/generate-qr` สร้าง QR ให้แต่ละโต๊ะ (ยังไม่ทำ)
- `/kitchen` หน้าครัว (ยังไม่ทำ)
- หน้าสั่งอาหารแบบ Dynamic Route (ขั้นตอนถัดไป)

## คำสั่ง
```bash
npm install
cp .env.example .env.local   # แล้วใส่ค่าจริง
npm run dev
```
