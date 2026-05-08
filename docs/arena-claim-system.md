# Jaturamit Arena Claim System

## 1. Claim System Purpose

Claim System คือประตูแรกของ Jaturamit Arena เป็นจังหวะที่การ์ดจริงจากโลกสนาม โรงเรียน เพื่อน รุ่นพี่ รุ่นน้อง และความทรงจำ กลายเป็นการ์ดดิจิทัลที่ผู้ถือรู้สึกว่า “การ์ดใบนี้เป็นของฉันจริง ๆ”

เป้าหมายของ Claim ไม่ใช่แค่ redeem code ไม่ใช่แค่กรอกรหัสแล้วเพิ่ม record ลงฐานข้อมูล แต่คือการสร้างความรู้สึก ownership ที่ชัดเจน น่าเชื่อถือ และมีอารมณ์พอให้ผู้ใช้รู้สึกว่าช่วงเวลานี้ถูกบันทึกไว้แล้ว

Claim ต้องตอบคำถามของผู้ใช้ให้ได้ทันที:

- ฉันกำลังเคลมการ์ดใบไหน
- การ์ดนี้เป็นของฉันแล้วหรือยัง
- ถ้าเคลมสำเร็จ การ์ดอยู่ที่ไหน
- ถ้าเคลมไม่ได้ ต้องทำอย่างไรต่อ

นี่คือระบบที่สร้าง trust แรกของ Arena ถ้า claim พลาด ความรู้สึกต่อการ์ดทั้งใบจะเสียทันที

## 2. Core Claim Flow

Flow หลัก:

1. ได้การ์ดจริง
2. สแกน QR
3. เปิดหน้า `/arena/claim`
4. กรอกหรือ auto-fill claim code
5. login/signup หรือ guest pre-claim
6. ยืนยัน
7. เคลมสำเร็จ
8. เพิ่มเข้า Collection
9. ไปหน้า Card Detail หรือ Collection

รายละเอียด flow:

- QR ควรพาไป `/arena/claim?code=...` หรือ tokenized URL ที่ปลอดภัยกว่า
- ถ้า code อยู่ใน URL ให้ระบบ auto-fill และแสดง preview การ์ดทันที
- ผู้ใช้ต้องเห็นข้อมูลการ์ดก่อนกดยืนยัน เช่น ชื่อนักเตะ โรงเรียน ฤดูกาล เบอร์เสื้อ edition และ serial
- ถ้ายังไม่ login ระบบควรให้ login/signup แบบสั้นที่สุด หรือทำ guest pre-claim ที่ผูกสิทธิ์ไว้ชั่วคราวจนกว่าจะ login สำเร็จ
- เมื่อเคลมสำเร็จ ต้องแสดง success screen ที่ชัด มีภาพ/ชื่อการ์ด และปุ่มไปต่อ

## 3. Claim Lifecycle

สถานะหลัก:

- `unissued`
- `printed`
- `claimable`
- `claimed`
- `owned`
- `locked`
- `transferable`
- `archived`

นิยาม:

- `unissued`: มี template/edition แล้ว แต่ยังไม่สร้าง printed card หรือ claim code
- `printed`: การ์ดถูก generate เพื่อพิมพ์แล้ว มี serial และ edition ชัดเจน
- `claimable`: claim code พร้อมใช้งาน ผู้ถือการ์ดสามารถเคลมได้
- `claimed`: claim code ถูกใช้สำเร็จแล้ว
- `owned`: การ์ดถูกผูกกับ arena profile/user แล้ว และแสดงใน Collection
- `locked`: การ์ดถูกล็อก ไม่สามารถ transfer/trade/list ได้ เช่น ช่วงตรวจสอบหรือ special edition
- `transferable`: การ์ดพร้อมสำหรับระบบ transfer/trade/marketplace ในอนาคต
- `archived`: การ์ดถูกเก็บเป็นประวัติ ปิดการใช้งาน หรือถูกยกเลิกด้วยเหตุผลที่ audit ได้

Lifecycle พื้นฐาน:

`unissued` -> `printed` -> `claimable` -> `claimed` -> `owned` -> `locked / transferable / archived`

ข้อสำคัญ:

- `printed_cards` ควรเป็น record ที่มั่นคงหลังออกจริง
- `claim_codes` เป็นทางเข้าการ claim ไม่ใช่ตัวแทน ownership
- `user_cards` คือ ownership ปัจจุบัน
- `card_ownership_history` คือ record ประวัติที่ห้ามหาย

