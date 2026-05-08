# Jaturamit Arena Data Governance

## 1. Governance Philosophy

Jaturamit Arena คือ digital memory infrastructure ของฟุตบอลนักเรียนไทย ไม่ใช่แค่ระบบเก็บ item หรือระบบสะสมการ์ดทั่วไป ข้อมูลใน Arena คือหลักฐานของช่วงชีวิตหนึ่ง: เด็กคนหนึ่ง โรงเรียนหนึ่ง ฤดูกาลหนึ่ง เสื้อหมายเลขหนึ่ง และช่วงเวลาที่ไม่มีวันย้อนกลับมาอีก

ดังนั้น governance ของ Arena ต้องยึดหลักว่า trust สำคัญกว่าความเร็วในการเพิ่ม feature เสมอ ถ้าระบบเร็วแต่แก้ประวัติย้อนหลังง่าย เปลี่ยน rarity ได้ง่าย หรือลบ ownership history ได้ง่าย Arena จะเสียความหมายตั้งแต่แกนกลาง

ข้อมูลบางอย่างต้อง immutable เพราะมันคือประวัติศาสตร์ของการ์ด เช่น serial number, edition, rarity ตอนออกจริง, first claim timestamp และ issue context ข้อมูลเหล่านี้ไม่ควรถูกแก้เหมือน metadata ทั่วไป

Limited card ต้องมี historical integrity ตั้งแต่วันที่ออกจนถึงอนาคต ถ้าระบบประกาศว่า limited แล้วต้องพิสูจน์ได้ว่า supply ถูก lock จริง ออกกี่ใบ ใครสร้าง เมื่อไร และมีเหตุผลอะไรถ้ามีการแก้ไขใด ๆ

Ownership history ต้องไม่ถูก rewrite ง่าย เพราะประวัติความเป็นเจ้าของคือส่วนหนึ่งของคุณค่าการ์ด การ์ดใบหนึ่งไม่ได้มีแค่เจ้าของปัจจุบัน แต่มีเส้นทางของมันตั้งแต่พิมพ์ เคลม ถือครอง โอน ล็อก หรือ archive

## 2. Immutable vs Mutable Data

### Immutable Data

ข้อมูลกลุ่มนี้ต้องถือว่าแก้ไม่ได้หลังออกจริง ยกเว้นผ่าน incident process ที่มี audit, approval และเหตุผลชัดเจน:

- `printed_card_id`
- original serial number
- `edition_id`
- original rarity
- original issue context
- original player/team/season binding ตอนออกจริง
- original jersey number ตอนออกจริง
- original printed quantity ของ edition
- first claim timestamp
- first owner reference
- original claim event id
- original card creation timestamp

เหตุผลคือข้อมูลเหล่านี้เป็นแกนความจริงของการ์ด ถ้าแก้ย้อนหลังได้ง่าย การ์ด limited, serial และ ownership จะเสียความน่าเชื่อถือทันที

### Mutable Data

ข้อมูลกลุ่มนี้แก้ได้ตามปกติภายใต้ permission ที่เหมาะสม:

- display name ของ user/profile
- profile image
- bio หรือ profile metadata บางประเภท
- collection display preference
- public sharing preference
- card display caption ที่เป็น user-generated content
- metadata เสริมที่ไม่เปลี่ยนความจริงของการ์ด

Mutable data ต้องไม่กระทบ serial, rarity, edition, ownership หรือ claim history

### Conditionally Mutable Data

ข้อมูลกลุ่มนี้แก้ได้เฉพาะเมื่อมี policy รองรับ:

- claim status
- transfer state
- lock state
- moderation flags
- archived state
- disabled/reissued claim code state
- disputed ownership state
- card visibility state

การแก้ conditionally mutable data ต้องมี reason, actor, timestamp และ audit log เสมอ

## 3. Ownership Rules

Ownership ปัจจุบันควรเก็บที่ `user_cards` โดยหนึ่ง `printed_card` ต้องมี active owner ได้เพียงคนเดียวในเวลาเดียวกัน ข้อมูลนี้ใช้ตอบคำถามว่า “ตอนนี้การ์ดใบนี้เป็นของใคร”

Ownership history ควรเก็บที่ `card_ownership_history` แบบ append-only เพื่อบันทึกทุกเหตุการณ์สำคัญ เช่น first claim, transfer, admin correction, lock, unlock, archive หรือ recovery

