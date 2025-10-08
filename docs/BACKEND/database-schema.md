# Backend Schema & Frontend Integration Guide

## Scope
- This document inventories the active backend (Supabase/Postgres) schema and how the frontend touches it.
- Keep this file up to date whenever we add/adjust features that require database changes.

## Tables (Public Schema)

### applicants
- **Purpose:** Candidate master (PF/PJ person/company identity used by Kanban cards and fichas).
- **Columns (key):
  - **id:** uuid, PK
  - **person_type:** enum (PF|PJ)
  - **primary_name:** text
  - **cpf_cnpj:** text
  - **phone/email:** text (nullable)
  - **address fields:** `street`, `number`, `district`, `city`, `uf`, `cep`, `complement` (nullable)
  - **created_at/updated_at:** timestamptz, default now()
- **Frontend touchpoints:** Create on ficha creation (PF via BasicInfo; PJ via NovaFichaPJForm).

### kanban_cards
- **Purpose:** Core Kanban records (what we show and manipulate in the board, and where Pareceres live).
- **Columns (key):
  - **id:** uuid, PK
  - **applicant_id:** uuid, FK → applicants(id)
  - **person_type:** enum (PF|PJ)
  - **area:** enum (analise|comercial)
  - **stage:** text (recebido|em_analise|reanalise|aprovado|negado|...)
  - **assignee_id:** uuid, FK → profiles(id) (nullable)
  - **title/cpf_cnpj/phone/email:** text
  - **received_at/due_at:** timestamptz
  - **priority:** enum priority_level (default 'medium')
  - **source:** text
  - **comments_short:** text (legacy quick note)
  - **labels:** text[] (default '{}')
  - **created_at/updated_at:** timestamptz (default now())
- **Columns added for Pareceres (2025-01, active):
  - **reanalysis_notes:** jsonb NOT NULL DEFAULT '[]'::jsonb (list of parecer objects)
  - **comments:** text (mirror of last parecer for quick display)
- **Indexes/Triggers:**
  - `idx_kanban_cards_reanalysis_notes_gin` (GIN on jsonb)
  - `idx_kanban_cards_stage` (stage), `idx_kanban_cards_applicant` (applicant_id)
  - `set_timestamp_kanban_cards` trigger → updates `updated_at` on UPDATE
- **Parecer object shape (jsonb array items):**
  - `id` (uuid), `author_id`, `author_name`, `author_role`, `created_at` (ISO), `text`
  - Optional update trail: `updated_by_id`, `updated_by_name`, `updated_at` (ISO)
- **Frontend touchpoints:** Read/Write Pareceres: `src/components/NovaFichaComercialForm.tsx`, `src/components/ui/ModalEditarFicha.tsx`; Board: `src/components/KanbanBoard.tsx`.

### pf_fichas
- **Purpose:** PF ficha extended data (today: birth_date, naturalidade, UF).
- **Columns (key):
  - **id:** uuid, PK
  - **applicant_id:** uuid, FK → applicants(id)
  - **birth_date:** date (nullable)
  - **naturalidade/uf_naturalidade:** text (nullable)
  - **created_at/updated_at:** timestamptz
- **Frontend touchpoints:** Not currently written; reserved for future PF details.

### pj_fichas
- **Purpose:** PJ ficha extended data.
- **Columns (key):
  - **id:** uuid, PK
  - **applicant_id:** uuid, FK → applicants(id)
  - **trade_name/contato_financeiro/contato_tecnico:** text (nullable)
  - **created_at/updated_at:** timestamptz
- **Frontend touchpoints:** Create minimal row on PJ flow: `src/components/NovaFichaPJForm.tsx`.

### card_attachments
- **Purpose:** File attachments linked to Kanban cards for communication and evidence.
- **Columns (key):
  - **id:** uuid, PK
  - **card_id:** uuid, FK → kanban_cards(id) ON DELETE CASCADE
  - **author_id:** uuid, FK → profiles(id)
  - **author_name/author_role:** text
  - **file_name/file_path/file_size/file_type/file_extension:** text/bigint
  - **description:** text (nullable, contextual description)
  - **comment_id:** uuid (nullable, link to specific parecer/comment)
  - **created_at/updated_at:** timestamptz (default now())