## 4. Data Model Draft

### `card_templates`

แม่แบบของการ์ด เช่น layout, sport, card type, visual family, metadata field ที่ต้องแสดง

Fields draft:

- `id`
- `slug`
- `name`
- `description`
- `template_type`
- `visual_theme`
- `is_active`
- `created_at`
- `updated_at`

### `card_editions`

edition เฉพาะของ template เช่น Jaturamit Ratchaburi 2026, school set, final day set

Fields draft:

- `id`
- `template_id`
- `season_id`
- `tournament_id`
- `slug`
- `name`
- `description`
- `rarity`
- `edition_size`
- `release_status`
- `released_at`
- `created_at`
- `updated_at`

### `printed_cards`

การ์ดจริงแต่ละใบที่มี serial เฉพาะ ต้อง immutable หลังออกจริง

Fields draft:

- `id`
- `edition_id`
- `player_id`
- `team_id`
- `season_id`
- `jersey_number`
- `position`
- `serial_number`
- `print_status`
- `claim_status`
- `story`
- `created_context`
- `printed_at`
- `created_at`
- `updated_at`

### `claim_codes`

รหัสหรือ token ที่ใช้ claim printed card

Fields draft:

- `id`
- `printed_card_id`
- `code_hash`
- `code_hint`
- `status`
- `expires_at`
- `claimed_at`
- `claimed_by_profile_id`
- `disabled_reason`
- `created_at`
- `updated_at`

### `arena_profiles`

ตัวตนของผู้ใช้ใน Arena

Fields draft:

- `id`
- `auth_user_id`
- `display_name`
- `handle`
- `avatar_url`
- `school_affinity`
- `created_at`
- `updated_at`

### `user_cards`

ownership ปัจจุบันของการ์ด

Fields draft:

- `id`
- `profile_id`
- `printed_card_id`
- `ownership_status`
- `acquired_via`
- `acquired_at`
- `locked_until`
- `created_at`
- `updated_at`

### `card_claim_events`

event log เฉพาะการ claim ทั้ง success และ failure

Fields draft:

- `id`
- `claim_code_id`
- `printed_card_id`
- `profile_id`
- `event_type`
- `result`
- `failure_reason`
- `request_fingerprint`
- `ip_hash`
- `user_agent`
- `created_at`

### `card_ownership_history`

ประวัติ ownership ทุกครั้งที่เกิดการเปลี่ยนมือหรือเปลี่ยนสถานะ

Fields draft:

- `id`
- `printed_card_id`
- `from_profile_id`
- `to_profile_id`
- `event_type`
- `reason`
- `created_by`
- `created_at`

### `arena_audit_logs`

audit log สำหรับ admin และ action สำคัญทั้งหมด

Fields draft:

- `id`
- `actor_profile_id`
- `actor_auth_user_id`
- `action`
- `entity_type`
- `entity_id`
- `before_data`
- `after_data`
- `metadata`
- `created_at`

## 5. Entity Relationship

ความสัมพันธ์หลัก:

`Card Template` -> `Card Edition` -> `Printed Card` -> `Claim Code` -> `User Card` -> `Ownership History`

คำอธิบาย:

- Card Template กำหนดหน้าตาและชนิดของการ์ด
- Card Edition กำหนดชุดที่การ์ดใบนั้นอยู่ เช่น season, event, rarity, edition size
- Printed Card คือการ์ดจริง 1 ใบ มี serial และบริบทเฉพาะ
- Claim Code คือกุญแจที่ใช้ผูก printed card เข้ากับผู้ใช้
- User Card คือ ownership ปัจจุบันใน Collection
- Ownership History คือความทรงจำด้านเจ้าของและสถานะที่ตรวจสอบย้อนหลังได้

หลักสำคัญ:

- printed card หนึ่งใบควรมี owner active ได้เพียงคนเดียวในเวลาเดียวกัน
- claim code หนึ่งชุดควร claim สำเร็จได้ครั้งเดียว
- ownership history ต้องไม่ถูกลบ แม้ user card จะถูก lock/archive

## 6. Claim Code Strategy

หลักของ claim code:

- code ต้องเดายาก
- ไม่ควรใช้ serial number เป็น claim code
- QR ควรพาไป URL ที่มี token หรือ code
- ต้องรองรับ manual input
- code ควรถูก hash หรือจัดเก็บอย่างปลอดภัยถ้าเหมาะสม
- ต้องมี `expires_at` ได้ในอนาคต

แนวทางแนะนำ:

