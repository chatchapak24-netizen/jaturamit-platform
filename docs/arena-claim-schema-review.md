# Jaturamit Arena Claim Schema Review

เอกสารนี้เป็น schema review/specification ก่อนสร้าง migration จริงของ Claim System V1 เท่านั้น ยังไม่ใช่ migration และยังไม่ควรถือเป็น final database contract จนกว่าจะ approve decision สำคัญท้ายเอกสาร

## 1. Claim System V1 Tables

ตารางขั้นต่ำที่ควรมีใน Claim System V1:

- `arena_profiles`
- `card_templates`
- `card_editions`
- `printed_cards`
- `claim_codes`
- `user_cards`
- `card_claim_events`
- `card_ownership_history`
- `arena_audit_logs`

ตารางเหล่านี้ต้องแยกจาก Arena Vote MVP ปัจจุบันอย่างชัดเจน ห้ามต่อยอด card/claim/collection จาก `arena_contests`, `arena_entries`, `arena_votes` เพราะตารางเหล่านั้นเป็น campaign/vote domain ไม่ใช่ card ownership domain

## 2. Table Responsibilities

| Table | Purpose | Source of Truth | User Read | Admin Only | RPC Only |
| --- | --- | --- | --- | --- | --- |
| `arena_profiles` | ตัวตนผู้สะสมใน Arena | profile identity | own/public-safe profile | admin manage/review | create/update บาง flow |
| `card_templates` | แบบแม่ของการ์ด | template definition | public read เมื่อ active | admin write | no |
| `card_editions` | ชุด/ฤดูกาล/rarity/supply | edition truth | public read เมื่อ released | admin write | no |
| `printed_cards` | การ์ดจริงแต่ละใบ | physical/digital card truth | public-safe detail หลัง release | admin write | claim/update ผ่าน RPC/admin only |
| `claim_codes` | กุญแจ claim | claim credential truth | no direct public read | admin limited read | yes |
| `user_cards` | ownership ปัจจุบัน | current ownership | owner read, public-safe if shared | admin read/correct | yes for claim/transfer |
| `card_claim_events` | log claim success/failure | claim event trail | own limited history maybe | admin/fraud read | insert via RPC |
| `card_ownership_history` | ประวัติความเป็นเจ้าของ | ownership history | limited public/owner view | admin/fraud read | insert via RPC |
| `arena_audit_logs` | audit admin/system actions | governance trail | no public read | admin/audit read | insert by RPC/admin actions |

## 3. Recommended Fields

### `arena_profiles`

Purpose: ตัวตนของผู้ใช้ใน Arena แยกจาก auth user โดยตรง เพื่อให้รองรับ collector identity, public profile และอนาคตของ marketplace/trade

Fields:

- `id uuid primary key`
- `auth_user_id uuid unique null`
- `display_name text not null`
- `handle text unique null`
- `avatar_url text null`
- `school_affinity text null`
- `profile_status text not null default 'active'`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

Source of truth: profile identity ใน Arena

User read: own profile และ public-safe fields ของ profile ที่เปิดเผย

Admin-only: `auth_user_id`, moderation/status fields

### `card_templates`

Purpose: แบบแม่ของการ์ด เช่น player card, school moment card, special edition card

Fields:

- `id uuid primary key`
- `slug text not null unique`
- `name text not null`
- `description text null`
- `template_type text not null`
- `visual_theme text null`
- `schema_version integer not null default 1`
- `is_active boolean not null default true`
- `created_by uuid null`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

Source of truth: template definition

Mutable: name, description, visual/theme fields ก่อนใช้งานจริง

Conditionally mutable: `is_active`

### `card_editions`

Purpose: ชุดการ์ดที่ออกจริง เช่น Jaturamit Ratchaburi 2026, school set, final day set

Fields:

- `id uuid primary key`
- `template_id uuid not null references card_templates(id)`
- `season_id uuid null`
- `tournament_id uuid null`
- `slug text not null unique`
- `name text not null`
- `description text null`
- `rarity text not null`
- `edition_size integer null`
- `release_status text not null default 'draft'`
- `released_at timestamptz null`
- `locked_at timestamptz null`
- `created_by uuid null`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

