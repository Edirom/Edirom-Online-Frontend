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

/*
 * Renders <edirom-desktop> (resources/js/edirom-desktop) with its light-DOM slots.
 * The window logic lives in controller/desktop/Desktop.js.
 */
Ext.define('EdiromOnline.view.webComponents.EdiromDesktop', {

    extend: 'Ext.Component',

    alias: 'widget.ediromDesktop',

    requires: [
        'Ext.container.Container'
    ],

    uses: [
        'EdiromOnline.view.webComponents.EdiromConnectedWorkspace'
    ],

    cls: 'ediromDesktop',
    style: 'width: 100%; height: 100%;',

    wallpaper: null,
    wallpaperStretch: false,
    logo: null,

    /** The <edirom-desktop> element. */
    element: null,

    /**
     * Container filling the workspace slot. Ext windows are added to it, so their
     * x/y are relative to the workspace, like the rects of <edirom-desktop>.
     */
    workspace: null,

    /** Light-DOM element in the navigator slot; sized like the navigator window. */
    navigatorPlaceholder: null,

    onRender: function () {
        var me = this;
        me.callParent(arguments);

        var desktop = me.element = document.createElement('edirom-desktop');
        if (me.wallpaper) desktop.setAttribute('wallpaper', me.wallpaper);
        if (me.wallpaperStretch) desktop.setAttribute('wallpaper-stretch', '');
        if (me.logo) desktop.setAttribute('logo', me.logo);

        var workspace = document.createElement('div');
        workspace.slot = 'workspace';

        var navigator = me.navigatorPlaceholder = document.createElement('div');
        navigator.slot = 'navigator';

        desktop.append(workspace, navigator);

        var actions = document.createElement('div');
        actions.slot = 'topbar-actions';

        var authentication = document.createElement('edirom-authentication');

        var configController = EdiromOnline.getApplication().getController('ConfigController');
        var keycloakUrl = configController.getConfig('keycloakURL');
        var keycloakRealm = configController.getConfig('keycloakRealm');
        var keycloakClientId = configController.getConfig('keycloakClientId');
        if (keycloakUrl && keycloakRealm && keycloakClientId) {
            authentication.setAttribute('keycloak-url', keycloakUrl);
            authentication.setAttribute('keycloak-realm', keycloakRealm);
            authentication.setAttribute('keycloak-client-id', keycloakClientId);
        }
        actions.appendChild(authentication);

        // The connected workspace should only instantiate when a wsURL is actually configured.
        var wsUrl = configController.getConfig('wsURL');
        var connectedWorkspacePlaceholder = null;
        if (wsUrl) {
            connectedWorkspacePlaceholder = document.createElement('div');
            actions.appendChild(connectedWorkspacePlaceholder);
        }
        desktop.append(actions);

        me.el.dom.appendChild(desktop);

        me.workspace = Ext.create('Ext.container.Container', {
            renderTo: workspace,
            cls: 'ediromDesktopWorkspace',
            style: 'position: absolute; top: 0; right: 0; bottom: 0; left: 0;'
        });

        if (connectedWorkspacePlaceholder) {
            me.connectedWorkspace = Ext.create('EdiromOnline.view.webComponents.EdiromConnectedWorkspace', {
                renderTo: connectedWorkspacePlaceholder
            });
        }
    },

    onDestroy: function () {
        var me = this;
        Ext.destroy(me.connectedWorkspace, me.workspace);
        me.callParent(arguments);
    }
});
