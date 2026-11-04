/**
 * Derives an annotation category's symbol from the annotation CSS that is
 * already loaded in the document. The symbol definitions are read from whatever
 * stylesheets the page has applied - the frontend's own annotation styles and,
 * crucially, the current edition's stylesheet (loaded from its `additional_css_path`
 * preference, whose filename is arbitrary). Nothing here is tied to a specific
 * CSS file name: `getComputedStyle` returns the cascade of every loaded sheet.
 *
 * Every edition already declares, per category, a `::before` glyph: the character
 * (`content`), the `font-family` (e.g. Bravura or FontAwesome) and a `font-size`.
 * This reads that declaration for a badge's class list and measures the glyph's
 * ink box, returning the geometry the edirom-image-viewer needs to draw the glyph
 * as an inline SVG centred on its ink:
 *
 *     { text, fontFamily, viewBox, width, height }
 *
 *  - text:       the glyph character
 *  - fontFamily: the font it is drawn in
 *  - viewBox:    the glyph's ink box in 1000-unit em space (glyph on its baseline
 *                at y=0, font-size 1000), so centring the box centres the ink
 *  - width/height: the ink's display size in px at the category's font-size
 *
 * ImageViewer passes the result as `zone.symbol`; the component centres it by
 * geometry (viewBox + `xMidYMid meet`), so the edition's own `top`/`left` nudges
 * are irrelevant. Because the glyph is read from whatever CSS the edition shipped
 * (under any filename), this works for any edition without a per-edition symbol
 * file or a hard-coded category table.
 */
(function () {
    window.EdiromOnline = window.EdiromOnline || {};

    // "fontStyle|fontWeight|fontSize|fontFamily|text" -> symbol. One measurement per distinct glyph.
    var cache = {};
    var ctx = null;
    var REF = 100; // reference font size (px) used for measuring

    function measureCtx() {
        if (!ctx) ctx = document.createElement('canvas').getContext('2d');
        return ctx;
    }

    // Computed `content` -> the rendered string, or null for none/normal/url()/counter()/attr()/empty.
    function decodeContent(value) {
        if (!value || value === 'none' || value === 'normal') return null;
        var q = value.charAt(0);
        if (q !== '"' && q !== "'") return null;
        var s = value.slice(1, -1).replace(/\\(.)/g, '$1');
        return s.length ? s : null;
    }

    // Ink box of `text` drawn in the given font. Returns the viewBox in 1000-unit
    // em space plus the display size in px at `fontSizePx`, or null when the glyph
    // has no visible ink (or the browser lacks the ink metrics).
    function geometry(text, fontStyle, fontWeight, fontFamily, fontSizePx) {
        var c = measureCtx();
        c.font = fontStyle + ' ' + fontWeight + ' ' + REF + 'px ' + fontFamily;
        var m = c.measureText(text);
        if (m.actualBoundingBoxAscent === undefined) return null;

        var left = m.actualBoundingBoxLeft, right = m.actualBoundingBoxRight;
        var ascent = m.actualBoundingBoxAscent, descent = m.actualBoundingBoxDescent;
        var w = left + right, h = ascent + descent;
        if (w <= 0 || h <= 0) return null;

        var k = 1000 / REF; // design units per measured px
        var viewBox = (-left * k).toFixed(2) + ' ' + (-ascent * k).toFixed(2) + ' ' +
            (w * k).toFixed(2) + ' ' + (h * k).toFixed(2);
        var scale = fontSizePx / REF; // measured px -> display px at the category's size
        return { viewBox: viewBox, width: +(w * scale).toFixed(2), height: +(h * scale).toFixed(2) };
    }

    /**
     * Derives the symbol for a badge whose class list is `classString`
     * (e.g. "annotIcon wega.annotation.category.articulation").
     * @returns {{text:string, fontFamily:string, viewBox:string, width:number, height:number}|null}
     *          null when the category has no glyph (e.g. badges that use an
     *          <edirom-icon> via iconHtml instead).
     */
    EdiromOnline.getAnnotationSymbol = function (classString) {
        var probe = document.createElement('span');
        probe.className = classString;
        probe.style.cssText = 'position:absolute;left:-9999px;top:-9999px;visibility:hidden;';
        document.body.appendChild(probe);
        var cs = window.getComputedStyle(probe, '::before');
        var text = decodeContent(cs.content);
        var fontFamily = cs.fontFamily;
        var fontStyle = cs.fontStyle;
        var fontWeight = cs.fontWeight;
        var fontSizePx = parseFloat(cs.fontSize) || 13;
        document.body.removeChild(probe);

        if (text == null) return null;

        var key = fontStyle + '|' + fontWeight + '|' + fontSizePx + '|' + fontFamily + '|' + text;
        if (cache[key]) return cache[key];

        var g = geometry(text, fontStyle, fontWeight, fontFamily, fontSizePx);
        if (!g) return null;

        var symbol = { text: text, fontFamily: fontFamily, viewBox: g.viewBox, width: g.width, height: g.height };

        // Measuring an unloaded web font would centre a fallback glyph; only cache
        // once the real font is available. Trigger loading so a later push is correct.
        var ready = !document.fonts ||
            document.fonts.check(fontSizePx + 'px ' + fontFamily, text);
        if (ready) {
            cache[key] = symbol;
        } else if (document.fonts.load) {
            document.fonts.load(fontSizePx + 'px ' + fontFamily, text);
        }
        return symbol;
    };
})();
