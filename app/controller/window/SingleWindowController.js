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
        'EdiromOnline.view.window.text.TextFacsimileSplitView',
        'EdiromOnline.view.window.text.TextView'
    ],

    views: [
        'window.Window'
    ],

    init: function() {
    },

    // Called by WindowController right after the window is created, while it is
    // STILL HIDDEN. The window is only ever shown once we know its content (see
    // onMetaDataLoaded) — audio-only resources are never shown at all, so no empty
    // ExtJS window flashes on screen before the audio popup appears.
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
        var views = [];
        var hasAudioView = false;
        
        Ext.Array.each(config.views, function(view) {
	        var uri = view.uri;
	        
	        if(view.type == "iFrameView" && config["term"] != "" && config["path"] != "") {
		        uri = uri + "?term=" + config["term"] + "&path=" + config["path"] + "#searchTarget";
	        }
	        
	        if(view.type == "iFrameView" && config["internalId"] != "") {
		        uri = uri + "#" + config["internalId"];
	        }

            // Audio content opens in its own WinBox popup instead of an ExtJS tab.
            if(view.type == "audioView") {
                hasAudioView = true;
                this.application.getController('desktop.Desktop').openAudioView(uri, view.label);
                return;
            }

            views.push(this.createView(view.type, {
                window:win,
                type:config.type,
                viewType: view.type,
                viewLabel: view.label,
                defaultView: view.defaultView,
                uri:uri
            }));

        }, me);

        // Audio resources open exclusively in the audio-player popup. The window
        // was never shown (see loadWindowContent), so just discard it — nothing
        // was ever painted, unlike the old win.close() which closed an already-
        // visible window.
        if(hasAudioView) {
            win.destroy();
            return;
        }

        config.views = views;
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
            case 'textView': return getLangString('controller.window.Window_textView');
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
            case 'textView': return 'EdiromOnline.view.window.text.TextView';
            case 'facsimileView': return 'EdiromOnline.view.window.text.FacsimileView';
            case 'annotationView': return 'EdiromOnline.view.window.AnnotationView';
            case 'textFacsimileSplitView': return 'EdiromOnline.view.window.text.TextFacsimileSplitView';
            //TODO:case 'searchView': return 'EdiromOnline.view.window.SearchView';
        }
    }
});