- **Storage:** Files stored in Supabase Storage bucket `card-attachments` with path `card-attachments/{card_id}/{filename}`
- **Indexes:** `idx_card_attachments_card_id`, `idx_card_attachments_author_id`, `idx_card_attachments_created_at`, `idx_card_attachments_comment_id`
- **Triggers:** 
  - `set_timestamp_card_attachments` → updates `updated_at` on UPDATE
  - `trg_create_attachment_comment` → creates comment when attachment is uploaded
  - `trg_create_attachment_deletion_comment` → creates comment when attachment is deleted
- **Functions:** 
  - `get_attachment_history(uuid)` → returns attachment history with actions
  - `get_current_attachments(uuid)` → returns current attachments with download URLs
  - `get_attachment_stats(uuid)` → returns attachment statistics and metadata
  - `cleanup_orphaned_attachments()` → removes orphaned files from storage
- **RLS:** Policies for bucket access based on card permissions
- **History:** Automatic comment creation for upload/delete actions (permanent history)
- **Frontend touchpoints:** Upload/View/Delete: `src/components/attachments/*`, Hook: `src/hooks/useAttachments.ts`, Integration: `src/components/KanbanBoard.tsx`, Card button: `src/components/ficha/OptimizedKanbanCard.tsx`.

### card_comments
- **Purpose:** Nested comment system for conversations within Kanban cards.
- **Columns (key):
  - **id:** uuid, PK
  - **card_id:** uuid, FK → kanban_cards(id) ON DELETE CASCADE
  - **parent_id:** uuid, FK → card_comments(id) ON DELETE CASCADE (nullable, for replies)
  - **author_id:** uuid, FK → profiles(id)
  - **author_name/author_role:** text
  - **content:** text NOT NULL
  - **level:** integer NOT NULL DEFAULT 0 CHECK (level >= 0 AND level <= 2)
    - 0 = Main comment (🔵 blue border)
    - 1 = Reply level 1 (🔴 red border)  
    - 2 = Sub-reply level 2 (🟢 green border)
  - **created_at/updated_at:** timestamptz (default now())
- **Indexes:** `idx_card_comments_card_id`, `idx_card_comments_parent_id`, `idx_card_comments_author_id`, `idx_card_comments_created_at`, `idx_card_comments_level`
- **Triggers:** `trg_update_card_comments_updated_at` → updates `updated_at` on UPDATE
- **Functions:** `get_card_comments_with_hierarchy(uuid)`, `get_comment_thread(uuid)`
- **Frontend touchpoints:** Components: `src/components/comments/*`, Hook: `src/hooks/useComments.ts`, Integration: `src/components/ui/ObservationsWithComments.tsx`, Modal: `src/components/ui/ModalEditarFicha.tsx`.

### profiles
- **Purpose:** User profiles and roles.
- **Columns (key):
  - **id:** uuid, PK (auth user id)
  - **full_name:** text
  - **role:** enum/text ('analista' | 'gestor' | 'comercial')
  - **avatar_url:** text (nullable)
  - **created_at/updated_at:** timestamptz
- **Frontend touchpoints:** Global auth context (`src/context/AuthContext.tsx`), role gates (`src/lib/access.ts`).

## Relationships
- **kanban_cards.applicant_id → applicants.id**
- **kanban_cards.assignee_id → profiles.id**
- **pf_fichas.applicant_id → applicants.id**
- **pj_fichas.applicant_id → applicants.id**
- **card_attachments.card_id → kanban_cards.id (CASCADE DELETE)**
- **card_attachments.author_id → profiles.id**
- **card_comments.card_id → kanban_cards.id (CASCADE DELETE)**
- **card_comments.parent_id → card_comments.id (CASCADE DELETE)**
- **card_comments.author_id → profiles.id**

