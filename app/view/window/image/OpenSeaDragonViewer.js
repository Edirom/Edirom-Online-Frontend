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
                  'measures-data="{}" ' +
                  'measure="" ' +
                  'mdivs-data="{}" ' +
                  'mdiv="" ' +
                  'annotations-data="[]" ' +
                  'show-annotations="false" ' +
                  'visible-categories="[&quot;undefined&quot;]" ' +
                  'visible-priorities="[&quot;undefined&quot;]" ' +
                  'measure-numbers-data="[]" ' +
                  'show-measure-numbers="false" ' +
                  'view-mode="">' +
                  '</edirom-image-viewer>' +
                  '</div>' + openseadragonEvents;

        me.shapes = new Ext.util.MixedCollection();

        me.callParent();

        me.on('afterrender', me.initSurface, me, {single: true});
    },

    initSurface: function() {
        var me = this;
        me.webComponent = document.getElementById(me.id + '_wc');

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
                me.showRect(me.rect.x, me.rect.y, me.rect.width, me.rect.height, me.rect.highlight);
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

        // Annotation overlays are rendered by the component from the pushed
        // annotations-data attribute, including the tooltip (the host preloads
        // each annotation's server-rendered tooltip HTML into annotations-data).
        // The only ExtJS-specific interaction left here is the click action,
        // run from the component's annotation-click event.
        me.webComponent.addEventListener('annotation-click', function(event) {
            me.onAnnotationClick(event.detail);
        });

        // The component owns the category/priority filter; when it changes
        // (including when the visible-categories/visible-priorities attributes
        // are set externally), forward it so the host can keep its filter menu
        // checkboxes in sync.
        me.webComponent.addEventListener('annotation-filter-changed', function(event) {
            me.fireEvent('annotationFilterChanged', me, event.detail.visibleCategories, event.detail.visiblePriorities);
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

    // Builds a IIIF level2 tile source descriptor for a single image.
    buildTileSource: function(path, width, height) {
        var me = this;

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

    // Pushes the full measures map to the component (Verovio-style "push"
    // model). `measures` is an array of records each carrying a key plus a
    // page id and pixel rectangle; the page id is resolved to a 1-based page
    // number here so the component stays in page-number space.
    // Record fields: { key, pageId, ulx, uly, lrx, lry }.
    setMeasuresData: function(measures) {
        var me = this;
        if (!me.webComponent) return;

        var map = {};
        (measures || []).forEach(function(m) {
            map[m.key] = {
                page: me.pageNumberById(m.pageId),
                ulx: m.ulx, uly: m.uly, lrx: m.lrx, lry: m.lry
            };
        });
        me.webComponent.setAttribute('measures-data', JSON.stringify(map));
    },

    // Pushes the full movements (mdiv) map to the component. `mdivs` is an
    // array of records each carrying a key plus the movement's first page id,
    // resolved here to a 1-based page number.
    // Record fields: { key, pageId }.
    setMdivsData: function(mdivs) {
        var me = this;
        if (!me.webComponent) return;

        var map = {};
        (mdivs || []).forEach(function(m) {
            map[m.key] = { page: me.pageNumberById(m.pageId) };
        });
        me.webComponent.setAttribute('mdivs-data', JSON.stringify(map));
    },

    // Jumps to a measure by setting the semantic `measure` attribute. A nonce
    // is appended after a '|' separator so that repeating the same measure
    // still changes the attribute value and re-fires the component's
    // attributeChangedCallback; the component strips the nonce.
    gotoMeasure: function(key) {
        var me = this;
        if (!me.webComponent) return;
        me._measureNonce = (me._measureNonce || 0) + 1;
        me.webComponent.setAttribute('measure', String(key) + '|' + me._measureNonce);
    },

    // Loads / jumps to a movement's first page by setting the `mdiv` attribute.
    // Uses the same nonce-suffix scheme as gotoMeasure.
    gotoMdiv: function(key) {
        var me = this;
        if (!me.webComponent) return;
        me._mdivNonce = (me._mdivNonce || 0) + 1;
        me.webComponent.setAttribute('mdiv', String(key) + '|' + me._mdivNonce);
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

    showRect: function(x, y, width, height, highlight) {

        var me = this;
        me.rect = {
            x:x,
            y:y,
            width:width,
            height:height,
            highlight:highlight
        };

        if (me.webComponent) {
            // Drive the component declaratively via the 'fitrect' attribute. A
            // monotonic nonce is appended so that jumping to the SAME region
            // again still changes the attribute value and re-fires the handler.
            me._fitNonce = (me._fitNonce || 0) + 1;
            me.webComponent.setAttribute('fitrect',
                [x, y, width, height, me._fitNonce].join(','));
        }
    },

    addSVGOverlay: function(overlayId, overlay, name, uri, fn) {

        var me = this;
        if (!me.webComponent) return;

        var svgId = me.id + '_' + overlayId;
        var overlayOSD = me.webComponent.getOverlayById(svgId);
        if (overlayOSD !== null ) {
            return;
        }

        overlay.each(function(overlay){
            if (overlay.get('svg') !== null) {
                parser = new DOMParser;
                var overlayXML = parser.parseFromString(overlay.get('svg'), 'text/xml');
                var svg = overlayXML.documentElement;
                svg.id = me.id + '_' + overlayId;
                var x = 0;
                var y = 0;
                var width = svg.width.baseVal.value;
                var height = svg.height.baseVal.value;
                me.webComponent.addImageOverlay(overlayXML.documentElement, x, y, width, height);
            }
        });
    },

    removeSVGOverlay: function(overlayId) {
        var me = this;
        if (!me.webComponent) return;
        var svgId = me.id + '_' + overlayId;
        me.webComponent.removeOverlay(svgId);
    },

    removeShapes: function(groupName) {

        if(typeof(debug) !== 'undefined' && debug !== null && debug) {
            console.log('view: OpenSeaDragonView: removeShapes');
            console.log(groupName);
        }

        var me = this;

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

    // Pushes the page's annotations to the component (push model, like
    // setMeasuresData / setMdivsData). The component renders the overlay
    // badges AND their hover tooltip from the annotations-data attribute; each
    // record carries its server-rendered tooltip HTML (preloaded below), so the
    // only ExtJS-specific interaction left is the click action (annotation-click
    // event). `me.shapes` is still populated here so the existing filter /
    // shadow-DOM lookup helpers (getShapes / getShapeElem /
    // annotationFilterChanged) keep working. Passing an empty array hides all
    // annotations.
    setAnnotationsData: function(annotations) {

        var me = this;
        if (!me.webComponent) return;

        // reset the shapes group the host filter iterates over
        me.shapes.add('annotations', []);

        var data = [];

        if (annotations && typeof annotations.each === 'function') {
            annotations.each(function(annotation) {

                var plist = Ext.Array.toArray(annotation.get('plist'));

                // keep me.shapes in sync for annotationFilterChanged / getShapes
                Ext.Array.push(me.shapes.get('annotations'), plist);

                data.push({
                    idPrefix: me.id,
                    id: annotation.get('id'),
                    title: annotation.get('title'),
                    uri: annotation.get('uri'),
                    categories: annotation.get('categories'),
                    priority: annotation.get('priority'),
                    fn: annotation.get('fn'),
                    plist: plist,
                    tooltip: ''
                });
            });
        }

        // Preload each annotation's server-rendered tooltip HTML up front so the
        // component can render the tooltip itself on hover (push model: the host
        // sends the data, the component renders it). All tooltips for the page
        // are fetched in parallel and the annotations-data is pushed once they
        // have all resolved. A safety-net timeout pushes whatever resolved so a
        // single failed request never permanently hides the page's annotations.
        var pending = data.length;
        var pushed = false;
        var pushData = function() {
            if (pushed) return;
            pushed = true;
            me.webComponent.setAttribute('annotations-data', JSON.stringify(data));
        };

        if (pending === 0) { pushData(); return; }

        data.forEach(function(rec) {
            window.doAJAXRequest('data/xql/getAnnotation.xql',
                'GET',
                {
                    uri: rec.uri,
                    target: 'tip',
                    edition: EdiromOnline.getApplication().activeEdition
                },
                function(response) {
                    rec.tooltip = response.responseText;
                    pending--;
                    if (pending === 0) pushData();
                }
            );
        });

        // safety net in case some requests never call back
        setTimeout(pushData, 8000);
    },

    // Shows or hides the already-pushed annotation overlays via the boolean
    // `show-annotations` attribute, without discarding the annotations-data.
    setShowAnnotations: function(show) {
        var me = this;
        if (!me.webComponent) return;
        me.webComponent.setAttribute('show-annotations', show ? 'true' : 'false');
    },

    // Pushes the active category/priority filter to the component (push model).
    // The component hides annotation badges whose category/priority ids are not
    // in the visible sets, without re-pushing annotations-data. `visibleCategories`
    // and `visiblePriorities` are the same arrays the host's legacy
    // annotationFilterChanged builds (['undefined'] = no such taxonomy = show all,
    // [] = nothing checked = hide all).
    setAnnotationFilter: function(visibleCategories, visiblePriorities) {
        var me = this;
        if (!me.webComponent) return;
        me.webComponent.setAttribute('visible-categories', JSON.stringify(Ext.Array.toArray(visibleCategories)));
        me.webComponent.setAttribute('visible-priorities', JSON.stringify(Ext.Array.toArray(visiblePriorities)));
    },

    // Pushes the page's measure-number boxes to the component (push model, like
    // setAnnotationsData). The component renders the `.measure` overlays from
    // the measure-numbers-data attribute; the host only toggles their
    // visibility via setShowMeasureNumbers. `me.shapes` is kept in sync so the
    // existing removeShapes('measures') / getShapes helpers keep working.
    // Passing an empty store hides all measure numbers.
    setMeasureNumbersData: function(measures) {

        var me = this;
        if (!me.webComponent) return;

        // reset the shapes group some helpers iterate over
        me.shapes.add('measures', measures || []);

        var data = [];

        if (measures && typeof measures.each === 'function') {
            measures.each(function(shape) {
                data.push({
                    idPrefix: me.id,
                    id: shape.get('id'),
                    name: shape.get('name'),
                    ulx: shape.get('ulx'),
                    uly: shape.get('uly'),
                    lrx: shape.get('lrx'),
                    lry: shape.get('lry'),
                    type: shape.get('type')
                });
            });
        }

        me.webComponent.setAttribute('measure-numbers-data', JSON.stringify(data));
    },

    // Shows or hides the already-pushed measure-number overlays via the boolean
    // `show-measure-numbers` attribute, without discarding the data.
    setShowMeasureNumbers: function(show) {
        var me = this;
        if (!me.webComponent) return;
        me.webComponent.setAttribute('show-measure-numbers', show ? 'true' : 'false');
    },

    // Runs the annotation's host click action (set up server-side as the
    // annotation's `fn`), fired from the component's annotation-click event.
    onAnnotationClick: function(detail) {
        eval(detail.fn);
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