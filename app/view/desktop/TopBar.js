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
Ext.define('EdiromOnline.view.desktop.TopBar', {
    extend: 'Ext.toolbar.Toolbar',

    requires: [
        'Ext.button.Split',
        'Ext.form.field.Text'
    ],

    alias : 'widget.topbar',
	id : 'ediromToolbar',
	
    height: 41,

    initComponent: function () {

        var me = this;

        me.homeButton = Ext.create('Ext.button.Button', {
            id: 'homeBtn',
            cls: 'taskSquareButton home',
            tooltip: { text: getLangString('view.desktop.TaskBar_home'), align: 'tl-bl' }
        });
        
        me.workCombo = Ext.create('Ext.button.Button', {
            text: 'work',
            id: 'workSwitch',
            cls: 'insetButton',
            indent: false,
            menu : {
	            maxHeight:500,
                items: []
            }
        });

        me.searchButton = Ext.create('Ext.button.Button', {
            html: '<edirom-icon id="icon_search" role="button" name="search" title="' + getLangString('view.desktop.TaskBar_search') + '"></edirom-icon>',
            baseCls: 'edirom-icon-button',
            action: 'openSearchWindow'
        });

        me.searchTextField = Ext.create('Ext.form.TextField', {
            width: 180,
            id: 'searchTextFieldTop'
        });
        
        me.searchButton.textField = me.searchTextField;

        me.shellBar = Ext.create('Ext.Component', {
            flex: 1,
            autoEl: {
                tag: 'edirom-topbar',
                id: 'ediromTopbar',
                lang: 'de'
            },
            listeners: {
                afterrender: function () {
                    me.bindShellTopbar(document.getElementById('ediromTopbar'));
                }
            }
        });

        me.items = [
            me.shellBar,
            me.searchTextField,
            me.searchButton
        ];

        me.callParent();
    },

    bindShellTopbar: function (el) {
        var me = this;
        if (!el) return;

        var syncWorks = function () {
            var works = [];
            var active = '';
            me.workCombo.menu.items.each(function (item) {
                var id = String(item.id || '').replace('workMenu_', '');
                works.push({ id: id, title: item.text });
                if (item.checked) active = id;
            });
            el.setAttribute('works', JSON.stringify(works));
            if (active) el.setAttribute('active-work', active);
        };

        me.workCombo.menu.on('add', syncWorks);
        me.workCombo.setText = function (text) {
            me.workCombo.menu.items.each(function (item) {
                if (item.text === text) {
                    el.setAttribute('active-work', String(item.id || '').replace('workMenu_', ''));
                }
            });
        };

        el.addEventListener('work-selected', function (event) {
            var item = Ext.getCmp('workMenu_' + event.detail.id);
            if (item) item.setChecked(true);
        });

        el.addEventListener('home', function () {
            me.homeButton.fireEvent('click', me.homeButton);
        });

        syncWorks();
    }
});