- ใช้ random token ความยาวพอ เช่น 128-bit หรือมากกว่า
- แสดง manual code เป็น format ที่พิมพ์ง่าย เช่น `JR26-ABCD-1234`
- เก็บ `code_hash` แทน plain code
- เก็บ `code_hint` เฉพาะส่วนท้ายหรือ masked code เพื่อ support ได้ เช่น `****-1234`
- serial number ใช้เพื่อบอกความหมายของ edition ไม่ใช่เพื่อ authorize claim
- QR URL ควรมี token ที่ไม่สื่อข้อมูลภายใน เช่น `/arena/claim?code=JR26-ABCD-1234`

ถ้า code หลุด:

- admin ต้อง disable/reissue ได้
- audit log ต้องบอกว่าใคร disable/reissue เมื่อไร และเพราะอะไร
- ผู้ใช้ต้องได้รับข้อความไทยที่ไม่ทำให้ panic แต่บอกทางต่อ

## 7. Duplicate Prevention

ต้องกันกรณีเหล่านี้:

- เคลมซ้ำ
- ยิง request ซ้ำ
- QR หลุด
- code ถูกเดา
- race condition ตอน claim พร้อมกัน

แนวทางป้องกัน:

- claim RPC ต้องทำงานใน transaction เดียว
- lock row ของ `claim_codes` หรือ `printed_cards` ตอน claim
- unique constraint ที่ `user_cards.printed_card_id`
- unique constraint หรือ status guard ที่ `claim_codes`
- ตรวจ `claim_codes.status = 'claimable'` ก่อนสร้าง ownership
- update status เป็น claimed ใน transaction เดียวกับ insert user card
- insert `card_claim_events` และ `card_ownership_history` ใน transaction เดียวกัน
- idempotency guard สำหรับ request ซ้ำจากปุ่มเดียวกัน
- rate limit หรือ request fingerprint ในอนาคต

กรณี race condition:

ถ้าคนสองคนเคลมพร้อมกันด้วย code เดียวกัน คนแรกที่ transaction สำเร็จจะได้ ownership คนที่สองต้องได้ข้อความชัดว่า “การ์ดใบนี้ถูกเคลมแล้ว”

## 8. Ownership Model

หลัก ownership:

- `user_cards` คือ ownership ปัจจุบัน
- `card_ownership_history` คือประวัติความเป็นเจ้าของ
- `printed_cards` ควร immutable หลังสร้าง
- serial/edition/rarity ห้ามแก้มั่วหลังออกจริง

สถานะของ user card:

- `owned`
- `locked`
- `transferable`
- `listed`
- `in_trade`
- `archived`

หลักที่ต้องยึด:

- การเปลี่ยน owner ต้องบันทึก history
- การ lock/unlock ต้องมี reason และ audit
- card ที่เป็น Limited ต้องรักษา edition size และ serial ให้ตรวจสอบได้
- ห้ามแก้ rarity/edition/serial หลัง release ยกเว้น admin correction ที่มี audit log
- ownership ต้องออกแบบเผื่อ marketplace/trade แต่ไม่เปิดก่อนระบบ lock/escrow พร้อม

## 9. UX States ภาษาไทย

### Loading

- “กำลังตรวจสอบการ์ด...”
- “กำลังเตรียมข้อมูลการเคลม...”
- “กำลังบันทึกการ์ดเข้าคอลเลกชันของคุณ...”

### Invalid Code

- “ไม่พบรหัสการ์ดนี้”
- “รหัสไม่ถูกต้อง กรุณาตรวจสอบ QR หรือกรอกรหัสอีกครั้ง”
- “ถ้าคุณคิดว่านี่เป็นความผิดพลาด กรุณาติดต่อทีมงาน”

### Already Claimed

- “การ์ดใบนี้ถูกเคลมแล้ว”
- “รหัสนี้ถูกใช้งานไปแล้ว หากคุณเป็นเจ้าของการ์ดจริง กรุณาติดต่อทีมงาน”
- “เราไม่สามารถเคลมการ์ดใบเดิมซ้ำได้ เพื่อป้องกันการซ้ำซ้อนของเจ้าของ”

### Success

- “เคลมสำเร็จ”
- “การ์ดใบนี้เป็นของคุณแล้ว”
- “เราเพิ่มการ์ดนี้เข้า Collection ของคุณเรียบร้อยแล้ว”
- “ช่วงเวลานี้ถูกบันทึกไว้ใน Arena แล้ว”

### Network Error

