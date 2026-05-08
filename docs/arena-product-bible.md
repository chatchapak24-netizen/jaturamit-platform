# Jaturamit Arena Product Bible

## 1. Vision

Jaturamit Arena คือ **มัลติเวิร์สของฟุตบอลขาสั้น** พื้นที่ที่ฟุตบอลนักเรียนคือที่สุด ไม่ใช่ส่วนเสริมของเว็บหลัก ไม่ใช่แค่หน้าโหวต และไม่ใช่ marketplace ทั่วไป

Arena คือระบบที่บันทึกศักดิ์ศรี ความทรงจำ และตัวตนของนักฟุตบอลนักเรียนไทย ผ่านการ์ด การเคลม Collection ตัวตนของผู้สะสม และแคมเปญที่ต่อยอดจากวัฒนธรรมฟุตบอลโรงเรียน

ฟุตบอลนักเรียนไม่ใช่ฟุตบอลอาชีพเวอร์ชันเล็กกว่า เด็กบางคนไม่มีค่าตัว ไม่มีเงินเดือน ไม่มีสัญญา แต่เขาวิ่งลืมตายเพื่อเสื้อโรงเรียน เพื่อน รุ่นพี่ รุ่นน้อง และช่วงชีวิตนักเรียนของตัวเอง

แกนของ Arena คือ:

> การ์ดไม่ได้มีค่าเพราะเด็กคนนั้นดัง  
> การ์ดมีค่าเพราะช่วงเวลานั้นจะไม่มีวันย้อนกลับมาอีก

## 2. Core Philosophy

Arena ไม่ได้ขายแค่การ์ด แต่บันทึกช่วงเวลาที่เด็กคนหนึ่งได้เป็นนักฟุตบอลของโรงเรียน ช่วงเวลานั้นมีคุณค่าเพราะมันเกิดขึ้นครั้งเดียวในชีวิต และไม่มีระบบฟุตบอลอาชีพใดแทนความหมายนี้ได้

ฟุตบอลนักเรียนมีศักดิ์ศรีในแบบของตัวเอง ศักดิ์ศรีนั้นไม่ได้วัดด้วยค่าตัว สัญญา หรือชื่อเสียง แต่วัดจากการได้ใส่เสื้อโรงเรียน ลงสนามต่อหน้าเพื่อน ครู รุ่นพี่ รุ่นน้อง และคนในชุมชน

วันสุดท้ายของฟุตบอลนักเรียน อาจเป็นวันเดียวกับวันสุดท้ายของชีวิตนักเรียน สำหรับบางคน การแข่งขันหนึ่งนัด รูปหนึ่งใบ หรือการ์ดหนึ่งใบ อาจเป็นสิ่งเดียวที่เหลืออยู่เพื่อยืนยันว่าเขาเคยยืนอยู่ตรงนั้นจริง ๆ

ดังนั้น Arena ต้องปฏิบัติต่อผู้เล่น โรงเรียน และช่วงเวลาเหล่านี้ด้วยความเคารพ ไม่ลดทอนให้เป็นแค่แต้ม โหวต ราคา หรือของสะสมทั่วไป

## 3. Product Boundaries

เว็บหลักคือระบบข้อมูลการแข่งขัน:

- ข่าว
- โปรแกรม
- ผลแข่ง
- ตารางคะแนน
- ทีม
- นักเตะ

Arena คือระบบตัวตนและของสะสมฟุตบอลนักเรียน:

- Cards
- Claim
- Collection
- Identity
- Coins
- Campaigns
- Marketplace ในอนาคต
- Trade ในอนาคต
- Squad Builder ในอนาคต

Vote ranking เป็นเพียง campaign feature ของ Arena ไม่ใช่ core ของ Arena เอง ใช้เพื่อสร้างกิจกรรมช่วงสั้น กระตุ้นการมีส่วนร่วม และเปิดพื้นที่ให้แฟนโรงเรียนเชียร์กัน แต่ไม่ควรถูกเข้าใจว่าเป็นระบบคุณค่าหลักของการ์ดหรือผู้เล่น

