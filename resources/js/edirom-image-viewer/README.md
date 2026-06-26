![GitHub License](https://img.shields.io/github/license/Edirom/edirom-image-viewer)

# Edirom Image Viewer Component

This web component displays IIIF images using the [OpenSeadragon](https://openseadragon.github.io) library. It is intended to be used in the Edirom Online, but can also be (re-)used in other web applications. No compilation or building is necessary to use the web component.

**Note:** This repository only contains the bare JavaScript-based component. There is a separate [demo suite](https://github.com/Edirom/edirom-web-components-demonstrator) for web components developed in the Edirom Online Reloaded project, where the component can be seen and tested.

## Features

- **IIIF Support**: Load IIIF manifests or direct tile sources
- **Image Navigation**: Navigate through multi-page image sequences
- **Zoom & Pan**: Interactive zoom and pan controls
- **Zoom Limits**: Enforced `minzoomlevel` / `maxzoomlevel` bounds — programmatic zoom is clamped to the configured range
- **Rotation**: Rotate images to any angle
- **Customizable Controls**: Show/hide navigator, zoom buttons, home button, fullscreen toggle
- **Attribute-Driven**: All interactions through standard HTML attributes
- **Custom Configuration**: Pass advanced OpenSeadragon options via JSON
- **Event Communication**: Custom events for state changes
- **Region Navigation**: Define lookup maps of named regions and jump to them with pixel-precise, aspect-preserving viewport fits, including automatic cross-page navigation. Three complementary lookup maps are supported:
    - **Zones** (`zones-data` / `zone`) — generic named regions.
    - **Measures** (`measures-data` / `measure`) — music measures/bars.
    - **Movements** (`mdivs-data` / `mdiv`) — MEI `<mdiv>` movements (page-level, optional region).
- **Rectangle Fit** (`fitrect`): Fit the viewport to an arbitrary image-pixel rectangle.
- **View Mode** (`view-mode`): Declarative view-mode attribute that is recorded and re-broadcast for host code to react to.

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
<edirom-image-viewer 
    tilesources='["https://example.com/iiif/manifest.json"]'
    shownavigator="true"
    showzoomcontrol="true"
    sequencemode="true">
</edirom-image-viewer>
```

### 3. Interact via Attributes

Control the component by setting attributes programmatically:

```javascript
const viewer = document.querySelector('edirom-image-viewer');
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
| `zoom`                   | number  | Zoom level of the viewer. Values are clamped to `[minzoomlevel, maxzoomlevel]`.                                                                          | `1`      |
| `rotation`               | number  | Rotation angle in degrees (0-360).                                                                                                                       | `0`      |
| `preserveviewport`       | boolean | Preserve the current viewport (zoom/pan) when changing pages.                                                                                            | `false`  |
| `clicktozoom`            | boolean | Enable click-to-zoom functionality.                                                                                                                      | `true`   |
| `minzoomlevel`           | number  | Minimum allowed zoom level. Programmatic `zoom` is clamped to this lower bound.                                                                          | OSD default |
| `maxzoomlevel`           | number  | Maximum allowed zoom level. Programmatic `zoom` is clamped to this upper bound.                                                                          | OSD default |
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
| `zones-data`             | string  | JSON object mapping zone keys to zone objects. Each zone: `{ page: number, ulx: number, uly: number, lrx: number, lry: number }`. See [Region Navigation](#region-navigation) for details. | `"{}"` |
| `zone`                   | string  | Key of the zone to navigate to. Must exist in `zones-data`. Setting this attribute triggers navigation to the zone. | `""` |
| `measures-data`          | string  | JSON object mapping measure keys to region objects `{ page, ulx, uly, lrx, lry }`. Lookup map for `measure`. See [Region Navigation](#region-navigation). | `"{}"` |
| `measure`                | string  | Key of the measure to navigate to (must exist in `measures-data`). Append `\|<nonce>` to re-fire navigation to the same measure. | `""` |
| `mdivs-data`             | string  | JSON object mapping movement (`mdiv`) keys to objects `{ page }` (with optional region). Lookup map for `mdiv`. See [Region Navigation](#region-navigation). | `"{}"` |
| `mdiv`                   | string  | Key of the movement to navigate to (must exist in `mdivs-data`). Append `\|<nonce>` to re-fire navigation to the same movement. | `""` |
| `fitrect`                | string  | Fit the viewport to an image-pixel rectangle `"x,y,width,height"`. An optional trailing `,<nonce>` token re-fires the same fit. | `""` |
| `view-mode`              | string  | Declarative view mode (e.g. `pageBasedView` / `measureBasedView`). Recorded and re-broadcast via the `view-mode-changed` event for host code to react to. | `""` |

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
- `setZoom(level)` - Set zoom to a specific level (clamped to `[minzoomlevel, maxzoomlevel]`)
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
<edirom-image-viewer 
    tilesources='["https://example.com/iiif/manifest.json"]'>
</edirom-image-viewer>
```

### Multi-Page Sequence with Controls and Trigger Attributes

```html
<edirom-image-viewer 
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
</edirom-image-viewer>
```

### Controlling via JavaScript and Triggers

```javascript
const viewer = document.querySelector('edirom-image-viewer');

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
<edirom-image-viewer 
    openseadragon-options='{"sequenceMode": false}'>
</edirom-image-viewer>


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
const viewer = document.querySelector('edirom-image-viewer');
viewer.setAttribute('triggerhome', 'true');      // Reset to home position
viewer.setAttribute('triggerfullscreen', 'true'); // Toggle fullscreen
```

## Events

The component fires a generic `communicate-[property]-update` event whenever any observed attribute changes:

- `communicate-zoom-update` - Fired when zoom level changes
- `communicate-rotation-update` - Fired when rotation changes
- `communicate-pagenumber-update` - Fired when page changes
- `communicate-triggerhome-update` - Fired when home is triggered
- `communicate-triggerfullscreen-update` - Fired when fullscreen is triggered
- And one for every other observable attribute

The component also fires dedicated semantic events:

| Event                | Detail                       | Fired when |
|----------------------|------------------------------|------------|
| `page-changed`       | `{ pageNumber }` (1-based)   | The viewer navigates to a new page. |
| `zone-changed`       | `{ zoneKey, zone }`          | Navigation to a `zone` completes. |
| `measure-changed`    | `{ key, region }`            | Navigation to a `measure` completes. |
| `mdiv-changed`       | `{ key, region }`            | Navigation to an `mdiv` completes. |
| `view-mode-changed`  | `{ viewMode }`               | The `view-mode` attribute changes. |
| `zoom`               | `{ zoom }`                   | The OpenSeadragon viewport zoom changes. |
| `image-ready`        | —                            | The image/tiles have finished loading. |

```javascript
viewer.addEventListener('page-changed', (event) => {
    console.log('Navigated to page:', event.detail.pageNumber);
});

viewer.addEventListener('measure-changed', (event) => {
    console.log('Navigated to measure:', event.detail.key);
});
```

## Region Navigation

The component supports pixel-precise navigation to named rectangular regions on any page, independent of OSD's own sequence controls. Three parallel lookup maps share the same mechanism and the same region object shape:

| Lookup map      | Trigger attribute | Completion event   | Typical use |
|-----------------|-------------------|--------------------|-------------|
| `zones-data`    | `zone`            | `zone-changed`     | Generic named regions |
| `measures-data` | `measure`         | `measure-changed`  | Music measures / bars |
| `mdivs-data`    | `mdiv`            | `mdiv-changed`     | MEI `<mdiv>` movements (page-level, optional region) |

### Region Object Format

Each entry in a `*-data` map must have a 1-based `page` number and (for precise fits) pixel coordinates (`ulx`, `uly`, `lrx`, `lry`) defining the upper-left and lower-right corners of the region. Movements (`mdivs-data`) may carry only a `page` to navigate to the movement's first page without a region fit.

```json
{
  "measure_1": { "page": 1, "ulx": 100, "uly": 200, "lrx": 800, "lry": 600 },
  "measure_2": { "page": 1, "ulx": 900, "uly": 200, "lrx": 1600, "lry": 600 },
  "measure_3": { "page": 2, "ulx": 150, "uly": 300, "lrx": 950, "lry": 700 }
}
```

- **Same page**: the viewer fits the region directly (aspect-preserving).
- **Cross-page**: the component navigates to the target page first, waits until its tiles are loaded, then applies the region — ensuring coordinate conversion is always accurate.
- **Updating `zones-data`**: setting a new `zones-data` value while a zone is active re-applies the current zone against the updated data.

### Push model: data map + trigger

The `*-data` attribute is a **lookup map** (set once, performs no navigation on its own). The matching trigger attribute (`zone` / `measure` / `mdiv`) is the **navigation trigger** and must hold a key that exists in the map. To re-fire navigation to the **same** key, append a `|<nonce>` token to the trigger value — it is stripped before lookup:

```javascript
let nonce = 0;
viewer.setAttribute('measure', 'measure_1|' + (++nonce)); // jump
viewer.setAttribute('measure', 'measure_1|' + (++nonce)); // jump again to the same measure
```

Empty trigger values (`measure=""`, `mdiv=""`) are ignored, so they are safe as defaults in markup.

### Example: Measure Navigation

```html
<edirom-image-viewer
    id="viewer"
    sequencemode="true"
    showsequencecontrol="false"
    tilesources='[...]'
    measures-data='{}'
    measure="">
</edirom-image-viewer>
```

```javascript
const viewer = document.querySelector('#viewer');

// Populate the lookup map
viewer.setAttribute('measures-data', JSON.stringify({
    measure_1: { page: 1, ulx: 100, uly: 200, lrx: 800, lry: 600 },
    measure_2: { page: 2, ulx: 150, uly: 300, lrx: 950, lry: 700 }
}));

// Trigger navigation
viewer.setAttribute('measure', 'measure_2');

viewer.addEventListener('measure-changed', (event) => {
    console.log('Navigated to measure:', event.detail.key);
});

viewer.addEventListener('page-changed', (event) => {
    console.log('Page is now:', event.detail.pageNumber);
});
```

## Rectangle Fit (`fitrect`)

Fit the viewport to an arbitrary image-pixel rectangle, independent of any lookup map. The value is `"x,y,width,height"` in image-pixel coordinates, with an optional trailing `,<nonce>` token to re-fire the same fit:

```javascript
viewer.setAttribute('fitrect', '500,300,1200,800');
```

## View Mode (`view-mode`)

A declarative attribute the host can set to record the active view mode (e.g. `pageBasedView` / `measureBasedView`). The component stores it and re-broadcasts it via the `view-mode-changed` event; the actual layout swap is owned by the surrounding host application:

```javascript
viewer.setAttribute('view-mode', 'measureBasedView');
viewer.addEventListener('view-mode-changed', (event) => {
    console.log('View mode:', event.detail.viewMode);
});
```

## Browser Support

The component uses modern web standards (Custom Elements, Shadow DOM) and requires a modern browser with ES6+ support



