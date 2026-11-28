# GBS Hospital Management System — Official Brand Colour Standardisation & WCAG 2.2 AA Accessibility Contrast Audit Report

**Audit Date:** 2026-11-28  
**Specification Reference:** File 10 — `GBS_OFFICIAL_BRAND_COLOUR_STANDARDISATION.docx` + Official Hospital Registration & Membership ID Card Generator  
**Automated Verification Suites:** `Frontend/tests/theme.contrast.test.js` (`6/6`) + `Frontend/tests/smoke.roles-and-dashboards.test.js` (`19/19`)  
**Overall Compliance Status:** **42 / 42 Measured Colour Pairings PASSED (`100%` WCAG 2.2 AA Compliance; `100%` WCAG 2.2 AAA in High-Contrast Mode; `0` Failures)**

---

## 1. Official GBS Visual Brand Palette (Locked Across Entire System)

Derived directly from the unmodified lossless `1024×1024` official GBS crest logo (`/gbs-official-logo.png`, `/hospital-logo.png`, `/logo.png`, `favicon.ico`, `favicon-32x32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`):

| Official Brand Token | Hex Code | Authoritative Role Across GBS Hospital System |
| :--- | :---: | :--- |
| **Midnight Navy** | `#091830` | Primary brand identity, top navigation header, sidebar/tab bars, dark mode canvas & ID card header |
| **Antique Gold** | `#C29B4F` | Primary highlights, selected navigation tabs, active buttons, card frames & borders |
| **Champagne Gold** | `#E7CF88` | Decorative highlights, dark-mode headings, active badges & ID card headers |
| **Muted Gold** | `#BAA479` | Secondary accents, subtle metadata, table labels & hairline dividers |
| **Warm Ivory** | `#F7F5EF` | Light mode reading areas, forms, tables, dashboard backgrounds & official ID card body |
| **Charcoal** | `#1B1A1B` | Primary high-contrast body text on Warm Ivory and Pure White surfaces |
| **Accessible Gold (Light Surface Text)** | `#745418` | WCAG 2.2 AA compliant gold accent text on Warm Ivory (`6.37:1`) and Pure White (`6.94:1`) |

- **Legacy Off-Brand Colour Cleanup:** `0` legacy wine-red gradients (`#7f1d1d`, `#450a0a`, `#881337`, `#4c0519`) remain anywhere in `Frontend/src/`.
- **Real-Life Hospital Photography Preservation:** All `46+` real-life hospital photos in `Frontend/public/assets/images/` remain **100% untouched** (zero recoloring, zero cropping, zero deletion).

---

## 2. Accessibility Controls & Persistent Display Modes

Implemented globally via `Frontend/src/context/ThemeContext.jsx`, `Frontend/src/styles/theme.css`, `Frontend/src/styles/globals.css`, and the one-click **Display & Accessibility** popover in `Frontend/src/components/Header.jsx`:

- **Display Modes (`<html data-theme="...">` persisted in `localStorage`):**
  1. **Dark Mode (`dark`)** — Official Midnight Navy (`#091830`) & Royal Gold (`#C29B4F` / `#E7CF88`).
  2. **Light Mode (`light`)** — Warm Ivory (`#F7F5EF`) & Pure White (`#FFFFFF`) reading areas with Midnight Navy (`#091830`) navigation bar and Charcoal (`#1B1A1B`) text.
  3. **High-Contrast Mode (`high-contrast`)** — Deep Navy (`#050D1C` / `#091830`), Pure White (`#FFFFFF`), Bright Gold (`#FFE07D`), and bold `2px` high-visibility borders achieving **WCAG 2.2 AAA (`>= 9.34:1`)** across every element.
- **Adjustable Text Sizes (`<html data-text-size="...">` persisted in `localStorage`):**
  - `A-` Compact (`92%`), `A` Standard (`100%`), `A+` Large (`112%`), `A++` Extra Large (`125%`).
- **Never Communicate Through Colour Alone (WCAG 1.4.1):**
  - All status badges inject mandatory non-colour glyphs via CSS (`✓` Success, `▲` Warning, `✕` Danger, `●` Info, `★` Gold/Featured) paired with explicit text labels.
- **Keyboard Focus Visibility (WCAG 2.4.7 / 2.4.11):**
  - Global `:focus-visible` enforces a crisp `3px solid` Antique Gold (`#C29B4F`) / Bright Gold (`#FFE07D`) focus outline with `2px–3px` offset across all interactive controls.
