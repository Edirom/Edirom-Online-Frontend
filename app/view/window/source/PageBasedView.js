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
 *
 */
Ext.define('EdiromOnline.view.window.source.PageBasedView', {
    extend: 'EdiromOnline.view.window.View',

    requires: [
        'EdiromOnline.view.window.image.ImageViewer',
        'EdiromOnline.view.window.image.OpenSeaDragonViewer'
    ],

    alias : 'widget.pageBasedView',

    layout: 'fit',

    border: 0,

    imageSet: null,
    imageToShow: null,

    cls: 'pageBasedView',

    initComponent: function () {

        var me = this;

        me.addEvents('overlayVisibilityChange');
        me.owner.on('overlayVisiblityChange', me.onOverlayVisibilityChange, me);

    	var image_server = getPreference('image_server');

        if(image_server === 'openseadragon') {
    	    me.imageViewer = Ext.create('EdiromOnline.view.window.image.OpenSeaDragonViewer');
    	}else{
    		me.imageViewer = Ext.create('EdiromOnline.view.window.image.ImageViewer');
    	}

        this.items = [
            me.imageViewer
        ];

        me.callParent();

 	   me.imageViewer.on('zoomChanged', me.updateZoom, me);
 	   me.imageViewer.on('imageChanged', me.onViewerImageChanged, me);

 	   // When the component reports a filter change (e.g. its visible-categories
 	   // attribute was set externally), keep the source view's filter menu
 	   // checkboxes in sync.
 	   me.imageViewer.on('annotationFilterChanged', me.onViewerAnnotationFilterChanged, me);

 	   // When the component's tile sources shrink (e.g. the last page is removed),
 	   // trim the page spinner / image set so its total updates and navigation
 	   // cannot run past the last image.
 	   me.imageViewer.on('totalPagesChanged', me.onViewerTotalPagesChanged, me);
    },

    // Trims the image set to match the component's reduced tile-source count so
    // the page spinner total and next/prev bounds stay correct. Only shrinks
    // (never adds, since the removed pages have no image data).
    onViewerTotalPagesChanged: function(viewer, total) {
        var me = this;
        if(!me.imageSet || typeof total !== 'number') return;
        if(total >= me.imageSet.getCount()) return;

        var currentId = (me.pageSpinner && me.pageSpinner.combo) ? me.pageSpinner.combo.getValue() : null;

        var toRemove = [];
        for(var i = total; i < me.imageSet.getCount(); i++)
            toRemove.push(me.imageSet.getAt(i));
        me.imageSet.remove(toRemove);

        // If the page currently shown was removed, fall back to the new last page.
        if((currentId == null || me.imageSet.findExact('id', currentId) < 0) && me.imageSet.getCount() > 0)
            me.pageSpinner.setPage(me.imageSet.getAt(me.imageSet.getCount() - 1).get('id'));
    },

    // Relays a component-driven filter change up to the source view so its
    // annotation filter menu checkboxes mirror the visible categories/priorities.
    onViewerAnnotationFilterChanged: function(viewer, visibleCategories, visiblePriorities) {
        var me = this;
        if(me.owner && typeof me.owner.syncAnnotationFilterMenu === 'function')
            me.owner.syncAnnotationFilterMenu(visibleCategories, visiblePriorities);
    },

    // Keep the page spinner's number box in sync when the image viewer changes
    // page on its own (e.g. via the web component's native sequence navigation).
    onViewerImageChanged: function(viewer, path, id) {
        var me = this;
        if(me.pageSpinner && typeof me.pageSpinner.syncPage === 'function')
            me.pageSpinner.syncPage(id);
    },

    annotationFilterChanged: function(visibleCategories, visiblePriorities) {

        var me = this;

        // Component path: the web component owns annotation rendering, so push
        // the filter to it and let it show/hide badges itself. Falls back to the
        // legacy ExtJS shadow-DOM class toggling for the non-OSD ImageViewer.
        if(typeof me.imageViewer.setAnnotationFilter === 'function') {
            me.imageViewer.setAnnotationFilter(visibleCategories, visiblePriorities);
            return;
        }

        if(typeof(debug) !== 'undefined' && debug !== null && debug) {
            console.log('View: PageBasedView: annotationFilterChanged');
            console.log('visibleCategories');
            console.log(visibleCategories);
            console.log('visiblePriorities');
            console.log(visiblePriorities);
        }

       	var image_server = getPreference('image_server');

        var annotations = me.imageViewer.getShapes('annotations');

        if(typeof(debug) !== 'undefined' && debug !== null && debug) {
            console.log('View: PageBasedView: annotationFilterChanged: annotations');
            console.log(annotations);
            console.log(me.imageViewer.shapes.get('annotations'));
        }

        // define function to apply to relevant element IDs
        var fn = Ext.bind(function(annotationId) {

            var annotDiv = me.imageViewer.getElemByRawId(annotationId);
            if(annotDiv == null || annotDiv.dom == null)
                return;
            var classList = annotDiv.dom.classList;
            var prioritiesCategories = Ext.Array.toArray(classList);
            Ext.Array.remove(prioritiesCategories, 'measure');
            Ext.Array.remove(prioritiesCategories, 'annoIcon');

            if(typeof(debug) !== 'undefined' && debug !== null && debug) {
                console.log('View: PageBasedView: annotationFilterChanged: annotations fn');
                console.log(annotationId);
                console.log(annotDiv);
                console.log(classList);
                console.log(prioritiesCategories);
            }

            // create category and priority match variables
            var matchesCategoryFilter = false;
            var matchesPriorityFilter = false;

            // iterate over annotation class attribute values to see if they match visibleCategories or visiblePriorities
            for(var i = 0; i < prioritiesCategories.length; i++) {
                matchesCategoryFilter |= Ext.Array.contains(visibleCategories, prioritiesCategories[i]);

                matchesPriorityFilter |= Ext.Array.contains(visiblePriorities, prioritiesCategories[i]);
            }

            if(typeof(debug) !== 'undefined' && debug !== null && debug) {
                console.log(matchesCategoryFilter);
                console.log(matchesPriorityFilter);
            }

            // if filter results are false check if visibleCategories are undefined and if so assign true
            if( matchesCategoryFilter == false && visibleCategories == 'undefined') {
                matchesCategoryFilter = true;
            }

            // if filter results are falsey check if visibleCategories are undefined and if so assign true
            if( matchesPriorityFilter == false && visiblePriorities == 'undefined') {
                matchesPriorityFilter = true;
            }

            // depending on match results assign or remove class 'hidden'
            if(matchesCategoryFilter & matchesPriorityFilter)
                annotDiv.removeCls('hidden');
            else
                annotDiv.addCls('hidden');
        }, me);


        var annotationDivIds = [];

        Ext.Array.each(annotations, function(annotation) {

            if(typeof(debug) !== 'undefined' && debug !== null && debug) {
                console.log('annotation');
                console.log(annotation);
                console.log('me');
                console.log(me);
                console.log('me.owner.owner');
                console.log(me.owner.owner);
            }

            var annotDiv = me.imageViewer.getShapeElem(annotation.id);
            if(annotDiv == null || annotDiv.dom == null)
                return;
            var children = Ext.Array.toArray(annotDiv.dom.childNodes);

            // Ext.Array.push(annotationDivIds, annotation.id);
            Ext.Array.push(annotationDivIds, Ext.Array.pluck(children, 'id'));
        });

        if(typeof(debug) !== 'undefined' && debug !== null && debug) {
            console.log(annotationDivIds);
        }

        Ext.Array.each(annotationDivIds, fn);
    },


    setImageSet: function(imageSet) {

        var me = this;
        me.imageSet = imageSet;

        me.pageSpinner.setStore(me.imageSet);

        // When the viewer supports native pagination (OpenSeaDragonViewer),
        // load the whole set as a sequence once so page changes only switch
        // the component's page number instead of reloading a single image.
        if(typeof me.imageViewer.setImages === 'function')
            me.imageViewer.setImages(me.imageSet);

        if(me.imageToShow != null) {
            me.pageSpinner.setPage(me.imageSet.getById(me.imageToShow));
            me.imageToShow = null;

        }else if(me.imageSet.getCount() > 0)
            me.pageSpinner.setPage(me.imageSet.getAt(0));

        me.owner.fireEvent('afterImagesLoaded', me.owner, imageSet);
    },

    setPage: function(combo, store) {

        var me = this;

        // Remove old stuff
        me.imageViewer.clear();

        var id = combo.getValue();
        var imgIndex = me.imageSet.findExact('id', id);
        me.activePage = me.imageSet.getAt(imgIndex);

        // Native sequence pagination (OpenSeaDragonViewer): the component keeps
        // all pages loaded, so switching does NOT reload/destroy overlays. Tear
        // down the current page's overlays explicitly before navigating; the
        // visibility events below re-apply them for the new page.
        if(typeof me.imageViewer.goToPageById === 'function') {

            me.imageViewer.removeShapes('measures');
            me.imageViewer.removeShapes('annotations');

            if(me.owner.overlaysVisible) {
                Object.keys(me.owner.overlaysVisible).forEach(function(overlayId) {
                    me.imageViewer.removeSVGOverlay(overlayId);
                });
            }

            me.imageViewer.goToPageById(id);

        }else {
            me.imageViewer.showImage(me.activePage.get('path'),
                me.activePage.get('width'), me.activePage.get('height'));
        }


        // check global and local visibility settings for measures and annotations
        var types = ['measures', 'annotations'];

        // for each type, check visibility and fire event if visible
        for(var i = 0; i < types.length; i++) {
            var type = types[i];
            var globalVisible = sessionStorage.getItem('edirom-'+type+'-visible-global') === 'true';
            var localVisible = sessionStorage.getItem('edirom-'+type+'-visible-' + me.owner.id) === 'true';
            var localBlocked = document.getElementById('icon_display-'+type+'-window_' + me.owner.id).hasAttribute('pressed') && !localVisible;

            var visible = localVisible || (globalVisible && !localBlocked);

            if(type === 'annotations') {
                // Always preload this page's annotations into the component; the
                // handler pushes the data once and then applies visibility, so
                // the toolbar button can show/hide instantly without a re-fetch.
                me.owner.fireEvent('loadAnnotations', me.owner, visible);
            } else if(type === 'measures') {
                // Same push model for measure numbers: preload this page's
                // measures into the component once; the component remembers the
                // last show/hide state and applies it to every page.
                me.owner.fireEvent('loadMeasures', me.owner, visible);
            } else if(visible) {
                me.owner.fireEvent(type+'VisibilityChange', me.owner, true);
            }
        }

        var layers = Object.keys(me.owner.overlaysVisible);
        Ext.Array.each(layers, function(layer) {
			me.owner.fireEvent('overlayVisiblityChange', me.owner, layer, me.owner.overlaysVisible[layer]);
        });

    },

    showPage: function(pageId) {
        var me = this;

        if(me.imageSet == null) {
            me.imageToShow = pageId;
            return;
        }

        me.pageSpinner.setPage(me.imageSet.getById(pageId));
    },

    getActivePage: function() {
        return this.activePage;
    },

    createToolbarEntries: function() {

        var me = this;

        var image_server = getPreference('image_server');

        // page selection bar
        me.pageSpinner = Ext.create('EdiromOnline.view.window.util.PageSpinner', {
            width: 100,
            cls: 'pageSpinner',
            owner: me
        });

        // zoom slider (if applicable)
        if (image_server === 'openseadragon' || image_server === 'digilib'){ 
            me.zoomSlider = Ext.create('Ext.slider.Single', {
                width: 100,
                value: 100,
                increment: 5,
                minValue: ( image_server === 'openseadragon' ) ? 90 : 10,
                maxValue: ( image_server === 'openseadragon' ) ? 700 : 400,
                checkChangeBuffer: 100,
                useTips: true,
                cls: 'zoomSlider',
                tipText: function(thumb) {
                    return Ext.String.format('{0}%', thumb.value);
                },
                listeners: {
                    change: Ext.bind(me.zoomChanged, me, [], 0)
                }
            });
        }

        // if image server (and zoomSlider) is defined, return zoom slider and page spinner
        if(image_server === 'digilib' || image_server === 'openseadragon'){
            return [me.pageSpinner, me.zoomSlider];
        }
        // otherwise return only page spinner
        else{
        	return [me.pageSpinner];
        }
    },

    hideToolbarEntries: function() {
        var me = this;
        if(typeof me.zoomSlider !== 'undefined'){
        	me.zoomSlider.hide();
        }
        me.pageSpinner.hide();
    },

    showToolbarEntries: function() {
        var me = this;
        if(typeof me.zoomSlider !== 'undefined'){
        	me.zoomSlider.show();
        }
        me.pageSpinner.show();

    },

    fitFacsimile: function() {
        this.imageViewer.fitInImage();
    },

    // Pushes the page's measure numbers to the image component once (push
    // model); the toolbar button then only toggles their visibility.
    setMeasureNumbersData: function(measures) {
        var me = this;
        me.imageViewer.setMeasureNumbersData(measures);
    },

    showMeasures: function() {
        var me = this;
        me.imageViewer.setShowMeasureNumbers(true);
    },

    hideMeasures: function() {
        var me = this;
        me.imageViewer.setShowMeasureNumbers(false);
    },

    showZone: function(zone) {
        var me = this;
        var x = Number(zone['ulx']);
        var y = Number(zone['uly']);
        var width = zone['lrx'] - zone['ulx'];
        var height = zone['lry'] - zone['uly'];

        me.imageViewer.showRect(x, y, width, height, true);
    },

    // Pushes a measure's region to the image component and jumps to it via the
    // semantic 'measure' attribute (Verovio-style push model). `m` carries
    // {pageId, ulx, uly, lrx, lry} as returned by getMeasurePage.xql.
    gotoMeasureInImage: function(measureKey, m) {
        var me = this;
        if (!me.imageViewer || typeof me.imageViewer.gotoMeasure !== 'function') return;
        me.imageViewer.setMeasuresData([{
            key: String(measureKey),
            pageId: m.pageId,
            ulx: m.ulx, uly: m.uly, lrx: m.lrx, lry: m.lry
        }]);
        me.imageViewer.gotoMeasure(String(measureKey));
    },

    // Pushes a movement's first page to the image component and loads it via
    // the semantic 'mdiv' attribute. `pageId` is the movement's first page id
    // as returned by getMovementsFirstPage.xql.
    gotoMdivInImage: function(mdivKey, pageId) {
        var me = this;
        if (!me.imageViewer || typeof me.imageViewer.gotoMdiv !== 'function') return;
        me.imageViewer.setMdivsData([{ key: String(mdivKey), pageId: pageId }]);
        me.imageViewer.gotoMdiv(String(mdivKey));
    },

    // Pushes the page's annotations to the image component once (push model).
    setAnnotationsData: function(annotations) {
        var me = this;
        me.imageViewer.setAnnotationsData(annotations);
    },

    showAnnotations: function() {
        var me = this;
        me.imageViewer.setShowAnnotations(true);
    },

    onOverlayVisibilityChange: function(view, state) {
        var me = this;
        me.fireEvent('overlayVisiblityChange', me, me.owner.overlaysVisible, me.getActivePage().get('id'), me.owner.uri, me.owner);
    },

    hideAnnotations: function() {
        var me = this;
        me.imageViewer.setShowAnnotations(false);
    },

    updateZoom: function(zoom) {
    	if(typeof this.zoomSlider !== 'undefined'){
        	this.zoomSlider.suspendEvents();
        	this.zoomSlider.setValue(Math.round(zoom * 100));
        	this.zoomSlider.resumeEvents();
        }
    },

    zoomChanged: function(slider) {
        this.imageViewer.setZoomAndCenter(slider.getValue() / 100);
    },

    getContentConfig: function() {
        var me = this;
        return {
            id: this.id,
            rect: me.imageViewer.getActualRect()
        };
    },

    setContentConfig: function(config) {
        var me = this;
        me.imageViewer.showRect(config.rect.x, config.rect.y, config.rect.width, config.rect.height, false);
    }
});
