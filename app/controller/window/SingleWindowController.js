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
Ext.define('EdiromOnline.controller.window.SingleWindowController', {

    extend: 'Ext.app.Controller',

    requires: [
        'EdiromOnline.view.window.HeaderView',
        //TODO:'de.edirom.online.view.window.SearchView',
        'EdiromOnline.view.window.SummaryView',
        'EdiromOnline.view.window.iFrameView',
        'EdiromOnline.view.window.XmlView',
	'EdiromOnline.view.window.source.VerovioView',
        'EdiromOnline.view.window.source.SourceView',
        'EdiromOnline.view.window.text.FacsimileView',
        'EdiromOnline.view.window.text.TextFacsimileSplitView'
    ],

    views: [
        'window.Window'
    ],

    init: function() {
    },

    // Called by WindowController before the ExtJS window is registered with the
    // desktop. Metadata decides whether the resource uses WinBox or ExtJS, so
    // audio and text resources never create an ExtJS view or taskbar entry.
    loadWindowContent: function(win) {
        var me = this;
        var lang = getPreference('application_language');

        if(win.initialized) return;
        win.initialized = true;

        window.doAJAXRequest('data/xql/getLinkTarget.xql',
            'POST', 
            {
                uri: win.uri,
                lang: lang
            },
            Ext.bind(function(response){
                var data = response.responseText;
                data = Ext.JSON.decode(data);
                this.onMetaDataLoaded(data, win);
            }, me)
        );
    },

    onMetaDataLoaded: function(config, win) {

        var me = this;
        var desktopController = this.application.getController('desktop.Desktop');
        var handledByWebComponent = false;

        // Decide whether the resource belongs in a web-component window before
        // creating any ExtJS views. This prevents hidden MEI/text views from
        // being initialized for resources handled by WinBox.
        Ext.Array.each(config.views, function(view) {
            if(view.type == 'audioView') {
                handledByWebComponent = true;
                var xmlViewEntries = Ext.Array.filter(config.views, function(v) { return v.type == 'xmlView'; });
                var xmlUri = xmlViewEntries.length ? xmlViewEntries[0].uri : null;
                // config.title (not the per-view label) matches the resource's own
                // navigator label, e.g. "Akkord Beispiele".
                desktopController.openAudioView(view.uri, config.title || view.label, xmlUri);
            } else if(view.type == 'textView') {
                handledByWebComponent = true;
                desktopController.openTextView(view.uri, config.title || view.label, {
                    term: config.term,
                    path: config.path,
                    internalId: config.internalId
                });
            }
        });

        if(handledByWebComponent) {
            win.destroy();
            return;
        }

        var views = [];
        Ext.Array.each(config.views, function(view) {
            var uri = view.uri;

            if(view.type == 'iFrameView' && config.term != '' && config.path != '') {
                uri = uri + '?term=' + config.term + '&path=' + config.path + '#searchTarget';
            }

            if(view.type == 'iFrameView' && config.internalId != '') {
                uri = uri + '#' + config.internalId;
            }

            views.push(this.createView(view.type, {
                window: win,
                type: config.type,
                viewType: view.type,
                viewLabel: view.label,
                defaultView: view.defaultView,
                uri: uri
            }));
        }, me);

        config.views = views;
        desktopController.addWindowToActiveDesktop(win);
        win.setWindowConfig(config);
        win.show();
    },


    createView: function(type, config) {

        var me = this;

        var id = type;
        var label = (config.viewLabel && config.viewLabel != ''?config.viewLabel:me.getLabel(type));
        var viewClass = me.getViewClass(type);

        return {
            id: id,
            label: label,
            view: Ext.create(viewClass, config)
        };
    },

    getLabel: function(type) {
        switch(type) {
            case 'summaryView': return getLangString('controller.window.Window_summaryView');
            case 'iFrameView': return getLangString('controller.window.Window_iFrameView');
            case 'xmlView': return getLangString('controller.window.Window_xmlView');
            case 'sourceView': return getLangString('controller.window.Window_sourceView');
	        case 'verovioView': return getLangString('controller.window.Window_verovioView');
            case 'headerView': return getLangString('controller.window.Window_headerView');
            case 'facsimileView': return 'Facsimile';
            case 'annotationView': return getLangString('controller.window.Window_annotationView');
            case 'textFacsimileSplitView': return getLangString('controller.window.Window_textFacsimileSplitView');
            //TODO:case 'searchView': return 'Suche';
        }
    },

    getViewClass: function(type) {
        switch(type) {
            case 'summaryView': return 'EdiromOnline.view.window.SummaryView';
            case 'iFrameView': return 'EdiromOnline.view.window.iFrameView';
            case 'xmlView': return 'EdiromOnline.view.window.XmlView';
            case 'sourceView': return 'EdiromOnline.view.window.source.SourceView';
	    case 'verovioView': return 'EdiromOnline.view.window.source.VerovioView';
            case 'headerView': return 'EdiromOnline.view.window.HeaderView';
            case 'facsimileView': return 'EdiromOnline.view.window.text.FacsimileView';
            case 'annotationView': return 'EdiromOnline.view.window.AnnotationView';
            case 'textFacsimileSplitView': return 'EdiromOnline.view.window.text.TextFacsimileSplitView';
            //TODO:case 'searchView': return 'EdiromOnline.view.window.SearchView';
        }
    }
});
