# Edirom Verovio Renderer - Quick Reference

## Component Attributes

### Required
- `meiurl` - URL to the MEI file to render

### Optional
- `zoom` - Zoom level (10-100, default: 20)
- `pagenumber` - Current page number (default: 1)
- `movementid` - XML ID of the movement to display
- `elementid` - XML ID of element to navigate to (e.g., measure ID)
- `measurenumber` - Measure number to navigate to (by @n attribute)
- `mdivname` - Movement name/label to filter measures
- `pagewidth` - Width in Verovio units (100-100000, default: 4500)
- `pageheight` - Height in Verovio units (100-60000, default: 4500)
- `verovio-url` - URL to Verovio toolkit (default: CDN latest)
- `verovio-options` - JSON string with Verovio options

## Usage Examples

### Basic Usage
```javascript
// Create the component
var renderer = document.createElement('edirom-verovio-renderer');
renderer.setAttribute('meiurl', 'path/to/file.mei');
renderer.setAttribute('zoom', '40');
container.appendChild(renderer);
```

### Navigate to Movement
```javascript
renderer.setAttribute('movementid', 'movement-id-123');
```

### Navigate to Measure
```javascript
// By XML ID
renderer.setAttribute('elementid', 'measure-m-45');

// By measure number
renderer.setAttribute('measurenumber', '45');

// By measure number within specific movement
renderer.setAttribute('mdivname', 'Movement I');
renderer.setAttribute('measurenumber', '45');
```

### Change Zoom
```javascript
renderer.setAttribute('zoom', '60'); // 10-100
```

### Change Page
```javascript
renderer.setAttribute('pagenumber', '2');
```

### Adjust Viewport Size
```javascript
renderer.setAttribute('width', '800');
renderer.setAttribute('height', '600');
```

### Custom Verovio Options
```javascript
var options = {
  breaks: 'auto',
  scale: 40,
  pageWidth: 5000,
  pageHeight: 5000,
  footer: 'none',
  header: 'none'
};
renderer.setAttribute('verovio-options', JSON.stringify(options));
```

## Events

### page-info-update
Fired after rendering completes or page changes.

```javascript
renderer.addEventListener('page-info-update', function(event) {
  console.log('Current page:', event.detail.pageNumber);
  console.log('Total pages:', event.detail.totalPages);
});
```

### communicate-*-update
Fired when any attribute changes.

```javascript
renderer.addEventListener('communicate-zoom-update', function(event) {
  console.log('Zoom changed to:', event.detail.value);
});

renderer.addEventListener('communicate-pagenumber-update', function(event) {
  console.log('Page changed to:', event.detail.value);
});
```

## ExtJS Integration Pattern

In VerovioView.js, the component is integrated as follows:

```javascript
initComponent: function() {
  var me = this;
  
  // Create container for web component
  me.html = '<div id="' + me.id + '_verovioContainer" style="width: 100%; height: 100%;"></div>';
  
  me.callParent();
  
  // Initialize after render
  me.on('afterrender', me.initVerovioRenderer, me, { single: true });
}

initVerovioRenderer: function() {
  var me = this;
  var container = document.getElementById(me.id + '_verovioContainer');
  
  if (container) {
    me.verovioRenderer = document.createElement('edirom-verovio-renderer');
    me.verovioRenderer.setAttribute('verovio-url', 'https://www.verovio.org/javascript/latest/verovio-toolkit-wasm.js');
    me.verovioRenderer.setAttribute('zoom', '40');
    
    container.appendChild(me.verovioRenderer);
    
    // Handle resize
    me.on('resize', function() {
      if (me.verovioRenderer && me.getEl()) {
        var width = me.getEl().getWidth();
        var height = me.getEl().getHeight();
        me.verovioRenderer.setAttribute('width', width);
        me.verovioRenderer.setAttribute('height', height);
      }
    });
  }
}
```

## Methods (via Attributes)

Since this is a web component, all methods are accessed via attributes:

| Method | Attribute | Example |
|--------|-----------|---------|
| Load MEI | `meiurl` | `setAttribute('meiurl', 'file.mei')` |
| Zoom | `zoom` | `setAttribute('zoom', '50')` |
| Go to page | `pagenumber` | `setAttribute('pagenumber', '3')` |
| Go to element | `elementid` | `setAttribute('elementid', 'measure-1')` |
| Go to measure | `measurenumber` | `setAttribute('measurenumber', '10')` |
| Go to movement | `movementid` | `setAttribute('movementid', 'mvmt-1')` |

## Debugging

### Check if component is loaded
```javascript
console.log('Component defined:', customElements.get('edirom-verovio-renderer'));
```

### Check Verovio toolkit status
```javascript
console.log('Verovio toolkit:', renderer.tk);
console.log('Total pages:', renderer.totalPages);
```

### Check current state
```javascript
console.log('MEI URL:', renderer.meiurl);
console.log('Current page:', renderer.pageNumber);
console.log('Zoom level:', renderer.zoom);
```

## Common Issues

### Component not rendering
- Ensure the script is loaded before creating the component
- Check console for Verovio toolkit loading errors
- Verify MEI URL is accessible

### Zoom not working
- Ensure zoom value is between 10 and 100
- Check if Verovio toolkit is initialized (`renderer.tk !== null`)

### Navigation not working
- Verify the element ID exists in the MEI file
- Check if MEI data is loaded (`renderer.meiData !== null`)
- Ensure measure numbers match the @n attribute in MEI

### Resize issues
- Make sure width/height attributes are set in pixels
- Verify the container has explicit dimensions
- Check if resize event is properly bound
