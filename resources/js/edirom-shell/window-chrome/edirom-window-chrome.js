/**
 * edirom-window-chrome.js
 * MIT License. Copyright (c) 2026 Virtueller Forschungsverbund Edirom.
 * Title and window buttons. The host moves, resizes and closes the window.
 */
(function () {
    var CSS = [
        ':host {',
        '  --edirom-color-text: #1c1c1c;',
        '  --edirom-color-focus: #0b57d0;',
        '  --edirom-font: "Segoe UI", "Helvetica Neue", Arial, sans-serif;',
        '  --edirom-touch-min: 2.75rem;',
        '  display: flex;',
        '  align-items: center;',
        '  gap: 0.25rem;',
        '  min-width: 0;',
        '  font-family: var(--edirom-font);',
        '  color: var(--edirom-color-text);',
        '}',
        '.title { flex: 1 1 auto; min-width: 0; overflow-wrap: anywhere; font-weight: 700; }',
        'button {',
        '  min-width: var(--edirom-touch-min);',
        '  min-height: var(--edirom-touch-min);',
        '  border: 0;',
        '  background: transparent;',
        '  font: inherit;',
        '  cursor: pointer;',
        '}',
        'button:focus-visible { outline: 0.1875rem solid var(--edirom-color-focus); outline-offset: 0.125rem; }'
    ].join('\n');

    var COPY = {
        de: { min: 'Minimieren', max: 'Maximieren', restore: 'Wiederherstellen', close: 'Schließen' },
        en: { min: 'Minimise', max: 'Maximise', restore: 'Restore', close: 'Close' }
    };

    class EdiromWindowChrome extends HTMLElement {
        static get observedAttributes() {
            return ['window-title', 'lang', 'maximized'];
        }

        constructor() {
            super();
            var root = this.attachShadow({ mode: 'open' });
            var style = document.createElement('style');
            style.textContent = CSS;
            this._title = document.createElement('span');
            this._title.className = 'title';
            this._min = document.createElement('button');
            this._max = document.createElement('button');
            this._close = document.createElement('button');
            this._min.type = this._max.type = this._close.type = 'button';
            root.append(style, this._title, this._min, this._max, this._close);
            this._min.addEventListener('click', this._emit.bind(this, 'window-minimize'));
            this._max.addEventListener('click', this._emit.bind(this, 'window-maximize'));
            this._close.addEventListener('click', this._emit.bind(this, 'window-close'));
            this.addEventListener('keydown', function (event) {
                if (event.key === 'Escape') this._emit('window-close');
            }.bind(this));
        }

        connectedCallback() {
            this._paint();
        }

        attributeChangedCallback() {
            if (this.isConnected) this._paint();
        }

        _emit(name) {
            this.dispatchEvent(new CustomEvent(name, {
                bubbles: true,
                composed: true,
                detail: { title: this.getAttribute('window-title') || '' }
            }));
        }

        _paint() {
            var copy = COPY[this.getAttribute('lang') === 'en' ? 'en' : 'de'];
            var maximized = this.hasAttribute('maximized') && this.getAttribute('maximized') !== 'false';
            this._title.textContent = this.getAttribute('window-title') || '';
            this._min.textContent = '–';
            this._min.setAttribute('aria-label', copy.min);
            this._max.textContent = maximized ? '❐' : '□';
            this._max.setAttribute('aria-label', maximized ? copy.restore : copy.max);
            this._close.textContent = '×';
            this._close.setAttribute('aria-label', copy.close);
        }
    }

    if (!customElements.get('edirom-window-chrome')) {
        customElements.define('edirom-window-chrome', EdiromWindowChrome);
    }
})();