First owner สำคัญมาก เพราะเป็นคนแรกที่ทำให้การ์ดจากของจริงกลายเป็น digital ownership ใน Arena first owner ควรถูก trace ได้เสมอ แม้ภายหลังการ์ดจะถูกโอน ขาย เทรด หรือ archive

การ transfer ต้องบันทึก:

- printed card
- from owner
- to owner
- transfer type
- transfer reason
- transfer source เช่น trade, marketplace, admin correction
- timestamp
- actor หรือ system process
- related transaction/escrow id ถ้ามี

Archived ownership คือสถานะที่การ์ดไม่ถูกใช้งานใน flow ปกติแล้ว แต่ยังเก็บประวัติไว้ เช่น card ถูกยกเลิกจาก duplicated issuance, ถูก freeze จาก dispute หรือถูก retire ด้วยเหตุผลเฉพาะ การ archive ไม่ใช่การลบประวัติ

## 4. Claim Governance

Claim governance ต้องป้องกันไม่ให้ประตูแรกของ Arena สร้างความเสียหายระยะยาว

### Duplicate Prevention

- claim code หนึ่งชุดต้อง claim success ได้ครั้งเดียว
- printed card หนึ่งใบต้องมี active owner ได้ครั้งเดียว
- claim RPC ต้องทำงานใน transaction เดียว
- unique constraints ต้องบังคับระดับ database
- request ซ้ำจากปุ่มเดิมต้องไม่สร้าง ownership ซ้ำ

### Revoke Policy

Revoke ใช้เมื่อ code หลุด, พิมพ์ผิด, แจกผิดชุด, หรือพบความเสี่ยง fraud ต้องระบุ reason ทุกครั้ง และต้อง audit ว่าใคร revoke เมื่อไร ก่อน revoke สถานะคืออะไร และหลัง revoke เป็นอะไร

### Reissue Policy

Reissue ใช้เมื่อ QR เสีย, code ใช้งานไม่ได้, หรือ admin ยืนยันว่าผู้ถือการ์ดตัวจริงยังไม่ได้รับสิทธิ์ code เดิมต้องถูก disable ก่อนสร้าง code ใหม่ และต้องผูกกับ printed card เดิมโดยไม่เปลี่ยน serial หรือ edition

### Lost Code Handling

กรณี code หาย ต้องให้ support ตรวจสอบจาก serial, edition, masked code, card image, proof of possession หรือข้อมูลที่เหมาะสม ห้ามเปิดเผย full code จากระบบหลังสร้างแล้วถ้าไม่จำเป็น

### Damaged Card Handling

กรณีการ์ดเสียหายหรือ QR สแกนไม่ได้ ต้องรองรับ manual claim จาก serial หรือ code ที่พิมพ์บนการ์ด โดยมี flow support ที่บันทึก audit ครบ

### Admin-Assisted Claim

Admin-assisted claim ต้องใช้เฉพาะกรณีจำเป็น เช่น event support, ผู้ใช้มีปัญหา login, QR เสีย หรือ claim ผิดพลาด ต้องเห็นเฉพาะข้อมูลที่จำเป็น และต้องมี reason ทุกครั้ง

### Suspicious Claim Handling

ถ้าพบ claim attempt หลายครั้ง, pattern เดา code, IP/device ผิดปกติ หรือ claim card จำนวนมากผิดธรรมชาติ ระบบควร flag เป็น suspicious และอาจ lock claim ชั่วคราวเพื่อให้ support ตรวจสอบ

## 5. Admin Permission Model

### Super Admin

ทำได้ทุกอย่างใน Arena แต่ทุก critical action ต้อง audit:

- manage admin roles
- create/edit editions ก่อน release
- approve rarity/edition correction
- approve ownership correction
- freeze/unfreeze cards
- access full audit view
- resolve critical incidents

### Arena Admin

ดูแลระบบ Arena card operation:

- create card templates
- create editions
- generate printed cards
- generate claim codes
- export QR/CSV
- disable/reissue claim codes
- view claim/ownership status
- create campaign linkage ที่ไม่กระทบ ownership

Arena admin ไม่ควรแก้ immutable field หลัง release ได้เอง ต้องผ่าน super admin หรือ governance process

### Support Admin

