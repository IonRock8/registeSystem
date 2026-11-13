# นำระบบติดตามงานทีมขึ้น Vercel

เตรียมวันที่ 14 พฤศจิกายน 2569 (Asia/Bangkok) โดยใช้ `$vercel-deploy`

## สถานะที่ตรวจแล้ว

| รายการ | ผล |
|---|---|
| โค้ดที่เตรียมนำขึ้น | US-1 ถึง US-4; US-5 และ US-6 ยังไม่ได้พัฒนา |
| `npm.cmd run build` | ผ่านบนเครื่องในรอบเตรียม deploy นี้ |
| GitHub remote | `IonRock8/registeSystem`, branch `main` |
| ไฟล์ที่ยังไม่ได้ commit | โค้ด/ไฟล์ใหม่ของ US-4 และรายงานความปลอดภัย ต้องบันทึกและส่งขึ้น GitHub ก่อน |
| ไฟล์ env ที่ถูก track | มีเฉพาะ `.env.example` |
| `.env.local`, `node_modules`, `.next` | ถูกกันด้วย `.gitignore` |
| ตรวจค่าลับ | ใช้ผลสแกนล่าสุดใน `security-review.md`; ไม่พบค่าลับจริงในขอบเขตที่ตรวจ ไม่มีการอ่าน `.env.local` |
| RLS | ไฟล์ migration เปิดครบ 4 ตาราง; สถานะบน Supabase จริงยังต้องยืนยันตามรายงานความปลอดภัย |
| Vercel project / URL | ยังไม่ได้ Import หรือ Deploy จึงยังไม่มี URL ที่ยืนยันแล้ว |
| Environment Variables บน Vercel | ยังไม่ได้ตั้งหรือยืนยัน ต้องให้เจ้าของบัญชีใส่เอง |

skill `vercel-deploy` กำหนดว่า “ขั้นที่ต้องใช้บัญชีของผู้ใช้ เช่น กด Import, ใส่ค่า secret หรือกด Deploy ให้ผู้ใช้เป็นคนทำ” Codex จึงตรวจและเตรียมโค้ด ส่วนขั้นตอน Dashboard ด้านล่างให้ผู้ใช้ทำเอง

## 1. ส่งไฟล์ล่าสุดขึ้น GitHub

1. VS Code → **Source Control**
2. ตรวจไฟล์ที่เปลี่ยน โดยเฉพาะ `app/(workspace)/tasks/task-board.tsx`, actions, `lib/task-status*.ts` และ migration US-4 ให้มีครบ
3. กด **Stage All Changes** (ปุ่ม + ด้านข้าง Changes)
4. พิมพ์ข้อความ `เพิ่ม US-4 และเตรียม deploy`
5. กด **Commit** แล้ว **Sync Changes** หากถามยืนยันการส่ง ให้ตรวจปลายทางว่าเป็น repository ที่คุณใช้
6. เปิด <https://github.com/IonRock8/registeSystem> ตรวจว่าเห็นไฟล์ US-4 ล่าสุดก่อน Import เข้า Vercel

## 2. สร้างโปรเจกต์ Vercel จาก repository

1. เปิด <https://vercel.com/new> แล้วล็อกอินด้วยบัญชีของคุณ
2. ถ้าระบบขอเชื่อม GitHub ให้เลือกบัญชีที่เข้าถึง `IonRock8/registeSystem` ได้
3. ใน **Import Git Repository** เลือก `registeSystem` → **Import**
4. ถ้าไม่เห็น repository กด **Adjust GitHub App Permissions** แล้วให้ Vercel เข้าถึง repository นี้
5. ตั้งค่า:

| ช่อง | ค่า |
|---|---|
| Project Name | `registe-system` หรือชื่อที่คุณต้องการและยังว่าง |
| Framework Preset | Next.js |
| Root Directory | `./` (โฟลเดอร์หลักที่มี package.json) |
| Production Branch | main หากมีให้ตรวจ; ตรวจได้ภายหลังใน Settings → Git |
| Build Command | ใช้ค่าเริ่มต้นของ Next.js (`npm run build`) |
| Install Command / Output Directory | ใช้ค่าที่ Vercel เลือกให้อัตโนมัติ |
| Node.js Version | ใช้รุ่น LTS ที่ Vercel รองรับตามค่าเริ่มต้น |

