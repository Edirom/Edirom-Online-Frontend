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

    /**
     * Checks whether a connection with the given ID exists in any of the loaded concordances
     * (direct connections or connections within groups).
     */
    hasConnectionId: function (concordanceStoreRaw, connectionId) {
        if (!Array.isArray(concordanceStoreRaw) || !connectionId) return false;
        var normalizedId = String(connectionId);
        for (var i = 0; i < concordanceStoreRaw.length; i++) {
            var concordance = concordanceStoreRaw[i];
            // Check direct connections
            var directConnections = concordance && concordance.connections && concordance.connections.connections;
            if (Array.isArray(directConnections)) {
                for (var k = 0; k < directConnections.length; k++) {
                    var conn = directConnections[k];
                    if (conn && String(conn.id) === normalizedId) return true;
                }
            }
            // Check grouped connections
            var groups = concordance && concordance.groups && concordance.groups.groups;
            if (!Array.isArray(groups)) continue;
            for (var j = 0; j < groups.length; j++) {
                var group = groups[j];
                var groupConnections = group && group.connections && group.connections.connections;
                if (!Array.isArray(groupConnections)) continue;
                for (var m = 0; m < groupConnections.length; m++) {
                    var gconn = groupConnections[m];
                    if (gconn && String(gconn.id) === normalizedId) return true;
                }
            }
        }
        return false;
    },

    concordancesLoaded: function (concordanceStore, concordanceWindow) {
        var me = this;
        console.log("Concordances loaded: " + concordanceStore.getCount() + " concordances");
        var items = concordanceStore.data.items;
        var concordanceStoreRaw = [];
        for (var i = 0; i < items.length; i++) {
            concordanceStoreRaw.push(items[i].raw);
        }
        me.ediromConcordanceNavigator.setAttribute("concordances-data", JSON.stringify(concordanceStoreRaw)); // set concordances as attribute to the web component

        // Navigate to a specific connection if provided via URL parameter
        var activeConnection = me.application.activeConnection;
        if (activeConnection) {
            if (me.hasConnectionId(concordanceStoreRaw, activeConnection)) {
                me.ediromConcordanceNavigator.setAttribute("current-connection", activeConnection);
            } else {
                console.warn("Connection ID not found in concordances: " + activeConnection);
            }
            // Clear after applying to avoid re-navigation on subsequent concordance loads
            me.application.activeConnection = null;
        }
    }
});