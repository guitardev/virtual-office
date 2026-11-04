# Plan: BG Remove Professional Refinement Suite (/tools/bgremove)

**Goal:** Implement best-practice fine-tuning and refinement capabilities in `/tools/bgremove`, including interactive Touch-up Brushes (Erase & Restore), Edge Feathering, Civil Service ID Card Aspect Ratios (1, 1.5, 2 inch), Studio Drop Shadow, and Before/After Split Slider.

---

## 1. Features to Implement

### 1.1 Interactive Touch-up Brushes (Manual Refinement)
- **🖌️ Restore Brush:** Restore original pixels by painting over regions accidentally clipped (e.g. uniform rank insignia, hair strands, collar).
- **🧼 Erase Brush:** Erase stray background remnants or halos.
- **Brush Size Control:** Slider (5px to 60px) with circular cursor indicator.
- **Undo / Reset:** Reset manual brush strokes back to auto-cut state.

### 1.2 Edge Feathering & Anti-Aliasing
- Soft edge alpha smoothing (feather slider 0 - 5px) using Gaussian/box blur on the mask edges.

### 1.3 Thai Civil Service ID Card Aspect Ratio Presets
- **Original / Free:** Preserve source proportions.
- **1 นิ้ว:** 3:4 aspect ratio (2.5 x 3.25 cm).
- **1.5 นิ้ว:** 3:4 aspect ratio (3.0 x 4.0 cm - Thai Civil Service standard).
- **2 นิ้ว:** 4:5 aspect ratio (4.0 x 5.0 cm).
- Auto-centering & crop frame on export.

### 1.4 Studio Soft Drop Shadow
- Optional subtle ambient studio shadow behind subject when rendered on white or official blue background.

### 1.5 Interactive Before/After Split Slider
- Drag-to-compare split view comparing the original photo with the cutout in real-time.

---

## 2. Architecture & Performance
- All processing done 100% client-side via HTML5 Canvas (zero server data transmission, PDPA-compliant).
- Mask representation: `Uint8ClampedArray` mask (0 = bg, 255 = fg, in-between = feather/semi-transparent).
- Brushes paint directly onto the mask, preserving original pixel data underneath.

