# Design: ระบบติดตามงานทีม

เอกสารออกแบบด้วย `$sdlc-spec` อ้างอิง `plan.md` และ `requirements.md` โดยไม่แก้ข้อกำหนดเดิม ปัจจุบันทำ US-1 ถึง US-4; US-5 และ US-6 เป็นงานลำดับถัดไป

## โครงสร้างและหน้าจอ

Next.js 16 App Router + TypeScript + Tailwind + Supabase Auth/Postgres/RLS ใช้ publishable key กับ session ของผู้ใช้เท่านั้น ปิด Cache Components ตามกติกาเดิม

| เส้นทาง | หน้าที่ | เกณฑ์ |
|---|---|---|
| `/` | ตรวจการเชื่อมต่อและลิงก์เริ่มใช้งาน | งานตั้งต้น |
| `/login` | สมัครด้วยชื่อ อีเมล รหัสผ่าน หรือล็อกอิน | AC-1.1–AC-1.2 |
| `/team` | สร้าง/เข้าร่วมทีม หรือแสดงชื่อทีม รหัสเชิญ รายชื่อและบทบาท | AC-2.1–AC-2.6 |
| `/tasks` | ฟอร์มสร้างงานสำหรับหัวหน้า กระดานสามสถานะ ปรับสถานะตามสิทธิ์ และป้ายเลยกำหนด | AC-3.1–AC-3.7, AC-4.1–AC-4.5 |
| `/my` | ตรวจล็อกอินและพาไปกระดานงานระหว่างรอ US-5 | AC-1.5; ยังไม่ใช่ US-5 |

ทุกหน้าที่ป้องกันข้อมูลและทุกคำสั่งบันทึกตรวจผู้ใช้ด้วย `auth.getUser()` ฝั่ง server ไม่เชื่อ user_id, created_by, team_id หรือบทบาทจากฟอร์ม แถบบนแสดงชื่อที่แสดงและออกจากระบบได้ (AC-1.3) ใช้ cookies ของ Supabase SSR กับ proxy รีเฟรช session (AC-1.4)

## Data model (โครงสร้างข้อมูล)

ใช้ UUID เป็นรหัส และ timestamptz เป็นเวลาบันทึก

| ตาราง | คอลัมน์ | ชนิดและข้อจำกัด |
|---|---|---|
| profiles | id | uuid PK → auth.users.id, ลบบัญชีแล้วลบตาม |
| | display_name | text, ต้องมีชื่อ 1–100 ตัวอักษรหลังตัดช่องว่าง |
| | email | text not null, มาจาก Auth ไม่รับจาก metadata |
| | created_at | timestamptz default now() |
| teams | id | uuid PK default gen_random_uuid() |
| | name | text, ชื่อ 1–100 ตัวอักษร |
| | join_code | text unique, ตัวอักษร/ตัวเลข 6 ตัว สร้างจากฐานข้อมูล |
| | created_by | uuid unique → profiles.id |
| | created_at | timestamptz default now() |
| team_members | team_id | uuid → teams.id, ลบทีมแล้วลบตาม |
| | user_id | uuid unique → profiles.id, ลบบัญชีแล้วลบตาม |
| | role | text: lead / member |
| | joined_at | timestamptz default now() |
| | (team_id, user_id) | PK; user_id unique บังคับหนึ่งคนหนึ่งทีม; unique index ของหัวหน้าต่อทีม |
| tasks | id | uuid PK default gen_random_uuid() |
| | team_id | uuid → teams.id, ลบทีมแล้วลบตาม |
| | title | text, ต้องมีชื่อ 1–200 ตัวอักษร |
| | detail | text nullable, ไม่เกิน 5,000 ตัวอักษร |
| | due_date | date nullable; วันที่ตามปฏิทิน ไม่แปลงตามเวลาของเบราว์เซอร์ |
| | status | text default todo, รับ todo / doing / done เท่านั้น |
| | assignee_id | uuid → profiles.id |
| | (team_id, assignee_id) | FK → team_members(team_id, user_id) บังคับผู้รับงานอยู่ในทีม |
| | created_by | uuid → profiles.id; RLS บังคับเท่ากับผู้ที่ล็อกอิน |
| | created_at, updated_at | timestamptz default now() |

