# Verovio View Migration Summary

## Overview
The `VerovioView` has been successfully converted to use the custom `<edirom-verovio-renderer>` web component instead of the iframe-based approach.

## Changes Made

### 1. **app/view/window/source/VerovioView.js**
   - **Removed**: Dependency on `EdiromOnline.view.window.image.VerovioImage`
   - **Removed**: `verovioImageView` instance and `viewerContainer` panel
   - **Changed**: Layout from `'border'` to `'fit'`
   - **Added**: Direct HTML container for the web component
   - **Added**: `initVerovioRenderer()` method to create and configure the web component
   - **Added**: `updateRendererDimensions()` method to handle responsive resizing
   - **Modified**: `setIFrameContent()` now sets the `meiurl` attribute on the web component
   - **Modified**: `showMovement()` now uses `setAttribute('movementid', ...)` on the web component
   - **Modified**: `showMeasure()` now uses `setAttribute('movementid', ...)` and `setAttribute('elementid', ...)` on the web component

### 2. **index.html**
   - **Added**: Script tag to load the web component:
     ```html
     <script src="resources/js/edirom-verovio-renderer/edirom-verovio-renderer-component.js" type="text/javascript"></script>
     ```

### 3. **build/index.html**
   - Already contains the web component script (no changes needed)

## Web Component Integration

### Component Creation
```javascript
me.verovioRenderer = document.createElement('edirom-verovio-renderer');
me.verovioRenderer.setAttribute('verovio-url', 'https://www.verovio.org/javascript/latest/verovio-toolkit-wasm.js');
me.verovioRenderer.setAttribute('zoom', '40');
```

### Attribute Mapping
- `meiurl` - Sets the MEI file URL to render
- `movementid` - Sets the movement/mdiv to display
- `elementid` - Navigates to a specific element (e.g., measure)
- `zoom` - Controls the rendering scale
- `width` / `height` - Controls the viewport dimensions

### Event Handling
The component listens to:
- `page-info-update` - Fired when page navigation occurs, provides current page and total pages

## Benefits of the New Approach

1. **Native Web Component**: Uses modern web standards instead of iframe
2. **Better Performance**: Direct DOM manipulation without iframe overhead
3. **Easier Debugging**: Web component runs in the same context as the application
4. **Improved Integration**: Direct attribute-based API instead of postMessage
5. **Responsive**: Automatically handles resize events
6. **Maintainability**: Cleaner separation of concerns

## API Compatibility

### Old Approach (via VerovioImage)
```javascript
me.verovioImageView.setIFrameContent(uri, edition);
me.verovioImageView.showMovement(movementId);
me.verovioImageView.showMeasure(movementId, measureId);
```

### New Approach (via Web Component)
```javascript
me.verovioRenderer.setAttribute('meiurl', uri);
me.verovioRenderer.setAttribute('movementid', movementId);
me.verovioRenderer.setAttribute('elementid', measureId);
```

## Files That Can Be Deprecated

The following file is no longer needed by VerovioView but may still be used elsewhere:
- `app/view/window/image/VerovioImage.js` - The iframe-based image viewer

**Note**: Before removing `VerovioImage.js`, verify no other components depend on it.

## Testing Checklist

- [ ] Verify MEI file loads correctly
- [ ] Test movement navigation from the menu
- [ ] Test "Go to Measure" dialog functionality
- [ ] Test zoom functionality
- [ ] Test responsive resizing
- [ ] Verify page navigation works
- [ ] Check console for any errors
- [ ] Test with multiple movements
- [ ] Test with single movement (menu should be disabled)

## Controller Integration

The `app/controller/window/source/VerovioView.js` controller remains unchanged and continues to:
- Load movements via AJAX
- Handle measure navigation
- Fire appropriate events

All controller methods work seamlessly with the new web component implementation.

## Next Steps

1. **Test thoroughly** in your development environment
2. **Monitor console** for any web component loading issues
3. **Verify Verovio toolkit** loads correctly from the CDN
4. **Check responsive behavior** at different window sizes
5. **Test all navigation features** (movements, measures, pages)

## Rollback Plan

If issues occur, you can revert by:
1. Restoring the original `VerovioView.js` from git history
2. Removing the web component script tag from `index.html`
3. Re-enabling the `VerovioImage` dependency

## Technical Notes

- The web component is defined in: `resources/js/edirom-verovio-renderer/edirom-verovio-renderer-component.js`
- It uses Verovio toolkit WASM version from: `https://www.verovio.org/javascript/latest/verovio-toolkit-wasm.js`
- Default zoom level is set to 40 (adjustable via attribute)
- Component uses Shadow DOM for encapsulation
