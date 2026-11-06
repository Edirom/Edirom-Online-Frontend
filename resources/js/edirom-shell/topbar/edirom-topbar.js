/**
 * edirom-topbar.js
 * MIT License. Copyright (c) 2026 Virtueller Forschungsverbund Edirom.
 */
(function () {
    var CSS = [
        ':host {',
        '  --edirom-color-bar: #fff;',
        '  --edirom-color-text: #1c1c1c;',
        '  --edirom-color-line: #d5dbe3;',
        '  --edirom-color-focus: #0b57d0;',
        '  --edirom-font: "Segoe UI", "Helvetica Neue", Arial, sans-serif;',
        '  --edirom-touch-min: 2.75rem;',
        '  display: block;',
        '  font-family: var(--edirom-font);',
        '  color: var(--edirom-color-text);',
        '  background: var(--edirom-color-bar);',
        '  border-bottom: 1px solid var(--edirom-color-line);',
        '}',
        '.bar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; padding: 0.25rem 0.5rem; }',
        'button, select {',
        '  min-height: var(--edirom-touch-min);',
        '  font: inherit;',
        '  color: inherit;',
        '  background: #fff;',
        '  border: 1px solid var(--edirom-color-line);',
        '  border-radius: 0.25rem;',
        '  padding: 0 0.75rem;',
        '}',
        'button { cursor: pointer; }',
        'label { display: flex; align-items: center; gap: 0.35rem; min-width: 0; }',
        'select { max-width: 100%; }',
        'button:focus-visible, select:focus-visible { outline: 0.1875rem solid var(--edirom-color-focus); outline-offset: 0.125rem; }',
        '.brand { font-weight: 700; padding: 0 0.25rem; }'
    ].join('\n');

    var COPY = {
        de: { home: 'Startseite', brand: 'Edirom Online', works: 'Werk' },
        en: { home: 'Home', brand: 'Edirom Online', works: 'Work' }
    };

    class EdiromTopbar extends HTMLElement {
        static get observedAttributes() {
            return ['works', 'active-work', 'lang'];
        }

        constructor() {
            super();
            this._setting = false;
            var root = this.attachShadow({ mode: 'open' });
            var style = document.createElement('style');
            style.textContent = CSS;
            var bar = document.createElement('div');
            bar.className = 'bar';
            this._home = document.createElement('button');
            this._home.type = 'button';
            this._brand = document.createElement('span');
            this._brand.className = 'brand';
            this._label = document.createElement('label');
            this._caption = document.createElement('span');
            this._select = document.createElement('select');
            this._label.append(this._caption, this._select);
            var slot = document.createElement('slot');
            slot.name = 'actions';
            bar.append(this._home, this._brand, this._label, slot);
            root.append(style, bar);

            this._home.addEventListener('click', function () {
                this.dispatchEvent(new CustomEvent('home', { bubbles: true, composed: true, detail: {} }));
            }.bind(this));
            this._select.addEventListener('change', function () {
                if (this._setting) return;
                this.dispatchEvent(new CustomEvent('work-selected', {
                    bubbles: true,
                    composed: true,
                    detail: { id: this._select.value, title: this._select.selectedOptions[0] ? this._select.selectedOptions[0].textContent : '' }
                }));
            }.bind(this));
        }

        connectedCallback() {
            this._paint();
        }

        attributeChangedCallback(name) {
            if (name === 'active-work') this._setting = true;
            this._paint();
            this._setting = false;
        }

        _copy() {
            return COPY[this.getAttribute('lang') === 'en' ? 'en' : 'de'];
        }

        _works() {
            try {
                var parsed = JSON.parse(this.getAttribute('works') || '[]');
                return Array.isArray(parsed) ? parsed : [];
            } catch (error) {
                return [];
            }
        }

        _paint() {
            var copy = this._copy();
            this._home.textContent = copy.home;
            this._brand.textContent = copy.brand;
            this._caption.textContent = copy.works;
            var works = this._works();
            var active = this.getAttribute('active-work') || '';
            this._select.replaceChildren();
            works.forEach(function (work) {
                var option = document.createElement('option');
                option.value = work.id;
                option.textContent = work.title || work.id;
                if (work.id === active) option.selected = true;
                this._select.appendChild(option);
            }, this);
            if (works.length === 0) {
                var empty = document.createElement('option');
                empty.value = '';
                empty.textContent = '—';
                this._select.appendChild(empty);
            }
        }
    }

    if (!customElements.get('edirom-topbar')) {
        customElements.define('edirom-topbar', EdiromTopbar);
    }
})();