- **Responsive Design:** Verified across Desktop (`1440×900`), Tablet (`768px`), and Mobile (`390×844`) with `0px` horizontal overflow.

---

## 3. Computed W3C WCAG 2.2 Contrast Ratio Results (42 / 42 PASSED)

All ratios below are computed directly using the W3C WCAG 2.2 sRGB Relative Luminance equation `((L1 + 0.05) / (L2 + 0.05))` and enforced continuously by `Frontend/tests/theme.contrast.test.js`.

### 3.1 Dark Mode (`[data-theme="dark"]` — 13 / 13 PASSED)

| UI Element & Colour Pair | Foreground | Background | Computed Ratio | WCAG 2.2 Target | Result |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Primary body text on Midnight Navy | `#F7F5EF` | `#091830` | **16.26:1** | `>= 4.5:1` (AA) | **PASS (AAA)** |
| Muted body text on Midnight Navy | `#D8D2C5` | `#091830` | **11.77:1** | `>= 4.5:1` (AA) | **PASS (AAA)** |
| Dim/Gold metadata on Midnight Navy | `#BAA479` | `#091830` | **7.32:1** | `>= 4.5:1` (AA) | **PASS (AAA)** |
| Dim/Gold metadata on Card Surface | `#BAA479` | `#0D1E3A` | **6.86:1** | `>= 4.5:1` (AA) | **PASS (AA)** |
| Champagne Gold heading on Midnight Navy | `#E7CF88` | `#091830` | **11.54:1** | `>= 4.5:1` (AA) | **PASS (AAA)** |
| Champagne Gold heading on Card Surface | `#E7CF88` | `#0D1E3A` | **10.82:1** | `>= 4.5:1` (AA) | **PASS (AAA)** |
| Antique Gold UI accent on Midnight Navy | `#C29B4F` | `#091830` | **6.83:1** | `>= 4.5:1` (AA) | **PASS (AA)** |
| Midnight Navy label on Antique Gold button | `#091830` | `#C29B4F` | **6.83:1** | `>= 4.5:1` (AA) | **PASS (AA)** |
| Midnight Navy label on Champagne Gold button | `#091830` | `#E7CF88` | **11.54:1** | `>= 4.5:1` (AA) | **PASS (AAA)** |
| Online Success status on Midnight Navy | `#34D399` | `#091830` | **9.22:1** | `>= 4.5:1` (AA) | **PASS (AAA)** |
| Warning Amber status on Midnight Navy | `#FCD34D` | `#091830` | **12.29:1** | `>= 4.5:1` (AA) | **PASS (AAA)** |
| Danger Red status on Midnight Navy | `#FCA5A5` | `#091830` | **9.34:1** | `>= 4.5:1` (AA) | **PASS (AAA)** |
| Info Cyan status on Midnight Navy | `#7DD3FC` | `#091830` | **10.63:1** | `>= 4.5:1` (AA) | **PASS (AAA)** |

### 3.2 Light Mode (`[data-theme="light"]` — 14 / 14 PASSED)

