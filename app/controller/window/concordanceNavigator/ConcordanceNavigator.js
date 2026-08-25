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
Ext.define('EdiromOnline.controller.window.concordanceNavigator.ConcordanceNavigator', {

    extend: 'Ext.app.Controller',
    
    navwin: null,

    views: [
        'window.concordanceNavigator.ConcordanceNavigator'
    ],

    init: function() {
	    
	    this.application.addListener('workSelected', this.onWorkSelected, this);
	    
        this.control({
            'concordanceNavigator': {
                render: this.onWindowRendered,
                single: true
            }
        });
    },
    
    onWorkSelected: function (workId) {
	    var me = this;
	    if(me.navwin != null) {
	    	var app = me.application;
			app.callFunctionOfEdition(me.navwin, 'getConcordances', Ext.bind(me.concordancesLoaded, me, [me.navwin], true));
		}
	    
    },

    onWindowRendered: function(win) {
        var me = this;

        if(win.initialized) return;
        win.initialized = true;
        
        this.navwin = win;

        var app = me.application;
        app.callFunctionOfEdition(win, 'getConcordances', Ext.bind(me.concordancesLoaded, me, [win], true));

        me.ediromConcordanceNavigator = document.querySelector(`#${win.id}-concordance-navigator`);
        me.ediromConcordanceNavigator.addEventListener('show-connection-request', function (e) {
            var plist = e.detail.plist;
            loadLink(plist, { useExisting: true, onlyExisting: true });
        });
        me.ediromConcordanceNavigator.addEventListener('changed-play-pause-status', function (e) {
            // Or should it's own controller be responsible for this?
            var newStatus = e.detail.newStatus;
            var ediromVideoplayer = document.querySelector(`edirom-videoplayer`);
            if (ediromVideoplayer) {
                ediromVideoplayer.setAttribute("state", newStatus);
            }
        });
        me.ediromConcordanceNavigator.addEventListener('layout-change', function (e) {
            win.updateLayout();
        });
    },

    concordancesLoaded: function (concordanceStore, concordanceWindow) {
        var me = this;
        console.log("Concordances loaded: " + concordanceStore.getCount() + " concordances");
        let concordanceStoreRaw = [];
        for (let concordance of concordanceStore.data.items) {
            concordanceStoreRaw.push(concordance.raw);
        }
        me.ediromConcordanceNavigator.setAttribute("concordances-data", JSON.stringify(concordanceStoreRaw)); // set concordances as attribute to the web component
    }
});