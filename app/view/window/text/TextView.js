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

    layout: 'fit',
    
    cls: 'textView',

    annotationsVisible: false,
    annotationsLoaded: false,
    annotationsVisibilitySetLocaly: false,

    initComponent: function () {

        this.addEvents('annotationsVisibilityChange',
            'gotoChapter',
            'documentLoaded');

        this.items = [
            {
                html: '<edirom-dom id="' + this.id + '_textCont" class="textViewContent"></edirom-dom>'
            }
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
        var notes = Ext.query('#' + this.id + '_textCont .note');
        Ext.Array.each(notes, function(name, index, notes){
            Ext.get(name).toggleCls('hidden')
        });
    },

    togglePbVisibility: function(button) {
        var notes = Ext.query('#' + this.id + '_textCont .pagebreak');
        Ext.Array.each(notes, function(name, index, notes){
            Ext.get(name).toggleCls('hidden')
        });
    },

    showAnnotations: function(annotations) {
        var me = this;

        if(me.annotationsLoaded) {
            var annos = Ext.query('#' + me.id + '_textCont div.annotation');
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
            var categories = annotation.get('categories');
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
        var annos = Ext.query('#' + me.id + '_textCont div.annotation');
        Ext.Array.each(annos, function(anno) {
            var a = Ext.get(anno);
            a.setVisibilityMode(Ext.Element.DISPLAY);
            a.hide();
        });
    },

        //TODO: in mixin verpacken, wenn möglich
    setAnnotationFilter: function(priorities, categories) {
        var me = this;

        if(priorities.getTotalCount() == 0 && categories.getTotalCount() == 0) return;

        me.annotMenu =  Ext.create('Ext.button.Button', {
            text: getLangString('view.window.text.TextView_annotMenu'),
            indent: false,
            cls: 'menuButton',
            menu : {
                items: []
            }
        });
        me.window.getTopbar().addViewSpecificItem(me.annotMenu, me.id);

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
            text: getLangString('view.window.text.TextView_prioMenu'),
            menu: me.annotPrioritiesMenu
        });

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
            text: getLangString('view.window.text.TextView_categoriesMenu'),
            menu: me.annotCategoriesMenu
        });

        me.annotMenu.show();

        me.window.getTopbar().add({xtype: 'tbfill'});

        me.toggleAnnotationDisplay = Ext.create('Ext.button.Button', {
            html: '<edirom-icon id="icon_display-annotations-window_'+me.id+'" role="button" name="eo_toggle_annotations" title="' + getLangString('view.window.text.TextView_showAnnotations') + '"></edirom-icon>',
            baseCls: 'edirom-icon-button',
            handler: Ext.bind(me.toggleAnnotations, me, [])
        });
        me.window.getTopbar().addViewSpecificItem(me.toggleAnnotationDisplay, me.id);
    },

    annotationFilterChanged: function(item, event) {
        var me = this;

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

        var annotations = Ext.query('#' + this.id + '_textCont div.annotation, #' + this.id + '_textCont span.annotation');
        var fn = Ext.bind(function(annotation) {
            var filterElement = annotation.tagName.toLowerCase() === 'div'
                ? annotation.querySelector('.annotIcon')
                : annotation;
            var classes = filterElement ? Ext.Array.toArray(filterElement.classList) : [];

            var hasCategory = Ext.Array.contains(visibleCategories, 'undefined');
            var hasPriority = Ext.Array.contains(visiblePriorities, 'undefined');

            for(var i = 0; i < classes.length; i++) {
                hasCategory = hasCategory || Ext.Array.contains(visibleCategories, classes[i]);
                hasPriority = hasPriority || Ext.Array.contains(visiblePriorities, classes[i]);
            }

            var annotationElement = Ext.get(annotation);
            var isVisible = hasCategory && hasPriority;
            annotationElement.setVisibilityMode(Ext.Element.DISPLAY);
            annotationElement.setVisible(isVisible);
            if(isVisible)
                annotationElement.dom.style.display = 'inline-block';
        }, me);

        if(annotations.each)
            annotations.each(fn);
        else
            Ext.Array.each(annotations, fn);
    },

    setContent: function(text) {
        var me = this;
		
		Ext.fly(me.id + '_textCont').update(text);
		this.fireEvent('documentLoaded', me);
		
		Ext.Array.each(Ext.query('.scrollto'), function(dom, n, all) {
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

        var container = Ext.fly(me.id + '_textCont');
        var elem = container.getById(me.id + '_' + me.window.internalId);
        if(elem) {
            me.window.requestForActiveView(me);
            me.scrollToId(me.window.internalId);
        }
    },

    scrollToId: function(id) {
        
        var elem = Ext.get(this.id + '_' + id);

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


