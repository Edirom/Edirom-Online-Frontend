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
Ext.define('EdiromOnline.controller.navigator.Navigator', {

    extend: 'Ext.app.Controller',

    views: [
        'navigator.Navigator'
    ],

    init: function() {

        this.application.addListener('workSelected', this.onWorkSelected, this);

        this.control({
            'navigator': {
                afterrender: this.onNavigatorRendered
            }
        });
    },

    updateNavigatorContent: function (workId) {
        var me = this;

        var editionId = this.application.activeEdition;
        var lang = window.getLanguage('application_language');

        this.fetchNavigatorContent(workId, editionId, lang, function (navigatorContent) {
            me.ediromNavigator.setAttribute('navigator-data', JSON.stringify(navigatorContent));
        });


    },

    fetchNavigatorContent: function (workId, editionId, lang, onSuccess) {
        window.doAJAXRequest('data/xql/getNavigatorConfig.xql',
            'GET',
            {
                editionId: editionId,
                workId: workId,
                mode: 'json',
                lang: lang
            },
            Ext.bind(function (response) {
                var data = response && response.responseText ? Ext.decode(response.responseText) : null;
                if (Ext.isFunction(onSuccess)) onSuccess(data);
            }, this)
        );
    },

    onNavigatorRendered: function (navigator) {
        var me = this;

        me.ediromNavigator = document.querySelector(`#${navigator.id}-navigator`);

        this.updateNavigatorContent(this.application.activeWork);

        me.ediromNavigator.addEventListener('load-links-request', function (e) {
            var targets = e.detail;
            let { target, config } = me.parseTargets(targets);
            loadLink(target, config);
        });

    },


    /**
     * Parses a targets string into a URI target and a typed config object.
     * TODO: This function should beused centrally in the LinkController in the future
     *
     * The targets string consists of one or more space-separated URIs, with an
     * optional single config block in square brackets anywhere in the string.
     * Config key-value pairs are separated by commas; keys and values are
     * separated by `=` or `:`.
     *
     * Value types are inferred automatically:
     *   - Quoted values ('...' or "...") → string (quotes stripped)
     *   - `true` / `false`               → boolean
     *   - Numeric values (int or float)  → number
     *   - `[item1, item2, ...]`          → array (items are also type-inferred)
     *   - Anything else                  → string
     *
     * Only the first config block is used; any further `[...]` occurrences are
     * stripped from the target string. Multiple spaces in the resulting target
     * are collapsed to a single space.
     *
     * @param {string} targets - The raw targets attribute value.
     * @returns {{ target: string, config: Object }} Parsed target URI(s) and config.
     *
     * @example
     * // Single URI, no config
     * parseTargets('xmldb:exist:///db/apps/foo.xml')
     * // → { target: 'xmldb:exist:///db/apps/foo.xml', config: {} }
     *
     * @example
     * // Multiple URIs, config on first
     * parseTargets('foo.xml[page=2, label='Intro'] bar.xml')
     * // → { target: 'foo.xml bar.xml', config: { page: 2, label: 'Intro' } }
     *
     * @example
     * // Type inference: boolean, number, string, array
     * parseTargets('foo.xml[active=true, scale=1.25, mode=overview, ids=[a,b,c]]')
     * // → { target: 'foo.xml', config: { active: true, scale: 1.25, mode: 'overview', ids: ['a','b','c'] } }
     *
     * @example
     * // Array of numbers, colon separator
     * parseTargets('foo.xml[counts:[1,2,3]]')
     * // → { target: 'foo.xml', config: { counts: [1, 2, 3] } }
     *
     * @example
     * // Config in the middle, extra bracket blocks stripped
     * parseTargets('foo.xml[sort=sortGrid][ignored] bar.xml')
     * // → { target: 'foo.xml bar.xml', config: { sort: 'sortGrid' } }
     */
    parseTargets: function (targets) {
        if (!targets) return { target: '', config: {} };

        // Splits a string on commas, but only at bracket depth 0 —
        // so commas inside array values like [a,b,c] are not treated as pair separators.
        var splitAtDepthZero = function (s) {
            var parts = [];
            var depth = 0, current = '';
            for (var i = 0; i < s.length; i++) {
                var ch = s[i];
                if (ch === '[') { depth++; current += ch; }
                else if (ch === ']') { depth--; current += ch; }
                else if (ch === ',' && depth === 0) { parts.push(current); current = ''; }
                else { current += ch; }
            }
            if (current) parts.push(current); // push last segment (no trailing comma)
            return parts;
        };

        // Infers the JS type of a single config value string.
        var parseValue = function (v) {
            if ((v.indexOf("'") === 0 && v.lastIndexOf("'") === v.length - 1) || (v.indexOf('"') === 0 && v.lastIndexOf('"') === v.length - 1))
                return v.slice(1, -1);                              // quoted → string, strip quotes
            if (v === 'true') return true;
            if (v === 'false') return false;
            if (v !== '' && !isNaN(v) && isFinite(v)) return Number(v); // v !== '' guards against isNaN('') === false
            if (v.indexOf('[') === 0 && v.lastIndexOf(']') === v.length - 1)
                return splitAtDepthZero(v.slice(1, -1)).map(function (item) { return parseValue(item.trim()); }); // recurse for arrays
            return v;                                               // fallback: plain string
        };

        // Walk the string character-by-character to find the first outermost [...]
        // (a simple regex can't handle nested brackets like [sort=[a,b,c]])
        var configStart = -1, depth = 0, configEnd = -1;
        for (var i = 0; i < targets.length; i++) {
            if (targets[i] === '[') {
                if (depth === 0) configStart = i; // record opening of outermost block
                depth++;
            } else if (targets[i] === ']') {
                depth--;
                if (depth === 0 && configStart !== -1) {
                    configEnd = i; // found the matching close bracket
                    break;
                }
            }
        }

        // Remove the config block (and any subsequent [...] blocks) from the URI string,
        // then collapse any resulting double spaces.
        var target = (configStart === -1
            ? targets
            : targets.slice(0, configStart) + targets.slice(configEnd + 1)
        ).replace(/\s+/g, ' ').trim();

        if (configStart === -1) return { target: target, config: {} };

        var cfgString = targets.slice(configStart + 1, configEnd);
        var configPairs = splitAtDepthZero(cfgString).map(function (pair) {
            return pair.split(/[=:](.*)/).slice(0, 2);
        });

        var config = {};
        for (var j = 0; j < configPairs.length; j++) {
            var k = configPairs[j][0];
            var v = configPairs[j][1];
            if (k && k.trim()) {
                config[k.trim()] = parseValue((v && v.trim()) || '');
            }
        }

        return { target: target, config: config };
    },

    onWorkSelected: function(workId) {

        this.updateNavigatorContent(workId);

    }
});

