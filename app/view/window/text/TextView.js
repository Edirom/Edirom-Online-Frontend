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
Ext.define('EdiromOnline.view.window.text.TextView', {
    extend: 'EdiromOnline.view.window.View',

    requires: [
    ],

    alias : 'widget.textView',

    layout: 'border',

    border: 0,
    
    cls: 'textView',

    annotationsVisible: false,
    annotationsLoaded: false,
    annotationsVisibilitySetLocaly: false,

    // Resolves this view's own text container element WITHOUT going through
    // document.getElementById/Ext.get(string) - this view can be reparented
    // into a WinBox's shadow root (see Desktop.wrapEdiromWindowInWinBox),
    // where a document-scoped id lookup can't see it.
    getTextContEl: function() {
        return this.el.dom.querySelector('#' + this.id + '_textCont');
    },

    initComponent: function () {

        this.addEvents('annotationsVisibilityChange',
            'gotoChapter',
            'documentLoaded');

        this.viewerContainer = Ext.create('Ext.panel.Panel', {
            region: 'center',
            border: 0,
            layout: 'card',
            items: [
                {
                    html: '<edirom-dom id="' + this.id + '_textCont" class="textViewContent"></edirom-dom>'
                }
            ]
        });

        // define bottom bar
        this.bottomBar = new EdiromOnline.view.window.BottomBar(
            { owner:this, region:'south', enableOverflow: false }
        );

        this.items = [
            this.viewerContainer,
            this.bottomBar
        ];

        this.callParent();

        this.on('afterrender', this.createToolbarEntries, this, {single: true});
        this.window.on('loadInternalLink', this.loadInternalId, this);
    },

    createToolbarEntries: function() {

        var me = this;

        //TODO: überprüfen
/*        me.notesVisibility = Ext.create('Ext.button.Button', {
            text: 'Notes',
            handler: Ext.bind(me.toggleNotesVisibility, me),
            enableToggle: true,
            pressed: true
        });
        me.pbsVisibility = Ext.create('Ext.button.Button', {
            text: 'Pagebreaks',
            handler: Ext.bind(me.togglePbVisibility, me),
            enableToggle: true,
            pressed: true
        });

        me.window.getTopbar().addViewSpecificItem(me.notesVisibility, me.id);
        me.window.getTopbar().addViewSpecificItem(me.pbsVisibility, me.id);
*/
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
            var visibleIcon = document.getElementById('icon_display-annotations-window_'+me.id);
            if (visibleIcon) visibleIcon.setAttribute('pressed', '');
            sessionStorage.setItem('edirom-'+type+'-visible-' + me.id, 'true');

        } else {
            var hiddenIcon = document.getElementById('icon_display-annotations-window_'+me.id);
            if (hiddenIcon) hiddenIcon.removeAttribute('pressed');
            sessionStorage.removeItem('edirom-'+type+'-visible-' + me.id);
        }

        // fire event
        me.fireEvent(type+'VisibilityChange', me, globalVisible);

    },

    toggleAnnotations: function() {

        var me = this;

        var iconElem = document.getElementById('icon_display-annotations-window_'+me.id);
        var currentState = iconElem.hasAttribute('pressed');

        if(currentState) {
            iconElem.removeAttribute('pressed');
            sessionStorage.removeItem('edirom-annotations-visible-'+me.id);
        }
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

    toggleNotesVisibility: function(button) {
        var notes = Ext.query('.note', this.getTextContEl());
        Ext.Array.each(notes, function(name, index, notes){
            Ext.get(name).toggleCls('hidden')
        });
    },

    togglePbVisibility: function(button) {
        var notes = Ext.query('.pagebreak', this.getTextContEl());
        Ext.Array.each(notes, function(name, index, notes){
            Ext.get(name).toggleCls('hidden')
        });
    },

    showAnnotations: function(annotations) {
        var me = this;

        if(me.annotationsLoaded) {
            var annos = Ext.query('div.annotation', me.getTextContEl());
            Ext.Array.each(annos, function(anno) {
                Ext.get(anno).show();
                anno.style.display = 'inline-block';
            });

            me.annotationFilterChanged();

            return;
        }   

        me.annotationsLoaded = true;

        var tpl = Ext.DomHelper.createTemplate('<div class="annotation" style="display: inline-block;"><div id="{0}" class="annotIcon {1} {2} {3}" data-edirom-annot-id="{3}" style="margin: auto;"></div></div>');
        tpl.compile();

        annotations.each(function(annotation) {

            var annoId = annotation.get('id');
            var name = annotation.get('title');
            var uri = annotation.get('uri');
            var categories = annotation.get('taxonomyClasses') || annotation.get('categories');
            var priority = annotation.get('priority');
            var fn = annotation.get('fn');
            var plist = Ext.Array.toArray(annotation.get('plist'));

            Ext.Array.each(plist, function(p) {
                var targetId = p.id.substring(annoId.length + 2);
                var target = me.el.getById(me.id + '_' + targetId);

                var shape = tpl.append(target, [me.id + '_' + p.id, categories, priority, annotation.get('id')], true);

                shape.on('mouseenter', me.highlightShape, me, shape, true);
                shape.on('mouseleave', me.deHighlightShape, me, shape, true);
                shape.on('mousedown', me.listenForShapeLink, me, {
                    stopEvent : true,
                    elem: shape,
                    fn: fn
                });

                var tip = Ext.create('Ext.tip.ToolTip', {
                    target: me.id + '_' + p.id,
                    cls: 'annotationTip',
                    width: 500,
                    maxWidth: 500,
                    height: 300,
                    dismissDelay: 0,
                    anchor: 'left',
                    html: getLangString('Annotation_plus_Title', name)
                });

                tip.on('afterrender', function() {
                    window.doAJAXRequest('data/xql/getAnnotation.xql',
                        'GET',
                        {
                            uri: uri,
                            target: 'tip'
                        },
                        Ext.bind(function(response){
                            this.update(response.responseText);
                        }, this)
                    );
                }, tip);

            }, me);

        }, me);

        me.annotationFilterChanged();
    },

    highlightShape: function(event, owner, shape) {
        shape.addCls('highlighted');

        var annotId = shape.getAttribute('data-edirom-annot-id');
        Ext.select('div[data-edirom-annot-id=' + annotId + ']', this.el).addCls('combinedHighlight');
        Ext.select('span[data-edirom-annot-id=' + annotId + ']', this.el).addCls('combinedHighlight');
    },

    deHighlightShape: function(event, owner, shape) {
        shape.removeCls('highlighted');

        var annotId = shape.getAttribute('data-edirom-annot-id');
        Ext.select('div[data-edirom-annot-id=' + annotId + ']', this.el).removeCls('combinedHighlight');
        Ext.select('span[data-edirom-annot-id=' + annotId + ']', this.el).removeCls('combinedHighlight');
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
    },

    hideAnnotations: function() {
        var me = this;
        var annos = Ext.query('div.annotation', me.getTextContEl());
        Ext.Array.each(annos, function(anno) {
            var a = Ext.get(anno);
            a.setVisibilityMode(Ext.Element.DISPLAY);
            a.hide();
        });
    },

    //TODO: in mixin verpacken, wenn möglich
    setAnnotationFilter: function(taxonomies) {
        var me = this;

        // abort if taxonomies array is empty
        if (!taxonomies || taxonomies.length === 0) return;

        me.annotMenu =  Ext.create('Ext.button.Button', {
            text: getLangString('view.window.text.TextView_annotMenu'),
            indent: false,
            cls: 'menuButton',
            menu : {
                items: []
            }
        });
        me.window.getTopbar().addViewSpecificItem(me.annotMenu, me.id);

        me.annotTaxonomyMenus = {};

        // iterate over taonomies
        Ext.Array.each(taxonomies, function(taxonomy) {

            // abort if taxonomy is empty
            if (!taxonomy.items || taxonomy.items.length === 0) return;

            // process taxonomy items
            var items = Ext.Array.map(taxonomy.items, function(item) {
                return {
                    text: item.name,
                    classId: item.id,
                    taxonomyId: taxonomy.id,
                    checked: true,
                    handler: Ext.bind(me.annotationFilterChanged, me)
                };
            });

            // create menu for taxonomy items
            var menu = Ext.create('Ext.menu.Menu', { items: items });

            // push taxonomy menu to taxonomy menus array
            me.annotTaxonomyMenus[taxonomy.id] = menu;

            // add entry for taxonomy to annotMenu
            me.annotMenu.menu.add({
                // set button text to taxonomy.label if it doesn’t match taxonomy.id, else get from locale files
                text: taxonomy.label !== taxonomy.id ? taxonomy.label : getLangString(taxonomy.id),
                menu: menu
            });
        });

        me.annotMenu.show();

        me.bottomBar.add({xtype: 'tbfill'});

        me.toggleAnnotationDisplay = Ext.create('Ext.button.Button', {
            html: '<edirom-icon id="icon_display-annotations-window_'+me.id+'" role="button" name="eo_toggle_annotations" title="' + getLangString('view.window.text.TextView_showAnnotations') + '"></edirom-icon>',
            baseCls: 'edirom-icon-button',
            handler: Ext.bind(me.toggleAnnotations, me, [])
        });
        me.bottomBar.add(me.toggleAnnotationDisplay);
    },

    annotationFilterChanged: function(item, event) {
        var me = this;

        if (!me.annotationsVisible) return;

        var visibleTaxonomies = {};
        var allTaxonomyIds = {};
        Ext.Object.each(me.annotTaxonomyMenus || {}, function(taxonomyId, menu) {
            var visibleIds = [];
            var allIds = [];
            menu.items.each(function(menuItem) {
                allIds.push(menuItem.classId);
                if (menuItem.checked) visibleIds.push(menuItem.classId);
            });
            visibleTaxonomies[taxonomyId] = visibleIds;
            allTaxonomyIds[taxonomyId] = allIds;
        });

        var annotations = Ext.query('div.annotation, span.annotation', this.getTextContEl());
        var fn = Ext.bind(function(annotation) {
            var filterElement = annotation.tagName.toLowerCase() === 'div'
                ? annotation.querySelector('.annotIcon')
                : annotation;
            var classes = filterElement ? Ext.Array.toArray(filterElement.classList) : [];

            var visible = true;
            Ext.Object.each(visibleTaxonomies, function(taxonomyId, visibleIds) {
                var allIds = allTaxonomyIds[taxonomyId] || [];

                // Ignore taxonomies that do not apply to this annotation.
                var hasAnyFromTaxonomy = false;
                for (var i = 0; i < classes.length; i++) {
                    if (Ext.Array.contains(allIds, classes[i])) {
                        hasAnyFromTaxonomy = true;
                        break;
                    }
                }
                if (!hasAnyFromTaxonomy) return;

                var matches = false;
                for (var j = 0; j < classes.length; j++) {
                    if (Ext.Array.contains(visibleIds, classes[j])) {
                        matches = true;
                        break;
                    }
                }
                if (!matches) visible = false;
            });

            var annotationElement = Ext.get(annotation);
            annotationElement.setVisibilityMode(Ext.Element.DISPLAY);
            annotationElement.setVisible(visible);
            if(visible)
                annotationElement.dom.style.display = 'inline-block';
        }, me);

        if (annotations.each)
            annotations.each(fn);
        else
            Ext.Array.each(annotations, fn);
    },

    setContent: function(text) {
        var me = this;
		
		Ext.fly(me.getTextContEl()).update(text);
		this.fireEvent('documentLoaded', me);
		
		Ext.Array.each(Ext.query('.scrollto', me.getTextContEl()), function(dom, n, all) {
            var elem = Ext.get(dom);
            var scrollTo = elem.getAttribute('data-footnote');
            elem.on('click', Ext.bind(me.scrollToId, me, [scrollTo]));
        }, me);
    },

    setChapters: function(chapters) {
        var me = this;

        if(chapters.getTotalCount() == 0) return;

        me.gotoMenu =  Ext.create('Ext.button.Button', {
            text: getLangString('view.window.text.TextView_gotoMenu'),
            indent: false,
            cls: 'menuButton',
            menu : {
                items: [
                ]
            }
        });
        me.window.getTopbar().addViewSpecificItem(me.gotoMenu, me.id);

        me.chapters = chapters;

        var chapterItems = [];
        chapters.each(function(chapter) {
            chapterItems.push({
                text: chapter.get('name'),
                handler: Ext.bind(me.gotoChapter, me, chapter.get('id'), true)
            });
        });

        me.gotoMenu.menu.add(chapterItems/*{
            id: me.id + '_gotoChapter',
            text: getLangString('view.window.text.TextView_gotoChapter'),
            menu: {
                items: chapterItems
            }
        }*/);

        me.gotoMenu.show();
    },

    gotoChapter: function(menuItem, event, chapterId) {
        this.fireEvent('gotoChapter', this, chapterId);
    },

    getWeightForInternalLink: function (uri, type, id) {
		var me = this;

		if (me.uri != uri)
		return 0;

		if (type == 'unknown' || type == 'graphic' || type == 'surface' || type == 'zone')
		return 0;

		return 70;
	},

	loadInternalId: function (internalId, internalIdType) {
		var me = this;

        var elem = me.getTextContEl().querySelector('#' + me.id + '_' + me.window.internalId);
        if(elem) {
            me.window.requestForActiveView(me);
            me.scrollToId(me.window.internalId);
        }
    },

    scrollToId: function(id) {
        
        var elem = Ext.get(this.getTextContEl().querySelector('#' + this.id + '_' + id));

        var showHide = !elem.isVisible();

        if(showHide) elem.show();

        Ext.getDom(elem).scrollIntoView(true);

        if(showHide) elem.hide();
	},

	getContentConfig: function() {
        var me = this;
        return {
            id: this.id
        };
    }
});


