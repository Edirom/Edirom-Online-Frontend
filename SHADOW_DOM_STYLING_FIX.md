# Shadow DOM Styling Fix - Annotation Boxes

## Problem

Annotation boxes were appearing **black** instead of their configured colors (red, orange, yellow for different priority levels).

## Root Cause

### Shadow DOM Encapsulation

The `<edirom-verovio-renderer>` web component uses **Shadow DOM**, which provides style encapsulation:

```
Light DOM (page)
    ├── verovio-view.css (styles here)
    └── <edirom-verovio-renderer>
            └── Shadow DOM (isolated!)
                    ├── SVG rendering
                    └── Annotation boxes ❌ Can't see light DOM styles!
```

**Key Issue:**
- Styles in `verovio-view.css` exist in the **Light DOM**
- Annotation boxes are created in the **Shadow DOM**
- Shadow DOM is **encapsulated** and doesn't inherit Light DOM styles
- Result: Annotation boxes have no styling → default to black

### The CSS That Wasn't Applied

```css
/* In verovio-view.css - NOT accessible from Shadow DOM */
.annotIcon {
    fill: #ff000066;  /* Semi-transparent red */
}

.annotIcon.ediromAnnotPrio1 {
    fill: rgba(207, 4, 4, 0.7);  /* Priority 1: Dark red */
}

.annotIcon.ediromAnnotPrio2{
    fill: rgba(255, 107, 15, 0.7);  /* Priority 2: Orange */
}

.annotIcon.ediromAnnotPrio3 {
    fill: rgba(241, 218, 54, 0.7);  /* Priority 3: Yellow */
}
```

## Solution: Inject Styles into Shadow DOM

We inject the annotation styles **directly into the Shadow DOM** so they can be applied to the annotation boxes.

### Code Changes

**File:** `/resources/js/verovio-view.js`  
**Function:** `updatePageData()`  
**Lines:** 192-220

```javascript
const shadowRoot = window.verovioRenderer.shadowRoot;

// Inject annotation styles into shadow DOM (only once)
if (!shadowRoot.querySelector('#annotation-styles')) {
    const style = document.createElement('style');
    style.id = 'annotation-styles';
    style.textContent = `
        .annotIcon {
            fill: #ff000066;
            cursor: pointer;
        }
        
        .annotIcon.ediromAnnotPrio1 {
            fill: rgba(207, 4, 4, 0.7);
        }
        
        .annotIcon.ediromAnnotPrio2 {
            fill: rgba(255, 107, 15, 0.7);
        }
        
        .annotIcon.ediromAnnotPrio3 {
            fill: rgba(241, 218, 54, 0.7);
        }
        
        .lem, .lem *, .supplied, .supplied * {
            fill: grey;
            stroke: grey;
        }
        
        .bounding-box, .bounding-box * {
            fill: transparent;
        }
    `;
    shadowRoot.appendChild(style);
}
```

## How It Works

### Before (Broken)

```
Light DOM
├── <style> (verovio-view.css)
│   └── .annotIcon { fill: red; }  ← Styles here
│
└── <edirom-verovio-renderer>
    └── #shadow-root
        └── <rect class="annotIcon">  ← Can't see styles!
            Result: BLACK (default)
```

### After (Fixed)

```
Light DOM
└── <edirom-verovio-renderer>
    └── #shadow-root
        ├── <style id="annotation-styles">  ← Styles injected here!
        │   └── .annotIcon { fill: red; }
        │
        └── <rect class="annotIcon">  ← Can see styles! ✅
            Result: RED (correct)
```

## Key Features

### 1. **One-Time Injection**
```javascript
if (!shadowRoot.querySelector('#annotation-styles')) {
    // Only inject if not already present
}
```
- Styles are injected only once
- Checked by looking for element with id `annotation-styles`
- Prevents duplicate style tags

### 2. **Priority-Based Colors**
```javascript
.annotIcon.ediromAnnotPrio1 { fill: rgba(207, 4, 4, 0.7); }   // Dark red
.annotIcon.ediromAnnotPrio2 { fill: rgba(255, 107, 15, 0.7); } // Orange
.annotIcon.ediromAnnotPrio3 { fill: rgba(241, 218, 54, 0.7); } // Yellow
```
- Different priority annotations get different colors
- Makes it easy to distinguish importance

### 3. **Additional Styles**
```javascript
.lem, .supplied { fill: grey; }           // Editorial additions
.bounding-box { fill: transparent; }      // Hidden bounding boxes
```

## Understanding Shadow DOM Styling

### Shadow DOM Basics

Web Components use Shadow DOM for encapsulation:

| Feature | Light DOM | Shadow DOM |
|---------|-----------|------------|
| **Styling** | Global CSS applies | Isolated, needs own styles |
| **Inheritance** | Inherits from document | Only inherits inherited properties |
| **Encapsulation** | No isolation | Fully isolated |
| **Access** | Direct access | Via `.shadowRoot` property |

### Three Ways to Style Shadow DOM

1. **Inject styles (our approach)**
   ```javascript
   shadowRoot.appendChild(styleElement);
   ```
   ✅ Flexible, can be updated dynamically
   
2. **Constructable Stylesheets**
   ```javascript
   shadowRoot.adoptedStyleSheets = [stylesheet];
   ```
   ✅ More performant, harder to setup
   
3. **Inside Component**
   ```javascript
   // In the web component's constructor
   this.shadowRoot.innerHTML = `<style>...</style>`;
   ```
   ❌ Not possible when we don't control the component

## Testing

After rebuilding, verify:

- [ ] Annotation boxes are **visible** (not black)
- [ ] Priority 1 annotations are **dark red**
- [ ] Priority 2 annotations are **orange**
- [ ] Priority 3 annotations are **yellow**
- [ ] Hovering shows **pointer cursor**
- [ ] Clicking annotation opens link
- [ ] Styles persist across page changes

## Debug Commands

### Check if styles are injected
```javascript
// In browser console
const renderer = document.getElementById('verovio-renderer');
const styles = renderer.shadowRoot.querySelector('#annotation-styles');
console.log(styles.textContent);
```

### Check annotation classes
```javascript
const renderer = document.getElementById('verovio-renderer');
const annots = renderer.shadowRoot.querySelectorAll('.annotIcon');
annots.forEach(a => console.log(a.getAttribute('class')));
```

### Check computed styles
```javascript
const renderer = document.getElementById('verovio-renderer');
const annot = renderer.shadowRoot.querySelector('.annotIcon');
console.log(getComputedStyle(annot).fill);
// Should show: "rgba(207, 4, 4, 0.7)" or similar, NOT "rgb(0, 0, 0)"
```

## Related Documentation

- [Shadow DOM Styling Guide](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM#styling)
- [CSS Scoping in Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/CSS/:host)
- [Web Components Best Practices](https://developers.google.com/web/fundamentals/web-components/best-practices)

## Files Modified

- `/resources/js/verovio-view.js` - Added style injection in `updatePageData()`

## Summary

**Problem:** Annotation boxes were black because Shadow DOM encapsulation blocked external CSS.

**Solution:** Inject annotation styles directly into the Shadow DOM so they can be applied to elements inside it.

**Result:** Annotation boxes now display with correct priority-based colors (red, orange, yellow).
