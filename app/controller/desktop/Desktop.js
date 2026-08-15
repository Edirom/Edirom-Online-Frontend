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
                setTimeout(function() {
                    var maxZ = maxExtZ();
                    if (inWinbox) {
                        h.style.zIndex = (maxZ + 100);
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
                }, 0);
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
                host.style.zIndex = (maxExtZ() + 100);
                // Re-assert on the next tick so this raise wins against the
                // document mousedown coordinator. The topbar/taskbar buttons
                // that open or re-focus a WinBox window are OUTSIDE any
                // .winbox, so that same click queues a host-lowering
                // (setTimeout 0) which would otherwise drop the window behind
                // the ExtJS windows right after this synchronous raise.
                setTimeout(function() { host.style.zIndex = (maxExtZ() + 100); }, 0);
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

            var winbox = new WinBox({
                id: winId,
                title: winTitle,
                html: opts.html,
                width: winWidth,
                height: winHeight,
                x: 10,
                y: 5,
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
    // views include an audioView entry. Behaves as a per-uri singleton: a
    // repeat click on the same source reuses the existing player window.
    openAudioView: function(uri, label) {
        var me = this;
        var desktop = me.desktop;

        // Reuse an already-open audio window for the same source instead of
        // stacking duplicates / re-fetching on repeat clicks.
        var existing = null;
        desktop.getActiveWindowsSet().each(function(w) {
            if (w && w.isAudioProxy && w.uri === uri) { existing = w; return false; }
        });
        if (existing) {
            existing.show();
            return;
        }

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
                // HTML-attribute-escape the JSON (") so it can be embedded
                // directly in the double-quoted "tracks" attribute.
                var tracksAttr = Ext.JSON.encode(resp.audios).replace(/"/g, '&quot;');
                var winTitle = (label && label != '') ? label : getLangString('controller.window.Window_audioView');

                me.createWinBoxWindow({
                    id: 'audio-window-' + Date.now(),
                    title: winTitle,
                    maxWidth: 600,
                    maxHeight: 400,
                    minHeight: 180,
                    // height="auto" (not "100%"): the component's #player
                    // wrapper stretches to whatever height it's given, so a
                    // fixed WinBox height would push the track list way down
                    // below the (much shorter) controls bar.
                    html: '<div style="height:100%;box-sizing:border-box;overflow:auto;"><edirom-audio-player tracks="' + tracksAttr + '" height="auto" width="100%" state="pause" track="0" start="0.0" end="" playbackrate="1.0" playlist="true" progressbar="true"></edirom-audio-player></div>',
                    findExisting: function(w) { return !!(w && w.isAudioProxy && w.uri === uri); },
                    proxyExtras: { isAudioProxy: true, uri: uri }
                });
            }
        );
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

 