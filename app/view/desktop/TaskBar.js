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

        me.addEvents('switchDesktop',
                    'sortGrid',
                    'sortHorizontally',
                    'sortVertically',
                    'toggleMeasuresGlobally',
                    'toggleAnnotationsGlobally',
                    'openConcordanceNavigator',
                    'openSearchWindow',
                    'openAboutWindow',
                    'switchLanguage');

        me.desktopSwitch = new Ext.toolbar.Toolbar(me.getDesktopSwitchConfig());

        me.windowBar1 = new Ext.toolbar.Toolbar(me.getWindowBarConfig());
        me.windowBar2 = new Ext.toolbar.Toolbar(me.getWindowBarConfig());
        me.windowBar3 = new Ext.toolbar.Toolbar(me.getWindowBarConfig());
        me.windowBar4 = new Ext.toolbar.Toolbar(me.getWindowBarConfig());

        me.tray = new Ext.toolbar.Toolbar(me.getTrayConfig());

        me.items = [

            // sortGrid button
            {
                xtype: 'component',
                html: '<edirom-icon role="button" name="eo_sort_grid" style="cursor:pointer;" title="' + getLangString('view.desktop.TaskBar_Sort_grid') + '"></edirom-icon>',
                listeners: {
                    afterrender: function(c) {
                        c.getEl().on('click', function() { me.fireEvent('sortGrid'); });
                    }
                }
            },

            // sortVertically button
            {
                xtype: 'component', 
                html: '<edirom-icon role="button" name="eo_sort_vertical" title="' + getLangString('view.desktop.TaskBar_Sort_vertical') + '"></edirom-icon>',
                listeners: {
                    afterrender: function(c) {
                        c.getEl().on('click', function() { me.fireEvent('sortVertically'); });
                    }
                }
            },

            // sortHorizontally button
            {
                xtype: 'component', 
                html: '<edirom-icon role="button" name="eo_sort_horizontal" title="' + getLangString('view.desktop.TaskBar_Sort_horizontal') + '"></edirom-icon>',
                listeners: {
                    afterrender: function(c) {
                        c.getEl().on('click', function() { me.fireEvent('sortHorizontally'); });
                    }
                }
            },

            // separator icon
            {
                xtype: 'component', 
                html: '<edirom-icon name="horizontal_rule" rotate="90"></edirom-icon>'
            },

            // toggle measure numbers button
            {
                xtype: 'component', 
                html: '<edirom-icon id="icon_toggleMeasuresGlobally" role="button" name="eo_toggle_measures" title="' + getLangString('view.desktop.TaskBar_showMeasures') + '"></edirom-icon>',
                listeners: {
                    afterrender: function(c) {
                        c.getEl().on('click', function() { 

                            // toggle pressed state
                            var iconElem = document.getElementById('icon_toggleMeasuresGlobally');
                            var newState = iconElem.toggleAttribute('pressed');
                            
                            // save new state in session storage
                            sessionStorage.setItem('edirom-measures-visible-global', newState);

                            // fire event
                            me.fireEvent('toggleMeasuresGlobally');

                        });
                    }
                }
            },

            // toggle annotations button
            {
                xtype: 'component', 
                html: '<edirom-icon id="icon_toggleAnnotationsGlobally" role="button" name="eo_toggle_annotations" title="' + getLangString('view.desktop.TaskBar_showAnnotations') + '"></edirom-icon>',
                listeners: {
                    afterrender: function(c) {
                        c.getEl().on('click', function() { 

                            // toggle pressed state
                            var iconElem = document.getElementById('icon_toggleAnnotationsGlobally');
                            var newState = iconElem.toggleAttribute('pressed');
                            
                            // save new state in session storage
                            sessionStorage.setItem('edirom-annotations-visible-global', newState);

                            // fire event
                            me.fireEvent('toggleAnnotationsGlobally');

                        });
                    }
                }
            },

            // open concordance navigator button
            {
                xtype: 'component', 
                html: '<edirom-icon role="button" id="icon_openConcordanceNavigator" name="eo_concordance_navigator" title="' + getLangString('view.desktop.TaskBar_concordanceNav') + '"></edirom-icon>',
                listeners: {
                    afterrender: function(c) {
                        c.getEl().on('click', function(e) { me.fireEvent('openConcordanceNavigator'); });
                    }
                }                
            },


            //me.desktopSwitch,

            // separator icon
            {
                xtype: 'component', 
                html: '<edirom-icon name="horizontal_rule" rotate="90"></edirom-icon>'
            },

            me.windowBar1,
            me.windowBar2,
            me.windowBar3,
            me.windowBar4,

            // adding space
            '-',

            // open about window button
            me.aboutButton = Ext.create('Ext.button.Button', {
                html: '<edirom-icon role="button" name="eo_about" title="' + getLangString('view.desktop.TaskBar_about') + '"></edirom-icon>',
                baseCls: 'edirom-icon-button',
                action: 'openAboutWindow'
            }),


            // open help window button
            {
                xtype: 'component', 
                html: '<edirom-icon role="button" id="icon_openHelp" name="eo_help" title="' + getLangString('view.desktop.TaskBar_help') + '"></edirom-icon>',
                listeners: {
                    afterrender: function(c) {
                        c.getEl().on('click', function(e) { me.fireEvent('openHelp'); });
                    }
                }
            },

            // language switch button
            /*{
                xtype: 'component', 
                html: '<edirom-icon role="button" name="eo_language_switch" title="' + getLangString('view.desktop.TaskBar_lang') + '"></edirom-icon>',
                listeners: {
                    afterrender: function(c) {
                        c.getEl().on('click', function(e) { me.fireEvent('switchLanguage'); });
                    }
                }
            },*/

            me.tray
        ];

        me.setActiveWindowBar(1);

        me.callParent();
    },

    afterLayout: function () {
        var me = this;
        me.callParent();
        me.windowBar1.el.on('contextmenu', me.onButtonContextMenu, me);
        me.windowBar2.el.on('contextmenu', me.onButtonContextMenu, me);
        me.windowBar3.el.on('contextmenu', me.onButtonContextMenu, me);
        me.windowBar4.el.on('contextmenu', me.onButtonContextMenu, me);
    },


    getDesktopSwitchConfig: function () {
        var me = this, ret = {
            width: 30,
            items: []
        };

        for(var i = 1; i <= 1; i++)
            ret.items.push(
                {
                    cls: 'taskSquareButton desktop',
                    tooltip: { text: getLangString('view.desktop.TaskBar_Desktop', i), align: 'bl-tl' },
                    action: i,
                    handler: Ext.bind(this.fireEvent, me, ['switchDesktop', i], false)
                }
            );

        return ret;
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
        var c = this['windowBar' + this.activeWindowBar].getChildByElement(el);
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

        if(isSearchWin) {
            Ext.apply(config, {hidden: true});
        }

        var cmp = this['windowBar' + this.activeWindowBar].add(config);
        cmp.toggle(true);
        return cmp;
    },

    removeTaskButton: function (btn) {
        var found, me = this;
        me['windowBar' + this.activeWindowBar].items.each(function (item) {
            if (item === btn) {
                found = item;
            }
            return !found;
        });
        if (found) {
            me['windowBar' + this.activeWindowBar].remove(found);
        }
        return found;
    },

    setActiveButton: function(btn) {
        if (btn) {
            btn.toggle(true);
        } else {
            this['windowBar' + this.activeWindowBar].items.each(function (item) {
                if (item.isButton) {
                    item.toggle(false);
                }
            });
        }
    },

    setActiveWindowBar: function(num) {

        this.activeWindowBar = num;

        this.windowBar1.setVisible(num == 1);
        this.windowBar2.setVisible(num == 2);
        this.windowBar3.setVisible(num == 3);
        this.windowBar4.setVisible(num == 4);
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