Source of truth: edition, rarity, supply, release context

Immutable after release: `template_id`, `rarity`, `edition_size`, released issue context

Admin-only write: all fields

User read: released editions only

### `printed_cards`

Purpose: การ์ดจริง 1 ใบที่มี serial และบริบทเฉพาะ เป็นหัวใจของ Claim System

Fields:

- `id uuid primary key`
- `edition_id uuid not null references card_editions(id)`
- `player_id uuid null`
- `team_id uuid null`
- `season_id uuid null`
- `jersey_number text null`
- `position text null`
- `serial_number integer not null`
- `serial_label text not null`
- `print_status text not null default 'draft'`
- `claim_status text not null default 'unissued'`
- `story text null`
- `created_context jsonb null`
- `printed_at timestamptz null`
- `first_claimed_at timestamptz null`
- `first_owner_profile_id uuid null references arena_profiles(id)`
- `created_by uuid null`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

Source of truth: physical/digital card truth

Immutable after print/release: `id`, `edition_id`, `player_id`, `team_id`, `season_id`, `jersey_number`, `position`, `serial_number`, `serial_label`, original rarity via edition, `created_context`, `printed_at`, `first_claimed_at`, `first_owner_profile_id`

User read: public-safe card detail after release/claim

Admin-only write: generation and correction only

RPC-only: claim status transition during claim

### `claim_codes`

Purpose: กุญแจ claim การ์ด ไม่ใช่ ownership และไม่ควรถูก public อ่านตรง

Fields:

- `id uuid primary key`
- `printed_card_id uuid not null references printed_cards(id)`
- `code_hash text not null`
- `code_hint text null`
- `status text not null default 'active'`
- `expires_at timestamptz null`
- `claimed_at timestamptz null`
- `claimed_by_profile_id uuid null references arena_profiles(id)`
- `disabled_at timestamptz null`
- `disabled_reason text null`
- `reissued_from_claim_code_id uuid null references claim_codes(id)`
- `created_by uuid null`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

Source of truth: claim credential state

Immutable: `printed_card_id`, `code_hash`, `created_at`

Conditionally mutable: `status`, `claimed_at`, `claimed_by_profile_id`, `disabled_at`, `disabled_reason`

Admin-only: all direct reads/writes, with masked code only in UI

RPC-only: public claim lookup and claim mutation

### `user_cards`

Purpose: ownership ปัจจุบันของการ์ดใน Collection

Fields:

- `id uuid primary key`
- `profile_id uuid not null references arena_profiles(id)`
- `printed_card_id uuid not null references printed_cards(id)`
- `ownership_status text not null default 'owned'`
- `acquired_via text not null`
- `acquired_at timestamptz not null`
- `locked_until timestamptz null`
- `lock_reason text null`
- `visibility text not null default 'private'`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

Source of truth: current ownership

User read: owner reads all own user_cards; public reads only shared/public-safe cards

Admin-only: correction/lock/archive

RPC-only: insert on claim, future transfer/trade mutations

### `card_claim_events`

Purpose: append-only log ของ claim attempt ทั้ง success และ failure

Fields:

- `id uuid primary key`
- `claim_code_id uuid null references claim_codes(id)`
- `printed_card_id uuid null references printed_cards(id)`
- `profile_id uuid null references arena_profiles(id)`
- `event_type text not null`
- `result text not null`
- `failure_reason text null`
- `request_fingerprint text null`
- `ip_hash text null`
- `user_agent text null`
- `metadata jsonb null`
- `created_at timestamptz not null`

Source of truth: claim event trail

Immutable: all event fields after insert

User read: not V1 public; possibly own limited history later

Admin-only: fraud/support review

RPC-only: insert by claim RPC

### `card_ownership_history`

Purpose: append-only history ของ ownership และสถานะสำคัญของการ์ด

Fields:

