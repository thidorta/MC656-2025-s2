# 🎨 Curriculum Tree Screen - Visual Redesign

## iOS-Inspired Minimal Dark Theme

This document describes the complete visual redesign of the curriculum tree screen following **iOS Human Interface Guidelines** with a focus on calm, neutral colors, minimalism, and elegant typography.

---

## 🎯 Design Principles

✓ **Calm & Soft Colors** - No vibrant saturation, muted professional tones  
✓ **Minimalism** - Generous spacing, visual breathing room, clarity  
✓ **iOS HIG** - Rounded corners (12-16px), subtle shadows, SF Symbols style icons  
✓ **High Contrast** - Near-white text on dark backgrounds  
✓ **No Skeuomorphism** - Clean, flat, modern aesthetic  
✓ **Subtle Borders** - Transparent or barely visible (rgba)  

---

## 🎨 New Color Palette

### Base Colors (Global)
```typescript
background:        #0C0C0E  // Deep muted charcoal
surface:           #1A1A1C  // Card backgrounds
surfaceElevated:   #262628  // Elevated elements
border:            rgba(255,255,255,0.08)  // Subtle dividers
textPrimary:       #EDEDED  // High contrast white
textSecondary:     #BEBEBE  // Muted gray for labels
```

### Accent Color (Single Source of Truth)
```typescript
accent:      #4DA3FF  // Calm iOS blue
accentSoft:  rgba(77,163,255,0.16)  // 16% opacity background
accentBorder: rgba(77,163,255,0.35)  // 35% opacity border
accentGlow:  rgba(77,163,255,0.20)  // 20% opacity glow
```

### Status Colors (Disciplines)

#### 🟢 Completed
```typescript
background: #2A3B2F  // Subtle dark green
chip:       #4CAF50  // Professional green indicator
border:     transparent
icon:       checkmark.circle
```

#### 🔵 Eligible & Offered
```typescript
background: #283548  // Calm blue-gray
chip:       #4DA3FF  // iOS blue
border:     transparent
icon:       calendar.badge.clock
```

#### ⚪ Eligible Not Offered
```typescript
background: #2D2D38  // Neutral dark gray
chip:       #A7A7B0  // Muted gray indicator
border:     rgba(255,255,255,0.08)  // Subtle outline
icon:       calendar.badge.exclamationmark
```

#### 🔴 Not Eligible (Locked)
```typescript
background: #3A2A2A  // Muted dark red
chip:       #D96C6C  // Soft red indicator
border:     transparent
icon:       lock.fill
```

#### 📌 Planned (User Selection)
```typescript
background: #1E2C3A  // Deep blue-gray
border:     rgba(77,163,255,0.35)  // Blue glow (1.5px)
icon:       bookmark.fill
```

---

## 🧱 Component Visual Specs

### Course Card (Chip)
```typescript
{
  borderRadius: 16,
  padding: { vertical: 12, horizontal: 14 },
  spacing: 8,  // Between rows
  borderWidth: 1.5,
  
  // Soft shadow (iOS-style)
  shadowColor: '#000',
  shadowOpacity: 0.25,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  
  // Planned courses special treatment
  plannedBorder: {
    borderColor: 'rgba(77,163,255,0.35)',
    borderWidth: 1.5,
  }
}
```

### Semester Section Card
```typescript
{
  background: #1A1A1C,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.05)',
  
  titleTypography: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  
  badgeTypography: {
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  
  cardSpacing: 12,  // Between cards
}
```

### Tree Visualization
```typescript
{
  connectingLines: {
    strokeColor: 'rgba(255,255,255,0.12)',
    strokeWidth: 1.2,
    lineCap: 'round',
  },
  
  childIndent: 16,  // iOS mail thread style
}
```

### Legend Modal
```typescript
{
  overlay: {
    background: 'rgba(0,0,0,0.65)',  // Blurred dark backdrop
  },
  
  card: {
    background: '#1F1F22',
    borderRadius: 24,  // Top corners only
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 24,
  },
  
  dots: {
    size: 20,
    borderRadius: 10,
    // Uses same status palette colors
  }
}
```

### Buttons (Pills)
```typescript
{
  background: #262628,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.08)',
  padding: { vertical: 8, horizontal: 13 },
  
  activeState: {
    background: 'rgba(77,163,255,0.16)',
    borderColor: '#4DA3FF',
  }
}
```

### NavBar
```typescript
{
  height: 48,
  background: 'transparent',
  borderBottom: {
    width: 1,
    color: 'rgba(255,255,255,0.06)',
  },
  
  titleTypography: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  }
}
```

---

## 📏 Typography System

