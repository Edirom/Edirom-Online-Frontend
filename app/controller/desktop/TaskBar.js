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
Ext.define('EdiromOnline.controller.desktop.TaskBar', {

    extend: 'Ext.app.Controller',

    views: [
        'desktop.TaskBar'
    ],

    init: function() {
        var me = this;
        
        me.taskbars = new Array();

        me.control({
            'taskbar': {
                render: this.onTaskbarRendered,
                switchDesktop: {
                    fn: this.onSwitchDesktop,
                    scope: this
                },
                switchLanguage: this.onSwitchLanguage,
                toggleMeasuresGlobally: this.onMeasuresVisibilityChanged,
                toggleAnnotationsGlobally: this.onAnnotationsVisibilityChanged
            },
        });
    },

    onTaskbarRendered: function(taskbar) {
        this.taskbars.push(taskbar);
        /*this.updateLanguageButton();*/
    },
    
    onSwitchDesktop: function(num) {
        this.application.switchDesktop(num);
    },
    
    onSwitchLanguage: function() {
        var lang = window.getLanguage();
        
        switch (lang) {
            case ('de'):
                lang = 'en';
                break;
            case ('en'):
                lang = 'de';
                break;
            default:
                lang = 'de';
                break;
        }
        window.setCookie('edirom-language', lang);
        /*this.updateLanguageButton();*/
        if(window.confirm(window.getLangString('controller.desktop.TaskBar_confirmReload')))
            window.location.href = window.location.protocol + '//' + window.location.host + window.location.pathname + '?edition=' + EdiromOnline.getApplication().getActiveEdition() + '&work=' + EdiromOnline.getApplication().activeWork;
    },
    
    onMeasuresVisibilityChanged: function() {
        var me = this;
        var tools = me.application.getController('ToolsController');
        tools.setGlobalVisibility('measures');
    },
    
    onAnnotationsVisibilityChanged: function() {
        var me = this;
        var tools = me.application.getController('ToolsController');
        tools.setGlobalVisibility('annotations');
    },
    
    updateLanguageButton: function() {
        var lang = window.getLanguage();
        
        Ext.get('langBtn-btnInnerEl').dom.innerHTML = lang.toUpperCase();
    }
});
