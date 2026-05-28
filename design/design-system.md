# uno-online — Design System

> **Status**: Draft | Created: 2026-05-29

## 1. Design Philosophy

UNO is a colorful, lively card game. The UI should:
- Make the cards and game state the hero — large, bold, immediately readable
- Use the classic UNO colors (Red, Yellow, Green, Blue) as the primary palette
- Dark background to make the colorful cards pop
- Smooth animations for card plays and turns
- Clear, instant feedback for every interaction

---

## 2. Color Palette

### 2.1 Base Colors (Dark Theme)
```css
:root {
  /* Backgrounds */
  --bg-page: #0d1117;           /* Deep dark — page background */
  --bg-surface: #161b22;         /* Card surfaces, panels */
  --bg-elevated: #21262d;        /* Modals, dropdowns, elevated elements */
  --bg-hover: #30363d;           /* Hover states */

  /* Text */
  --text-primary: #f0f6fc;       /* Primary text — high contrast */
  --text-secondary: #8b949e;     /* Secondary text — labels, hints */
  --text-muted: #484f58;        /* Disabled, placeholder */

  /* Status */
  --success: #3fb950;           /* Win, success states */
  --error: #f85149;             /* Error, invalid move */
  --warning: #d29922;           /* UNO warning, pending */
  --info: #58a6ff;              /* Links, info states */

  /* Borders */
  --border: #30363d;            /* Default borders */
  --border-focus: #58a6ff;      /* Focus rings */
}
```

### 2.2 UNO Card Colors
```css
:root {
  /* Classic UNO colors */
  --uno-red: #E41E26;
  --uno-red-light: #ff6b6b;
  --uno-red-dark: #c0181f;

  --uno-yellow: #F9E000;
  --uno-yellow-light: #fff176;
  --uno-yellow-dark: #c7b800;

  --uno-green: #00A84F;
  --uno-green-light: #69f0ae;
  --uno-green-dark: #007d3a;

  --uno-blue: #0072CE;
  --uno-blue-light: #64b5f6;
  --uno-blue-dark: #0057a3;

  /* Card backgrounds — slightly darker than pure color */
  --card-red-bg: #b71c1c;
  --card-yellow-bg: #f9a825;
  --card-green-bg: #2e7d32;
  --card-blue-bg: #1565c0;

  /* Wild card — special black with rainbow effect */
  --card-wild-bg: #1a1a1a;
  --card-wild-border: linear-gradient(135deg, #E41E26, #F9E000, #00A84F, #0072CE);
}
```

### 2.3 Color Usage
| Element | Color |
|---------|-------|
| Page background | `--bg-page` |
| Card/surface background | `--bg-surface` |
| Primary buttons | `--uno-blue` |
| UNO Red cards | `--uno-red` |
| UNO Yellow cards | `--uno-yellow` |
| UNO Green cards | `--uno-green` |
| UNO Blue cards | `--uno-blue` |
| Wild cards | `--card-wild-bg` with gradient border |
| Your turn highlight | `--warning` |
| Win state | `--success` |
| Error/invalid | `--error` |

---

## 3. Typography

### 3.1 Font Stack
```css
/* Primary: Inter for clean, modern look */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

/* Card numbers: bold, large, highly readable */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@800;900&display=swap');

/* Monospace: for room codes, player IDs */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500&display=swap');

:root {
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}
```

### 3.2 Type Scale
```css
:root {
  --text-xs: 12px;
  --text-sm: 14px;
  --text-base: 16px;
  --text-lg: 18px;
  --text-xl: 20px;
  --text-2xl: 24px;
  --text-3xl: 32px;
  --text-4xl: 40px;
  --text-5xl: 48px;

  /* Card-specific sizes */
  --text-card-number: 32px;   /* Large number on card */
  --text-card-action: 24px;    /* Skip/Reverse/+2 text on card */
}
```

### 3.3 Font Weights
```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
--font-extrabold: 800;
--font-black: 900;
```

---

## 4. Spacing System

### 4.1 Base Unit: 4px
```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
}
```

### 4.2 Usage
| Context | Spacing |
|---------|---------|
| Card internal padding | `--space-3` (12px) |
| Card gap in hand | `--space-2` (8px) |
| Panel padding | `--space-4` (16px) |
| Section gap | `--space-6` (24px) |
| Page margin | `--space-4` mobile, `--space-8` desktop |

