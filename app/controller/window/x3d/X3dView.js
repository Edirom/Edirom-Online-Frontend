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
 * Controller for the X3dView. Listens for the view's afterlayout event
 * and initializes the X3D viewer with the document URI on first render.
 */
Ext.define('EdiromOnline.controller.window.x3d.X3dView', {

    extend: 'Ext.app.Controller',

    views: ['window.x3d.X3dView'],

    init: function() {
        this.control({
            'x3dView': {
                afterlayout: this.onX3dRendered,
                single: true
            }
        });
    },

    /*
     * Triggered once after the view is fully laid out. Passes the document URI
     * to the view to initialize the edirom-3d-viewer web component.
     * @param {EdiromOnline.view.window.x3d.X3dView} view - The rendered view instance
     */
    onX3dRendered: function(view) {
        if (view.initialized) return;
        view.initialized = true;

        view.setIFrameContent(view.uri);
    }
});
