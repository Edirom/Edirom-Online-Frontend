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

    // --- Connected-workspace session sync -----------------------------------
    // Exists only to report this client's connection to the WebSocket session
    // (see EdiromConnectedWorkspace.js); the navigator's own window/URL-param
    // logic below never reads these.
    workspaceConnection: null,        // connection ID last reported to the session (null: none)
    pendingWorkspaceConnection: null, // requested by the session before concordances were loaded; consumed in concordancesLoaded
    concordancesReady: false,         // true once the current work's concordances were passed to the navigator

    views: [
        'window.concordanceNavigator.ConcordanceNavigator'
    ],

    init: function () {

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

        // Connections belong to a work: forget the old work's connection, and tell
        // the WebSocket session about the new work (a no-op without a session).
        me.workspaceConnection = null;
        me.pendingWorkspaceConnection = null;
        me.concordancesReady = false;
        me.notifyConnectedWorkspace();

        if (me.navwin != null) {
            var app = me.application;
            app.callFunctionOfEdition(me.navwin, 'getConcordances', Ext.bind(me.concordancesLoaded, me, [me.navwin], true));
        }

    },

    onWindowRendered: function (win) {
        var me = this;

        if (win.initialized) return;
        win.initialized = true;

        this.navwin = win;

        var app = me.application;
        app.callFunctionOfEdition(win, 'getConcordances', Ext.bind(me.concordancesLoaded, me, [win], true));

        me.ediromConcordanceNavigator = document.querySelector(`#${win.id}-concordance-navigator`);
        me.ediromConcordanceNavigator.addEventListener('connection-changed', function (e) {
            var plist = e.detail.plist;
            loadLink(plist, { useExisting: true, onlyExisting: true });

            // Tell the WebSocket session. The connected workspace compares against what the
            // server already knows, so a change that was itself applied from the session
            // is not sent back out.
            me.workspaceConnection = e.detail.connectionId || null;
            me.notifyConnectedWorkspace();
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
     * The connection to report to the WebSocket session: a connection still waiting for
     * the navigator counts as current, since that is where it will end up.
     */
    getWorkspaceConnection: function () {
        return this.pendingWorkspaceConnection || this.workspaceConnection || null;
    },

    /**
     * Asks the connected workspace (if there is one) to report this client's state.
     */
    notifyConnectedWorkspace: function () {
        var connectedWorkspace = this.application.getController('webComponents.EdiromConnectedWorkspace');
        if (connectedWorkspace) {
            connectedWorkspace.notifyStateChanged();
        }
    },

    /**
     * Navigates the concordance navigator to a connection requested by the WebSocket
     * session. Any resulting `connection-changed` is not sent back to the session (the
     * connected workspace recognises it as the state the server just asked for).
     *
     * If the navigator window isn't open or its concordances aren't loaded yet, the
     * connection is remembered and applied by concordancesLoaded. The returned promise
     * resolves right away in that case, and never blocks later syncs.
     *
     * @return {Promise} Resolves once the navigation was attempted
     */
    applyWorkspaceConnection: function (connectionId) {
        var me = this;
        if (!connectionId) return Promise.resolve();
        if (me.ediromConcordanceNavigator && me.concordancesReady) {
            me.ediromConcordanceNavigator.navigateToConnectionById(connectionId);
        } else {
            me.pendingWorkspaceConnection = connectionId;
            me.application.activeConnection = connectionId;
        }
        return Promise.resolve();
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
        let concordanceStoreRaw = [];
        for (let concordance of concordanceStore.data.items) {
            concordanceStoreRaw.push(concordance.raw);
        }
        me.ediromConcordanceNavigator.setAttribute("concordances-data", JSON.stringify(concordanceStoreRaw)); // set concordances as attribute to the web component
        me.concordancesReady = true;

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

        // A connection requested by the WebSocket session has now been applied (or turned out
        // not to exist): report what this client actually shows.
        if (me.pendingWorkspaceConnection) {
            me.pendingWorkspaceConnection = null;
            me.notifyConnectedWorkspace();
        }
    }
});