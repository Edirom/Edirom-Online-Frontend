# XMLDB URI Fix for Verovio Web Component

## Problem

The web component was receiving `xmldb:exist://` URIs which cannot be fetched directly in the browser using the standard `fetch` API. This caused errors:

```
Error fetching MEI: TypeError: Failed to fetch. URL scheme "xmldb" is not supported.
```

## Solution

Convert the `xmldb:` URIs to proper HTTP endpoints that the backend provides.

### Changes Made

**File: `app/view/window/source/VerovioView.js`**

#### 1. Added `getMeiUrl()` Helper Method

Converts `xmldb` URIs to HTTP endpoints:

```javascript
getMeiUrl: function(uri, edition, movementId) {
    var me = this;
    var backendURL = window.getApplication().backendURL;
    var url = backendURL + "data/xql/getMusicInMdiv.xql?uri=" + 
              encodeURIComponent(uri) + "&edition=" + encodeURIComponent(edition);
    
    if (movementId) {
        url += "&movementId=" + encodeURIComponent(movementId);
    }
    
    return url;
}
```

#### 2. Updated `setIFrameContent()` Method

Now converts the URI before passing to the web component:

```javascript
setIFrameContent: function (uri, edition) {
    var me = this;
    me.uri = uri;
    me.edition = edition;
    
    var meiUrl = me.getMeiUrl(uri, edition);
    
    if (me.verovioRenderer) {
        me.verovioRenderer.setAttribute('meiurl', meiUrl);
        me.updateRendererDimensions();
    }
    // ... handle pending case
}
```

#### 3. Updated `showMovement()` Method

Reloads MEI with the correct movement:

```javascript
showMovement: function (menuItem, event, movementId) {
    var me = this;
    if (me.verovioRenderer) {
        var meiUrl = me.getMeiUrl(me.uri, me.edition, movementId);
        me.verovioRenderer.setAttribute('meiurl', meiUrl);
    }
}
```

#### 4. Enhanced `showMeasure()` Method

Handles movement changes intelligently:

- If movement changes: Reloads MEI with new movement, then navigates to measure
- If same movement: Just navigates to the measure
- Uses event listener to wait for MEI load before navigation

## How It Works

### URL Conversion Flow

**Before (Direct XMLDB URI):**
```
xmldb:exist:///db/contents/sources/source123.xml
    ↓ (fails in browser)
TypeError: Failed to fetch
```

**After (HTTP Endpoint):**
```
xmldb:exist:///db/contents/sources/source123.xml
    ↓ (converted by getMeiUrl)
http://localhost:8080/exist/apps/Edirom-Online/data/xql/getMusicInMdiv.xql?uri=xmldb:exist:///db/contents/sources/source123.xml&edition=baseEdition
    ↓ (backend XQuery processes)
<mei> ... MEI XML data ... </mei>
```

### Backend Integration

The solution uses the existing backend XQuery endpoint:
- **Endpoint**: `/data/xql/getMusicInMdiv.xql`
- **Parameters**:
  - `uri`: The xmldb URI of the source
  - `edition`: The edition identifier
  - `movementId`: (optional) The specific movement to extract

The backend XQuery script:
1. Receives the xmldb URI
2. Reads the MEI file from the XML database
3. Extracts the specified movement (if provided)
4. Returns the MEI XML as text

### Movement Navigation

When switching movements:
1. Construct new URL with `movementId` parameter
2. Set `meiurl` attribute → triggers MEI reload
3. Listen for `page-info-update` event
4. Once loaded, navigate to specific measure if needed

## Benefits

1. ✅ **Browser Compatible**: Uses standard HTTP/HTTPS protocols
2. ✅ **Backend Processing**: Leverages existing XQuery infrastructure
3. ✅ **Secure**: Backend handles database access and authentication
4. ✅ **Flexible**: Supports movement-specific loading
5. ✅ **Efficient**: Only loads requested movement data

## Testing Checklist

- [ ] Load source with single movement
- [ ] Load source with multiple movements
- [ ] Switch between movements
- [ ] Navigate to specific measures
- [ ] Verify measure navigation within same movement
- [ ] Verify measure navigation with movement change
- [ ] Check console for errors

## Compatibility

This fix maintains compatibility with:
- eXist-db XML database backend
- Existing XQuery endpoints
- Current authentication system
- Edition handling
- All existing navigation features

## Related Files

- `app/view/window/source/VerovioView.js` - Main view (modified)
- `resources/js/edirom-verovio-renderer/edirom-verovio-renderer-component.js` - Web component (unchanged)
- Backend XQuery: `data/xql/getMusicInMdiv.xql` (unchanged)

## Notes

- The web component itself remains unchanged and generic
- All backend-specific logic is in the ExtJS view layer
- This pattern can be reused for other database URI conversions
- URL encoding ensures special characters are handled properly
