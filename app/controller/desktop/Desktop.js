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
 * Adapter between the Ext windows and <edirom-desktop>. The web component keeps
 * the window registry and the layout math; this controller registers the Ext
 * windows with it, reports their state changes and carries out the requests
 * coming from the top bar and task bar.
 *
 * getActiveDesktop() returns this controller, which offers the parts of the old
 * desktop view that WindowController and LinkController use.
 */
Ext.define('EdiromOnline.controller.desktop.Desktop', {

    extend: 'Ext.app.Controller',

    views: [
        'webComponents.EdiromDesktop'
    ],

    requires: [
        'EdiromOnline.view.navigator.Navigator'
    ],

    activeWindowCls: 'ux-desktop-active-win',
    inactiveWindowCls: 'ux-desktop-inactive-win',

    /** Windows that are excluded from tiling, by class name. */
    windowKinds: {
        'EdiromOnline.view.window.concordanceNavigator.ConcordanceNavigator': 'concordance-navigator',
        'EdiromOnline.view.window.HelpWindow': 'help',
        'EdiromOnline.view.window.about.AboutWindow': 'about',
        'EdiromOnline.view.window.search.SearchWindow': 'search'
    },

    /** Kinds of windows that get no task button. */
    hiddenInTaskbarKinds: ['concordance-navigator', 'search'],

    labelKeys: {
        home: 'view.desktop.TaskBar_home',
        homeLabel: 'view.desktop.TopBar_homeBtnLabel',
        workSwitch: 'view.desktop.TaskBar_work',
        searchField: 'view.desktop.TopBar_searchField',
        search: 'view.desktop.TaskBar_search',
        sortGrid: 'view.desktop.TaskBar_Sort_grid',
        sortVertical: 'view.desktop.TaskBar_Sort_vertical',
        sortHorizontal: 'view.desktop.TaskBar_Sort_horizontal',
        showMeasures: 'view.desktop.TaskBar_showMeasures',
        showAnnotations: 'view.desktop.TaskBar_showAnnotations',
        concordanceNav: 'view.desktop.TaskBar_concordanceNav',
        about: 'view.desktop.TaskBar_about',
        help: 'view.desktop.TaskBar_help',
        languageSwitch: 'view.desktop.TaskBar_lang',
        restore: 'view.desktop.Desktop_Restore',
        minimize: 'view.desktop.Desktop_Minimize',
        maximize: 'view.desktop.Desktop_Maximize',
        close: 'view.desktop.Desktop_Close',
        closeOther: 'view.desktop.Desktop_CloseOther',
        closeAll: 'view.desktop.Desktop_CloseAll'
    },

    init: function() {
        this.view = null;
        this.desktop = null;
        this.navigator = null;
        this.windows = new Ext.util.MixedCollection();

        this.control({
            'ediromDesktop': {
                afterrender: this.onDesktopRendered
            }
        });
    },

    //------------------------------------------------------
    // Setup

    onDesktopRendered: function(view) {
        var me = this;
        var app = me.application;
        var desktop = me.desktop = view.element;

        me.view = view;

        desktop.labels = me.getLabels();
        desktop.lang = window.getLanguage();
        desktop.showClock = true;
        desktop.measuresVisible = sessionStorage.getItem('edirom-measures-visible-global') === 'true';
        desktop.annotationsVisible = sessionStorage.getItem('edirom-annotations-visible-global') === 'true';
        desktop.activeWork = app.activeWork || null;

        var works = Ext.getStore('Works');
        works.on('load', me.updateWorks, me);
        if (!works.isLoading()) me.updateWorks();
        app.on('workSelected', function(workId) { desktop.activeWork = workId; });

        var handlers = {
            'window-focus-request': me.onWindowFocusRequest,
            'window-minimize-request': me.onWindowMinimizeRequest,
            'window-restore-request': me.onWindowRestoreRequest,
            'window-maximize-request': me.onWindowMaximizeRequest,
            'window-close-request': me.onWindowCloseRequest,
            'active-window-change': me.onActiveWindowChange,
            'sort-windows-request': me.onSortWindowsRequest,
            'toggle-measures-global': function(detail) { me.setGlobalVisibility('measures', detail.visible); },
            'toggle-annotations-global': function(detail) { me.setGlobalVisibility('annotations', detail.visible); },
            'concordance-navigator-toggle-request': me.openConcordanceNavigator,
            'open-help-request': me.openHelp,
            'open-about-request': me.openAbout,
            'search-request': function(detail) { me.openSearchWindow(detail.term); },
            'work-select': function(detail) { app.selectWork(detail.workId); },
            'language-switch-request': me.switchLanguage,
            'desktop-resize': me.positionNavigator
        };
        Ext.Object.each(handlers, function(type, handler) {
            desktop.addEventListener(type, function(event) {
                handler.call(me, event.detail || {});
            });
        });

        me.createNavigator();

        var concNavOnStart = window.getPreference('concordance_navigator_open_on_start', true);
        var hasConnectionParam = app.activeConnection != null;
        if ((concNavOnStart != null && concNavOnStart) || hasConnectionParam) {
            Ext.defer(me.openConcordanceNavigator, 1000, me);
        }
    },

    getLabels: function() {
        var labels = {};
        Ext.Object.each(this.labelKeys, function(name, key) {
            labels[name] = getLangString(key);
        });
        return labels;
    },

    updateWorks: function() {
        var works = [];
        Ext.getStore('Works').each(function(work) {
            works.push({ id: work.get('id'), title: work.get('title') });
        });
        this.desktop.works = works;
    },

    //------------------------------------------------------
    // Navigator

    createNavigator: function() {
        var me = this;
        var navigator = me.navigator = Ext.create('EdiromOnline.view.navigator.Navigator');

        // Height chosen by the user; positionNavigator() caps it at the workspace height.
        me.navigatorHeight = navigator.height;
        me.cappedNavigatorHeight = null;

        navigator.on('resize', me.onNavigatorResize, me);
        navigator.show();
        me.syncNavigatorPlaceholder();
        me.positionNavigator();
    },

    onNavigatorResize: function(navigator, width, height) {
        if (height !== this.cappedNavigatorHeight) this.navigatorHeight = height;
        this.syncNavigatorPlaceholder();
    },

    syncNavigatorPlaceholder: function() {
        var navigator = this.navigator;
        var style = this.view.navigatorPlaceholder.style;
        style.width = navigator.getWidth() + 'px';
        style.height = navigator.getHeight() + 'px';
    },

    /** The navigator stays an Ext window above the placeholder in the navigator slot. */
    positionNavigator: function() {
        var navigator = this.navigator;
        if (!navigator || !navigator.rendered) return;

        var region = this.view.workspace.getEl().getViewRegion();
        var height = Math.min(this.navigatorHeight, region.bottom - region.top);

        if (navigator.getHeight() !== height) {
            this.cappedNavigatorHeight = height;
            navigator.setHeight(height);
        }
        navigator.setPagePosition(region.right - navigator.getWidth(), region.top);
    },

    //------------------------------------------------------
    // Facade for WindowController and LinkController

    getActiveDesktop: function() {
        return this;
    },

    addWindowToActiveDesktop: function(win) {
        return this.addWindow(win);
    },

    getSizeAndPosition: function(maxWidth, maxHeight) {
        return this.desktop.getSizeAndPosition(maxWidth, maxHeight);
    },

    getUsableSize: function() {
        return this.desktop.getUsableSize();
    },

    getTopBarHeight: function() {
        return this.desktop.getTopBarHeight();
    },

    getWindow: function(id) {
        return this.windows.get(id);
    },

    /** A copy of the open windows; special windows (help, about, search, concordance navigator) optionally left out. */
    getActiveWindowsSet: function(excludeSpecial) {
        var me = this;
        var set = new Ext.util.MixedCollection();

        me.windows.each(function(win) {
            if (!excludeSpecial || me.getKind(win) === null) set.add(win);
        });

        return set;
    },

    getGridPositioning: function(numWins) {
        return this.getPositioning('grid', numWins);
    },

    getHorizontalPositioning: function(numWins) {
        return this.getPositioning('horizontal', numWins);
    },

    getVerticalPositioning: function(numWins) {
        return this.getPositioning('vertical', numWins);
    },

    getPositioning: function(mode, numWins) {
        var positions = {};
        Ext.Array.each(this.desktop.getLayout(mode, numWins), function(rect, i) {
            positions['win_' + i] = rect;
        });
        return positions;
    },

    //------------------------------------------------------
    // Ext window <-> registry

    getKind: function(win) {
        return this.windowKinds[Ext.getClassName(win)] || null;
    },

    findWindowByKind: function(kind) {
        var me = this;
        return me.windows.findBy(function(win) { return me.getKind(win) === kind; });
    },

    addWindow: function(win) {
        var me = this;
        var kind = me.getKind(win);

        me.windows.add(win);
        me.view.workspace.add(win);

        me.desktop.registerWindow({
            id: win.id,
            title: win.title || '',
            kind: kind,
            special: kind !== null,
            hiddenInTaskbar: Ext.Array.contains(me.hiddenInTaskbarKinds, kind),
            hidden: !win.isVisible()
        });

        win.on({
            show: me.onWindowShow,
            hide: me.onWindowHide,
            activate: me.onWindowActivate,
            minimize: me.onWindowMinimize,
            maximize: me.onWindowBoxChange,
            restore: me.onWindowBoxChange,
            move: me.onWindowBoxChange,
            resize: me.onWindowBoxChange,
            titlechange: me.onWindowTitleChange,
            destroy: me.onWindowDestroy,
            scope: me
        });

        return win;
    },

    getRect: function(win) {
        if (!win.rendered) return null;
        var position = win.getPosition(true);
        var size = win.getSize();
        return { x: position[0], y: position[1], width: size.width, height: size.height };
    },

    isRegistered: function(win) {
        return this.desktop.hasWindow(win.id);
    },

    onWindowShow: function(win) {
        if (!this.isRegistered(win)) return;
        win.minimized = false;
        this.desktop.updateWindow(win.id, { hidden: false, minimized: false, rect: this.getRect(win) });
    },

    onWindowHide: function(win) {
        if (!this.isRegistered(win)) return;
        this.desktop.updateWindow(win.id, { hidden: true, minimized: win.minimized === true });
    },

    onWindowActivate: function(win) {
        if (!this.isRegistered(win) || !win.isVisible()) return;
        this.desktop.setActiveWindow(win.id);
    },

    onWindowMinimize: function(win) {
        win.minimized = true;
        win.hide();
    },

    onWindowBoxChange: function(win) {
        if (!this.isRegistered(win) || win.isDestroyed) return;
        this.desktop.updateWindow(win.id, { maximized: win.maximized === true, rect: this.getRect(win) });
    },

    onWindowTitleChange: function(win, title) {
        if (!this.isRegistered(win)) return;
        this.desktop.updateWindow(win.id, { title: title || '' });
    },

    onWindowDestroy: function(win) {
        this.windows.remove(win);
        this.desktop.unregisterWindow(win.id);
    },

    onActiveWindowChange: function(detail) {
        var me = this;
        var previous = detail.previousId && me.windows.get(detail.previousId);
        var active = detail.id && me.windows.get(detail.id);

        if (previous && previous.rendered) {
            previous.addCls(me.inactiveWindowCls);
            previous.removeCls(me.activeWindowCls);
        }
        if (active && active.rendered) {
            active.addCls(me.activeWindowCls);
            active.removeCls(me.inactiveWindowCls);
        }
    },

    //------------------------------------------------------
    // Requests from <edirom-desktop>

    onWindowFocusRequest: function(detail) {
        var win = this.windows.get(detail.id);
        if (!win) return;

        if (win.minimized || win.hidden) win.show();
        else win.toFront();
    },

    onWindowMinimizeRequest: function(detail) {
        var win = this.windows.get(detail.id);
        if (win) win.minimize();
    },

    onWindowRestoreRequest: function(detail) {
        var win = this.windows.get(detail.id);
        if (!win) return;

        if (win.isVisible()) {
            win.restore();
            win.toFront();
        } else {
            win.show();
        }
    },

    onWindowMaximizeRequest: function(detail) {
        var win = this.windows.get(detail.id);
        if (!win) return;

        win.maximize();
        win.toFront();
    },

    onWindowCloseRequest: function(detail) {
        var me = this;
        Ext.Array.each(detail.ids || [], function(id) {
            var win = me.windows.get(id);
            if (win) win.close();
        });
    },

    onSortWindowsRequest: function(detail) {
        var me = this;

        Ext.Object.each(detail.rects || {}, function(id, rect) {
            var win = me.windows.get(id);
            if (!win) return;

            var contentConfig = win.getContentConfig ? win.getContentConfig() : null;

            win.animate({
                duration: 1000,
                to: { left: rect.x, top: rect.y, width: rect.width, height: rect.height },
                listeners: {
                    afteranimate: function() {
                        if (contentConfig) win.setContentConfig(contentConfig);
                    }
                }
            });
        });
    },

    setGlobalVisibility: function(type, visible) {
        sessionStorage.setItem('edirom-' + type + '-visible-global', visible);
        this.application.getController('ToolsController').setGlobalVisibility(type);
    },

    switchLanguage: function() {
        var lang = window.getLanguage() === 'de' ? 'en' : 'de';

        window.setCookie('edirom-language', lang);
        if (window.confirm(window.getLangString('controller.desktop.TaskBar_confirmReload')))
            window.location.href = window.location.protocol + '//' + window.location.host + window.location.pathname + '?edition=' + this.application.getActiveEdition() + '&work=' + this.application.activeWork;
    },

    //------------------------------------------------------
    // Special windows

    openConcordanceNavigator: function() {
        var me = this;
        var win = me.findWindowByKind('concordance-navigator');

        if (win == null) {
            win = Ext.create('EdiromOnline.view.window.concordanceNavigator.ConcordanceNavigator');

            var size = me.view.workspace.getEl().getViewSize();
            var bodyHeight = size.height - 70;
            var x = size.width - win.width - 5;
            var y = me.navigator.getHeight() + 10;

            if (bodyHeight - win.height < y) {
                x = size.width - me.navigator.getWidth() - win.width - 10;
                y = bodyHeight - win.height - 5;
            }

            Ext.apply(win, { x: x, y: y });

            me.addWindow(win);
            win.show();

        } else if (me.desktop.concordanceNavigatorOpen) {
            win.hide();
        } else {
            win.show();
        }
    },

    /** Opens a help or about window, brings it to the front, or closes it if it already is in front. */
    toggleInfoWindow: function(kind, className, maxWidth, maxHeight) {
        var me = this;
        var win = me.findWindowByKind(kind);
        var active = me.desktop.getActiveWindow();

        if (win == null) {
            win = Ext.create(className, me.getSizeAndPosition(maxWidth, maxHeight));
            me.addWindow(win);
            win.show();
        } else if (!active || active.id !== win.id) {
            win.show();
        } else {
            win.close();
        }
    },

    openHelp: function() {
        this.toggleInfoWindow('help', 'EdiromOnline.view.window.HelpWindow', 750, 600);
    },

    openAbout: function() {
        this.toggleInfoWindow('about', 'EdiromOnline.view.window.about.AboutWindow', 700, 600);
    },

    openSearchWindow: function(term) {
        var me = this;
        var win = me.findWindowByKind('search');

        if (win == null) {
            win = Ext.create('EdiromOnline.view.window.search.SearchWindow', me.getSizeAndPosition(700, 600));
            me.addWindow(win);
        }

        win.show();
        win.doSearch(term);
    }
});