| UI Element & Colour Pair | Foreground | Background | Computed Ratio | WCAG 2.2 Target | Result |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Charcoal text on Warm Ivory canvas | `#1B1A1B` | `#F7F5EF` | **15.92:1** | `>= 4.5:1` (AA) | **PASS (AAA)** |
| Charcoal text on Pure White card | `#1B1A1B` | `#FFFFFF` | **17.35:1** | `>= 4.5:1` (AA) | **PASS (AAA)** |
| Midnight Navy heading on Warm Ivory | `#091830` | `#F7F5EF` | **16.26:1** | `>= 4.5:1` (AA) | **PASS (AAA)** |
| Midnight Navy heading on Pure White card | `#091830` | `#FFFFFF` | **17.72:1** | `>= 4.5:1` (AA) | **PASS (AAA)** |
| Muted text on Warm Ivory | `#333B48` | `#F7F5EF` | **10.36:1** | `>= 4.5:1` (AA) | **PASS (AAA)** |
| Dim metadata text on Warm Ivory | `#4A5260` | `#F7F5EF` | **7.22:1** | `>= 4.5:1` (AA) | **PASS (AAA)** |
| Accessible Gold text on Warm Ivory | `#745418` | `#F7F5EF` | **6.37:1** | `>= 4.5:1` (AA) | **PASS (AA)** |
| Accessible Gold text on Pure White card | `#745418` | `#FFFFFF` | **6.94:1** | `>= 4.5:1` (AA) | **PASS (AA)** |
| Muted Gold text on Warm Ivory | `#6C5530` | `#F7F5EF` | **6.46:1** | `>= 4.5:1` (AA) | **PASS (AA)** |
| Warm Ivory nav text on Midnight Navy header | `#F7F5EF` | `#091830` | **16.26:1** | `>= 4.5:1` (AA) | **PASS (AAA)** |
| Success badge (`✓`) on Mint surface | `#047857` | `#ECFDF5` | **5.21:1** | `>= 4.5:1` (AA) | **PASS (AA)** |
| Warning badge (`▲`) on Amber surface | `#92400E` | `#FEF3C7` | **6.37:1** | `>= 4.5:1` (AA) | **PASS (AA)** |
| Danger badge (`✕`) on Rose surface | `#B91C1C` | `#FEE2E2` | **5.30:1** | `>= 4.5:1` (AA) | **PASS (AA)** |
| Info badge (`●`) on Sky surface | `#0369A1` | `#E0F2FE` | **5.17:1** | `>= 4.5:1` (AA) | **PASS (AA)** |

### 3.3 High-Contrast Accessibility Mode (`[data-theme="high-contrast"]` — 10 / 10 PASSED WCAG AAA)

| UI Element & Colour Pair | Foreground | Background | Computed Ratio | WCAG 2.2 Target | Result |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Pure White text on Deep Navy canvas | `#FFFFFF` | `#050D1C` | **19.43:1** | `>= 7.0:1` (AAA) | **PASS (AAA)** |
| Pure White text on Card Navy | `#FFFFFF` | `#091830` | **17.72:1** | `>= 7.0:1` (AAA) | **PASS (AAA)** |
| Warm Ivory text on Card Navy | `#F7F5EF` | `#091830` | **16.26:1** | `>= 7.0:1` (AAA) | **PASS (AAA)** |
| Bright Gold heading on Card Navy | `#FFE07D` | `#091830` | **13.68:1** | `>= 7.0:1` (AAA) | **PASS (AAA)** |
| Champagne Gold accent on Card Navy | `#E7CF88` | `#091830` | **11.54:1** | `>= 7.0:1` (AAA) | **PASS (AAA)** |
| Deep Navy label on Champagne Gold button | `#050D1C` | `#E7CF88` | **12.66:1** | `>= 7.0:1` (AAA) | **PASS (AAA)** |
| Online status on Card Navy | `#6EE7B7` | `#091830` | **11.63:1** | `>= 7.0:1` (AAA) | **PASS (AAA)** |
| Warning status on Card Navy | `#FDE047` | `#091830` | **13.44:1** | `>= 7.0:1` (AAA) | **PASS (AAA)** |
| Danger status on Card Navy | `#FCA5A5` | `#091830` | **9.34:1** | `>= 7.0:1` (AAA) | **PASS (AAA)** |
| Info status on Card Navy | `#7DD3FC` | `#091830` | **10.63:1** | `>= 7.0:1` (AAA) | **PASS (AAA)** |

### 3.4 Official Hospital Registration & Membership ID Card (`HospitalMembershipCardModal.jsx` — 5 / 5 PASSED)

| Card Component | Foreground | Background | Computed Ratio | WCAG 2.2 Target | Result |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Hospital Name in Midnight Navy Card Header | `#E7CF88` | `#091830` | **11.54:1** | `>= 4.5:1` (AA) | **PASS (AAA)** |
| `✓ ACCEPTED` Status Pill | `#FFFFFF` | `#047857` | **5.48:1** | `>= 4.5:1` (AA) | **PASS (AA)** |
| Member Full Name on Warm Ivory Card Body | `#091830` | `#F7F5EF` | **16.26:1** | `>= 4.5:1` (AA) | **PASS (AAA)** |
| Member Role & Dept Accent on Warm Ivory | `#745418` | `#F7F5EF` | **6.37:1** | `>= 4.5:1` (AA) | **PASS (AA)** |
| Card Data Fields & Back Hospital Details | `#1B1A1B` | `#F7F5EF` | **15.92:1** | `>= 4.5:1` (AA) | **PASS (AAA)** |

