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
Ext.define('EdiromOnline.controller.window.text.TextView', {

    extend: 'Ext.app.Controller',

    views: [
        'window.text.TextView'
    ],

    init: function() {
        this.control({
            'textView': {
               afterlayout : this.onAfterLayout,
               beforedestroy: this.onBeforeDestroy,
               single: true
            }
        });
    },

    onAfterLayout: function(view) {

        var me = this;

        if(view.initialized) return;
        view.initialized = true;

        view.on('annotationsVisibilityChange', me.onAnnotationsVisibilityChange, me);
        view.on('gotoChapter', me.onGotoChapter, me);

        ToolsController.addAnnotationsVisibilityListener(view.id, Ext.bind(view.checkGlobalVisibility, view));
        view.checkGlobalVisibility('annotations');

        var uri = view.uri;

        // request goes to v2 API - relative to backendURI
        window.doAJAXRequest('api/document',
            'GET',
            {
                resource: uri,
                idPrefix: view.id + '_',
                mediaType: 'text/html'
            },
            Ext.bind(function(response){
                this.contentLoaded(view, response.responseText);
            }, this)
        );
    },

    contentLoaded: function(view, content) {

        var me = this;

        view.setContent(content);

        window.doAJAXRequest('data/xql/getChapters.xql',
            'GET', 
            {
                uri: view.uri
            },
            Ext.bind(function(response){
                var data = response.responseText;

                var chapters = Ext.create('Ext.data.Store', {
                    fields: ['id', 'name'],
                    data: Ext.JSON.decode(data)
                });

                me.chaptersLoaded(chapters, view);
            }, this)
        );

        window.doAJAXRequest('data/xql/getAnnotationInfos.xql',
            'GET',
            {
                uri: view.uri,
                lang: getPreference('application_language')
            },
            Ext.bind(function(response){
                var me = this;
                var data = response.responseText;

                data = Ext.JSON.decode(data);

                // if taxonomies array is empty but categories and priorities are
                // populated merge those to a taxonomies array
                var taxonomies = data['taxonomies'] || [];
                if (taxonomies.length === 0) {
                    var categories = data['categories'] || [];
                    var priorities = data['priorities'] || [];
                    if (categories.length > 0) {
                        taxonomies.push({
                            id: 'ediromCategory',
                            label: 'ediromCategory',
                            items: categories
                        });
                    }
                    if (priorities.length > 0) {
                        taxonomies.push({
                            id: 'ediromPriority',
                            label: 'ediromPriority',
                            items: priorities
                        });
                    }
                }

                me.annotInfosLoaded(taxonomies, view);
            }, this)
        );
    },

    chaptersLoaded: function(chapters, view) {
        view.setChapters(chapters);
    },

    onAnnotationsVisibilityChange: function(view, visible) {
        var me = this;

        if(visible)
            window.doAJAXRequest('data/xql/getAnnotationsInText.xql',
                'GET', 
                {
                    uri: view.uri
                },
                Ext.bind(function(response){
                    var data = response.responseText;

                    var annotations = Ext.create('Ext.data.Store', {
                        fields: ['id', 'title', 'text', 'uri', 'plist', 'svgList', 'priority', 'categories', 'fn'],
                        data: Ext.JSON.decode(data)
                    });

                    me.annotationsLoaded(annotations, view);
                }, this)
            );
        else
            view.hideAnnotations();
    },

    annotationsLoaded: function(annotations, view) {
        view.showAnnotations(annotations);
    },

    annotInfosLoaded: function(taxonomies, view) {
        view.setAnnotationFilter(taxonomies);
    },

    onGotoChapter: function(view, chapter) {
        view.scrollToId(chapter);
    },
    
    onBeforeDestroy: function(view) {
        var me = this;
        
        ToolsController.removeAnnotationsVisibilityListener(view.id);
    }
});