ช่วยผู้ใช้และงาน event:

- search masked code/serial/card
- view claim status
- assist manual claim ตาม policy
- request reissue
- add support note
- escalate suspicious cases

Support admin ไม่ควรสร้าง edition, เปลี่ยน rarity, แก้ serial หรือแก้ ownership history โดยตรง

### Content Admin

ดูแลข้อมูลที่เป็น presentation/content:

- edit story/moment draft ก่อน release
- edit display copy
- update images หรือ visual metadata ที่ได้รับอนุญาต
- moderate public-facing content

Content admin ไม่ควรแตะ claim code, ownership, serial, rarity หรือ edition supply

### Readonly/Audit Admin

ใช้สำหรับตรวจสอบ:

- view audit logs
- view reports
- export audit summaries ตามสิทธิ์
- inspect suspicious activity

Readonly/audit admin ห้ามแก้ข้อมูลใด ๆ

## 6. Audit Log Requirements

ทุก action สำคัญต้อง audit:

- claim
- revoke
- reissue
- transfer
- rarity update
- edition creation
- printed card generation
- ownership correction
- admin override
- lock/unlock/freeze card
- archive card
- role/permission change

Audit log ควรเก็บ:

- actor
- actor role
- action
- target entity type
- target entity id
- before state
- after state
- timestamp
- reason
- request id
- ip/device ถ้าจำเป็น
- related support ticket หรือ incident id ถ้ามี

Audit log ต้องออกแบบให้ query ย้อนหลังได้ง่าย และไม่ควรถูกแก้หรือลบผ่าน admin UI ปกติ ถ้าต้อง redact ข้อมูลส่วนบุคคล ควรใช้การ redact แบบมี audit ไม่ใช่ลบทั้ง record

## 7. Historical Preservation Rules

Card history คือส่วนหนึ่งของคุณค่าระบบ การ์ดหนึ่งใบมีความหมายเพราะมันมีที่มา: โรงเรียน ฤดูกาล รุ่น เพื่อนร่วมทีม แมตช์ หรือช่วงเวลาที่เกิดขึ้นจริง

ห้ามลบ ownership history ง่าย แม้ user จะเลิกใช้ระบบหรือการ์ดถูก archive ประวัติความเป็นเจ้าของยังควรถูกเก็บในรูปแบบที่ตรวจสอบได้และเคารพ privacy

Rare/limited card ต้อง trace ได้ตั้งแต่ template, edition, printed card, claim code, first claim, first owner, transfer และสถานะปัจจุบัน

Season/edition เก่าคือประวัติศาสตร์ของ ecosystem ไม่ควรถูก overwrite เพื่อให้เข้ากับข้อมูลใหม่ ถ้าต้องแก้ข้อมูลเพราะผิดจริง ให้ใช้ correction event แยก ไม่ใช่ rewrite เงียบ ๆ

## 8. Rarity Integrity

Rarity ไม่ควรเปลี่ยนย้อนหลังหลัง release แล้ว ยกเว้นกรณี incident เช่นตั้งค่าผิดก่อนประกาศหรือข้อมูลผิดจาก source โดยต้องมี approval, audit และ public/internal note ตามความเหมาะสม

Limited edition ต้อง lock supply:

- มี `edition_size` ชัดเจน
- generated printed cards ต้องไม่เกิน edition size
- serial range ต้องไม่ซ้ำ
- generation batch ต้อง audit ได้
- reprint ต้องเป็น edition ใหม่หรือระบุ reissue policy ชัดเจน

Serial duplication ถือเป็น critical incident เพราะทำให้ความหมายของการ์ดทั้งชุดเสียหาย ต้อง freeze affected cards, หยุด claim/transfer ที่เกี่ยวข้อง, ตรวจ audit, แจ้ง support flow และออก correction plan

Printed quantity ต้อง audit ได้ว่าใครสร้าง เมื่อไร จำนวนเท่าไร จาก edition ใด และมี batch/export ใดถูกนำไปพิมพ์จริง

## 9. Trust & Safety

Trust & Safety ต้องปกป้องทั้งผู้ใช้ การ์ด และความหมายทางวัฒนธรรมของ Arena

Anti-fraud:

- rate limit claim attempts
- detect repeated invalid codes
- detect unusual claim velocity
- detect many claims from same device/IP pattern
- flag suspicious admin behavior

