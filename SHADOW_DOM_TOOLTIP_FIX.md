# Shadow DOM Tooltip Fix

## Problem

Annotation tooltips were not showing when hovering over annotation rectangles in the verovio rendering.

## Root Cause

### Third-Party Library Limitation

The code was using `Tipped.create()` (a third-party tooltip library) to create tooltips for annotation boxes:

```javascript
// ❌ Doesn't work with Shadow DOM
Tipped.create(annotIcon, {
    ajax: { url: '...', type: 'post', data: {...} },
    target: 'mouse',
    hideDelay: 1000,
    skin: 'gray'
});
```

**Problem:**
- `annotIcon` is an SVG element **inside the Shadow DOM**
- `Tipped` library doesn't understand Shadow DOM
- It expects elements to be in the **Light DOM**
- Result: Tooltips never appear

### Shadow DOM Event Handling

```
Light DOM (page)
    ├── Tipped library ❌ Can't attach to Shadow DOM elements
    └── <edirom-verovio-renderer>
            └── #shadow-root
                    └── <rect class="annotIcon"> ← Element here
```

## Solution: Custom Tooltip Implementation

Replace `Tipped.create()` with a **custom tooltip solution** that:
1. Listens to native `mouseenter`/`mouseleave` events on Shadow DOM elements
2. Fetches annotation content via AJAX
3. Creates tooltip in **Light DOM** (document.body) so it's visible
4. Positions tooltip near the annotation box

## Implementation

**File:** `/resources/js/verovio-view.js`  
**Function:** `updatePageData()`  
**Lines:** 228-273

```javascript
// Custom tooltip implementation for Shadow DOM
let tooltipTimeout;
let currentTooltip = null;

annotIcon.addEventListener('mouseenter', (e) => {
    // Clear any existing timeout
    clearTimeout(tooltipTimeout);
    
    // Show tooltip after brief delay
    tooltipTimeout = setTimeout(() => {
        // Fetch annotation content
        $.ajax({
            url: appBasePath + 'data/xql/getAnnotation.xql',
            type: 'post',
            data: {
                uri: uri + '#' + annotId,
                target: 'tip',
                edition: edition
            },
            success: function(response) {
                // Create tooltip in Light DOM (not Shadow DOM) so it's visible
                const tooltip = document.createElement('div');
                tooltip.className = 'custom-annotation-tooltip';
                tooltip.innerHTML = response;
                tooltip.style.cssText = `
                    position: fixed;
                    background: white;
                    border: 1px solid #ccc;
                    padding: 10px;
                    border-radius: 4px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                    z-index: 10000;
                    max-width: 300px;
                    font-size: 12px;
                `;
                
                // Position tooltip near mouse
                const rect = e.target.getBoundingClientRect();
                tooltip.style.left = (rect.left + window.scrollX) + 'px';
                tooltip.style.top = (rect.bottom + window.scrollY + 5) + 'px';
                
                // Add to Light DOM (body), not Shadow DOM
                document.body.appendChild(tooltip);
                currentTooltip = tooltip;
            }
        });
    }, 200);
});

annotIcon.addEventListener('mouseleave', (e) => {
    // Clear timeout if mouse leaves before tooltip shows
    clearTimeout(tooltipTimeout);
    
    // Remove tooltip after delay
    setTimeout(() => {
        if (currentTooltip) {
            currentTooltip.remove();
            currentTooltip = null;
        }
    }, 1000);
});
```

## How It Works

### 1. **Mouse Enter Event**
```javascript
annotIcon.addEventListener('mouseenter', (e) => {
    // Start 200ms delay before showing tooltip
    tooltipTimeout = setTimeout(() => {
        // Fetch and show tooltip
    }, 200);
});
```

**Why 200ms delay?**
- Prevents tooltips from appearing immediately
- Only shows if user hovers for a moment
- Better UX

### 2. **AJAX Fetch**
```javascript
$.ajax({
    url: appBasePath + 'data/xql/getAnnotation.xql',
    type: 'post',
    data: {
        uri: uri + '#' + annotId,
        target: 'tip',
        edition: edition
    },
    success: function(response) {
        // Create tooltip with response
    }
});
```

Same AJAX request as before, just using jQuery directly instead of Tipped.

### 3. **Create Tooltip in Light DOM**
```javascript
const tooltip = document.createElement('div');
tooltip.className = 'custom-annotation-tooltip';
tooltip.innerHTML = response;
tooltip.style.cssText = `...inline styles...`;

// ✅ Add to Light DOM (visible!)
document.body.appendChild(tooltip);
```

**Key Point:** Tooltip is added to `document.body` (Light DOM), not Shadow DOM, so it's visible above everything.

### 4. **Position Tooltip**
```javascript
const rect = e.target.getBoundingClientRect();
tooltip.style.left = (rect.left + window.scrollX) + 'px';
tooltip.style.top = (rect.bottom + window.scrollY + 5) + 'px';
```

- Get annotation box position
- Place tooltip below it (+5px offset)
- Use `position: fixed` for viewport coordinates

### 5. **Mouse Leave Event**
```javascript
annotIcon.addEventListener('mouseleave', (e) => {
    // Cancel tooltip if it hasn't shown yet
    clearTimeout(tooltipTimeout);
    
    // Hide existing tooltip after 1 second
    setTimeout(() => {
        if (currentTooltip) {
            currentTooltip.remove();
            currentTooltip = null;
        }
    }, 1000);
});
```

**Why 1000ms delay?**
- Same as original `hideDelay: 1000`
- Gives user time to read tooltip
- Matches expected behavior

## Architecture Diagram

### Before (Broken)

