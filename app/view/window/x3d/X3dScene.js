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

/**
 * Renders an X3D scene using the edirom-3d-viewer web component.
 * The component script is loaded lazily on first use. The component fetches
 * the X3D file via the getX3dScene.xql backend endpoint and renders it using
 * the X_ITE library.
 */
Ext.define('EdiromOnline.view.window.x3d.X3dScene', {
    extend: 'Ext.panel.Panel',

    layout: 'fit',

    initComponent: function() {
        var me = this;

        me.html = '<div id="' + me.id + '_rendCont" class="renderingViewContent"></div>';

        me.callParent();
    },

    /*
     * Initializes the edirom-3d-viewer web component with the given X3D resource URI.
     * Lazily loads the web component script on first use, then renders the viewer.
     * @param {string} uri - The eXist-db URI of the X3D document (xmldb:exist://...)
     */
    setIFrameContent: function(uri) {
        var me = this;

        var backendURL = EdiromOnline.getApplication().backendURL;

        var src = backendURL + 'data/xql/getX3dScene.xql?uri=' + encodeURIComponent(uri);

        var render = function() {
            var cont = me.el.getById(me.id + '_rendCont');
            cont.setHTML('<edirom-3d-viewer src="' + src + '" style="width:100%;height:100%;display:block;"></edirom-3d-viewer>');
        };

        if (customElements.get('edirom-3d-viewer')) {
            render();
        } else {
            var script = document.createElement('script');
            script.src = 'resources/js/edirom-3d-viewer/edirom-3d-viewer.js';
            script.onload = render;
            document.head.appendChild(script);
        }
    },

    /*
     * Loads a new X3D scene into the existing viewer component.
     * @param {string} uri - The eXist-db URI of the X3D document (xmldb:exist://...)
     */
    loadScene: function(uri) {
        var me = this;

        var backendURL = EdiromOnline.getApplication().backendURL;

        var src = backendURL + 'data/xql/getX3dScene.xql?uri=' + encodeURIComponent(uri);
        var viewer = me.el.getById(me.id + '_rendCont').dom.querySelector('edirom-3d-viewer');
        if (viewer) {
            viewer.setAttribute('src', src);
        }
    }
});