Next.js บน Vercel รองรับการตรวจ framework อัตโนมัติ ไม่จำเป็นต้องเพิ่ม vercel.json สำหรับโครงนี้ ตาม[เอกสาร Vercel](https://vercel.com/kb/guide/nextjs-on-vercel-vs-netlify)

## 3. ตั้งค่าการเชื่อมต่อก่อนกด Deploy

เปิดหัวข้อ **Environment Variables** ในหน้าตั้งค่าโปรเจกต์ เพิ่มเพียงสองรายการที่โค้ดเวอร์ชันนี้ใช้:

| Key | Value ที่ผู้ใช้คัดลอกเอง |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL | ค่า Project URL เดียวกับใน `.env.local` |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | ค่า Publishable key เดียวกับใน `.env.local` |

เลือก **Production** และ **Preview** ตาม environment ที่ต้องใช้ โค้ดรอบนี้ยังไม่ใช้ Gmail และโปรเจกต์นี้ไม่ใช้ Secret key อย่าส่งค่า key หรือรหัสผ่านในแชท

หาก Import เสร็จไปแล้ว ให้ตั้งที่ **Project → Settings → Environment Variables** แล้ว **Deployments → เมนูของ deployment → Redeploy** การเปลี่ยนค่ามีผลกับ deployment ใหม่ ตาม[เอกสาร Environment Variables](https://vercel.com/docs/environment-variables)

## 4. กด Deploy และจด URL

1. กด **Deploy**
2. รอจนสถานะ **Ready**
3. เปิด **Visit** หรือดู **Domains** แล้วคัดลอกโดเมนหลักที่ได้ เช่นรูปแบบ `https://ชื่อที่คุณตั้ง.vercel.app` (นี่เป็นเพียงรูปแบบตัวอย่าง ไม่ใช่ URL ที่สร้างแล้ว)
4. หากสถานะ Error เปิด **Build Logs** แล้วส่งข้อความ error ที่เกี่ยวข้อง โดยไม่ส่งค่า env/key/token

## 5. ตั้งค่า Supabase ให้ตรงกับ URL จริง

1. Supabase → **Authentication → URL Configuration**
2. **Site URL**: ใส่ URL หลักที่ได้จาก Vercel เช่น `https://โดเมนจริงของคุณ.vercel.app`
3. **Redirect URLs → Add URL**: เพิ่ม URL ของโดเมนจริงพร้อม `/**` และ `http://localhost:3000/**` สำหรับเวิร์กช็อปนี้
4. กด **Save**

เพิ่มเฉพาะโดเมนของโปรเจกต์ที่คุณควบคุม หากมี Preview URL ที่ต้องทดสอบ ให้เพิ่ม URL นั้นด้วย การใช้งานจริงควรกำหนดเส้นทาง redirect ให้เจาะจงตาม flow ที่ใช้งาน ตาม[เอกสาร Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)

ให้ยืนยันด้วยว่า migration US-1 → US-4 ถูกนำไปใช้ใน Supabase แล้ว การ Deploy เว็บไม่รัน SQL เหล่านี้ให้

## 6. ทดสอบหลัง Deploy

- เปิด `/login` บน URL จริง ใช้บัญชีทดสอบเดิมเข้าสู่ระบบได้ (AC-1.2–AC-1.3)
- เปิดหน้าต่างที่ยังไม่ล็อกอิน แล้วเข้า `/tasks` ต้องถูกพาไป `/login` (AC-1.5)
- เปิด `/team` ต้องเห็นทีมของบัญชีนั้น (AC-2.6)
- หัวหน้าสร้างงานให้สมาชิกในทีมได้ (AC-3.1) และมองไม่เห็นงานทีมอื่น (AC-3.7)
- สมาชิกเปลี่ยนสถานะงานตัวเองได้ งานย้ายคอลัมน์และป้ายเลยกำหนดเปลี่ยนถูกต้อง (AC-4.1, AC-4.5)
- สมาชิกไม่มีสิทธิ์แก้งานคนอื่นหรือเปลี่ยนรายละเอียดผ่านคำขอตรง (AC-4.3–AC-4.4)
- กดออกจากระบบ แล้วเข้าเส้นทางป้องกันข้อมูลไม่ได้จนกว่าจะล็อกอินใหม่ (AC-1.3, AC-1.5)

ใช้บัญชี A/B/C ตาม `testing-us-1-3.md` และ `testing-us-4.md` รายงาน `security-review.md` ยังมีข้อควรปรับระดับกลาง โดยเฉพาะการจำกัดการเดารหัสเชิญก่อนเปิดให้คนทั่วไปสมัคร

หน้าแรกยังคงการแสดงสถานะเวอร์ชันที่ผู้ใช้ขอให้เหมือนผู้เข้าอบรม กรณียังไม่ล็อกอินอาจเป็นกล่องเหลืองจากสิทธิ์อ่าน profiles ให้ทดสอบผ่าน `/login` และเส้นทางใช้งานจริงประกอบ

## ผลหลังนำขึ้นที่เจ้าของโปรเจกต์กรอก

| รายการ | สถานะ |
|---|---|
| Commit / Sync Changes | รอดำเนินการ |
| Import Vercel | รอดำเนินการ |
| ตั้ง env 2 รายการ | รอดำเนินการ |
| Deployment Ready และ URL | รอดำเนินการ |
| Supabase Site URL / Redirect URLs | รอดำเนินการ |
| ทดสอบเส้นทางหลักบน URL จริง | รอดำเนินการ |

## สิ่งที่คุณต้องทำเอง

1. Commit และ Sync Changes ไฟล์ล่าสุดขึ้น GitHub
2. Import `IonRock8/registeSystem` ใน Vercel และใส่ env 2 รายการ
3. กด Deploy รอสถานะ Ready แล้วคัดลอก URL
4. ตั้ง URL ใน Supabase และทดสอบตามข้อ 6
5. ส่ง URL ที่ได้กลับมาเพื่อให้ตรวจหน้าเว็บหลัง Deploy ต่อ
