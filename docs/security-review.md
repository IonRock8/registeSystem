# รายงานตรวจความปลอดภัย: US-1 ถึง US-4

วันที่ตรวจ: 14 พฤศจิกายน 2569 (Asia/Bangkok)

## ผลสรุปและขอบเขต

**ไม่พบช่องโหว่ระดับสูงจากไฟล์ที่ตรวจ** พบข้อควรแก้ระดับกลาง 2 ประเด็น และระดับต่ำ 1 ประเด็นตามตารางด้านล่าง ยังไม่ใช่ผลรับรองฐานข้อมูลจริงหรือเว็บที่ deploy แล้ว

ตรวจ working tree ปัจจุบัน รวมโค้ด US-4 ที่ยังไม่ได้ commit และประวัติ Git ทั้ง 2 commit ที่มีในเครื่อง (`c2ceb65`, `6859dac`) อ่านไฟล์ข้อความใน working tree 74 ไฟล์ และไฟล์ข้อความในประวัติรวม 93 ฉบับก่อนสร้างรายงานนี้ ไม่อ่าน `.env.local` หรือไฟล์สำเนา env ไม่รัน SQL และไม่ส่งคำขอแก้ข้อมูลใน Supabase

ใช้ skill `security-check` ในโหมดรายงาน สร้างเฉพาะรายงานนี้ ไม่แก้โค้ดแอป migration หรือแพ็กเกจ ไม่ได้ลงมือทำ US-5; `/my` ยังเป็นหน้าที่ตรวจล็อกอินแล้วพาไป `/tasks`

## ประเด็นที่พบ เรียงตามความเสี่ยง

| # | ระดับ | ประเด็น | ตำแหน่งหลักฐาน | ผลกระทบ | แนวทางแก้ที่แนะนำ |
|---|---|---|---|---|---|
| SEC-01 | กลาง | ลองรหัสเชิญซ้ำผ่านฐานข้อมูลได้ โดยไม่มีการนับความพยายามหรือพักการลองผิดใน function | `supabase/migrations/20261113000200_us2_teams.sql:78`, `:91`, `:104`, `:113` | ผู้สมัครที่ยังไม่มีทีมเรียก `join_team` ตรงผ่าน Data API ซ้ำได้ หากเดาถูกจะกลายเป็นสมาชิกและอ่านข้อมูลทีมตามสิทธิ์สมาชิก รหัสที่สร้างจริงใช้ 6 ตัวจาก 0–9/A–F หรือประมาณ 24 บิต แม้รูปแบบตารางรองรับ A–Z/0–9 | เพิ่มการจำกัดความถี่/พักการลองผิดในชั้นที่ครอบคลุม RPC โดยตรงด้วย ออกแบบให้การบันทึกความพยายามไม่ถูก rollback ไปพร้อม exception พิจารณารหัสสุ่มที่ใช้ชุดอักขระกว้างขึ้นโดยคงความยาว 6 ตัวตาม AC-2.2 |
| SEC-02 | กลาง (เครื่องมือพัฒนา) | `npm audit` แจ้งช่องโหว่ 7 รายการจากเส้นทาง dependency ของ minimatch | `package-lock.json:2031`; เส้นทาง `eslint-config-next → typescript-eslint → @typescript-eslint/typescript-estree → minimatch@10.2.6` | รูปแบบค้นหาไฟล์ที่ผู้โจมตีควบคุมอาจทำให้ใช้ CPU/หน่วยความจำมาก เงื่อนไขโจมตีบนเครื่องมือตรวจโค้ดยังไม่ได้พิสูจน์ และไม่พบว่าอินพุตจากฟอร์มแอปถูกส่งไปสร้าง glob pattern นี้ | อัปเดตชุดตรวจโค้ดและ dependency ที่เกี่ยวข้องเป็นรุ่นที่แก้ advisory แล้ว โดยตรวจความเข้ากันได้ จากนั้นรัน lint/test/build และ audit ซ้ำ ไม่ได้อัปเดตอัตโนมัติในรอบนี้ |
| SEC-03 | ต่ำ | ข้อความสมัครสมาชิกแยกกรณีอีเมลมีบัญชีแล้ว | `app/login/actions.ts:61` | เมื่อ Auth ส่ง `user_already_exists` กลับมา ผู้ทดลองสมัครอาจทราบว่าอีเมลใดมีบัญชี เป็นการเปิดเผยการมีอยู่ของบัญชี ไม่ใช่การอ่านงานข้ามทีม | ใช้ข้อความตอบรับที่ไม่ยืนยันการมีบัญชี และทบทวนร่วมกับการเปิดยืนยันอีเมลก่อนใช้งานจริง เพราะการเปลี่ยนข้อความในแอปอย่างเดียวไม่ป้องกันการเรียก Auth API ตรง |

