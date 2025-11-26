# Annotation ID Extraction Fix

## Date
November 19, 2025

## Problem
The previous code was trying to extract annotation IDs using `getAttributeNS(null, 'data-id')` which doesn't exist on Verovio-rendered SVG elements. This caused `annotId` to be `null`, leading to XQuery errors when trying to fetch annotation content.

## Root Cause
- Verovio renders MEI elements with their `xml:id` attribute as the SVG `id` attribute
- We were looking for `data-id` (which we set on the annotation icon we create, not the original annotation element)
- The fallback order was incorrect: checking `getAttributeNS` before the simpler `annot.id` property

## Solution
Changed the annotation ID extraction logic to use the standard JavaScript `id` property first:

```javascript
// Old code (incorrect)
const annotId = annot.getAttributeNS(null, 'data-id') 
             || annot.getAttributeNS(null, 'id') 
             || annot.id;

// New code (correct)
const annotId = annot.id || annot.getAttribute('id');
```

## Changes Made

### File: `/resources/js/verovio-view.js` (lines 208-238)

**Before:**
```javascript
// Try different attributes to get the annotation ID
const annotId = annot.getAttributeNS(null, 'data-id') 
             || annot.getAttributeNS(null, 'id') 
             || annot.id;

// Debug: log all attributes to see what's available
console.log('Annotation element attributes:', {
    'data-id': annot.getAttributeNS(null, 'data-id'),
    'id': annot.getAttributeNS(null, 'id'),
    'xml:id': annot.getAttributeNS('http://www.w3.org/XML/1998/namespace', 'id'),
    'class': annot.getAttributeNS(null, 'class'),
    'allAttributes': Array.from(annot.attributes).map(attr => ({
        name: attr.name,
        value: attr.value
    }))
});
```

**After:**
```javascript
// Get the annotation ID from the SVG element
// Verovio renders MEI xml:id as SVG id attribute
const annotId = annot.id || annot.getAttribute('id');

// Debug: log all attributes to see what's available
console.log('Annotation element:', {
    'element': annot,
    'id (property)': annot.id,
    'id (getAttribute)': annot.getAttribute('id'),
    'class': annot.getAttribute('class'),
    'allAttributes': Array.from(annot.attributes).map(attr => ({
        name: attr.name,
        value: attr.value
    }))
});
```

**Also updated line 246:**
```javascript
// Before
annotIcon.setAttributeNS(null, "class", 'annotIcon ' + annot.getAttributeNS(null, 'class'));

// After
annotIcon.setAttributeNS(null, "class", 'annotIcon ' + annot.getAttribute('class'));
```

## Expected Behavior
1. Verovio renders annotation elements with SVG `id` attributes
2. Code reads `annot.id` (JavaScript property) which maps to the SVG `id` attribute
3. This ID should match the MEI `xml:id` of the annotation
4. The ID is used in the XQuery URL: `xmldb:exist:///db/contents/source-4-MEI.xml#{annotId}`
5. Tooltips should now display annotation content instead of XQuery errors

## Testing Instructions
1. Open the Edirom application in a browser
2. Navigate to a work with annotations
3. Open the browser console
4. Look for logs starting with `"Annotation element:"`
5. Verify that `id (property)` has a valid ID value (not `null`)
6. Hover over annotation icons to test tooltips
7. Verify tooltips show annotation content (not XQuery errors)

## Next Steps
- [ ] Test with actual MEI files that have annotations
- [ ] Verify annotation IDs match between MEI and SVG
- [ ] Confirm XQuery receives correct annotation IDs
- [ ] Test tooltip functionality end-to-end
- [ ] Remove debug logging once confirmed working

## Files Modified
- `/resources/js/verovio-view.js` (source)
- `/build/resources/js/verovio-view.js` (built - manually updated)

## Related Issues
- Fixes XQuery error: `annotation:getParticipants` cardinality 1, got 0
- Fixes null annotation IDs in tooltip URLs
- Part of larger Shadow DOM tooltip implementation
