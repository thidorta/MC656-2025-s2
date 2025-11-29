# 🎨 Design System - Curriculum Tree

## Quick Color Reference

### 🌑 Base Palette
```
┌─────────────────────────────────────────┐
│ Background          #0C0C0E             │
│ Surface             #1A1A1C             │
│ Surface Elevated    #262628             │
│ Divider             rgba(255,255,255,0.08) │
└─────────────────────────────────────────┘
```

### 🔵 Accent (iOS Blue)
```
┌─────────────────────────────────────────┐
│ Primary             #4DA3FF             │
│ Soft (16%)          rgba(77,163,255,0.16) │
│ Border (35%)        rgba(77,163,255,0.35) │
│ Glow (20%)          rgba(77,163,255,0.20) │
└─────────────────────────────────────────┘
```

### 📚 Course Status Colors

#### ✅ Completed
```
Card Background: #2A3B2F (dark green)
Indicator:       #4CAF50 (professional green)
Border:          transparent
```

#### 📅 Eligible & Offered
```
Card Background: #283548 (blue-gray)
Indicator:       #4DA3FF (iOS blue)
Border:          transparent
```

#### 📭 Eligible Not Offered
```
Card Background: #2D2D38 (neutral gray)
Indicator:       #A7A7B0 (muted gray)
Border:          rgba(255,255,255,0.08)
```

#### 🔒 Not Eligible
```
Card Background: #3A2A2A (muted red)
Indicator:       #D96C6C (soft red)
Border:          transparent
```

#### 📌 Planned
```
Card Background: #1E2C3A (deep blue)
Border:          rgba(77,163,255,0.35) ← blue glow 1.5px
```

---

## 📐 Visual Specs

### Rounded Corners
```
Cards:        16px
Chips:        16px
Buttons:      14px
Modals:       24px (top only)
```

### Shadows (iOS-style, soft & large)
```
Standard Card:
  color: #000
  opacity: 0.25
  radius: 12px
  offset: (0, 4)

Tooltip:
  color: #000
  opacity: 0.4
  radius: 20px
  offset: (0, 8)

Active State:
  opacity: 0.35
  radius: 16px
```

### Spacing Scale
```
0.5  →   6px
0.7  →   8px
0.9  →  12px
1.0  →  14px
1.5  →  20px
2.0  →  28px
4.0  →  56px
```

---

## 🔤 Typography

### Headers
```
Title:        28px, 700 weight, -0.5 letter-spacing
Eyebrow:      13px, 600 weight, +0.6 letter-spacing (UPPERCASE)
Description:  14px, 400 weight, -0.1 letter-spacing
```

### Body
```
Primary:      14px, 700 weight, +0.2 letter-spacing
Secondary:    13px, 400 weight, -0.1 letter-spacing
Caption:      11px, 400 weight, -0.1 letter-spacing
```

### Text Colors
```
Primary:      #EDEDED (near-white, high contrast)
Secondary:    #BEBEBE (muted gray)
```

---

## 🎯 Icon Style

**SF Symbols inspired:**
- Thin strokes
- Monochrome
- Size: 14-22px
- Color: Matches text color

**Status Icons:**
```
✓ Completed             checkmark.circle
📅 Eligible & Offered   calendar.badge.clock
⚠️ Not Offered          calendar.badge.exclamationmark
🔒 Locked               lock.fill
📌 Planned              bookmark.fill
```

---

## 🧩 Component Patterns

### Course Chip
```tsx
<TouchableOpacity
  style={{
    backgroundColor: getBackgroundColor(),  // Status-based
    borderRadius: 16,
    padding: { vertical: 12, horizontal: 14 },
    borderWidth: 1.5,
    borderColor: getBorderColor(),  // transparent or glow
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  }}
>
  <Text style={{ color: '#EDEDED', fontSize: 14, fontWeight: '700' }}>
    {course.code}
  </Text>
</TouchableOpacity>
```

### Semester Section
```tsx
<View
  style={{
    backgroundColor: '#1A1A1C',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  }}
>
  <Text style={{ fontSize: 18, fontWeight: '600', color: '#EDEDED' }}>
    Semestre {id}
  </Text>
</View>
```

### Pill Button
```tsx
<TouchableOpacity
  style={{
    backgroundColor: '#262628',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: { vertical: 8, horizontal: 13 },
  }}
>
  <Text style={{ fontSize: 14, color: '#EDEDED' }}>
    Ver árvore completa
  </Text>
</TouchableOpacity>
```

---

## ✨ Design Principles Applied

1. **Calm Colors** - No vibrant saturation
2. **Generous Spacing** - 12-16px between elements
3. **Soft Shadows** - Large radius, low opacity
4. **Rounded Corners** - 12-16px everywhere
5. **High Contrast Text** - #EDEDED on dark backgrounds
6. **Subtle Borders** - Transparent or barely visible
7. **Single Accent** - #4DA3FF (iOS blue) only
8. **Status Distinction** - Backgrounds differentiate, not borders
9. **Professional Tones** - Muted green/red/gray, not vibrant
10. **iOS Typography** - Proper weights, letter-spacing

---

## 🚀 Implementation Files

| File | Purpose |
|------|---------|
| `styles.ts` | Global palette + base styles |
| `TreeScreen.tsx` | Main screen, legend modal, pill buttons |
| `SemesterSection.tsx` | Semester cards, headers, badges |
| `CourseChip.tsx` | Course cards with status colors |

---

**Zero Logic Changes** ✅  
All business logic, data flow, and component structure preserved.  
Only visual design updated.
