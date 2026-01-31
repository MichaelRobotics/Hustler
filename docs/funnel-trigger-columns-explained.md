# Funnel trigger columns – what they are

## The idea: two trigger “slots”

A funnel can have **two** triggers at once:

1. **Membership trigger** – when to react to membership events (e.g. “when they buy this product”, “when they cancel”).
2. **App trigger** – when to react to app/conversation events (e.g. “when they open the app”, “when qualification is complete”).

So you need **two “type” columns** and **two “config” columns** (plus delays).

---

## All trigger-related columns (current schema)

| Column | What it stores | Notes |
|--------|----------------|--------|
| **membership_trigger_type** | Enum: membership trigger (e.g. `membership_buy`, `any_cancel_membership`) | Use for “when does membership event fire?” |
| **app_trigger_type** | Enum: app trigger (e.g. `on_app_entry`, `qualification_merchant_complete`) | Use for “when does app/conversation event fire?” |
| **membership_trigger_config** | JSON: membership config (resourceId, filter lists, cancelType) | Options for membership trigger. |
| **app_trigger_config** | JSON: app config (funnelId, profileId) | Options for app trigger. |
| **delay_minutes** | Integer: delay (minutes) for **app** trigger | One value per funnel. |
| **membership_delay_minutes** | Integer: delay (minutes) for **membership** trigger | One value per funnel. |

**Dropped (no longer in schema):**

| Column | Was | Now |
|--------|-----|-----|
| **trigger_timeout_minutes** | JSON: per-trigger timeouts | Dropped. Replaced by `delay_minutes` + `membership_delay_minutes`. |
| **trigger_type** | Single enum: legacy “one trigger” | Dropped. Replaced by `membership_trigger_type` + `app_trigger_type`. |
| **trigger_config** | JSON: legacy “one trigger” config | Dropped. Replaced by `membership_trigger_config` + `app_trigger_config`. |

---

## Summary

There are **6** trigger-related columns: **2 type** (`membership_trigger_type`, `app_trigger_type`), **2 config** (`membership_trigger_config`, `app_trigger_config`), and **2 delay** (`delay_minutes`, `membership_delay_minutes`). The legacy columns `trigger_type` and `trigger_config` have been removed.
