# Verovio Component Integration Complete

**Date**: November 19, 2025

## Summary

Successfully integrated the `edirom-verovio-renderer` web component into the Edirom Online Frontend, replacing the legacy AJAX + Verovio toolkit approach with a modern, encapsulated web component.

---

## Changes Made

### 1. Component Script Added to Project (`index.html`)

**File**: `index.html` and `build/index.html`

Added the component script before the application loads:
```html
<!-- **Verovio Renderer** -->
<script src="resources/js/edirom-verovio-renderer/edirom-verovio-renderer-component.js" type="text/javascript"></script>
```

**Location**: After ACE editor scripts, before ExtJS bootstrap

---

### 2. Component Loaded in IFrame (`VerovioImage.js`)

**File**: `app/view/window/image/VerovioImage.js`

Added component script to the iframe HTML (line ~56):
```javascript
<!-- Edirom Verovio Renderer Component -->
<script
    src="resources/js/edirom-verovio-renderer/edirom-verovio-renderer-component.js"
    type="text/javascript"></script>
```

**Purpose**: Makes the web component available inside the iframe where Verovio rendering happens.

---

### 3. Refactored Rendering Logic (`verovio-view.js`)

**File**: `resources/js/verovio-view.js`

#### Old Approach (AJAX + Verovio Toolkit):
```javascript
window.vrvToolkit = new verovio.toolkit();

function showMovement(movementId) {
    var url = appBasePath + "/data/xql/getMusicInMdiv.xql?uri=" + uri + "&edition=" + edition + "&movementId=" + movementId;
    $.get(url, function(data) {
        var svg = vrvToolkit.renderData(data, options);
        $("#output").html(svg);
        initData();
    }, 'text');
}
```

#### New Approach (Web Component):
```javascript
window.verovioRenderer = null;

function showMovement(movementId) {
    var meiUrl = appBasePath + "/data/xql/getMusicInMdiv.xql?uri=" + uri + "&edition=" + edition + "&movementId=" + movementId;
    
    var verovioOptions = {
        breaks: 'auto',
        scale: 33,
        spacingStaff: 7,
        pageHeight: initHeight,
        pageWidth: initWidth,
        footer: 'none',
        header: 'none',
        svgHtml5: true,
        svgBoundingBoxes: true
    };
    
    var rendererHtml = '<edirom-verovio-renderer ' +
        'meiurl="' + meiUrl + '" ' +
        'pagenumber="1" ' +
        'movementid="' + movementId + '" ' +
        'zoom="33" ' +
        'height="100%" ' +
        'width="100%" ' +
        'pagewidth="' + initWidth + '" ' +
        'pageheight="' + initHeight + '" ' +
        'verovio-url="https://www.verovio.org/javascript/latest/verovio-toolkit-wasm.js" ' +
        'verovio-options=\'' + JSON.stringify(verovioOptions) + '\'' +
        '></edirom-verovio-renderer>';
    
    $("#output").html(rendererHtml);
    
    // Listen for component events
    setTimeout(function() {
        window.verovioRenderer = document.getElementById('verovio-renderer');
        if (window.verovioRenderer) {
            window.verovioRenderer.addEventListener('page-info-update', function(e) {
                page = e.detail.currentPage;
                pageCount = e.detail.totalPages;
                updatePageData();
            });
            window.dispatchEvent(vrvToolkitDataInitialized);
        }
    }, 500);
}
```

---

### 4. Updated Navigation Functions

#### **Previous/Next Page**:
```javascript
// Old:
function prevPage() {
    page--;
    var svg = vrvToolkit.renderToSVG(page);
    $("#output").html(svg);
    updatePageData();
}

// New:
function prevPage() {
    if(page == 1) return;
    if (window.verovioRenderer) {
        window.verovioRenderer.setAttribute('pagenumber', page - 1);
    }
}
```

#### **Show Measure**:
```javascript
// Old:
function showMeasure(movementId, measureId) {
    if(vrvToolkit.getPageWithElement(measureId) == 0) {
        showMovement(movementId);
    } else {
        page = vrvToolkit.getPageWithElement(measureId);
        showPage();
    }
}

// New:
function showMeasure(movementId, measureId) {
    if (window.verovioRenderer) {
        if(window.movementId != movementId) {
            showMovement(movementId);
        } else {
            window.verovioRenderer.setAttribute('elementid', measureId);
        }
    }
}
```