SEC-01 เป็นข้อสรุปจากโค้ด ไม่ได้ทดลองเดารหัสกับโปรเจกต์จริง การปิดปุ่มระหว่างส่งฟอร์มช่วยการใช้งาน แต่ไม่จำกัดผู้ที่เรียก RPC โดยข้ามหน้าเว็บ ข้อจำกัดในเอกสาร [Supabase Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits) เป็นของ authentication endpoints จึงไม่ใช่หลักฐานว่า `join_team` ของแอปมีการจำกัดการลองผิดแล้ว

SEC-02 อ้างอิง [advisory ของผู้ดูแล minimatch](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249) ซึ่งระบุปัญหาการขยาย glob pattern และรุ่นแก้ 11.0.1 ผล `npm audit --json` รอบนี้เป็นกลาง 7 สูง 0 วิกฤต 0; `npm audit --omit=dev --json` ไม่พบรายการแจ้งเตือน รายการ 7 รายการรวมแพ็กเกจที่ได้รับผลกระทบต่อกัน ไม่ใช่ช่องโหว่ต่างชนิด 7 จุดในหน้าจอแอป

## สิ่งที่ตรวจแล้วไม่พบปัญหาในไฟล์

| รายการตรวจ | หลักฐานและผล |
|---|---|
| เปิด RLS ทุกตาราง | migration เปิด RLS ครบ `profiles`, `teams`, `team_members`, `tasks` (4 ตาราง) |
| Policy เปิดกว้าง | policy ทั้ง 7 รายการระบุ `to authenticated` ไม่พบ `using (true)` หรือ `with check (true)` บนข้อมูลทีม/บุคคล |
| อ่านข้ามทีม (AC-2.6, AC-3.7) | SELECT ผูกกับ auth.uid() หรือ helper คืนทีมปัจจุบัน โปรไฟล์อ่านได้เฉพาะตัวเองและเพื่อนร่วมทีม |
| สร้าง/มอบหมายงาน (AC-3.3, AC-3.4) | INSERT ตรวจหัวหน้าและ created_by ตรงผู้ล็อกอิน มีทั้งเงื่อนไขสมาชิกและ FK คู่ `(team_id, assignee_id)` |
| แก้สถานะ (AC-4.1–AC-4.4) | UPDATE มี USING และ WITH CHECK ตรวจทีม/หัวหน้า/ผู้รับงาน; trigger เทียบทุกคอลัมน์ยกเว้น status สำหรับผู้ไม่ใช่หัวหน้า และตั้ง updated_at เอง |
| หนึ่งคนหนึ่งทีม (AC-2.4) | UNIQUE(user_id), RPC ล็อกแถวโปรไฟล์ และสร้างทีมพร้อมสมาชิกใน transaction เดียว |
| Security definer | 5 functions กำหนด `search_path = ''` ระบุ schema ของตาราง และถอน EXECUTE จาก PUBLIC/anon; RPC ตรวจ auth.uid() คืนเฉพาะรหัสทีม helpers คืนทีมตัวเอง/boolean ส่วน trigger สมัครใช้ NEW.id จาก Auth ตามหน้าที่ |
| Trigger US-4 | ใช้ security invoker ไม่ยกระดับสิทธิ์ คงการบังคับ RLS ของผู้เรียก |
| ตรวจตัวตนฝั่ง server | `lib/auth.ts:11` ใช้ auth.getUser(); ทุกคำสั่งสร้างทีม เข้าร่วม สร้างงาน และแก้สถานะเรียกตรวจผู้ใช้ ไม่เชื่อบทบาทหรือ user_id จากฟอร์ม |
| ตัวแปรสาธารณะ | โค้ดแอปอ่านเฉพาะ NEXT_PUBLIC_SUPABASE_URL และ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ไม่พบการใช้ secret key/service-role credential ในโค้ดแอป |
| กัน env จาก Git | `.gitignore:12` กัน `.env*` และยกเว้นเฉพาะ `.env.example`; git check-ignore ยืนยันว่า `.env.local` และ `.env copy.example` ถูกกัน ไม่พบ env จริงถูก track ใน 2 commit ที่ตรวจ |
| สแกนค่าลับ | ไม่พบค่าลับจริงที่เข้ารูปแบบ Supabase secret, JWT credential, private-key block หรือ GitHub token ในขอบเขตสแกน รายการ assignment ที่สะดุดเป็นค่าตัวอย่างในเอกสาร/skill รวมข้อความภาษาไทยที่บอกให้ใส่ App Password ไม่ใช่รหัสจริง |
| ข้อความผิดพลาด | หน้าจอแสดงข้อความภาษาไทยที่กำหนดไว้ ไม่ส่ง error.message ดิบหรือ stack trace ให้ผู้ใช้ในเส้นทางที่ตรวจ |
| การแสดงข้อมูล | ใช้ข้อความที่ React escape ให้ ไม่พบ dangerouslySetInnerHTML หรือ eval ในโค้ดแอปที่ตรวจ |

