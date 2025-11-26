# Quick Test: Verify URL Duplication Fix

## Deploy the Fix
1. Install the latest XAR: `Edirom-Online-Frontend-1.1.0-20251118-1901.xar`
2. Restart eXist-db or reload the application

## Open Browser Console
Press **F12** (or right-click → Inspect → Console)

## Navigate to Content
Open any source, text, or document in Edirom Online

## Check Console Output

### ✅ SUCCESS - You should see:
```javascript
AJAX Request: {
    originalUrl: "data/xql/getLinkTarget.xql",
    override: null,
    finalUrl: "http://localhost:8080/exist/apps/Edirom-Online-Backend/data/xql/getLinkTarget.xql",
    method: "POST",
    params: {
        uri: "xmldb:exist:///db/contents/sources/source1.xml",
        lang: "en",
        edition: "myEdition"
    }
}
```

**Key checks**:
- ✅ `finalUrl` has backend path **only once**
- ✅ `params.uri` is present and not empty
- ✅ No error in Network tab (should be 200 OK)

### ❌ FAILURE - If you see:
```
:8080/exist/apps/Edirom-Online-Backend/http://localhost:8080/exist/apps/Edirom-Online-Backend/...
```

This means:
1. The XAR wasn't deployed correctly, OR
2. Browser cache needs clearing, OR
3. The override preference is malformed

**Solutions**:
- Clear browser cache (Ctrl+Shift+Del)
- Hard refresh (Ctrl+F5)
- Check eXist-db package manager shows correct version
- Check application actually reloaded

## Check Network Tab
1. Open Network tab in DevTools
2. Look for `getLinkTarget.xql` request
3. Click on it to see details

**Should show**:
- **Status**: 200 OK
- **Request URL**: Single backend path (no duplication)
- **Form Data**: uri, lang, edition parameters

## Test Different Content Types
Try opening:
- [ ] A source document
- [ ] A text document
- [ ] An audio file
- [ ] Search results

Each should load without URL duplication errors.

## Quick Checklist

- [ ] XAR deployed: `Edirom-Online-Frontend-1.1.0-20251118-1901.xar`
- [ ] Browser console open (F12)
- [ ] See "AJAX Request:" logs
- [ ] `finalUrl` has NO duplication
- [ ] `params.uri` is present
- [ ] Network tab shows 200 OK
- [ ] Content loads successfully
- [ ] No console errors

## If Still Broken

**Share this info**:
1. Screenshot of console log showing AJAX Request details
2. Screenshot of Network tab showing the failing request
3. The `originalUrl`, `override`, and `finalUrl` values
4. Any error messages

This will help identify if:
- Override preferences are incorrect
- Backend URL is misconfigured
- Something else is interfering

## Expected Timeline
⏱️ Testing should take **< 5 minutes**

If it works immediately, you're done! ✅  
If not, we can debug with the enhanced logging. 🔍