Anti-duplicate:

- unique constraints ที่ `claim_codes`, `printed_cards`, `user_cards`
- transaction-level locking ตอน claim
- idempotent claim response สำหรับ request ซ้ำ
- conflict handling ที่ไม่สร้าง ownership ซ้ำ

Suspicious activity detection:

- code guessing pattern
- claim from leaked QR batches
- admin export ที่ผิดปกติ
- repeated reissue requests
- ownership correction frequency สูงผิดปกติ

Rate limits ต้องมีทั้ง public claim endpoint และ admin operation ที่เสี่ยง เช่น export QR, reissue, manual claim assist

Support escalation ต้องมีระดับ เช่น normal support, fraud review, super admin approval และ incident response

Dispute handling ต้องระบุสถานะเช่น `disputed`, `frozen`, `under_review` เพื่อไม่ให้การ์ดถูก transfer หรือ marketplace listing ระหว่างตรวจสอบ

Account recovery มีความเสี่ยงสูง เพราะอาจนำไปสู่การยึดการ์ดของผู้อื่น ต้องยืนยันตัวตนและบันทึก audit ทุกครั้ง

## 10. Recovery Policies

### User Claim ผิด Account

ต้องมี recovery request พร้อมหลักฐาน และ support ตรวจสอบ claim event, device, timing, proof of possession และ profile linkage การย้าย ownership ต้องทำผ่าน ownership correction event ไม่ใช่แก้ `user_cards` เงียบ ๆ

### Account หาย

ต้องใช้ account recovery policy ที่ชัด เช่น email/phone verification, proof of card possession, support review และอาจ lock card ระหว่างตรวจสอบ

### QR เสีย

รองรับ manual input, masked code lookup, serial lookup และ support-assisted claim โดยไม่เปลี่ยน serial/edition ของ printed card

### Card ถูกขโมย

ต้องมี dispute flow ที่ freeze card ชั่วคราวได้ แต่ต้องระวังไม่ให้ระบบกลายเป็นเครื่องมือแย่ง ownership ต้องมีหลักฐานและการตรวจสอบก่อน correction ใด ๆ

### Admin Mistake

ถ้า admin generate/export/reissue ผิด ต้องเปิด incident record, freeze affected cards ถ้าจำเป็น, วิเคราะห์ audit, และแก้ผ่าน correction flow ที่ตรวจสอบย้อนหลังได้

### Duplicated Issuance

ถือเป็น critical incident ต้อง lock edition/batch ที่เกี่ยวข้อง, หยุด claim/transfer, ตรวจ serial, ตรวจ export batch, ระบุว่าใบใด valid/invalid และ archive หรือ reissue ผ่าน policy ชัดเจน

## 11. Marketplace Compatibility

ยังไม่ต้องสร้าง marketplace ตอนนี้ แต่ governance ต้องรองรับตั้งแต่ต้น เพราะ marketplace จะขยายผลจาก ownership ที่มีอยู่

สิ่งที่ต้องรองรับ:

- escrow
- transfer lock
- transaction history
- fraud investigation
- frozen cards
- disputed ownership
- listing eligibility
- seller/buyer audit trail

Marketplace ต้องมาหลัง ownership แข็งเท่านั้น ถ้า ownership history ไม่แน่น escrow จะไม่มีฐานให้เชื่อ ถ้า lock/freeze ไม่ชัด dispute จะหยุดธุรกรรมไม่ได้ ถ้า audit ไม่ครบ fraud investigation จะทำไม่ได้

การ์ดที่อยู่ในสถานะ `locked`, `frozen`, `disputed`, `archived` หรือ `under_review` ไม่ควรถูก list, trade หรือ transfer ได้

## 12. Cultural Preservation

Arena ไม่ใช่แค่ collectible system แต่คือ archive ของฟุตบอลนักเรียนไทย การ์ดแต่ละใบเป็นตัวแทนของโรงเรียน รุ่น สนาม ความทรงจำ และช่วงเวลาที่คนจำนวนมากอาจไม่มีระบบอื่นช่วยบันทึกไว้

สิ่งที่ควรถูก preserve อย่างเคารพ:

- season เก่า
- รุ่นเก่า
- retired cards
- legendary school moments
- final match moments
- school pride context
- player/student context ที่เหมาะสม

