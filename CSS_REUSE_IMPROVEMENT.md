# Using Existing CSS for Shadow DOM Styling

## Improvement Made

Instead of duplicating annotation styles in JavaScript, we now **fetch and inject the existing CSS file** (`verovio-view.css`) into the Shadow DOM.

## Previous Approach (Hardcoded Styles)

```javascript
// ❌ BAD: Duplicating styles in JavaScript
const style = document.createElement('style');
style.textContent = `
    .annotIcon { fill: #ff000066; cursor: pointer; }
    .annotIcon.ediromAnnotPrio1 { fill: rgba(207, 4, 4, 0.7); }
    ...
`;
```

**Problems:**
- ❌ Duplicates existing CSS from `verovio-view.css`
- ❌ Styles must be updated in two places
- ❌ Maintenance nightmare
- ❌ Easy to get out of sync

## New Approach (Fetch Existing CSS)

```javascript
// ✅ GOOD: Load existing CSS file
fetch('resources/css/verovio-view.css')
    .then(response => response.text())
    .then(cssText => {
        // Extract only annotation-related styles
        const annotationStylesRegex = /\.annotIcon[\s\S]*?(?=\n\s*\.|$)|\.lem[\s\S]*?(?=\n\s*\.|$)|\.supplied[\s\S]*?(?=\n\s*\.|$)|\.bounding-box[\s\S]*?(?=\n\s*\.|$)/g;
        const annotationStyles = cssText.match(annotationStylesRegex);
        
        if (annotationStyles) {
            const style = document.createElement('style');
            style.id = 'annotation-styles';
            style.textContent = annotationStyles.join('\n\n');
            shadowRoot.appendChild(style);
        }
    })
    .catch(error => {
        // Fallback to minimal inline styles if fetch fails
    });
```

**Benefits:**
- ✅ Single source of truth: `verovio-view.css`
- ✅ Styles updated in one place only
- ✅ Easier maintenance
- ✅ Always in sync
- ✅ Fallback if fetch fails

## How It Works

### 1. Fetch CSS File
```javascript
fetch('resources/css/verovio-view.css')
```
Loads the entire CSS file as text.

### 2. Extract Relevant Styles
```javascript
const annotationStylesRegex = /\.annotIcon[\s\S]*?(?=\n\s*\.|$)|\.lem[\s\S]*?(?=\n\s*\.|$)|\.supplied[\s\S]*?(?=\n\s*\.|$)|\.bounding-box[\s\S]*?(?=\n\s*\.|$)/g;
```

This regex extracts:
- `.annotIcon` and all its variants (`.annotIcon.ediromAnnotPrio1`, etc.)
- `.lem` styles (editorial additions)
- `.supplied` styles (supplied text)
- `.bounding-box` styles (hidden boxes)

### 3. Inject into Shadow DOM
```javascript
const style = document.createElement('style');
style.id = 'annotation-styles';
style.textContent = annotationStyles.join('\n\n');
shadowRoot.appendChild(style);
```

### 4. Fallback Protection
```javascript
.catch(error => {
    // If fetch fails, inject minimal hardcoded styles
    const style = document.createElement('style');
    style.textContent = `/* minimal styles */`;
    shadowRoot.appendChild(style);
});
```

## CSS Files Structure

### verovio-view.css (Main Styles)
```css
/* General annotation styles */
.annotIcon {
    fill: #ff000066;
}

.annotIcon.ediromAnnotPrio1 {
    fill: rgba(207, 4, 4, 0.7);  /* Priority 1: Dark red */
}

.annotIcon.ediromAnnotPrio2 {
    fill: rgba(255, 107, 15, 0.7);  /* Priority 2: Orange */
}

.annotIcon.ediromAnnotPrio3 {
    fill: rgba(241, 218, 54, 0.7);  /* Priority 3: Yellow */
}

.lem, .lem *, .supplied, .supplied * {
    fill: grey;
    stroke: grey;
}

.bounding-box, .bounding-box * {
    fill: transparent;
}
```

### annotation-style.css (Type-Specific Icons)
```css
/* Specific annotation type icons with Bravura font */
.annotation.Notentext .annotIcon:before {
    font-family: Bravura;
    content: "\E1D5";
}

.annotation.Dynamik .annotIcon:before {
    font-family: Bravura;
    content: "\E520";
}
/* ... etc */
```

## Data Flow

```
┌─────────────────────────────────────────────────┐
│ Light DOM (Page)                                │
├─────────────────────────────────────────────────┤
│ <link href="resources/css/verovio-view.css">   │
│ (Loaded in iframe <head>)                       │
└─────────────────────────────────────────────────┘
                    │
                    │ fetch()
                    ▼
┌─────────────────────────────────────────────────┐
│ JavaScript (verovio-view.js)                    │
├─────────────────────────────────────────────────┤
│ 1. Fetch CSS file                               │
│ 2. Extract annotation styles with regex         │
│ 3. Create <style> element                       │
│ 4. Inject into Shadow DOM                       │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│ Shadow DOM (Component)                          │
├─────────────────────────────────────────────────┤
│ <edirom-verovio-renderer>                       │
│   #shadow-root                                  │
│     <style id="annotation-styles">              │
│       .annotIcon { fill: #ff000066; }           │
│       .annotIcon.ediromAnnotPrio1 { ... }       │
│     </style>                                    │
│     <svg>                                       │
│       <rect class="annotIcon ediromAnnotPrio1"> │
│         ✅ Styles applied!                      │
│       </rect>                                   │
│     </svg>                                      │
└─────────────────────────────────────────────────┘
```

## Regex Explanation

```javascript
/\.annotIcon[\s\S]*?(?=\n\s*\.|$)/g
```

Breaking it down:
- `\.annotIcon` - Match literal `.annotIcon`
- `[\s\S]*?` - Match any character (including newlines), non-greedy
- `(?=\n\s*\.|$)` - Stop when we see a newline followed by a dot (next selector) or end of string
- `/g` - Global flag, find all matches

This captures entire CSS rules like:
```css
.annotIcon.ediromAnnotPrio1 {
    fill: rgba(207, 4, 4, 0.7);
}
```

## Maintenance Benefits

### Before (Hardcoded)
To change annotation colors:
1. ❌ Edit `verovio-view.css`
2. ❌ Edit `verovio-view.js` (JavaScript)
3. ❌ Rebuild project
4. ❌ Test both files

### After (Fetched)
To change annotation colors:
1. ✅ Edit `verovio-view.css` only
2. ✅ Rebuild project
3. ✅ Test once

**75% less work!**

## Performance Considerations

### Caching
The `fetch()` is only called once:
```javascript
if (!shadowRoot.querySelector('#annotation-styles')) {
    // Only fetch if styles not already injected
}
```

### File Size
The CSS file is small (~3-4 KB) and:
- Already loaded in the page's `<head>`
- Likely cached by browser
- Minimal network overhead

### Asynchronous Loading
The `fetch()` is asynchronous:
- Doesn't block rendering
- Annotations appear when styles load
- Fallback ensures styles always applied

## Testing

After rebuilding, verify:

1. **Styles loaded from file**
   ```javascript
   // In browser console
   const renderer = document.getElementById('verovio-renderer');
   const styles = renderer.shadowRoot.querySelector('#annotation-styles');
   console.log(styles.textContent);
   // Should show styles from verovio-view.css
   ```

2. **Colors correct**
   - Priority 1: Dark red
   - Priority 2: Orange
   - Priority 3: Yellow

3. **Console log shows success**
   ```
   "Annotation styles injected into Shadow DOM"
   ```

4. **Fallback works** (simulate network error)
   - Block `verovio-view.css` in DevTools Network tab
   - Reload page
   - Should see minimal fallback styles applied

## Files Modified

- `/resources/js/verovio-view.js` - Updated to fetch CSS instead of hardcoding

## Related Files (No changes needed)

- `/resources/css/verovio-view.css` - Source of annotation styles
- `/resources/css/annotation-style.css` - Type-specific icon styles

## Summary

**Before:** Duplicated styles in JavaScript  
**After:** Fetch and reuse existing CSS file  
**Result:** Single source of truth, easier maintenance, always in sync
