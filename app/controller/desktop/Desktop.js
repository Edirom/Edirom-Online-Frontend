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
Ext.define('EdiromOnline.controller.desktop.Desktop', {

    extend: 'Ext.app.Controller',

    views: [
        'desktop.Desktop'
    ],

    // ExtJS's own component-rendering internals (Ext.util.Renderable#finishRender,
    // used whenever a NEW child component is created/rendered lazily - e.g. a
    // measure-based view's per-voice viewer, created on first use, well after its
    // ediromWindow has already been reparented into a WinBox's shadow root - see
    // wrapEdiromWindowInWinBox) resolve the just-inserted node via Ext.getDom(id),
    // which calls this function. It only falls back to ExtJS's OWN internal
    // detached-body staging element when document.getElementById(id) fails, never
    // to a shadow root, so any component first rendered AFTER its window has been
    // moved into a WinBox crashes with "Cannot read properties of null (reading
    // 'dom')" deep inside finishRender. Patch this ONE global utility (not each
    // call site - the crash happens inside minified framework internals we can't
    // easily reach) to also search the WinBox host's shadow root.
    patchGetElementByIdForShadowRoots: function() {
        if (Ext.getElementById.__ediromShadowPatched) return;

        var original = Ext.getElementById;
        var patched = function(id) {
            var el = original(id);
            if (!el) {
                var host = document.getElementById('ediromWindowsHost');
                if (host && host.shadowRoot) {
                    el = host.shadowRoot.getElementById(id);
                }
            }
            return el;
        };
        patched.__ediromShadowPatched = true;
        Ext.getElementById = patched;
    },

    init: function() {
        this.patchGetElementByIdForShadowRoots();

        this.desktop = null;

        this.control({
            'desktop': {
                afterrender: this.onDesktopRendered
            },
            'topbar button[action=openSearchWindow]': {
                click: this.onOpenSearchWindow
            },
            'taskbar button[action=openAboutWindow]': {
                click: this.onOpenAboutWindow
            },
            'topbar #searchTextFieldTop': {
                specialkey: this.onSpecialKey
            }
        });
    },

    onDesktopRendered: function(desktop) {
        this.desktop = desktop;
        this.desktop.taskbar.addListener('switchDesktop', this.switchDesktop, this);

        this.desktop.taskbar.addListener('openConcordanceNavigator', this.openConcordanceNavigator, this);
        
        var concNavOnStart = window.getPreference('concordance_navigator_open_on_start', true);
        if(concNavOnStart != null && concNavOnStart) {
            this.desktop.taskbar.setConcordanceNavigatorButtonToggleState(true, true);
            Ext.defer(this.openConcordanceNavigator, 1000, this);
        }
        
        this.desktop.taskbar.addListener('openHelp', this.openHelp, this);
        //TODO: Suchfenster einbauen
        /*this.desktop.taskbar.addListener('openSearchWindow', this.openSearchWindow, this);*/

        this.desktop.taskbar.addListener('sortGrid', this.sortGrid, this);
        this.desktop.taskbar.addListener('sortHorizontally', this.sortHorizontally, this);
        this.desktop.taskbar.addListener('sortVertically', this.sortVertically, this);
    },

    addWindowToActiveDesktop: function(window) {
        this.desktop.addWindow(window);
    },

    getActiveDesktop: function() {
        return this.desktop;
    },

    openConcordanceNavigator: function() {
        var me = this;
        me.desktop.openConcordanceNavigator();
    },

    // Shared factory behind openHelp/openAbout/openSearch/openAudioView. Owns
    // everything that is identical across those windows: the web component
    // host + shadow root, the ExtJS<->WinBox z-index coordinator, the ExtJS
    // window-manager proxy object (show/hide/minimize/restore/close), and the
    // WinBox instance itself. Callers only supply the window's id/title/size/
    // html plus optional hooks for their own content-specific behavior:
    //   - findExisting(w): return true to reuse an already-open window
    //     instead of creating a new one (e.g. Search's singleton, Audio's
    //     per-uri reuse). Omit to always open a fresh window (Help/About).
    //   - onReuse(existingProxy): called when findExisting matched.
    //   - proxyExtras: plain object merged onto the proxy (e.g. isSearchProxy,
    //     uri) so findExisting/other code can identify this window later.
    //   - onOpen(winbox, winboxEl, host, proxy): called once the window has
    //     been created and registered, for wiring content-specific behavior
    //     (search bar events, audio track loading, anchor-scroll links...).
    createWinBoxWindow: function(opts) {
        var me = this;
        var desktop = me.desktop;

        // Ensure the web component host exists first so the shadow root is available
        var host = document.getElementById('ediromWindowsHost');
        if (!host) {
            host = document.createElement('edirom-windows');
            host.id = 'ediromWindowsHost';
            document.body.appendChild(host);
        }

        // Coordinate stacking between the WinBox host overlay and the ExtJS window
        // manager. The host's :host rule pins z-index to 99999, so without this it
        // would always float above every ExtJS window. We install a single
        // document-level mousedown listener that:
        //   - raises the host above the topmost ExtJS window when the user clicks
        //     inside a WinBox window, and
        //   - lowers the host just below the topmost ExtJS window when the user
        //     clicks anything else (an ExtJS window, the navigator, the desktop).
        // The work is deferred with setTimeout(0) so ExtJS has already restacked
        // the clicked window before we read the maximum z-index.
        var maxExtZ = function() {
            var maxZ = 0;
            desktop.getActiveWindowsSet().each(function(w) {
                if (w && w.el && w.el.dom) {
                    var z = parseInt(w.el.getStyle('z-index'), 10);
                    if (!isNaN(z) && z > maxZ) maxZ = z;
                }
            });
            return maxZ;
        };
        // A real ediromWindow wrapped into a WinBox (see wrapEdiromWindowInWinBox)
        // can open its own ExtJS menus (Ansicht/Anmerkungen/...), which get a
        // z-index just above the window's - far below host z-index+100. Cap the
        // host below any currently open menu so it never overshoots one and
        // silently swallows clicks on the menu's items.
        var capBelowOpenMenu = function(z) {
            if (Ext.menu.Manager && Ext.menu.Manager.active) {
                var menuZ = 0;
                Ext.menu.Manager.active.each(function(m) {
                    if (m && m.el && m.el.dom) {
                        var mz = parseInt(m.el.getStyle('z-index'), 10);
                        if (!isNaN(mz) && mz > menuZ) menuZ = mz;
                    }
                });
                if (menuZ && z >= menuZ) return menuZ - 1;
            }
            return z;
        };
        if (!host._zIndexCoordInstalled) {
            host._zIndexCoordInstalled = true;
            document.addEventListener('mousedown', function(e) {
                var h = document.getElementById('ediromWindowsHost');
                if (!h) return;
                var path = (typeof e.composedPath === 'function') ? e.composedPath() : [];
                var winboxEl = null;
                for (var i = 0; i < path.length; i++) {
                    var n = path[i];
                    if (n && n.classList && n.classList.contains('winbox')) { winboxEl = n; break; }
                }
                var inWinbox = !!winboxEl;
                // Raise the clicked WinBox window above its siblings. WinBox's own
                // mousedown->focus binding is unreliable inside the shadow DOM, so
                // focus the matching window explicitly here; otherwise clicking a
                // window sitting below an explicitly-focused one (e.g. clicking
                // Help while Search was raised) would not bring it to the front.
                if (winboxEl) {
                    desktop.getActiveWindowsSet().each(function(w) {
                        if (w && w._winbox && w._winbox.id === winboxEl.id && w._winbox.focus) {
                            w._winbox.focus();
                            return false;
                        }
                    });
                }
                var doRecompute = function() {
                    var maxZ = maxExtZ();
                    if (inWinbox) {
                        h.style.zIndex = capBelowOpenMenu(maxZ + 100);
                    } else {
                        // Only an actual ExtJS window click (a document viewer
                        // etc.) lowers the host below the ExtJS stack. Clicks on
                        // Edirom chrome (taskbar buttons, topbar, navigator, empty
                        // desktop) leave the host untouched, so minimizing one
                        // WinBox window via its taskbar button does not drag the
                        // other WinBox windows behind the ExtJS windows.
                        var inExtWindow = false;
                        for (var k = 0; k < path.length; k++) {
                            var en = path[k];
                            if (en && en.classList && en.classList.contains('x-window')) { inExtWindow = true; break; }
                        }
                        if (inExtWindow) h.style.zIndex = Math.max(0, maxZ - 1);
                    }
                };
                // A click that opens a real ExtJS menu (Ansicht/Anmerkungen/...
                // inside a wrapped ediromWindow) can register the menu as
                // active slightly AFTER this tick (Ext's button menu-show can
                // defer past the current tick) - retry a few times over ~300ms
                // so capBelowOpenMenu picks it up once it truly exists.
                setTimeout(doRecompute, 0);
                setTimeout(doRecompute, 50);
                setTimeout(doRecompute, 150);
                setTimeout(doRecompute, 300);
            }, true);
        }

        function getShadowEl(id) {
            return host.shadowRoot && host.shadowRoot.getElementById(id);
        }

        if (opts.findExisting) {
            var existing = null;
            desktop.getActiveWindowsSet().each(function(w) {
                if (opts.findExisting(w)) { existing = w; return false; }
            });
            if (existing) {
                existing.show();
                if (opts.onReuse) opts.onReuse(existing);
                return existing;
            }
        }

        var winId = opts.id;

        var doOpen = function() {
            // Constrain the WinBox host to Edirom's usable content area (below
            // the topbar, left of the navigator) so the window can not cover
            // and block the topbar, taskbar or navigator.
            var usable = desktop.getUsableSize();
            var bodyXY = desktop.body.getXY();
            host.style.position = 'fixed';
            host.style.top = bodyXY[1] + 'px';
            host.style.left = bodyXY[0] + 'px';
            host.style.width = usable.width + 'px';
            host.style.height = usable.height + 'px';
            host.style.right = 'auto';
            host.style.bottom = 'auto';

            var raiseHostAboveExt = function() {
                host.style.zIndex = capBelowOpenMenu(maxExtZ() + 100);
                // Re-assert on the next tick so this raise wins against the
                // document mousedown coordinator. The topbar/taskbar buttons
                // that open or re-focus a WinBox window are OUTSIDE any
                // .winbox, so that same click queues a host-lowering
                // (setTimeout 0) which would otherwise drop the window behind
                // the ExtJS windows right after this synchronous raise.
                setTimeout(function() { host.style.zIndex = capBelowOpenMenu(maxExtZ() + 100); }, 0);
            };

            var winWidth = Math.max(320, Math.min(opts.maxWidth || 700, usable.width - 20));
            var winHeight = Math.max(opts.minHeight || 240, Math.min(opts.maxHeight || 600, usable.height - 20));

            var winTitle = opts.title;

            var proxy = {
                isWindow: true,
                isExtWindowProxy: true,
                hidden: false,
                minimized: false,
                maximized: false,
                active: true,
                title: winTitle,
                iconCls: undefined,
                taskButton: null,
                animateTarget: null,
                on: function() { return this; },
                un: function() { return this; },
                getPosition: function() {
                    if (this._winbox) {
                        return [this._winbox.x || 0, this._winbox.y || 0];
                    }
                    var el = getShadowEl(winId);
                    if (el) {
                        return [parseInt(el.style.left, 10) || 0, parseInt(el.style.top, 10) || 0];
                    }
                    return [0, 0];
                },
                isVisible: function() {
                    return !this.hidden;
                },
                // sortHorizontally/sortVertically/sortGrid pass page-absolute x/y
                // (the same coordinate space real ExtJS windows use), but WinBox's
                // own move() expects coordinates relative to the WinBox host
                // element (#ediromWindowsHost, positioned at desktop.body's page
                // XY) -> translate by subtracting the host's current page position.
                setPosition: function(x, y) {
                    if (this._winbox) {
                        var bodyXY = desktop.body.getXY();
                        this._winbox.move(x - bodyXY[0], y - bodyXY[1]);
                    }
                },
                setSize: function(width, height) {
                    if (this._winbox) this._winbox.resize(width, height);
                },
                // WinBox windows have no facsimile/viewport state worth
                // preserving across a re-arrange (unlike source/facsimile
                // windows) - see the arrange functions in the Desktop
                // controller for how these are used.
                getContentConfig: function() { return null; },
                setContentConfig: function() {},
                // Used by the arrange (sortHorizontally/sortVertically/sortGrid)
                // window-manager actions in place of Ext.Component#animate -
                // WinBox has no built-in tween, so this just moves/resizes
                // immediately and then invokes the afteranimate listener.
                animate: function(config) {
                    var to = (config && config.to) || {};
                    if (typeof to.width === 'number' && typeof to.height === 'number') {
                        this.setSize(to.width, to.height);
                    }
                    if (typeof to.x === 'number' && typeof to.y === 'number') {
                        this.setPosition(to.x, to.y);
                    }
                    if (config && config.listeners && typeof config.listeners.afteranimate === 'function') {
                        config.listeners.afteranimate();
                    }
                },
                hide: function() {
                    var el = getShadowEl(winId);
                    if (el) el.style.display = 'none';
                    this.hidden = true;
                },
                show: function(animTarget, callback) {
                    var el = getShadowEl(winId);
                    if (el) el.style.display = '';
                    raiseHostAboveExt();
                    if (proxy._winbox) {
                        proxy._winbox.restore();
                        if (proxy._winbox.focus) proxy._winbox.focus();
                    }
                    this.hidden = false;
                    this.minimized = false;
                    this.active = true;
                    if (this.taskButton) {
                        this.taskButton.toggle(true);
                        this.taskButton.enable();
                    }
                    if (typeof callback === 'function') callback();
                },
                restore: function() {
                    this.show();
                    this.minimized = false;
                },
                minimize: function() {
                    var el = getShadowEl(winId);
                    if (el) el.style.display = 'none';
                    this.hidden = true;
                    this.minimized = true;
                    this.active = false;
                    if (this.taskButton) {
                        this.taskButton.toggle(false);
                        this.taskButton.enable();
                    }
                },
                maximize: function() {},
                toFront: function() {
                    var el = getShadowEl(winId);
                    if (el) el.style.display = '';
                    raiseHostAboveExt();
                    if (proxy._winbox && proxy._winbox.focus) proxy._winbox.focus();
                },
                close: function() {
                    var el = getShadowEl(winId);
                    if (el) el.remove();
                    if (desktop && this.taskButton) {
                        desktop.getActiveWindowsSet().remove(this);
                        desktop.taskbar.removeTaskButton(this.taskButton);
                        desktop.updateActiveWindow();
                    }
                },
                destroy: function() { this.close(); }
            };

            if (opts.proxyExtras) Ext.apply(proxy, opts.proxyExtras);

            // Cascade each new WinBox window a bit further down/right than the last,
            // otherwise every one opens at the exact same spot (x:10,y:5) and stacks
            // perfectly on top of the others, making it look like only one exists.
            var openWinboxCount = host.shadowRoot.querySelectorAll('.winbox').length;
            var cascadeStep = (openWinboxCount % 10) * 24;

            var winbox = new WinBox({
                id: winId,
                title: winTitle,
                html: opts.html,
                width: winWidth,
                height: winHeight,
                x: 10 + cascadeStep,
                y: 5 + cascadeStep,
                background: 'linear-gradient(to bottom, #e6e6e6, #ccc)',
                root: host.shadowRoot.getElementById('winbox-container'),
                index: 100000,
                onfocus: function() {
                    proxy.active = true;
                    raiseHostAboveExt();
                    if (proxy.taskButton) proxy.taskButton.toggle(true);
                },
                onblur: function() {
                    // Do NOT set proxy.active = false here.
                    // WinBox blur means another WinBox window was focused,
                    // but from the taskbar's perspective this window is still
                    // open/visible — the taskbar button should stay pressed
                    // and the next click should minimize, not toFront.
                },
                onminimize: function() {
                    // Cancel WinBox native minimize — we handle it ourselves
                    var el = getShadowEl(winId);
                    if (el) el.style.display = 'none';
                    proxy.hidden = true;
                    proxy.minimized = true;
                    proxy.active = false;
                    if (proxy.taskButton) proxy.taskButton.toggle(false);
                    return false; // prevent WinBox default minimize (strip at bottom)
                },
                onresize: function(width, height) {
                    if (opts.onResize) opts.onResize(width, height, winbox);
                },
                onclose: function() {
                    proxy.close();
                }
            });

            proxy._winbox = winbox;

            // Bring the freshly opened window to the front above any
            // already-focused WinBox window (all are created with the
            // same base z-index, so a new one would otherwise open
            // beneath a previously raised sibling). WinBox auto-marks a
            // freshly created window as focused, so focus() alone is a
            // no-op; blur() first to clear that flag, then focus() bumps
            // its z-index above every other WinBox window.
            if (winbox.focused && winbox.blur) winbox.blur();
            if (winbox.focus) winbox.focus();

            desktop.addWebComponentWindow(proxy);
            raiseHostAboveExt();

            if (opts.onOpen) opts.onOpen(winbox, getShadowEl(winId), host, proxy);
        };

        if (typeof WinBox !== 'undefined') {
            doOpen();
        } else {
            var poll = setInterval(function() {
                if (typeof WinBox !== 'undefined') {
                    clearInterval(poll);
                    doOpen();
                }
            }, 100);
        }
    },

    // PROTOTYPE: wraps an already-rendered REAL ediromWindow (win.applyWinBoxChrome()
    // must already have been called, before win.show()) in a WinBox shell, instead
    // of rewriting its content as plain HTML like createWinBoxWindow's callers do.
    // The Ext window instance stays alive and registered with the desktop/taskbar as
    // normal - only its rendered DOM is moved into the WinBox body. This lets a
    // window with real ExtJS components inside (sourceView's image viewer/toolbar/
    // annotation menus, etc.) keep working unmodified while WinBox supplies the
    // visible frame (title bar, move, resize, minimize, close) instead of ExtJS's own.
    //
    // NOTE: content CANNOT be rendered directly into the WinBox body from the
    // start instead of reparenting afterward - confirmed live that ExtJS4's
    // render-finishing internals (finishRender/finishRenderItems) look up
    // freshly-inserted child elements via document.getElementById(id), which
    // cannot see into the WinBox host's shadow root and throws
    // "Cannot read properties of null (reading 'dom')every time. Rendering
    // normally into document.body first (where getElementById works) and only
    // THEN moving the finished DOM into the shadow root sidesteps this entirely.
    wrapEdiromWindowInWinBox: function(win) {
        var me = this;
        var desktop = me.desktop;

        var host = document.getElementById('ediromWindowsHost');
        if (!host) {
            host = document.createElement('edirom-windows');
            host.id = 'ediromWindowsHost';
            document.body.appendChild(host);
        }

        var maxExtZ = function() {
            var maxZ = 0;
            desktop.getActiveWindowsSet().each(function(w) {
                if (w && w.el && w.el.dom) {
                    var z = parseInt(w.el.getStyle('z-index'), 10);
                    if (!isNaN(z) && z > maxZ) maxZ = z;
                }
            });
            return maxZ;
        };
        // This window can open its own ExtJS menus (Ansicht/Anmerkungen/...),
        // which get a z-index just above the window's - far below host
        // z-index+100. Cap the host below any currently open menu so it never
        // overshoots one and silently swallows clicks on the menu's items.
        var capBelowOpenMenu = function(z) {
            if (Ext.menu.Manager && Ext.menu.Manager.active) {
                var menuZ = 0;
                Ext.menu.Manager.active.each(function(m) {
                    if (m && m.el && m.el.dom) {
                        var mz = parseInt(m.el.getStyle('z-index'), 10);
                        if (!isNaN(mz) && mz > menuZ) menuZ = mz;
                    }
                });
                if (menuZ && z >= menuZ) return menuZ - 1;
            }
            return z;
        };
        if (!host._zIndexCoordInstalled) {
            host._zIndexCoordInstalled = true;
            document.addEventListener('mousedown', function(e) {
                var h = document.getElementById('ediromWindowsHost');
                if (!h) return;
                var path = (typeof e.composedPath === 'function') ? e.composedPath() : [];
                var winboxEl = null;
                for (var i = 0; i < path.length; i++) {
                    var n = path[i];
                    if (n && n.classList && n.classList.contains('winbox')) { winboxEl = n; break; }
                }
                var inWinbox = !!winboxEl;
                if (winboxEl) {
                    desktop.getActiveWindowsSet().each(function(w) {
                        if (w && w._winbox && w._winbox.id === winboxEl.id && w._winbox.focus) {
                            w._winbox.focus();
                            return false;
                        }
                    });
                }
                var doRecompute = function() {
                    var maxZ = maxExtZ();
                    if (inWinbox) {
                        h.style.zIndex = capBelowOpenMenu(maxZ + 100);
                    } else {
                        var inExtWindow = false;
                        for (var k = 0; k < path.length; k++) {
                            var en = path[k];
                            if (en && en.classList && en.classList.contains('x-window')) { inExtWindow = true; break; }
                        }
                        if (inExtWindow) h.style.zIndex = Math.max(0, maxZ - 1);
                    }
                };
                // A click that opens this window's own ExtJS menu (Ansicht/
                // Anmerkungen/...) can register the menu as active slightly
                // AFTER this tick (Ext's button menu-show can defer past the
                // current tick) - retry a few times over ~300ms so
                // capBelowOpenMenu picks it up once it truly exists.
                setTimeout(doRecompute, 0);
                setTimeout(doRecompute, 50);
                setTimeout(doRecompute, 150);
                setTimeout(doRecompute, 300);
            }, true);
        }

        function getShadowEl(id) {
            return host.shadowRoot && host.shadowRoot.getElementById(id);
        }

        // wb.body's own size (.wb-body) is CONTENT-driven in this WinBox build,
        // not parent-driven - reading wb.body.clientWidth/clientHeight to decide
        // the Ext window's new size is circular (reflects whatever size we last
        // forced onto it). Use the WinBox instance's own width/height/header
        // instead - the exact values WinBox itself just applied.
        // IMPORTANT: pass the explicit (w, h) WinBox's onresize callback receives
        // as arguments, NOT wb.width/wb.height - maximize()/restore()/the
        // minimize taskbar splitscreen layout all call resize(w, h, /*skipUpdate*/true)
        // internally, which still fires onresize(w, h) with the correct new size
        // but deliberately leaves wb.width/wb.height at their OLD (pre-maximize)
        // values. Reading wb.width/wb.height instead of the callback args is why
        // maximize/restore visually resized the WinBox chrome but left the
        // reparented ExtJS content at its old (now too-small) size.
        function computeBodySize(wb, w, h) {
            // WinBox's title-bar height is exposed as the numeric `h` property,
            // NOT `header` (that name doesn't exist on this WinBox build) - using
            // the wrong name silently evaluated to 0, sizing the Ext window to the
            // WinBox's FULL outer height and overflowing the visible body by the
            // title-bar's height (docked bottom bars/footers got pushed out of view).
            var headerH = wb.h || 0;
            var width = (typeof w === 'number') ? w : wb.width;
            var height = (typeof h === 'number') ? h : wb.height;
            return { w: width, h: Math.max(0, height - headerH) };
        }

        var doWrap = function() {
            var usable = desktop.getUsableSize();
            var bodyXY = desktop.body.getXY();
            host.style.position = 'fixed';
            host.style.top = bodyXY[1] + 'px';
            host.style.left = bodyXY[0] + 'px';
            host.style.width = usable.width + 'px';
            host.style.height = usable.height + 'px';
            host.style.right = 'auto';
            host.style.bottom = 'auto';

            // WinBox's own maximize()/fullscreen() size against the FULL page
            // viewport (document.documentElement.clientWidth/Height), not our
            // host's own (smaller, topbar/taskbar/navigator-excluding) usable
            // area - without any margin config, maximizing covers the topbar
            // and taskbar instead of stopping at their edges.
            // WinBox's maximize() does BOTH `resize(root_w-left-right,
            // root_h-top-bottom, true)` AND `move(this.left, this.top, true)`
            // using the SAME this.top/this.left values - i.e. it assumes the
            // margin (page-viewport-relative) and the position (HOST-relative,
            // since .winbox is positioned via nested position:absolute
            // ancestors rooted at our own fixed/offset host) are the SAME
            // coordinate space. They are NOT here: our host already starts
            // BELOW the topbar, so .winbox's own host-relative top must stay 0
            // - passing the topbar's height as `top` here would make
            // maximize() double-count it (host offset + winbox's own
            // move-to-top offset), pushing the maximized window's top edge
            // down by the topbar's height (a visible gap under the topbar)
            // and its bottom edge down by the same amount (covering the
            // taskbar). Fold the vertical/horizontal top/left margins into
            // bottom/right instead, so maximize()'s SIZE calculation still
            // subtracts the full page-relative margin, while its POSITION
            // (top/left) stays 0 - matching the host-relative origin.
            var pageW = document.documentElement.clientWidth;
            var pageH = document.documentElement.clientHeight;
            var marginTop = bodyXY[1];
            var marginLeft = bodyXY[0];
            var marginRight = Math.max(0, pageW - (bodyXY[0] + usable.width)) + marginLeft;
            var marginBottom = Math.max(0, pageH - (bodyXY[1] + usable.height)) + marginTop;

            var raiseHostAboveExt = function() {
                var recompute = function() {
                    host.style.zIndex = capBelowOpenMenu(maxExtZ() + 100);
                };
                recompute();
                // A menu opening (Ansicht/Anmerkungen/...) is itself a delayed
                // side-effect of the mousedown/click that raised the host (Ext's
                // button menu-show can defer past the current tick), so a single
                // setTimeout(0) recompute can still run BEFORE the menu is
                // registered as active and miss capping below it. Retry a few
                // times over ~300ms - cheap, and self-corrects whichever timing
                // Ext actually used without depending on internal event ordering.
                setTimeout(recompute, 0);
                setTimeout(recompute, 50);
                setTimeout(recompute, 150);
                setTimeout(recompute, 300);
            };

            var openWinboxCount = host.shadowRoot.querySelectorAll('.winbox').length;
            var cascadeStep = (openWinboxCount % 10) * 24;
            var winId = 'winbox_' + win.id;
            var initialBounds = win.winBoxInitialBounds || {};

            // Ext.window.Window#setSize (still technically a floating component
            // internally, even with drag/resize/animateTarget stripped) can
            // reassert its OWN remembered pre-reparent page position (x/y from
            // before wrapEdiromWindowInWinBox ran) as a side effect of resizing -
            // observed concretely as `win.el.dom.style.top` jumping back to the
            // window's original page Y (e.g. the topbar height) after a
            // maximize, visually detaching the content from the WinBox body
            // (the body then shows empty/white below the title bar, while the
            // real content floats near the top of the page instead). Re-pin
            // position to (0,0) after every setSize call to counter this. Must
            // be defined BEFORE `new WinBox(...)` - WinBox invokes onresize
            // synchronously during its own construction.
            var setWinSize = function(w, h) {
                win.setSize(w, h);
                win.el.dom.style.left = '0';
                win.el.dom.style.top = '0';
                Ext.defer(function() {
                    if (!win.destroyed && win.el) {
                        win.el.dom.style.left = '0';
                        win.el.dom.style.top = '0';
                    }
                }, 0);
            };

            var winbox = new WinBox({
                id: winId,
                // top/left stay 0 (see the comment above marginTop/marginLeft) -
                // maximize()'s move() uses these as the host-relative
                // destination position, which should be the host's own
                // origin, not the topbar/navigator's page-relative height/width.
                top: 0,
                left: 0,
                right: marginRight,
                bottom: marginBottom,
                title: win.title,
                width: initialBounds.width || Math.max(320, Math.min(900, usable.width - 20)),
                height: initialBounds.height || Math.max(240, Math.min(700, usable.height - 20)),
                // x/y (and existing move() calls elsewhere, e.g.
                // arrangeWinBoxWindow) are relative to the HOST's own CSS box
                // (the host is already `position:fixed` at bodyXY on the page,
                // and .winbox is positioned relative to that, via
                // #winbox-container's own position:absolute) - do NOT add the
                // top/left margins here, that would double-count the topbar
                // offset the host's own placement already provides.
                x: typeof initialBounds.x === 'number' ? initialBounds.x : 10 + cascadeStep,
                y: typeof initialBounds.y === 'number' ? initialBounds.y : 5 + cascadeStep,
                background: 'linear-gradient(to bottom, #e6e6e6, #ccc)',
                noFull: !!win.winBoxNoFull,
                root: host.shadowRoot.getElementById('winbox-container'),
                index: 100000,
                onfocus: function() {
                    raiseHostAboveExt();
                },
                onminimize: function() {
                    // win.minimize() -> Desktop.minimizeWindow -> win.hide(), which
                    // the 'hide' listener below mirrors onto the WinBox shell.
                    win.minimize();
                    return false; // cancel WinBox's own strip-to-bottom minimize UI
                },
                onresize: function(w, h) {
                    // WinBox calls onresize synchronously from its OWN constructor
                    // (before `winbox = new WinBox(...)` below has been assigned),
                    // so read sizing off `this` (WinBox binds callbacks to the
                    // instance), not the outer `winbox` variable. Use the (w, h)
                    // arguments (see computeBodySize's comment) so maximize/restore/
                    // minimize-splitscreen resizes reach the ExtJS content too.
                    var size = computeBodySize(this, w, h);
                    setWinSize(size.w, size.h);
                    var currentWinbox = this;
                    Ext.defer(function() {
                        if (currentWinbox.body) {
                            setWinSize(currentWinbox.body.offsetWidth, currentWinbox.body.offsetHeight);
                        }
                    }, 0);
                },
                onclose: function() {
                    win._wbWrapperClosing = true;
                    win.close();
                }
            });

            win._winbox = winbox;

            // Move the already-rendered Ext window DOM into the WinBox body. Its
            // native drag/resize/shadow/genie-animation is already stripped by
            // win.applyWinBoxChrome(), so WinBox's own title bar/move/resize
            // handles become the only visible frame. The native ExtJS header
            // (title bar) was intentionally left ENABLED at render time (see
            // applyWinBoxChrome's comment) - hide it now that it has safely
            // rendered, so it doesn't show a redundant second title bar.
            // edirom-windows.js mirrors every compiled stylesheet from the main
            // document into its shadow root already, so the reparented ExtJS
            // content keeps its theme CSS.
            if (win.header && win.header.hide) win.header.hide();

            var bodyEl = winbox.body || getShadowEl(winId).querySelector('.wb-body');
            bodyEl.appendChild(win.el.dom);
            win.el.dom.style.position = 'relative';
            win.el.dom.style.left = '0';
            win.el.dom.style.top = '0';

            var initialSize = computeBodySize(winbox);
            setWinSize(initialSize.w, initialSize.h);

            var positionObserver = new MutationObserver(function() {
                if (win.el.dom.style.left !== '0px') win.el.dom.style.left = '0';
                if (win.el.dom.style.top !== '0px') win.el.dom.style.top = '0';
            });
            positionObserver.observe(win.el.dom, {
                attributes: true,
                attributeFilter: ['style']
            });

            var bodySizeObserver = null;
            if (typeof ResizeObserver !== 'undefined') {
                bodySizeObserver = new ResizeObserver(function(entries) {
                    var rect = entries[0].contentRect;
                    var width = Math.round(rect.width);
                    var height = Math.round(rect.height);
                    if (win.getWidth() !== width || win.getHeight() !== height) {
                        setWinSize(width, height);
                    } else {
                        win.el.dom.style.left = '0';
                        win.el.dom.style.top = '0';
                    }
                });
                bodySizeObserver.observe(bodyEl);
            }

            // Keep the WinBox shell in sync with the real window's own lifecycle,
            // however it gets hidden/shown/destroyed (minimize/restore via the
            // taskbar button, "Alle Fenster schließen" from the window menu, ...).
            // win.animateTarget was cleared by applyWinBoxChrome() so show()/hide()
            // fire these SYNCHRONOUSLY (no async genie animation to wait for).
            win.on({
                show: function() {
                    var el = getShadowEl(winId);
                    if (el) el.style.display = '';
                    // Clear WinBox's OWN minimized state - if the user minimized
                    // via WinBox's native .wb-min control (the only visible
                    // titlebar control, since the real Ext header is hidden),
                    // WinBox shrinks itself to a small strip and sets its
                    // internal this.min=true independently of our own
                    // hide()/show() (which only toggles display:none). Without
                    // this, restoring via the taskbar made the window reappear
                    // but still stuck at strip size - winbox.restore() clears
                    // the "min" class and resizes back, which (with the
                    // onresize fix above using its (w,h) args) also resizes the
                    // reparented Ext content back to normal.
                    if (winbox.min) winbox.restore();
                    raiseHostAboveExt();
                },
                hide: function() {
                    var el = getShadowEl(winId);
                    if (el) el.style.display = 'none';
                },
                destroy: function() {
                    positionObserver.disconnect();
                    if (bodySizeObserver) bodySizeObserver.disconnect();
                    if (win._winbox && !win._wbWrapperClosing) win._winbox.close();
                }
            });

            if (winbox.focused && winbox.blur) winbox.blur();
            if (winbox.focus) winbox.focus();
            raiseHostAboveExt();
        };

        // The WinBox script loads async (see edirom-windows.js _ensureWinboxAssets);
        // it is very likely already loaded by the time a sourceView opens (any
        // earlier Help/About/Audio/Verovio window would have triggered it), but
        // guard the very-first-window-ever case the same way createWinBoxWindow does.
        if (typeof WinBox !== 'undefined') {
            doWrap();
        } else {
            var poll = setInterval(function() {
                if (typeof WinBox !== 'undefined') {
                    clearInterval(poll);
                    doWrap();
                }
            }, 100);
        }
    },

    // In-page anchor navigation (href="#id") inside a WinBox window's shadow
    // DOM. Native fragment navigation can't reach the target since the browser
    // only searches the main document, so clicks on such links are intercepted
    // and the target is scrolled into view within the shadow root instead.
    wireInPageAnchors: function(winboxEl, host) {
        if (!winboxEl) return;
        winboxEl.addEventListener('click', function(e) {
            var a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
            if (!a) return;
            var targetId = a.getAttribute('href').substring(1);
            if (!targetId) return;
            var target = host.shadowRoot.getElementById(targetId);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ block: 'start' });
            }
        });
    },

    openHelp: function() {
        var me = this;
        window.doAJAXRequest('data/xql/getHelp.xql',
            'GET',
            { lang: window.getLanguage(), idPrefix: 'helpWin' },
            function(response) {
                me.createWinBoxWindow({
                    id: 'help-window-' + Date.now(),
                    title: getLangString('view.window.HelpWindow_Title'),
                    maxWidth: 750,
                    html: '<div style="overflow:auto;height:100%;"><div class="textViewContent" style="padding:10px;">' + response.responseText + '</div></div>',
                    onOpen: function(winbox, winboxEl, host) {
                        me.wireInPageAnchors(winboxEl, host);
                    }
                });
            }
        );
    },

    // About window — mirrors openHelp exactly, but renders the CITATION.cff
    // based "About" content inside the same WinBox web component.
    openAbout: function() {
        var me = this;
        me.buildAboutHtml(function(htmlContent) {
            me.createWinBoxWindow({
                id: 'about-window-' + Date.now(),
                title: getLangString('view.window.about.AboutWindow_Title'),
                html: htmlContent,
                onOpen: function(winbox, winboxEl, host) {
                    me.wireInPageAnchors(winboxEl, host);
                }
            });
        });
    },

    // Builds the "About" HTML from the frontend & backend CITATION.cff files
    // and passes the finished markup (wrapped for scrolling) to the callback.
    buildAboutHtml: function(cb) {
        var configController = EdiromOnline.getApplication().getController('ConfigController');
        var backendURL = configController && configController.hasConfig('backendURL') ? configController.getConfig('backendURL') : '@backend.url@';

        // Specify URLs of CITATION.cff files of frontend and backend
        var frontendURL = location.origin + location.pathname.replaceAll('/index.html', '/');
        var frontendURLcitation = frontendURL + 'resources/CITATION.cff';
        var backendURLcitation = backendURL + 'resources/CITATION.cff';

        var wrap = function(inner) {
            return '<div style="overflow:auto;height:100%;"><div class="textViewContent" style="padding:10px;">' + inner + '</div></div>';
        };

        // Fetching content of CITATION.cff files and turn into HTML
        async function fetchContent(url) {
            console.log('Fetching ' + url);

            const response = await fetch(url);
            const citation = await response.text();

            const title = citation.match(/^title: (.*)/m)[1];
            const abstract = String(citation.match(/^abstract:\s>-\n(\s+.*\n)+/gm)).replace(/^abstract:\s>-\n/, '');
            const version = citation.match(/^version: (.*)/m)[1];
            const releaseDate = citation.match(/^date\-released: (.*)/m)[1];
            const license = citation.match(/^license: (.*)/m)[1];
            const repoUrl = citation.match(/^repository\-code: (.*)/m)[1];
            const doi = citation.match(/value: .*?([0-9]+\.[0-9]+\/zenodo\.[0-9]+)/)[1];
            const commit = citation.match(/^commit: (.*)/m)[1];

            return `
                <h1>About ${title}</h1>
                <section class="teidiv0">
                    <p>${abstract}</p>
                    <p>Version: ${version}</p>
                    <p>Date: ${releaseDate}</p>
                    <p>DOI: <a target="_blank" href="https://doi.org/${doi}">${doi}</a></p>
                    <p>${getLangString('view.window.about.AboutWindow_License')}: ${license}</p>
                    <p>GitHub: <a target="_blank" href="${repoUrl}">${repoUrl}</a></p>
                    <p>Revision: <a target="_blank" href="${repoUrl}/tree/${commit}">${commit.substring(0,7)}...</a></p>
                    <p>Contributors: <br/>
                        <a target="_blank" href="${repoUrl}/graphs/contributors" title="See contributors to ${title} GitHub project">
                            <img height="50px" id="github-contributors" src="https://contrib.rocks/image?repo=${repoUrl.replace(/^https?:\/\/github.com\//, '')}&max=14&columns=7" alt="Avatars of contributors to ${title} in GitHub" />
                        </a>
                    </p>
                </section>
            `;
        }

        // Fetching content of CITATION.cff files and set result
        Promise.all([
            fetchContent(frontendURLcitation),
            fetchContent(backendURLcitation)
        ]).then(function(parts) {
            var frontend = parts[0];
            var backend = parts[1];
            cb(wrap(`
                <div class="tei_body">
                    <h1>About Edirom-Online</h1>
                    <section class="teidiv0">
                        <p>
                            Edirom-Online is a web-based platform for the collaborative editing of complex scholarly digital editions.
                            It is based on the TEI XML standard and provides a rich set of tools for the collaborative editing of texts, images, and other media.
                            Edirom-Online is developed by the Edirom Project.
                        </p>
                        <p>
                            The software consists of two main modules: the frontend and the backend.
                            Information about the parts of the software can be found below.
                        </p>
                    </section>
                    ${frontend}
                    ${backend}
                </div>`));
        }).catch(function(error) {
            console.error('Error fetching CITATION.cff files:', error);
            cb(wrap(`
                <div class="tei_body">
                    <h1>About Edirom-Online</h1>
                    <section class="teidiv0">
                        <p>
                            Edirom-Online is a web-based platform for the collaborative editing of complex scholarly digital editions.
                            It is based on the TEI XML standard and provides a rich set of tools for the collaborative editing of texts, images, and other media.
                            Edirom-Online is developed by the Edirom Project.
                        </p>
                        <p>
                            The software consists of two main modules: the frontend and the backend.
                            Information about the parts of the software can be found below.
                        </p>
                    </section>
                    <section class="teidiv0">
                        <p>Error fetching content from CITATION.cff files.</p>
                        <p>URL of backend CITATION.cff file: ${backendURLcitation}</p>
                        <p>URL of frontend CITATION.cff file: ${frontendURLcitation}</p>
                        <p>When encountering this or other issues persistently, please create a report on <a href="https://github.com/Edirom/Edirom-Online/issues/new/choose">https://github.com/Edirom/Edirom-Online/issues/new/choose</a></p>
                    </section>
                </div>`));
        });
    },

    // Search window — rendered with the WinBox web component (mirrors openHelp /
    // openAbout), but hosts an interactive search bar (text field + button) and a
    // results area. The window behaves as a singleton: a second search request
    // reuses the existing window, updates the term and re-runs the query.
    openSearch: function(term) {
        var me = this;
        term = term || '';

        var winId = 'search-window-' + Date.now();
        var searchLabel = getLangString('view.desktop.TaskBar_search');
        var html = ''
            + '<div class="searchWindow" style="display:flex;flex-direction:column;height:100%;box-sizing:border-box;">'
            +     '<div class="searchBar" style="display:flex;align-items:center;gap:4px;padding:4px 6px;">'
            +         '<input type="text" class="searchTextField" style="flex:1;min-width:0;" />'
            +         '<button type="button" class="doSearchBtn edirom-icon-button" title="' + searchLabel + '">'
            +             '<edirom-icon role="button" name="eo_search" title="' + searchLabel + '"></edirom-icon>'
            +         '</button>'
            +     '</div>'
            +     '<div class="searchResults" style="flex:1;overflow:auto;padding:0 6px 6px 6px;">'
            +         '<div id="' + winId + '_textCont" class="textViewContent"></div>'
            +     '</div>'
            + '</div>';

        me.createWinBoxWindow({
            id: winId,
            title: getLangString('view.window.search.SearchWindow_Title'),
            html: html,
            findExisting: function(w) { return !!(w && w.isSearchProxy); },
            onReuse: function(existing) {
                if (term && existing.runSearch) existing.runSearch(term);
                if (existing.focusSearchField) existing.focusSearchField();
            },
            proxyExtras: { isSearchProxy: true, hideTaskButton: true },
            onOpen: function(winbox, winboxEl, host, proxy) {
                var inputEl = winboxEl ? winboxEl.querySelector('.searchTextField') : null;
                var btnEl = winboxEl ? winboxEl.querySelector('.doSearchBtn') : null;

                var runSearch = function(searchTerm) {
                    if (inputEl) inputEl.value = searchTerm || '';
                    var contEl = host.shadowRoot.getElementById(winId + '_textCont');
                    if (contEl) contEl.innerHTML = '';
                    window.doAJAXRequest('data/xql/search.xql',
                        'GET',
                        {
                            term: searchTerm || '',
                            lang: window.getPreference('application_language')
                        },
                        function(response) {
                            var c = host.shadowRoot.getElementById(winId + '_textCont');
                            if (c) c.innerHTML = response.responseText;
                        }
                    );
                };

                proxy.runSearch = runSearch;
                proxy.focusSearchField = function() {
                    var inp = winboxEl ? winboxEl.querySelector('.searchTextField') : null;
                    if (inp) inp.focus();
                };

                if (inputEl) {
                    inputEl.addEventListener('keydown', function(e) {
                        if (e.key === 'Enter' || e.keyCode === 13) {
                            runSearch(inputEl.value);
                        }
                    });
                }
                if (btnEl) {
                    btnEl.addEventListener('click', function() {
                        runSearch(inputEl ? inputEl.value : '');
                    });
                }

                runSearch(term);
                if (inputEl) inputEl.focus();
            }
        });
    },

    // Audio window — rendered with the WinBox web component (mirrors openHelp /
    // openAbout / openSearch). Called by SingleWindowController.onMetaDataLoaded
    // instead of adding an ExtJS audioView tab whenever a clicked resource's
    // views include an audioView entry. Each click opens a separate player.
    // xmlUri: uri of the resource's sibling xmlView entry (if any), folded into
    // this same window as an "XML-Ansicht" mode instead of its own ExtJS tab.
    openAudioView: function(uri, label, xmlUri) {
        var me = this;

        // The tracks must be fetched BEFORE the <edirom-audio-player> element is
        // created: the component's render() assumes at least one track exists
        // (tracks[track].src) and throws if it first renders with none, which
        // leaves its shadow DOM permanently empty even after a later
        // setAttribute('tracks', ...) — confirmed live, see edirom-deploy.md.
        window.doAJAXRequest('data/xql/getAudio.xql',
            'GET',
            { uri: uri },
            function(response) {
                var resp = Ext.decode(response.responseText);
                var tracks = resp.audios;
                // HTML-attribute-escape the JSON (") so it can be embedded
                // directly in the double-quoted "tracks" attribute.
                var tracksAttr = Ext.JSON.encode(tracks).replace(/"/g, '&quot;');
                var winTitle = (label && label != '') ? label : getLangString('controller.window.Window_audioView');
                // Requests for distinct audio resources can complete within the
                // same millisecond. A sequence suffix avoids duplicate DOM and
                // WinBox ids, which otherwise makes one window replace another.
                me.audioWindowSequence = (me.audioWindowSequence || 0) + 1;
                var winId = 'audio-window-' + Date.now() + '-' + me.audioWindowSequence;
                var editorId = winId + '_xmlEditor';

                // Header mirrors the ExtJS window's TopBar: a single "Ansicht" (view)
                // dropdown switching between the Audio Player and a read-only XML view
                // of the same resource, with the XML view's own tools (A-/A+/Line#,
                // like the legacy XmlView) appearing in that same row only while active.
                // No footer, matching XmlView's lack of a BottomBar. Only rendered when
                // this resource actually has a sibling xmlView entry (xmlUri set).
                var toolbarHtml = xmlUri ? (''
                    +     '<div class="eoWinToolbar">'
                    +         '<select class="ansichtSelect">'
                    +             '<option value="audio">' + Ext.String.htmlEncode(getLangString('controller.window.Window_audioView')) + '</option>'
                    +             '<option value="xml">' + Ext.String.htmlEncode(getLangString('controller.window.Window_xmlView')) + '</option>'
                    +         '</select>'
                    +         '<button type="button" class="menuButton decreaseFont" style="display:none;">A-</button>'
                    +         '<button type="button" class="menuButton increaseFont" style="display:none;">A+</button>'
                    +         '<button type="button" class="menuButton lineNumbers" style="display:none;">Line #</button>'
                    +     '</div>'
                ) : '';
                var xmlBodyHtml = xmlUri ? (''
                    +     '<div class="xmlViewBody" style="flex:1;overflow:hidden;display:none;">'
                    +         '<pre id="' + editorId + '" style="position:relative;height:100%;width:100%;margin:0;"></pre>'
                    +     '</div>'
                ) : '';
                var html = ''
                    + '<div style="display:flex;flex-direction:column;height:100%;box-sizing:border-box;">'
                    +     toolbarHtml
                    +     '<div class="audioViewBody" style="flex:1;overflow:auto;">'
                    +         '<edirom-audio-player tracks="' + tracksAttr + '" height="auto" width="100%" state="pause" track="0" start="0.0" end="" playbackrate="1.0" playlist="true" progressbar="true"></edirom-audio-player>'
                    +     '</div>'
                    +     xmlBodyHtml
                    + '</div>';

                // Shared across onOpen/onResize below.
                var xmlEditor = null;
                var xmlLoaded = false;

                me.createWinBoxWindow({
                    id: winId,
                    title: winTitle,
                    maxWidth: 600,
                    maxHeight: 400,
                    minHeight: 180,
                    // height="auto" (not "100%"): the component's #player
                    // wrapper stretches to whatever height it's given, so a
                    // fixed WinBox height would push the track list way down
                    // below the (much shorter) controls bar.
                    html: html,
                    proxyExtras: { isAudioProxy: true, uri: uri },
                    onOpen: function(winbox, winboxEl, host) {
                        if (!winboxEl) return;

                        var ansichtSelect = winboxEl.querySelector('.ansichtSelect');
                        var decreaseFontBtn = winboxEl.querySelector('.decreaseFont');
                        var increaseFontBtn = winboxEl.querySelector('.increaseFont');
                        var lineNumbersBtn = winboxEl.querySelector('.lineNumbers');
                        var audioBody = winboxEl.querySelector('.audioViewBody');
                        var xmlBody = winboxEl.querySelector('.xmlViewBody');
                        var editorEl = host.shadowRoot.getElementById(editorId);

                        var showViewSpecificTools = function(show) {
                            var display = show ? 'inline-block' : 'none';
                            if (decreaseFontBtn) decreaseFontBtn.style.display = display;
                            if (increaseFontBtn) increaseFontBtn.style.display = display;
                            if (lineNumbersBtn) lineNumbersBtn.style.display = display;
                        };

                        var initXmlEditor = function() {
                            if (xmlEditor || !editorEl) return;
                            var XmlMode = ace.require('ace/mode/xml').Mode;
                            xmlEditor = ace.edit(editorEl);
                            xmlEditor.getSession().setMode(new XmlMode());
                            xmlEditor.getSession().setUseWrapMode(false);
                            xmlEditor.setShowPrintMargin(false);
                            xmlEditor.renderer.setHScrollBarAlwaysVisible(false);
                            xmlEditor.setReadOnly(true);

                            // ace.edit() injects its editor/mode CSS as <style> tags into
                            // document.head; that CSS can't reach elements inside our shadow
                            // root (style encapsulation), so without mirroring it the gutter
                            // renders (plain text) but the positioned text/cursor layers don't.
                            document.querySelectorAll('head > style').forEach(function(styleEl) {
                                if (!styleEl.id || !host.shadowRoot.getElementById(styleEl.id)) {
                                    host.shadowRoot.appendChild(styleEl.cloneNode(true));
                                }
                            });
                        };

                        var loadXmlContent = function() {
                            if (xmlLoaded) return;
                            xmlLoaded = true;
                            // internalId is sent (empty) for parity with the legacy
                            // controller.window.XmlView call — some backend queries
                            // expect the parameter to be present even if unused.
                            window.doAJAXRequest('data/xql/getXml.xql', 'GET', { uri: xmlUri, internalId: '' }, function(xmlResponse) {
                                var xml = xmlResponse && xmlResponse.responseText;
                                if (xmlEditor) xmlEditor.getSession().setValue(xml || '<!-- getXml.xql returned no content for ' + xmlUri + ' -->');
                            }, 0);
                        };

                        if (ansichtSelect) {
                            ansichtSelect.addEventListener('change', function() {
                                var showXml = ansichtSelect.value === 'xml';
                                if (audioBody) audioBody.style.display = showXml ? 'none' : '';
                                if (xmlBody) xmlBody.style.display = showXml ? '' : 'none';
                                showViewSpecificTools(showXml);
                                if (showXml) {
                                    initXmlEditor();
                                    loadXmlContent();
                                    if (xmlEditor) xmlEditor.renderer.onResize(true);
                                }
                            });
                        }
                        if (decreaseFontBtn) {
                            decreaseFontBtn.addEventListener('click', function() {
                                if (!editorEl) return;
                                var size = parseInt(getComputedStyle(editorEl).fontSize, 10) || 12;
                                editorEl.style.fontSize = (size - 1) + 'px';
                            });
                        }
                        if (increaseFontBtn) {
                            increaseFontBtn.addEventListener('click', function() {
                                if (!editorEl) return;
                                var size = parseInt(getComputedStyle(editorEl).fontSize, 10) || 12;
                                editorEl.style.fontSize = (size + 1) + 'px';
                            });
                        }
                        if (lineNumbersBtn) {
                            lineNumbersBtn.addEventListener('click', function() {
                                if (!xmlEditor) return;
                                xmlEditor.renderer.setShowGutter(!xmlEditor.renderer.getShowGutter());
                            });
                        }
                    },
                    onResize: function() {
                        if (xmlEditor) xmlEditor.renderer.onResize(true);
                    }
                });
            }
        );
    },

    // Verovio window — rendered with the WinBox web component, mirroring
    // openAudioView. Called by SingleWindowController.onMetaDataLoaded instead
    // of adding ExtJS tabs. Unlike audio (which only ever folds in a single
    // sibling xmlView), a Verovio-bearing resource typically also has a
    // textView + one or more xmlViews — the old ExtJS window showed ALL of
    // them as tabs switched via its TopBar's "Ansicht" button, with the
    // Verovio tab's own "Gehe zu" goto menu sitting right next to it in the
    // same header row. This reproduces both: `views` is the FULL raw views
    // array from getLinkTarget.xql (not just the verovioView entry).
    //
    // ALSO used for resources with NO verovioView at all — pure textView/
    // xmlView-only resources (e.g. front-matter documents like "Vorwort" or
    // "Lies mich!") fold into the same multi-pane WinBox, just without a
    // score pane or a "Gehe zu" menu (see the verovioPane guards below).
    openVerovioView: function(views, label) {
        var me = this;

        var panes = [];
        var xmlCount = 0, textCount = 0, iframeCount = 0;
        Ext.Array.each(views || [], function(view) {
            var paneKey, defaultLabel;
            if (view.type == 'verovioView') { paneKey = 'verovio'; defaultLabel = getLangString('controller.window.Window_verovioView'); }
            else if (view.type == 'textView') { paneKey = 'text-' + (textCount++); defaultLabel = getLangString('controller.window.Window_textView'); }
            else if (view.type == 'xmlView') { paneKey = 'xml-' + (xmlCount++); defaultLabel = getLangString('controller.window.Window_xmlView'); }
            else if (view.type == 'iFrameView') { paneKey = 'iframe-' + (iframeCount++); defaultLabel = getLangString('controller.window.Window_iFrameView'); }
            else return; // other view types stay out of this popup (e.g. would need their own WinBox)

            panes.push({
                key: paneKey,
                type: view.type,
                uri: view.uri,
                label: (view.label && view.label != '') ? view.label : defaultLabel,
                defaultView: !!view.defaultView
            });
        });

        var verovioPane = Ext.Array.findBy(panes, function(p) { return p.type == 'verovioView'; });
        if (panes.length === 0) return; // nothing to render

        var defaultPane = Ext.Array.findBy(panes, function(p) { return p.defaultView; }) || verovioPane || panes[0];
        var uri = verovioPane ? verovioPane.uri : defaultPane.uri;

        // Shared with onResize below (a sibling of onOpen, not nested inside it) so
        // an ace-editor xml pane can be resized while it's the active one.
        var panesByKey = {};
        Ext.Array.each(panes, function(p) {
            panesByKey[p.key] = { type: p.type, uri: p.uri, loaded: false, xmlEditor: null };
        });
        var activePaneKey = defaultPane.key;

        me.verovioWindowSequence = (me.verovioWindowSequence || 0) + 1;
        var winId = 'verovio-window-' + Date.now() + '-' + me.verovioWindowSequence;
        var winTitle = (label && label != '') ? label : getLangString('controller.window.Window_verovioView');

        var ansichtItemsHtml = '';
        Ext.Array.each(panes, function(p) {
            ansichtItemsHtml += '<div class="ansichtMenuItem" data-pane-key="' + p.key + '" style="padding:6px 10px;cursor:pointer;">' + Ext.String.htmlEncode(p.label) + '</div>';
        });

        var paneBodyHtml = '';
        Ext.Array.each(panes, function(p) {
            var displayStyle = (p.key === defaultPane.key) ? '' : 'display:none;';
            if (p.type == 'verovioView') {
                paneBodyHtml += '<div class="viewPane" data-pane-key="' + p.key + '" style="position:absolute;inset:0;' + displayStyle + '">'
                    +     '<iframe class="verovioIframe" style="width:100%;height:100%;border:0;display:block;"></iframe>'
                    + '</div>';
            } else if (p.type == 'textView') {
                paneBodyHtml += '<div class="viewPane textPane textViewContent" data-pane-key="' + p.key + '" style="position:absolute;inset:0;overflow:auto;padding:12px;box-sizing:border-box;' + displayStyle + '"></div>';
            } else if (p.type == 'xmlView') {
                paneBodyHtml += '<div class="viewPane xmlPane" data-pane-key="' + p.key + '" style="position:absolute;inset:0;' + displayStyle + '">'
                    +     '<pre id="' + winId + '_' + p.key + '" style="position:relative;height:100%;width:100%;margin:0;"></pre>'
                    + '</div>';
            } else if (p.type == 'iFrameView') {
                paneBodyHtml += '<div class="viewPane iframePane" data-pane-key="' + p.key + '" style="position:absolute;inset:0;' + displayStyle + '">'
                    +     '<iframe class="genericIframe" style="width:100%;height:100%;border:0;display:block;background:#fff;"></iframe>'
                    + '</div>';
            }
        });

        // "Ansicht" (view switcher) is only rendered with >1 pane, matching
        // TopBar.addView's own "only show the switcher when there's more than
        // one view" rule. Each dropdown lives in its own position:relative
        // wrapper so it opens right underneath its own button, not both at a
        // shared toolbar-relative offset.
        var ansichtHtml = panes.length > 1 ? (''
            + '<div class="ansichtWrap" style="position:relative;">'
            +     '<button type="button" class="menuButton ansichtBtn">' + Ext.String.htmlEncode(getLangString('view.window.TopBar_View')) + ' \u25BE</button>'
            +     '<div class="ansichtMenu" style="display:none;position:absolute;top:100%;left:0;background:#fff;border:1px solid #999;box-shadow:0 2px 6px rgba(0,0,0,.25);z-index:10;min-width:170px;">'
            +         ansichtItemsHtml
            +     '</div>'
            + '</div>'
        ) : '';

        // The toolbar row (Ansicht switcher / Verovio's Gehe-zu / xml font tools) is
        // only rendered when at least one of those is actually relevant — a single
        // pane, non-Verovio, non-xml resource (e.g. a plain iFrameView like "Vorwort")
        // would otherwise show an empty strip with nothing in it.
        var hasXmlPane = Ext.Array.some(panes, function(p) { return p.type == 'xmlView'; });
        var showToolbar = panes.length > 1 || !!verovioPane || hasXmlPane;

        var html = ''
            + '<div style="display:flex;flex-direction:column;height:100%;box-sizing:border-box;">'
            +     (showToolbar ? (''
            +     '<div class="eoWinToolbar verovioToolbar" style="flex:0 0 auto;padding:4px;border-bottom:1px solid #bbb;display:flex;gap:4px;">'
            +         ansichtHtml
            +         '<div class="gotoWrap" style="position:relative;">'
            +             '<button type="button" class="menuButton gotoBtn" style="' + (defaultPane.key === 'verovio' ? '' : 'display:none;') + '">' + Ext.String.htmlEncode(getLangString('view.window.source.SourceView_gotoMenu')) + ' \u25BE</button>'
            +             '<div class="gotoMenu" style="display:none;position:absolute;top:100%;left:0;background:#fff;border:1px solid #999;box-shadow:0 2px 6px rgba(0,0,0,.25);z-index:10;min-width:170px;">'
            +                 '<div class="gotoMenuItem gotoMeasureItem" style="padding:6px 10px;cursor:pointer;">' + Ext.String.htmlEncode(getLangString('view.window.source.SourceView_gotoMeasure')) + '</div>'
            +                 '<div class="gotoMenuItem gotoMovementItem" style="padding:6px 10px;cursor:pointer;position:relative;">'
            +                     Ext.String.htmlEncode(getLangString('view.window.source.SourceView_gotoMovement'))
            +                     '<div class="movementSubmenu" style="display:none;position:absolute;top:0;left:100%;background:#fff;border:1px solid #999;box-shadow:0 2px 6px rgba(0,0,0,.25);min-width:170px;"></div>'
            +                 '</div>'
            +             '</div>'
            +         '</div>'
            +         '<button type="button" class="menuButton decreaseFont" style="display:none;">A-</button>'
            +         '<button type="button" class="menuButton increaseFont" style="display:none;">A+</button>'
            +         '<button type="button" class="menuButton lineNumbers" style="display:none;">Line #</button>'
            +     '</div>'
            ) : '')
            +     '<div class="verovioViewBody" style="flex:1;position:relative;overflow:hidden;">'
            +         paneBodyHtml
            +         '<div class="gotoDialogOverlay" style="display:none;position:absolute;inset:0;background:rgba(0,0,0,.35);align-items:center;justify-content:center;">'
            +             '<div class="gotoDialog" style="background:#fff;border:1px solid #999;border-radius:4px;padding:16px;min-width:260px;box-shadow:0 2px 10px rgba(0,0,0,.3);">'
            +                 '<div style="font-weight:bold;margin-bottom:10px;">' + Ext.String.htmlEncode(getLangString('view.window.source.SourceView_GotoMsg_Title')) + '</div>'
            +                 '<label style="display:block;margin-bottom:8px;">' + Ext.String.htmlEncode(getLangString('view.window.source.SourceView_GotoMsg_MovmentNumber')) + '<select class="gotoMovementSelect" style="width:100%;margin-top:4px;box-sizing:border-box;"></select></label>'
            +                 '<label style="display:block;margin-bottom:12px;">' + Ext.String.htmlEncode(getLangString('view.window.source.SourceView_GotoMsg_Measure')) + '<input type="number" class="gotoMeasureInput" style="width:100%;margin-top:4px;box-sizing:border-box;"/></label>'
            +                 '<div style="display:flex;justify-content:flex-end;gap:8px;">'
            +                     '<button type="button" class="gotoCancelBtn">' + Ext.String.htmlEncode(getLangString('global_cancel')) + '</button>'
            +                     '<button type="button" class="gotoOkBtn">' + Ext.String.htmlEncode(getLangString('global_execute')) + '</button>'
            +                 '</div>'
            +             '</div>'
            +         '</div>'
            +     '</div>'
            + '</div>';

        me.createWinBoxWindow({
            id: winId,
            title: winTitle,
            maxWidth: 950,
            maxHeight: 750,
            minHeight: 400,
            html: html,
            proxyExtras: { isVerovioProxy: true, uri: uri },
            onOpen: function(winbox, winboxEl, host) {
                if (!winboxEl) return;

                var iframe = winboxEl.querySelector('.verovioIframe');
                var ansichtBtn = winboxEl.querySelector('.ansichtBtn');
                var ansichtMenu = winboxEl.querySelector('.ansichtMenu');
                var gotoBtn = winboxEl.querySelector('.gotoBtn');
                var gotoMenu = winboxEl.querySelector('.gotoMenu');
                var gotoMeasureItem = winboxEl.querySelector('.gotoMeasureItem');
                var gotoMovementItem = winboxEl.querySelector('.gotoMovementItem');
                var movementSubmenu = winboxEl.querySelector('.movementSubmenu');
                var gotoDialogOverlay = winboxEl.querySelector('.gotoDialogOverlay');
                var gotoMovementSelect = winboxEl.querySelector('.gotoMovementSelect');
                var gotoMeasureInput = winboxEl.querySelector('.gotoMeasureInput');
                var gotoCancelBtn = winboxEl.querySelector('.gotoCancelBtn');
                var gotoOkBtn = winboxEl.querySelector('.gotoOkBtn');
                var decreaseFontBtn = winboxEl.querySelector('.decreaseFont');
                var increaseFontBtn = winboxEl.querySelector('.increaseFont');
                var lineNumbersBtn = winboxEl.querySelector('.lineNumbers');

                var configController = EdiromOnline.getApplication().getController('ConfigController');
                var backendURL = configController && configController.hasConfig('backendURL') ? configController.getConfig('backendURL') : '@backend.url@';
                var edition = me.application.activeEdition;

                // Same iframe document as the old VerovioImage.setIFrameContent.
                var verovioHtml = '<html>'
                    +     '<head>'
                    +         '<title>Verovio</title>'
                    +         '<script src="https://www.verovio.org/javascript/latest/verovio-toolkit.js"></script>'
                    +         '<script src="https://code.jquery.com/jquery-3.5.1.min.js" integrity="sha256-9/aliU8dGd2tb6OSsuzixeV4y/faTqgFtohetphbbj0=" crossorigin="anonymous"></script>'
                    +         '<script src="//code.iconify.design/1/1.0.6/iconify.min.js"></script>'
                    +         '<script src="resources/js/edirom-verovio-renderer/edirom-verovio-renderer-component.js" type="text/javascript"></script>'
                    +         '<link rel="stylesheet" type="text/css" href="resources/css/verovio-view.css"/>'
                    +     '</head>'
                    +     '<body>'
                    +         '<script>'
                    +             'var uri = "' + uri + '";'
                    +             'var edition = "' + edition + '";'
                    +             'var movementId = "";'
                    +             'var appBasePath = "' + backendURL + '";'
                    +             'var meiUrl = appBasePath + "/data/xql/getMusicInMdiv.xql?uri=" + uri + "&edition=" + edition;'
                    +         '</script>'
                    +         '<div id="output"><div class="lds-roller"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div></div>'
                    +         '<div id="toolbar" class="noselect">'
                    +             '<span class="button" onclick="prevPage()"><span style="font-size: 1.3em;">&lt;</span></span>'
                    +             '<span id="page">1</span> / <span id="pageCount">1</span>'
                    +             '<span class="button" onclick="nextPage()"><span style="font-size: 1.3em;">&gt;</span></span>'
                    +         '</div>'
                    +         '<script src="resources/js/verovio-view.js"></script>'
                    +     '</body>'
                    + '</html>';

                if (verovioPane && iframe) {
                    iframe.contentWindow.document.open();
                    iframe.contentWindow.document.write(verovioHtml);
                    iframe.contentWindow.document.close();
                }

                var loadTextPane = function(pane, key) {
                    var el = winboxEl.querySelector('.textPane[data-pane-key="' + key + '"]');
                    window.doAJAXRequest('data/xql/getText.xql', 'GET', { uri: pane.uri, idPrefix: winId + '_' + key + '_', term: '', path: '' }, function(response) {
                        if (el) el.innerHTML = response.responseText || '';
                    });
                };

                var loadXmlPane = function(pane, key) {
                    window.doAJAXRequest('data/xql/getXml.xql', 'GET', { uri: pane.uri, internalId: '' }, function(response) {
                        var editorEl = host.shadowRoot.getElementById(winId + '_' + key);
                        if (!editorEl) return;
                        var XmlMode = ace.require('ace/mode/xml').Mode;
                        var xmlEditor = ace.edit(editorEl);
                        xmlEditor.getSession().setMode(new XmlMode());
                        xmlEditor.getSession().setUseWrapMode(false);
                        xmlEditor.setShowPrintMargin(false);
                        xmlEditor.renderer.setHScrollBarAlwaysVisible(false);
                        xmlEditor.setReadOnly(true);
                        xmlEditor.getSession().setValue(response.responseText || '');
                        // See the annotation-style CSS-into-shadow-root note in
                        // openAudioView: ace injects its CSS as <head><style>, which
                        // can't reach shadow content unless mirrored in (idempotent
                        // per style id, safe to call once per pane).
                        document.querySelectorAll('head > style').forEach(function(styleEl) {
                            if (!styleEl.id || !host.shadowRoot.getElementById(styleEl.id)) {
                                host.shadowRoot.appendChild(styleEl.cloneNode(true));
                            }
                        });
                        panesByKey[key].xmlEditor = xmlEditor;
                        panesByKey[key].editorEl = editorEl;
                        if (key === activePaneKey) showXmlTools(true);
                    });
                };

                var loadIFramePane = function(pane, key) {
                    var iframeEl = winboxEl.querySelector('.iframePane[data-pane-key="' + key + '"] iframe');
                    window.doAJAXRequest('data/xql/getiFrameURL.xql', 'GET', { uri: pane.uri }, function(response) {
                        if (iframeEl) iframeEl.src = response.responseText;
                    });
                };

                var ensurePaneLoaded = function(key) {
                    var pane = panesByKey[key];
                    if (!pane || pane.loaded || pane.type === 'verovioView') return;
                    pane.loaded = true;
                    if (pane.type === 'textView') loadTextPane(pane, key);
                    else if (pane.type === 'iFrameView') loadIFramePane(pane, key);
                    else if (pane.type === 'xmlView') loadXmlPane(pane, key);
                };

                var closeGotoMenu = function() {
                    if (gotoMenu) gotoMenu.style.display = 'none';
                    if (movementSubmenu) movementSubmenu.style.display = 'none';
                };
                var closeAnsichtMenu = function() {
                    if (ansichtMenu) ansichtMenu.style.display = 'none';
                };
                // A-/A+/Line# only apply to the active pane's own ace editor, matching
                // openAudioView's single-xmlView toggle (view.window.TopBar_View items
                // hide/show their view-specific tools per addViewSpecificItem).
                var showXmlTools = function(show) {
                    var display = show ? 'inline-block' : 'none';
                    if (decreaseFontBtn) decreaseFontBtn.style.display = display;
                    if (increaseFontBtn) increaseFontBtn.style.display = display;
                    if (lineNumbersBtn) lineNumbersBtn.style.display = display;
                };

                var activatePane = function(key) {
                    if (key === activePaneKey || !panesByKey[key]) return;
                    var prevEl = winboxEl.querySelector('.viewPane[data-pane-key="' + activePaneKey + '"]');
                    var nextEl = winboxEl.querySelector('.viewPane[data-pane-key="' + key + '"]');
                    if (prevEl) prevEl.style.display = 'none';
                    if (nextEl) nextEl.style.display = '';
                    activePaneKey = key;
                    var showGoto = panesByKey[key].type === 'verovioView';
                    if (gotoBtn) gotoBtn.style.display = showGoto ? '' : 'none';
                    if (!showGoto) closeGotoMenu();
                    // Only show once the pane's ace editor actually exists (loadXmlPane
                    // also calls this once the async getXml.xql fetch resolves).
                    showXmlTools(panesByKey[key].type === 'xmlView' && !!panesByKey[key].xmlEditor);
                    ensurePaneLoaded(key);
                };

                var gotoMeasureByAttributes = function(measureNumber, movementId) {
                    var iframeWin = iframe.contentWindow;
                    if (!iframeWin || !iframeWin.showMovement) return;
                    iframeWin.showMovement(movementId);
                    // Mirrors the old VerovioImage.gotoMeasureByAttributes: give the
                    // movement's renderer time to (re)initialize before pointing it
                    // at the requested measure number.
                    setTimeout(function() {
                        var renderer = iframeWin.document.getElementById('verovio-renderer');
                        if (renderer) renderer.setAttribute('measurenumber', measureNumber);
                    }, 500);
                };

                if (ansichtBtn) {
                    ansichtBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        var opening = ansichtMenu.style.display === 'none';
                        closeAnsichtMenu();
                        closeGotoMenu();
                        if (opening) ansichtMenu.style.display = 'block';
                    });
                    Ext.Array.each(winboxEl.querySelectorAll('.ansichtMenuItem'), function(item) {
                        item.addEventListener('click', function() {
                            closeAnsichtMenu();
                            activatePane(item.getAttribute('data-pane-key'));
                        });
                    });
                }

                if (gotoBtn) {
                    gotoBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        var opening = gotoMenu.style.display === 'none';
                        closeGotoMenu();
                        closeAnsichtMenu();
                        if (opening) gotoMenu.style.display = 'block';
                    });
                    gotoMovementItem.addEventListener('mouseenter', function() {
                        if (!gotoMovementItem.classList.contains('disabled')) movementSubmenu.style.display = 'block';
                    });
                    gotoMovementItem.addEventListener('mouseleave', function() {
                        movementSubmenu.style.display = 'none';
                    });
                    gotoMeasureItem.addEventListener('click', function() {
                        closeGotoMenu();
                        gotoMeasureInput.value = '';
                        gotoDialogOverlay.style.display = 'flex';
                        gotoMeasureInput.focus();
                    });
                }
                // Close the menus on any click outside them. Self-unregisters once
                // the window has been closed/removed (winboxEl.isConnected false).
                document.addEventListener('click', function outsideClick(e) {
                    if (!winboxEl.isConnected) { document.removeEventListener('click', outsideClick); return; }
                    var path = e.composedPath ? e.composedPath() : [];
                    if (ansichtBtn && path.indexOf(ansichtBtn) === -1 && path.indexOf(ansichtMenu) === -1) closeAnsichtMenu();
                    if (gotoBtn && path.indexOf(gotoBtn) === -1 && path.indexOf(gotoMenu) === -1) closeGotoMenu();
                });

                gotoCancelBtn.addEventListener('click', function() {
                    gotoDialogOverlay.style.display = 'none';
                });
                gotoOkBtn.addEventListener('click', function() {
                    var movementId = gotoMovementSelect.value;
                    var measureNumber = gotoMeasureInput.value;
                    gotoDialogOverlay.style.display = 'none';
                    if (!measureNumber) return;
                    gotoMeasureByAttributes(measureNumber, movementId);
                });
                gotoDialogOverlay.addEventListener('click', function(e) {
                    if (e.target === gotoDialogOverlay) gotoDialogOverlay.style.display = 'none';
                });
                gotoMeasureInput.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter') gotoOkBtn.click();
                    if (e.key === 'Escape') gotoCancelBtn.click();
                });

                if (decreaseFontBtn) {
                    decreaseFontBtn.addEventListener('click', function() {
                        var editorEl = panesByKey[activePaneKey] && panesByKey[activePaneKey].editorEl;
                        if (!editorEl) return;
                        var size = parseInt(getComputedStyle(editorEl).fontSize, 10) || 12;
                        editorEl.style.fontSize = (size - 1) + 'px';
                    });
                }
                if (increaseFontBtn) {
                    increaseFontBtn.addEventListener('click', function() {
                        var editorEl = panesByKey[activePaneKey] && panesByKey[activePaneKey].editorEl;
                        if (!editorEl) return;
                        var size = parseInt(getComputedStyle(editorEl).fontSize, 10) || 12;
                        editorEl.style.fontSize = (size + 1) + 'px';
                    });
                }
                if (lineNumbersBtn) {
                    lineNumbersBtn.addEventListener('click', function() {
                        var xmlEditor = panesByKey[activePaneKey] && panesByKey[activePaneKey].xmlEditor;
                        if (!xmlEditor) return;
                        xmlEditor.renderer.setShowGutter(!xmlEditor.renderer.getShowGutter());
                    });
                }

                // Load whichever pane starts active (Verovio's iframe above always
                // loads regardless, so this is a no-op unless the default is text/xml).
                ensurePaneLoaded(defaultPane.key);

                // "Gehe zu Satz" (goto movement) is disabled with <= 1 movement,
                // matching the old GotoMsg dialog's isDisabled check. Only relevant
                // when there's an actual score pane — text/xml-only resources have
                // no movements and keep the "Gehe zu" button hidden entirely.
                if (verovioPane) {
                    window.doAJAXRequest('data/xql/getMovements.xql',
                        'GET',
                        { uri: uri },
                        function(response) {
                            var movements = Ext.JSON.decode(response.responseText) || [];

                            movementSubmenu.innerHTML = '';
                            gotoMovementSelect.innerHTML = '';
                            Ext.Array.each(movements, function(movement) {
                                var item = document.createElement('div');
                                item.className = 'movementSubmenuItem';
                                item.style.padding = '6px 10px';
                                item.style.cursor = 'pointer';
                                item.textContent = movement.name;
                                item.addEventListener('click', function() {
                                    closeGotoMenu();
                                    if (iframe.contentWindow && iframe.contentWindow.showMovement) {
                                        iframe.contentWindow.showMovement(movement.id);
                                    }
                                });
                                movementSubmenu.appendChild(item);

                                var option = document.createElement('option');
                                option.value = movement.id;
                                option.textContent = movement.name;
                                gotoMovementSelect.appendChild(option);
                            });

                            var onlyOneMovement = movements.length <= 1;
                            gotoMovementItem.classList.toggle('disabled', onlyOneMovement);
                            gotoMovementItem.style.opacity = onlyOneMovement ? '0.5' : '';
                            gotoMovementItem.style.cursor = onlyOneMovement ? 'default' : 'pointer';
                            gotoMovementSelect.disabled = onlyOneMovement;
                        }
                    );
                }
            },
            onResize: function() {
                var activePane = panesByKey[activePaneKey];
                if (activePane && activePane.xmlEditor) activePane.xmlEditor.renderer.onResize(true);
            }
        });
    },

    onSpecialKey: function(field, e) {
        var me = this;
        
        if (e.getKey() == e.ENTER) {
            var term = field.getValue();
            me.openSearch(term);
        }
    },

    onOpenSearchWindow: function(button, event, args) {
        var me = this;
        var term = button.textField.getValue();
        me.openSearch(term);
    },

    onOpenAboutWindow: function(button, event, args) {
        var me = this;
        me.openAbout();
    },

    switchDesktop: function(desk) {
        this.desktop.switchDesktop(desk);
    },

    cloneWinsCollectionWithoutMinimized: function(wins) {
        var set = new Ext.util.MixedCollection();

        wins.each(function(win) {
            if(!win.minimized) set.add(win);
        });

        return set;
    },

    // The WinBox host element's on-screen bounds are only set once, when a
    // WinBox window is first opened (see createWinBoxWindow). Refresh them
    // here so proxy.setPosition's page-XY -> host-local conversion stays
    // correct even if the desktop was resized since then.
    syncWinBoxHostBounds: function() {
        var desktop = this.desktop;
        var host = document.getElementById('ediromWindowsHost');
        if (!host) return;

        var usable = desktop.getUsableSize();
        var bodyXY = desktop.body.getXY();

        host.style.position = 'fixed';
        host.style.top = bodyXY[1] + 'px';
        host.style.left = bodyXY[0] + 'px';
        host.style.width = usable.width + 'px';
        host.style.height = usable.height + 'px';
        host.style.right = 'auto';
        host.style.bottom = 'auto';
    },

    // sortHorizontally/sortVertically/sortGrid compute `to` as a desktop-relative
    // {x,y,width,height} box and normally apply it via win.animate(...) - but a
    // useWinBoxChrome window is rendered non-floating, straight into a WinBox
    // body (see wrapEdiromWindowInWinBox), so it has no page position of its own
    // to animate. Move/resize the WinBox shell instead (no animation - WinBox has
    // none), then let the WinBox's own onresize handler resize the Ext content.
    arrangeWinBoxWindow: function(win, to) {
        var desktop = this.desktop;
        var bodyXY = desktop.body.getXY();
        var contentConfig = win.getContentConfig();
        win._winbox.move(to.x - bodyXY[0], to.y - bodyXY[1]);
        win._winbox.resize(to.width, to.height);
        win.setContentConfig(contentConfig);
    },

    sortHorizontally: function() {
        var me = this;
        var desktop = this.desktop;
        this.syncWinBoxHostBounds();
        var wins = desktop.getArrangeableWindowsSet();
        wins = this.cloneWinsCollectionWithoutMinimized(wins);

        if(wins == null || wins.length == 0)
	        return;

        var size = desktop.getUsableSize();

        var left = 0;
        var n = wins.length;
		var w = size.width/n;

		wins.each(function(win) {

            var to = {
                y: desktop.getTopBarHeight() + 2,
                x: left + 3,
                width: w - 6,
                height: size.height - 4
            };

            if (win.useWinBoxChrome && win._winbox) {
                me.arrangeWinBoxWindow(win, to);
                left = left + w;
                return;
            }

            var contentConfig = win.getContentConfig();

            win.animate(Ext.apply({
                duration: 1000,
                listeners: {
                    afteranimate: Ext.Function.bind(win.setContentConfig, win, [contentConfig])
                },
                to: to
            }, true));

			left = left + w;
		});
    },

    sortVertically: function() {
        var me = this;
        var desktop = this.desktop;
        this.syncWinBoxHostBounds();
        var wins = desktop.getArrangeableWindowsSet();
        wins = this.cloneWinsCollectionWithoutMinimized(wins);

        if(wins == null || wins.length == 0)
	        return;

        var size = desktop.getUsableSize();

        var top = desktop.getTopBarHeight();
        var n = wins.length;
		var h = size.height/n;

		wins.each(function(win) {

            var to = {
                y: top + 2,
                x: 3,
                width: size.width - 6,
                height: h - 4
            };

            if (win.useWinBoxChrome && win._winbox) {
                me.arrangeWinBoxWindow(win, to);
                top = top + h;
                return;
            }

		  var contentConfig = win.getContentConfig();

            win.animate(Ext.apply({
                duration: 1000,
                listeners: {
                    afteranimate: Ext.Function.bind(win.setContentConfig, win, [contentConfig])
                },
                to: to
            }, true));

			top = top + h;
		});
    },

    sortGrid: function() {
        var me = this;
        var desktop = this.desktop;
        this.syncWinBoxHostBounds();
        var wins = desktop.getArrangeableWindowsSet();
        wins = this.cloneWinsCollectionWithoutMinimized(wins);

        if(wins == null || wins.length == 0)
            return;

        var size = desktop.getUsableSize();

        var left = 0;
        var top = desktop.getTopBarHeight();

        var optArray = this.findOptimalLenBrt(wins.length);

        wins.each(function(win) {
            if (!win.isVisible() || win.maximized)
                return;

            if((left + (size.width / optArray[0])) > size.width) {
			    top = top + (size.height / optArray[1]);
				left = 0;
			}

            var to = {
                y: top + 2,
                x: left + 3,
                width: size.width / optArray[0] - 6,
                height: size.height / optArray[1] - 4
            };

            if (win.useWinBoxChrome && win._winbox) {
                me.arrangeWinBoxWindow(win, to);
                left = left + (size.width / optArray[0]);
                return;
            }

            var contentConfig = win.getContentConfig();

            win.animate(Ext.apply({
                duration: 1000,
                listeners: {
                    afteranimate: Ext.Function.bind(win.setContentConfig, win, [contentConfig])
                },
                to: to
            }, true));

            left = left + (size.width / optArray[0]);
        });
    },
    getGridPositioning: function(numWins) {
        var desktop = this.desktop;
        var size = desktop.getUsableSize();

        var positions = {};

        var left = 0;
        var top = 0;

        var optArray = this.findOptimalLenBrt(numWins);

        for(var i = 0; i < numWins; i++) {

            if((left + (size.width / optArray[0])) > size.width) {
			    top = top + (size.height / optArray[1]);
				left = 0;
			}

            positions['win_' + i] = {
                y: top + 2,
                x: left + 3,
                width: size.width / optArray[0] - 6,
                height: size.height / optArray[1] - 4
            };

            left = left + (size.width / optArray[0]);
        }

        return positions;
    },
    
    getHorizontalPositioning: function(numWins) {
        var desktop = this.desktop;
        var size = desktop.getUsableSize();
        var w = size.width/numWins;
        
        var positions = {};

        var left = 0;
        var top = 0;

        for(var i = 0; i < numWins; i++) {

            positions['win_' + i] = {
                y: top + 2,
                x: left + 3,
                width: w - 6,
                height: size.height - 4
            };

            left = left + w;
        }

        return positions;
    },
    
    getVerticalPositioning: function(numWins) {
        var desktop = this.desktop;
        var size = desktop.getUsableSize();
        var h = size.height/numWins;
        
        var positions = {};

        var left = 0;
        var top = 0;

        for(var i = 0; i < numWins; i++) {

            positions['win_' + i] = {
                y: top + 2,
                x: left + 3,
                width: size.width - 6,
                height: h - 4
            };

            top = top + h;
        }

        return positions;
    },

    findOptimalLenBrt: function(number){
    	//finds optimal length breadth for each window [number = total windows]
		if(number == 1)
			return [1,1];

		else if(number == 2)
			return [2,1];

		//number should be non prime
		var isPrime = this.isPrime(number);

		if(isPrime)
			number = number+1;

		//Length should be greater than breadth
		var diff = number;
		var j = 1;
		var opti;
		var optj;

        for(var i = 1; i <= number/2; i++) {
			if(number % i != 0)
				continue;

			j = number/i;

			var tmpDiff = j - i;

			if(tmpDiff < diff && tmpDiff>=0) {
				diff = tmpDiff;
				opti = i;
				optj = j;
			}
		}

        if(optj < opti)
			return [opti,optj];

		return [optj,opti];
	 },

    isPrime:function(number){
    	for(var i = 2; i <= number / 2 + 1; i++) {
			if(number % i == 0) {
				return false;
			}

		}
    	return true; 
    }
});

 