- `id uuid primary key`
- `printed_card_id uuid not null references printed_cards(id)`
- `from_profile_id uuid null references arena_profiles(id)`
- `to_profile_id uuid null references arena_profiles(id)`
- `event_type text not null`
- `reason text null`
- `source text not null`
- `related_entity_type text null`
- `related_entity_id uuid null`
- `created_by uuid null`
- `created_at timestamptz not null`

Source of truth: ownership history

Immutable: all fields after insert

User read: limited view only if product wants provenance display

Admin-only: full read

RPC-only: insert by claim/transfer/correction flows

### `arena_audit_logs`

Purpose: governance log สำหรับ admin/system action สำคัญ

Fields:

- `id uuid primary key`
- `actor_auth_user_id uuid null`
- `actor_profile_id uuid null references arena_profiles(id)`
- `actor_role text null`
- `action text not null`
- `entity_type text not null`
- `entity_id uuid null`
- `before_data jsonb null`
- `after_data jsonb null`
- `metadata jsonb null`
- `reason text null`
- `request_id text null`
- `ip_hash text null`
- `user_agent text null`
- `created_at timestamptz not null`

Source of truth: audit/governance trail

Immutable: all fields after insert

User read: no

Admin-only: readonly/audit admin and super admin

RPC/admin-only: insert from privileged actions

## 4. Immutable Fields

Recommended immutable rules:

- `printed_cards.id`
- `printed_cards.edition_id`
- `printed_cards.serial_number`
- `printed_cards.serial_label`
- `printed_cards.player_id`
- `printed_cards.team_id`
- `printed_cards.season_id`
- `printed_cards.jersey_number`
- `printed_cards.position`
- `printed_cards.created_context`
- `printed_cards.printed_at`
- `printed_cards.first_claimed_at`
- `printed_cards.first_owner_profile_id`
- `card_editions.rarity` after release
- `card_editions.edition_size` after release/lock
- `claim_codes.code_hash`
- `claim_codes.printed_card_id`
- all fields in `card_claim_events` after insert
- all fields in `card_ownership_history` after insert
- all fields in `arena_audit_logs` after insert

ถ้าต้องแก้ immutable field เพราะ incident จริง ให้ทำผ่าน correction migration/admin RPC ที่สร้าง audit log และ ownership/history event แยก ไม่ใช่ update เงียบ ๆ

## 5. Unique Constraints

Recommended constraints:

- `arena_profiles.auth_user_id unique where auth_user_id is not null`
- `arena_profiles.handle unique where handle is not null`
- `card_templates.slug unique`
- `card_editions.slug unique`
- `printed_cards (edition_id, serial_number) unique`
- `printed_cards (edition_id, serial_label) unique`
- `claim_codes.code_hash unique`
- `claim_codes (printed_card_id) unique where status in ('active', 'claimed')`
- `user_cards.printed_card_id unique where ownership_status in ('owned', 'locked', 'transferable', 'disputed', 'frozen')`
- optional: `user_cards (profile_id, printed_card_id) unique`

Critical note: duplicate serial หรือ duplicate active ownership ต้องถือเป็น critical incident

## 6. Indexes

Recommended indexes:

- `arena_profiles_auth_user_idx` on `arena_profiles(auth_user_id)`
- `arena_profiles_handle_idx` on `arena_profiles(handle)`
- `card_templates_active_idx` on `card_templates(is_active, template_type)`
- `card_editions_status_idx` on `card_editions(release_status, released_at)`
- `card_editions_template_idx` on `card_editions(template_id)`
- `printed_cards_edition_serial_idx` on `printed_cards(edition_id, serial_number)`
- `printed_cards_player_idx` on `printed_cards(player_id)`
- `printed_cards_team_season_idx` on `printed_cards(team_id, season_id)`
- `printed_cards_claim_status_idx` on `printed_cards(claim_status)`
- `claim_codes_hash_idx` on `claim_codes(code_hash)`
- `claim_codes_printed_card_idx` on `claim_codes(printed_card_id)`
- `claim_codes_status_idx` on `claim_codes(status, expires_at)`
- `user_cards_profile_idx` on `user_cards(profile_id, ownership_status)`
- `user_cards_printed_card_idx` on `user_cards(printed_card_id)`
- `card_claim_events_code_idx` on `card_claim_events(claim_code_id, created_at desc)`
- `card_claim_events_profile_idx` on `card_claim_events(profile_id, created_at desc)`
- `card_claim_events_fingerprint_idx` on `card_claim_events(request_fingerprint, created_at desc)`
- `card_ownership_history_card_idx` on `card_ownership_history(printed_card_id, created_at desc)`
- `arena_audit_logs_entity_idx` on `arena_audit_logs(entity_type, entity_id, created_at desc)`
- `arena_audit_logs_actor_idx` on `arena_audit_logs(actor_auth_user_id, created_at desc)`