ข้อจำกัดความยาวเป็นสมมติฐานเพื่อให้ฟอร์มและฐานข้อมูลตรงกัน แสดงกำกับบนฟอร์ม วันที่แสดงด้วย `Intl.DateTimeFormat('th-TH')` และ `timeZone: 'Asia/Bangkok'` จากวันที่เวลาเที่ยงคืนไทย

## ตารางสิทธิ์ปัจจุบัน (แบบของ RLS)

ทุกตารางเปิด RLS และถอนสิทธิ์เริ่มต้นก่อน GRANT เท่าที่จำเป็น เพื่อรองรับการปิด Automatically expose new tables

| ตาราง | บทบาท | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|---|
| profiles | เจ้าของ | ของตัวเอง | ผ่าน trigger ตอนสมัคร | ไม่อนุญาต | ไม่อนุญาต |
| profiles | เพื่อนร่วมทีม รวมหัวหน้า | เฉพาะทีมเดียวกัน | ไม่อนุญาต | ไม่อนุญาต | ไม่อนุญาต |
| teams | หัวหน้า/สมาชิก | ทีมตัวเอง | ผ่าน create_team เท่านั้น | ไม่อนุญาต | ไม่อนุญาต |
| team_members | หัวหน้า/สมาชิก | สมาชิกทีมตัวเอง | ผ่าน create_team / join_team เท่านั้น | ไม่อนุญาต | ไม่อนุญาต |
| tasks | หัวหน้า | งานของทีม | ทีมตัวเอง ผู้รับอยู่ทีม และเริ่ม todo เท่านั้น | สถานะทุกงานของทีม; ข้อมูลเนื้อหาได้ตาม plan แต่ไม่มีฟอร์มแก้รายละเอียดในรอบนี้ | ไม่อนุญาต |
| tasks | สมาชิก | งานของทีม | ไม่อนุญาต | เฉพาะ status ของงานที่ตัวเองเป็นผู้รับงาน | ไม่อนุญาต |
| ทุกตาราง | anon / คนนอกทีม | ไม่อนุญาต (ผู้ล็อกอินยังอ่าน profiles ตัวเองได้) | ไม่อนุญาต | ไม่อนุญาต | ไม่อนุญาต |

ไม่มี policy สำหรับสิ่งที่ไม่อนุญาต ใช้ `to authenticated` และ `(select auth.uid())` พร้อมดัชนีตามคอลัมน์ที่กรอง ไม่เปิด SELECT ให้ทุกคน

## Functions และกฎฐานข้อมูล

