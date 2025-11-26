# Edirom Verovio Renderer - Static Component Integration

## Overview
Successfully moved the `edirom-verovio-renderer` web component from dynamic creation to static HTML loading.

## Changes Made

### 1. VerovioImage.js
**File:** `/app/view/window/image/VerovioImage.js`

**Change:** Added the component element statically to the iframe HTML in `<div id="output">`

**Before:**
```html
<div id="output">
    <!-- Loading spinner shown initially -->
    <div class='lds-roller'>...</div>
</div>
```

**After:**
```html
<div id="output">
    <!-- Edirom Verovio Renderer Component loaded statically -->
    <edirom-verovio-renderer 
        id="verovio-renderer"
        meiurl=""
        pagenumber="1"
        movementid=""
        zoom="33"
        pagewidth="1200"
        pageheight="1600"
        verovio-url="https://www.verovio.org/javascript/latest/verovio-toolkit-wasm.js">
    </edirom-verovio-renderer>
</div>
```

**Key Points:**
- Component is now part of the initial HTML structure
- Initial attributes are empty/default values
- Component will be updated when `showMovement()` is called

### 2. verovio-view.js
**Files:** 
- `/resources/js/verovio-view.js`
- `/build/resources/js/verovio-view.js`

**Change:** Simplified `showMovement()` to only update existing component attributes

**Before:**
```javascript
function showMovement(movementId) {
    showLoader();
    // ... 
    var renderer = document.getElementById('verovio-renderer');
    
    if (!renderer) {
        // Dynamically create component with $("#output").html(rendererHtml)
    } else {
        // Update existing component
    }
}
```

**After:**
```javascript
function showMovement(movementId) {
    window.movementId = movementId;
    
    var initHeight = Math.floor($(document).height() * 100.0 / 33.0) - 35;
    var initWidth = Math.floor($(document).width() * 100.0 / 33.0);

    // Build MEI URL with movementId
    var meiUrl = appBasePath + "/data/xql/getMusicInMdiv.xql?uri=" + uri + "&edition=" + edition + "&movementId=" + movementId;
    
    // Get the component (it should already exist in the HTML)
    var renderer = document.getElementById('verovio-renderer');
    
    if (renderer) {
        // Update component attributes to load new movement
        renderer.setAttribute('meiurl', meiUrl);
        renderer.setAttribute('movementid', movementId);
        renderer.setAttribute('pagewidth', initWidth);
        renderer.setAttribute('pageheight', initHeight);
        
        // Store reference and listen for events
        window.verovioRenderer = renderer;
        
        // Listen for page info updates from the component
        renderer.addEventListener('page-info-update', function(e) {
            page = e.detail.pageNumber || e.detail.currentPage;
            pageCount = e.detail.totalPages;
            updatePageData();
        });
        
        // Dispatch initialization event
        setTimeout(function() {
            window.dispatchEvent(vrvToolkitDataInitialized);
        }, 500);
    } else {
        console.error('Verovio renderer component not found in DOM');
    }
}
```

**Key Changes:**
- ❌ Removed: `showLoader()` call
- ❌ Removed: Dynamic component creation with `$("#output").html(rendererHtml)`
- ❌ Removed: `if (!renderer)` branch for creation
- ✅ Added: Error logging if component is not found
- ✅ Simplified: Component is always expected to exist, only update attributes

## Architecture

### Component Lifecycle
1. **HTML Load** (VerovioImage.js)
   - Component element is created in iframe HTML
   - Initial attributes are empty (no MEI file loaded)

2. **Movement Selection** (verovio-view.js)
   - User selects a movement
   - `showMovement(movementId)` is called
   - Component's `meiurl` attribute is updated with the correct endpoint
   - Component automatically fetches and renders MEI file

3. **Attribute Updates**
   - `meiurl`: Triggers MEI file fetch and render
   - `movementid`: Used for tracking current movement
   - `pagewidth`/`pageheight`: Updates rendering dimensions
   - `pagenumber`: Triggers page navigation

### Data Flow
```
User Action (Select Movement)
    ↓
showMovement(movementId) in verovio-view.js
    ↓
Update component attributes (meiurl, movementid, etc.)
    ↓
Component fetches MEI from backend
    ↓
Component renders SVG in Shadow DOM
    ↓
Component emits 'page-info-update' event
    ↓
updatePageData() updates UI (page count, annotations)
```

## Benefits of Static Loading

1. **Simpler Code**: No conditional logic for creating vs updating component
2. **Faster Rendering**: Component is ready immediately when iframe loads
3. **Better Performance**: No DOM manipulation with `$("#output").html()`
4. **Cleaner Separation**: HTML structure in VerovioImage.js, logic in verovio-view.js
5. **Easier Debugging**: Component always exists, reducing null checks

## Testing Checklist

- [ ] Component loads in iframe on initial page load
- [ ] Selecting a movement updates the component and renders MEI
- [ ] SVG renders correctly in the Shadow DOM
- [ ] Pagination controls work (prev/next page)
- [ ] Page count displays correctly
- [ ] Measure navigation works
- [ ] Annotations display correctly
- [ ] Multiple movement switches work without errors

## Files Modified

1. `/app/view/window/image/VerovioImage.js` - Added component to HTML
2. `/resources/js/verovio-view.js` - Simplified showMovement()
3. `/build/resources/js/verovio-view.js` - Simplified showMovement()

## Next Steps

1. Test the integration in the running application
2. Verify all features work as expected
3. Check browser console for any errors
4. Verify performance improvements