FIFA/Elo ranking เป็นระบบแรงกิ้งทีมจากผลแข่งจริง ต้องแยกจาก vote ranking อย่างชัดเจน:

- Vote ranking = เสียงเชียร์ / campaign engagement
- FIFA/Elo ranking = performance ranking จากผลการแข่งขันจริง
- Collector ranking = ความคืบหน้าและพฤติกรรมการสะสมใน Arena

## 4. Core User Loop

Core loop หลักของ Arena คือ:

1. ได้การ์ดจริง
2. สแกน QR
3. เคลมการ์ด
4. เห็นการ์ดใน Collection
5. รู้สึกเป็นเจ้าของ
6. แชร์/อวด
7. กลับมาตามเก็บต่อ

ความรู้สึกสำคัญที่สุดคือ “นี่คือของฉัน” และ “ช่วงเวลานี้ถูกบันทึกไว้แล้ว”

ระบบต้องทำให้ผู้ใช้เข้าใจทันทีว่าเขาเคลมสำเร็จหรือไม่ การ์ดอยู่ที่ไหน และเขาจะกลับมาดูหรืออวดได้อย่างไร

## 5. Core Routes

Route architecture ที่ควรวางเป็นแกน:

- `/arena`
- `/arena/claim`
- `/arena/collection`
- `/arena/cards`
- `/arena/cards/[id]`
- `/arena/vote`
- `/arena/vote/ranking`
- `/admin/arena`
- `/admin/arena/cards`
- `/admin/arena/claim-codes`
- `/admin/arena/collections`
- `/admin/arena/audit-logs`

หมายเหตุสำคัญ:

- Arena Vote MVP เดิมควรถูกย้ายไปเป็น `/arena/vote` ในอนาคต
- `/arena` ควรเป็น landing ของ Arena Card Platform ไม่ใช่หน้าโหวต
- `/arena/vote/ranking` ต้องระบุให้ชัดว่าเป็น vote ranking ไม่ใช่ ranking ทีมจากผลแข่งจริง

## 6. Domain Architecture

### Core Football Domain

- `teams`
- `players`
- `matches`
- `tournaments`
- `standings`

Domain นี้คือความจริงของการแข่งขัน ใช้เป็นฐานข้อมูลอ้างอิงให้ Arena แต่ไม่ควรถูกผูกแน่นจน Arena ขยับไม่ได้

### Arena Identity Domain

- `arena_profiles`
- `collections`
- `collector_stats`
- `achievements`

Domain นี้คือ “ตัวตนของผู้สะสม” และความสัมพันธ์ของเขากับ Arena

### Arena Card Domain

- `card_templates`
- `card_editions`
- `claim_codes`
- `user_cards`
- `card_ownership_history`

Domain นี้คือหัวใจของ Arena ต้องแน่นที่สุดก่อนขยายไป economy หรือ trade

### Arena Economy Domain

- `wallets`
- `wallet_transactions`
- `rewards`
- `store_products`
- `marketplace_listings`
- `trade_offers`

Domain นี้ต้องตามหลัง ownership ที่แข็งแรงแล้วเท่านั้น

### Arena Campaign Domain

- `vote_events`
- `vote_entries`
- `missions`
- `drops`
- `seasonal_events`

Domain นี้ใช้สร้างกิจกรรมรอบ Arena แต่ไม่ใช่ core ownership

### Arena Admin Domain

- `admin_audit_logs`
- `moderation`
- `settings`

Domain นี้ต้องป้องกันความผิดพลาดจากหลังบ้าน เพราะข้อมูลการ์ดและ claim มีผลต่อ trust โดยตรง

## 7. Card Meaning

การ์ด 1 ใบควรเก็บความหมายมากกว่าข้อมูลพื้นฐาน ต้องตอบได้ว่า “การ์ดนี้บันทึกช่วงเวลาอะไร”

ข้อมูลสำคัญของการ์ด:

- player
- school/team
- season
- jersey number
- position
- rarity
- edition
- serial number
- claim status
- owner
- story/moment
- created context