## 7. RLS Policy Draft

General rule: เปิด RLS ทุกตาราง และให้ public ทำงานผ่าน RPC เท่านั้นในจุด sensitive

### `arena_profiles`

- authenticated users can select own profile
- public/authenticated can select public-safe profile fields only if profile is active and public profile is enabled
- authenticated users can update own mutable profile fields
- active admins can read/manage profiles

### `card_templates`

- anon/authenticated can select active templates used by released editions
- active admins can insert/update/manage

### `card_editions`

- anon/authenticated can select released editions
- active admins can insert/update/manage
- updates after release should be blocked by trigger or guarded RPC for locked fields

### `printed_cards`

- anon/authenticated can select public-safe released card data
- owners can select fuller detail for their owned cards
- active admins can read/manage
- public must not update directly

### `claim_codes`

- no anon/authenticated direct select
- no direct public insert/update/delete
- active admins can read masked/operational data through admin views or RPC
- claim must use `claim_card` RPC

### `user_cards`

- authenticated users can select own cards
- public can select cards marked public/shared with safe joins
- no direct public insert/update
- active admins can read/manage through admin tools
- claim/transfer mutations through RPC only

### `card_claim_events`

- no public direct read in V1
- optional owner limited read later
- active admins/support/fraud can read
- insert through claim RPC only

### `card_ownership_history`

- owner/public limited read can be considered for provenance
- full read admin-only
- insert through RPC/admin correction only
- no update/delete for normal roles

### `arena_audit_logs`

- admin/audit role read only
- insert by privileged RPC/admin functions
- no update/delete through application roles

## 8. Required RPCs

### `claim_card`

Minimum signature draft:

```sql
claim_card(
  p_claim_code text,
  p_request_fingerprint text default null,
  p_user_agent text default null
)
```

Expected behavior:

1. Require authenticated user or approved guest pre-claim strategy
2. Create/find `arena_profiles` for `auth.uid()`
3. Hash normalized `p_claim_code`
4. Lock matching `claim_codes` row with `for update`
5. Validate status, expiry, printed card status, edition release state
6. Lock matching `printed_cards` row
7. Prevent existing active `user_cards` for same printed card
8. Insert `user_cards`
9. Update `claim_codes` to claimed
10. Update `printed_cards.claim_status`, `first_claimed_at`, `first_owner_profile_id`
11. Insert `card_claim_events`
12. Insert `card_ownership_history`
13. Insert `arena_audit_logs` or system audit entry
14. Return Thai user-safe message and card identifier

Important: this RPC must be one transaction and must be idempotent enough for double-click/retry behavior

### `preview_claim_card`

Optional but recommended:

- Accept claim code
- Return safe preview only: player/team/edition/serial/rarity display
- Must not reveal whether nearby codes exist
- Must not expose code hash or sensitive claim code fields

### Admin RPCs for V1

- `admin_generate_printed_cards`
- `admin_generate_claim_codes`
- `admin_disable_claim_code`
- `admin_reissue_claim_code`
- `admin_manual_claim_assist`
- `admin_lock_user_card`
- `admin_archive_printed_card`

Admin RPCs should require active admin role checks and write `arena_audit_logs`

## 9. Audit Log Strategy

Use two layers:

1. Domain events: `card_claim_events` and `card_ownership_history`
2. Governance/admin audit: `arena_audit_logs`

Claim success should write:

- one `card_claim_events` row
- one `card_ownership_history` row with `event_type = 'first_claim'`
- one `arena_audit_logs` row with `action = 'claim_card'` or system action

Claim failure should write:

- `card_claim_events` with failure reason when safe
- optionally audit only for suspicious/fraud thresholds

Admin actions must always audit:

- generate printed cards
- generate/export claim codes
- disable/reissue code
- manual claim assist
- ownership correction
- rarity/edition correction
- lock/freeze/archive

Audit logs should be append-only. Redaction, if needed, should be done by adding a redaction event or masking sensitive JSON fields, not deleting the original trail.

## 10. Ownership History Strategy

`user_cards` answers: who owns this card now?

`card_ownership_history` answers: how did this card get here?

V1 event types:

- `first_claim`
- `admin_correction`
- `locked`
- `unlocked`
- `archived`
- `reissued`
- `disputed`
- `frozen`

Future event types:

- `marketplace_sale`
- `trade_transfer`
- `gift_transfer`
- `escrow_lock`
- `escrow_release`

Rules:

- insert-only history
- never delete normal history
- current ownership changes must create history
- first owner must remain traceable even after future transfer
- archive/freeze/dispute should not erase current or historical records

## 11. Migration Order

Recommended migration order:

1. Ensure prerequisites: `pgcrypto`, `set_updated_at()` availability, admin role helper pattern
2. Create enum/check constraints or text checks for statuses
3. Create `arena_profiles`
4. Create `card_templates`
5. Create `card_editions`
6. Create `printed_cards`
7. Create `claim_codes`
8. Create `user_cards`
9. Create `card_claim_events`
10. Create `card_ownership_history`
11. Create `arena_audit_logs`
12. Add unique constraints and indexes
13. Enable RLS
14. Add RLS policies
15. Add helper/admin-check functions if needed
16. Add `preview_claim_card` RPC
17. Add `claim_card` RPC
18. Add admin RPCs later or in a separate migration
19. Seed no real cards in V1 unless explicitly approved

Recommendation: split migration into foundation schema + public claim RPC + admin generator later if review risk feels high

## 12. Rollback Concerns

Rollback is sensitive because claim/ownership data is historical

Before production claims:

- rollback can drop V1 tables if no real data exists
- still document that vote MVP remains separate

After production claims:

- do not drop claim tables casually
- rollback should disable RPC/routes, not delete data
- preserve `printed_cards`, `claim_codes`, `user_cards`, `card_claim_events`, `card_ownership_history`, `arena_audit_logs`
- data correction should be forward-only through new migration

Specific concerns:

- dropping `claim_codes` loses claim credential trail
- dropping `user_cards` loses current ownership
- dropping `card_ownership_history` breaks trust permanently
- changing unique constraints after real claims may reveal duplicates that need incident handling
- changing rarity/edition schema after release risks limited integrity

## 13. Risks If Schema Is Wrong

Major risks:

- duplicate ownership
- duplicate serials
- code guessing or leaked QR abuse
- inability to prove first owner
- limited rarity collapse
- support cannot resolve disputes
- marketplace/trade blocked later
- admin override without accountability
- public data leakage from claim codes
- irreversible trust damage

Most dangerous schema mistakes:

- using serial number as claim code
- storing plaintext claim codes without need
- allowing direct public insert into `user_cards`
- not enforcing unique active owner per printed card
- not making claim one transaction
- not recording failed/suspicious claim attempts
- not separating `user_cards` from `card_ownership_history`
- making `printed_cards` too mutable after release
- letting admin edit rarity/edition supply without audit

## 14. Recommended V1 Schema Summary

Recommended source-of-truth layout:

- Profile truth: `arena_profiles`
- Template truth: `card_templates`
- Edition/rarity/supply truth: `card_editions`
- Card identity truth: `printed_cards`
- Claim credential truth: `claim_codes`
- Current ownership truth: `user_cards`
- Claim event truth: `card_claim_events`
- Ownership history truth: `card_ownership_history`
- Governance truth: `arena_audit_logs`

Recommended access model:

- Public users read released, safe card/edition/template data
- Authenticated owners read their own collection
- Claim mutation happens only through `claim_card`
- Sensitive claim code data is admin-only and preferably masked
- History/audit tables are append-only and admin/fraud/support oriented

Recommended design posture:

- favor database constraints over UI-only checks
- use RPC transactions for claim
- keep vote/campaign schema separate
- do not seed real claim cards until generation/admin flow is approved

## 15. Approved V1 Decisions

These decisions are approved for Claim System V1 and should be treated as migration requirements:

1. Real claim requires login.
2. Public preview before login is allowed only for non-sensitive card data.
3. Claim code uses a random opaque code.
4. Claim code is stored as a hash in the database.
5. Serial number must never be used as a claim code.
6. Rarity and status fields use `text` with check constraints in V1.
7. `card_editions` becomes locked when `status = 'published'`.
8. `printed_cards` becomes locked when `status in ('printed', 'claimable')`.
9. V1 reuses existing `admin_users`; do not create separate Arena roles yet.
10. Audit log is append-only.
11. Redaction is allowed only for personal data.
12. Historical events must not be deleted during redaction.

Implications:

- `claim_card` must reject unauthenticated users.
- `preview_claim_card` may be callable before login, but it must return only safe fields and must not expose claim code state too precisely.
- `claim_codes` should never store plaintext codes after generation/export. The app should only compare normalized input through a hash.
- Locking rules must be enforced at the database layer, not only in admin UI.
- Admin checks should follow the existing `admin_users` active-user pattern used elsewhere in the platform.
- Audit and history tables should be insert-only for application roles.

## 16. Decisions Still Needed Before Migration

These decisions remain open before writing the real migration:

1. Exact claim code format: length, alphabet, grouping, normalization, and QR URL shape.
2. Hash details: whether to use SHA-256 via `pgcrypto.digest`, add a server-side pepper, or hash outside DB.
3. Public preview field list: exact allowed fields for `preview_claim_card`.
4. Exact rarity values for V1 check constraint, for example `common`, `rare`, `epic`, `legendary`, `limited`.
5. Exact status values for `card_editions`, `printed_cards`, `claim_codes`, and `user_cards`.
6. Whether first owner is public, owner-only, or admin-only in V1.
7. Whether `user_cards.visibility` ships in V1 or waits for Collection UX.
8. Whether admin generator tables/RPCs ship in the same migration or a later migration.
9. Whether admin audit redaction needs a dedicated RPC in V1.
10. Whether to create public-safe views for card preview/collection instead of direct table policies.

## 17. Migration Readiness Checklist

Before creating the migration, confirm:

- [ ] Exact check-constraint values are approved for all status fields.
- [ ] Exact rarity values are approved.
- [ ] Claim code format and QR URL format are approved.
- [ ] Hash strategy is approved.
- [ ] Public preview field whitelist is approved.
- [ ] `claim_card` requires login and has Thai success/error messages.
- [ ] `preview_claim_card` does not leak sensitive claim state.
- [ ] Unique constraints cover duplicate serial, duplicate active claim code, and duplicate active ownership.
- [ ] `card_editions` lock rule is enforceable when status becomes `published`.
- [ ] `printed_cards` lock rule is enforceable when status becomes `printed` or `claimable`.
- [ ] `claim_codes` cannot be selected directly by anon/authenticated users.
- [ ] `user_cards` cannot be inserted directly by public/authenticated clients.
- [ ] `card_claim_events`, `card_ownership_history`, and `arena_audit_logs` are append-only for application roles.
- [ ] RLS policies reuse existing `admin_users` active-admin checks for V1.
- [ ] Admin-only tables and sensitive fields have no accidental public read path.
- [ ] Rollback plan disables RPC/routes before considering data removal.
- [ ] No real printed card seed data is included unless explicitly approved.
- [ ] Vote MVP tables remain untouched.

## Final Note

Claim System V1 should be designed as a trust layer before it is designed as a feature layer. The migration should make duplicate claim, duplicate ownership, silent rarity changes, and unaudited admin override hard at the database level, not merely discouraged by UI.
