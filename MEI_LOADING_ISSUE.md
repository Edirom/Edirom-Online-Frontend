# MEI Loading Issue - HTML Instead of MEI XML

## Problem Discovered
The Verovio renderer is receiving **HTML instead of MEI XML** data, causing:
- "Page 1 does not exist" warning from Verovio
- "Total measures: 0" 
- No music notation rendering

### Evidence from Console:
```javascript
MEI data (first 500 chars): <?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE HTML>
<!--
 *  Edirom Online
 *  Copyright (C) 2014 The Edirom Project
```

This shows the backend is returning the **index.html page** instead of MEI XML.

## Root Causes (Possible)

### 1. URL Construction Issue
The URL being generated might be incorrect, causing a 404 error which returns the index.html page.

**Check in browser console** after deploying `Edirom-Online-Frontend-1.1.0-20251118-1908.xar`:
```javascript
getMeiUrl called: {
    uri: "xmldb:exist:///db/contents/sources/source1.xml",
    edition: "myEdition",
    movementId: "",
    backendURL: "http://localhost:8080/exist/apps/Edirom-Online-Backend/",
    finalUrl: "http://localhost:8080/exist/apps/Edirom-Online-Backend/data/xql/getMusicInMdiv.xql?uri=xmldb%3Aexist%3A%2F%2F%2Fdb%2Fcontents%2Fsources%2Fsource1.xml&edition=myEdition"
}
```

### 2. Backend XQuery Not Accessible
The `getMusicInMdiv.xql` endpoint might not be properly deployed or accessible.

**Verify**:
1. Check if `/exist/apps/Edirom-Online-Backend/data/xql/getMusicInMdiv.xql` exists
2. Try accessing it directly in browser with test parameters
3. Check eXist-db logs for errors

### 3. Invalid URI Parameter
The `xmldb:exist:///` URI might not resolve to a valid document in the database.

**The XQuery expects**:
```xquery
let $uri := request:get-parameter('uri', '')
let $mei := doc($uri)/root()
```

If `doc($uri)` fails, the XQuery might error out, causing eXist to return an error page (HTML).

### 4. CORS or Security Issues
The browser might be blocking the request or receiving a redirect to the login page.

**Check Network tab** for:
- HTTP status code (should be 200, not 302, 403, or 404)
- Response Content-Type (should be `application/xml`, not `text/html`)
- Any redirect responses

## Diagnostic Steps

### Step 1: Check Console Logs
Deploy the new XAR and look for:
```javascript
getMeiUrl called: {...}
```

This shows the **exact URL** being requested.

### Step 2: Copy URL and Test Directly
1. Copy the `finalUrl` from the console log
2. Paste it directly in browser address bar
3. See what it returns:
   - ✅ Should return: MEI XML starting with `<mei xmlns=...>`
   - ❌ If returns: HTML page, the endpoint is broken or not found

### Step 3: Check Network Tab
1. Open Network tab in DevTools
2. Filter by XHR
3. Find the `getMusicInMdiv.xql` request
4. Check:
   - **Status**: Should be 200
   - **Response Headers**: `Content-Type` should be `application/xml`
   - **Response**: Should be MEI XML, not HTML

### Step 4: Test with Simple URI
Try manually setting a known-good MEI file URI in the console:

```javascript
// In browser console:
var testUrl = window.getApplication().backendURL + 
    "data/xql/getMusicInMdiv.xql?uri=xmldb:exist:///db/apps/contents/sources/test.mei";
    
fetch(testUrl)
    .then(r => r.text())
    .then(text => console.log('Response:', text.substring(0, 500)));
```

## Possible Solutions

### Solution 1: If URL is Wrong
Check if `backendURL` is correct:
```javascript
// In console:
window.getApplication().backendURL
// Should be: "http://localhost:8080/exist/apps/Edirom-Online-Backend/"
```

### Solution 2: If URI Parameter is Invalid
The `xmldb:exist:///` URI might need to be converted to a different format, or the document might not exist at that path.

**Check if document exists** in eXist-db:
1. Open eXist-db dashboard
2. Navigate to Collections
3. Verify the MEI file exists at the path specified in URI

### Solution 3: If XQuery is Failing
Add error handling to the XQuery or check eXist-db logs:
```bash
# Check eXist logs
tail -f /path/to/exist/webapp/WEB-INF/logs/exist.log
```

### Solution 4: If Authentication Required
The endpoint might require authentication. Check if the session is authenticated.

## Comparison with Old Implementation

The old `verovio-view.js` used the **same endpoint**:
```javascript
var url = appBasePath + "/data/xql/getMusicInMdiv.xql?uri=" + uri + 
          "&edition=" + edition + "&movementId=" + movementId;
$.get(url, function(data) {
    var svg = vrvToolkit.renderData(data, options);
    $("#output").html(svg);
}, 'text');
```

**Key difference**: Used jQuery's `$.get()` with `'text'` dataType, which might handle the response differently than the web component's `fetch()` call.

## Next Actions

1. **Deploy**: `Edirom-Online-Frontend-1.1.0-20251118-1908.xar`
2. **Open browser console** and look for "getMeiUrl called:" log
3. **Copy the `finalUrl`** value
4. **Test the URL directly** in browser
5. **Share the results**:
   - What does the URL look like?
   - What does it return when accessed directly?
   - What's the HTTP status code?
   - Are there any error messages?

This will help identify whether the issue is:
- URL construction ❌
- Backend availability ❌
- Document accessibility ❌
- Authentication ❌
- Or something else ❓