- `private.handle_new_user()`: trigger หลังสมัครสร้างโปรไฟล์ ใช้อีเมลจาก auth.users และชื่อจาก metadata; ไม่ใช้ metadata เป็นสิทธิ์
- `private.current_team_id()` / `private.is_team_lead(uuid)`: security definer (อ่านข้อมูลด้วยสิทธิ์เจ้าของ function) คืนเฉพาะทีมของตัวเอง/ผลจริงเท็จ ใช้ใน policy เพื่อไม่ให้การอ่าน team_members วนซ้ำ
- functions ใน private ไม่เป็น API และกำหนด `search_path = ''` พร้อมระบุ schema ทุกตาราง จำกัด EXECUTE เฉพาะที่ต้องใช้ใน policy
- `public.create_team(p_name)` / `public.join_team(p_code)`: ตรวจ auth.uid() ล็อกแถวโปรไฟล์ระหว่างเปลี่ยนสมาชิก ตรวจหนึ่งคนหนึ่งทีม แล้วทำรายการทั้งหมดใน transaction เดียว ไม่เปิดตารางให้คนที่ค้นรหัสเชิญอ่านได้
- ให้ EXECUTE RPC เฉพาะ authenticated; RPC คืนเฉพาะ team id ไม่คืนข้อมูลคนนอกทีม
- แถวสมาชิก UNIQUE(user_id) ป้องกันสร้าง/เข้าร่วมทีมพร้อมกัน; partial unique index ป้องกันหัวหน้าหลายคนในทีม
- tasks INSERT ตรวจหัวหน้า, created_by, status todo และสมาชิกผู้รับ; FK คู่ทีม/ผู้รับบังคับ AC-3.4 อีกชั้นแม้ข้ามหน้าจอ
- US-4 เพิ่ม UPDATE policy ที่ตรวจทีมและบทบาท/ผู้รับงานทั้ง USING และ WITH CHECK โดยคง FK ผู้รับงานในทีมเดิม
- `private.tasks_guard_update()` เป็น trigger แบบ security invoker (ใช้สิทธิ์ของผู้เรียก ไม่ยกระดับสิทธิ์): ห้ามเปลี่ยน id, team_id, created_by และ created_at สำหรับทุกบทบาท; ถ้าไม่ใช่หัวหน้า เทียบทุกคอลัมน์ผ่าน `to_jsonb` โดยยกเว้น status เพียงคอลัมน์เดียว จึงป้องกันการแก้คอลัมน์อื่นและคอลัมน์ที่จะเพิ่มภายหลัง
- ตรวจคอลัมน์ก่อนตั้ง updated_at เพื่อไม่ให้ผู้รับงานปลอมเวลาแก้ไข จากนั้นฐานข้อมูลตั้ง updated_at = now() เองทุกครั้งที่ UPDATE สำเร็จ

## การอ่านและบันทึกจากแอป

`lib/auth.ts` ใช้ React.cache เฉพาะในคำขอเดียวเพื่อตรวจผู้ใช้และโปรไฟล์ คำสั่งบันทึกเรียกตรวจใหม่ในคำขอนั้นเอง `lib/team.ts` อ่านสมาชิกของผู้ใช้และทีมผ่าน session เดิม

US-3 โหลดรายชื่อจาก team_members กรอง team_id ของผู้ใช้และ join profiles; ฟอร์มส่งเฉพาะ assignee_id ไม่รับทีมจากผู้ใช้ คำสั่งสร้างงานตรวจว่าผู้ส่งเป็นหัวหน้าและตรวจผู้รับอีกครั้งก่อน INSERT โดยฐานข้อมูลเป็นผู้ตัดสินสุดท้าย

US-4 แสดงช่องเลือก todo/doing/done พร้อมปุ่มบันทึกเฉพาะหัวหน้าหรือผู้รับงาน คำสั่ง `updateTaskStatus` ตรวจ auth.getUser(), สมาชิกทีม และผู้รับงานจากแถวงานจริง ก่อนส่ง UPDATE เฉพาะ `{ status }` โดยไม่รับคอลัมน์อื่นจากฟอร์ม เงื่อนไข UPDATE ตรวจสถานะที่ผู้ใช้เห็นเดิมด้วย หากมีคนแก้ก่อนแล้ว ให้ผู้ใช้ตรวจสถานะล่าสุดก่อนบันทึก ไม่แสดงว่าสำเร็จหากไม่มีแถวถูกแก้

หลังแก้สำเร็จ revalidatePath('/tasks') ส่งข้อมูลใหม่ให้กระดาน ย้ายการ์ดไปคอลัมน์ใหม่และแสดงข้อความสำเร็จบนกระดานโดยไม่ต้องโหลดหน้าเอง ปุ่มปิดระหว่างรอบันทึก และเมื่อผิดพลาดยังแสดงสถานะเดิม

หลังบันทึกใช้ revalidatePath และ redirect หรือส่งข้อความสำเร็จผ่าน useActionState ฟอร์มปิดปุ่มขณะบันทึก มี label ชัดเจนและข้อความผิดพลาดใต้ช่อง ไม่แสดงข้อความฐานข้อมูลดิบให้ผู้ใช้