การ preserve ไม่ได้แปลว่าทุกอย่างต้องขายได้หรือเอาไป trade ได้ บางการ์ดอาจมีคุณค่าทางประวัติศาสตร์มากกว่ามูลค่าตลาด และระบบควรเคารพความหมายนี้

Content เก่าไม่ควรถูก rewrite ให้ดูทันสมัยจนเสียบริบท ถ้าต้องเพิ่มคำอธิบายใหม่ ให้เพิ่มเป็น annotation หรือ updated note แทนการลบความหมายเดิม

## 13. Red Line Rules

สิ่งที่ห้ามทำ:

- ห้ามเพิ่ม limited แบบเงียบ ๆ
- ห้ามแก้ serial ย้อนหลัง
- ห้ามลบ ownership history
- ห้าม overwrite claim records
- ห้ามใช้ admin tool แบบไม่มี audit
- ห้าม monetize จนทำลาย trust
- ห้ามใช้ vote ranking เป็นตัวกำหนดมูลค่าการ์ด
- ห้ามสร้าง marketplace ก่อน ownership/lock/escrow พร้อม
- ห้ามให้ support admin เห็นหรือ export sensitive claim code เกินจำเป็น
- ห้ามแก้ rarity หลัง release โดยไม่มี incident process
- ห้ามลบ audit log เพื่อแก้ภาพลักษณ์ของระบบ
- ห้ามเปลี่ยน first owner แบบเงียบ ๆ

Red line เหล่านี้คือขอบเขตศักดิ์สิทธิ์ของ Arena ถ้าข้ามแล้วระบบอาจยังทำงานทางเทคนิคได้ แต่ความเชื่อใจจะหาย

## 14. Governance Risks

ถ้า governance อ่อน ความเสี่ยงจะกระทบทั้ง product และวัฒนธรรม:

- trust collapse
- rarity collapse
- collector exit
- support overload
- black market abuse
- marketplace failure
- culture degradation

รายละเอียด:

- Trust collapse: ผู้ใช้ไม่เชื่อว่า ownership, serial หรือ rarity เป็นของจริง
- Rarity collapse: limited ไม่ limited จริง ทำให้การ์ดหายคุณค่า
- Collector exit: คนสะสมไม่อยากตามเก็บ เพราะระบบแก้ประวัติได้ง่าย
- Support overload: ไม่มี audit ทำให้แก้ปัญหาหน้างานไม่ได้
- Black market abuse: QR/code หลุดหรือ claim ซ้ำโดยตรวจไม่ได้
- Marketplace failure: ซื้อขายไม่ได้เพราะ ownership และ dispute ไม่น่าเชื่อถือ
- Culture degradation: Arena กลายเป็นระบบเก็งของ แทนที่จะเป็น archive ของฟุตบอลนักเรียน

## 15. Next Step Recommendation

สิ่งที่ควรทำต่อหลัง governance เสร็จ:

1. Approve governance model
2. Lock immutable field rules
3. Design migration plan
4. Design Claim wireframes
5. Design Collection UX
6. Design admin operation flow
7. Then begin schema implementation carefully

ก่อนเริ่ม implementation ควรมี decision record อย่างน้อยสำหรับ immutable fields, admin roles, claim correction policy, rarity policy และ audit log policy เพื่อให้ทีมไม่ต้องตัดสินใจเฉพาะหน้าระหว่างเขียนระบบจริง

## Closing Summary

Governance สำคัญต่อศักดิ์ศรีของ Arena เพราะ Arena กำลังบันทึกสิ่งที่คนจำนวนมากถือว่าเป็นช่วงชีวิตจริง ไม่ใช่แค่ item ใน database ถ้าข้อมูลแก้ย้อนหลังได้ง่าย การ์ด limited ไม่ศักดิ์สิทธิ์ ownership history หาย หรือ admin override ไม่มี audit ระบบจะทำร้ายความหมายที่มันตั้งใจจะรักษา

Jaturamit Arena ต้องถูกสร้างแบบระยะยาว ไม่ใช่รีบเพิ่ม feature เพราะ feature อย่าง marketplace, trade, coins หรือ squad builder จะมีค่าก็ต่อเมื่อผู้ใช้เชื่อก่อนว่า “การ์ดใบนี้มีประวัติจริง เป็นของจริง และระบบดูแลมันด้วยความเคารพ”