## RLS (Policies) – Checklist
- If RLS is enabled, ensure:
  - **SELECT** on all tables above for authenticated users who should see them.
  - **INSERT/UPDATE** on `kanban_cards` for users who create/edit cards.
  - **UPDATE** specifically allows writing `reanalysis_notes` and `comments`.
  - **INSERT** on `applicants` (PF/PJ creation) and on `pj_fichas`.
  - **SELECT/INSERT/UPDATE/DELETE** on `card_attachments` for users with access to the parent card.
  - **SELECT/INSERT/UPDATE/DELETE** on `card_comments` for users with access to the parent card.
  - **Storage** bucket `card-attachments` with RLS policies matching card access.
- Example intent (pseudo): allow reads by tenant/company or globally; allow updates to card fields used by the UI.

## Frontend ↔ Backend Map (Key Flows)
- **Create PF ficha:** Insert into `applicants` (person_type='PF' + basics), then into `kanban_cards` (area, stage, title, received_at, source).
- **Create PJ ficha:** Insert into `applicants` (PJ), into `pj_fichas` (min fields), then into `kanban_cards`.
- **Pareceres:** Append object to `kanban_cards.reanalysis_notes` and copy last text to `kanban_cards.comments`. Only the creator may edit; deletion disabled.
- **Kanban ops:** Read/write `kanban_cards` for stage/due_at/assignee/labels.
- **Attachments:** Upload file to Storage bucket `card-attachments`, insert metadata into `card_attachments`. Download via public URLs. Delete cascades from card deletion.
- **Comments:** Create threaded conversations in `card_comments` with hierarchical levels (0=main, 1=reply, 2=sub-reply). Visual hierarchy with color-coded borders (blue/red/green).

## Migrations (Executed)
- Added Parecer support and QoL indices/triggers:
  - Add `reanalysis_notes jsonb` + `comments text` to `kanban_cards`.
  - GIN index on `reanalysis_notes`; indices for `stage` and `applicant_id`.
  - `set_timestamp_kanban_cards` trigger updating `updated_at`.
- Added Card Attachments system (2025-01-03):
  - Create `card_attachments` table with file metadata and relationships.
  - Indices on `card_id`, `author_id`, `created_at`, `comment_id`.
  - `set_timestamp_card_attachments` trigger updating `updated_at`.
  - RLS policies for secure access control.
- Added Card Comments system (2025-01-03):
  - Create `card_comments` table with hierarchical comment structure.
  - Indices on `card_id`, `parent_id`, `author_id`, `created_at`, `level`.
  - Functions `get_card_comments_with_hierarchy()` and `get_comment_thread()`.
  - `trg_update_card_comments_updated_at` trigger updating `updated_at`.
  - RLS policies for secure access control.
- Enhanced Card Attachments with Storage and History (2025-01-04):
  - Create `card-attachments` storage bucket with RLS policies.
  - Automatic comment creation for upload/delete actions (permanent history).
  - Functions for attachment history, current attachments, and statistics.
  - Orphaned file cleanup functionality.
  - Enhanced RLS policies for storage bucket access control.

## Change Log
- 2025‑01: Pareceres in `kanban_cards` (`reanalysis_notes`, `comments`) + index/trigger; UI wired accordingly.
- 2025‑01‑03: Card Attachments system - file uploads with metadata, storage integration, UI components for upload/display/management.
- 2025‑01‑03: Card Comments system - nested conversation threads with hierarchical levels, visual color coding, reply functionality, UI integration.
- 2025‑01‑04: Enhanced Card Attachments - storage bucket creation, automatic history tracking, advanced functions for attachment management, permanent audit trail in comments.

## Maintenance Checklist (When Adding Features)
- **Model:** Decide table/columns; extend `kanban_cards` for lightweight needs, or create a dedicated table when relationships grow.
- **Migration:** Add SQL here (ALTER/CREATE) and run in Supabase.
- **RLS:** Update policies to permit the exact UI operations.
- **Frontend:** Wire read/write; update this document’s touchpoints.
