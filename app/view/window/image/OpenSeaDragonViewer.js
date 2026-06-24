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

    annotTipWidth: 220,
    annotTipMaxWidth: 300,
    annotTipHeight: 140,
    annotTipMaxHeight: 300,

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

        me.html = '<div id="' + me.id + '_openseadragon" style="background-color: black; top:0px; bottom: 0px; left: 0px; right: 0px; position:absolute;">' +
                  '<edirom-image-viewer id="' + me.id + '_wc' + '" ' +
                  'style="width:100%;height:100%;display:block;" ' +
                  'shownavigationcontrol="false" shownavigator="false" clicktozoom="false">' +
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

    fitInImage: function() {

        var me = this;
        if (me.webComponent) me.webComponent.home();
    },

    setZoomAndCenter: function(z) {

        var me = this;
        if (me.webComponent) me.webComponent.setZoom(z);
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

        if (me.webComponent) me.webComponent.fitImageRect(x, y, width, height);
    },

    addMeasures: function(shapes) {

        var me = this;
        if (!me.webComponent) return;

        me.shapes.add('measures', shapes);

        me.shapes.get('measures').each(function(shape) {

            var id = shape.get('id');
            var name = shape.get('name');
            var x = shape.get('ulx');
            var y = shape.get('uly');
            var width = shape.get('lrx') - shape.get('ulx');
            var height = shape.get('lry') - shape.get('uly');

            var measure = document.createElement("div");
            measure.id = me.id + '_' + id;
            measure.className = "measure";
            measure.innerHTML = '<span class="' + (name === ''?'measureInnerEmpty':'measureInner') + '" id="' + me.id + '_' + id + '_inner">' + name + '</span>';

            me.webComponent.addImageOverlay(measure, x, y, width, height);

            var text = Ext.get(me.webComponent.shadowRoot.getElementById(me.id + '_' + id + '_inner'));
            text.on('mouseenter', me.highlightShape, me, measure, true);
            text.on('mouseleave', me.deHighlightShape, me, measure, true);
            text.setStyle({
                position: 'relative'
            });
        });
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
            Ext.Array.each(me.shapes.get(groupName), fn);

        me.shapes.add(groupName, []);
    },


    highlightShape: function(event, owner, shape) {

        var elem = Ext.get(shape);
        elem.addCls('highlighted');

        var annotId = elem.getAttribute('data-edirom-annot-id');
        Ext.select('div[data-edirom-annot-id=' + annotId + ']', this.el).addCls('combinedHighlight');
        Ext.select('span[data-edirom-annot-id=' + annotId + ']', this.el).addCls('combinedHighlight');
    },

    deHighlightShape: function(event, owner, shape) {

        var elem = Ext.get(shape);
        elem.removeCls('highlighted');

        var annotId = elem.getAttribute('data-edirom-annot-id');
        Ext.select('div[data-edirom-annot-id=' + annotId + ']', this.el).removeCls('combinedHighlight');
        Ext.select('span[data-edirom-annot-id=' + annotId + ']', this.el).removeCls('combinedHighlight');
    },

    addAnnotations: function(annotations) {

        var me = this;
        if (!me.webComponent) return;

        if(typeof(debug) !== 'undefined' && debug !== null && debug) {
            console.log('controller: OpenseaDragonView: addAnnotaitons');
            console.log('annotations RAW');
            console.log(annotations);
        }

        //add empty annotations array to shapes
        me.shapes.add('annotations', []);

        // template for annotation element
        //TODO: currently unused
        //var dh = Ext.DomHelper;
        //var tpl = dh.createTemplate('<div id="{0}" class="annotation {2} {3} {4}" data-edirom-annot-id="{4}"><div id="{0}_inner" class="annotIcon" title="{1}"></div></div>');
        //tpl.compile();

        if(typeof(debug) !== 'undefined' && debug !== null && debug) {
            console.log('me.shapes annotations');
            console.log(me.shapes.get('annotations'));
        }

        // iterate over annotations
        annotations.each(function(annotation) {

            if(typeof(debug) !== 'undefined' && debug !== null && debug) {
                console.log('Processing annotation…');
                console.log(annotation);
            }

            var annoId = annotation.get('id');
            var name = annotation.get('title');
            var uri = annotation.get('uri');
            var categories = annotation.get('categories');
            var priority = annotation.get('priority');
            var fn = annotation.get('fn');
            var plist = Ext.Array.toArray(annotation.get('plist'));

            //push plist to me.shapes annotations
            Ext.Array.push(me.shapes.get('annotations'), plist);

            //iterate over an annotations plist
            Ext.Array.each(plist, function(shape) {

                var id = shape.id; //pattern from XQL 'annotation_' || $annoId || '_' || string($p/@xml:id)
                var x = shape.ulx;
                var y = shape.uly;
                var width = shape.lrx - shape.ulx;
                var height = shape.lry - shape.uly;
                var partType = shape.type;

                var anno = me.webComponent.getOverlayById(me.id + '_' + id);
                if(anno === null) {

                    var anno = document.createElement('div');
                    anno.id = me.id + '_' + id;
                    anno.className = 'annotation';

                    // annoIcon: has to be nearly identical to annoIcon in else
                    var annoIcon = document.createElement('div');
                    annoIcon.id = anno.id + annoId;
                    annoIcon.className = 'annotIcon ' + categories + ' ' + priority + ' ' + partType;
                    anno.append(annoIcon);

                    me.webComponent.addImageOverlay(anno, x, y, width, height);

                }else {

                    // annoIcon: has to be nearly identical to annoIcon in if
                    var anno = Ext.get(me.webComponent.shadowRoot.getElementById(me.id + '_' + id));
                    var annoIcon = document.createElement('div');
                    annoIcon.id = anno.id + annoId;
                    annoIcon.className = 'annotIcon ' + categories + ' ' + priority + ' ' + partType;
                    anno.dom.append(annoIcon);
                }

                // retrieve dom element of annotationIcon to bind actions
                var annoIcon = Ext.get(me.webComponent.shadowRoot.getElementById(annoIcon.id));

                // bind onclick action to annotation icon
                annoIcon.on('click', me.openShapeLink, me, {
                    single: false,
                    stopEvent : true,
                    fn: fn
                });

                // create the tooltip for the annotation
                var tip = Ext.create('Ext.tip.ToolTip', {
                    target: annoIcon.id,
                    cls: 'annotationTip',
                    width: me.annotTipWidth,
                    maxWidth: me.annotTipMaxWidth,
                    height: me.annotTipHeight,
                    maxHeight: me.annotTipMaxHeight,
                    dismissDelay: 0,
                    hideDelay: 1000,
                    anchor: 'left',
                    html: getLangString('Annotation_plus_Title', name)
                });

                // bind function to fetch the contents for the annotation tooltip
                tip.on('afterrender', function() {
                    window.doAJAXRequest('data/xql/getAnnotation.xql',
                        'GET',
                        {
                            uri: uri,
                            target: 'tip',
                            edition: EdiromOnline.getApplication().activeEdition
                        },
                        Ext.bind(function(response){
                            this.update(response.responseText);
                        }, this)
                    );
                    this.el.on('mouseover', function() {
                        this.addCls('mouseOverAnnot');
                    }, this);
                    this.el.on('mouseout', function() {
                        this.removeCls('mouseOverAnnot');
                    }, this);
                }, tip);

                // delay hiding the annotation tooltip
                tip.on('beforehide', function() {
                    if(this.el.hasCls('mouseOverAnnot')) {
                        Ext.Function.defer(function(){
                            this.hide();
                        }, 1000, this);
                        return false;
                    }
                }, tip);
            });
            if(typeof(debug) !== 'undefined' && debug !== null && debug) {
                console.log('me.shapes annotations');
                console.log(me.shapes.get('annotations'));
            }
        });
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
        var elem = me.el.getById(me.id + '_' + shapeId);//TODO causes problems || me.el.getById(shapeId);

        return elem;
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
