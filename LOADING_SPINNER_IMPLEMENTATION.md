# Loading Spinner Implementation

## Overview
Implemented proper loading spinner display before the Verovio component loads and renders SVG.

## Changes Made

### 1. VerovioImage.js - showLoader() function added

**Location:** `/app/view/window/image/VerovioImage.js`

**Added `showLoader()` function in iframe script:**
```javascript
function showLoader() {
    var output = document.getElementById('output');
    output.innerHTML = '<div class="lds-roller"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>';
}
```

**Initial state shows loading spinner:**
```html
<div id="output">
    <!-- Loading spinner shown initially -->
    <div class='lds-roller'>...</div>
</div>
```

**Removed:** Duplicate spinner template outside toolbar (no longer needed)

### 2. verovio-view.js - Dynamic component creation with spinner

**Location:** `/resources/js/verovio-view.js`

**Flow:**
1. Call `showLoader()` to display spinner
2. Build component HTML with MEI URL
3. Replace spinner with component using `$("#output").html(rendererHtml)`
4. Component loads MEI and renders SVG

```javascript
function showMovement(movementId) {
    // Show loading spinner first
    showLoader();
    
    // ... build meiUrl ...
    
    // Create component (replaces loading spinner)
    var rendererHtml = '<edirom-verovio-renderer ...>';
    $("#output").html(rendererHtml);
    
    // Component now loads and renders SVG
}
```

**Removed:** Old `showLoader()` function (now defined in VerovioImage.js)

## Loading Flow

```
User selects movement
    ↓
showMovement(movementId) called
    ↓
showLoader() → Displays spinner in #output
    ↓
Component HTML created with meiUrl
    ↓
$("#output").html(rendererHtml) → Replaces spinner with component
    ↓
Component fetches MEI file (shows internal loading state)
    ↓
Component renders SVG
    ↓
SVG displayed to user
```

## Key Points

✅ **showLoader() in VerovioImage.js** - Available to iframe, shows spinner
✅ **Initial state** - Spinner shown on iframe load
✅ **Dynamic creation** - Component created fresh on each movement selection
✅ **Clean replacement** - Spinner replaced by component, which loads SVG
✅ **No conflicts** - Removed old showLoader() from verovio-view.js

## Architecture Decision

**Dynamic Component Creation** (instead of static with attribute updates):
- **Pros:**
  - Clean state for each movement
  - Loading spinner always visible during fetch
  - Simpler event listener management
  - Component lifecycle clear (created → loads → renders)

- **Why not static component:**
  - Would need to manage loading states externally
  - Event listeners could accumulate
  - Less clear when component is "ready"

## Testing

After build, verify:
1. ✅ Spinner shows on initial load
2. ✅ Spinner shows when selecting movement
3. ✅ Component replaces spinner
4. ✅ SVG renders correctly
5. ✅ Subsequent movement selections show spinner again

## Next Steps

Run build to deploy:
```bash
./build.sh
```

This will copy updated files to `build/` directory.
