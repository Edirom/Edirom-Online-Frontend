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

/*
 * Based on Ext.ux.desktop.TaskBar
 */
Ext.define('EdiromOnline.view.desktop.TaskBar', {
    extend: 'Ext.toolbar.Toolbar',

    requires: [
        'Ext.button.Button',
        'Ext.menu.Menu'
    ],

    alias: 'widget.taskbar',

    id: 'ediromTaskbar',
    cls: 'ux-taskbar',

    initComponent: function () {
        var me = this;

        me.addEvents('sortGrid',
                    'sortHorizontally',
                    'sortVertically',
                    'toggleMeasuresGlobally',
                    'toggleAnnotationsGlobally',
                    'openConcordanceNavigator',
                    'openSearchWindow',
                    'switchLanguage');

        me.windowBar = new Ext.toolbar.Toolbar(me.getWindowBarConfig());

        me.tray = new Ext.toolbar.Toolbar(me.getTrayConfig());

        me.items = [
            {
                xtype: 'component',
                flex: 1,
                autoEl: {
                    tag: 'edirom-bottombar',
                    id: 'ediromBottombar',
                    lang: 'de'
                },
                listeners: {
                    afterrender: function () {
                        me.bindShellBottombar(document.getElementById('ediromBottombar'));
                    }
                }
            },

            // separator icon
            {
                xtype: 'component', 
                html: '<edirom-icon name="horizontal_rule" rotate="90"></edirom-icon>'
            },

            me.windowBar,

            // language switch button
            /*{
                xtype: 'component', 
                html: '',
                listeners: {
                    afterrender: function(c) {
                        c.getEl().on('click', function(e) { me.fireEvent('switchLanguage'); });
                    }
                }
            },*/

            me.tray
        ];

        me.callParent();
    },

    bindShellBottombar: function (el) {
        var me = this;
        if (!el) return;

        el.addEventListener('arrange-request', function (event) {
            if (event.detail.mode === 'grid') me.fireEvent('sortGrid');
            if (event.detail.mode === 'vertical') me.fireEvent('sortVertically');
            if (event.detail.mode === 'horizontal') me.fireEvent('sortHorizontally');
        });
        el.addEventListener('toggle-measures', function (event) {
            sessionStorage.setItem('edirom-measures-visible-global', event.detail.visible);
            me.fireEvent('toggleMeasuresGlobally');
        });
        el.addEventListener('toggle-annotations', function (event) {
            sessionStorage.setItem('edirom-annotations-visible-global', event.detail.visible);
            me.fireEvent('toggleAnnotationsGlobally');
        });
        el.addEventListener('open-concordance', function () {
            me.fireEvent('openConcordanceNavigator');
        });
        el.addEventListener('open-help', function () {
            me.fireEvent('openHelp');
        });
        el.addEventListener('open-about', function () {
            me.fireEvent('openAbout');
        });
        el.addEventListener('window-selected', function (event) {
            me.windowBar.items.each(function (item) {
                if (item.win && item.win.id === event.detail.id) {
                    me.onWindowBtnClick(item);
                }
            });
        });
        me.syncShellWindows();
    },

    syncShellWindows: function () {
        var el = document.getElementById('ediromBottombar');
        if (!el || !this.windowBar) return;
        var windows = [];
        var active = '';
        this.windowBar.items.each(function (item) {
            if (!item.win) return;
            windows.push({ id: item.win.id, title: item.win.title });
            if (item.pressed) active = item.win.id;
        });
        el.setAttribute('windows', JSON.stringify(windows));
        if (active) el.setAttribute('active-window', active);
    },

    afterLayout: function () {
        var me = this;
        me.callParent();
        me.windowBar.el.on('contextmenu', me.onButtonContextMenu, me);
    },

    getWindowBarConfig: function () {
        return {
            flex: 1,
            cls: 'ux-desktop-windowbar',
            items: [ '&#160;' ],
            layout: { overflowHandler: 'Scroller' }
        };
    },

    /**
     * This method returns the configuration object for the Tray toolbar. A derived
     * class can override this method, call the base version to build the config and
     * then modify the returned object before returning it.
     */
    getTrayConfig: function () {
        var ret = {
            items: this.trayItems
        };
        delete this.trayItems;
        return ret;
    },

    getWindowBtnFromEl: function (el) {
        var c = this.windowBar.getChildByElement(el);
        return c || null;
    },

    onButtonContextMenu: function (e) {
        var me = this, t = e.getTarget(), btn = me.getWindowBtnFromEl(t);
        if (btn) {
            e.stopEvent();
            me.windowMenu.theWin = btn.win;
            me.windowMenu.showBy(t);
        }
    },

    onWindowBtnClick: function (btn) {
        var win = btn.win;

        if (win.minimized || win.hidden) {
            btn.disable();
            win.show(null, function() {
                btn.enable();
            });
        } else if (win.active) {
            btn.disable();
            win.on('hide', function() {
                btn.enable();
            }, null, {single: true});
            win.minimize();
        } else {
            win.toFront();
        }
    },

    addTaskButton: function(win) {

        var me = this;

        var isSearchWin = (Ext.getClassName(win) == 'EdiromOnline.view.window.search.SearchWindow');
        var isConcordanceNavigatorWin = (Ext.getClassName(win) == 'EdiromOnline.view.window.concordanceNavigator.ConcordanceNavigator');

        var config = {
            iconCls: win.iconCls,
            cls: 'taskbarWindowButton',
            enableToggle: true,
            toggleGroup: 'all',
            width: 140,
            margin: '0 5 0 0',
            padding: '2 10 2 0',
            text: Ext.util.Format.ellipsis(win.title, 16),
            listeners: {
                click: this.onWindowBtnClick,
                scope: this
            },
            win: win
        };

        if(isSearchWin || isConcordanceNavigatorWin) {
            Ext.apply(config, {hidden: true});
        }

        var cmp = this.windowBar.add(config);
        cmp.toggle(true);
        this.syncShellWindows();
        return cmp;
    },

    removeTaskButton: function (btn) {
        var found, me = this;
        me.windowBar.items.each(function (item) {
            if (item === btn) {
                found = item;
            }
            return !found;
        });
        if (found) {
            me.windowBar.remove(found);
        }
        me.syncShellWindows();
        return found;
    },

    setActiveButton: function(btn) {
        if (btn) {
            btn.toggle(true);
        } else {
            this.windowBar.items.each(function (item) {
                if (item.isButton) {
                    item.toggle(false);
                }
            });
        }
    }
    
});

/**
 * @class Ext.ux.desktop.TrayClock
 * @extends Ext.toolbar.TextItem
 * This class displays a clock on the toolbar.
 */
Ext.define('EdiromOnline.view.desktop.TrayClock', {
    extend: 'Ext.toolbar.TextItem',

    alias: 'widget.trayclock',

    cls: 'ux-desktop-trayclock',

    html: '&#160;',

    timeFormat: 'g:i A',

    tpl: '{time}',

    initComponent: function () {
        var me = this;

        me.callParent();

        if (typeof(me.tpl) == 'string') {
            me.tpl = new Ext.XTemplate(me.tpl);
        }
    },

    afterRender: function () {
        var me = this;
        Ext.Function.defer(me.updateTime, 100, me);
        me.callParent();
    },

    onDestroy: function () {
        var me = this;

        if (me.timer) {
            window.clearTimeout(me.timer);
            me.timer = null;
        }

        me.callParent();
    },

    updateTime: function () {
        var me = this, time = Ext.Date.format(new Date(), me.timeFormat),
            text = me.tpl.apply({ time: time });
        if (me.lastText != text) {
            me.setText(text);
            me.lastText = text;
        }
        me.timer = Ext.Function.defer(me.updateTime, 10000, me);
    }
});
