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
Ext.define('EdiromOnline.controller.window.HeaderView', {

    extend: 'Ext.app.Controller',

    views: [
        'window.HeaderView'
    ],

    init: function() {
        this.control({
            'headerView': {
               afterlayout : this.onAfterLayout
            }
        });
    },

    onAfterLayout: function(view) {

        var me = this;

        if(view.initialized) return;
        view.initialized = true;

        var uri = view.uri;
        var type = view.type;
        
        var headerRef =  (type == 'work' || type == 'source' || type == 'recording') ? 'meiHead' : (type == 'text') ? 'teiHeader' :  null;

        // the request goes to v2 API - relative to backendURI
        window.doAJAXRequest('api/document',
            'GET', 
            {
                resource: uri,
                ref: headerRef,
                mediaType: 'text/html',
                htmlProfile: 'edirom-header',
                idPrefix: view.id + '_'
            },
            Ext.bind(function(response){
                view.setContent(response.responseText);
            }, this)
        );
    }
});
