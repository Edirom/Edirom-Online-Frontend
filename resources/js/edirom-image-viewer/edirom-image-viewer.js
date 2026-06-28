
console.log("Image Viewer loaded!");


/**
 * Custom Web Component for viewing IIIF images using the OpenSeadragon viewer.
 * 
 * <edirom-image-viewer> provides an interface to load, view, and interact with IIIF images
 * using the OpenSeadragon JavaScript library. It supports dynamic attribute changes, zooming,
 * page navigation, rotation, and various viewer controls.
 * 
 * @class
 * @extends HTMLElement
 * 
 * @example
 * <edirom-image-viewer tilesources='["manifest.json"]'></edirom-image-viewer>
 * 
 * @attribute {string} tilesources - JSON string array of IIIF manifest URLs or tile source objects.
 * @attribute {number} pagenumber - The current page/image number to display (for multi-image sequences).
 * @attribute {number} zoom - The zoom level for the viewer.
 * @attribute {number} rotation - The rotation angle in degrees (0-360).
 * @attribute {boolean} preserveviewport - Whether to preserve viewport when changing pages.
 * @attribute {boolean} clicktozoom - Enable/disable click-to-zoom functionality.
 * @attribute {number} minzoomlevel - Minimum allowed zoom level.
 * @attribute {number} maxzoomlevel - Maximum allowed zoom level.
 * @attribute {boolean} shownavigationcontrol - Show/hide all navigation controls.
 * @attribute {boolean} sequencemode - Enable sequence mode for multiple images.
 * @attribute {boolean} shownavigator - Show/hide the navigator mini-map.
 * @attribute {boolean} showzoomcontrol - Show/hide zoom in/out buttons.
 * @attribute {boolean} showhomecontrol - Show/hide the home/reset button.
 * @attribute {boolean} showfullpagecontrol - Show/hide the fullscreen toggle button.
 * @attribute {boolean} showsequencecontrol - Show/hide previous/next page buttons.
 * @attribute {string} triggerhome - Trigger attribute to reset view to home position.
 * @attribute {string} triggerfullscreen - Trigger attribute to toggle fullscreen mode.
 * @attribute {object|string} openseadragon-options - Additional OpenSeadragon configuration options as JSON object.
 * 
 * @attribute {string} zones-data - JSON object mapping zone keys to zone objects.
 *   Each zone: { name: string, page: number, ulx: number, uly: number, lrx: number, lry: number }
 * @attribute {string} zone - Key of the zone to navigate to (must exist in zones-data).
 * 
 * @fires communicate-[property]-update - Fired when a property is updated via attribute change.
 * @fires page-changed - Fired when the viewer navigates to a new page. detail: { pageNumber } (1-based).
 * @fires zone-changed - Fired when the viewer navigates to a zone. detail: { zoneKey, zone }.
 * 
 * @method nextPage - Navigate to the next page in a sequence.
 * @method previousPage - Navigate to the previous page in a sequence.
 * @method goToPage - Navigate to a specific page number.
 * @method getCurrentPage - Get the current page number.
 * @method getTotalPages - Get the total number of pages.
 * @method zoomIn - Zoom in by 20%.
 * @method zoomOut - Zoom out by 20%.
 * @method setZoom - Set zoom to a specific level.
 * @method getZoom - Get the current zoom level.
 * @method home - Reset view to initial state.
 * @method setFullScreen - Set fullscreen mode on/off.
 * @method toggleFullScreen - Toggle fullscreen mode.
 * @method isFullScreen - Check if in fullscreen mode.
 * @method rotate - Rotate by specified degrees.
 * @method setRotation - Set rotation to specific angle.
 * @method getRotation - Get current rotation angle.
 */
class EdiromOpenseadragon extends HTMLElement {
    /**
     * Creates an instance of EdiromOpenseadragon.
     * @constructor
     */
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        console.log("Constructor called");

        /** @type {OpenSeadragon.Viewer} OpenSeadragon viewer instance */
        this.openSeaDragon = null;
        
        /** @type {number} Total number of tile sources (images/pages) */
        this.totalTileSources = 0;
        
        /** @type {Object} Zone lookup map parsed from the zones-data attribute */
        this._zonesData = {};

        /**
         * @type {Object} Measure lookup map parsed from the measures-data attribute.
         * Keyed by measure number/id; each entry is a region
         * {page, ulx, uly, lrx, lry} just like a zone.
         */
        this._measuresData = {};

        /**
         * @type {Object} Movement (mdiv) lookup map parsed from the mdivs-data
         * attribute. Keyed by mdiv id; each entry is at least {page} (the
         * movement's first page) and may also carry a region.
         */
        this._mdivsData = {};

        /**
         * @type {Array<Object>} Annotation overlay data pushed via the
         * annotations-data attribute. Each entry carries the annotation's id,
         * title, uri, categories, priority, fn (host click action) and a
         * plist of image-pixel regions. The component renders the overlay
         * badges in its shadow DOM and fires CustomEvents the host listens to
         * for tooltip / click / highlight, mirroring measures-data / mdivs-data.
         */
        this._annotationsData = [];

        /**
         * @type {Object<string,HTMLElement>} measure-keyed shared badge
         * containers for the currently rendered annotations. All annotations
         * pointing at the same measure share one container so their badges
         * stack instead of overlapping.
         */
        this._annotationContainers = {};

        /**
         * @type {boolean} Whether annotation overlays are currently visible.
         * Toggled via the `show-annotations` attribute without discarding the
         * pushed annotations-data, so show/hide is a pure visibility switch.
         */
        this._showAnnotations = false;