แนวทางตรวจ security definer อ้างอิง [Supabase: Database functions](https://supabase.com/docs/guides/database/functions) โดยตรวจทั้ง search_path การจำกัด EXECUTE และการตรวจเจ้าของข้อมูลภายใน function ไม่พิจารณา search_path เพียงอย่างเดียว

## สิ่งที่ยังต้องยืนยันบน Supabase จริง

1. migration ทั้ง 4 ไฟล์ถูกนำไปใช้แล้ว โดยเฉพาะ UPDATE policy และ trigger ของ US-4
2. ไม่มีตาราง policy grants หรือ function ที่เพิ่มผ่าน Dashboard แล้วไม่อยู่ใน repository
3. `private` ไม่ถูกเปิดเป็น exposed schema ของ Data API; ตรวจที่ **Integrations → Data API** หรือหน้าตั้งค่า Data API ของโปรเจกต์
4. ก่อนเปิดรับผู้ใช้จริง ตรวจ **Authentication → Sign In / Providers → Email → Confirm email** ปัจจุบันเวิร์กช็อปแนะนำปิดเพื่อ AC-1.1 แต่ต้องทบทวนการยืนยันอีเมลและตั้งค่าการส่งอีเมลสำหรับการใช้จริง สถานะปัจจุบันใน Dashboard ยังไม่ได้ตรวจ
5. การตั้งค่า Auth rate limits/การป้องกันบอต โดเมนและ Redirect URLs ของเว็บจริง รวมถึง environment บน Vercel ยังไม่ได้ตรวจ

## SQL อ่านสถานะ สำหรับเจ้าของโปรเจกต์รันเอง

เปิด **Supabase → SQL Editor → New query** แล้วคัดลอกแต่ละชุดด้านล่างไปกด Run ทีละชุด เป็น SELECT อ่านการตั้งค่า ไม่มีคำสั่งแก้ข้อมูลหรือเปลี่ยนสิทธิ์ ไม่ต้องรัน migration เดิมซ้ำ

### ชุดที่ 1: ตารางที่ยังไม่เปิด RLS

```sql
select schemaname, tablename
from pg_tables
where schemaname = 'public' and rowsecurity = false
order by tablename;
```

ผลที่ต้องการ: ไม่มีแถว หากพบตารางให้ตรวจว่าคือข้อมูลใดและสิทธิ์ควรเป็นอย่างไร

### ชุดที่ 2: policy ที่ติดตั้งจริง

```sql
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

ตรวจเทียบกับไฟล์ SQL: ต้องพบ tasks_lead_or_assignee_update พร้อม USING/WITH CHECK และไม่มี policy ที่เปิดข้อมูลทีมให้ทุกคน

### ชุดที่ 3: สิทธิ์ตารางที่มีผลกับ anon/authenticated

```sql
select c.relname as table_name,
       has_table_privilege('anon', c.oid, 'SELECT') as anon_select,
       has_table_privilege('authenticated', c.oid, 'SELECT') as user_select,
       has_table_privilege('authenticated', c.oid, 'INSERT') as user_insert,
       has_table_privilege('authenticated', c.oid, 'UPDATE') as user_update,
       has_table_privilege('authenticated', c.oid, 'DELETE') as user_delete
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('profiles', 'teams', 'team_members', 'tasks')
  and c.relkind in ('r', 'p')
order by c.relname;
```

anon_select ควรเป็น false ทั้ง 4 ตาราง authenticated อ่านทั้ง 4 ตารางได้ในขอบเขต RLS; INSERT/UPDATE เฉพาะ tasks; DELETE เป็น false ทั้งหมด การสร้างโปรไฟล์/ทีม/สมาชิกทำผ่าน trigger/RPC ตามแบบ ไม่ใช่ INSERT ตรงจากผู้ใช้

### ชุดที่ 4: functions, search_path และ EXECUTE

```sql
select n.nspname as schema_name,
       p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer,
       p.proconfig as function_settings,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as user_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'private')
  and p.proname in ('handle_new_user', 'current_team_id', 'is_team_lead',
                   'create_team', 'join_team', 'tasks_guard_update')
