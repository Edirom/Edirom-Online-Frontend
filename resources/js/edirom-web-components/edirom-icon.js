/**
 * edirom-icon.js
 *
 * Web Component: <edirom-icon>
 * - Lightweight wrapper for Material Design icons (via Google Material Icons font)
 * - Usage:
 *     <edirom-icon name="home"></edirom-icon>
 *     <edirom-icon name="home" size="36" color="#f33" spin rotate="45"></edirom-icon>
 *     <edirom-icon role="button" tabindex="0" name="menu"></edirom-icon>
 * - You can also place custom SVG/HTML inside the element (slot) to override the font icon.
 */

class EdiromIcon extends HTMLElement {
    static get observedAttributes() {
        return ['name', 'size', 'color', 'spin', 'rotate', 'aria-label', 'role', 'button', 'pressed'];
    }

    constructor() {
        super();
        this._shadow = this.attachShadow({ mode: 'open' });
        this._root = document.createElement('span');
        this._rootPart = null;
        // Ensure fonts are loaded once per document
        if (!window.__edirom_icon_fonts_loaded) {
            window.__edirom_icon_fonts_loaded = false;
        }
    }

    connectedCallback() {
        if (!window.__edirom_icon_fonts_loaded) {
            EdiromIcon._loadMaterialIconFonts();
            window.__edirom_icon_fonts_loaded = true;
        }
        this._render();
        // keyboard support for role="button"
        this._onKeyDown = (e) => {
            if ((this.getAttribute('role') || this.hasAttribute('button')) && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                this.click();
            }
        };
        this.addEventListener('keydown', this._onKeyDown);
    }

    disconnectedCallback() {
        this.removeEventListener('keydown', this._onKeyDown);
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) this._render();
    }

    // property <-> attribute helpers
    get name() { return this.getAttribute('name') || ''; }
    set name(v) { this.setAttribute('name', v); }

    get size() { return this.getAttribute('size') || ''; }
    set size(v) { this.setAttribute('size', v); }

    get color() { return this.getAttribute('color') || ''; }
    set color(v) { this.setAttribute('color', v); }

    get spin() { return this.hasAttribute('spin'); }
    set spin(v) { if (v) this.setAttribute('spin', '') ; else this.removeAttribute('spin'); }

    get rotate() { return this.getAttribute('rotate') || ''; }
    set rotate(v) { if (v === null) this.removeAttribute('rotate'); else this.setAttribute('rotate', String(v)); }

    get pressed() { return this.hasAttribute('pressed'); }
    set pressed(v) { if (v) this.setAttribute('pressed', ''); else this.removeAttribute('pressed'); }

    // core render method
    _render() {
        const name = this.getAttribute('name');
        const sizeAttr = this.getAttribute('size');
        const color = this.getAttribute('color') || '';
        const spin = this.hasAttribute('spin');
        const rotate = this.getAttribute('rotate');

        // Build the internal DOM only once
        this._shadow.innerHTML = ''; // clear
        const style = document.createElement('style');
        style.textContent = `
            :host { display: inline-block; vertical-align: middle; line-height: 0; }
            .icon {
                display: inline-block;
                font-family: 'Material Symbols Outlined';
                font-weight: normal;
                font-style: normal;
                font-size: var(--edirom-icon-size, 24px);
                line-height: 1;
                letter-spacing: normal;
                text-transform: none;
                white-space: nowrap;
                word-wrap: normal;
                direction: ltr;
                -webkit-font-feature-settings: 'liga';
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
                user-select: none;
                transition: transform 0.2s linear;
                color: var(--edirom-icon-color, inherit);
            }

            .button {
                cursor: pointer;
            }

            .button.pressed {
                background-color:rgb(167, 167, 167) !important;
                box-shadow: 0 1px 1px rgba(8, 8, 8, 0.5) inset;
            }
            
            .button:hover {
                background-color:rgb(197, 197, 197) !important;
                box-shadow: 0 1px 1px rgba(8, 8, 8, 0.45) inset;
            }

            /* spin animation */
            @keyframes edirom-icon-spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            .spin {
                animation: edirom-icon-spin 1s linear infinite;
            }

            /* allow slotted SVG or inline content to size correctly */
            ::slotted(svg) { width: 1em; height: 1em; display: inline-block; vertical-align: middle; fill: currentColor; }
        `;

        const wrapper = document.createElement('span');
        wrapper.className = 'material-symbols-outlined icon';
        wrapper.setAttribute('part', 'icon');

        // apply color
        if (color) wrapper.style.setProperty('--edirom-icon-color', color);

        // apply size (support number and units)
        if (sizeAttr) {
            const sizeValue = EdiromIcon._normalizeSize(sizeAttr);
            wrapper.style.setProperty('--edirom-icon-size', sizeValue);
        }

        // spin
        if (spin) wrapper.classList.add('spin');

        // rotate
        if (rotate) {
            // rotate is degrees (number or "45deg")
            const deg = rotate.toString().trim();
            wrapper.style.transform = (spin ? '' : `rotate(${deg}${/deg$/.test(deg) ? '' : 'deg'})`);
        }

        // pressed state
        if (this.hasAttribute('pressed')) {
            wrapper.classList.add('pressed');
        }

        // ARIA
        const ariaLabel = this.getAttribute('aria-label');
        if (ariaLabel) wrapper.setAttribute('aria-label', ariaLabel);

        // If the element has children (slotted content), use a slot to display them.
        if (this.hasChildNodes()) {
            const slot = document.createElement('slot');
            wrapper.appendChild(slot);
        } else if (name) {
            // Use the ligature text approach for Material Icons
            wrapper.textContent = name;
        } else {
            // empty state: render nothing
        }

        // role/button behavior
        if (this.hasAttribute('button') || this.getAttribute('role') === 'button') {
            wrapper.classList.add('button');
            if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '0');
        }

        this._shadow.appendChild(style);
        this._shadow.appendChild(wrapper);
    }

    // helper: normalize size attribute into a valid CSS size string
    static _normalizeSize(size) {
        if (!size) return '24px';
        const s = String(size).trim();
        if (/^[\d.]+$/.test(s)) return `${s}px`;
        if (/^\d+(\.\d+)?(px|em|rem|%)$/.test(s)) return s;
        // e.g. '2x' -> 2em
        if (/^\d+x$/.test(s)) return `${parseInt(s, 10)}em`;
        return s; // fallback
    }

    // inject Material Icon font
    static _loadMaterialIconFonts() {
        if (document.querySelector('link[data-edirom-material-icons]')) return;
        const href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined&display=swap';
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.setAttribute('data-edirom-material-icons', '1');
        document.head.appendChild(link);
    }
}

// Define the custom element if not already defined
if (!customElements.get('edirom-icon')) {
    customElements.define('edirom-icon', EdiromIcon);
}