### Headers
```typescript
headerTitle: {
  fontSize: 28,
  fontWeight: '700',
  letterSpacing: -0.5,
  color: #EDEDED,
}

headerEyebrow: {
  fontSize: 13,
  letterSpacing: 0.6,
  textTransform: 'uppercase',
  color: #BEBEBE,
}

headerDescription: {
  fontSize: 14,
  lineHeight: 20,
  letterSpacing: -0.1,
  color: #BEBEBE,
}
```

### Body Text
```typescript
primary: {
  fontSize: 14,
  fontWeight: '700',
  letterSpacing: 0.2,
  color: #EDEDED,
}

secondary: {
  fontSize: 13,
  letterSpacing: -0.1,
  color: #BEBEBE,
}

caption: {
  fontSize: 11,
  letterSpacing: -0.1,
  color: #BEBEBE,
}
```

---

## 🎛️ Spacing System

All spacing uses base multiplier `n`:

```typescript
spacing(0.5) = 6px   // Tight elements
spacing(0.7) = 8px   // Button padding
spacing(0.9) = 12px  // Card gaps
spacing(1.0) = 14px  // Standard spacing
spacing(1.5) = 20px  // Section spacing
spacing(2.0) = 28px  // Large gaps
spacing(4.0) = 56px  // Bottom padding
```

---

## 🧩 Shadow System

### Soft Shadow (Cards)
```typescript
{
  shadowColor: '#000',
  shadowOpacity: 0.25,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 6,  // Android
}
```

### Elevated Shadow (Tooltip)
```typescript
{
  shadowColor: '#000',
  shadowOpacity: 0.4,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 8 },
  elevation: 12,  // Android
}
```

### Active State Shadow
```typescript
{
  shadowOpacity: 0.35,
  shadowRadius: 16,
}
```

---

## ✅ What Changed

### Visual Only (No Logic Modified)

✅ **Palette**: Replaced vibrant colors with calm, professional tones  
✅ **Typography**: iOS-style font sizes, weights, letter-spacing  
✅ **Spacing**: Increased breathing room (12-16px between cards)  
✅ **Shadows**: Soft, large-radius shadows for depth  
✅ **Borders**: Subtle transparent/rgba borders  
✅ **Icons**: SF Symbols style (thin, monochrome)  
✅ **Status Colors**: Distinct but muted (no vibrant red/green/yellow)  
✅ **Legend**: Blurred backdrop with refined card  
✅ **Pills**: Elevated surface with accent active state  

### Preserved

✅ **Component structure** - Same files, same props  
✅ **Business logic** - Status calculation unchanged  
✅ **Data flow** - Backend integration intact  
✅ **Layout** - Flexbox, expand/collapse, modals  
✅ **Functionality** - Course selection, tooltips, tree navigation  

---

## 🚀 Usage

The new design system is automatically applied. No changes to component usage required.

```typescript
// All components use new palette automatically
import { palette, spacing } from '../styles';

// Colors are now calm and iOS-inspired
backgroundColor: palette.completedBg  // #2A3B2F instead of #55CC55
textColor: palette.text               // #EDEDED instead of #E8ECF5
```

---

## 📊 Before vs After

| Element | Before | After |
|---------|--------|-------|
| Background | `#0B0B0F` | `#0C0C0E` |
| Accent | `#33E1D3` (cyan) | `#4DA3FF` (iOS blue) |
| Completed | `#55CC55` (bright green) | `#4CAF50` chip on `#2A3B2F` bg |
| Eligible Offered | `#FFFF66` (bright yellow) | `#4DA3FF` chip on `#283548` bg |
| Not Eligible | `#FF6666` (bright red) | `#D96C6C` chip on `#3A2A2A` bg |
| Border Radius | `12-14px` | `14-16px` |
| Shadow | `0.35 opacity, 16px radius` | `0.25-0.4 opacity, 12-20px radius` |
| Typography | Mixed sizes | iOS-style hierarchy |

---

## 🎨 Design Philosophy

**Calm Over Vibrant**  
Colors are intentionally desaturated for reduced visual fatigue.

**Space Over Density**  
Generous padding and gaps create visual breathing room.

**Subtle Over Bold**  
Borders and shadows are soft, never harsh.

**Hierarchy Over Uniformity**  
Typography system establishes clear information hierarchy.

**Minimal Over Decorative**  
No unnecessary visual elements, pure function.

---

**Status**: ✅ Complete  
**Platform**: React Native (iOS + Android)  
**Design System**: iOS Human Interface Guidelines  
**Accessibility**: High contrast maintained  
**Performance**: No impact (visual only)
