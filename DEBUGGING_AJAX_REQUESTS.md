# Debugging AJAX Request Issues

## Recent Changes

### 1. Fixed URL Duplication Bug
**File**: `app/controller/AJAXController.js`

The `doAJAXRequest()` function now correctly handles URL construction:
- Preference overrides (full URLs) are used as-is
- Relative paths get `backendURL` prepended

### 2. Added Request Logging
**File**: `app/controller/AJAXController.js`

Added console logging to debug AJAX requests:

```javascript
console.log('AJAX Request:', {
    url: url,
    method: method,
    params: params
});
```

This will output every AJAX request with:
- The final constructed URL
- The HTTP method (GET, POST, etc.)
- All parameters being sent

### 3. Added URI Validation
**File**: `app/controller/window/SingleWindowController.js`

Added validation to prevent requests with missing URI:

```javascript
if (!win.uri || win.uri === '') {
    console.error('Window URI is missing or empty:', win);
    return;
}
```

## How to Debug

### Step 1: Open Browser Console
After deploying the new XAR (`Edirom-Online-Frontend-1.1.0-20251118-1850.xar`), open your browser's developer console (F12).

### Step 2: Check AJAX Request Logs
You should see logs like this for each request:

```javascript
AJAX Request: {
    url: "http://localhost:8080/exist/apps/Edirom-Online-Backend/data/xql/getLinkTarget.xql",
    method: "POST",
    params: {
        uri: "xmldb:exist:///db/contents/sources/source1.xml",
        lang: "en",
        edition: "baseEdition"
    }
}
```

### Step 3: Verify Parameters
Check that:
1. ✅ **URL is correct** - No duplication, proper backend URL
2. ✅ **URI parameter exists** - Not empty or undefined
3. ✅ **Edition parameter exists** - Should match active edition
4. ✅ **Lang parameter exists** - Should be a valid language code

### Step 4: Look for Errors
Check for these error messages:

#### Missing URI Error:
```
Window URI is missing or empty: {window object details}
```
**Solution**: The window is being created without a URI. Check how the window is being instantiated.

#### URL Duplication Error:
```
Failed to load: .../Backend/http://localhost.../Backend/...
```
**Solution**: Already fixed! But if you still see this, the preference override might be returning a malformed URL.

#### 500 Server Error:
```
Failed to load resource: the server responded with a status of 500
```
**Solution**: Check the backend logs. The XQuery might be receiving incorrect parameters or the URI might point to a non-existent resource.

## Common Issues and Solutions

### Issue 1: URL Still Duplicated
**Symptom**: URL has duplicate backend paths
**Check**: Look for preference overrides that might return full URLs
**Fix**: Clear browser cache and preferences

### Issue 2: Missing URI Parameter
**Symptom**: Console shows "Window URI is missing or empty"
**Check**: How the window is being created
**Debug**: Add logging where `win.uri` is set
**Example fix**:
```javascript
// In the code that creates the window:
var win = Ext.create('EdiromOnline.view.window.Window', {
    uri: 'xmldb:exist:///db/contents/sources/source1.xml' // Ensure this is set!
});
```

### Issue 3: Wrong Backend URL
**Symptom**: Requests go to wrong server or 404 errors
**Check**: `window.getApplication().backendURL` value in console
**Fix**: Verify `@backend.url@` was replaced during build

## Testing Checklist

After deploying the new XAR:

- [ ] Open browser console (F12)
- [ ] Navigate to a source/text in Edirom Online
- [ ] Check console for "AJAX Request:" logs
- [ ] Verify URL format is correct (no duplication)
- [ ] Verify all parameters are present (uri, lang, edition)
- [ ] Check Network tab for request details
- [ ] Verify response is successful (200 status)
- [ ] Check for any error messages

## Example of Correct Request

```javascript
// Console output
AJAX Request: {
    url: "http://localhost:8080/exist/apps/Edirom-Online-Backend/data/xql/getLinkTarget.xql",
    method: "POST",
    params: {
        uri: "xmldb:exist:///db/apps/contents/sources/beethovenWoO57.xml",
        lang: "de",
        edition: "beethovenWoO57"
    }
}

// Network tab shows:
Status: 200 OK
Response: {"type":"source","uri":"xmldb:exist:///db/apps/contents/sources/beethovenWoO57.xml","views":[...]}
```

## Build Information

Latest XAR with fixes:
- **File**: `build-xar/Edirom-Online-Frontend-1.1.0-20251118-1850.xar`
- **Changes**:
  1. Fixed URL duplication in AJAXController
  2. Added request logging for debugging
  3. Added URI validation in SingleWindowController

## Additional Resources

- `AJAX_URL_DUPLICATION_FIX.md` - Details on the URL duplication fix
- `XMLDB_URI_FIX.md` - Details on xmldb:// URI handling for MEI files
- `VEROVIO_MIGRATION_SUMMARY.md` - Details on the Verovio component migration
