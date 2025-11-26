# Verovio Renderer Debugging Guide

## Steps to Debug the Verovio Renderer Component

### 1. Check Browser Console
Open your browser's Developer Tools (F12) and check the Console tab for:

- **Component creation logs**:
  ```
  DEBUG: Creating Verovio renderer component
  DEBUG: MEI URL: [url]
  DEBUG: Movement ID: [id]
  DEBUG: Init Height: [height] Init Width: [width]
  DEBUG: Verovio Options: [options]
  DEBUG: Renderer HTML: [html]
  ```

- **Component detection logs** (after 100ms):
  ```
  DEBUG: Component found in DOM: [element or null]
  DEBUG: Component attributes: [object]
  DEBUG: Custom element defined: [function or undefined]
  ```

- **Component internal logs**:
  ```
  Edirom Verovio Renderer added to page.
  ```

### 2. Check if Component Script is Loaded
In the browser console, type:
```javascript
customElements.get('edirom-verovio-renderer')
```
- If it returns a function → Component is registered ✓
- If it returns `undefined` → Component script didn't load or register ✗

### 3. Verify Component is in DOM
In the browser console, type:
```javascript
document.querySelector('edirom-verovio-renderer')
```
- If it returns an element → Component is in DOM ✓
- If it returns `null` → Component was not inserted ✗

### 4. Check Required Variables
Ensure these variables are defined before `showMovement()` is called:
```javascript
// Check in console:
appBasePath  // Should be a string like "http://localhost:8080/exist/apps/..."
uri          // Should be the URI of the MEI document
edition      // Should be the edition identifier
movementId   // Should be the movement ID
```

### 5. Check MEI URL Accessibility
Copy the MEI URL from the console log and try to access it directly in a new browser tab:
- If you see XML/MEI data → URL is correct ✓
- If you get 404 or error → Backend issue or wrong URL ✗

### 6. Check for CORS Issues
Look for errors like:
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```
This means the backend needs CORS headers configured.

### 7. Check Shadow DOM Content
In the browser console, inspect the component's shadow DOM:
```javascript
var component = document.querySelector('edirom-verovio-renderer');
console.log(component.shadowRoot.innerHTML);
```
Look for:
- The `#verovio-svg` div
- Any SVG content inside it
- Error messages

### 8. Check Network Tab
Open the Network tab in Developer Tools:
- Look for the request to the MEI URL
- Check if it returns 200 (success) or an error code
- Check the response to see if valid MEI data is returned
- Look for the Verovio toolkit loading from CDN

### 9. Common Issues and Solutions

#### Issue: Component not defined
**Symptom**: `customElements.get('edirom-verovio-renderer')` returns `undefined`

**Solutions**:
- Check if `edirom-verovio-renderer-component.js` is included in `index.html`
- Check browser console for JavaScript errors in the component file
- Ensure the script loads before the component is used

#### Issue: MEI data not loading
**Symptom**: No SVG appears, network request fails

**Solutions**:
- Verify backend is running
- Check MEI URL is correct and accessible
- Check for CORS issues
- Verify `appBasePath`, `uri`, `edition`, `movementId` are defined

#### Issue: Component renders but SVG is empty
**Symptom**: Component exists in DOM but no visible music notation

**Solutions**:
- Check if MEI data is valid XML
- Check Verovio options (width/height might be 0)
- Check if Verovio toolkit loaded successfully
- Look for errors in component's internal console logs

#### Issue: Variables undefined
**Symptom**: Console shows `undefined` for `uri`, `edition`, or `movementId`

**Solutions**:
- These should be defined in the parent frame/window
- Check how `verovio-view.js` is loaded (in iframe?)
- May need to pass variables from parent window

### 10. Quick Test Command
Run this in the browser console after page loads:
```javascript
// Check everything at once
console.log("Component defined:", customElements.get('edirom-verovio-renderer'));
console.log("Component in DOM:", document.querySelector('edirom-verovio-renderer'));
console.log("Variables:", { appBasePath, uri, edition, movementId });
var comp = document.querySelector('edirom-verovio-renderer');
if (comp) {
    console.log("Shadow DOM:", comp.shadowRoot.innerHTML.substring(0, 500));
}
```

## Additional Debugging Tips

1. **Enable verbose logging**: The component already has `console.log` statements. Check for these in the console.

2. **Test with a simple MEI file**: Try with a known-good, simple MEI file URL first.

3. **Check iframe context**: If this runs in an iframe, ensure variables are accessible from the correct scope.

4. **Verovio version**: Make sure Verovio 5.3.2 is compatible with your MEI files.

5. **Browser compatibility**: Test in different browsers (Chrome, Firefox, Safari).
