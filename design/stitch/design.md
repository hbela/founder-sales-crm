# Founder Sales CRM — Design System

Source of truth: `apps/web/src/index.css` (OKLCH tokens). This file mirrors those tokens for Google
Stitch generation so redesigned screens come back on-brand and port cleanly into the existing
shadcn/Radix + Tailwind components.

## Brand & Aesthetic

Professional, data-dense B2B sales CRM. Clean, modern, trustworthy. Card-based layouts, generous
but efficient spacing, subtle shadows. App shell = fixed left sidebar (dark navy) + top header +
main content area. Supports **light and dark** modes.

## Color Tokens

Values are the authoritative OKLCH from `index.css`; hex is the sRGB approximation for tools that
need hex.

### Light mode
| Token | OKLCH | Hex |
| --- | --- | --- |
| primary | `oklch(0.4284 0.1720 259.7023)` | `#0047ab` (cobalt blue) |
| primary-foreground | `oklch(1 0 0)` | `#ffffff` |
| accent | `oklch(0.9187 0.1484 146.9048)` | `#9effa9` (light green) |
| accent-foreground | `oklch(0.2151 0.0518 259.4035)` | `#0a1931` |
| background | `oklch(0.9500 0.0054 17.2521)` | `#f2eded` |
| foreground | `oklch(0.2151 0.0518 259.4035)` | `#0a1931` |
| card | `oklch(1 0 0)` | `#ffffff` |
| muted | `oklch(0.9365 0.0158 266.2758)` | light blue-gray |
| muted-foreground | `oklch(0.4474 0.0343 261.3244)` | slate |
| destructive | `oklch(0.5858 0.2220 17.5846)` | `#e11d48` |
| border | `oklch(0.5749 0.1378 151.5333)` | `#248f4d` (green) |
| sidebar | `oklch(0.2151 0.0518 259.4035)` | `#0a1931` (dark navy) |
| sidebar-foreground | `oklch(0.9842 0.0034 247.8575)` | near-white |
| ring | `oklch(0.4284 0.1720 259.7023)` | cobalt (= primary) |

### Dark mode
| Token | OKLCH | Hex |
| --- | --- | --- |
| primary | `oklch(0.7222 0.1514 248.5089)` | `#4dabff` (sky blue) |
| secondary | `oklch(0.6785 0.2131 14.7192)` | `#ff4d6d` (rose) |
| accent | `oklch(0.5673 0.1955 16.2602)` | `#d02f4d` |
| background | `oklch(0.1107 0.0274 244.1227)` | `#00050d` (near-black blue) |
| card | `oklch(0.1728 0.0527 252.6119)` | deep navy |
| sidebar | `oklch(0.0812 0.0193 242.2089)` | darkest navy |

**Seed/primary color for Stitch:** `#0047ab`. **Accent:** green `#9effa9`.

## Typography
- **Sans (body + headings):** `Alan Sans` → in Stitch use closest modern geometric sans (DM Sans).
  Headings use the same family, weight 600.
- **Serif (display, optional):** `Playfair Display`.
- **Mono:** `DM Mono` → in Stitch use a geometric mono (JetBrains Mono / Space Mono).
- Base letter-spacing: `0.02em`.

## Shape & Spacing
- Corner radius: `--radius: 0.75rem` (12px) → Stitch roundness `ROUND_TWELVE`. Cards, buttons,
  inputs all use rounded-lg/`var(--radius)`.
- Spacing unit: `0.25rem`. Page padding `p-4` (mobile) / `p-6` (desktop). Card padding ~`p-5`.
- Shadows: soft, low-opacity. Light `0 4px 10px rgba(0,0,0,0.05)`; dark uses deeper `0 12px 25px`.

## Components & Patterns (must match existing shadcn primitives)
- **StatCard:** icon in a `bg-primary/10 text-primary` rounded-lg square (44px), label in
  muted-foreground, large semibold value, optional hint.
- **Card:** white surface, subtle border, `shadow-sm`, header (title + description) + content.
- **Badge / StatusBadge:** pill, status-colored.
- **Buttons:** primary (cobalt), outline, ghost; size sm/icon. lucide-react icons throughout.
- **Sidebar nav:** active item = `bg-primary text-primary-foreground`; inactive = muted with
  hover `bg-accent`.
- **Tables / lists:** divided rows, hover underline on links.

## Platform
Responsive web, desktop-first (1440px). Sidebar collapses below `lg` into a slide-over with a
hamburger in the top header.
