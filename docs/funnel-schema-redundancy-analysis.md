# Funnel-related schema: redundancy analysis

## Tables reviewed

- **funnels** – core merchant/funnel definition
- **funnel_product_faq** – FAQ and objection handling per funnel+resource
- **funnel_analytics** – funnel-level metrics (one row per funnel)
- **funnel_resource_analytics** – funnel+resource-level metrics (one row per funnel+resource)

---

## 1. Funnels table – redundancies

### 1.1 Trigger type: three columns for “current trigger”

| Column | Purpose |
|--------|--------|
| `trigger_type` | Legacy single trigger (default `on_app_entry`) |
| `membership_trigger_type` | Membership trigger (e.g. `membership_buy`, `any_membership_buy`) |
| `app_trigger_type` | App trigger (e.g. `qualification_merchant_complete`, `on_app_entry`) |

**Redundancy:** The app uses **dual triggers** (Membership + App). `trigger_type` is kept for backward compatibility and is still written (e.g. when the App trigger is set, `trigger_type` is set to the same value). So one of the two “real” columns duplicates `trigger_type`.

**Runtime usage (before migration):** user-context (conversation creation) read `triggerType` only; webhook (membership.went_valid) read `triggerType === "membership_valid"` only. Both have been updated to use `app_trigger_type` / `membership_trigger_type` with fallback to `trigger_type`.

**Recommendation:** Treat `trigger_type` as read-only legacy. Runtime now prefers `membership_trigger_type` and `app_trigger_type` with fallback. New code should rely only on the new columns. Eventually drop `trigger_type` after all readers are migrated and UI stops writing it.

---

### 1.2 Trigger config (legacy column removed)

| Column | Purpose |
|--------|--------|
| `membership_trigger_config` | Membership trigger config (resourceId, filterResourceIdsRequired, filterResourceIdsExclude) |
| `app_trigger_config` | App trigger config (funnelId, profileId) |

**Done:** Legacy `trigger_config` has been dropped. App uses only `membership_trigger_config` and `app_trigger_config`.

---

### 1.3 Trigger timeout (deprecated)

| Column | Purpose |
|--------|--------|
| `trigger_timeout_minutes` | JSON per-trigger timeout (e.g. `{ "on_app_entry": 0, "membership_valid": 30 }`) |
| `delay_minutes` | App trigger delay (single value) |
| `membership_delay_minutes` | Membership trigger delay (single value) |

**Redundancy:** Comments in code mark `trigger_timeout_minutes` as deprecated in favor of `delay_minutes` and `membership_delay_minutes`. So the JSON column is redundant if all usage has moved to the two delay columns.

**Recommendation:** If nothing reads `trigger_timeout_minutes` anymore, consider dropping it. Otherwise keep it only until callers are migrated.

**Done:** App code no longer reads or writes `trigger_timeout_minutes`; it was removed from types and return objects. The column has been dropped from the DB via migration `20260131000000_drop_funnel_trigger_timeout_minutes.sql` and from `lib/supabase/schema.ts`.

---

### 1.4 No redundancy

- **delay_minutes** vs **membership_delay_minutes** – different triggers; both needed.
- **experienceId** / **userId** – scoping; not redundant.
- **flow**, **visualization_state**, **handout***, **merchant_type**, **sends**, **generation_status**, **is_draft**, **is_deployed**, **was_ever_deployed** – all serve distinct roles.

---

## 2. Funnel product FAQ

- **funnel_product_faq**: `(funnel_id, resource_id)` plus `faq_content`, `objection_handling`.
- One row per funnel+resource; unique on `(funnel_id, resource_id)`.

**Redundancy:** None. This table is normalized and has no overlap with funnel-level or analytics tables.

---

## 3. Funnel analytics

- **funnel_analytics**: one row per **funnel** (unique on `funnel_id`).
- Columns: `experience_id`, `funnel_id`, totals (starts, intent, conversions, affiliate/product revenue, interest), today/yesterday counters, growth percents, `last_updated`.

**Redundancy / overlap:**

- **experience_id** – Denormalized from `funnels.experience_id`. Redundant in the strict sense but useful for querying by experience without joining to `funnels`. Common pattern; keep unless you want to always join.
- **total_product_revenue** (funnel_analytics) vs **sum of total_resource_revenue** (funnel_resource_analytics per funnel) – Conceptually similar: “revenue for this funnel.” If both are maintained and intended to be consistent, they duplicate the same fact. Code in `funnel-actions.ts` does sum resource revenue for display; funnel-level `total_product_revenue` may be written elsewhere. If they are kept in sync by design, that’s intentional duplication for performance; if they can diverge, that’s a consistency risk.

**Recommendation:** Document whether funnel-level `total_product_revenue` is the source of truth or derived from resource analytics. If derived, consider computing it (e.g. in a view or query) and dropping the column to avoid drift.

---

## 4. Funnel resource analytics

- **funnel_resource_analytics**: one row per **funnel + resource**.
- Columns: `experience_id`, `funnel_id`, `resource_id`, totals (clicks, conversions, revenue, interest), today counters, `type`, `last_updated`.

**Redundancy:**

- **experience_id** – Same as above: denormalized from funnel/experience for easier filtering. Acceptable unless you standardize on “no denormalization.”

**Redundancy:** No other redundancy within this table. Relationship to `funnel_analytics` is “one funnel → one funnel_analytics row” vs “one funnel → many funnel_resource_analytics rows”; they are different grains.

---

## 5. Cross-table summary

| Area | Redundant? | Notes |
|------|------------|--------|
| **funnels.trigger_type** | Dropped | Removed in migration 20260131000001 |
| **funnels.trigger_config** | Dropped | Removed in migration 20260131000001 |
| **funnels.trigger_timeout_minutes** | Dropped | Removed in migration 20260131000000 |
| **funnel_analytics.experience_id** | Denormalized | Optional; keep for query perf or remove and join |
| **funnel_resource_analytics.experience_id** | Denormalized | Same as above |
| **funnel_analytics.total_product_revenue** vs **sum(funnel_resource_analytics.total_resource_revenue)** | Possible | Clarify source of truth; consider deriving funnel revenue from resource rows |

---

## 6. Recommendations (short)

1. **Funnels**
   - ~~trigger_type / trigger_config~~ Dropped in migration 20260131000001.
   - ~~Plan to drop `trigger_timeout_minutes` once no code reads it.~~ Dropped in migration `20260131000000_drop_funnel_trigger_timeout_minutes.sql`.
   - Optionally add a short comment in the schema above these columns: “Legacy / deprecated; prefer membership_* and app_*.”
2. **Funnel analytics**
   - Decide and document whether `total_product_revenue` is source of truth or derived from resource analytics; if derived, consider removing the column and computing it.
3. **experience_id** on analytics tables is intentional denormalization; keep unless you want to always join through funnels.

No structural redundancy was found in **funnel_product_faq**; it is clean and normalized.
