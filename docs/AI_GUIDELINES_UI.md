## 1. Purpose

The purpose of this guideline is to ensure:

* Visual consistency across the entire product
* Scalability as features grow
* Zero design drift
* Predictable, reviewable UI output from AI

All UI must strictly adhere to the **design tokens and primitives defined in `global.css`**.

---

## 2. Single Source of Truth

### Design System Authority

`global.css` is the **only source of truth** for:

* Typography
* Colors
* Spacing
* Border radius
* Shadows
* Component primitives

If a style or component is **not defined in `global.css`**, it **does not exist**.

---

## 3. Typography Rules (MANDATORY)

### Font System

* **Font:** Inter
* **Single font system**
* Loaded via `next/font` and exposed as `--font-inter`

### Usage Rules

* Use **only** typography definitions from `global.css`
* Do **not** hardcode font sizes, weights, or line heights
* Do **not** use Tailwind typography utilities directly (`text-sm`, `text-lg`, etc.)

### Allowed Typography Classes

* `.page-title`
* `.section-title`
* `.auth-title`
* `.auth-subtitle`
* `p`, `label`, `small`
* `.muted`

If a new text style is required:

1. Extend `global.css`
2. Then use it

---

## 4. Color Rules (MANDATORY)

### Allowed Colors

Use **CSS variables only**, defined in `global.css`:

* Brand: `--brand-*`
* Backgrounds: `--bg`, `--surface`, `--muted`
* Text: `--text`, `--text-2`, `--text-3`
* Borders: `--border`
* Status: success / warning / danger / info

### Forbidden

* No hex values
* No RGB values
* No Tailwind color utilities (`bg-gray-100`, `text-pink-500`, etc.)
* No inline styles

### Status Indicators

Use **badge primitives only**:

* `.badge-approved`
* `.badge-pending`
* `.badge-overdue`
* `.badge-role`

---

## 5. Component Usage Rules

### Use Existing Primitives First

Before creating new markup, check `global.css`.

#### Buttons

* `.btn`
* `.btn-primary`
* `.btn-secondary`
* `.btn-ghost`

#### Forms

* `.label`
* `.input`

#### Layout & Surfaces

* `.card`
* `.surface`
* `.divider`
* `.app-container`

#### Tables

* `.table`

#### Auth Pages

* `.auth-shell`
* `.auth-card`

“For spacing and layout in forms, use .stack-* and .row* primitives only. Do not use margin/padding utilities for layout.”

3) Refactor guidance for the agent (what to tell it)

Use this instruction:

Page wrapper: .auth-shell

Card: .auth-card stack-5

Header group: stack-2

Form: stack-4

Each field group: stack-2

Label row: .row (label left, link right)

Errors: .error-text

Button: .btn-primary w-full

No custom styling unless explicitly required.

---

## 6. Layout & Spacing Rules

* Prefer **component primitives** over utility stacking
* Avoid arbitrary spacing (`mt-7`, `px-11`, etc.)
* Use layout wrappers such as `.app-container`, `.card`

Spacing must feel **consistent and repeatable**, not visually improvised.

---

## 7. Forbidden Patterns (STRICT)

The following are **not allowed**:

* Hardcoded sizes or colors
* Inline styles
* Custom shadows
* Decorative fonts
* Tailwind color or typography utilities
* One-off visual tweaks
* “Just for this page” styling

If the UI requires a new pattern:

> Extend the design system first.

---

## 8. Prompt Enforcement Clause

Every UI-related prompt **must include** the following instruction:

> “Strictly follow the design tokens and UI primitives defined in `global.css` and comply with `AI_GUIDELINES_UI.md`. Do not invent styles or override the design system.”

If this instruction is missing, the output is **invalid**.

---

## 9. Scalability Principle

> Consistency beats creativity in SaaS UI.

The UI should:

* Look boring in a good way
* Feel predictable
* Be easy to extend without redesign

This guideline exists to **protect future velocity**.

---

## 10. Review Checklist (Mental Model)

Before producing UI output, ensure:

* No new colors introduced
* No new font sizes introduced
* No Tailwind typography/colors used
* All components map to `global.css`
* Design looks consistent with Sign In / Sign Up pages

If any check fails → revise.

---

**End of UI Guidelines**

---

If you want next, I can:

* Merge this cleanly into your existing `AI_GUIDELINES.md`
* Generate a **one-line short version** to prepend to prompts
* Create a **PR review checklist** derived from this doc

Say which one you want.
