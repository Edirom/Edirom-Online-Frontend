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
Ext.define('EdiromOnline.controller.window.HelpWindow', {

    extend: 'Ext.app.Controller',

    views: [
        'window.HelpWindow'
    ],

    backendPath: '@backend.path@',
    backendURL: '@backend.url@',

    init: function() {
        this.control({
            'helpWindow': {
                render: this.onWindowRendered,
                single: true
            }
        });
    },

    onWindowRendered: function(win) {
        var me = this;

        if(win.initialized) return;
        win.initialized = true;

        var lang = window.getLanguage();
        var dbPath = me.backendPath.replace('/exist', '/db');
        var resource = 'xmldb:exist://' + dbPath + 'help/help_' + lang + '.xml';

        window.doAJAXRequest('api/document',
            'GET', 
            {
                resource: resource,
                mediaType: 'text/html',
                lang: lang,
                idPrefix: win.id + '-'
            },
            Ext.bind(function(response){
                // set window content
                win.setContent(response.responseText);
            }, me)
        );
    }
});