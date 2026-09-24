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
    
    loadInternalId: function(internalId, internalIdType) {
        var me = this;
        return false;
    },

    /**
     * Scrolls to an element of this view's rendered content.
     *
     * Content that passed through edirom_idPrefix.xsl carries this view's id on every
     * element id, so both the prefixed and the plain form are tried. The element has to be
     * inside this view: the same document may be open in several windows, and their copies
     * of the content share their ids.
     *
     * @param {String} id The id to scroll to, with or without this view's id prefix.
     * @return {Boolean} true if an element was found and scrolled to.
     */
    scrollToInternalId: function(id) {
        var me = this;
        var el = me.getEl();

        if(!el) return false;

        var dom = Ext.getDom(id) || Ext.getDom(me.id + '_' + id);

        if(!dom || !el.dom.contains(dom)) return false;

        var elem = Ext.get(dom);
        var hidden = !elem.isVisible();

        // a footnote body lives in a hidden container until its tooltip is shown, and an
        // invisible element cannot be scrolled to
        if(hidden) elem.show();

        dom.scrollIntoView(true);

        if(hidden) elem.hide();

        return true;
    }
});
/*

createMenuEntries
createToolbarEntries
hideToolbarEntries
showToolbarEntries

*/