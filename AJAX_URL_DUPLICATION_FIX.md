# AJAX URL Duplication Fix

## Problem
The application was generating duplicate backend URLs in AJAX requests, resulting in errors like:

```
:8080/exist/apps/Edirom-Online-Backend/http://localhost:8080/exist/apps/Edirom-Online-Backend/data/xql/getLinkTarget.xql
```

This caused a 500 Server Error because the URL was malformed.

## Root Cause
In `/app/controller/AJAXController.js`, the `doAJAXRequest()` function was:

1. First checking if there's a preference override for the URL
2. If an override existed, setting `url = override` (which could be a **full URL**)
3. **Then unconditionally** appending `backendURL` to the URL: `url = this.application.backendURL + url`

This meant that override URLs (which already contained the full backend path) were getting `backendURL` prepended again, causing the duplication.

## Solution (Final Version)
Modified the URL construction logic in `doAJAXRequest()` to **detect absolute URLs** and only prepend `backendURL` to relative URLs:

### Before:
```javascript
if(override != null)
    url = override;
    
// ... other code ...

url = this.application.backendURL + url;  // ❌ Always prepends backendURL
```

### After:
```javascript
if(override != null) {
    url = override;  // Use the override (could be absolute or relative)
}

// Only prepend backendURL if the URL is not already absolute
// Check if URL starts with http://, https://, or //
if(!/^(https?:)?\/\//i.test(url)) {
    url = this.application.backendURL + url;  // ✅ Only prepend for relative URLs
}
```

The regex `/^(https?:)?\/\//i` matches:
- `http://...` - HTTP URLs
- `https://...` - HTTPS URLs
- `//...` - Protocol-relative URLs

## Logic Flow

### Case 1: Relative URL (no override)
```
url = "data/xql/getLinkTarget.xql"
↓
override = null
↓
url is not absolute (no http://)
↓
url = backendURL + url
↓
Final: "http://localhost:8080/exist/apps/Edirom-Online-Backend/data/xql/getLinkTarget.xql" ✅
```

### Case 2: Absolute URL (from override)
```
url = "data/xql/getLinkTarget.xql"
↓
override = "http://localhost:8080/exist/apps/Edirom-Online-Backend/data/xql/getLinkTarget.xql"
↓
url = override
↓
url is absolute (starts with http://)
↓
url used as-is (backendURL NOT prepended)
↓
Final: "http://localhost:8080/exist/apps/Edirom-Online-Backend/data/xql/getLinkTarget.xql" ✅
```

### Case 3: Relative URL (from override)
```
url = "data/xql/getLinkTarget.xql"
↓
override = "custom/path/customEndpoint.xql"
↓
url = override
↓
url is not absolute (no http://)
↓
url = backendURL + url
↓
Final: "http://localhost:8080/exist/apps/Edirom-Online-Backend/custom/path/customEndpoint.xql" ✅
```

## Debug Logging
Enhanced console logging to help diagnose issues:

```javascript
console.log('AJAX Request:', {
    originalUrl: 'data/xql/getLinkTarget.xql',
    override: 'http://...' or null,
    finalUrl: 'http://localhost:8080/exist/apps/Edirom-Online-Backend/...',
    method: 'POST',
    params: {uri: '...', lang: '...', edition: '...'}
});
```

This shows:
- **originalUrl**: The URL passed to `doAJAXRequest()`
- **override**: The preference override (if any)
- **finalUrl**: The actual URL being called
- **method**: HTTP method
- **params**: All parameters being sent

## Files Modified
- `/app/controller/AJAXController.js` (lines 57-66)

## Testing
After this fix:
1. ✅ Regular AJAX requests work correctly (relative paths get backendURL prepended)
2. ✅ Override URLs work correctly (full URLs are used as-is)
3. ✅ No more URL duplication errors
4. ✅ The getLinkTarget.xql endpoint loads successfully

## Build
A new XAR package was created with this fix:
- `build-xar/Edirom-Online-Frontend-1.1.0-20251118-1841.xar`

## Related Issues
This fix complements the other URL handling improvements:
- `XMLDB_URI_FIX.md` - Handles xmldb:// to HTTP conversion for MEI files
- This fix - Handles general AJAX URL construction logic