`created context` ควรบันทึกว่าใบนี้ถูกสร้างจากอะไร เช่น รายชื่อฤดูกาล ภาพถ่ายวันแข่ง รอบการแข่งขัน แคมเปญพิเศษ หรือ edition เฉพาะงาน

`story/moment` คือพื้นที่ทำให้การ์ดมีชีวิต ไม่ใช่แค่รูป ชื่อ เบอร์ และสี

## 8. Claim Lifecycle

Lifecycle ของ claim:

`unissued` -> `printed` -> `claimable` -> `claimed` -> `owned` -> `locked / transferable / archived`

ความหมายของแต่ละสถานะ:

- `unissued`: มีข้อมูลการ์ดในระบบ แต่ยังไม่สร้าง physical card หรือ claim code
- `printed`: การ์ดถูกเตรียมพิมพ์หรือพิมพ์แล้ว
- `claimable`: QR/claim code ใช้งานได้
- `claimed`: มีการใช้ claim code สำเร็จแล้ว
- `owned`: การ์ดอยู่ใน collection ของเจ้าของ
- `locked`: ห้ามโอน ห้าม trade หรือถูกกันไว้ตามเงื่อนไข
- `transferable`: พร้อมโอนหรือเข้าสู่ระบบ trade/marketplace ในอนาคต
- `archived`: ปิดการใช้งานหรือเก็บเป็น record ประวัติ

หลักที่ต้องยึด:

- ต้องกัน duplicate claim
- ต้องมี audit log ทุกครั้งที่เกิด claim, failed claim, ownership change หรือ admin override
- claim success ต้องชัดเจนมาก ผู้ใช้ต้องรู้ทันทีว่าการ์ดเข้าคอลเลกชันแล้ว
- error message ต้องเป็นภาษาไทย เข้าใจง่าย และบอกทางไปต่อ
- mobile-first เพราะผู้ใช้จำนวนมากจะสแกน QR จากมือถือหน้าโรงเรียนหรือหน้าสนาม

## 9. Rarity & Scarcity Rules

ระดับ rarity:

- Common
- Rare
- Epic
- Legendary
- Limited

หลักความขาดแคลน:

- Common คือฐานของระบบ ต้องมีเยอะพอให้คนเริ่มสะสมง่าย
- Rare ต้องมีเหตุผล เช่น edition เฉพาะทีม เฉพาะตำแหน่ง หรือช่วงเวลาสำคัญ
- Epic ต้องผูกกับ moment ที่มีน้ำหนักกว่า rare
- Legendary ต้องระวังมาก ใช้กับช่วงเวลาที่มีความหมายจริง ไม่ใช้พร่ำเพรื่อ
- Limited ต้องมีจำนวนชัดเจน ตรวจสอบได้ และสื่อสารตรงไปตรงมา

ข้อห้าม:

- ห้ามสร้าง Limited แบบไม่จำกัด
- ห้ามทำ rarity มั่วจนเสีย trust
- serial number ต้องมีความหมาย
- edition ต้องชัด

ถ้า rarity ไม่ซื่อสัตย์ ระบบสะสมจะพัง เพราะผู้ใช้จะไม่เชื่อว่าการ์ดของเขามีคุณค่าจริง

## 10. Economy Principles

ยังไม่ควรสร้าง marketplace ตอนนี้ ระบบเศรษฐกิจต้องมาหลังจาก ownership, claim, audit และ collection แข็งแรงแล้ว

หลัก economy:

- coins ต้องมี source/sink ชัดเจน
- marketplace ต้องมาหลัง ownership แข็ง
- trade ต้องมาหลัง lock/escrow logic ชัด
- ห้ามทำเศรษฐกิจที่ทำลายคุณค่าการ์ด

ตัวอย่าง source ของ coins:

- เคลมการ์ดครั้งแรก
- mission
- event participation
- reward จาก collection milestone

ตัวอย่าง sink ของ coins:

- redeem reward
- cosmetic frame
- campaign entry
- special drop access

