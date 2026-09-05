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
        'EdiromOnline.view.window.audio.AudioView',
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

    // WindowController calls this before the ExtJS window is added to the
    // desktop. Pure audio resources are normally intercepted earlier by
    // LinkController; all other resources retain the normal ExtJS lifecycle.
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

        // If this resource has an audioView, its sibling xmlView entry (if any) is
        // shown inline in the audio WinBox as its "XML-Ansicht" mode instead of also
        // opening as a separate, persisting ExtJS tab/window.
        var hasAudioView = Ext.Array.some(config.views, function(view) { return view.type == "audioView"; });
        var xmlViewEntries = Ext.Array.filter(config.views, function(view) { return view.type == "xmlView"; });
        var xmlViewEntry = xmlViewEntries.length ? xmlViewEntries[0] : null;

        // A verovioView folds its ENTIRE resource (score + sibling textView/xmlView
        // entries) into one WinBox popup with its own "Ansicht" switcher, mirroring
        // the ExtJS window's TopBar ("Ansicht" + "Gehe zu" in the same header row) —
        // so the ExtJS shell is skipped entirely rather than only the verovioView tab.
        // ONLY for a plain top-level open though (internalIdType 'unknown', e.g. a
        // navigator click): a real internal-link target (internalIdType 'annot',
        // 'note', 'zone', 'measure', ...) — e.g. clicking an annotation icon in the
        // score — must fall through to the normal ExtJS window below, whose existing
        // view-weight logic (Window.loadInternalId) picks the matching tab (like
        // annotationView) instead of always landing back on the score.
        var hasVerovioView = Ext.Array.some(config.views, function(view) { return view.type == "verovioView"; });
        var isPlainOpen = !config.internalIdType || config.internalIdType == "unknown";

        // Render windows that contain complex or document-oriented views in a
        // WinBox shell while retaining their existing ExtJS view/tab lifecycle.
        var hasWinBoxView = Ext.Array.some(config.views, function(view) {
            return view.type == "sourceView" ||
                view.type == "annotationView" ||
                view.type == "summaryView" ||
                view.type == "headerView" ||
                view.type == "iFrameView" ||
                view.type == "textFacsimileSplitView" ||
                view.type == "facsimileView";
        });

        if (hasVerovioView && isPlainOpen) {
            this.application.getController('desktop.Desktop').openVerovioView(config.views, config.title);
            win.destroy();
            return;
        }

        // Pure text/xml/iFrame resources (front-matter documents like "Vorwort"/
        // "Lies mich!"/"TEI Testdatei" — no facsimile, annotation, source or other
        // view) fold into the SAME multi-pane WinBox as verovioView resources above
        // (openVerovioView also works with no score pane), instead of opening the
        // full ExtJS shell window. Same isPlainOpen guard: a deep link into a
        // specific note/annotation inside the text still needs the normal ExtJS
        // window's internalId routing.
        var hasFoldableContent = Ext.Array.some(config.views, function(view) { return view.type == "textView" || view.type == "iFrameView"; });
        var onlyFoldableTypes = config.views.length > 0 && Ext.Array.every(config.views, function(view) { return view.type == "textView" || view.type == "xmlView" || view.type == "iFrameView"; });
        if (hasFoldableContent && onlyFoldableTypes && isPlainOpen) {
            this.application.getController('desktop.Desktop').openVerovioView(config.views, config.title);
            win.destroy();
            return;
        }

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
		        var xmlUri = xmlViewEntry ? xmlViewEntry.uri : null;
		        // config.title (not the per-view label) matches the resource's own
		        // navigator label, e.g. "Akkord Beispiele".
		        this.application.getController('desktop.Desktop').openAudioView(uri, config.title, xmlUri);
		        return;
	        }

	        // Already folded into the audio WinBox above — skip the separate ExtJS tab.
	        if(view.type == "xmlView" && hasAudioView) {
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

        // Every view was folded into the audio WinBox (audioView + xmlView only, no
        // other tabs) — close the ExtJS shell window instead of leaving it persisting
        // behind the WinBox popup.
        if (views.length === 0 && hasAudioView) {
            win.destroy();
            return;
        }

        config.views = views;
        this.application.getController('desktop.Desktop').addWindowToActiveDesktop(win);
        win.setWindowConfig(config);

        // Must run AFTER addWindowToActiveDesktop (so its animateTarget override
        // sticks) and BEFORE the window's first render (show()) - header/
        // draggable/resizable/shadow are only read by ExtJS at render time.
        if (hasWinBoxView) {
            win.applyWinBoxChrome();
        }

        win.show();

        if (hasWinBoxView) {
            this.application.getController('desktop.Desktop').wrapEdiromWindowInWinBox(win);
        }
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
            case 'audioView': return getLangString('controller.window.Window_audioView');
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
            case 'audioView': return 'EdiromOnline.view.window.audio.AudioView';
	    case 'verovioView': return 'EdiromOnline.view.window.source.VerovioView';
            case 'headerView': return 'EdiromOnline.view.window.HeaderView';
            case 'facsimileView': return 'EdiromOnline.view.window.text.FacsimileView';
            case 'textView': return 'EdiromOnline.view.window.text.TextView';
            case 'annotationView': return 'EdiromOnline.view.window.AnnotationView';
            case 'textFacsimileSplitView': return 'EdiromOnline.view.window.text.TextFacsimileSplitView';
            //TODO:case 'searchView': return 'EdiromOnline.view.window.SearchView';
        }
    }
});
