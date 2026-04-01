# Solar System Explorer — Design Brief

## Overview
A browser-based first-person space exploration game where the player flies through a to-scale solar system. The entire UI is an overlay on a 3D viewport showing deep space. The aesthetic should feel like a blend of NASA mission control and a modern sci-fi game HUD — functional, minimal, and beautiful against the blackness of space.

## Screen Layout

```
┌─────────────────────────────────────────────────────────┐
│ [Speed: 3x c]                    [1.52 AU from Earth]  │
│                                   [12.6 light-min]     │
│                                                         │
│  ◄ Mars                                                 │
│    0.52 AU                                              │
│                                                         │
│                        +                                │
│                                                         │
│                                  Jupiter 4.2 AU ►       │
│                                                         │
│                                                         │
│ [Tab] Destinations                     [?] Controls     │
└─────────────────────────────────────────────────────────┘
```

---

## Elements Requiring Art Direction

### 1. Start Screen / Overlay
- Full-screen overlay shown before gameplay begins
- Title: "Solar System Explorer"
- Subtitle/tagline
- "Click to Start" button (required — browser needs a user gesture for pointer lock)
- Loading progress bar (appears while textures load)
- Should feel cinematic — maybe a subtle starfield or planet in the background

### 2. Crosshair / Reticle
- Center of screen, always visible
- Needs to be readable against both black space and bright planet surfaces
- Should feel navigational, not aggressive (this isn't a shooter)

### 3. Speed Indicator (top-left)
- Displays current speed: "1x c" through "10x c" (multiples of the speed of light)
- Needs to be glanceable while flying
- Should visually communicate the magnitude — 10x should feel different from 1x
- Consider a small bar/gauge alongside the number

### 4. Distance Display (top-right)
- Distance from Earth, updated in real-time
- Dual units: AU (astronomical units) as primary, light-minutes/light-hours as secondary
- Numbers change rapidly while moving — needs a font/style that's readable at speed
- Consider adaptive formatting: "0.003 AU" near Earth → "30.1 AU" near Neptune

### 5. Navigation Arrows (screen edges)
- When a planet is off-screen, an arrow appears at the screen edge pointing toward it
- Each arrow needs: planet name label, distance, and the arrow itself
- Color-coded per planet (suggest palette below)
- Arrows should be semi-transparent so they don't dominate the view
- Clickable — clicking warps you to that planet
- When a planet IS on-screen, replace the edge arrow with a floating label near the planet

### 6. On-Screen Planet Labels
- When a planet is visible in the 3D viewport, show its name + distance floating near it
- Should scale/fade based on distance — prominent when close, subtle when far
- Clickable to warp
- Need to handle overlap when multiple planets are in similar directions

### 7. Warp Menu / Destinations Panel
- Toggled with Tab key
- Lists all planets with: name, current distance from player, icon/color swatch
- Click any entry to warp there
- Should appear as a panel (left side? center?) without fully obscuring the view
- Needs an open/close animation
- Consider showing a mini solar system diagram

### 8. Warp Transition Effect
- When warping to a planet, brief visual transition (not instant teleport)
- Suggest: quick fade to black, then fade in at destination
- Or: streak/motion blur effect suggesting faster-than-light travel
- Duration: ~300-500ms

### 9. Controls Help Overlay
- Shown on first play, dismissible, re-openable with "?" key
- Lists: WASD (move), Mouse (look), 1-0 keys (speed), Tab (destinations), Click arrow (warp)
- Should feel like a tooltip layer, not a full modal

### 10. Orbital Path Lines
- Colored ellipses in 3D space showing each planet's orbital path
- Semi-transparent, thin lines
- Color should match each planet's assigned color
- Visible enough to orient yourself, subtle enough to not clutter the view

### 11. Proximity Bubble Feedback
- When you hit a planet's proximity boundary (can't fly closer), some visual feedback
- Subtle — maybe a brief shimmer, a HUD flash, or the crosshair changing color
- Should communicate "you've reached the closest viewing distance"

### 12. Planet Visual Treatment
- Planets use real NASA texture maps (2K resolution)
- The Sun should glow — needs a bloom/glow sprite effect around it
- Saturn needs visible rings with transparency
- Consider: should planets have a subtle atmosphere halo? (Earth, Venus, Neptune)

### 13. Starfield / Space Background
- Deep space background — thousands of stars
- Should not parallax (stars are at infinity)
- Consider a subtle Milky Way band for orientation
- Stars should feel like points of light, not noisy

---

## Suggested Planet Color Palette
These colors are used for orbit lines, navigation arrows, and UI labels:

| Planet   | Suggested Color | Notes |
|----------|----------------|-------|
| Mercury  | Gray           | Rocky, cratered |
| Venus    | Warm yellow    | Sulfuric clouds |
| Earth    | Blue           | Oceans |
| Mars     | Red-orange     | Iron oxide |
| Jupiter  | Tan/amber      | Gas bands |
| Saturn   | Gold           | Rings and atmosphere |
| Uranus   | Cyan/teal      | Ice giant |
| Neptune  | Deep blue      | Ice giant |
| Sun      | Bright yellow  | Central star |

---

## Typography Considerations
- All HUD text renders over a 3D space scene (mostly dark)
- Needs excellent readability at small sizes
- Monospaced or tabular figures for numbers that update rapidly (distance, speed)
- Consider a subtle text shadow or backdrop blur for legibility against bright planets

## Responsive Considerations
- Primary target: desktop browsers (keyboard + mouse required for gameplay)
- HUD elements should scale reasonably for different monitor sizes
- Minimum viable resolution: 1280x720

---

## Deliverables Needed
1. **Color palette** — HUD accent colors, planet colors, text colors, overlay backgrounds
2. **Typography** — font selections for HUD, overlays, labels (web fonts or system fonts)
3. **HUD element designs** — speed indicator, distance display, crosshair, navigation arrows, planet labels
4. **Start screen** — layout and visual treatment
5. **Warp menu** — panel design with planet list
6. **Transition effects** — warp animation concept, proximity bubble feedback
7. **Controls overlay** — help screen layout
8. **General art direction** — the overall mood/feeling (NASA realism? Sci-fi game? Minimal/clean?)
