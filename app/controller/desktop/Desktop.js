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

    init: function() {
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

    openHelp: function() { 
        var me = this; 
        var desktop = me.desktop; 

        // Ensure the web component host exists first so shadow root is available
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
        if (!host._zIndexCoordInstalled) {
            host._zIndexCoordInstalled = true;
            document.addEventListener('mousedown', function(e) {
                var h = document.getElementById('ediromWindowsHost');
                if (!h) return;
                var path = (typeof e.composedPath === 'function') ? e.composedPath() : [];
                var inWinbox = path.some(function(n) {
                    return n && n.classList && n.classList.contains('winbox');
                });
                setTimeout(function() {
                    var maxZ = maxExtZ();
                    h.style.zIndex = inWinbox ? (maxZ + 100) : Math.max(0, maxZ - 1);
                }, 0);
            }, true);
        }

        // Each click opens a fresh window with a unique id
        var winId = 'help-window-' + Date.now();

        // Helper: look up a window element inside the component's shadow root
        function getShadowEl(id) {
            return host.shadowRoot && host.shadowRoot.getElementById(id);
        }

        var doOpen = function() {
            window.doAJAXRequest('data/xql/getHelp.xql',
                'GET',
                { lang: window.getLanguage(), idPrefix: 'helpWin' },
                function(response) {
                    // Constrain the WinBox host to Edirom's usable content area
                    // (below the topbar, left of the navigator) so the window can
                    // not cover and block the topbar, taskbar or navigator.
                    var usable = desktop.getUsableSize();
                    var bodyXY = desktop.body.getXY();
                    host.style.position = 'fixed';
                    host.style.top = bodyXY[1] + 'px';
                    host.style.left = bodyXY[0] + 'px';
                    host.style.width = usable.width + 'px';
                    host.style.height = usable.height + 'px';
                    host.style.right = 'auto';
                    host.style.bottom = 'auto';

                    // Coordinate stacking with the ExtJS window manager. The host
                    // overlay would otherwise sit at a fixed z-index above every
                    // ExtJS window. raiseHostAboveExt() lifts it above the topmost
                    // ExtJS window when the help window is focused; the document
                    // mousedown coordinator lowers it again when an ExtJS window is
                    // clicked.
                    var raiseHostAboveExt = function() {
                        host.style.zIndex = (maxExtZ() + 100);
                    };

                    var winWidth = Math.max(320, Math.min(750, usable.width - 20));
                    var winHeight = Math.max(240, Math.min(600, usable.height - 20));

                    var winTitle = getLangString('view.window.HelpWindow_Title');
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
                        hide: function() {
                            var el = getShadowEl(winId);
                            if (el) el.style.display = 'none';
                            this.hidden = true;
                        },
                        show: function(animTarget, callback) {
                            var el = getShadowEl(winId);
                            if (el) {
                                el.style.display = '';
                                el.style.zIndex = 100000;
                            }
                            raiseHostAboveExt();
                            if (proxy._winbox) proxy._winbox.restore();
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
                            if (el) el.style.zIndex = 100001;
                            raiseHostAboveExt();
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

                    var winbox = new WinBox({
                        id: winId,
                        title: winTitle,
                        html: '<div style="overflow:auto;height:100%;"><div class="textViewContent" style="padding:10px;">' + response.responseText + '</div></div>',
                        width: winWidth,
                        height: winHeight,
                        x: 10,
                        y: 5,
                        background: 'linear-gradient(to bottom, #e6e6e6, #ccc)',
                        root: host.shadowRoot.querySelector('winbox-container'),
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
                        onclose: function() {
                            proxy.close();
                        }
                    });

                    proxy._winbox = winbox;

                    // Wire up in-page TOC anchor navigation. The help content
                    // lives inside the WinBox shadow DOM, so native href="#id"
                    // fragment navigation can not reach the target headings
                    // (the browser only searches the main document). Intercept
                    // clicks on in-page anchors and scroll the matching element
                    // into view within the shadow root.
                    var winboxEl = getShadowEl(winId);
                    if (winboxEl) {
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
                    }

                    desktop.addWebComponentWindow(proxy);
                    raiseHostAboveExt();
                }
            );
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

    // About window — mirrors openHelp exactly, but renders the CITATION.cff
    // based "About" content inside the same WinBox web component.
    openAbout: function() {
        var me = this;
        var desktop = me.desktop;

        // Ensure the web component host exists first so shadow root is available
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
        if (!host._zIndexCoordInstalled) {
            host._zIndexCoordInstalled = true;
            document.addEventListener('mousedown', function(e) {
                var h = document.getElementById('ediromWindowsHost');
                if (!h) return;
                var path = (typeof e.composedPath === 'function') ? e.composedPath() : [];
                var inWinbox = path.some(function(n) {
                    return n && n.classList && n.classList.contains('winbox');
                });
                setTimeout(function() {
                    var maxZ = maxExtZ();
                    h.style.zIndex = inWinbox ? (maxZ + 100) : Math.max(0, maxZ - 1);
                }, 0);
            }, true);
        }

        // Each click opens a fresh window with a unique id
        var winId = 'about-window-' + Date.now();

        function getShadowEl(id) {
            return host.shadowRoot && host.shadowRoot.getElementById(id);
        }

        var doOpen = function() {
            me.buildAboutHtml(function(htmlContent) {
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
                    host.style.zIndex = (maxExtZ() + 100);
                };

                var winWidth = Math.max(320, Math.min(700, usable.width - 20));
                var winHeight = Math.max(240, Math.min(600, usable.height - 20));

                var winTitle = getLangString('view.window.about.AboutWindow_Title');
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
                    hide: function() {
                        var el = getShadowEl(winId);
                        if (el) el.style.display = 'none';
                        this.hidden = true;
                    },
                    show: function(animTarget, callback) {
                        var el = getShadowEl(winId);
                        if (el) {
                            el.style.display = '';
                            el.style.zIndex = 100000;
                        }
                        raiseHostAboveExt();
                        if (proxy._winbox) proxy._winbox.restore();
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
                        if (el) el.style.zIndex = 100001;
                        raiseHostAboveExt();
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

                var winbox = new WinBox({
                    id: winId,
                    title: winTitle,
                    html: htmlContent,
                    width: winWidth,
                    height: winHeight,
                    x: 10,
                    y: 5,
                    background: 'linear-gradient(to bottom, #e6e6e6, #ccc)',
                    root: host.shadowRoot.querySelector('winbox-container'),
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
                    onclose: function() {
                        proxy.close();
                    }
                });

                proxy._winbox = winbox;

                // In-page anchor navigation inside the WinBox shadow DOM (same
                // handling as the help window).
                var winboxEl = getShadowEl(winId);
                if (winboxEl) {
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
                }

                desktop.addWebComponentWindow(proxy);
                raiseHostAboveExt();
            });
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

    onSpecialKey: function(field, e) {
        var me = this;
        
        if (e.getKey() == e.ENTER) {
            var term = field.getValue();
            me.desktop.openSearchWindow(term);
        }
    },

    onOpenSearchWindow: function(button, event, args) {
        var me = this;
        var term = button.textField.getValue();
        me.desktop.openSearchWindow(term);
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

    sortHorizontally: function() {
        var desktop = this.desktop;
        var wins = desktop.getActiveWindowsSet(true);
        wins = this.cloneWinsCollectionWithoutMinimized(wins);

        if(wins == null || wins.length == 0)
	        return;

        var size = desktop.getUsableSize();

        var left = 0;
        var n = wins.length;
		var w = size.width/n;

		wins.each(function(win) {
            
            var contentConfig = win.getContentConfig();
            
            var to = {
                y: desktop.getTopBarHeight() + 2,
                x: left + 3,
                width: w - 6,
                height: size.height - 4
            };

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
        var desktop = this.desktop;
        var wins = desktop.getActiveWindowsSet(true);
        wins = this.cloneWinsCollectionWithoutMinimized(wins);

        if(wins == null || wins.length == 0)
	        return;

        var size = desktop.getUsableSize();

        var top = desktop.getTopBarHeight();
        var n = wins.length;
		var h = size.height/n;

		wins.each(function(win) {
		  
		  var contentConfig = win.getContentConfig();
		
            var to = {
                y: top + 2,
                x: 3,
                width: size.width - 6,
                height: h - 4
            };

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
        var desktop = this.desktop;
        var wins = desktop.getActiveWindowsSet(true);
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

            var contentConfig = win.getContentConfig();

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

 