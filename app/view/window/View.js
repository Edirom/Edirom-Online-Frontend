/**
 *  Edirom Online
 *  Copyright (C) 2016 The Edirom Project
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
 *
 */
Ext.define('EdiromOnline.view.window.View', {
    extend: 'Ext.panel.Panel',
    
    mixins: {
        observable: 'Ext.util.Observable'
    },
    
    getContentConfig: function() {
        var me = this;
        return {
            id: me.id
        };
    },
    
    getWeightForInternalLink: function(uri, type, id) {
        var me = this;
        
        if(me.uri != uri)
            return 0;
        
        return 0;
    },
    
    /**
     * The counterpart of loadInternalId: the xml:id of what the view shows right now. It is used to carry the
     * position over to Edirom Mobile (see Window.getCurrentLink).
     *
     * A view that follows what it shows (e.g. the page or the measure) overrides this. The default is for views
     * that do not: they are where they were last sent, i.e. at the id of the last internal link of their window.
     * An override that returns null says that the view shows nothing that has an id right now.
     *
     * @return {String} The xml:id, or null if there is none
     */
    getCurrentInternalId: function() {
        var me = this;
        var id = me.window ? me.window.internalId : null;

        // The id of a link can carry parameters (id?term=...), which are not part of the id
        return id ? String(id).split('?')[0] : null;
    },

    loadInternalId: function(internalId, internalIdType) {
        var me = this;
        return false;
    }
});
/*

createMenuEntries
createToolbarEntries
hideToolbarEntries
showToolbarEntries

*/