# Annotation XQuery Error Debugging

## Error Message

```
The actual cardinality for parameter 1 does not match the cardinality declared in the function signature
annotation:getParticipants
Expected cardinality: exactly one
Got: 0
```

## Root Cause

The XQuery function `annotation:getParticipants($annot)` expects exactly one annotation element, but is receiving an empty sequence (0 items). This happens when the annotation lookup fails.

### XQuery Code Path

**File:** `data/xql/getAnnotation.xql`

```xquery
let $uri := request:get-parameter('uri', '')
let $docUri := substring-before($uri, '#')
let $internalId := substring-after($uri, '#')
let $doc := doc($docUri)
let $annot := $doc/id($internalId)  ← Returns empty sequence!
let $participants := annotation:getParticipants($annot)  ← ERROR!
```

**Problem:** `$doc/id($internalId)` is not finding the annotation element.

## Possible Causes

### 1. **Incorrect URI Format**

The `uri` parameter might not be in the correct format expected by the XQuery.

**Expected:**
```
xmldb:exist:///db/contents/work123.xml#annot456
```

**What we're sending:**
```javascript
uri: uri + '#' + annotId
```

Where `uri` comes from the iframe's JavaScript context and `annotId` comes from the SVG's `data-id` attribute.

### 2. **Missing or Incorrect `annotId`**

The `data-id` attribute on the SVG annotation elements might be:
- Empty
- Incorrect format
- Not the actual annotation ID

### 3. **Document Not Found**

The `doc($docUri)` call might fail if:
- The document URI is incorrect
- The document doesn't exist in the database
- Permissions issues

### 4. **ID Mismatch**

The `id($internalId)` lookup might fail if:
- The annotation element doesn't have an `@xml:id` attribute
- The ID doesn't match what's in the `data-id` attribute
- The annotation is in a different namespace

## Debugging Steps

### Step 1: Check Console Logs

After the changes, check the browser console for:

```javascript
console.log('Annotation found:', {
    annotId: annotId,
    fullUri: uri + '#' + annotId,
    annotClass: annot.getAttributeNS(null, 'class')
});

console.log('Fetching annotation with URI:', uri + '#' + annotId);
```

**What to check:**
- Is `annotId` empty?
- Is `uri` correct?
- Does the full URI look valid?

### Step 2: Check Network Request

In browser DevTools → Network tab:
1. Filter for `getAnnotation.xql`
2. Check the POST request payload:
   - `uri` parameter value
   - `target` parameter (`tip`)
   - `edition` parameter
   - `lang` parameter

### Step 3: Check SVG Annotation Elements

In browser console, inspect the SVG annotations:

```javascript
const shadowRoot = document.getElementById('verovio-renderer').shadowRoot;
const annots = shadowRoot.querySelectorAll('.annot.editorialComment');

annots.forEach(annot => {
    console.log({
        dataId: annot.getAttributeNS(null, 'data-id'),
        class: annot.getAttributeNS(null, 'class'),
        element: annot
    });
});
```

**Check:**
- Do annotations have `data-id` attributes?
- Are the IDs valid?
- Do they match annotation IDs in your MEI database?

### Step 4: Check Backend

Test the XQuery directly with a known-good annotation URI:

```xquery
let $uri := 'xmldb:exist:///db/contents/your-work.xml#your-annot-id'
let $docUri := substring-before($uri, '#')
let $internalId := substring-after($uri, '#')
let $doc := doc($docUri)
let $annot := $doc/id($internalId)
return
    if($annot) then
        ('Found annotation: ' || $annot/@xml:id)
    else
        ('Annotation not found!')
```

## Changes Made

### Added Debugging Logs

**File:** `/resources/js/verovio-view.js`  
**Lines:** 208-214, 243

```javascript
// Debug: log the annotation details
console.log('Annotation found:', {
    annotId: annotId,
    fullUri: uri + '#' + annotId,
    annotClass: annot.getAttributeNS(null, 'class')
});

// ... later ...

// Fetch annotation content
console.log('Fetching annotation with URI:', uri + '#' + annotId);
```

### Added Language Parameter

```javascript
body: new URLSearchParams({
    uri: uri + '#' + annotId,
    target: 'tip',
    edition: edition,
    lang: 'en'  // Add language parameter
})
```

**Why:** The XQuery code uses `$lang` parameter, but it wasn't being sent.

### Changed Initial Tooltip Text

```javascript
tip.innerHTML = "Loading annotation...";
```

**Before:** `"Error getting annotation."`  
**After:** `"Loading annotation..."`

**Why:** Shows that the request is in progress, not errored yet.

## Common Solutions

### Solution 1: Check URI Variable

Ensure the `uri` variable in the iframe contains the correct document URI:

```javascript
// In VerovioImage.js iframe script
var uri = "${uri}";  // Should be xmldb URI
console.log("Document URI:", uri);
```

### Solution 2: Verify Annotation IDs

Check that annotations in the MEI file have `@xml:id` attributes:

```xml
<annot xml:id="annot123" plist="#measure1 #measure2">
    <p>This is an annotation</p>
</annot>
```

### Solution 3: Check XQuery Function

Ensure `annotation:getParticipants()` can handle empty annotations:

```xquery
let $participants :=
    if($annot) then
        annotation:getParticipants($annot)
    else
        ()
```

### Solution 4: Use Safer XQuery

Update `getAnnotation.xql` to handle missing annotations:

```xquery
let $annot := $doc/id($internalId)

return
    if(not($annot)) then
        <div class="error">Annotation not found: {$internalId}</div>
    else if($target eq 'tip') then
        (: ... existing tooltip code ... :)
    else
        (: ... existing view code ... :)
```

## Expected Console Output

After rebuilding, when hovering over an annotation box, you should see:

```
Annotation found: {
    annotId: "annot123",
    fullUri: "xmldb:exist:///db/contents/work.xml#annot123",
    annotClass: "annot editorialComment ediromAnnotPrio1"
}
Fetching annotation with URI: xmldb:exist:///db/contents/work.xml#annot123
```

Then either:
- ✅ Tooltip appears with annotation content
- ❌ Error message in tooltip (check Network tab for XQuery error)

## Testing Checklist

After rebuild (`./build.sh`):

- [ ] Open browser DevTools console
- [ ] Hover over annotation box
- [ ] Check console for `"Annotation found:"` log
- [ ] Verify `annotId` is not empty
- [ ] Verify `fullUri` looks correct
- [ ] Check Network tab for POST request
- [ ] Check POST request payload
- [ ] Check XQuery error response if any
- [ ] Verify tooltip content or error message

## Next Steps

1. **Rebuild the project:**
   ```bash
   cd /Users/hizkielalemayehu/Documents/GitHub/Edirom/Edirom-Online-Frontend
   ./build.sh
   ```

2. **Test annotation tooltips**

3. **Check console logs** to see what URI is being constructed

4. **Report findings:**
   - What does `annotId` contain?
   - What does the full `uri` look like?
   - What error does the XQuery return?

## Files Modified

- `/resources/js/verovio-view.js` - Added debugging logs and language parameter

## Summary

The XQuery error occurs because `annotation:getParticipants()` receives an empty annotation element. This means the annotation lookup `$doc/id($internalId)` is failing.

**To diagnose:**
1. Check console logs for annotation details
2. Verify the URI format being sent
3. Check if annotations have correct `@xml:id` attributes
4. Test XQuery with known-good URI

**The debugging logs will help identify** whether the problem is:
- Empty `annotId`
- Incorrect `uri` variable
- Missing annotations in MEI
- XQuery lookup failure