Marketplace และ trade ต้องไม่ทำให้เด็กนักฟุตบอลกลายเป็น commodity แบบไร้บริบท เป้าหมายคือเพิ่มชีวิตให้ collection ไม่ใช่บีบทุกอย่างให้เป็นราคา

## 11. UX Principles

หลัก UX:

- Claim UX สำคัญที่สุด
- Collection ต้องทำให้คนอยากอวด
- Card detail ต้องทำให้การ์ดมีชีวิต
- Admin ต้องกันมือพลาด
- Mobile first
- ภาษาไทยเข้าใจง่าย
- ไม่ใช้คำเทคนิคกับผู้ใช้ทั่วไป

Claim UX ต้องเร็ว ชัด และมั่นใจ:

- สแกนแล้วรู้ว่ากำลังเคลมอะไร
- เคลมสำเร็จแล้วเห็นภาพการ์ดทันที
- ถ้าผิดพลาด ต้องรู้ว่าผิดเพราะอะไร
- ถ้าการ์ดถูกเคลมแล้ว ต้องอธิบายให้ชัด

Admin UX ต้องลดความเสี่ยง:

- action สำคัญต้อง confirm
- destructive action ต้องแยกชัด
- claim code generation ต้อง preview ได้
- bulk action ต้องมี summary ก่อน execute
- audit log ต้องอ่านง่าย

## 12. Visual Identity

แนว UI:

- Dark Premium Sports Card
- Football Shorts Culture
- School Pride
- Premium แต่ไม่เย็นชา
- มีหัวใจ ไม่ใช่ marketplace แข็ง ๆ

สีหลัก:

- ดำ
- น้ำเงินเข้ม
- ทอง
- ขาว
- แดงเป็น accent

อารมณ์:

- ศักดิ์ศรี
- ความทรงจำ
- ความภูมิใจ
- สนามโรงเรียน
- เสื้อโรงเรียน
- รุ่นพี่รุ่นน้อง

ภาพรวมควรรู้สึกเหมือนการเปิดแฟ้มความทรงจำฟุตบอลโรงเรียนที่ถูกยกระดับให้เป็นของสะสม premium ไม่ใช่กระดานซื้อขายแข็ง ๆ หรือเว็บโหวตทั่วไป

## 13. Roadmap

### Phase 0: Freeze current vote MVP and document product direction

หยุดขยาย vote MVP ชั่วคราว และจัดเอกสารแม่เพื่อกำหนดแกน Arena ใหม่

### Phase 1: Arena Product Bible + Architecture

นิยาม vision, domain, route, lifecycle, UX, visual identity และ refactor direction

### Phase 2: Claim System

สร้างระบบ claim code, QR, duplicate prevention, claim success, claim error และ audit log

### Phase 3: Collection System

สร้าง collection ของผู้ใช้ ให้เห็นการ์ดที่เป็นเจ้าของ และวาง collector identity

### Phase 4: Card Detail

ทำหน้าการ์ดให้มีชีวิต มี story/moment, edition, serial, rarity และ context

### Phase 5: Admin Card / Claim Code Generator

สร้างหลังบ้านสำหรับ card templates, editions, claim codes, bulk generation และ audit

### Phase 6: Rewards / Coins

เพิ่ม reward และ coins หลังจาก claim/ownership แข็งแรงแล้ว

### Phase 7: Campaigns / Vote / Collector Ranking

ย้าย vote เป็น campaign feature และเพิ่ม collector ranking ที่แยกจาก vote ranking

### Phase 8: Marketplace

เปิด marketplace หลัง ownership, lock และ economy rules พร้อม

### Phase 9: Trade

เพิ่ม trade หลัง escrow/lock logic และ ownership history พร้อม

### Phase 10: Squad Builder

ให้ผู้ใช้จัดทีมจากการ์ดที่สะสม สร้าง identity และ social loop เพิ่มเติม

## 14. Immediate Refactor Recommendation

### วิเคราะห์ Arena Vote MVP ปัจจุบัน