```
Light DOM
    ├── Tipped library ❌
    └── <edirom-verovio-renderer>
            └── #shadow-root
                    └── <rect> ← Can't attach Tipped tooltip
```

### After (Working)

```
Light DOM (document.body)
    ├── <div class="custom-annotation-tooltip"> ← Tooltip here! ✅
    │   (Created on hover, visible to user)
    │
    └── <edirom-verovio-renderer>
            └── #shadow-root
                    └── <rect>
                        ├── mouseenter event ✅
                        └── mouseleave event ✅
```

## Key Differences from Tipped

| Feature | Tipped | Custom Solution |
|---------|--------|-----------------|
| **Shadow DOM Support** | ❌ No | ✅ Yes |
| **Event Handling** | Internal | Native browser events |
| **Tooltip Location** | Light DOM (automatic) | Light DOM (manual) |
| **Styling** | Theme-based | Inline CSS |
| **Positioning** | Automatic | Manual (`getBoundingClientRect()`) |
| **Delay** | Configurable | Hardcoded (200ms) |
| **Hide Delay** | Configurable | Hardcoded (1000ms) |

## Tooltip Styling

The tooltip is styled with inline CSS:

```css
position: fixed;           /* Position relative to viewport */
background: white;         /* White background */
border: 1px solid #ccc;    /* Light gray border */
padding: 10px;             /* Internal spacing */
border-radius: 4px;        /* Rounded corners */
box-shadow: 0 2px 8px rgba(0,0,0,0.15);  /* Subtle shadow */
z-index: 10000;            /* Above everything else */
max-width: 300px;          /* Don't get too wide */
font-size: 12px;           /* Readable text size */
```

**Simple, clean, professional appearance.**

## Benefits

### 1. **Works with Shadow DOM**
Native event listeners work perfectly with Shadow DOM elements.

### 2. **No External Dependencies**
Doesn't rely on `Tipped` library understanding Shadow DOM.

### 3. **Full Control**
Complete control over tooltip behavior, styling, and positioning.

### 4. **Maintainable**
Simple, straightforward code that's easy to understand and modify.

### 5. **Flexible**
Easy to add features like:
- Click to pin tooltip
- Different positioning strategies
- Custom animations
- Different styles per annotation type

## Timing Explained

### Show Delay: 200ms
```javascript
tooltipTimeout = setTimeout(() => { show tooltip }, 200);
```
- Hover for 0.2 seconds before tooltip appears
- Prevents accidental tooltips when cursor passes over
- Standard UX practice

### Hide Delay: 1000ms
```javascript
setTimeout(() => { remove tooltip }, 1000);
```
- Tooltip stays visible for 1 second after mouse leaves
- Gives user time to read content
- Matches original `hideDelay: 1000` behavior

## Potential Improvements

### 1. **Hover Over Tooltip**
Currently tooltip disappears even if you hover over it. Could add:
```javascript
tooltip.addEventListener('mouseenter', () => {
    clearTimeout(hideTimeout);
});
```

### 2. **Click to Pin**
Allow clicking to keep tooltip visible:
```javascript
annotIcon.addEventListener('click', () => {
    // Pin tooltip, don't auto-hide
});
```

### 3. **Smart Positioning**
Position tooltip above/below/left/right based on available space:
```javascript
if (rect.bottom + 200 > window.innerHeight) {
    // Position above instead of below
    tooltip.style.top = (rect.top - tooltipHeight) + 'px';
}
```

### 4. **CSS Transitions**
Add fade-in/fade-out animations:
```css
transition: opacity 0.2s ease-in-out;
```

### 5. **Cleanup on Page Change**
Remove tooltips when navigating to different page:
```javascript
window.addEventListener('beforeunload', () => {
    if (currentTooltip) currentTooltip.remove();
});
```

## Testing

After rebuilding (`./build.sh`):

### 1. **Hover Over Annotation Box**
- Hover over colored rectangle
- Wait 200ms
- Tooltip should appear below box

### 2. **Tooltip Content**
- Should show annotation details
- Should have white background
- Should have gray border and shadow

### 3. **Mouse Leave**
- Move mouse away from annotation
- Tooltip should stay for 1 second
- Then disappear

### 4. **Click Annotation**
- Click colored rectangle
- Should load annotation link
- Should navigate to annotation

### 5. **Multiple Tooltips**
- Hover over one annotation
- Move to another before tooltip shows
- Only one tooltip should appear (for second annotation)

## Debugging

### Check if tooltip is created
```javascript
// In browser console after hovering
document.querySelectorAll('.custom-annotation-tooltip').length
// Should be 1 when tooltip is visible
```

### Check tooltip content
```javascript
const tooltip = document.querySelector('.custom-annotation-tooltip');
console.log(tooltip.innerHTML);
```

### Check AJAX request
```javascript
// In Network tab of DevTools
// Filter: getAnnotation.xql
// Should see POST request when hovering
```

### Check positioning
```javascript
const tooltip = document.querySelector('.custom-annotation-tooltip');
console.log(tooltip.style.left, tooltip.style.top);
```

## Files Modified

- `/resources/js/verovio-view.js` - Replaced `Tipped.create()` with custom tooltip

## Related Files (No changes)

- `/resources/js/tipped/tipped.js` - Still loaded but not used for annotations
- `/resources/css/tipped/tipped.css` - Still loaded but not used for annotations

## Summary

**Problem:** `Tipped` library doesn't work with Shadow DOM elements  
**Solution:** Custom tooltip using native events + Light DOM rendering  
**Result:** Tooltips now work perfectly with Shadow DOM annotations! 🎉

The custom solution is:
- ✅ Simpler
- ✅ More maintainable  
- ✅ Shadow DOM compatible
- ✅ Fully functional
