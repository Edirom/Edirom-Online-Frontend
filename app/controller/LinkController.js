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
Ext.define('EdiromOnline.controller.LinkController', {

    extend: 'Ext.app.Controller',

    existLinkCache: null,

    init: function() {

        window.loadLink = Ext.bind(this.loadLink, this);
        this.existLinkCache = new Ext.util.MixedCollection();
    },

    /**
     * Reads multiple URIs and opens windows with the referenced contents
     * 
     * @param {String[]} uris The array of URIs to process.
     */
    loadLinks: function(uris) {
        var me = this;

        for(var i = 0; i < uris.length; i++) {
            Ext.defer(me.loadLink, i * 200, me, [uris[i]], false);
        }
    },

    /**
     * Reads an URI and opens a window with the referenced content.
     *
     * For a single, simple xmldb:exist:// URI (no cfg, no multi-uri batch), this
     * first asks the backend what views the resource has. If the only views are
     * audioView (+ optionally its sibling xmlView), the resource opens directly in
     * the audio WinBox and the generic ExtJS window is never created at all — not
     * even briefly. Anything else (multi-uri batches, cfg-carrying calls, or a
     * resource with other real views too) goes through the normal
     * loadLinkInternal/ExtJS window path, unaffected.
     *
     * @param {String} uri The URI to process.
     */
    loadLink: function(uri, cfg) {
        var me = this;

        // Navigator links call loadLink(uri, {}) — an empty (but truthy) cfg object,
        // not omitted — so "no real cfg" must be checked by key count, not truthiness.
        var hasRealCfg = cfg && Object.keys(cfg).length > 0;

        // A #fragment (e.g. an annotation icon's `parent.loadLink(uri+'#'+annotId)`)
        // is an internal-link target that needs getInternalIdType.xql-based tab
        // routing (see loadLinkInternal + Window.loadInternalId) to land on the
        // right view (annotationView/textView/sourceView) — never the direct-open
        // fast path below, which would just reopen the resource's default view.
        var hasFragment = typeof uri === 'string' && uri.indexOf('#') !== -1;

        if (typeof uri === 'string' && !hasRealCfg && !hasFragment && uri.match(/^xmldb:exist:\/\//) && !/[\s;]/.test(uri)) {
            window.doAJAXRequest('data/xql/getLinkTarget.xql',
                'POST',
                { uri: uri, lang: window.getLanguage() },
                function(response) {
                    var config = Ext.JSON.decode(response.responseText);
                    var audioViewEntry = Ext.Array.filter(config.views, function(view) { return view.type == 'audioView'; })[0];
                    var verovioViewEntry = Ext.Array.filter(config.views, function(view) { return view.type == 'verovioView'; })[0];
                    var xmlViewEntry = Ext.Array.filter(config.views, function(view) { return view.type == 'xmlView'; })[0];
                    var otherViews = Ext.Array.filter(config.views, function(view) { return view.type != 'audioView' && view.type != 'xmlView' && view.type != 'verovioView'; });

                    if (audioViewEntry && otherViews.length === 0) {
                        // config.title (not the per-view label) matches the resource's
                        // own navigator label, e.g. "Akkord Beispiele".
                        me.application.getController('desktop.Desktop').openAudioView(audioViewEntry.uri, config.title, xmlViewEntry ? xmlViewEntry.uri : null);
                    } else if (verovioViewEntry) {
                        // Folds the ENTIRE resource (score + sibling textView/xmlView
                        // entries) into one WinBox — see openVerovioView.
                        me.application.getController('desktop.Desktop').openVerovioView(config.views, config.title);
                    } else {
                        me.loadLinkInternal(uri, cfg);
                    }
                }
            );
            return;
        }

        me.loadLinkInternal(uri, cfg);
    },

    /**
     * Reads an URI and opens a window with the referenced content
     *
     * @param {String} uri The URI to process.
     */
    loadLinkInternal: function(uri, cfg) {
        
        //TODO: check if links should be opened in new windows

        var config = Ext.apply({}, cfg);

        var uriMasked = uri.replace(/\s|;/g, '\uC280');
        var uris = uriMasked.split('\uC280');

        var uriWindows = new Ext.util.MixedCollection();
        var windowsUsed = new Ext.util.MixedCollection();

        var existingWindows = null;
        if(config['useExisting']) {
            var desktop = this.application.getController('desktop.Desktop').getActiveDesktop();
            existingWindows = desktop.getActiveWindowsSet(true);
        }


        Ext.Array.each(uris, function(singleUri){

            if(singleUri.match(/^edirom:\/\/#id=/)) {
                //TODO: set attribute by id

            }else if(singleUri.match(/^edirom:\/\/\.class=/)) {
                //TODO: set attribute by class
    
            }else if(singleUri.match(/^edirom:\/\//)) {
                this.parseEdiromLink(singleUri);

            }else if(singleUri.match(/^xmldb:exist:\/\//)) {

                if(config['useExisting']) {
                    var win = existingWindows.findBy(function(win) {
                        return win.uri.split('#')[0] == singleUri.split('#')[0];
                    });

                    if(win != null) {
                        uriWindows.add(singleUri, win);
                        existingWindows.remove(win);

                    }else if(!config['onlyExisting'])
                        uriWindows.add(singleUri, 'newWindow');

                }else
                    uriWindows.add(singleUri, 'newWindow');
            }else if(singleUri.match(/^#/)) {
                //TODO: internal link
    
            }else if(singleUri.match(/^(http|https|mailto):\/\//)) {
                window.open (singleUri,"_blank");
    
            }else if(singleUri.match(/^(ext|file):\/\//)) {
                //TODO: external (not possible in browser)
    
            }else {
                //TODO: relative path to xml or something
    
            }
    
        }, this);

        var positions = null;
        var i = 0;

        if(config['sort']) {
        
            if(config['sortIncludes'] && Array.isArray(config['sortIncludes']))
                i = config['sortIncludes'].length;
            
            if(config['sort'] == 'sortGrid')
                positions = this.application.getController('desktop.Desktop').getGridPositioning(uriWindows.getCount() + i);
            
            if(config['sort'] == 'sortVertically')
                positions = this.application.getController('desktop.Desktop').getVerticalPositioning(uriWindows.getCount() + i);

            if(config['sort'] == 'sortHorizontally')
                positions = this.application.getController('desktop.Desktop').getHorizontalPositioning(uriWindows.getCount() + i);

            if(i > 0) {
                for(var j = 0; j < config['sortIncludes'].length; j++) {
                    var win = config['sortIncludes'][j];
                    var posConfig = (positions == null?{}:positions['win_' + j]);
                    win.setSize(posConfig['width'], posConfig['height']);
                    win.setPosition(posConfig['x'], posConfig['y']);
                }
            }
        }


        uriWindows.eachKey(function(singleUri) {

            var win = uriWindows.get(singleUri);
            var posConfig = (positions == null?{}:positions['win_' + i]);
            var cfg = Ext.apply(config, posConfig);
            if(win == 'newWindow') {
	            if(cfg['y']) {
	            	cfg['y'] = cfg['y'] - 41; // hack: height of TopBar
	            }
                windowsUsed.add(this.parseExistLink(singleUri, cfg));
            }
            else {

                if(cfg['width']) {
                    win.setSize(cfg['width'], cfg['height']);
                    win.setPosition(cfg['x'], cfg['y']);
                }

                if(singleUri.indexOf('#') != -1) {

                    window.doAJAXRequest('data/xql/getInternalIdType.xql',
                        'GET', 
                        {
                            uri: singleUri
                        },
                        Ext.bind(function(response){
                            win.loadInternalId(singleUri.split('#')[1], response.responseText.trim());
                            win.show();
                        }, this)
                    );
                }else
                    win.showView('summaryView');
                    
                windowsUsed.add(win);
            }

            i++;
        }, this);
        
        return windowsUsed; 
    },

    /**
     * Parses an URI that points to a resource in an exist database instance
     *
     * @private
     *
     * @param uri The URI to parse.
     */
    parseExistLink: function(uri, cfg) {
        var me = this;
        
        return me.application.getController('window.WindowController').createWindow(uri, cfg);
    },

    parseEdiromLink: function(uri) {
        var me = this;
        //TODO: edirom link

        if(uri == 'edirom://searchWindow') {
            me.application.getController('desktop.Desktop').openSearch('');
            return;

        }else if(uri.match(/^edirom:\/\/searchWindow[type:.*]/)) {
            //TODO: open search window only showing specified category
            return;

        }else if(uri.match(/^edirom:\/\/setPreferences[.*]/)) {
            //TODO: set the specified preference
            return;

        }

        if(uri.indexOf('?') != -1) {
            //TODO: check parameters
        }
    }
});