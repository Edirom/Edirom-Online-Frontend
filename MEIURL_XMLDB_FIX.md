# MEI URL xmldb URI Fix

## Problem

The component was receiving an **xmldb URI** instead of an HTTP URL:

```
meiurl="xmldb:exist:///db/apps/weber-klarinettenquintett-eol-emeritus/sources/source-4-MEI.xml"
```

This caused the component to fail loading because:
- ❌ Web browsers cannot access `xmldb://` URIs
- ❌ Only HTTP/HTTPS URLs work in the browser
- ❌ The xmldb URI is the **internal eXist-db path**, not a web-accessible URL

## Root Cause

**Location:** `/app/view/window/image/VerovioImage.js` line 83

**The Problem:**
```javascript
<edirom-verovio-renderer 
    id="verovio-renderer"
    meiurl="${uri}"    // ❌ ${uri} is the xmldb source URI!
    ...>
</edirom-verovio-renderer>
```

**What `${uri}` contains:**
- `${uri}` = The source document URI from the database
- Example: `xmldb:exist:///db/apps/weber-klarinettenquintett-eol-emeritus/sources/source-4-MEI.xml`
- This is NOT a web-accessible URL!

## The Fix

Changed `meiurl="${uri}"` to `meiurl=""`:

```javascript
<edirom-verovio-renderer 
    id="verovio-renderer"
    meiurl=""          // ✅ Empty until showMovement() sets proper HTTP URL
    movementid=""
    pagenumber="1"
    zoom="33"
    pagewidth="1200"
    pageheight="1600"
    verovio-url="https://www.verovio.org/javascript/latest/verovio-toolkit-wasm.js"
    style="display:none;">
</edirom-verovio-renderer>
```

Also added:
- Loading spinner (shown initially)
- `style="display:none"` on component (hidden until movement selected)
- `showLoader()` and `hideLoader()` functions

## The Correct Flow

### Before Fix:
```
Component loads → meiurl="xmldb:exist://..." → ❌ Browser can't access → FAIL
```

### After Fix:
```
1. Component loads → meiurl="" → Spinner visible, component hidden
                                    ↓
2. User selects movement → showMovement(movementId) called
                                    ↓
3. showLoader() → Shows spinner
                                    ↓
4. Build HTTP URL: 
   meiUrl = "http://localhost:8080/exist/apps/.../data/xql/getMusicInMdiv.xql?uri=xmldb:...&movementId=xyz"
                                    ↓
5. renderer.setAttribute('meiurl', meiUrl) → ✅ HTTP URL set
                                    ↓
6. Component fetches MEI from HTTP endpoint
                                    ↓
7. Component renders SVG
                                    ↓
8. hideLoader() → Hide spinner, show SVG
```

## Key Points

✅ **Initial state:** `meiurl=""` (empty, no premature loading)
✅ **On movement selection:** `meiurl="http://..."` (proper HTTP endpoint)
✅ **HTTP endpoint handles xmldb URIs:** The XQuery script on the server converts xmldb URIs to actual MEI content
✅ **Browser compatibility:** Browser only sees HTTP URLs, never xmldb URIs

## The Backend XQuery

The HTTP endpoint `/data/xql/getMusicInMdiv.xql` receives:
- `uri` parameter: `xmldb:exist:///db/apps/.../source-4-MEI.xml`
- `edition` parameter: Current edition ID
- `movementId` parameter: Selected movement ID

It then:
1. Uses the xmldb URI to locate the file in the database
2. Extracts the requested movement
3. Returns the MEI XML content as HTTP response
4. Browser receives MEI XML and passes it to Verovio

## Testing

After build, verify:
1. ✅ Component loads with empty meiurl
2. ✅ No xmldb URI errors in console
3. ✅ Selecting movement triggers HTTP request (not xmldb)
4. ✅ MEI loads successfully
5. ✅ SVG renders correctly

## Related Issues

This is similar to the previous xmldb URI fix, but this time the issue was in the **initial HTML** rather than in the JavaScript that updates the component.

**Previous fixes:**
- `/resources/js/verovio-view.js` - Uses HTTP endpoint for showMovement()
- `/app/view/window/image/VerovioImage.js` - NOW FIXED: Initial meiurl="" instead of xmldb URI
