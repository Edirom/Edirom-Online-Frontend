![GitHub License](https://img.shields.io/github/license/Edirom/edirom-image-viewer)

# Edirom Image Viewer Component

This web component displays IIIF images using the [OpenSeadragon](https://openseadragon.github.io) library. It is intended to be used in the Edirom Online, but can also be (re-)used in other web applications. No compilation or building is necessary to use the web component.

**Note:** This repository only contains the bare JavaScript-based component. There is a separate [demo suite](https://github.com/Edirom/edirom-web-components-demonstrator) for web components developed in the Edirom Online Reloaded project, where the component can be seen and tested.

## Features

- **IIIF Support**: Load IIIF manifests or direct tile sources
- **Image Navigation**: Navigate through multi-page image sequences
- **Zoom & Pan**: Interactive zoom and pan controls
- **Rotation**: Rotate images to any angle
- **Customizable Controls**: Show/hide navigator, zoom buttons, home button, fullscreen toggle
- **Attribute-Driven**: All interactions through standard HTML attributes
- **Custom Configuration**: Pass advanced OpenSeadragon options via JSON
- **Event Communication**: Custom events for state changes

## License

The `edirom-image-viewer.js` comes with the MIT license.

The imported OpenSeadragon library comes with the BSD-3-Clause license.

## How to Use This Web Component

### 1. Include the Component

Add the web component script to your HTML page's `<head>`:

```html
<script src="https://cdn.jsdelivr.net/npm/openseadragon@4.1.1/build/openseadragon/openseadragon.min.js"></script>
<script src="path/to/edirom-image-viewer.js"></script>
```

### 2. Add the Custom Element

Include the custom element in your HTML `<body>`:

```html
<edirom-openseadragon 
    tilesources='["https://example.com/iiif/manifest.json"]'
    shownavigator="true"
    showzoomcontrol="true"
    sequencemode="true">
</edirom-openseadragon>
```

### 3. Interact via Attributes

Control the component by setting attributes programmatically:

```javascript
const viewer = document.querySelector('edirom-openseadragon');
viewer.setAttribute('zoom', '2.5');
viewer.setAttribute('rotation', '90');
viewer.setAttribute('pagenumber', '5');
```

### 4. Listen to Events

The component fires custom events when state changes:

```javascript
viewer.addEventListener('communicate-zoom-update', (event) => {
    console.log('Zoom changed:', event.detail);
});
```

## Attributes

_Note: All attribute values are strings. The data type information indicates the expected format._

**Important Note on Page Numbering**: Page numbers are **1-based** for user-facing interactions. This means:
- Page 1 = First image
- Page 2 = Second image
- And so on...

This applies to `pagenumber` attribute and all page-related methods. The component automatically converts between 1-based (user) and 0-based (internal) indexing.

| Attribute                | Type    | Description                                                                                                                                             | Default  |
|--------------------------|---------|---------------------------------------------------------------------------------------------------------------------------------------------------------|----------|
| `tilesources`            | string  | JSON array of IIIF manifest URLs or tile source URLs. Example: `'["https://example.com/manifest.json"]'` or `'["https://example.com/info.json"]'` | `""`     |
| `pagenumber`             | number  | Current page number in a multi-image sequence (1-based, where 1 = first image).                                                                       | `1`      |
| `zoom`                   | number  | Zoom level of the viewer.                                                                                                                                | `1`      |
| `rotation`               | number  | Rotation angle in degrees (0-360).                                                                                                                       | `0`      |
| `clicktozoom`            | boolean | Enable click-to-zoom functionality.                                                                                                                      | `true`   |
| `shownavigationcontrol`  | boolean | Show/hide all navigation controls.                                                                                                                       | `true`   |
| `sequencemode`           | boolean | Enable sequence mode for multi-image navigation.                                                                                                         | `false`  |
| `shownavigator`          | boolean | Show/hide the navigator mini-map.                                                                                                                        | `true`   |
| `showzoomcontrol`        | boolean | Show/hide zoom in/out buttons.                                                                                                                           | `true`   |
| `showhomecontrol`        | boolean | Show/hide the home/reset view button.                                                                                                                    | `true`   |
| `showfullpagecontrol`    | boolean | Show/hide the fullscreen toggle button.                                                                                                                  | `true`   |
| `showsequencecontrol`    | boolean | Show/hide previous/next page buttons (requires `sequencemode="true"`).                                                                                   | `true`   |
| `triggerhome`            | boolean | Trigger home position reset (set to `"true"` to reset view to initial state).                                                                            | `"false"` |
| `triggerfullscreen`      | boolean | Trigger fullscreen mode toggle (set to `"true"` to toggle fullscreen).                                                                                   | `"false"` |
| `openseadragon-options`  | string  | JSON object with additional OpenSeadragon configuration options. Example: `'{"showNavigator": true}'`                             | `""`     |

## Public Methods

The component provides the following public methods:

### Navigation
- `nextPage()` - Navigate to the next page
- `previousPage()` - Navigate to the previous page
- `goToPage(pageNumber)` - Navigate to a specific page
- `getCurrentPage()` - Get the current page number
- `getTotalPages()` - Get the total number of pages

### Zoom
- `zoomIn()` - Zoom in by 20%
- `zoomOut()` - Zoom out by 20%
- `setZoom(level)` - Set zoom to a specific level
- `getZoom()` - Get the current zoom level

### View Control
- `home()` - Reset view to initial state
- `setFullScreen(fullScreen)` - Set fullscreen mode (true/false)
- `toggleFullScreen()` - Toggle fullscreen mode
- `isFullScreen()` - Check if in fullscreen mode

### Rotation
- `rotate(degrees)` - Rotate by specified degrees (relative)
- `setRotation(degrees)` - Set rotation to specific angle (absolute)
- `getRotation()` - Get current rotation angle

## Examples

### Basic IIIF Manifest

```html
<edirom-openseadragon 
    tilesources='["https://example.com/iiif/manifest.json"]'>
</edirom-openseadragon>
```

### Multi-Page Sequence with Controls and Trigger Attributes

```html
<edirom-openseadragon 
    id="viewer"
    tilesources='["https://content.staatsbibliothek-berlin.de/dc/69007087X-0001/info.json", "https://content.staatsbibliothek-berlin.de/dc/69007087X-0002/info.json"]'
    pagenumber="1"
    zoom="1"
    rotation="0"
    triggerhome="false"
    triggerfullscreen="false"
    sequencemode="true"
    showsequencecontrol="true"
    shownavigator="true"
    showzoomcontrol="true"
    showhomecontrol="true"
    showfullpagecontrol="true">
</edirom-openseadragon>
```

### Controlling via JavaScript and Triggers

```javascript
const viewer = document.querySelector('edirom-openseadragon');

// Navigate to page 3
viewer.setAttribute('pagenumber', '3');

// Zoom to level 2
viewer.setAttribute('zoom', '2');

// Reset to home position
viewer.setAttribute('triggerhome', 'true');

// Toggle fullscreen
viewer.setAttribute('triggerfullscreen', 'true');
```

### Custom OpenSeadragon Configuration

<!-- Example: Disable sequence mode via options -->
<edirom-openseadragon 
    openseadragon-options='{"sequenceMode": false}'>
</edirom-openseadragon>


## IIIF Support

The component supports both IIIF manifests and direct image tile sources:

- **IIIF Manifests**: Automatically fetches and parses IIIF Presentation API manifests to extract image URLs
- **Direct Tile Sources**: Use IIIF Image API info.json URLs directly

## Trigger Attributes

Trigger attributes are used to invoke actions on the viewer. Set these attributes to `"true"` to trigger the corresponding action:

- **`triggerhome`**: Reset view to initial/home position
- **`triggerfullscreen`**: Toggle fullscreen mode on/off

Example:
```javascript
const viewer = document.querySelector('edirom-openseadragon');
viewer.setAttribute('triggerhome', 'true');      // Reset to home position
viewer.setAttribute('triggerfullscreen', 'true'); // Toggle fullscreen
```

## Events

The component fires custom events when attributes change:

- `communicate-zoom-update` - Fired when zoom level changes
- `communicate-rotation-update` - Fired when rotation changes
- `communicate-pagenumber-update` - Fired when page changes
- `communicate-triggerhome-update` - Fired when home is triggered
- `communicate-triggerfullscreen-update` - Fired when fullscreen is triggered
- And more for each observable attribute

## Browser Support

The component uses modern web standards (Custom Elements, Shadow DOM) and requires a modern browser with ES6+ support



