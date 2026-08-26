/**
 *  Edirom Online
 *  Copyright (C) 2014 The Edirom Project
 *  http://www.edirom.de
 *
 *  Edirom Online is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  Edirom Online is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with Edirom Online.  If not, see <http://www.gnu.org/licenses/>.
 */

// Annotation category -> host-supplied icon markup (see issue #271: the
// edirom-image-viewer component has no icon-system knowledge itself, it just
// inserts whichever zone.iconHtml this bridge decides to supply).
var ANNOTATION_ICON_MARKUP = {
    'annotation.category.beschreibung': '<edirom-icon name="description"></edirom-icon>',
    'annotation.category.rasurTektur': '<edirom-icon name="ink_eraser"></edirom-icon>'
};

Ext.define('EdiromOnline.view.window.image.OpenSeaDragonViewer', {
    extend: 'Ext.panel.Panel',

    mixins: {
        observable: 'Ext.util.Observable'
    },

    layout: 'fit',

    border: 0,

    webComponent: null,

    imageWidth: 0,
    imageHeight: 0,

    imagePrefix: null,

    // Ordered list of pages currently loaded as an OpenSeadragon sequence.
    pages: null,
    // Page index requested before the viewer finished initializing.
    pendingPageIndex: null,

    shapes: null,
    partLabel: null,

    // Host-side cache of pushed layer overlays (layerId -> raw svg string) and
    // currently visible layer ids, mirrored onto the component's
    // layers-data/visible-layers attributes. See addSVGOverlay/removeSVGOverlay.
    _layersData: null,
    _visibleLayers: null,

    initComponent: function () {

        var me = this;

        me.imagePrefix = getPreference('image_prefix');

        me.addEvents('zoomChanged',
                    'imageChanged');

       var openseadragonEvents;

        if (me.partLabel != null) {
         openseadragonEvents = '<div id="' + me.id + '_openseadragonEvents" class="openseadragonEvents">' +
            '<div  id="' + me.id + '_' + me.partLabel + '" class="part">' +
              '<span class="partInner" id="' + me.id + '_' + me.partLabel + '_inner">' +
              me.partLabel + '</span>' +
            '</div>' +
         '</div>';
        }
        else {
          openseadragonEvents = '<div id="' + me.id + '_openseadragonEvents" class="openseadragonEvents"></div>';
         };

        // All configurable attributes are listed here with their default values
        // so the component is easy to test/tweak. The data-driven attributes
        // (tilesources, pagenumber, sequencemode, *-data) are also set at runtime
        // by this class; the values below are just the initial defaults.
        me.html = '<div id="' + me.id + '_openseadragon" style="background-color: black; top:0px; bottom: 0px; left: 0px; right: 0px; position:absolute;">' +
                  '<edirom-image-viewer id="' + me.id + '_wc' + '" ' +
                  'style="width:100%;height:100%;display:block;" ' +
                  'tilesources="[]" ' +
                  'pagenumber="1" ' +
                  'zoom="1" ' +
                  'rotation="0" ' +
                  'preserveviewport="false" ' +
                  'clicktozoom="false" ' +
                  'minzoomlevel="0.5" ' +
                  'maxzoomlevel="10" ' +
                  'shownavigationcontrol="false" ' +
                  'shownavigator="false" ' +
                  'showzoomcontrol="false" ' +
                  'showhomecontrol="false" ' +
                  'showfullpagecontrol="false" ' +
                  'showsequencecontrol="false" ' +
                  'zones-data="{}" ' +
                  'zone="" ' +
                  'visible-types="[]" ' +
                  'hidden-filters="[]" ' +
                  'layers-data="{}" ' +
                  'visible-layers="[]" ' +
                  'overlay-stylesheets="[]" ' +
                  'view-mode="">' +
                  '</edirom-image-viewer>' +
                  '</div>' + openseadragonEvents;

        me.shapes = new Ext.util.MixedCollection();

        me.callParent();

        me.on('afterrender', me.initSurface, me, {single: true});
        me.on('resize', me.onResize, me);
    },

    initSurface: function() {
        var me = this;
        me.webComponent = document.getElementById(me.id + '_wc');

        // Tell the component which host stylesheets to clone into its shadow root
        // (annotation category glyph rules + the current edition's own CSS, read
        // from the 'additional_css_path' preference). The component itself has no
        // knowledge of file paths or the preference system - that lookup belongs
        // here, in the Edirom-specific bridge.
        var overlayStylesheets = ['resources/css/annotation-style.css'];
        var additionalCssPath = getPreference('additional_css_path', true);
        if (additionalCssPath && additionalCssPath.indexOf('/db/') !== -1) {
            overlayStylesheets.push(additionalCssPath.split('/db/')[1]);
        }
        me.webComponent.setAttribute('overlay-stylesheets', Ext.JSON.encode(overlayStylesheets));

        // Forward the web component's zoom events as ExtJS 'zoomChanged' events.
        me.webComponent.addEventListener('zoom', function(event) {
            me.fireEvent('zoomChanged', event.detail.zoom);
        });

        // Re-apply a pending rectangle once the image's tiles have been drawn.
        me.webComponent.addEventListener('image-ready', function() {
            // Apply an initial page requested before the viewer was ready
            // (e.g. a deep link to a page other than the first one).
            if (me.pendingPageIndex != null) {
                var idx = me.pendingPageIndex;
                me.pendingPageIndex = null;
                if (idx > 0) me.webComponent.setAttribute('pagenumber', String(idx + 1));
            }

            if (me.rect && me.rect != null) {
                me.fitStoredRect();
            }
        });

        // Forward the web component's native sequence page changes so the
        // ExtJS layer (page spinner, overlays) can stay in sync.
        me.webComponent.addEventListener('page-changed', function(event) {
            var pageNumber = event.detail.pageNumber; // 1-based
            var page = (me.pages && me.pages.length >= pageNumber) ? me.pages[pageNumber - 1] : null;
            if (page) {
                me.imageHeight = page.height;
                me.imageWidth = page.width;
                me.imgPath = page.path;
                me.imgId = page.id;
                me.fireEvent('imageChanged', me, page.path, page.id);
            }
        });

        // Zone overlays (annotations, measure labels, …) are rendered by the
        // component from the pushed zones-data attribute, including the tooltip
        // (the host preloads each zone's server-rendered tooltip HTML into its
        // zones-data entry). The only host-specific interaction left here is the
        // click action, run from the component's zone-click event.
        me.webComponent.addEventListener('zone-click', function(event) {
            me.onZoneClick(event.detail);
        });

        // The component owns the annotation filter; when it changes (including
        // when the hidden-filters attribute is set externally), forward the
        // hidden-token set so the host can keep its filter menu checkboxes in
        // sync.
        me.webComponent.addEventListener('filter-changed', function(event) {
            me.fireEvent('annotationFilterChanged', me, event.detail.hiddenFilters);
        });

        // Keep the host page list / spinner bounds in sync when the component's
        // tile sources change to a SMALLER set (e.g. a page was removed). The
        // initial setImages reports the same count the store already has, so this
        // is a no-op then; only a genuine shrink trims the trailing pages and
        // notifies the owning view.
        me.webComponent.addEventListener('total-pages-changed', function(event) {
            var total = (event.detail) ? event.detail.totalPages : null;
            if (!me.pages || typeof total !== 'number' || total < 0) return;
            if (total >= me.pages.length) return;
            me.pages = me.pages.slice(0, total);
            me.fireEvent('totalPagesChanged', me, total);
        });
    },

    clear: function() {
        var me = this;
        me.rect = null;
    },

    // Builds a tile source descriptor for a single image: a IIIF level2
    // descriptor by default, or (image_server=digilib) a plain digilib
    // descriptor that the web component resolves into real region-tiled
    // requests against the digilib Scaler API (see edirom-image-viewer.js
    // _resolveTileSource - there is no IIIF/DZI endpoint to rely on there).
    buildTileSource: function(path, width, height) {
        var me = this;

        // An already-absolute http(s) path points at some OTHER external image
        // server (e.g. an external IIIF host), never this edition's own digilib
        // Scaler - appending digilib's ?wx=/dw=/mo= query syntax to it breaks
        // that server (observed: infinite redirect loop against a Staatsbibliothek
        // IIIF endpoint). Only relative paths are resolved against the digilib
        // Scaler; absolute URLs always fall through to the IIIF branch below.
        if(getPreference('image_server') === 'digilib' && !path.startsWith("http")) {
            return {
                type: 'digilib',
                url: me.imagePrefix + path,
                width: Number(width),
                height: Number(height)
            };
        }

        var iiifPath = path;
        if(!path.startsWith("http")) {
            iiifPath = me.imagePrefix + path.replace(new RegExp('\/', 'g'), '!');
        }

        return {
            "@context": "http://iiif.io/api/image/2/context.json",
            "@id": iiifPath,
            "height": Number(height),
            "width": Number(width),
            "profile": [ "http://iiif.io/api/image/2/level2.json" ],
            "protocol": "http://iiif.io/api/image",
            "tiles": [{
                "scaleFactors": [ 1, 2, 4, 8, 16, 32 ],
                "width": 1024
            }]
        };
    },

    showImage: function(path, width, height, pageId) {
        var me = this;

        me.imageHeight = height;
        me.imageWidth = width;
        me.imgPath = path;
        me.imgId = pageId;

        me.webComponent.setAttribute('tilesources', JSON.stringify([me.buildTileSource(path, width, height)]));

        me.fireEvent('imageChanged', me, path, pageId);
    },

    // Loads an entire page set as an OpenSeadragon sequence so the component's
    // native pagination (goToPage / pagenumber) can switch pages without
    // reloading the whole viewer. `store` is the imageSet (Ext.data.Store).
    setImages: function(store) {
        var me = this;

        me.pages = [];
        var tileSources = [];

        store.each(function(rec) {
            me.pages.push({
                id: rec.get('id'),
                path: rec.get('path'),
                width: rec.get('width'),
                height: rec.get('height')
            });
            tileSources.push(me.buildTileSource(rec.get('path'), rec.get('width'), rec.get('height')));
        });

        if (!me.webComponent) return;

        me.webComponent.setAttribute('sequencemode', 'true');
        me.webComponent.setAttribute('tilesources', JSON.stringify(tileSources));
    },

    // Navigates the loaded sequence to the page with the given id by setting
    // the web component's 1-based `pagenumber` attribute. Returns true if the
    // page was found.
    goToPageById: function(id) {
        var me = this;

        if (!me.webComponent || !me.pages) return false;

        var index = -1;
        for (var i = 0; i < me.pages.length; i++) {
            if (me.pages[i].id === id) { index = i; break; }
        }
        if (index < 0) return false;

        me.rect = null;

        // getCurrentPage() returns 0 until OpenSeadragon is initialized; defer
        // the navigation to the first 'image-ready' event in that case.
        if (me.webComponent.getCurrentPage && me.webComponent.getCurrentPage() > 0) {
            me.webComponent.setAttribute('pagenumber', String(index + 1));
        } else {
            me.pendingPageIndex = index;
        }
        return true;
    },

    // Resolves a page id to its 1-based page number within the loaded sequence,
    // or NaN if the id is unknown.
    pageNumberById: function(id) {
        var me = this;
        if (!me.pages) return NaN;
        for (var i = 0; i < me.pages.length; i++) {
            if (me.pages[i].id === id) return i + 1;
        }
        return NaN;
    },


    setMeasuresData: function(measures) {
        var me = this;
        if (!me.webComponent) return;

        me._measureZones = me._measureZones || {};
        (measures || []).forEach(function(m) {
            var key = 'measure:' + m.key;
            var existing = me._measureZones[key];
            // A navigation-only push (gotoMeasure) carries no name; don't let it
            // clobber a label already pushed by the page's measure-display load.
            var hasName = (m.name != null && String(m.name) !== '');
            var name = hasName ? String(m.name)
                : (existing && existing.label != null ? existing.label : '');
            var page = me.pageNumberById(m.pageId);
            var pageVal = (typeof page === 'number' && !isNaN(page)) ? page : null;
            me._measureZones[key] = {
                type: 'measure',
                page: pageVal,
                ulx: m.ulx, uly: m.uly, lrx: m.lrx, lry: m.lry,
                containerClass: 'measure',
                innerClass: (name === '' ? 'measureInnerEmpty' : 'measureInner'),
                label: name,
                group: 'measure:' + m.key
            };
        });
        me.pushZonesData();
    },

    // Pushes movements (mdivs) to the component as zone entries carrying
    // `type:'mdiv'`. A movement only carries its first page (no rectangle), so
    // it is a navigation target only (never rendered as an overlay). Entries
    // are MERGED into the mdiv zone map (keyed 'mdiv:<key>').
    // Record fields: { key, pageId }.
    setMdivsData: function(mdivs) {
        var me = this;
        if (!me.webComponent) return;

        me._mdivZones = me._mdivZones || {};
        (mdivs || []).forEach(function(m) {
            me._mdivZones['mdiv:' + m.key] = { type: 'mdiv', page: me.pageNumberById(m.pageId) };
        });
        me.pushZonesData();
    },

    // Serialises the union of the measure, movement and annotation zone maps and
    // pushes it to the component's single `zones-data` attribute. Each sub-map is
    // rebuilt/merged on its own push so that re-pushing one type does not drop
    // the others. The component renders overlays for zones whose `type` is in
    // `visible-types` and navigates to any zone via the `zone` attribute.
    pushZonesData: function() {
        var me = this;
        if (!me.webComponent) return;
        var map = Ext.apply({}, me._measureZones || {});
        Ext.apply(map, me._mdivZones || {});
        Ext.apply(map, me._annotationZones || {});
        me.webComponent.setAttribute('zones-data', JSON.stringify(map));
    },

    // Jumps to a measure by setting the semantic `zone` attribute to the
    // measure's namespaced zone key. A nonce is appended after a '|' separator
    // so that repeating the same measure still changes the attribute value and
    // re-fires the component's attributeChangedCallback; the component strips
    // the nonce.
    gotoMeasure: function(key) {
        var me = this;
        if (!me.webComponent) return;
        me._zoneNonce = (me._zoneNonce || 0) + 1;
        me.webComponent.setAttribute('zone', 'measure:' + String(key) + '|' + me._zoneNonce);
    },

    // Loads / jumps to a movement's first page by setting the `zone` attribute
    // to the movement's namespaced zone key. Uses the same nonce-suffix scheme
    // as gotoMeasure.
    gotoMdiv: function(key) {
        var me = this;
        if (!me.webComponent) return;
        me._zoneNonce = (me._zoneNonce || 0) + 1;
        me.webComponent.setAttribute('zone', 'mdiv:' + String(key) + '|' + me._zoneNonce);
    },

    fitInImage: function() {

        var me = this;
        // Drive the component declaratively: bump the 'triggerhome' attribute so
        // attributeChangedCallback fires even on repeated fits.
        if (me.webComponent) {
            me._homeNonce = (me._homeNonce || 0) + 1;
            me.webComponent.setAttribute('triggerhome', String(me._homeNonce));
        }
    },

    setZoomAndCenter: function(z) {

        var me = this;
        // Drive the zoom via the 'zoom' attribute. The slider stays in sync with
        // the actual viewport zoom (via the 'zoomChanged' event), so consecutive
        // values differ and attributeChangedCallback fires reliably.
        if (me.webComponent) me.webComponent.setAttribute('zoom', String(z));
    },

    getActualRect: function() {

        var me = this;
        if (!me.webComponent) return { x: 0, y: 0, width: 0, height: 0 };

        return me.webComponent.getImageViewportRect();
    },

    showRect: function(x, y, width, height, highlight, fitHeight, alignment) {

        var me = this;
        me.rect = {
            x: x,
            y: y,
            width: width,
            height: height,
            highlight: highlight,
            fitHeight: fitHeight,
            alignment: alignment || 'center'
        };

        me.fitStoredRect();
    },

    fitStoredRect: function() {

        var me = this;
        if(!me.webComponent || !me.rect) return;

        var r = me.rect;
        var x = r.x;
        var width = r.width;

        // fitHeight maps the zone height to the full container height. Expand
        // the fitted rectangle horizontally to the component's aspect ratio and
        // align it consistently across adjacent measure viewers.
        if(r.fitHeight) {
            var contW = me.getWidth();
            var contH = me.getHeight();
            if(contW > 0 && contH > 0) {
                // Never go narrower than the actual content width: when the
                // container is proportionally taller/narrower than the zone
                // (common with many measures per row, e.g. a high measure
                // count), this ratio comes out smaller than r.width. Using it
                // as-is would crop away real measures (the alignment offset
                // below then anchors on the wrong edge, hiding e.g. the first
                // measure of a right-aligned group). Only ever EXPAND the
                // rect to fill the container aspect, never shrink it.
                width = Math.max(r.width, r.height * (contW / contH));
                if(r.alignment === 'left') {
                    x = r.x;
                } else if(r.alignment === 'right') {
                    x = r.x + r.width - width;
                } else {
                    x = r.x + r.width / 2 - width / 2;
                }
            }
        }

        // Drive the component declaratively via the 'fitrect' attribute. A
        // monotonic nonce ensures repeated fits and resize re-fits are applied.
        me._fitNonce = (me._fitNonce || 0) + 1;
        me.webComponent.setAttribute('fitrect',
            [x, r.y, width, r.height, me._fitNonce].join(','));
    },

    // Re-fit the stored zone after layout changes so measure-based viewers keep
    // the same displayed staff height when viewers are added or removed.
    onResize: function() {
        this.fitStoredRect();
    },

    // Pushes a named SVG layer's raw markup + visibility to the component via
    // the layers-data/visible-layers attributes (component owns rendering and
    // the readiness-safe retry - see edirom-image-viewer.js _renderLayers).
    addSVGOverlay: function(overlayId, overlay, name, uri, fn) {

        var me = this;
        if (!me.webComponent) return;

        me._layersData = me._layersData || {};
        me._visibleLayers = me._visibleLayers || [];

        overlay.each(function(overlay){
            if (overlay.get('svg') !== null) {
                me._layersData[overlayId] = overlay.get('svg');
            }
        });

        if (Ext.Array.indexOf(me._visibleLayers, overlayId) === -1) {
            me._visibleLayers.push(overlayId);
        }

        me.webComponent.setAttribute('layers-data', Ext.JSON.encode(me._layersData));
        me.webComponent.setAttribute('visible-layers', Ext.JSON.encode(me._visibleLayers));
    },

    removeSVGOverlay: function(overlayId) {
        var me = this;
        if (!me.webComponent) return;

        me._visibleLayers = me._visibleLayers || [];
        Ext.Array.remove(me._visibleLayers, overlayId);
        me.webComponent.setAttribute('visible-layers', Ext.JSON.encode(me._visibleLayers));
    },

    removeShapes: function(groupName) {

        if(typeof(debug) !== 'undefined' && debug !== null && debug) {
            console.log('view: OpenSeaDragonView: removeShapes');
            console.log(groupName);
        }

        var me = this;

        // Annotations and measures are rendered from zones-data now; "removing"
        // them means dropping their zone sub-map and re-pushing zones-data.
        if (groupName === 'annotations') {
            me._annotationZones = {};
            me.pushZonesData();
            return;
        }
        if (groupName === 'measures') {
            me._measureZones = {};
            me.pushZonesData();
            return;
        }

        //abort if me.shapes does not contain key
        if(!me.shapes.containsKey(groupName)) {
            if(typeof(debug) !== 'undefined' && debug !== null && debug) {
                console.log('me.shapes does not contain key: ' + groupName);
            }
            return;
        }

        // create function for each shape
        var fn = function(shape) {

            var id;

            try {
                id = shape.get('id');
            }catch(e) {
                id = shape.id;
            }

            if(typeof(debug) !== 'undefined' && debug !== null && debug) {
                console.log('me.id: ' + me.id);
                console.log('+shape.id: ' + me.id + '_' + id);
            }

            if (me.webComponent) me.webComponent.removeOverlay(me.id + '_' + id);
        };

        if(me.shapes.get(groupName).each)
            me.shapes.get(groupName).each(fn);
        else
            (me.shapes.get(groupName) || []).forEach(fn);

        me.shapes.add(groupName, []);
    },

    setAnnotationsData: function(annotations, pageId) {

        var me = this;
        if (!me.webComponent) return;

        var page = (pageId != null) ? me.pageNumberById(pageId) : NaN;
        var pageVal = (typeof page === 'number' && !isNaN(page)) ? page : null;

        me._annotationZones = {};

        // one entry per annotation: its uri (to preload the tooltip) and the
        // zone keys built for its regions (so the tooltip can be written to all).
        var annoRecs = [];

        if (annotations && typeof annotations.each === 'function') {
            annotations.each(function(annotation) {

                var annoId = annotation.get('id');
                var title = annotation.get('title');
                var uri = annotation.get('uri');
                var categories = annotation.get('categories');
                var priority = annotation.get('priority');
                var fn = annotation.get('fn');
                var plist = Ext.Array.toArray(annotation.get('plist'));

                var zoneKeys = [];
                Ext.Array.each(plist, function(shape) {
                    var rectId = shape.id;
                    var key = 'annotation:' + me.id + '_' + rectId + ':' + annoId;
                    var innerClass = ('annotIcon ' + (categories || '') + ' '
                        + (priority || '') + ' ' + (shape.type || ''))
                        .replace(/\s+/g, ' ').trim();
                    var iconHtml = '';
                    (categories || '').split(/\s+/).some(function(cat) {
                        if (ANNOTATION_ICON_MARKUP[cat]) {
                            iconHtml = ANNOTATION_ICON_MARKUP[cat];
                            return true;
                        }
                        return false;
                    });
                    me._annotationZones[key] = {
                        type: 'annotation',
                        page: pageVal,
                        ulx: shape.ulx, uly: shape.uly, lrx: shape.lrx, lry: shape.lry,
                        containerClass: 'annotation',
                        innerClass: innerClass,
                        iconHtml: iconHtml,
                        group: 'annotation:' + me.id + '_' + rectId,
                        title: title,
                        tooltip: '',
                        fn: fn,
                        dataId: annoId,
                        // Generic filter tokens for the component's hidden-filters
                        // mechanism: the annotation's category + priority ids. The
                        // component treats these as opaque; the CSS classes for the
                        // icon are carried separately in innerClass.
                        filters: ((categories || '') + ' ' + (priority || '')).replace(/\s+/g, ' ').trim()
                    };
                    zoneKeys.push(key);
                });

                annoRecs.push({ uri: uri, zoneKeys: zoneKeys });
            });
        }

        // Preload each annotation's server-rendered tooltip HTML up front so the
        // component can render the tooltip itself on hover. All tooltips are
        // fetched in parallel and zones-data is pushed once they have all
        // resolved. A safety-net timeout pushes whatever resolved so a single
        // failed request never permanently hides the page's annotations.
        var pending = annoRecs.length;
        var pushed = false;
        var pushData = function() {
            if (pushed) return;
            pushed = true;
            me.pushZonesData();
        };

        if (pending === 0) { pushData(); return; }

        annoRecs.forEach(function(rec) {
            window.doAJAXRequest('data/xql/getAnnotation.xql',
                'GET',
                {
                    uri: rec.uri,
                    target: 'tip',
                    edition: EdiromOnline.getApplication().activeEdition
                },
                function(response) {
                    rec.zoneKeys.forEach(function(k) {
                        if (me._annotationZones[k]) me._annotationZones[k].tooltip = response.responseText;
                    });
                    pending--;
                    if (pending === 0) pushData();
                }
            );
        });

        // safety net in case some requests never call back
        setTimeout(pushData, 8000);
    },

    // Shows or hides a whole zone TYPE (e.g. 'annotation', 'measure') via the
    // `visible-types` attribute, without discarding the pushed zones-data. The
    // component renders only the types currently in the set, so toggling is a
    // pure visibility switch (no re-fetch / re-push of the data).
    setTypeVisible: function(type, visible) {
        var me = this;
        if (!me.webComponent) return;
        me._visibleTypeSet = me._visibleTypeSet || {};
        if (visible) me._visibleTypeSet[type] = true;
        else delete me._visibleTypeSet[type];
        me.webComponent.setAttribute('visible-types', JSON.stringify(Object.keys(me._visibleTypeSet)));
    },

    setAnnotationFilter: function(hiddenFilters) {
        var me = this;
        if (!me.webComponent) return;
        me.webComponent.setAttribute('hidden-filters', JSON.stringify(Ext.Array.toArray(hiddenFilters)));
    },

    // Runs a zone's host click action (set up server-side as the zone's `fn`,
    // e.g. an annotation link), fired from the component's zone-click event.
    onZoneClick: function(detail) {
        if (detail && detail.fn) eval(detail.fn);
    },

    getShapes: function(groupName) {

        var me = this;
        var shapes = me.shapes.get(groupName);
        return (shapes == null || typeof shapes === 'undefined'?[]:shapes);
    },

    getShapeElem: function(shapeId) {

        if(typeof(debug) !== 'undefined' && debug !== null && debug) {
            console.log('view: OpenSeaDragonView: getShapeElem: ' + shapeId);
        }
        var me = this;
        // OpenSeaDragon renders overlays inside the web component's shadow DOM,
        // so they cannot be found via me.el (which searches the main document).
        return me.getElemByRawId(me.id + '_' + shapeId);
    },

    getElemByRawId: function(rawId) {

        var me = this;
        if(!me.webComponent || !me.webComponent.shadowRoot)
            return null;
        var dom = me.webComponent.shadowRoot.getElementById(rawId);
        return dom ? Ext.get(dom) : null;
    },

    listenForShapeLink: function(e, dom, args) {

        var me = this;

        if(e.button != 0) return;

        args.elem.on('mouseup', me.openShapeLink, me, {
            single: true,
            stopEvent : true,
            fn: args.fn
        });
    },

    openShapeLink: function(e, dom, args) {
        eval(args.fn);
    }
});