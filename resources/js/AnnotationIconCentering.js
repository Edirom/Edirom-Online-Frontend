/**
 *  Edirom Online
 *  Copyright (C) 2026 The Edirom Project
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
 *
 */
/**
 * Centers the glyph of every annotation badge (.annotIcon) on its visible ink.
 *
 * Edition stylesheets draw the badge icon as a font glyph in ::before/::after.
 * Flexbox (see resources/css/annotation-style.css) centers that pseudo-element's
 * advance box, but font glyphs carry side bearings and sit at arbitrary heights
 * above the baseline, so the visible shape is still off-center, differently for
 * every glyph and font size. Instead of hand-tuning offsets per glyph per
 * edition, this measures each glyph's ink bounds and publishes the correction
 * as --annot-glyph-dx / --annot-glyph-dy on the badge, which annotation-style.css
 * applies with the `translate` property.
 *
 * Plain JS (no Ext), so it also works on badges inside a shadow root, such as
 * the overlays of the edirom-image-viewer web component:
 *
 *     EdiromOnline.annotIconCentering.observe(document.body);
 *     EdiromOnline.annotIconCentering.observe(viewerElement.shadowRoot);
 */
(function () {
    window.EdiromOnline = window.EdiromOnline || {};

    var PSEUDO_ELEMENTS = ['::before', '::after'];

    // font + text + letter-spacing -> Promise<{dx, dy} | null>. One measurement per distinct icon.
    var cache = {};
    var ctx = null;

    function getContext() {
        if (!ctx) ctx = document.createElement('canvas').getContext('2d');
        return ctx;
    }

    // Computed `content` -> the rendered string, or null for none/normal/url()/counter()/attr().
    function readContent(value) {
        if (!value || value.charAt(0) !== '"') return null;
        return value.slice(1, -1)
            .replace(/\\([0-9a-fA-F]{1,6}) ?/g, function (m, hex) {
                return String.fromCodePoint(parseInt(hex, 16));
            })
            .replace(/\\(.)/g, '$1');
    }

    // Offset (CSS px) that moves the glyph's ink center onto the center of the
    // pseudo-element's box. The box is as wide as the advance width and, with
    // line-height 1, as tall as the font size; the baseline sits at
    // fontSize/2 + (fontAscent - fontDescent)/2 below its top edge.
    function measure(font, text, letterSpacing) {
        var c = getContext();
        c.font = font;
        if ('letterSpacing' in c) c.letterSpacing = letterSpacing;
        var m = c.measureText(text);
        if (m.fontBoundingBoxAscent === undefined) return null;

        var inkWidth = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
        var inkHeight = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
        if (inkWidth <= 0 || inkHeight <= 0) return { dx: 0, dy: 0 };

        var inkCenterX = (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2;
        var inkCenterBelowBaseline = (m.actualBoundingBoxDescent - m.actualBoundingBoxAscent) / 2;
        var baselineBelowBoxCenter = (m.fontBoundingBoxAscent - m.fontBoundingBoxDescent) / 2;

        return {
            dx: m.width / 2 - inkCenterX,
            dy: -(baselineBelowBoxCenter + inkCenterBelowBaseline)
        };
    }

    function measureCached(font, text, letterSpacing) {
        var key = font + '|' + text + '|' + letterSpacing;
        if (!cache[key]) {
            // The glyph font may not be loaded yet; measuring a fallback font would center the wrong shape.
            var loaded = (document.fonts && document.fonts.load)
                ? document.fonts.load(font, text).catch(function () {})
                : Promise.resolve();
            cache[key] = loaded.then(function () { return measure(font, text, letterSpacing); });
        }
        return cache[key];
    }

    function center(badge) {
        for (var i = 0; i < PSEUDO_ELEMENTS.length; i++) {
            var cs = window.getComputedStyle(badge, PSEUDO_ELEMENTS[i]);
            var text = readContent(cs.content);
            if (text == null || text === '') continue;

            var font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
            var letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;

            measureCached(font, text, letterSpacing).then(function (offset) {
                if (!offset || !badge.isConnected) return;
                badge.style.setProperty('--annot-glyph-dx', offset.dx.toFixed(2) + 'px');
                badge.style.setProperty('--annot-glyph-dy', offset.dy.toFixed(2) + 'px');
            });
            return;
        }
    }

    function centerWithin(node) {
        if (node.nodeType !== 1) return;
        if (node.matches('.annotIcon')) center(node);
        var badges = node.querySelectorAll('.annotIcon');
        for (var i = 0; i < badges.length; i++) center(badges[i]);
    }

    // A badge rendered before the stylesheet that gives its ::before a `content`
    // has nothing to measure yet (the image viewer clones its overlay
    // stylesheets as <link>s, which load asynchronously), so measure again once
    // each stylesheet in the root has loaded.
    function rescanWhenLoaded(link, root) {
        if (link.localName !== 'link' || link.sheet) return;
        link.addEventListener('load', function () {
            var badges = root.querySelectorAll('.annotIcon');
            for (var i = 0; i < badges.length; i++) center(badges[i]);
        });
    }

    EdiromOnline.annotIconCentering = {

        // Centers the badges already inside `root` (a document, element or
        // shadow root) and every badge added to it later. Safe to call twice.
        observe: function (root) {
            if (!root || root.__ediromAnnotIconCentering) return;
            root.__ediromAnnotIconCentering = true;

            var existing = root.querySelectorAll('.annotIcon');
            for (var i = 0; i < existing.length; i++) center(existing[i]);
            var links = root.querySelectorAll('link[rel="stylesheet"]');
            for (var l = 0; l < links.length; l++) rescanWhenLoaded(links[l], root);

            new MutationObserver(function (mutations) {
                for (var m = 0; m < mutations.length; m++) {
                    var added = mutations[m].addedNodes;
                    for (var n = 0; n < added.length; n++) {
                        centerWithin(added[n]);
                        rescanWhenLoaded(added[n], root);
                    }
                }
            }).observe(root, { childList: true, subtree: true });
        },

        center: center
    };

    function observeDocument() {
        EdiromOnline.annotIconCentering.observe(document.body);
    }

    if (document.body) observeDocument();
    else document.addEventListener('DOMContentLoaded', observeDocument);
})();