สิ่งที่เก็บไว้ได้:

- แนวคิด contest/event ที่เปิดหรือปิดได้
- entry ของ campaign
- vote count และ ranking UI
- RPC สำหรับนับผลแบบไม่เปิดตาราง votes ตรง ๆ
- การกันโหวตซ้ำในระดับ MVP ด้วย token ต่อ device

สิ่งที่ควร rename:

- `arena_contests` ควรถูกมองเป็น `vote_events` หรือ campaign event ในอนาคต
- `arena_entries` ควรถูกมองเป็น `vote_entries`
- `arena_votes` ควรถูกย้ายความหมายไปอยู่ใน Arena Campaign Domain
- `get_arena_ranking` ควรระบุว่าเป็น vote ranking เช่น `get_arena_vote_ranking`
- `cast_arena_vote` ยังใช้ได้ใน campaign context แต่ไม่ควรเป็น API กลางของ Arena ทั้งระบบ

สิ่งที่ควรย้าย route:

- `/arena` ปัจจุบันควรเปลี่ยนเป็น landing ของ card platform
- vote UI เดิมควรย้ายไป `/arena/vote`
- ranking vote เดิมควรย้ายไป `/arena/vote/ranking`
- ถ้ายังต้องแสดงในช่วงงาน ควรมี label ชัดว่าเป็น Vote Ranking

สิ่งที่ไม่ควรขยายต่อ:

- ไม่ควรเพิ่ม marketplace จาก schema vote ปัจจุบัน
- ไม่ควรใช้ vote ranking เป็น core ranking ของ Arena
- ไม่ควรสร้าง card/claim/collection ต่อบนตาราง vote โดยตรง
- ไม่ควรให้ `/arena` กลายเป็นหน้า campaign เดียว

แผน refactor ที่แนะนำ:

1. Freeze vote MVP ไม่เพิ่ม logic ใหม่จนกว่า claim architecture พร้อม
2. เปลี่ยน `/arena` เป็น landing ของ Arena Card Platform
3. ย้าย vote UI เดิมไป `/arena/vote`
4. ย้าย ranking vote เดิมไป `/arena/vote/ranking`
5. แยกคำว่า Vote Ranking ออกจาก Team Ranking, Collector Ranking และ Card Rarity
6. เริ่ม Phase 2 ด้วย Claim System ก่อน Collection, Coins หรือ Marketplace

## Current System Risks

ความเสี่ยงของระบบปัจจุบัน:

- `/arena` ถูกใช้เป็นหน้า vote ทำให้คนเข้าใจผิดว่า Arena คือระบบโหวต
- schema ปัจจุบันใช้ชื่อ `arena_*` กับ vote feature ทำให้ domain boundary เบลอ
- vote ranking อาจถูกเข้าใจผิดว่าเป็น ranking ทีมจริง
- ยังไม่มี claim lifecycle, ownership history และ audit log สำหรับการ์ด
- ยังไม่มีภาษา UX สำหรับ claim success/error ที่เป็นหัวใจของ Arena
- ถ้าขยาย economy หรือ marketplace ตอนนี้ จะเสี่ยงสร้างระบบซื้อขายก่อนระบบ ownership แข็งแรง

## Next Step

เอกสารนี้เปลี่ยนทิศทาง Arena จาก “หน้าโหวต” ไปเป็น “Card Platform ที่บันทึกช่วงเวลาฟุตบอลนักเรียน” โดยวาง vote เป็นเพียง campaign feature หนึ่งของระบบ ไม่ใช่แกนหลัก

next step ที่ควรทำหลังเอกสารนี้:

1. ทำ route refactor plan โดยไม่ลบ vote MVP เดิม
2. ออกแบบ Claim System schema แยกจาก vote schema
3. นิยาม card template, edition, serial, rarity และ claim code rules
4. ทำ UX wireframe สำหรับ `/arena`, `/arena/claim`, `/arena/collection`, `/arena/cards/[id]`
5. สร้าง admin flow สำหรับ card generation และ audit log ก่อนเริ่ม economy