order by n.nspname, p.proname;
```

anon_execute ควรเป็น false ทั้งหมด; user_execute เป็น true เฉพาะ current_team_id, is_team_lead, create_team, join_team; tasks_guard_update เป็น security invoker (false) และใช้ผ่าน trigger

### ชุดที่ 5: trigger ที่ติดตั้งจริง

```sql
select n.nspname as schema_name, c.relname as table_name,
       t.tgname as trigger_name, t.tgenabled,
       pg_get_triggerdef(t.oid) as definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where not t.tgisinternal
  and ((n.nspname = 'auth' and c.relname = 'users'
        and t.tgname = 'on_auth_user_created')
       or (n.nspname = 'public' and c.relname = 'tasks'
           and t.tgname = 'tasks_guard_update'))
order by n.nspname, c.relname;
```

ต้องพบทั้ง 2 trigger และไม่อยู่ในสถานะ D (disabled); migration นี้สร้างในสถานะ O ตามปกติ

## ทดสอบสิทธิ์ด้วยผู้ใช้จริงก่อนสรุปผล

ใช้ A หัวหน้าทีม 1, B สมาชิกทีม 1 และ C ทีม 2 ตาม `docs/testing-us-1-3.md` และ `docs/testing-us-4.md`:

- AC-2.6 / AC-3.7: C อ่านชื่อ/รหัสเชิญ/โปรไฟล์/งานทีม 1 ไม่ได้ ทั้งหน้าเว็บและ Data API
- AC-3.3: B ส่งคำขอสร้างงานตรงไม่ได้
- AC-3.4: A ส่งผู้รับงานเป็น C ไม่ได้
- AC-4.3: B เปลี่ยนสถานะงานที่มอบให้ A ไม่ได้ และ C แก้งานทีม 1 ไม่ได้
- AC-4.4: B ส่งสถานะพร้อมแอบแก้ชื่อ/รายละเอียด/กำหนดส่ง/ผู้รับงานต้องถูกปฏิเสธทั้งคำขอ

มีสคริปต์ให้เจ้าของโปรเจกต์รันเอง:

```powershell
node --env-file=.env.local scripts/check-us3.mjs
node --env-file=.env.local scripts/check-us4.mjs
```

สคริปต์แรกสร้างงานทดสอบ 2 งานต่อครั้ง สคริปต์ที่สองสร้าง 3 งานต่อครั้ง เก็บงานไว้ให้ดูผลบนเว็บ ไม่ลบข้อมูลเดิม และใช้เฉพาะ publishable key/token ของผู้ใช้ รหัสผ่านให้กรอกใน Terminal ไม่ส่งในแชท รอบตรวจนี้ไม่ได้เรียกสคริปต์ทั้งสองกับฐานข้อมูลจริง

สุดท้ายเปิด **Supabase → Advisors → Security Advisor** ตรวจรายการที่พบ แล้วบันทึกผล SQL และการทดสอบหลายบัญชี ก่อนตัดสินใจเปิดใช้งานจริง

## สิ่งที่คุณต้องทำเอง

1. รัน SELECT ทั้ง 5 ชุดด้านบน แล้วตรวจเทียบผลที่คาดหวัง
2. เปิด Security Advisor และส่งชื่อรายการแจ้งเตือน หากมี โดยไม่ส่ง key/token/รหัสผ่าน
3. ทดสอบ A/B/C ตามคู่มือ โดยเฉพาะ AC-2.6, AC-3.3, AC-3.4, AC-3.7, AC-4.3 และ AC-4.4
4. เลือกแก้ SEC-01 ก่อนเปิดให้คนทั่วไปสมัคร และวางแผนอัปเดตแพ็กเกจ SEC-02 พร้อมทดสอบความเข้ากันได้
