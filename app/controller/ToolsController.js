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
 *
 */
Ext.define('EdiromOnline.controller.ToolsController', {

    extend: 'Ext.app.Controller',

    requires: [
        'Ext.Error'
    ],
    
    measuresVisibilityListeners: {},
    annotationsVisibilityListeners: {},
    
    measuresGlobalVisibility: false,
    annotationsGlobalVisibility: false,

    init: function() {
        window.ToolsController = this;
    },
    
    addMeasuresVisibilityListener: function(id, listener) {
        var me = this;
        me.measuresVisibilityListeners[id] = listener;
    },
    
    addAnnotationsVisibilityListener: function(id, listener) {
        var me = this;
        me.annotationsVisibilityListeners[id] = listener;
    },
    
    removeMeasuresVisibilityListener: function(id) {
        var me = this;
        delete me.measuresVisibilityListeners[id];
    },
    
    removeAnnotationsVisibilityListener: function(id) {
        var me = this;
        delete me.annotationsVisibilityListeners[id];
    },
    
    // setting global visibility for measures or annotations (type = 'measures' | 'annotations')
    setGlobalVisibility: function(type) {
        
        // check type
        if(type !== 'measures' && type !== 'annotations') {
            console.error('ToolsController.setGlobalVisibility: invalid type \''+type+'\'');
            return;
        }

        // assign current this to var me
        var me = this;

        // get state from session storage
        var state = sessionStorage.getItem('edirom-'+type+'-visible-global') === 'true';
        
        // set local property to current state
        me[type+'globalVisibility'] = state;
        
        // notify listeners about change
        Ext.Object.each(me[type+'VisibilityListeners'], function(id, listener, obj) {
            listener(type);
        });
    }
});