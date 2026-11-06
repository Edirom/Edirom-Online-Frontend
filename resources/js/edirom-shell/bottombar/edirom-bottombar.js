/**
 * edirom-bottombar.js
 * MIT License. Copyright (c) 2026 Virtueller Forschungsverbund Edirom.
 */
(function () {
    var CSS = [
        ':host {',
        '  --edirom-color-bar: #fff;',
        '  --edirom-color-text: #1c1c1c;',
        '  --edirom-color-line: #d5dbe3;',
        '  --edirom-color-accent: #1f4e79;',
        '  --edirom-color-focus: #0b57d0;',
        '  --edirom-font: "Segoe UI", "Helvetica Neue", Arial, sans-serif;',
        '  --edirom-touch-min: 2.75rem;',
        '  display: block;',
        '  font-family: var(--edirom-font);',
        '  color: var(--edirom-color-text);',
        '  background: var(--edirom-color-bar);',
        '  border-top: 1px solid var(--edirom-color-line);',
        '}',
        '.bar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem; padding: 0.25rem 0.5rem; }',
        'button {',
        '  min-width: var(--edirom-touch-min);',
        '  min-height: var(--edirom-touch-min);',
        '  font: inherit;',
        '  color: inherit;',
        '  background: #fff;',
        '  border: 1px solid var(--edirom-color-line);',
        '  border-radius: 0.25rem;',
        '  padding: 0 0.6rem;',
        '  cursor: pointer;',
        '}',
        'button[aria-pressed="true"] { background: #e7eef6; border-color: var(--edirom-color-accent); }',
        'button[aria-current="true"] { outline: 2px solid var(--edirom-color-accent); }',
        'button:focus-visible, ::slotted(button:focus-visible) { outline: 0.1875rem solid var(--edirom-color-focus); outline-offset: 0.125rem; }',
        '::slotted(button) { min-width: var(--edirom-touch-min); min-height: var(--edirom-touch-min); font: inherit; border: 1px solid var(--edirom-color-line); border-radius: 0.25rem; background: #fff; cursor: pointer; }',
        '::slotted(button[pressed]) { background: #e7eef6; border-color: var(--edirom-color-accent); }',
        '.windows { display: flex; flex-wrap: wrap; gap: 0.35rem; flex: 1 1 12rem; min-width: 0; }',
        '.spacer { flex: 1 1 auto; }'
    ].join('\n');

    var COPY = {
        de: {
            grid: 'Raster', vertical: 'Untereinander', horizontal: 'Nebeneinander',
            measures: 'Taktzahlen', annotations: 'Anmerkungen', concordance: 'Konkordanz',
            help: 'Hilfe', about: 'Info', window: 'Fenster'
        },
        en: {
            grid: 'Grid', vertical: 'Stack', horizontal: 'Side by side',
            measures: 'Bar numbers', annotations: 'Annotations', concordance: 'Concordance',
            help: 'Help', about: 'About', window: 'Window'
        }
    };

    class EdiromBottombar extends HTMLElement {
        static get observedAttributes() {
            return ['lang', 'measures-visible', 'annotations-visible', 'windows', 'active-window'];
        }

        constructor() {
            super();
            var root = this.attachShadow({ mode: 'open' });
            var style = document.createElement('style');
            style.textContent = CSS;
            this._bar = document.createElement('div');
            this._bar.className = 'bar';
            this._buttons = {};
            ['grid', 'vertical', 'horizontal', 'measures', 'annotations'].forEach(function (name) {
                this._addButton(name);
            }, this);
            var concordanceSlot = document.createElement('slot');
            concordanceSlot.name = 'concordance';
            this._bar.appendChild(concordanceSlot);
            ['help', 'about'].forEach(function (name) {
                this._addButton(name);
            }, this);
            this._windows = document.createElement('div');
            this._windows.className = 'windows';
            this._windows.setAttribute('role', 'toolbar');
            var slot = document.createElement('slot');
            slot.name = 'extra';
            this._bar.append(this._windows, slot);
            root.append(style, this._bar);

            this.addEventListener('click', this._onClick.bind(this));
        }

        _addButton(name) {
            var button = document.createElement('button');
            button.type = 'button';
            button.dataset.action = name;
            this._buttons[name] = button;
            this._bar.appendChild(button);
        }

        connectedCallback() {
            if (!this.querySelector('#icon_openConcordanceNavigator')) {
                var button = document.createElement('button');
                button.id = 'icon_openConcordanceNavigator';
                button.type = 'button';
                button.slot = 'concordance';
                button.dataset.action = 'concordance';
                this.appendChild(button);
            }
            this._paint();
        }

        attributeChangedCallback() {
            if (this.isConnected) this._paint();
        }

        _copy() {
            return COPY[this.getAttribute('lang') === 'en' ? 'en' : 'de'];
        }

        _truthy(name) {
            var value = this.getAttribute(name);
            return value === '' || value === 'true';
        }

        _paint() {
            var copy = this._copy();
            this._buttons.grid.textContent = copy.grid;
            this._buttons.vertical.textContent = copy.vertical;
            this._buttons.horizontal.textContent = copy.horizontal;
            this._buttons.measures.textContent = copy.measures;
            this._buttons.annotations.textContent = copy.annotations;
            var concordance = this.querySelector('#icon_openConcordanceNavigator');
            if (concordance) {
                concordance.textContent = copy.concordance;
                concordance.dataset.action = 'concordance';
            }
            this._buttons.help.textContent = copy.help;
            this._buttons.about.textContent = copy.about;
            this._buttons.measures.setAttribute('aria-pressed', this._truthy('measures-visible') ? 'true' : 'false');
            this._buttons.annotations.setAttribute('aria-pressed', this._truthy('annotations-visible') ? 'true' : 'false');

            var windows = [];
            try {
                var parsed = JSON.parse(this.getAttribute('windows') || '[]');
                if (Array.isArray(parsed)) windows = parsed;
            } catch (error) {
                windows = [];
            }
            var active = this.getAttribute('active-window') || '';
            this._windows.replaceChildren();
            windows.forEach(function (win) {
                var button = document.createElement('button');
                button.type = 'button';
                button.dataset.action = 'window';
                button.dataset.id = win.id;
                button.textContent = win.title || copy.window;
                if (win.id === active) button.setAttribute('aria-current', 'true');
                this._windows.appendChild(button);
            }, this);
        }

        _onClick(event) {
            var path = event.composedPath ? event.composedPath() : [];
            var button = null;
            for (var i = 0; i < path.length; i++) {
                if (path[i].dataset && path[i].dataset.action) {
                    button = path[i];
                    break;
                }
            }
            if (!button) return;
            var action = button.dataset.action;
            if (action === 'grid' || action === 'vertical' || action === 'horizontal') {
                this._emit('arrange-request', { mode: action });
            } else if (action === 'measures' || action === 'annotations') {
                var attr = action === 'measures' ? 'measures-visible' : 'annotations-visible';
                var next = !this._truthy(attr);
                this.setAttribute(attr, next ? 'true' : 'false');
                this._emit(action === 'measures' ? 'toggle-measures' : 'toggle-annotations', { visible: next });
            } else if (action === 'concordance') {
                this._emit('open-concordance', {});
            } else if (action === 'help') {
                this._emit('open-help', {});
            } else if (action === 'about') {
                this._emit('open-about', {});
            } else if (action === 'window') {
                this._emit('window-selected', { id: button.dataset.id });
            }
        }

        _emit(name, detail) {
            this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, detail: detail }));
        }
    }

    if (!customElements.get('edirom-bottombar')) {
        customElements.define('edirom-bottombar', EdiromBottombar);
    }
})();