---

## Benefits of the New Approach

### ✅ **Encapsulation**
- All Verovio logic is encapsulated in the web component
- Cleaner separation of concerns
- Easier to maintain and update

### ✅ **Modern Architecture**
- Uses Web Components standard (Custom Elements API)
- Reactive attribute-based API
- Event-driven communication

### ✅ **Better Performance**
- Component handles its own rendering lifecycle
- Automatic page updates via events
- No manual SVG manipulation needed

### ✅ **Simplified Code**
- No need to manually manage Verovio toolkit instance
- No AJAX callbacks to handle
- No manual page count tracking

### ✅ **Reusability**
- Component can be used in other parts of the application
- Declarative HTML syntax
- Self-contained with Shadow DOM

---

## Component Features Used

### Attributes:
- `meiurl` - URL to fetch MEI data
- `pagenumber` - Current page number
- `movementid` - Movement identifier
- `elementid` - Navigate to specific element
- `zoom` - Zoom level
- `pagewidth` / `pageheight` - Page dimensions
- `verovio-url` - Verovio toolkit URL
- `verovio-options` - JSON configuration

### Events:
- `page-info-update` - Fired when page information changes
  - `e.detail.currentPage` - Current page number
  - `e.detail.totalPages` - Total number of pages

---

## File Structure

```
Edirom-Online-Frontend/
├── index.html (component script added)
├── build/
│   ├── index.html (component script added)
│   └── resources/
│       └── js/
│           ├── verovio-view.js (updated)
│           └── edirom-verovio-renderer/
│               └── edirom-verovio-renderer-component.js
├── app/
│   └── view/
│       └── window/
│           └── image/
│               └── VerovioImage.js (iframe updated)
└── resources/
    └── js/
        ├── verovio-view.js (refactored)
        └── edirom-verovio-renderer/
            └── edirom-verovio-renderer-component.js
```

---

## Testing Checklist

- [ ] Component loads in iframe
- [ ] MEI data renders correctly
- [ ] Page navigation works (prev/next buttons)
- [ ] Movement navigation works
- [ ] Measure navigation works
- [ ] Zoom controls work
- [ ] Annotations display correctly
- [ ] No console errors
- [ ] Component defined check: `customElements.get('edirom-verovio-renderer')`

---

## Debugging Tips

### Check if component is loaded:
```javascript
// In browser console:
customElements.get('edirom-verovio-renderer')
// Should return: function EdiromVerovioRenderer()
```

### Check if component exists in DOM:
```javascript
document.querySelector('edirom-verovio-renderer')
// Should return: <edirom-verovio-renderer ...>
```

### Check component's shadow DOM:
```javascript
var comp = document.querySelector('edirom-verovio-renderer');
console.log(comp.shadowRoot.innerHTML);
// Should show SVG content
```

### Monitor component events:
```javascript
var comp = document.querySelector('edirom-verovio-renderer');
comp.addEventListener('page-info-update', (e) => {
    console.log('Page:', e.detail.currentPage, '/', e.detail.totalPages);
});
```

---

## Migration Path

If issues arise, you can temporarily revert to the old approach by:

1. Commenting out the component HTML creation in `showMovement()`
2. Uncommenting the old AJAX code
3. Restoring `vrvToolkit` references

However, the component approach is the recommended long-term solution.

---

## Next Steps

1. **Test thoroughly** with various MEI files
2. **Monitor performance** compared to old approach
3. **Add error handling** for component loading failures
4. **Consider adding** loading indicators while component initializes
5. **Document** any component-specific behaviors for future developers

---

## References

- Component source: `resources/js/edirom-verovio-renderer/edirom-verovio-renderer-component.js`
- Component documentation: `VEROVIO_COMPONENT_REFERENCE.md`
- Migration guide: `VEROVIO_MIGRATION_SUMMARY.md`
- Debugging guide: `VEROVIO_RENDERER_DEBUG.md`
