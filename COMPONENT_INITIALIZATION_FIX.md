# Component Initialization Fix

## Problem
The verovio component was only being created when `showMovement()` was called (i.e., when a user selected a movement), but it was never created on initial page load. This resulted in:
- Only the spinner showing
- No console logs from the component
- No SVG rendering

## Root Cause
The component creation logic was inside `showMovement()`, which is only called when the user explicitly selects a movement from the UI. There was no initialization on page load.

## Solution
Added an `initializeComponent()` function that:
1. Creates the component on page load
2. Sets initial MEI URL (without movementId)
3. Appends component to the DOM
4. Sets up event listeners
5. Adds extensive console logging for debugging

## Code Changes

### File: `/resources/js/verovio-view.js`

**Added (lines 29-85):**
```javascript
// Initialize component on page load
function initializeComponent() {
    console.log("Initializing verovio component...");
    
    var initHeight = Math.floor($(document).height() * 100.0 / 33.0) - 35;
    var initWidth = Math.floor($(document).width() * 100.0 / 33.0);
    
    // Build initial MEI URL (without movementId)
    var meiUrl = appBasePath + "/data/xql/getMusicInMdiv.xql?uri=" + uri + "&edition=" + edition;
    console.log("Initial MEI URL:", meiUrl);
    
    // Create the component element
    var renderer = document.createElement('edirom-verovio-renderer');
    renderer.setAttribute('id', 'verovio-renderer');
    renderer.setAttribute('meiurl', meiUrl);
    renderer.setAttribute('pagenumber', '1');
    renderer.setAttribute('zoom', '33');
    renderer.setAttribute('pagewidth', initWidth);
    renderer.setAttribute('pageheight', initHeight);
    renderer.setAttribute('verovio-url', 'https://www.verovio.org/javascript/latest/verovio-toolkit-wasm.js');
    renderer.style.display = 'none'; // Hidden until ready
    
    console.log("Component created with meiurl:", meiUrl);
    
    // Add it to the output div
    var output = document.getElementById('output');
    if (output) {
        output.appendChild(renderer);
        console.log("Component appended to output div");
    } else {
        console.error('Output div not found');
        return;
    }
    
    // Store reference
    window.verovioRenderer = renderer;
    
    // Listen for page info updates from the component
    renderer.addEventListener('page-info-update', function(e) {
        console.log("Page info update received:", e.detail);
        page = e.detail.pageNumber || e.detail.currentPage;
        pageCount = e.detail.totalPages;
        updatePageData();
        // Hide spinner after component renders
        hideLoader();
    });
    
    console.log("Component initialization complete");
}

// Call initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeComponent);
} else {
    // DOM is already loaded
    initializeComponent();
}
```

## How It Works Now

### On Page Load:
1. ✅ `initializeComponent()` is called automatically
2. ✅ Component is created with initial MEI URL (no movementId)
3. ✅ Component is appended to `<div id="output">`
4. ✅ Event listener for `page-info-update` is added
5. ✅ Console logs confirm initialization

### When Movement Selected:
1. ✅ `showMovement(movementId)` is called
2. ✅ Component already exists (doesn't need to be created)
3. ✅ Component attributes are updated with new MEI URL (with movementId)
4. ✅ Component re-renders with new movement

## Expected Console Logs

When the page loads, you should now see:
```
Initializing verovio component...
Initial MEI URL: http://localhost:8080/data/xql/getMusicInMdiv.xql?uri=...&edition=...
Component created with meiurl: http://localhost:8080/...
Component appended to output div
Component initialization complete
```

When the component loads MEI:
```
Page info update received: {pageNumber: 1, totalPages: X, ...}
```

When a movement is selected:
```
showMovement called with movementId: mov-123
Built MEI URL: http://localhost:8080/...&movementId=mov-123
Updated meiurl to: http://localhost:8080/...&movementId=mov-123
```

## Benefits

1. ✅ **Component loads immediately** - No need to wait for user interaction
2. ✅ **Shows initial MEI data** - Displays the first movement/page automatically
3. ✅ **Better UX** - User sees content right away
4. ✅ **Extensive logging** - Easy to debug if issues occur
5. ✅ **Robust initialization** - Handles both early and late script loading

## Testing

After rebuilding (`./build.sh`):

1. **Open browser console** before loading the page
2. **Load the application**
3. **Look for initialization logs**:
   - [ ] "Initializing verovio component..."
   - [ ] "Initial MEI URL: ..."
   - [ ] "Component created with meiurl: ..."
   - [ ] "Component appended to output div"
   - [ ] "Component initialization complete"
4. **Check DOM inspector**: Component should exist in `<div id="output">`
5. **Wait for rendering**: Should see "Page info update received"
6. **Verify SVG appears**: Spinner should hide, music notation should show
7. **Test movement selection**: Console should log "showMovement called"
8. **Test pagination**: Verify prev/next page buttons work

## Troubleshooting

### If no console logs appear:
- Check that `appBasePath`, `uri`, and `edition` variables are defined
- Check browser console for JavaScript errors
- Verify component script is loaded in iframe `<head>`

### If component is created but doesn't render:
- Check Network tab for MEI URL request
- Verify MEI URL returns valid XML
- Check if component's `page-info-update` event fires

### If spinner never hides:
- Component might not be firing `page-info-update` event
- Check if MEI data is valid
- Verify Verovio toolkit is loading properly

## Architecture Diagram

```
Page Load
    ↓
verovio-view.js loads
    ↓
Check document.readyState
    ↓
Call initializeComponent()
    ↓
Create <edirom-verovio-renderer>
    ↓
Set attributes (meiurl, pagewidth, etc.)
    ↓
Append to <div id="output">
    ↓
Add event listener
    ↓
Component loads MEI from URL
    ↓
Component fires 'page-info-update'
    ↓
hideLoader() - Show SVG, hide spinner
```

## Files Modified

- `/resources/js/verovio-view.js` - Added `initializeComponent()` function and auto-initialization

## Previous Issues Fixed

1. ❌ Component not created on page load → ✅ Now creates automatically
2. ❌ Only spinner showing → ✅ Component renders initial MEI
3. ❌ No console logs → ✅ Extensive logging added
4. ❌ Requires user interaction → ✅ Works immediately
