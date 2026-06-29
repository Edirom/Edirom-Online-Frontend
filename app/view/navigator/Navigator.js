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
Ext.define('EdiromOnline.view.navigator.Navigator', {
    extend: 'Ext.window.Window',

    alias : 'widget.navigator',

    minHeight: 0,
    height: 500,
    width: 250,
    id: 'navigator',

    preventHeader: true,
    shadow: false,

    closable: false,
    draggable: false,
    resizable: true,
    resizeHandles: 'w s',

    layout: 'fit',

    initComponent: function () {
        var me = this;

        let navigatorJsElement = document.createElement("script");
        navigatorJsElement.setAttribute("defer", "defer");
        navigatorJsElement.setAttribute("src", "resources/js/edirom-navigator/navigator.js");
        navigatorJsElement.setAttribute("type", "module");
        document.querySelector("head").appendChild(navigatorJsElement);

        let ediromCoreJsElement = document.createElement("script");
        ediromCoreJsElement.setAttribute("defer", "defer");
        ediromCoreJsElement.setAttribute("src", "resources/js/edirom-core-web-components/edirom-icon.js");
        ediromCoreJsElement.setAttribute("type", "module");
        document.querySelector("head").appendChild(ediromCoreJsElement);

        me.html = `<edirom-navigator id="${me.id}-navigator"></edirom-navigator>`;

        me.callParent();
    },

    getUserHeight: function() {
        return this.userHeight;
    },

    onResize: function(resizer, width, height) {
        var me = this;
        me.userHeight = height;
    }
});