        /**
         * @type {Array<Object>} Measure-number overlay data pushed via the
         * measure-numbers-data attribute. Each entry carries the measure's id,
         * name (the printed number) and an image-pixel rectangle. The component
         * renders the `.measure` number boxes in its shadow DOM, mirroring the
         * annotations-data push model.
         */
        this._measureNumbersData = [];

        /**
         * @type {Object<string,HTMLElement>} id-keyed measure-number overlay
         * containers currently rendered, so visibility can be toggled and the
         * overlays cleared without re-pushing the data.
         */
        this._measureNumberContainers = {};

        /**
         * @type {boolean} Whether measure-number overlays are currently visible.
         * Toggled via the `show-measure-numbers` attribute without discarding
         * the pushed measure-numbers-data.
         */
        this._showMeasureNumbers = false;

        /** @type {string|null} Key of the currently active zone, or null */
        this._currentZoneKey = null;

        /** @type {Object|null} Zone waiting to be applied after an OSD page change completes */
        this._pendingZoneAfterPageChange = null;

        /** @type {object} Additional OpenSeadragon options */
        this.options = this.getAttribute('openseadragon-options') ? 
            JSON.parse(this.getAttribute('openseadragon-options')) : {};
    }

    /**
     * Returns the list of observed attributes for the EdiromOpenseadragon custom element.
     * @static
     * @returns {Array<string>} The list of observed attributes.
     */
    static get observedAttributes() {
        return ['preserveviewport', 'clicktozoom', 'minzoomlevel', 'maxzoomlevel', 'shownavigationcontrol', 'sequencemode', 'shownavigator', 'showzoomcontrol', 'showhomecontrol', 'showfullpagecontrol', 'showsequencecontrol', 'tilesources', 'pagenumber', 'zoom', 'rotation', 'triggerhome', 'triggerfullscreen', 'openseadragon-options', 'zones-data', 'zone', 'measures-data', 'measure', 'mdivs-data', 'mdiv', 'annotations-data', 'show-annotations', 'measure-numbers-data', 'show-measure-numbers', 'fitrect', 'view-mode'];
    }

    /**
     * Invoked when one of the custom element's attributes is added, removed, or changed.
     * @param {string} property - The name of the attribute that was changed.
     * @param {*} oldValue - The previous value of the attribute.
     * @param {*} newValue - The new value of the attribute.
     */
    attributeChangedCallback(property, oldValue, newValue) {

        // handle property change
        this.set(property, newValue);

    }

    /**
     * Sets the value of a global property and triggers property update events.
     * @param {string} property - The name of the property to set.
     * @param {*} newPropertyValue - The new value to set for the property.
     */
    set(property, newPropertyValue) {
        
        // set internal and html properties  
        this[property] = newPropertyValue;
        
        // custom event for property update
        const event = new CustomEvent('communicate-' + property + '-update', {
            detail: { [property]: newPropertyValue },
            bubbles: true
        });
        this.dispatchEvent(event);

        // further handling of property change
        this.handlePropertyChange(property, newPropertyValue);
    }

    /**
     * Lifecycle callback invoked when the custom element is added to the DOM.
     * Loads the OpenSeadragon library and initializes the viewer container.
     */
    connectedCallback() {
        console.log("Image Viewer connected to DOM!");
        
        // Add host styles
        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: block;
                width: 100%;
                height: 100%;
            }
        `;
        this.shadowRoot.appendChild(style);

        console.log("Connected to DOM");

        // Inject the overlay stylesheet (measures, annotations) into the shadow root.
        // todo.css is NOT injected here: it is the app's general main-document
        // stylesheet and the only rules of it that reached this shadow root
        // (.measure base styling) now live in annotation-style.css.
        const cssFiles = [
            'resources/css/annotation-style.css'
        ];
        cssFiles.forEach(href => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            this.shadowRoot.appendChild(link);
        });

        // Also inject the EDITION's own stylesheet — the same one Application.js
        // loads into the document <head> from the 'additional_css_path' preference.
        // Edition-specific annotation styling (e.g. the per-category glyph rules in
        // an edition's annotation-style.css) lives there, and main-document
        // stylesheets do not cross the shadow boundary. Cloning the existing head
        // link keeps this edition-agnostic: any edition that sets additional_css_path
        // gets its CSS applied to the overlays in this shadow root.
        try {
            const cssPref = (typeof getPreference === 'function')
                ? getPreference('additional_css_path', true) : null;
            if (cssPref && cssPref.indexOf('/db/') !== -1) {
                const tail = cssPref.split('/db/')[1];
                const editionLink = Array.prototype.slice
                    .call(document.head.querySelectorAll('link[rel="stylesheet"]'))
                    .find(l => l.href && l.href.indexOf(tail) !== -1);
                if (editionLink) {
                    const clone = document.createElement('link');
                    clone.rel = 'stylesheet';
                    clone.href = editionLink.href;
                    this.shadowRoot.appendChild(clone);
                }
            }
        } catch (e) {
            console.warn('Image Viewer: could not inject edition stylesheet', e);
        }

        // Create a div for the OpenSeadragon viewer
        this.viewerDiv = document.createElement('div');
        this.viewerDiv.id = 'viewer';
        this.viewerDiv.style.width = '100%';
        this.viewerDiv.style.height = '100%';
        this.shadowRoot.appendChild(this.viewerDiv);

        // Load OSD script into document.head so it runs in the global scope
        // (scripts appended to shadow root do not execute)
        if (!document.getElementById('osd-script')) {
            const osdScript = document.createElement('script');
            osdScript.id = 'osd-script';
            osdScript.src = "https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.1/openseadragon.min.js";
            osdScript.onload = () => {
                if (window.OpenSeadragon) {
                    this.set('tilesources', this.getAttribute('tilesources'));
                }
            };
            document.head.appendChild(osdScript);
        } else if (window.OpenSeadragon) {
            // Script already loaded
            this.set('tilesources', this.getAttribute('tilesources'));
        } else {
            // Script tag exists but not yet loaded — wait for it
            document.getElementById('osd-script').addEventListener('load', () => {
                if (window.OpenSeadragon) {
                    this.set('tilesources', this.getAttribute('tilesources'));
                }
            });
        }
    }

    /**
     * Handles property changes for the OpenSeadragon viewer component.
     * Routes property changes to appropriate handler methods or triggers viewer recreation.
     * @param {string} property - The name of the property being changed.
     * @param {any} newPropertyValue - The new value of the property.
     */
    handlePropertyChange(property, newPropertyValue) {
        switch(property) {
      
            // handle tileSources property change
            case 'tilesources':
                this.displayOpenSeadragon();
                break;
            
            case 'pagenumber':
                this.goToPage(parseInt(newPropertyValue));
                break;
            
            case 'zoom':
                this.setZoom(parseFloat(newPropertyValue));
                break;
            
            case 'rotation':
                this.setRotation(parseFloat(newPropertyValue));
                break;
            
            case 'triggerhome':
                this.home();
                break;
            
            case 'triggerfullscreen':
                this.toggleFullScreen();
                break;
            
            case 'openseadragon-options':
                this.options = JSON.parse(newPropertyValue);
                if(this.openSeaDragon) {
                    this.displayOpenSeadragon();
                }
                break;

            case 'preserveviewport':
            case 'minzoomlevel':
            case 'maxzoomlevel':
            case 'shownavigationcontrol':
            case 'sequencemode':
            case 'showfullpagecontrol':
            case 'shownavigator':
            case 'showzoomcontrol':
            case 'showhomecontrol':
            case 'showsequencecontrol':
                // These control visibility properties require recreating the viewer
                if(this.openSeaDragon) {
                    this.displayOpenSeadragon();
                }
                break;
            
            case 'clicktozoom':
                if(this.openSeaDragon) {
                    this.openSeaDragon.gestureSettingsMouse.clickToZoom = newPropertyValue === 'true';
                }
                break;

            case 'zones-data':
                try {
                    this._zonesData = JSON.parse(newPropertyValue) || {};
                } catch (e) {
                    console.error('Invalid zones-data JSON:', e);
                    this._zonesData = {};
                }
                // If a zone key is already active, re-apply it against the new data.
                if (this._currentZoneKey) {
                    this._applyZoneByKey(this._currentZoneKey);
                }
                break;

            case 'zone':
                this._applyZoneByKey(newPropertyValue);
                break;

            // Push-model navigation data: the host resolves all measures /
            // movements of the source once and pushes them as JSON maps. The
            // semantic 'measure' / 'mdiv' attributes below are then pure
            // client-side lookups, mirroring the Verovio renderer's
            // measurenumber / mdivname attributes.
            case 'measures-data':
                try {
                    this._measuresData = JSON.parse(newPropertyValue) || {};
                } catch (e) {
                    console.error('Invalid measures-data JSON:', e);
                    this._measuresData = {};
                }
                break;

            case 'mdivs-data':
                try {
                    this._mdivsData = JSON.parse(newPropertyValue) || {};
                } catch (e) {
                    console.error('Invalid mdivs-data JSON:', e);
                    this._mdivsData = {};
                }
                break;

            // Annotation overlays (push model, like measures-data). The host
            // pushes the page's annotations as JSON when the "show
            // annotations" button is clicked, and pushes an empty array to
            // hide them. The component renders the overlay badges and fires
            // CustomEvents the host uses for tooltip / click / highlight.
            case 'annotations-data':
                try {
                    this._annotationsData = JSON.parse(newPropertyValue) || [];
                } catch (e) {
                    console.error('Invalid annotations-data JSON:', e);
                    this._annotationsData = [];
                }
                console.log('edirom-image-viewer: annotations-data', this._annotationsData);
                this._renderAnnotations();
                break;

            // Toggle the visibility of the already-rendered annotation overlays
            // without discarding their data. "true" (or absent value) shows
            // them, "false" hides them. Separate from annotations-data so the
            // host can show/hide repeatedly without re-pushing the data.
            case 'show-annotations':
                this._showAnnotations = String(newPropertyValue) !== 'false';
                this._applyAnnotationVisibility();
                break;

            // Measure-number overlays (push model, like annotations-data). The
            // host pushes the page's measures as JSON once per page; the
            // component renders the `.measure` number boxes in its shadow DOM.
            case 'measure-numbers-data':
                try {
                    this._measureNumbersData = JSON.parse(newPropertyValue) || [];
                } catch (e) {
                    console.error('Invalid measure-numbers-data JSON:', e);
                    this._measureNumbersData = [];
                }
                this._renderMeasureNumbers();
                break;

            // Toggle the visibility of the already-rendered measure-number
            // overlays without discarding their data. "true" shows them,
            // "false" hides them.
            case 'show-measure-numbers':
                this._showMeasureNumbers = String(newPropertyValue) !== 'false';
                this._applyMeasureNumberVisibility();
                break;

            // Jump to a specific measure (by the key used in measures-data).
            // An optional trailing "|nonce" makes repeated jumps to the same
            // measure re-fire this handler; the nonce is stripped before lookup.
            case 'measure': {
                const measureKey = String(newPropertyValue).split('|')[0];
                // Ignore the empty default value (measure="") set in markup so
                // it does not log a "not found" warning on viewer creation.
                if (measureKey) this._applyMeasure(measureKey);
                break;
            }

            // Load / jump to a movement's first page (by the key used in
            // mdivs-data). Same optional "|nonce" handling as 'measure'.
            case 'mdiv': {
                const mdivKey = String(newPropertyValue).split('|')[0];
                // Ignore the empty default value (mdiv="") set in markup so it
                // does not log a "not found" warning on viewer creation.
                if (mdivKey) this._applyMdiv(mdivKey);
                break;
            }

            // Fit the viewport to an image-pixel rectangle. Value format:
            // "x,y,width,height" with an optional trailing nonce token that is
            // ignored — the nonce only exists so that repeating the SAME jump
            // produces a different attribute value and thus re-fires
            // attributeChangedCallback (used by jump-to-measure / jump-to-mdiv).
            case 'fitrect':
                if (newPropertyValue) {
                    const parts = String(newPropertyValue).split(',');
                    if (parts.length >= 4) {
                        this.fitImageRect(
                            parseFloat(parts[0]), parseFloat(parts[1]),
                            parseFloat(parts[2]), parseFloat(parts[3]));
                    }
                }
                break;

            // Declarative view mode (e.g. 'pageBasedView' / 'measureBasedView').
            // The component records the mode and re-broadcasts it so host code
            // can react; the actual page/measure layout swap is owned by the
            // surrounding ExtJS views.
            case 'view-mode':
                this._viewMode = newPropertyValue;
                this.dispatchEvent(new CustomEvent('view-mode-changed', {
                    detail: { viewMode: newPropertyValue },
                    bubbles: true
                }));
                break;

            // handle default
            default:  
              console.log("Invalid property: '"+property+"'");
      
        }
    
    }

    /**
     * Initializes or reinitializes the OpenSeadragon viewer with current settings.
     * Handles both IIIF manifest URLs and direct tile sources.
     * For IIIF manifests, fetches and parses the manifest to extract image URLs.
     */
    displayOpenSeadragon() {
        if (window.OpenSeadragon) {

            if(this.openSeaDragon) {
                this.openSeaDragon.destroy();
            }

            const tileSources = JSON.parse(this.tilesources);
            
            // Check if it's a IIIF manifest URL (string ending with .json)
            if (Array.isArray(tileSources) && tileSources.length === 1 && 
                typeof tileSources[0] === 'string' && tileSources[0].includes('manifest')) {
                
                // Fetch and parse the IIIF manifest
                fetch(tileSources[0])
                    .then(response => response.json())
                    .then(manifest => {
                        const imageUrls = [];
                        
                        // Extract image info.json URLs from IIIF Presentation API manifest
                        if (manifest.sequences && manifest.sequences[0] && manifest.sequences[0].canvases) {
                            manifest.sequences[0].canvases.forEach(canvas => {
                                if (canvas.images && canvas.images[0] && canvas.images[0].resource) {
                                    const service = canvas.images[0].resource.service;
                                    if (service) {
                                        const serviceId = service['@id'] || service.id;
                                        imageUrls.push(serviceId + '/info.json');
                                    }
                                }
                            });
                        }
                        
                        // Initialize OpenSeadragon with extracted image URLs
                        this.initializeViewer(imageUrls);
                    })
                    .catch(error => {
                        console.error('Error loading IIIF manifest:', error);
                        // Try to load as regular tile sources
                        this.initializeViewer(tileSources);
                    });
            } else {
                // Direct tile sources (not a manifest URL)
                this.initializeViewer(tileSources);
            }
        } else {
            console.error('OpenSeadragon library is not loaded.');
        }
    }
    
    /**
     * Initializes the OpenSeadragon viewer with the provided tile sources.
     * Creates a new viewer instance with all configured options.
     * @param {Array} tileSources - Array of tile source URLs or objects.
     */
    initializeViewer(tileSources) {
        console.log('initializeViewer called with:', tileSources);
        console.log('Viewer div:', this.viewerDiv);
        console.log('OpenSeadragon available:', !!window.OpenSeadragon);
        
        if (!window.OpenSeadragon) {
            console.error('OpenSeadragon library not available');
            return;
        }
        
        try {
            // Store the tile sources count
            this.totalTileSources = Array.isArray(tileSources) ? tileSources.length : 1;
            
            this.openSeaDragon = OpenSeadragon({
                element: this.viewerDiv,
                prefixUrl: 'https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.1/images/',
                preserveViewport: this.preserveviewport === 'true',
                minZoomLevel: parseFloat(this.minzoomlevel) || 0.5,
                defaultZoomLevel: parseFloat(this.defaultzoomlevel) || 1,
                maxZoomLevel: parseFloat(this.maxzoomlevel) || 10,
                showNavigationControl: this.shownavigationcontrol === 'true',
                tileSources: tileSources,
                showNavigator:  this.shownavigator === 'true',
                showZoomControl:  this.showzoomcontrol === 'true',
                showHomeControl:  this.showhomecontrol === 'true',
                showFullPageControl:  this.showfullpagecontrol === 'true',
                showSequenceControl:  this.showsequencecontrol === 'true',
                sequenceMode: this.sequencemode === 'true',
                gestureSettingsMouse: {
                  clickToZoom: this.clicktozoom === 'true',
                },
                // Required for OSD's WebGL drawer to be able to use cross-origin
                // tile images as WebGL textures. Without this, tiles fetched from
                // a different origin are "tainted" and cannot be uploaded to WebGL,
                // causing blank pages on revisit (cached tiles trigger the failure
                // before OSD's canvas-drawer fallback can schedule a redraw).
                crossOriginPolicy: 'Anonymous',
                // Performance and timeout settings
                timeout: 120000, // Increase timeout to 120 seconds for slow servers
                maxImageCacheCount: 200,
                imageLoaderLimit: 2, // Limit concurrent tile requests to reduce server load
                // Merge additional options from openseadragon-options attribute
                ...this.options
            });
            console.log('OpenSeadragon viewer initialized successfully:', this.openSeaDragon);

            // Re-dispatch OSD zoom changes as a DOM event so host apps can
            // react without reaching into the underlying OpenSeadragon instance.
            this.openSeaDragon.addHandler('zoom', (event) => {
                this.dispatchEvent(new CustomEvent('zoom', {
                    detail: { zoom: event.zoom },
                    bubbles: true
                }));
            });

            // Dispatch an 'image-ready' event once the first tile of the
            // current tile source has been drawn.
            this.openSeaDragon.addOnceHandler('tile-drawn', () => {
                this.dispatchEvent(new CustomEvent('image-ready', { bubbles: true }));
            });

            // --- Page change and zone handlers ---
            // Fire page-changed on every OSD page navigation.
            // If a zone was requested for this page, apply it once the new page
            // is shown.
            this.openSeaDragon.addHandler('page', (event) => {
                this._firePageChanged(event.page + 1);
                if (!this._pendingZoneAfterPageChange) return;
                const pending = this._pendingZoneAfterPageChange;
                this._pendingZoneAfterPageChange = null;

                // Apply the region after the new page settles. We can't rely on
                // 'tile-loaded' alone: it does not fire when the target page's
                // tiles are already cached (e.g. a page visited before), which
                // would leave the viewport at the page's home position. Use a
                // one-shot guard fed by both 'tile-drawn' (fires on cached
                // redraws too) and a timeout fallback that also runs after
                // OpenSeadragon's own page-change home reset.
                let applied = false;
                const applyPending = () => {
                    if (applied) return;
                    applied = true;
                    this._applyZone(pending.zone);
                    this._fireRegionChanged(
                        pending.eventName || 'zone-changed',
                        pending.zoneKey, pending.zone);
                };
                this.openSeaDragon.addOnceHandler('tile-drawn', applyPending);
                setTimeout(applyPending, 250);
            });

            // If a zone was requested before the viewer was ready, apply it now.
            // Wait for 'tile-loaded' so coordinate conversion is safe.
            if (this._currentZoneKey && this._zonesData[this._currentZoneKey]) {
                const zone = this._zonesData[this._currentZoneKey];
                const zoneKey = this._currentZoneKey;
                this.openSeaDragon.addOnceHandler('tile-loaded', () => {
                    this._applyZone(zone);
                    this._fireZoneChanged(zoneKey, zone);
                });
            }
        } catch (error) {
            console.error('Error initializing OpenSeadragon:', error);
        }
    }
    
    /**
     * Public API Methods
     */
    
    /**
     * Zooms in by increasing the current zoom level by 20%.
     */
    zoomIn() {
        if(this.openSeaDragon) {
            const currentZoom = this.openSeaDragon.viewport.getZoom();
            this.openSeaDragon.viewport.zoomTo(currentZoom * 1.2);
        }
    }
    
    /**
     * Zooms out by decreasing the current zoom level by 20%.
     */
    zoomOut() {
        if(this.openSeaDragon) {
            const currentZoom = this.openSeaDragon.viewport.getZoom();
            this.openSeaDragon.viewport.zoomTo(currentZoom / 1.2);
        }
    }
    
    /**
     * Sets the zoom level to a specific value.
     * @param {number} zoomLevel - The desired zoom level.
     */
    setZoom(zoomLevel) {
        if(this.openSeaDragon && !isNaN(zoomLevel)) {
            const viewport = this.openSeaDragon.viewport;
            // Clamp to the configured min/max zoom ourselves. We apply the zoom
            // immediately (3rd arg = true) because OSD's animated spring does not
            // advance in this embedding (animation-frame never fires) — but
            // immediate zoomTo also BYPASSES OSD's own min/max constraint spring,
            // so a programmatic zoom (e.g. dragging the zoom bar) could otherwise
            // shoot past maxZoomLevel / below minZoomLevel. Clamp here so the
            // zoom bar can never exceed the configured limits.
            const clampedZoom = Math.max(
                viewport.getMinZoom(),
                Math.min(zoomLevel, viewport.getMaxZoom()));
            viewport.zoomTo(clampedZoom, null, true);
        }
    }
    
    getZoom() {
        return this.openSeaDragon ? this.openSeaDragon.viewport.getZoom() : 0;
    }
    
    // Page navigation methods
    nextPage() {
        if(this.openSeaDragon) {
            this.openSeaDragon.goToNextPage();
        }
    }
    
    previousPage() {
        if(this.openSeaDragon) {
            this.openSeaDragon.goToPreviousPage();
        }
    }
    
    goToPage(pageNumber) {
        if(this.openSeaDragon && !isNaN(pageNumber)) {
            // pagenumber is 1-based, but OpenSeadragon's goToPage expects a 0-based index
            const targetIndex = pageNumber - 1;
            const totalPages = this.openSeaDragon.tileSources ?
                this.openSeaDragon.tileSources.length : this.openSeaDragon.world.getItemCount();
            if(targetIndex >= 0 && targetIndex < totalPages) {
                this.openSeaDragon.goToPage(targetIndex);
            }
        }
    }
    
    getCurrentPage() {
        // OpenSeadragon's currentPage is 0-based; expose it as 1-based
        return this.openSeaDragon ? this.openSeaDragon.currentPage() + 1 : 0;
    }
    
    getTotalPages() {
        return this.openSeaDragon ? this.openSeaDragon.world.getItemCount() : 0;
    }
    
    // Home/reset view
    home() {
        if(this.openSeaDragon) {
            this.openSeaDragon.viewport.goHome(true);
        }
    }
    
    // Full screen methods
    setFullScreen(fullScreen) {
        if(this.openSeaDragon) {
            this.openSeaDragon.setFullScreen(fullScreen);
        }
    }
    
    toggleFullScreen() {
        if(this.openSeaDragon) {
            this.openSeaDragon.setFullScreen(!this.openSeaDragon.isFullPage());
        }
    }
    
    isFullScreen() {
        return this.openSeaDragon ? this.openSeaDragon.isFullPage() : false;
    }
    
    // Rotation methods
    rotate(degrees) {
        if(this.openSeaDragon && !isNaN(degrees)) {
            this.openSeaDragon.viewport.setRotation(
                this.openSeaDragon.viewport.getRotation() + degrees
            );
        }
    }
    
    setRotation(degrees) {
        if(this.openSeaDragon && !isNaN(degrees)) {
            this.openSeaDragon.viewport.setRotation(degrees);
        }
    }
    
    getRotation() {
        return this.openSeaDragon ? this.openSeaDragon.viewport.getRotation() : 0;
    }

    // ---------------------------------------------------------------
    //  Viewport helpers (image-space)
    // ---------------------------------------------------------------

    /**
     * Returns the currently visible region of the image in image-pixel
     * coordinates, clamped to the image bounds.
     * @returns {{x:number,y:number,width:number,height:number}}
     */
    getImageViewportRect() {
        if (!this.openSeaDragon) {
            return { x: 0, y: 0, width: 0, height: 0 };
        }
        const tiledImage = this.openSeaDragon.world.getItemAt(0);
        if (!tiledImage) {
            return { x: 0, y: 0, width: 0, height: 0 };
        }
        const viewportBounds = this.openSeaDragon.viewport.getBounds();
        const imageBounds = tiledImage.viewportToImageRectangle(viewportBounds);
        const size = tiledImage.getContentSize();
        const x = imageBounds.x < 0 ? 0 : imageBounds.x;
        const y = imageBounds.y < 0 ? 0 : imageBounds.y;
        const width = imageBounds.width > size.x ? size.x : imageBounds.width;
        const height = imageBounds.height > size.y ? size.y : imageBounds.height;
        return { x: x, y: y, width: width, height: height };
    }

    /**
     * Fits the viewport to the given image-pixel rectangle (with constraints).
     * @param {number} x - Upper-left X in image pixels.
     * @param {number} y - Upper-left Y in image pixels.
     * @param {number} width - Width in image pixels.
     * @param {number} height - Height in image pixels.
     */
    fitImageRect(x, y, width, height) {
        if (!this.openSeaDragon) return;
        const tiledImage = this.openSeaDragon.world.getItemAt(0);
        if (!tiledImage) return;
        const rect = tiledImage.imageToViewportRectangle(
            Number(x), Number(y), Number(width), Number(height));
        // immediately=true: the animated spring does not advance in this
        // embedding, so an animated fit would never move the viewport.
        this.openSeaDragon.viewport.fitBoundsWithConstraints(rect, true);
    }

    // ---------------------------------------------------------------
    //  Overlay management (image-space)
    // ---------------------------------------------------------------

    /**
     * Adds an HTML/SVG element overlay positioned by image-pixel coordinates.
     * @param {Element} element - The overlay element.
     * @param {number} x - Upper-left X in image pixels.
     * @param {number} y - Upper-left Y in image pixels.
     * @param {number} width - Width in image pixels.
     * @param {number} height - Height in image pixels.
     */
    addImageOverlay(element, x, y, width, height) {
        if (!this.openSeaDragon) return;
        const tiledImage = this.openSeaDragon.world.getItemAt(0);
        if (!tiledImage) return;
        const rect = tiledImage.imageToViewportRectangle(
            Number(x), Number(y), Number(width), Number(height));
        this.openSeaDragon.addOverlay({ element: element, location: rect });
    }

    /**
     * Removes an overlay by its element id (no-op if it does not exist).
     * @param {string} overlayId
     */
    removeOverlay(overlayId) {
        if (!this.openSeaDragon) return;
        // OpenSeadragon's removeOverlay(string) resolves the element via
        // document.getElementById, which CANNOT see elements inside this
        // component's shadow DOM, so the overlay would never be removed
        // (e.g. hiding annotations did nothing). Resolve the element from the
        // shadow root ourselves and pass it directly; fall back to the id.
        const element = this.shadowRoot.getElementById(overlayId);
        this.openSeaDragon.removeOverlay(element || overlayId);
    }

    /**
     * Returns an overlay by id, or null if not present / viewer not ready.
     * @param {string} overlayId
     * @returns {object|null}
     */
    getOverlayById(overlayId) {
        return this.openSeaDragon ? this.openSeaDragon.getOverlayById(overlayId) : null;
    }

    // ---------------------------------------------------------------
    //  Annotation overlays (push model, like measures-data)
    // ---------------------------------------------------------------

    /**
     * Removes all annotation overlays currently rendered in the shadow DOM and
     * resets the per-measure container map.
     * @private
     */
    _clearAnnotations() {
        const me = this;
        Object.keys(this._annotationContainers).forEach(function (containerId) {
            me.removeOverlay(containerId);
        });
        this._annotationContainers = {};
    }

    /**
     * Shows or hides every rendered annotation overlay container according to
     * `this._showAnnotations`. Used by the `show-annotations` attribute so the
     * host can toggle visibility without re-pushing annotations-data.
     *
     * NOTE: this toggles `visibility`, not `display`. OpenSeadragon re-applies
     * `display:block` to every overlay element on each viewport redraw, which
     * would override a `display:none` hide on the next pan/zoom; it does not
     * touch `visibility`, so the hide sticks.
     * @private
     */
    _applyAnnotationVisibility() {
        const value = this._showAnnotations ? '' : 'hidden';
        const containers = this._annotationContainers;
        Object.keys(containers).forEach(function (containerId) {
            containers[containerId].style.visibility = value;
        });
    }

    /**
     * Renders annotation overlays from `this._annotationsData`. All annotations
     * pointing at the same measure share one container (keyed by
     * `idPrefix_measureId`) so their badges stack; each badge gets the id
     * `idPrefix_measureId + annoId` and the class `annotIcon {categories}
     * {priority} {partType}` so the host's filter / lookup helpers keep working.
     * Each badge fires `annotation-click` / `annotation-mouseenter` /
     * `annotation-mouseleave` CustomEvents the host listens to for its
     * ExtJS-specific tooltip / click / highlight behaviour.
     * @private
     */
    _renderAnnotations() {
        const me = this;
        this._clearAnnotations();
        if (!this.openSeaDragon || !Array.isArray(this._annotationsData)) return;

        this._annotationsData.forEach(function (annotation) {
            const idPrefix = annotation.idPrefix || '';
            const annoId = annotation.id;
            const name = annotation.title || '';
            const uri = annotation.uri || '';
            const categories = annotation.categories || '';
            const priority = annotation.priority || '';
            const fn = annotation.fn || '';
            const plist = Array.isArray(annotation.plist) ? annotation.plist : [];

            plist.forEach(function (shape) {
                const measureId = shape.id;
                const x = Number(shape.ulx);
                const y = Number(shape.uly);
                const width = Number(shape.lrx) - Number(shape.ulx);
                const height = Number(shape.lry) - Number(shape.uly);
                const partType = shape.type || '';

                const containerId = idPrefix + '_' + measureId;
                let container = me._annotationContainers[containerId];
                if (!container) {
                    container = document.createElement('div');
                    container.id = containerId;
                    container.className = 'annotation';
                    me._annotationContainers[containerId] = container;
                    me.addImageOverlay(container, x, y, width, height);
                }

                const badge = document.createElement('div');
                badge.id = containerId + annoId;
                badge.className = ('annotIcon ' + categories + ' ' + priority + ' ' + partType).replace(/\s+/g, ' ').trim();
                badge.title = name;
                badge.setAttribute('data-edirom-annot-id', annoId);
                container.appendChild(badge);

                const detail = { id: annoId, uri: uri, fn: fn, title: name, element: badge };

                // OpenSeadragon's MouseTracker captures pointer events on its
                // container; stop them on the badge so the native click fires
                // and the host receives the event instead of OSD panning.
                badge.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); });
                badge.addEventListener('mousedown', function (ev) { ev.stopPropagation(); });
                badge.addEventListener('click', function (ev) {
                    ev.stopPropagation();
                    ev.preventDefault();
                    me.dispatchEvent(new CustomEvent('annotation-click', { detail: detail }));
                });
                badge.addEventListener('mouseenter', function () {
                    me.dispatchEvent(new CustomEvent('annotation-mouseenter', { detail: detail }));
                });
                badge.addEventListener('mouseleave', function () {
                    me.dispatchEvent(new CustomEvent('annotation-mouseleave', { detail: detail }));
                });
            });
        });

        // honour the current show/hide state for the freshly built overlays
        this._applyAnnotationVisibility();
    }

    // ---------------------------------------------------------------
    //  Measure-number overlays (push model, like annotations-data)
    // ---------------------------------------------------------------

    /**
     * Removes all measure-number overlays currently rendered in the shadow DOM
     * and resets the container map.
     * @private
     */
    _clearMeasureNumbers() {
        const me = this;
        Object.keys(this._measureNumberContainers).forEach(function (containerId) {
            me.removeOverlay(containerId);
        });
        this._measureNumberContainers = {};
    }

    /**
     * Shows or hides every rendered measure-number overlay according to
     * `this._showMeasureNumbers`. Toggles `visibility` (not `display`) for the
     * same reason as annotations: OpenSeadragon re-applies `display:block` on
     * each redraw but never touches `visibility`.
     * @private
     */
    _applyMeasureNumberVisibility() {
        const value = this._showMeasureNumbers ? '' : 'hidden';
        const containers = this._measureNumberContainers;
        Object.keys(containers).forEach(function (containerId) {
            containers[containerId].style.visibility = value;
        });
    }

    /**
     * Renders the measure-number boxes from `this._measureNumbersData`. Each
     * entry gets a `.measure` container (id `idPrefix_id`) holding a
     * `.measureInner` / `.measureInnerEmpty` span with the printed number, added
     * as an OSD image overlay at its pixel rect. A local hover highlight class
     * is toggled on the box (no ExtJS needed for measure numbers).
     * @private
     */
    _renderMeasureNumbers() {
        const me = this;
        this._clearMeasureNumbers();
        if (!this.openSeaDragon || !Array.isArray(this._measureNumbersData)) return;

        this._measureNumbersData.forEach(function (m) {
            const idPrefix = m.idPrefix || '';
            const id = m.id;
            const name = m.name || '';
            const x = Number(m.ulx);
            const y = Number(m.uly);
            const width = Number(m.lrx) - Number(m.ulx);
            const height = Number(m.lry) - Number(m.uly);

            const containerId = idPrefix + '_' + id;
            const measure = document.createElement('div');
            measure.id = containerId;
            measure.className = 'measure';

            const span = document.createElement('span');
            span.className = (name === '' ? 'measureInnerEmpty' : 'measureInner');
            span.id = containerId + '_inner';
            span.style.position = 'relative';
            span.textContent = name;
            measure.appendChild(span);

            me._measureNumberContainers[containerId] = measure;
            me.addImageOverlay(measure, x, y, width, height);

            measure.addEventListener('mouseenter', function () { measure.classList.add('highlighted'); });
            measure.addEventListener('mouseleave', function () { measure.classList.remove('highlighted'); });
        });

        // honour the current show/hide state for the freshly built overlays
        this._applyMeasureNumberVisibility();
    }

    // ---------------------------------------------------------------
    //  Zone / measure / movement navigation
    // ---------------------------------------------------------------

    /**
     * Navigates the viewer to the zone identified by `zoneKey` in `_zonesData`.
     * Handles same-page transitions (smooth) and cross-page transitions
     * (page change + deferred zone application).
     * @param {string} zoneKey - Key of the zone in the zones-data map.
     */
    _applyZoneByKey(zoneKey) {
        const zone = this._zonesData[zoneKey];
        if (!zone) {
            console.warn(`edirom-image-viewer: zone "${zoneKey}" not found in zones-data.`);
            return;
        }
        this._currentZoneKey = zoneKey;
        this._navigateToRegion(zone, zoneKey, 'zone-changed');
    }

    /**
     * Jumps to the measure identified by `measureKey` in `_measuresData`.
     * @param {string} measureKey - Key of the measure in the measures-data map.
     */
    _applyMeasure(measureKey) {
        const region = this._measuresData[measureKey];
        if (!region) {
            console.warn(`edirom-image-viewer: measure "${measureKey}" not found in measures-data.`);
            return;
        }
        this._navigateToRegion(region, measureKey, 'measure-changed');
    }

    /**
     * Loads / jumps to the movement (mdiv) identified by `mdivKey` in
     * `_mdivsData`. A movement entry typically only carries a `page` (its first
     * page), in which case the viewer navigates to that page and shows it whole.
     * @param {string} mdivKey - Key of the movement in the mdivs-data map.
     */
    _applyMdiv(mdivKey) {
        const region = this._mdivsData[mdivKey];
        if (!region) {
            console.warn(`edirom-image-viewer: mdiv "${mdivKey}" not found in mdivs-data.`);
            return;
        }
        this._navigateToRegion(region, mdivKey, 'mdiv-changed');
    }

    /**
     * Shared page-aware navigation used by zone / measure / mdiv jumps.
     * Handles same-page transitions (apply region directly) and cross-page
     * transitions (change page, then apply the region once tiles are loaded).
     * @param {Object} region - Region with a 1-based `page` and optional
     *     `ulx, uly, lrx, lry` pixel coordinates.
     * @param {string} key - The lookup key, echoed back in the change event.
     * @param {string} eventName - CustomEvent name fired once navigation lands.
     */
    _navigateToRegion(region, key, eventName) {
        if (!this.openSeaDragon) {
            // Viewer not ready yet — initializeViewer re-applies the active zone.
            return;
        }

        const targetPage = parseInt(region.page) - 1; // 1-based → 0-based
        const currentPage = this.openSeaDragon.currentPage();

        if (isNaN(targetPage) || targetPage === currentPage) {
            // Same page (or no page given): apply region directly
            this._applyZone(region);
            this._fireRegionChanged(eventName, key, region);
        } else {
            // Different page: defer region until the new page's tiles are loaded
            this._pendingZoneAfterPageChange = { zoneKey: key, zone: region, eventName };
            this.openSeaDragon.goToPage(targetPage);
        }
    }

    /**
     * Zooms/pans the viewport to the zone coordinates, or resets to home if
     * no coordinates are present. Uses OSD's spring animation for smooth transitions.
     * @param {Object} zone - The zone object with optional ulx, uly, lrx, lry.
     */
    _applyZone(zone) {
        if (!this.openSeaDragon) return;

        const hasZone = zone.ulx != null && zone.uly != null &&
            zone.lrx != null && zone.lry != null;

        if (!hasZone) {
            this.openSeaDragon.viewport.goHome(true);
            return;
        }

        // Convert pixel coordinates to viewport coordinates via the current TiledImage
        const tiledImage = this.openSeaDragon.world.getItemAt(0);
        if (!tiledImage) {
            console.warn('edirom-image-viewer: no TiledImage available for zone conversion.');
            this.openSeaDragon.viewport.goHome();
            return;
        }

        const rect = tiledImage.imageToViewportRectangle(
            Number(zone.ulx),
            Number(zone.uly),
            Number(zone.lrx) - Number(zone.ulx),
            Number(zone.lry) - Number(zone.uly)
        );
        // immediately=true: OSD's spring animation does not advance in this
        // embedding, so an animated fitBounds would never move the viewport.
        this.openSeaDragon.viewport.fitBounds(rect, true);
    }

    /**
     * Dispatches the `zone-changed` custom event.
     * @param {string} zoneKey - The key of the zone that was navigated to.
     * @param {Object} zone - The zone object that was navigated to.
     */
    _fireZoneChanged(zoneKey, zone) {
        this.dispatchEvent(new CustomEvent('zone-changed', {
            detail: { zoneKey, zone },
            bubbles: true
        }));
    }

    /**
     * Dispatches a region-navigation custom event (`zone-changed`,
     * `measure-changed` or `mdiv-changed`).
     * @param {string} eventName - The event name to dispatch.
     * @param {string} key - The lookup key that was navigated to.
     * @param {Object} region - The region object that was navigated to.
     */
    _fireRegionChanged(eventName, key, region) {
        this.dispatchEvent(new CustomEvent(eventName, {
            detail: { key, zoneKey: key, region, zone: region },
            bubbles: true
        }));
    }

    /**
     * Dispatches the `page-changed` custom event.
     * @param {number} pageNumber - The 1-based page number that was navigated to.
     */
    _firePageChanged(pageNumber) {
        this.dispatchEvent(new CustomEvent('page-changed', {
            detail: { pageNumber },
            bubbles: true
        }));
    }
}

customElements.define('edirom-image-viewer', EdiromOpenseadragon);
