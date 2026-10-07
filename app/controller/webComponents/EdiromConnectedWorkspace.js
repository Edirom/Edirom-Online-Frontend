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
Ext.define('EdiromOnline.controller.webComponents.EdiromConnectedWorkspace', {

    extend: 'Ext.app.Controller',

    navwin: null,

    views: [
        'webComponents.EdiromConnectedWorkspace'
    ],

    init: function () {
        this.control({
            'ediromConnectedWorkspace': {
                render: this.onRendered
            }
        });
    },

    onRendered: function (component) {
        var me = this;

        if (component.initialized) return;
        component.initialized = true;

        me.ediromConnectedWorkspace = document.querySelector("#connected-workspace");
        if (!me.ediromConnectedWorkspace) return;

        // The view loads the component's module through a script tag, so the element
        // may not be upgraded yet when the view renders.
        customElements.whenDefined('edirom-connected-workspace').then(function () {
            var workspace = me.ediromConnectedWorkspace;
            if (typeof workspace.registerStateHandler !== 'function') {
                console.warn('Connected workspace component has no state sync support (outdated version); sessions will not sync state.');
                return;
            }
            workspace.registerStateHandler({
                keys: ['edition', 'work', 'connection'],
                get: Ext.bind(me.getState, me),
                apply: Ext.bind(me.applyState, me)
            });
        });
    },

    /**
     * The part of this client's state that is synced through the WebSocket session.
     * `null` means "not set" (for `connection`: no concordance connection selected).
     */
    getState: function () {
        var app = this.application;
        var concordanceNavigator = app.getController('window.concordanceNavigator.ConcordanceNavigator');
        return {
            edition: app.activeEdition || null,
            work: app.activeWork || null,
            connection: (concordanceNavigator && concordanceNavigator.getWorkspaceConnection()) || null
        };
    },

    /**
     * Moves this client to a state the WebSocket server asked for. The connected workspace
     * does not report the result back as a new change, and reports what this client
     * actually ended up with if it differs from the request.
     *
     * Only the connection is applied on Desktop for now: changing the edition reloads the
     * page (which would leave the session), and Desktop has no free-exploration mode, so
     * `connection: null` is not applied either.
     */
    applyState: function (patch) {
        if (!patch || !patch.connection) return Promise.resolve();
        var concordanceNavigator = this.application.getController('window.concordanceNavigator.ConcordanceNavigator');
        if (!concordanceNavigator) return Promise.resolve();
        return concordanceNavigator.applyWorkspaceConnection(patch.connection);
    },

    /**
     * Reports this client's current state to the WebSocket session. Safe to call any time:
     * without a connected workspace (no wsURL configured) or outside a session it does
     * nothing, and values the server already knows are not sent again.
     */
    notifyStateChanged: function () {
        var workspace = this.ediromConnectedWorkspace;
        if (!workspace || typeof workspace.updateState !== 'function') return;
        workspace.updateState(this.getState());
    }
});