---

## 4. All 16 Master Blueprint Role Dashboards & 26 Workspaces Verification Matrix

Every role dashboard inherits the unified Official GBS Midnight Navy & Gold brand identity across Light, Dark, and High-Contrast modes while retaining its distinct layout, untouched real-life hospital imagery, and subtle `[data-role]` header accent bar:

| # | Role Dashboard (`data-role`) | Default Workspace | Subtle Role Accent | Light / Dark / High-Contrast | Real-Life Photos | Membership ID Card Access |
| :-: | :--- | :--- | :---: | :---: | :---: | :--- |
| 1 | `ADMINISTRATOR` | Executive BI & All 25 Modules | `#C29B4F` | Verified | Untouched | My ID Card + Patient Cards + Staff Directory Cards |
| 2 | `HOSPITAL_DIRECTOR` | Executive BI & Analytics | `#E7CF88` | Verified | Untouched | My ID Card + Patient Cards + Staff Directory Cards |
| 3 | `DEVELOPER` | Hidden `/developer-portal` NOC | `#C29B4F` | Verified | Untouched | My ID Card + Isolated Developer Operations |
| 4 | `DOCTOR` | Clinical & Doctor Consultations | `#38BDF8` | Verified | Untouched | My ID Card + Patient Registration Cards |
| 5 | `SURGEON` | Surgery & Operating Theatre | `#60A5FA` | Verified | Untouched | My ID Card + Patient Registration Cards |
| 6 | `DENTIST` | Dental Clinic | `#2DD4BF` | Verified | Untouched | My ID Card + Patient Registration Cards |
| 7 | `EYE_DOCTOR` | Ophthalmology & Eye Clinic | `#818CF8` | Verified | Untouched | My ID Card + Patient Registration Cards |
| 8 | `RADIOLOGIST` | Radiology & PACS Imaging | `#A78BFA` | Verified | Untouched | My ID Card + Patient Registration Cards |
| 9 | `NURSE` | OPD Triage, Wards & ICU | `#34D399` | Verified | Untouched | My ID Card + Patient Registration Cards |
| 10 | `PHARMACIST` | Pharmacy & Inventory | `#10B981` | Verified | Untouched | My ID Card + Patient Registration Cards |
| 11 | `LAB_TECHNICIAN` | Laboratory & Pathology | `#22D3EE` | Verified | Untouched | My ID Card + Patient Registration Cards |
| 12 | `RECEPTIONIST` | Patient Registration & MPI | `#E7CF88` | Verified | Untouched | My ID Card + Immediate Registration ID Card & MPI Cards |
| 13 | `FOLDER_RETRIEVER` | Medical Records & Archive | `#BAA479` | Verified | Untouched | My ID Card + MPI Patient Cards |
| 14 | `ACCOUNTANT` | Billing, Payments & NHIS | `#C29B4F` | Verified | Untouched | My ID Card + Patient Registration Cards |
| 15 | `HR_MANAGER` | HR, Shifts & Credentials | `#F59E0B` | Verified | Untouched | My ID Card + Staff Directory ID Cards |
| 16 | `PATIENT` | Patient Self-Service Portal | `#34D399` | Verified | Untouched | Own Hospital Registration ID Card Only (Strict 403 Privacy) |

---

## 5. Critical Preservation Compliance Checklist

| Preservation Requirement | Verified Status |
| :--- | :---: |
| Existing application architecture preserved (no rebuild) | **CONFIRMED** |
| Zero existing features deleted | **CONFIRMED** |
| Authentication, MFA, and RBAC permissions unchanged | **CONFIRMED** |
| PostgreSQL 16 schema (126 models) & live records untouched | **CONFIRMED** |
| Payment processing (Paystack/Hubtel/MoMo/Bank), APIs & tenants untouched | **CONFIRMED** |
| Official GBS Logo (`1024×1024` lossless PNG) & `46+` real-life hospital photos preserved unmodified | **CONFIRMED** |
| Zero UI hover tooltips (`title=` attributes) & zero native browser popups (`alert`/`confirm`/`prompt`) | **CONFIRMED** |
| Automated Frontend Verification (`theme.contrast` + `smoke` + `connection.manager` + `navigation.manager` + `webrtc`) | **40 / 40 PASSED** |
| Automated Backend PostgreSQL Jest Verification (`46` suites) | **409 / 409 PASSED** |
