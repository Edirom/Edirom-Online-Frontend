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
 * Content view for displaying X3D files. Wraps X3dScene and integrates
 * into the Edirom window system as the 'x3dView' type. Opened automatically
 * when a link to an X3D document stored in eXist-db is followed.
 */
Ext.define('EdiromOnline.view.window.x3d.X3dView', {
    extend: 'EdiromOnline.view.window.View',

    requires: ['EdiromOnline.view.window.x3d.X3dScene'],

    alias: 'widget.x3dView',

    layout: 'border',

    border: 0,

    x3dScene: null,

    cls: 'x3dView',

    initComponent: function() {
        var me = this;

        me.x3dScene = Ext.create('EdiromOnline.view.window.x3d.X3dScene');
        me.viewerContainer = Ext.create('Ext.panel.Panel', {
            region: 'center',
            border: 0,
            layout: 'card',
            items: [me.x3dScene]
        });

        me.items = [me.viewerContainer];

        me.callParent();
    },

    /*
     * Initializes the viewer with the given X3D document URI.
     * Delegates to X3dScene.
     * @param {string} uri - The eXist-db URI of the X3D document (xmldb:exist://...)
     */
    setIFrameContent: function(uri) {
        var me = this;
        me.x3dScene.setIFrameContent(uri);
    },

    /*
     * Loads a new X3D scene into the viewer.
     * Delegates to X3dScene.
     * @param {string} uri - The eXist-db URI of the X3D document (xmldb:exist://...)
     */
    loadScene: function(uri) {
        var me = this;
        me.x3dScene.loadScene(uri);
    }
});
