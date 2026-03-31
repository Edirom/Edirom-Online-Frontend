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
Ext.define('EdiromOnline.view.window.source.SourceView', {
    extend: 'EdiromOnline.view.window.View',

    requires: [
        'EdiromOnline.view.window.source.PageBasedView',
        'EdiromOnline.view.window.source.MeasureBasedView',
        'Ext.draw.Component',
        'Ext.slider.Single',
        'Ext.form.ComboBox',
        'Ext.window.MessageBox'
    ],

    alias : 'widget.sourceView',

    layout: 'border',

    border: 0,

    activeView: 'pageBasedView',

    measuresVisible: false,
    measuresVisibilitySetLocaly: false,
    annotationsVisible: false,
    annotationsVisibilitySetLocaly: false,
    overlaysVisible: {},

    cls: 'sourceView',

    initComponent: function () {

        var me = this;

        me.addEvents('measuresVisibilityChange',
            'annotationsVisibilityChange',
            'overlayVisiblityChange',
            'gotoMovement',
            'gotoMeasure',
            'gotoMeasureByName',
            'gotoZone',
            'afterImagesLoaded');

        me.pageBasedView = Ext.create('EdiromOnline.view.window.source.PageBasedView', {
            owner: me
        });

        me.measureBasedView = Ext.create('EdiromOnline.view.window.source.MeasureBasedView', {
            owner: me
        });

        me.viewerContainer = Ext.create('Ext.panel.Panel', {
            region: 'center',
            border: 0,
            layout: 'card',
            items: [
                me.pageBasedView,
                me.measureBasedView
            ]
        });

        // define bottom bar
        me.bottomBar = new EdiromOnline.view.window.BottomBar(
            { owner:me, region:'south', enableOverflow: false }
        );

        me.items = [
            me.viewerContainer,
            me.bottomBar
        ];

        me.callParent();

        me.on('afterrender', me.createMenuEntries, me, {single: true});
        me.on('afterrender', me.createToolbarEntries, me, {single: true});

        me.window.on('loadInternalLink', me.loadInternalId, me);
    },

    getWeightForInternalLink: function(uri, type, id) {
        var me = this;

        if(me.uri != uri)
            return 0;

        if(type == 'measure' || type == 'zone' || type == 'surface' || type == 'graphic')
            return 70;

        return 0;
    },

    loadInternalId: function(id, type) {
        var me = this;

        if(type == 'measure') {
            me.window.requestForActiveView(me);
            me.gotoMeasure(id);

        }else if(type == 'zone') {
            me.window.requestForActiveView(me);
            me.gotoZone(id);

        }else if(type == 'surface' || type == 'graphic' ) {
            me.window.requestForActiveView(me);
            me.showPage(id);
        }
    },

    checkGlobalVisibility: function(type) {

        var me = this;

        // global visibility state
        var globalVisible = sessionStorage.getItem('edirom-'+type+'-visible-global') === 'true';

        // set visibility properties
        me[type+'VisibilitySetLocaly'] = globalVisible;
        me[type+'Visible'] = globalVisible;

        // if global is visible and local is also set to visible, do nothing
        if( globalVisible && sessionStorage.getItem('edirom-'+type+'-visible-' + me.id) === 'true')
            return;

        // update icon state
        if(globalVisible){
            document.getElementById('icon_display-'+type+'-window_'+me.id).setAttribute('pressed', '');
            sessionStorage.setItem('edirom-'+type+'-visible-' + me.id, 'true');

        } else {
            document.getElementById('icon_display-'+type+'-window_'+me.id).removeAttribute('pressed');
            sessionStorage.removeItem('edirom-'+type+'-visible-' + me.id);
        }

        // fire event
        me.fireEvent(type+'VisibilityChange', me, globalVisible);

    },

    //TODO: in mixin verpacken, wenn möglich
    setAnnotationFilter: function(priorities, categories) {
        var me = this;

        if(typeof(debug) !== 'undefined' && debug !== null && debug) {
            console.log('View: SourceView: setAnnotationFilter');
            console.log('priorities');
            console.log(priorities);
            console.log('categories');
            console.log(categories);

        }

        if(priorities.data.length > 0) {
            var prioritiesItems = [];
            priorities.each(function(priority) {
                prioritiesItems.push({
                    text: priority.get('name'),
                    priorityId: priority.get('id'),
                    checked: true,
                    handler: Ext.bind(me.annotationFilterChanged, me)
                });
            });

            me.annotPrioritiesMenu = Ext.create('Ext.menu.Menu', {
                items: prioritiesItems
            });

            me.annotMenu.menu.add({
                id: me.id + '_annotCategoryFilter',
                text: getLangString('view.window.source.SourceView_prioMenu'),
                menu: me.annotPrioritiesMenu
            });
        }

        if(categories.data.length > 0){
            var categoriesItems = [];
            categories.each(function(category) {
                categoriesItems.push({
                    text: category.get('name'),
                    categoryId: category.get('id'),
                    checked: true,
                    handler: Ext.bind(me.annotationFilterChanged, me)
                });
            });

            me.annotCategoriesMenu = Ext.create('Ext.menu.Menu', {
                items: categoriesItems
            });

            me.annotMenu.menu.add({
                id: me.id + '_annotPriorityFilter',
                text: getLangString('view.window.source.SourceView_categoriesMenu'),
                menu: me.annotCategoriesMenu
            });
        }
    },

    annotationFilterChanged: function(item, event) {
        var me = this;

        // if me.annotationsVisible is false do nothing
        if(!me.annotationsVisible) return;

        // set visible Priorities
        var visiblePriorities = [];

        // iterate over corresponding menu to get priorities
        if(me.annotPrioritiesMenu != null && me.annotPrioritiesMenu.items.length != 0) {
            me.annotPrioritiesMenu.items.each(function(item) {
                if(item.checked)
                    visiblePriorities.push(item.priorityId);
            });
        } else {
            visiblePriorities.push('undefined');
        }

        // set visible categories
        var visibleCategories = [];

        // iterate over corresponding menu to get categories
        if(me.annotCategoriesMenu != null && me.annotCategoriesMenu.items.length != 0) {
            me.annotCategoriesMenu.items.each(function(item) {
                if(item.checked)
                    visibleCategories.push(item.categoryId);
            });
        } else {
            visibleCategories.push('undefined');
        }

        me.pageBasedView.annotationFilterChanged(visibleCategories, visiblePriorities);
        me.measureBasedView.annotationFilterChanged(visibleCategories, visiblePriorities);
    },

    setMovements: function(movements) {
        var me = this;

        // get preference for movement / part - order
        var gotomenu_display = getPreference('gotomenu_display');

        // set me.movements to submitted JSON array
        me.movements = movements;

        // set meovements for measureBaseView
        me.measureBasedView.setMovements(movements);

        // initialize movementItems, partList, partNames variables
        var movementItems = [];
        var partList = [];
        var partNames =[];

        // iterate over submitted movements and push them to movementItems variable
        movements.data.each(function(movement) {
            // check if parts exist and if they have ids
            if(movement.data.parts.length === 0 || movement.data.parts[0].id === null || movement.data.parts[0].id === "") {
                movementItems.push({
                    text: movement.get('name'),
                    handler: Ext.bind(me.gotoMovement, me, movement.get('id'), true)
                });
            } else {
                if(gotomenu_display == 'partwise') {
                    movement.data.parts.forEach(function(part) {
                        var exists = partNames.indexOf(part.name);
                        var obj = {
                            text: part.name,
                            menu: []
                        };
                        if (exists === -1) {
                            partNames.push(part.name);
                            partList.push(obj);
                            exists = partNames.length - 1;
                        }
                        var menu_mov = {
                            text: movement.get('name'),
                            handler: Ext.bind(me.gotoMovement, me, part.id, true)
                        }

                        partList[exists].menu.push(menu_mov);
                    });
                } else {
                    var parts = [];
                    movement.data.parts.forEach(function(part){
                        parts.push(part);
                    });

                    var partItems = [];
                    parts.forEach(function(part){
                        partItems.push({
                            text: part.name,
                            handler: Ext.bind(me.gotoMovement, me, part.id, true)
                        });
                    });

                    movementItems.push({
                        text: movement.get('name'),
                        menu: partItems
                    });
                }
            }
        });

        if(gotomenu_display == 'partwise') {
            partList.forEach(function(item) {
                movementItems.push(item);
            });
        }

        // check if contains more than one item and save to variable as boolean
        var isDisabled = ((movementItems.length < 1) ? true : false);

        // add gotoMovement entry to goto menu
        me.gotoMenu.menu.add({
            id: me.id + '_gotoMovement',
            text: getLangString('view.window.source.SourceView_gotoMovement'),
            cls: 'gotoMovement',
            disabled: isDisabled,
            disabledCls: 'x-disabled',
            menu: {
                items: movementItems
            }
        });
    },

    gotoMovement: function(menuItem, event, movementId) {
        this.fireEvent('gotoMovement', this, movementId);
    },

    setOverlays: function(overlays) {
        var me = this;

        if(overlays.getCount() == 0) return;

        me.overlays = overlays;

        var overlayItems = [];
        overlays.each(function(overlay) {
            overlayItems.push({
                text: overlay.get('name'),
                overlayId: overlay.get('id'),
                checked: false,
                handler: Ext.bind(me.overlayVisibilityChanged, me)
            });
        });

        me.layersMenu.menu.add(overlayItems);
        me.layersMenu.enable();
    },

    overlayVisibilityChanged: function(item, event) {
        var me = this;

        me.overlaysVisible[item.overlayId] = item.checked;
        me.fireEvent('overlayVisiblityChange', me, item.overlayId, item.checked);
    },

    getImageSet: function() {
        var me = this;
        return me.pageBasedView.imageSet;
    },

    /* TODO: check if this function is still in use */
    setPage: function(combo, store) {

        var me = this;

        me.pageBasedView.setPage(combo, store);

        // check and activate measures visibility according to global setting
        if(sessionStorage.getItem('edirom-measures-visible-global') === 'true')
            this.fireEvent('measuresVisibilityChange', me, true);

        // check and activate annotations visibility according to global setting
        if(sessionStorage.getItem('edirom-annotations-visible-global') === 'true')
            this.fireEvent('annotationsVisibilityChange', me, true);
    },

    showPage: function(pageId) {
        var me = this;
        me.pageBasedView.showPage(pageId);
    },

    getActivePage: function() {
        return this.pageBasedView.getActivePage();
    },

    createMenuEntries: function() {

        var me = this;

        // layers menu (disabled until overlays are available — see setOverlays)
        me.layersMenu = Ext.create('Ext.button.Button', {
            text: getLangString('view.window.source.SourceView_layersMenu'),
            indent: false,
            cls: 'menuButton',
            disabled: true,
            menu: {
                items: []
            }
        });
        me.window.getTopbar().addViewSpecificItem(me.layersMenu, me.id);

        // annotations menu (used for priority and category filter)
        me.annotMenu =  Ext.create('Ext.button.Button', {
            text: getLangString('view.window.source.SourceView_annotationsMenu'),
            indent: false,
            cls: 'menuButton',
            menu : {
                items: [  ]
            }
        });
        me.window.getTopbar().addViewSpecificItem(me.annotMenu, me.id);

        me.gotoMenu =  Ext.create('Ext.button.Button', {
            text: getLangString('view.window.source.SourceView_gotoMenu'),
            indent: false,
            cls: 'menuButton',
            menu : {
                items: [
                    {
                        id: me.id + '_gotoMeasure',
                        text: getLangString('view.window.source.SourceView_gotoMeasure'),
                        handler: Ext.bind(me.gotoMeasureDialog, me)
                    }
                ]
            }
        });
        me.window.getTopbar().addViewSpecificItem(me.gotoMenu, me.id);
    },

    createToolbarEntries: function() {

        var me = this;

        // button for switching to page based view
        me.pageBasedViewButton = Ext.create('Ext.button.Button', {
            html: '<edirom-icon id="icon_pageBasedView_'+me.id+'" role="button" name="eo_page_view" pressed="" title="' + getLangString('view.window.source.SourceView_PageBasedView') + '"></edirom-icon>',
            baseCls: 'edirom-icon-button',
            handler: Ext.bind(me.switchInternalView, me, ['pageBasedView'], false)
        });

        // button for switching to measure based view
        me.measureBasedViewButton = Ext.create('Ext.button.Button', {
            html: '<edirom-icon id="icon_measureBasedView_'+me.id+'" role="button" name="eo_measure_view" rotate="90" title="' + getLangString('view.window.source.SourceView_MeasureBasedView') + '"></edirom-icon>',
            baseCls: 'edirom-icon-button',
            handler: Ext.bind(me.switchInternalView, me, ['measureBasedView'], false)
        });

        // button for resetting zoom and position
        me.fitFacsimileButton = Ext.create('Ext.button.Button', {
            html: '<edirom-icon id="icon_fitFacsimile_'+me.id+'" role="button" name="eo_reset_view" title="' + getLangString('view.window.source.SourceView_fitView') + '"></edirom-icon>',
            baseCls: 'edirom-icon-button',
            handler: Ext.bind(me.fitFacsimile, me, [], 0)
        });

        // button for toggling measure visibility
        me.toggleMeasureDisplay = Ext.create('Ext.button.Button', {
            html: '<edirom-icon id="icon_display-measures-window_'+me.id+'" role="button" name="eo_toggle_measures" title="' + getLangString('view.window.source.SourceView_showMeasures') + '"></edirom-icon>',
            baseCls: 'edirom-icon-button',
            handler: Ext.bind(me.toggleMeasures, me, [])
        });

        // button for toggling annotation visibility
        me.toggleAnnotationDisplay = Ext.create('Ext.button.Button', {
            html: '<edirom-icon id="icon_display-annotations-window_'+me.id+'" role="button" name="eo_toggle_annotations" title="' + getLangString('view.window.source.SourceView_showAnnotations') + '"></edirom-icon>',
            baseCls: 'edirom-icon-button',
            handler: Ext.bind(me.toggleAnnotations, me, [])
        });

        // separator icon
        me.separator = Ext.create('Ext.Component', {
            html: '<edirom-icon name="horizontal_rule" rotate="90"></edirom-icon>'
        });

        // add buttons to bottom bar
        me.bottomBar.add(me.pageBasedViewButton);
        me.bottomBar.add(me.measureBasedViewButton);
        me.bottomBar.add(me.separator);

        // add toolbar entries for page based view
        var entries = me.pageBasedView.createToolbarEntries();

		var image_server = getPreference('image_server');

        Ext.Array.each(entries, function(entry) {
			if(image_server === 'digilib' || image_server === 'openseadragon'){
				me.bottomBar.add(entry);
			}
			else if(entry.initialCls !== 'zoomSlider' && entry.xtype !== 'tbseparator'){
				me.bottomBar.add(entry);
			}
        });

        // add toolbar entries for measure based view
        entries = me.measureBasedView.createToolbarEntries();
        Ext.Array.each(entries, function(entry) {
				me.bottomBar.add(entry);
        });

        // add other buttons
        me.bottomBar.add({xtype: 'tbfill'});
        me.bottomBar.add(me.toggleMeasureDisplay);
        me.bottomBar.add(me.toggleAnnotationDisplay);
        me.bottomBar.add(me.fitFacsimileButton);
    },

    switchInternalView: function(viewId) {
        var me = this;

        if(viewId == 'pageBasedView') {
            // set pressed state of toggle button
            document.getElementById('icon_pageBasedView_'+me.id).setAttribute('pressed', '');
            document.getElementById('icon_measureBasedView_'+me.id).removeAttribute('pressed');

            // adapt toolbar entries and switch view
            me.measureBasedView.hideToolbarEntries();
            me.pageBasedView.showToolbarEntries();
            me.viewerContainer.getLayout().setActiveItem(me.pageBasedView);
            //me.gotoMenu.menu.child('#' + me.id + '_gotoMovement').show();
            me.gotoMenu.show();

        }else if(viewId == 'measureBasedView') {
            // set pressed state of toggle button
            document.getElementById('icon_measureBasedView_'+me.id).setAttribute('pressed', '');
            document.getElementById('icon_pageBasedView_'+me.id).removeAttribute('pressed');

            // adapt toolbar entries and switch view
            me.pageBasedView.hideToolbarEntries();
            me.measureBasedView.showToolbarEntries();
            me.viewerContainer.getLayout().setActiveItem(me.measureBasedView);
            //me.gotoMenu.menu.child('#' + me.id + '_gotoMovement').hide();
            me.gotoMenu.hide();
        }

        me.activeView = viewId;
    },

    fitFacsimile: function() {

        var me = this;

        if(me.activeView == 'pageBasedView')
            me.pageBasedView.fitFacsimile();
        else if(me.activeView == 'measureBasedView')
            me.measureBasedView.fitFacsimile();
    },

    toggleMeasures: function(item) {

        var me = this;

        // toggle attribute in DOM and save state in session storage
        var iconElem = document.getElementById('icon_display-measures-window_'+me.id);
        var currentState = iconElem.hasAttribute('pressed');

        // if current button is pressed -> switch to hiding measures
        if(currentState) {
            iconElem.removeAttribute('pressed');
            sessionStorage.removeItem('edirom-measures-visible-'+me.id);
        }
        // if current button is not pressed -> switch to pressed and display measures
        else {
            iconElem.setAttribute('pressed', '');
            sessionStorage.setItem('edirom-measures-visible-'+me.id, 'true');
        }

        // update local variables
        me.measuresVisible = sessionStorage.getItem('edirom-measures-visible-'+me.id) === 'true';
        me.measuresVisibilitySetLocaly = iconElem.hasAttribute('pressed');

        // just hide measures first to avoid double display
        me.hideMeasures();

        // fire event
        this.fireEvent('measuresVisibilityChange', me, me.measuresVisible);

    },

    showMeasures: function(measures) {
        var me = this;
        me.pageBasedView.showMeasures(measures);
    },

    hideMeasures: function() {
        var me = this;
        me.pageBasedView.hideMeasures();
    },

    gotoMeasureDialog: function() {
        var me = this;

        Ext.create('EdiromOnline.view.window.source.GotoMsg', {
            movements: me.movements,
            callback: Ext.bind(function(measure, movementId) {
                this.fireEvent('gotoMeasureByName', this, measure, movementId);
            },
            me)
        }).show();
    },

    gotoMeasure: function(measureId) {
        this.fireEvent('gotoMeasure', this, measureId);
    },

    showMeasure: function(movementId, measureId, measureCount) {
        var me = this;

        if(me.activeView !== 'measureBasedView')
        	me.switchInternalView('measureBasedView');

        me.measureBasedView.showMeasure(movementId, measureId, measureCount);

    },

    gotoZone: function(zoneId) {
        this.fireEvent('gotoZone', this, zoneId);
    },

    showZone: function(zone) {
        var me = this;
        me.pageBasedView.showZone(zone);
    },

    toggleAnnotations: function() {


        var me = this;

        // toggle attribute in DOM and save state in session storage
        var iconElem = document.getElementById('icon_display-annotations-window_'+me.id);
        var currentState = iconElem.hasAttribute('pressed');

        // if current button is pressed -> switch to hiding measures
        if(currentState) {
            iconElem.removeAttribute('pressed');
            sessionStorage.removeItem('edirom-annotations-visible-'+me.id);
        }
        // if current button is not pressed -> switch to pressed and display measures
        else {
            iconElem.setAttribute('pressed', '');
            sessionStorage.setItem('edirom-annotations-visible-'+me.id, 'true');
        }

        // update local variables
        me.annotationsVisible = sessionStorage.getItem('edirom-annotations-visible-'+me.id) === 'true';
        me.annotationsVisibilitySetLocaly = iconElem.hasAttribute('pressed');

        // just hide measures first to avoid double display
        me.hideAnnotations();

        // fire event
        this.fireEvent('annotationsVisibilityChange', me, me.annotationsVisible);

    },

    showAnnotations: function(annotations) {
        var me = this;
        me.pageBasedView.showAnnotations(annotations);
        me.annotationFilterChanged();
    },

    hideAnnotations: function() {
        var me = this;
        me.pageBasedView.hideAnnotations();
    },

    getContentConfig: function() {
        var me = this;
        return {
            id: this.id,
            pageBasedView: me.pageBasedView.getContentConfig(),
            measureBasedView: me.measureBasedView.getContentConfig()
        };
    },

    setContentConfig: function(config) {
        var me = this;
        me.pageBasedView.setContentConfig(config.pageBasedView);
        me.measureBasedView.setContentConfig(config.measureBasedView);
    }
});