- “เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง”
- “ระบบยังบันทึกไม่สำเร็จ กรุณาอย่าปิดหน้านี้และลองใหม่”
- “ถ้ายังไม่สำเร็จ กรุณาติดต่อทีมงานพร้อมรหัสการ์ด”

### Login Required

- “เข้าสู่ระบบเพื่อเก็บการ์ดใบนี้”
- “เราต้องรู้ว่า Collection นี้เป็นของใคร ก่อนเพิ่มการ์ดเข้าไป”
- “ใช้เวลาไม่นาน แล้วคุณจะเห็นการ์ดใน Collection ของคุณทันที”

### Admin Support Needed

- “ต้องให้ทีมงานตรวจสอบ”
- “รหัสนี้มีสถานะที่ต้องตรวจสอบเพิ่มเติม กรุณาติดต่อทีมงาน”
- “กรุณาเก็บการ์ดใบจริงไว้ และแจ้งรหัสท้ายการ์ดกับทีมงาน”

## 10. Mobile-first UX

ผู้ใช้ส่วนใหญ่จะสแกน QR ด้วยมือถือ อาจอยู่หน้าโรงเรียน สนามแข่งขัน ร้านค้า หรือจุดแจกการ์ด UX ต้องเร็วและไม่ทำให้รู้สึกเหมือนกรอกเอกสาร

ต้องมี:

- ปุ่มใหญ่
- ขั้นตอนสั้น
- ไม่ใช้ฟอร์มยาว
- success screen มีอารมณ์
- ปุ่ม “ดูการ์ดของฉัน”
- ปุ่ม “แชร์การ์ด”

หน้า claim ที่ดีควรมี:

- preview การ์ดใหญ่พอเห็นชัด
- ชื่อนักเตะ โรงเรียน ฤดูกาล เบอร์เสื้อ และ edition
- ปุ่มหลักเพียงปุ่มเดียวในแต่ละ step
- manual input สำหรับกรณีสแกน QR ไม่ได้
- ข้อความไทยตรงไปตรงมา
- loading state ที่บอกว่าระบบกำลังทำอะไร

Success screen ควรรู้สึกเหมือนเปิดซองการ์ดแล้วได้ของจริง ไม่ใช่แค่ alert ว่า “บันทึกสำเร็จ”

## 11. Admin Flow

Admin flow ที่ต้องรองรับ:

- generate printed cards
- generate claim codes
- export QR/CSV
- revoke/disable code
- reissue code
- manual claim assist
- audit ทุก action

รายละเอียด:

### Generate Printed Cards

Admin เลือก edition, player set, quantity และ rules เช่น serial range, rarity, story/moment แล้ว generate printed card records

ต้องมี preview ก่อนสร้างจริง

### Generate Claim Codes

Admin สร้าง claim codes สำหรับ printed cards ที่ยังไม่มี code หรือสร้างใหม่จาก reissue flow

ต้องไม่แสดง full code เกินจำเป็นหลังสร้างแล้ว ยกเว้น export ครั้งแรกตามสิทธิ์ที่ชัด

### Export QR/CSV

รองรับ export สำหรับงานพิมพ์:

- card id
- serial number
- QR URL
- masked code
- edition
- player/team

### Revoke/Disable Code

ใช้เมื่อ code หลุด พิมพ์ผิด หรือมีปัญหา ต้องมี reason เสมอ

### Reissue Code

สร้าง code ใหม่ให้ printed card เดิม โดยต้อง disable code เก่าก่อน และบันทึก audit

### Manual Claim Assist

สำหรับทีมงานช่วยผู้ใช้หน้า event ต้องมี flow ที่ปลอดภัย:

- ค้นหาด้วย masked code / serial / player / edition
- เห็นสถานะ claim
- ช่วย claim ได้เฉพาะ role ที่มีสิทธิ์
- ทุก action ต้อง audit

## 12. Security & Trust

หลัก security:

- RLS policy ต้องชัด
- claim RPC ควรเป็น transaction เดียว
- audit log ต้องเก็บ
- ห้าม expose service role
- validate ทุก input
- error message ห้าม leak ข้อมูลเกินจำเป็น

แนวทาง:

