# Missing Annotation ID Fix

## Problem Identified

The `annotId` is **`null`** because the annotation elements in the SVG rendered by the verovio component **do not have a `data-id` attribute**.

### Console Output Shows:
```javascript
{
  annotId: null,
  fullUri: 'xmldb:exist:///db/apps/...#null',
  annotClass: 'annot editorialComment ediromAnnotPrio1 wega.annotation.category.bogensetzung'
}
```

**Root Cause:** `annot.getAttributeNS(null, 'data-id')` returns `null` because the SVG element doesn't have this attribute.

## Solution

Try multiple possible attributes to find the annotation ID:

### Code Changes

**File:** `/resources/js/verovio-view.js`  
**Lines:** 208-238

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

// Skip if no annotation ID found
if (!annotId) {
    console.warn('No annotation ID found, skipping this annotation');
    return;
}
```

### What This Does

1. **Tries multiple attributes** to find the annotation ID:
   - `data-id` (custom attribute)
   - `id` (standard HTML/SVG attribute)
   - JavaScript `id` property

2. **Logs all attributes** so we can see what's actually available on the element

3. **Skips annotations** that have no ID (prevents `#null` errors)

## Expected Debugging Output

After rebuilding and hovering over an annotation, you should see:

```javascript
Annotation element attributes: {
    'data-id': null,
    'id': 'annot123',  // ← Hopefully this has a value!
    'xml:id': null,
    'class': 'annot editorialComment ediromAnnotPrio1 ...',
    'allAttributes': [
        { name: 'class', value: 'annot editorialComment...' },
        { name: 'id', value: 'annot123' },
        { name: 'transform', value: 'translate(...)' },
        // ... other attributes
    ]
}
```

**Key Things to Check:**
- Does any attribute contain an annotation ID?
- Which attribute name is it under?
- What does the ID look like?

## Possible Outcomes

### Outcome 1: `id` Attribute Has Value ✅
```javascript
{
    'id': 'annot123',
    'allAttributes': [{ name: 'id', value: 'annot123' }, ...]
}
```

**Result:** Annotations will work! The fallback `|| annot.id` will find it.

### Outcome 2: No ID Attribute at All ❌
```javascript
{
    'data-id': null,
    'id': null,
    'xml:id': null,
    'allAttributes': [
        { name: 'class', value: '...' },
        { name: 'transform', value: '...' }
        // No id anywhere!
    ]
}
```

**Result:** Annotations skipped with warning:
```
"No annotation ID found, skipping this annotation"
```

**Solution:** Need to configure verovio component to include annotation IDs.

### Outcome 3: ID in Different Attribute ⚠️
```javascript
{
    'allAttributes': [
        { name: 'data-annot-id', value: 'annot123' },
        // or
        { name: 'xlink:href', value: '#annot123' }
    ]
}
```

**Solution:** Update code to check that specific attribute.

## Verovio Component Configuration

The verovio component might need to be configured to output annotation IDs. Check the component's attributes:

```html
<edirom-verovio-renderer 
    id="verovio-renderer"
    meiurl="..."
    <!-- Maybe need to add: -->
    include-ids="true"
    <!-- or -->
    annotation-ids="true"
    <!-- or similar -->
>
</edirom-verovio-renderer>
```

Check the component documentation for:
- How to enable annotation ID output
- What attribute name is used for annotation IDs
- SVG rendering options

## Alternative: Extract from Class Name

If no ID attribute exists, the annotation ID might be encoded in the class name:

```javascript
// Example class: "wega.annotation.category.bogensetzung"
// Might contain ID somewhere?

const classAttr = annot.getAttributeNS(null, 'class');
const classes = classAttr.split(' ');

// Try to find annotation ID in classes
const annotClass = classes.find(c => c.startsWith('annot-') || c.includes('annotation'));
```

## Alternative: Use XPath or Data Attributes

If verovio doesn't output IDs, we might need to:

1. **Query the original MEI** to find annotations
2. **Match SVG elements** to MEI annotations by position/measure
3. **Add IDs** ourselves after verovio renders

## Next Steps

1. **Rebuild:**
   ```bash
   ./build.sh
   ```

2. **Check Console Output:**
   Look for `"Annotation element attributes:"` log

3. **Report Findings:**
   - What attributes are available?
   - Does `id` have a value?
   - What does `allAttributes` show?

4. **Based on findings**, we can:
   - Use the correct attribute name
   - Configure verovio component
   - Implement alternative ID extraction

## Files Modified

- `/resources/js/verovio-view.js` - Added attribute checking and debugging

## Summary

**Problem:** `data-id` attribute is `null` on annotation elements  
**Solution:** Try multiple attributes (`data-id`, `id`, JavaScript `id`)  
**Debugging:** Log all attributes to find where the ID actually is  
**Fallback:** Skip annotations with no ID to prevent errors  

**Next:** Check console output to see which attribute contains the annotation ID!
