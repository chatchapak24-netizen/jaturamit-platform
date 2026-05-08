# Jaturamit Arena Refactor Plan

## Purpose

เอกสารนี้ต่อจาก `docs/arena-product-bible.md` เพื่อวางแผน refactor Arena Vote MVP ปัจจุบันให้กลับเข้าที่ โดยไม่ลบของเดิม ไม่ทำ production flow พัง และไม่ขยาย vote ให้กลายเป็นแกนผิดของ Arena

เป้าหมายหลัก:

- เปลี่ยน `/arena` ให้เป็น landing ของ Arena Card Platform
- ย้าย vote MVP ไปเป็น campaign feature ที่ `/arena/vote`
- ย้าย vote ranking ไปที่ `/arena/vote/ranking`
- แยกคำว่า Arena, Card, Claim, Collection, Vote Ranking, Team Ranking และ Collector Ranking ให้ชัด
- เตรียมทางให้ Claim System เป็น feature หลักถัดไป

## Current State

ระบบปัจจุบันมี Arena Vote MVP แล้ว:

- `/arena` แสดงหน้าโหวต
- `/arena/ranking` แสดง ranking จาก vote
- `components/arena/ArenaVotePanel.tsx` ดูแล vote UI
- `lib/arena.ts` fetch contest/ranking
- `supabase/migrations/20260508_arena_ranking_mvp.sql` สร้างตารางและ RPC สำหรับ vote MVP

สิ่งนี้ใช้งานเป็น MVP ได้ แต่ชื่อ route และ domain ยังสื่อว่า Arena คือ vote system ซึ่งขัดกับ Product Bible

## Target State

Route เป้าหมายระยะใกล้:

- `/arena`
  - landing ของ Arena Card Platform
  - เล่า vision, card platform, claim, collection, campaign
  - มี CTA ไป claim และ collection เมื่อพร้อม

- `/arena/vote`
  - ย้าย UI vote เดิมมาไว้ที่นี่
  - สื่อชัดว่าเป็น campaign vote

- `/arena/vote/ranking`
  - ย้าย ranking เดิมมาไว้ที่นี่
  - label ต้องเป็น Vote Ranking

- `/arena/claim`
  - route เปล่าหรือ placeholder ได้ในช่วงแรก
  - ใน Phase 2 จะเป็น core flow

- `/arena/collection`
  - route เปล่าหรือ placeholder ได้ในช่วงแรก
  - ใน Phase 3 จะเป็น collection ของ user

## Non-Goals

รอบ refactor นี้ยังไม่ทำ:

- marketplace
- trade
- coins
- rewards
- squad builder
- full admin generator
- real claim code execution
- ownership transfer
- card economy

## Migration Strategy

### Step 1: Freeze Vote MVP Behavior

ไม่เพิ่ม vote feature ใหม่ ไม่เพิ่ม anti-cheat ใหม่ ไม่เพิ่ม marketplace-like behavior และไม่เอา vote ranking ไปผูกกับ value ของการ์ด

สิ่งที่ทำได้:

- เก็บ vote MVP ไว้ให้ใช้งานได้
- เปลี่ยน copy และ label ให้ชัดขึ้นว่าเป็น vote campaign
- ย้าย route โดยใช้ redirect ชั่วคราวจาก route เดิม

### Step 2: Introduce Arena Landing

สร้าง `/arena` ใหม่เป็น landing ของ Card Platform

เนื้อหาควรมี:

- Jaturamit Arena คือมัลติเวิร์สของฟุตบอลขาสั้น
- Card Claim
- Collection
- School Pride
- Campaigns
- Coming soon สำหรับ marketplace/trade แบบไม่ชวนเข้าใจว่าพร้อมแล้ว

CTA ที่ควรมี:

- Claim Card
- View Collection
- Join Vote Campaign

ถ้า Claim/Collection ยังไม่พร้อม ปุ่มควรเป็น disabled/coming soon หรือไป placeholder ที่พูดตรง ๆ

### Step 3: Move Vote UI

ย้ายของเดิม:

- จาก `/arena` ไป `/arena/vote`
- จาก `/arena/ranking` ไป `/arena/vote/ranking`

แนวทางปลอดภัย:

- สร้าง route ใหม่ก่อน
- ย้าย component เดิมไปใช้ route ใหม่
- route เดิม redirect:
  - `/arena/ranking` -> `/arena/vote/ranking`
- `/arena` ไม่ redirect ไป vote อีกต่อไป แต่เป็น landing

### Step 4: Rename User-Facing Language

คำที่ควรใช้:

- Arena Vote
- Vote Campaign
- Vote Ranking
- Campaign Ranking

คำที่ไม่ควรใช้กับ vote:

- Team Ranking
- Official Ranking
- Card Value
- Player Value
- Collector Ranking

## Database Naming Recommendation

Migration เดิมยังไม่ควรแก้ถ้าถูก apply แล้ว แต่ใน architecture ถัดไปควรวางชื่อใหม่ให้ชัดกว่าเดิม