- Public client เรียก RPC สำหรับ claim เท่านั้น ไม่ insert ownership ตรง
- RPC ตรวจ code, status, profile, printed card และ claimability ใน transaction เดียว
- ใช้ `security definer` อย่างระวัง พร้อม `set search_path = public`
- RLS ห้ามเปิดตาราง sensitive เช่น `claim_codes` ให้ public อ่าน full data
- code/token ควร hash
- log IP แบบ hash หรือ metadata ที่ไม่เก็บข้อมูลเกินจำเป็น
- error public ไม่ควรบอกว่า code ใกล้เคียงอะไรหรือมี record ภายในอย่างไร

Trust สำคัญกว่า feature ถ้า user ไม่เชื่อว่า ownership ถูกต้อง marketplace/trade/collection จะไม่มีฐานให้ยืน

## 13. Future Compatibility

Claim System ต้องรองรับอนาคต:

- marketplace
- trade
- locked card
- squad usage
- rewards
- school campaigns
- collector ranking

Compatibility rules:

- `user_cards` ต้องแยก ownership status จาก printed card metadata
- `card_ownership_history` ต้องพร้อมต่อ trade/marketplace
- `locked` ต้องกัน listing/trade/squad action ได้
- rewards ต้องอ้างอิง claim event หรือ ownership milestone ได้
- school campaigns ต้องใช้ card edition/team/season ได้
- collector ranking ต้องนับ collection progress ได้โดยไม่แตะ vote ranking

ห้ามออกแบบ claim แบบ one-off ที่เพิ่มการ์ดเข้าคอลเลกชันได้อย่างเดียว แต่ตรวจสอบ ownership ย้อนหลังไม่ได้

## 14. Phase Recommendation

### Phase 1: Claim spec

จบเอกสารนี้และตกลง lifecycle, data model, UX states, security rules

### Phase 2: Schema migration

สร้าง migration ใหม่สำหรับ card/claim domain แยกจาก vote MVP โดยไม่แก้ migration เดิมที่อาจถูก apply แล้ว

### Phase 3: Admin generator

สร้างหลังบ้าน generate card templates, editions, printed cards, claim codes, QR/CSV และ audit log

### Phase 4: Public claim page

สร้าง `/arena/claim` สำหรับ scan QR, manual input, preview, login/signup หรือ guest pre-claim, confirm และ success

### Phase 5: Collection integration

เพิ่ม `/arena/collection` และทำให้ claim success เพิ่มการ์ดเข้า collection ได้ทันที

### Phase 6: Audit/recovery tools

สร้างเครื่องมือสำหรับ support, recovery, disable/reissue code, manual claim assist และตรวจสอบประวัติ

## 15. Risks

ความเสี่ยงถ้าทำผิด:

- duplicate ownership
- trust พัง
- การ์ด limited เสียความหมาย
- support burden สูง
- marketplace ไปต่อไม่ได้

รายละเอียด:

- duplicate ownership ทำให้การ์ดใบเดียวมีเจ้าของหลายคน ระบบสะสมจะเสียความน่าเชื่อถือทันที
- ถ้า claim success ไม่ชัด ผู้ใช้จะไม่มั่นใจและ support จะเพิ่มขึ้น
- ถ้า limited แก้ edition/serial มั่ว ความหมายของ rarity จะเสีย
- ถ้า claim code เดาง่ายหรือหลุดง่าย คนที่ถือการ์ดจริงอาจเสียสิทธิ์
- ถ้าไม่มี audit log ทีมงานจะแก้ปัญหาหน้างานไม่ได้
- ถ้า ownership history ไม่พร้อม marketplace/trade จะเปิดไม่ได้อย่างปลอดภัย

## Key Insight

Claim คือ moment ที่ Arena เปลี่ยนจาก “เว็บ” เป็น “ของฉัน” ถ้า claim ทำให้ผู้ใช้รู้สึกมั่นใจและภูมิใจได้ Collection, Card Detail, Rewards และ Marketplace ในอนาคตจะมีฐานที่แข็งแรง

ถ้า Claim เป็นแค่ redeem code ธรรมดา Arena จะเสียแกนความทรงจำตั้งแต่ประตูแรก

## Next Step

ขั้นต่อไปที่ควรทำ:

1. ตรวจและ approve data model draft ของ Claim System
2. ตัดสินใจเรื่อง auth: login required ทันที หรือ guest pre-claim
3. ออกแบบ migration สำหรับ `card_templates`, `card_editions`, `printed_cards`, `claim_codes`, `arena_profiles`, `user_cards`, `card_claim_events`, `card_ownership_history`, `arena_audit_logs`
4. ทำ UX wireframe ของ `/arena/claim`
5. กำหนด admin roles และสิทธิ์สำหรับ generate/revoke/reissue/manual claim