---

## 5. Border Radius

```css
:root {
  --radius-sm: 4px;     /* Chips, badges */
  --radius-md: 8px;     /* Buttons, inputs */
  --radius-lg: 12px;     /* Cards, panels */
  --radius-xl: 16px;     /* Modals */
  --radius-full: 9999px; /* Avatars, toggle */
}
```

---

## 6. Shadows

```css
:root {
  /* Cards */
  --shadow-card: 0 2px 8px rgba(0, 0, 0, 0.4);
  --shadow-card-hover: 0 8px 24px rgba(0, 0, 0, 0.5);

  /* Playable card glow */
  --shadow-playable: 0 0 12px rgba(255, 255, 255, 0.3);

  /* Modals */
  --shadow-modal: 0 8px 32px rgba(0, 0, 0, 0.6);

  /* Player panels */
  --shadow-panel: 0 4px 16px rgba(0, 0, 0, 0.3);
}
```

---

## 7. Breakpoints

```css
:root {
  --breakpoint-mobile: 640px;   /* 375px - 639px: phone */
  --breakpoint-tablet: 1024px;  /* 640px - 1023px: tablet */
  --breakpoint-desktop: 1280px; /* 1024px+: desktop */
}
```

### 7.1 Responsive Card Sizes
| Viewport | Card Size (md) | Hand Layout |
|----------|----------------|-------------|
| Mobile (< 640px) | 60×90px | Horizontal scroll |
| Tablet (640-1024px) | 70×105px | Horizontal, wrapped |
| Desktop (> 1024px) | 80×120px | Fan or grid |

---

## 8. Motion & Animation

### 8.1 Timing
```css
:root {
  --duration-fast: 100ms;     /* Hover, click feedback */
  --duration-normal: 200ms;   /* Transitions, modals */
  --duration-slow: 400ms;     /* Card play animations */
  --duration-celebration: 2000ms;  /* Win animation */
}
```

### 8.2 Easing
```css
:root {
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);      /* Natural deceleration */
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1); /* Smooth transitions */
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1); /* Playful overshoot */
}
```

### 8.3 Key Animations
- **Card play**: Card flies from hand to discard pile (400ms, ease-out)
- **Card draw**: Top card slides from deck to hand (200ms)
- **Turn indicator**: Pulse animation (1s infinite)
- **UNO button**: Pulsing glow when active (1s infinite)
- **Win celebration**: Confetti burst + scale-up winner card (2s)
- **Hover**: Card lifts up 4px (100ms)

---

## 9. Component Visual Specs

### 9.1 UNO Card
```
Size: 80×120px (desktop md), 60×90px (mobile)
Border-radius: 12px
Background: solid color (red/yellow/green/blue) or black (wild)
Center: Number or action text in white, bold
Border: 2px solid darker shade of card color
Shadow: --shadow-card
```

### 9.2 Player Panel
```
Background: --bg-surface
Border: 1px solid --border
Border-radius: --radius-lg
Padding: --space-4
Shows: Avatar (colored circle with initials), name, hand count badge
Current turn: Glowing border in --warning
```

### 9.3 Primary Button
```
Background: --uno-blue
Text: white, --font-semibold
Padding: 12px 24px
Border-radius: --radius-md
Hover: brightness 1.1
Active: scale 0.98
```

### 9.4 Room Card
```
Background: --bg-surface
Border: 1px solid --border
Padding: --space-4
Shows: Room name, player count (2/4), join button
Hover: border color changes to --uno-blue
```

---

## 10. Icon Library

Using Lucide icons (MIT licensed, available via CDN):
- User icon (players)
- Copy icon (share link)
- LogOut icon (leave)
- Play icon (start game)
- ChevronRight icon (direction indicator)
- MessageSquare icon (chat)
- Sparkles icon (UNO call)

---

## 11. Accessibility

- Color-blind mode: Cards show pattern + letter (R/Y/G/B) in addition to color
- Minimum contrast: 4.5:1 for text
- Focus visible: 2px ring in `--border-focus`
- Keyboard navigation: Tab through interactive elements
- Screen reader: ARIA labels on all interactive elements