Ext.define('EdiromOnline.view.window.source.GotoMsg', {

    extend: 'Ext.window.Window',

    requires: [
        'Ext.form.field.Text',
        'Ext.form.ComboBox'
    ],

	cls: 'gotoDialogue',
	bodyBorder: false,

    height: 140,
    width: 320,

    modal: true,
    resizable: false,

    layout: {
        type: 'vbox',
        align: 'stretch',
        padding: 5
    },

    padding: 0,

    initComponent: function() {
        var me = this;

        Ext.apply(me, me.config);

        me.title = getLangString('view.window.source.SourceView_GotoMsg_Title');

        // check if contains more than one item and save to variable as boolean
        var isDisabled = ((me.movements.data.length <= 1) ? true : false);

        me.combo = Ext.create('Ext.form.ComboBox', {
            fieldLabel: getLangString('view.window.source.SourceView_GotoMsg_MovmentNumber'),
            store: me.movements,
            queryMode: 'local',
            displayField: 'name',
            valueField: 'id',
            cls: 'gotoMovement',
            disabled: isDisabled,
            disabledCls: 'x-disabled'
        });

        me.field = Ext.create('Ext.form.field.Text', {
            name: 'measure',
            fieldLabel: getLangString('view.window.source.SourceView_GotoMsg_Measure'),
            allowBlank: false
        });

        me.items = [
            me.combo, me.field,
            {
                xtype: 'panel',
                layout: 'hbox',
                items: [
                    { xtype: 'component', flex: 1 },
                    {
                        text: getLangString('global_cancel'),
                        handler: me.close,
                        scope: me
                    },
                    {
                        text: getLangString('global_execute'),
                        handler: me.gotoFn,
                        scope: me
                    }
                ]
            }
        ];

        me.callParent();

        me.combo.setValue(me.movements.getAt(0).get('id'));
        me.on('afterrender', me.initKeys, me, {single: true});
    },

    initKeys: function() {
        var me = this;
        var map = me.getKeyMap();

        map.addBinding({
            key: Ext.EventObject.ENTER,
            fn: me.gotoFn,
            scope: me
        });

        map.addBinding({
            key: Ext.EventObject.ESC,
            fn: me.close,
            scope: me
        });

        map.enable();
    },

    gotoFn: function(button, event) {
        var me = this;

        //TODO: Validierung
        me.callback(Ext.String.trim(me.field.getValue()), me.combo.getValue());
        me.close();
    }
});