ชื่อปัจจุบัน:

- `arena_contests`
- `arena_entries`
- `arena_votes`
- `get_arena_ranking`
- `cast_arena_vote`

ชื่อเป้าหมายใน campaign domain:

- `arena_vote_events`
- `arena_vote_entries`
- `arena_vote_records`
- `get_arena_vote_ranking`
- `cast_arena_vote`

หมายเหตุ:

- ถ้า migration เดิมยังไม่เคย apply สามารถพิจารณา rename ใน migration ได้
- ถ้า apply แล้ว ให้สร้าง migration ใหม่สำหรับ rename หรือ compatibility view/function
- ห้าม rename แบบทำให้ production data หาย

## Claim System First Cut

หลัง refactor route แล้ว feature หลักถัดไปควรเป็น Claim System

Minimum viable claim domain:

- `card_templates`
- `card_editions`
- `claim_codes`
- `user_cards`
- `card_ownership_history`
- `admin_audit_logs`

Minimum claim flow:

1. ผู้ใช้สแกน QR
2. หน้า `/arena/claim?code=...` เปิดขึ้น
3. ระบบแสดง preview การ์ดก่อนเคลม
4. ผู้ใช้ยืนยันการเคลม
5. ระบบกัน duplicate claim
6. ระบบบันทึก audit log
7. ระบบแสดง claim success เป็นภาษาไทย
8. ผู้ใช้กดดู Collection ได้ทันที

## Route Compatibility Plan

เพื่อไม่ให้ link เดิมพัง:

- `/arena/ranking`
  - redirect ไป `/arena/vote/ranking`

- `/arena`
  - เปลี่ยนเป็น landing
  - มี link ไป `/arena/vote`

ถ้ามี external QR หรือ poster ที่ชี้ `/arena` อยู่แล้ว landing จะยังพาคนไป vote campaign ได้ แต่ไม่สื่อผิดว่า Arena ทั้งหมดคือ vote

## UX Copy Direction

### Arena Landing

ควรใช้ภาษา:

- "บันทึกช่วงเวลาฟุตบอลนักเรียนที่ย้อนกลับมาไม่ได้"
- "เคลมการ์ดจริงเข้าสู่ Collection"
- "เก็บความทรงจำของเสื้อโรงเรียน รุ่นพี่ รุ่นน้อง และสนามวันนั้น"

ไม่ควรใช้ภาษา:

- "ซื้อขายการ์ด"
- "ลงทุน"
- "ราคาการ์ด"
- "ทีมอันดับหนึ่งอย่างเป็นทางการ" สำหรับ vote

### Vote Campaign

ควรใช้ภาษา:

- "แคมเปญโหวต"
- "แรงเชียร์"
- "Vote Ranking"
- "อันดับจากเสียงโหวต"

ต้องระบุ:

- ไม่ใช่ ranking จากผลการแข่งขันจริง
- ไม่ใช่ ranking อย่างเป็นทางการของทีม

## Risk Control

ความเสี่ยงและแนวทางคุม:

- ผู้ใช้สับสนว่า Arena คือโหวต
  - แก้ด้วย `/arena` landing และ route `/arena/vote`

- vote ranking ถูกเข้าใจว่าเป็น ranking ทีมจริง
  - แก้ด้วย label "Vote Ranking" ทุกจุด

- ขยาย economy เร็วเกินไป
  - freeze marketplace/trade/coins จนกว่า ownership แข็ง

- schema vote ปัจจุบันกลายเป็น base ของ card system
  - แยก Card Domain schema ใหม่ ห้ามต่อยอด card จาก vote tables

- Claim duplicate
  - ต้องแก้ใน Claim System ด้วย unique constraints, transaction, audit log

## Implementation Checklist

เมื่อเริ่มลงมือ refactor จริง:

1. สร้าง `/arena/vote`
2. สร้าง `/arena/vote/ranking`
3. ย้าย vote UI เดิมไป route ใหม่
4. สร้าง `/arena` landing
5. redirect `/arena/ranking` ไป `/arena/vote/ranking`
6. ปรับ copy ทุกจุดให้เป็น Vote Campaign / Vote Ranking
7. รัน `npm.cmd run lint`
8. รัน `npm.cmd run build`
9. ตรวจว่า warning ใหม่ต้องเป็น 0

## Decision

Arena Vote MVP เก็บไว้ได้ แต่ต้องถูกลดบทบาทจาก "Arena core" เป็น "Campaign feature"

Arena core ถัดไปไม่ใช่ vote แต่คือ:

1. Claim
2. Collection
3. Card Detail
4. Admin Card / Claim Code Generator

นี่คือเส้นทางที่จะทำให้ Jaturamit Arena เป็นมัลติเวิร์สของฟุตบอลขาสั้น ไม่ใช่แค่หน้าโหวตที่เปลี่ยนชื่อให้ดูใหญ่ขึ้น