## หน้าจอและสถานะ

สืบต่อสีกรมท่า พื้นหลังเทาอ่อน ฟอนต์ Noto Sans Thai จากเว็บตั้งต้น ใช้แนว Flat Design ที่เหมาะกับ dashboard ตาม skill ui-ux-pro-max; ไม่ใช้รูปแบบหน้าโฆษณาหรือฟอนต์ละตินที่ผลค้นหาแนะนำ เพราะไม่เหมาะกับแอปภาษาไทย

- ทุกหน้ามี loading และหน้า error ภาษาไทยที่ลองใหม่ได้
- `/team`: ไม่มีทีมแสดงสองฟอร์ม; มีทีมแสดงชื่อ รหัสเชิญ และสมาชิก
- `/tasks`: ไม่มีทีมพาไป `/team`; ไม่มีงานแสดง “ยังไม่มีงานในทีม”; มีงานแสดงสามคอลัมน์ todo/doing/done พร้อมฟอร์มปรับสถานะตามสิทธิ์ (AC-4.1–AC-4.4)
- AC-4.5: คำนวณวันนี้ด้วย Intl.DateTimeFormat และ timeZone='Asia/Bangkok' ฝั่ง server เมื่อโหลด/บันทึกหน้า เปรียบเทียบ due_date แบบ YYYY-MM-DD เฉพาะวันที่น้อยกว่าวันนี้และ status ไม่ใช่ done แสดงป้ายข้อความสีแดง “เลยกำหนด” ไม่มีวันส่ง/ครบกำหนดวันนี้/วันในอนาคต/เสร็จแล้วไม่แสดงป้าย เมื่อเปลี่ยนวันให้โหลดหน้าใหม่เพื่อคำนวณวันปัจจุบัน
- ที่ 375px เรียงสามคอลัมน์ลงมา ที่จอกว้างแสดงข้างกัน ข้อความยาวตัดบรรทัด ปุ่ม/ช่องสูงอย่างน้อย 44px ใช้ keyboard focus ที่เห็นชัด

## ลำดับนำไปใช้และตรวจรับ

1. ผู้ใช้รัน migration US-1 → US-2 → US-3 → US-4 ใน SQL Editor เองทีละไฟล์ เฉพาะไฟล์ที่ยังไม่ได้รัน (Codex ไม่รันฐานข้อมูล)
2. สำหรับ workshop ปิด Confirm email ก่อนสมัคร ตามเอกสาร plan; ระบบแสดงคำแนะนำหากยังต้องยืนยันอีเมล
3. ทดสอบหน้าจอด้วยบัญชี A หัวหน้าทีม 1, B สมาชิกทีม 1 และ C หัวหน้าทีม 2 ตาม `docs/testing-us-1-3.md` และ `docs/testing-us-4.md`
4. ทดสอบการข้ามหน้าจอด้วยคำขอ Data API ที่ใช้ publishable key และ token ของบัญชีแต่ละคน ไม่ใช้ SQL Editor เป็นหลักฐานของ RLS เพราะเจ้าของฐานข้อมูลข้าม RLS ได้
5. ผล lint/build/unit tests เป็นหลักฐานโค้ดเท่านั้น ผลฐานข้อมูลจริงและการใช้งานหลายบัญชีรอหลังผู้ใช้รัน migration

## เอกสารทางการที่ใช้อ้างอิง

- [Supabase: สร้าง client ฝั่ง server และรีเฟรช session](https://supabase.com/docs/guides/auth/server-side/creating-a-client) — ตรวจตัวตนด้วย getUser/getClaims และจัดการ cookies
- [Supabase: การกำหนดสิทธิ์ Data API](https://supabase.com/docs/guides/api/securing-your-api) — กำหนด GRANT และ RLS ควบคู่กัน
- [PostgreSQL: Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) — policy ควบคุมแถว และ foreign key บังคับความสัมพันธ์ข้อมูล
