/**
 * edirom-notification.js
 * MIT License. Copyright (c) 2026 Virtueller Forschungsverbund Edirom.
 * Plain custom element. No framework.
 */
(function () {
    var TOKENS = [
        ':host {',
        '  --edirom-color-text: #1c1c1c;',
        '  --edirom-color-focus: #0b57d0;',
        '  --edirom-color-error: #8c1d18;',
        '  --edirom-color-error-bg: #fce8e6;',
        '  --edirom-color-warning: #6d4c00;',
        '  --edirom-color-warning-bg: #fff4d6;',
        '  --edirom-color-success: #0d652d;',
        '  --edirom-color-success-bg: #e6f4ea;',
        '  --edirom-color-info: #0b3d6e;',
        '  --edirom-color-info-bg: #e8f0fe;',
        '  --edirom-font: "Segoe UI", "Helvetica Neue", Arial, sans-serif;',
        '  --edirom-touch-min: 2.75rem;',
        '  display: block;',
        '  max-width: 40rem;',
        '  font-family: var(--edirom-font);',
        '  color: var(--edirom-color-text);',
        '}',
        '.note {',
        '  display: flex;',
        '  align-items: flex-start;',
        '  gap: 0.75rem;',
        '  padding: 0.75rem 1rem;',
        '  border: 0.125rem solid currentColor;',
        '  border-radius: 0.25rem;',
        '  background: var(--note-bg);',
        '  color: var(--note-fg);',
        '}',
        '.note.error { --note-fg: var(--edirom-color-error); --note-bg: var(--edirom-color-error-bg); }',
        '.note.warning { --note-fg: var(--edirom-color-warning); --note-bg: var(--edirom-color-warning-bg); }',
        '.note.success { --note-fg: var(--edirom-color-success); --note-bg: var(--edirom-color-success-bg); }',
        '.note.info { --note-fg: var(--edirom-color-info); --note-bg: var(--edirom-color-info-bg); }',
        '.symbol { flex: 0 0 auto; width: 1.5rem; height: 1.5rem; }',
        '.symbol svg { width: 100%; height: 100%; display: block; }',
        '.body { flex: 1 1 auto; min-width: 0; }',
        '.severity { display: block; font-weight: 700; margin-bottom: 0.15rem; }',
        '.text { margin: 0; overflow-wrap: anywhere; }',
        'button {',
        '  min-width: var(--edirom-touch-min);',
        '  min-height: var(--edirom-touch-min);',
        '  border: 0;',
        '  background: transparent;',
        '  color: inherit;',
        '  font: inherit;',
        '  cursor: pointer;',
        '}',
        'button:focus-visible, .note:focus-visible {',
        '  outline: 0.1875rem solid var(--edirom-color-focus);',
        '  outline-offset: 0.125rem;',
        '}'
    ].join('\n');

    var COPY = {
        de: { error: 'Fehler', warning: 'Warnung', success: 'Erfolg', info: 'Hinweis', close: 'Schließen' },
        en: { error: 'Error', warning: 'Warning', success: 'Success', info: 'Information', close: 'Close' }
    };

    var SVG = {
        error: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 8l8 8M16 8l-8 8" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
        warning: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l10 18H2L12 3z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 10v5" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="18" r="1" fill="currentColor"/></svg>',
        success: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 12l3 3 7-7" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
        info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v6" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="8" r="1" fill="currentColor"/></svg>'
    };

    function levelOf(value) {
        return COPY.en[value] ? value : 'info';
    }

    class EdiromNotification extends HTMLElement {
        static get observedAttributes() {
            return ['message', 'level', 'lang'];
        }

        constructor() {
            super();
            this._root = this.attachShadow({ mode: 'open' });
            var style = document.createElement('style');
            style.textContent = TOKENS;
            this._root.appendChild(style);
            this._panel = document.createElement('div');
            this._root.appendChild(this._panel);
            this._onKey = this._onKey.bind(this);
        }

        connectedCallback() {
            this.addEventListener('keydown', this._onKey);
            this._render();
        }

        disconnectedCallback() {
            this.removeEventListener('keydown', this._onKey);
        }

        attributeChangedCallback() {
            if (this.isConnected) this._render();
        }

        show(message, level) {
            this.setAttribute('message', message || '');
            if (level) this.setAttribute('level', levelOf(level));
        }

        _copy() {
            var lang = this.getAttribute('lang') === 'en' ? 'en' : 'de';
            return COPY[lang];
        }

        _render() {
            var message = this.getAttribute('message') || '';
            var level = levelOf(this.getAttribute('level'));
            var copy = this._copy();
            this._panel.replaceChildren();
            if (!message) return;

            var note = document.createElement('div');
            note.className = 'note ' + level;
            note.setAttribute('role', level === 'error' ? 'alert' : 'status');
            note.tabIndex = -1;

            var symbol = document.createElement('span');
            symbol.className = 'symbol';
            symbol.innerHTML = SVG[level];

            var body = document.createElement('div');
            body.className = 'body';
            var severity = document.createElement('span');
            severity.className = 'severity';
            severity.textContent = copy[level];
            var text = document.createElement('p');
            text.className = 'text';
            text.textContent = message;
            body.append(severity, text);

            var close = document.createElement('button');
            close.type = 'button';
            close.textContent = copy.close;
            close.addEventListener('click', this._close.bind(this));

            note.append(symbol, body, close);
            this._panel.appendChild(note);
        }

        _close() {
            var detail = {
                message: this.getAttribute('message') || '',
                level: levelOf(this.getAttribute('level'))
            };
            this.removeAttribute('message');
            this.dispatchEvent(new CustomEvent('notification-closed', {
                bubbles: true,
                composed: true,
                detail: detail
            }));
        }

        _onKey(event) {
            if (event.key === 'Escape' && this.getAttribute('message')) {
                event.preventDefault();
                this._close();
            }
        }
    }

    if (!customElements.get('edirom-notification')) {
        customElements.define('edirom-notification', EdiromNotification);
    }
})();
