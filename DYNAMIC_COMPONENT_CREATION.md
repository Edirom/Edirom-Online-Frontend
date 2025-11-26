# Dynamic Component Creation - Implementation Summary

## Overview
Moved the `<edirom-verovio-renderer>` component creation from static HTML to dynamic JavaScript creation in `verovio-view.js`.

## Changes Made

### 1. VerovioImage.js (Simplified HTML)
**File:** `/app/view/window/image/VerovioImage.js`

**Before:**
```html
<div id="output">
    <div class='lds-roller'>...</div>
    <edirom-verovio-renderer 
        id="verovio-renderer"
        meiurl="${meiUrl}"
        pagenumber="1"
        ...>
    </edirom-verovio-renderer>
</div>
```

**After:**
```html
<div id="output">
    <!-- Loading spinner shown initially -->
    <div class='lds-roller'>...</div>
</div>
```

**Benefits:**
- ✅ No template literal scope issues with `${meiUrl}`
- ✅ No syntax errors from mixing JavaScript and HTML attributes
- ✅ Cleaner separation of concerns
- ✅ The HTML is now just a container

### 2. verovio-view.js (Dynamic Component Creation)
**File:** `/resources/js/verovio-view.js`

**Added Features:**
1. **Helper Functions** (lines 5-27):
   ```javascript
   function showLoader() { ... }
   function hideLoader() { ... }
   ```
   - Moved from iframe HTML to JavaScript
   - Controls spinner and component visibility

2. **Dynamic Component Creation** (lines 36-108):
   ```javascript
   function showMovement(movementId) {
       // Get or create the component
       var renderer = document.getElementById('verovio-renderer');
       var isNewComponent = false;
       
       if (!renderer) {
           // Create the component element
           renderer = document.createElement('edirom-verovio-renderer');
           renderer.setAttribute('id', 'verovio-renderer');
           renderer.setAttribute('pagenumber', '1');
           renderer.setAttribute('zoom', '33');
           renderer.setAttribute('verovio-url', '...');
           renderer.style.display = 'none';
           
           // Add it to the output div
           document.getElementById('output').appendChild(renderer);
           isNewComponent = true;
       }
       
       // Update component attributes
       renderer.setAttribute('meiurl', meiUrl);
       renderer.setAttribute('movementid', movementId);
       renderer.setAttribute('pagewidth', initWidth);
       renderer.setAttribute('pageheight', initHeight);
       
       // Add event listener only once for new components
       if (isNewComponent) {
           renderer.addEventListener('page-info-update', function(e) {
               // Update page info and hide loader
           });
       }
   }
   ```

## Architecture

```
VerovioImage.js (ExtJS Panel)
    ↓
setIFrameContent(uri, edition)
    ↓ Generates iframe HTML with:
    - Component script in <head>
    - JavaScript variables (uri, edition, appBasePath, meiUrl)
    - Empty <div id="output"> with spinner
    - verovio-view.js loaded at end
    ↓
verovio-view.js executes
    ↓
showMovement(movementId) is called
    ↓
    1. Check if component exists
    2. If not, create <edirom-verovio-renderer> dynamically
    3. Append to <div id="output">
    4. Set all attributes (meiurl, movementid, pagewidth, etc.)
    5. Add event listener for 'page-info-update'
    6. Component loads MEI and renders SVG
```

## Benefits of This Approach

### 1. **No Template Literal Issues**
- No need to pass `${meiUrl}` in HTML attributes
- Avoids scope errors between outer function and iframe context

### 2. **Clean Separation**
- HTML provides structure (container + spinner)
- JavaScript provides logic (component creation + control)

### 3. **Better Control Flow**
- Component is created only when needed (when movement is selected)
- Can easily recreate component if needed
- Event listeners added once per component instance

### 4. **Easier Debugging**
- All component logic in one place (verovio-view.js)
- Console logs show component creation and attribute updates
- Can inspect component in browser DevTools after creation

### 5. **Flexible Updates**
- Component attributes can be updated without recreating element
- If component exists, just update its attributes
- Reuses existing component for different movements

## Testing Checklist

After rebuilding (`./build.sh`):

- [ ] Component is NOT in initial HTML
- [ ] Spinner shows on page load
- [ ] When movement is selected, component is created dynamically
- [ ] Component appears in DOM inspector after creation
- [ ] MEI URL is correctly set with movementId
- [ ] SVG renders properly
- [ ] Page navigation works (prev/next)
- [ ] Measure navigation works
- [ ] Spinner hides after SVG renders
- [ ] Console logs show component creation

## Next Steps

1. Run `./build.sh` to rebuild the application
2. Test the integration:
   - Open the application
   - Select a work with movements
   - Verify component is created when movement is selected
   - Check console for debug logs
   - Test page navigation
   - Test measure highlighting

## Files Modified

1. `/app/view/window/image/VerovioImage.js` - Removed static component
2. `/resources/js/verovio-view.js` - Added dynamic component creation

## Key Code Patterns

### Creating Web Component Dynamically
```javascript
var renderer = document.createElement('edirom-verovio-renderer');
renderer.setAttribute('id', 'verovio-renderer');
renderer.setAttribute('meiurl', meiUrl);
document.getElementById('output').appendChild(renderer);
```

### Avoiding Duplicate Event Listeners
```javascript
var isNewComponent = !document.getElementById('verovio-renderer');
if (isNewComponent) {
    renderer.addEventListener('page-info-update', handler);
}
```

### Progressive Enhancement
```javascript
// Show loader immediately
showLoader();

// Create/update component
var renderer = document.getElementById('verovio-renderer') || createRenderer();
renderer.setAttribute('meiurl', newUrl);

// Hide loader when ready
renderer.addEventListener('page-info-update', () => hideLoader());
```
