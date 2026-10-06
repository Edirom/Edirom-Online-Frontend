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

    concordanceTabId: 'concordance',

    init: function() {

        this.mainContent = null;
        this.mainContentWorkId = null;     // the work that mainContent belongs to

        this.concordanceConnection = null; // last { connectionId, plist } reported by the concordance navigator
        this.concordanceDefinition = [];   // navigatorDefinition built from that connection
        this.concordanceTabShown = false;
        this.concordanceRequestId = 0;     // discards results of superseded or cancelled builds

        this.application.addListener('workSelected', this.onWorkSelected, this);
        this.application.addListener('concordanceConnectionChanged', this.onConcordanceConnectionChanged, this);

        this.control({
            'navigator': {
                afterrender: this.onNavigatorRendered
            },
            'concordanceNavigator': {
                show: this.onConcordanceWindowShown,
                hide: this.onConcordanceWindowHidden,
                destroy: this.onConcordanceWindowHidden
            }
        });
    },

    updateNavigatorContent: function (workId) {
        var me = this;

        var editionId = this.application.activeEdition;
        var lang = window.getLanguage('application_language');

        this.fetchNavigatorContent(workId, editionId, lang, function (navigatorContent) {
            me.mainContent = navigatorContent;
            me.mainContentWorkId = workId;
            me.applyNavigatorData();
            if (me.concordanceTabShown && me.concordanceConnection) me.refreshConcordanceTab(); // arranged like this config
        });


    },

    applyNavigatorData: function (activeTab) {
        if (!this.ediromNavigator) return;

        var tabs = [{
            id: 'main',
            name: getLangString('controller.navigator.Navigator_NavigationTab'),
            navigatorDefinition: (this.mainContent && this.mainContent.navigatorDefinition) || []
        }];

        if (this.concordanceTabShown) {
            tabs.push({
                id: this.concordanceTabId,
                name: getLangString('controller.navigator.Navigator_ConcordanceTab'),
                navigatorDefinition: this.concordanceDefinition
            });
        }

        this.ediromNavigator.setAttribute('navigator-data', JSON.stringify(tabs));
        if (activeTab) this.ediromNavigator.setAttribute('active-tab', activeTab);
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
        me.ediromNavigator.setAttribute('no-content-message', getLangString('controller.navigator.Navigator_NoContent'));

        this.updateNavigatorContent(this.application.activeWork);

        me.ediromNavigator.addEventListener('load-links-request', function (e) {
            var targets = e.detail;
            let { target, config } = me.parseTargets(targets);
            loadLink(target, config);
        });

    },

    onConcordanceConnectionChanged: function (connection) {
        this.concordanceConnection = connection;
        if (this.concordanceTabShown) this.refreshConcordanceTab();
    },

    onConcordanceWindowShown: function () {
        this.concordanceTabShown = true;
        this.applyNavigatorData(this.concordanceTabId);
        if (this.concordanceConnection) this.refreshConcordanceTab();
    },

    onConcordanceWindowHidden: function () {
        this.concordanceTabShown = false;
        this.concordanceRequestId++;
        this.applyNavigatorData();
    },

    refreshConcordanceTab: function () {
        var me = this;
        var requestId = ++me.concordanceRequestId;

        me.buildConcordanceDefinition(me.concordanceConnection.plist).then(function (definition) {
            if (requestId !== me.concordanceRequestId) return;

            me.concordanceDefinition = definition;
            me.applyNavigatorData(); // no active tab: never pull the user away from the tab they are on
        });
    },

    /**
     * Turns a connection's plist into a navigatorDefinition: the members are placed in the structure of
     * the edition's navigator config, the others go to two trailing categories (see buildConcordanceNavigatorData).
     * Resolves once the names that neither the config nor the connection provide have been fetched.
     */
    buildConcordanceDefinition: function (plist) {
        var me = this;
        // a config of another work (the new one may still be loading) must not be used
        var config = me.mainContent && me.mainContentWorkId === me.application.activeWork ? me.mainContent.navigatorDefinition : [];

        var definition = me.buildConcordanceNavigatorData(plist, config, {
            additionalDocuments: getLangString('controller.navigator.Navigator_ConcordanceDocuments'),
            additionalResources: getLangString('controller.navigator.Navigator_ConcordanceExternalResources')
        }).navigatorDefinition;

        return me.fillNames(definition).then(function () {
            me.addUseExisting(definition);
            return definition;
        });
    },

    /**
     * Sets the names of the items that have none yet, using one request for all of their documents.
     */
    fillNames: function (definition) {
        var me = this;
        var nameless = me.collectNameless(definition);
        var docs = [];

        Ext.Array.each(nameless, function (item) {
            Ext.Array.each(me.getTargetUris(item.targets), function (uri) {
                if (me.getMemberType(uri) === 'doc') docs.push(me.splitUri(uri).doc);
            });
        });

        return me.fetchLinkTargets(docs).then(function (titles) {
            Ext.Array.each(nameless, function (item) {
                item.name = Ext.Array.map(me.getTargetUris(item.targets), function (uri) {
                    return me.getMemberType(uri) === 'doc' ? (titles[me.splitUri(uri).doc] || getLangString('global_unknown')) : uri;
                }).join(' & ');
            });
        });
    },

    /**
     * Makes documents of the concordance tab reuse an already open window.
     */
    addUseExisting: function (definition) {
        var me = this;

        Ext.Array.each(definition, function (node) {
            if (node.type === 'navigatorCategory') {
                me.addUseExisting(node.items);
            } else if (node.type === 'navigatorItem') {
                var uris = me.getTargetUris(node.targets);
                if (!Ext.Array.some(uris, function (uri) { return me.getMemberType(uri) === 'doc'; })) return;

                var prefs = Ext.apply({}, me.parseTargets(node.targets).config, { useExisting: true });
                node.targets = [me.buildTargets(uris[0], prefs)].concat(uris.slice(1)).join(' ');
            }
        });
    },

    /**
     * Resolves with the titles of the given documents (an object keyed by document URI) using a single request.
     * Documents that cannot be resolved have no entry. The success callback must not throw,
     * otherwise doAJAXRequest retries the request.
     */
    fetchLinkTargets: function (docs) {
        var uniqueDocs = Ext.Array.unique(docs);
        if (!uniqueDocs.length) return Promise.resolve({});

        return new Promise(function (resolve) {
            window.doAJAXRequest('data/xql/getLinkTargets.xql', 'POST', { uri: uniqueDocs }, function (response) {
                var titles = {};
                Ext.Array.each(Ext.JSON.decode(response.responseText, true) || [], function (linkTarget) {
                    titles[linkTarget.uri] = linkTarget.title;
                });
                resolve(titles);
            });
        });
    },

    /*
     * Concordance data
     * ----------------
     * The following methods arrange the members of a concordance connection (the URIs of its plist) in the structure of the edition's navigatorConfig, so they live in the same (sub-)categories and carry the same names. Members without a counterpart in the config are collected in two trailing categories.
     *
     * A config target T binds a member M if both point to the same document, and
     *  - exact:     T and M have the same hash (both may be empty), or
     *  - hash-less: T has no hash, M has one. M is still listed, with its own hash as target.
     * A config hash that differs from M's hash (or M has none) never matches. Exact beats hash-less: a member that matches some config target exactly ignores the hash-less ones. A member is placed at every config item it matches, and several members may match one item. An item with several targets is placed only if every one of its targets is bound to a member. Prefs ([width:825]) of the config are not transferred; the member's own prefs are kept. Categories without any placed item disappear, and so do separators.
     */

    /**
     * Builds the navigator data for a concordance connection.
     * @param {String} plist The plist of the connection
     * @param {Object[]} configDefinition The navigatorDefinition of the edition's navigatorConfig
     * @param {Object} labels The names of the trailing categories: { additionalDocuments, additionalResources }
     * @return {Object} { navigatorDefinition }. Some items may still lack a name, see collectNameless.
     */
    buildConcordanceNavigatorData: function (plist, configDefinition, labels) {
        var me = this;
        var members = me.splitMembers(plist);
        var nextItemId = me.createItemIdGenerator();
        var placed = new Set();

        var bound = me.bindMembers(members, me.indexConfigItems(configDefinition));
        var projected = me.projectOntoConfig(configDefinition, bound, nextItemId, placed);
        var remainder = me.buildRemainderCategories(Ext.Array.filter(members, function (member) {
            return !placed.has(member);
        }), labels, nextItemId);

        return { navigatorDefinition: projected.concat(remainder) };
    },

    /**
     * Parses the plist of a connection into members.
     * Members are separated by whitespace or semicolons; a [...] pref block belongs to the URI it follows.
     * @return {Object[]} Members { uri, doc, hash, type, name, prefs }: `uri` is the URI without prefs, `type` is
     *   'doc', 'external' or 'unknown', `name` is the [name:..] pref or an empty string, `prefs` are the remaining prefs.
     */
    splitMembers: function (plist) {
        var me = this;
        var members = [];

        Ext.Array.each(me.tokenizePlist(plist), function (token) {
            var parsed = me.parseTargets(token);
            if (!parsed.target) return;

            var prefs = Ext.apply({}, parsed.config);
            var name = prefs.name;
            delete prefs.name;

            members.push(Ext.apply({
                uri: parsed.target,
                type: me.getMemberType(parsed.target),
                name: name ? String(name) : '',
                prefs: prefs
            }, me.splitUri(parsed.target)));
        });
        return members;
    },

    /** Splits a plist at whitespace/semicolons, but not inside a [...] block. */
    tokenizePlist: function (plist) {
        var tokens = [];
        var current = '';
        var depth = 0;

        Ext.Array.each((plist || '').split(''), function (ch) {
            if (ch === '[') depth++;
            if (ch === ']') depth = Math.max(0, depth - 1);
            if (depth === 0 && (/\s/.test(ch) || ch === ';')) {
                if (current) tokens.push(current);
                current = '';
            } else {
                current += ch;
            }
        });
        if (current) tokens.push(current);
        return tokens;
    },

    getMemberType: function (uri) {
        if (/^xmldb:exist/.test(uri)) return 'doc';
        if (/^(https?:|www\.)/.test(uri)) return 'external';
        return 'unknown';
    },

    /**
     * Splits a URI into its document and its hash (everything from the first #, so #a#b is one opaque hash).
     * For documents a ?term=/?path= query counts as part of the hash, too.
     */
    splitUri: function (uri) {
        var splitAt = /^xmldb:exist/.test(uri) ? uri.search(/[#?]/) : uri.indexOf('#');
        return splitAt === -1 ? { doc: uri, hash: '' } : { doc: uri.substring(0, splitAt), hash: uri.substring(splitAt) };
    },

    /** The URIs of a targets string, without its config block. */
    getTargetUris: function (targets) {
        return Ext.Array.filter(this.parseTargets(targets).target.split(/[\s;]+/), Boolean);
    },

    /**
     * Collects all items of a navigatorDefinition (any depth) together with their parsed targets.
     * Items without targets can never match and are left out.
     * @return {Object[]} { item, targets: [{ doc, hash }] }
     */
    indexConfigItems: function (definition) {
        var me = this;
        var indexed = [];

        Ext.Array.each(definition || [], function (node) {
            if (node.type === 'navigatorCategory') {
                indexed = indexed.concat(me.indexConfigItems(node.items));
            } else if (node.type === 'navigatorItem') {
                var targets = Ext.Array.map(me.getTargetUris(node.targets), function (uri) { return me.splitUri(uri); });
                if (targets.length) indexed.push({ item: node, targets: targets });
            }
        });
        return indexed;
    },

    getMatchKind: function (member, target) {
        if (member.doc !== target.doc) return null;
        if (member.hash === target.hash) return 'exact';
        return target.hash === '' ? 'hash-less' : null;
    },

    /**
     * Binds every member to the config targets it matches.
     * @return {Map} For each config item one list of bound members per target, in plist order
     */
    bindMembers: function (members, configItems) {
        var me = this;
        var bound = new Map();

        Ext.Array.each(configItems, function (entry) {
            bound.set(entry.item, Ext.Array.map(entry.targets, function () { return []; }));
        });

        Ext.Array.each(members, function (member) {
            var hits = [];
            Ext.Array.each(configItems, function (entry) {
                Ext.Array.each(entry.targets, function (target, index) {
                    var kind = me.getMatchKind(member, target);
                    if (kind) hits.push({ item: entry.item, index: index, kind: kind });
                });
            });

            var exactHits = Ext.Array.filter(hits, function (hit) { return hit.kind === 'exact'; });
            Ext.Array.each(exactHits.length ? exactHits : hits, function (hit) {
                bound.get(hit.item)[hit.index].push(member);
            });
        });
        return bound;
    },

    /** Creates a generator for unique item ids. */
    createItemIdGenerator: function () {
        var counter = 0;
        return function () { return 'concordance-item-' + counter++; };
    },

    /** Builds the navigator item for one or more members; configItem is the config item it replaces, if any. */
    createItem: function (members, configItem, nextItemId) {
        var me = this;
        var names = Ext.Array.filter(Ext.Array.pluck(members, 'name'), Boolean);

        return {
            id: nextItemId(),
            type: 'navigatorItem',
            name: names[0] || (configItem && configItem.name) || '',
            targets: [me.buildTargets(members[0].uri, members[0].prefs)].concat(Ext.Array.pluck(members.slice(1), 'uri')).join(' ')
        };
    },

    /** The items a config item turns into: one per member for a single target, one in total for several targets. */
    placeConfigItem: function (configItem, membersPerTarget, nextItemId) {
        var me = this;

        if (Ext.Array.some(membersPerTarget, function (members) { return members.length === 0; })) return [];

        if (membersPerTarget.length === 1) {
            return Ext.Array.map(membersPerTarget[0], function (member) {
                return { item: me.createItem([member], configItem, nextItemId), members: [member] };
            });
        }

        var members = Ext.Array.map(membersPerTarget, function (list) { return list[0]; });
        return [{ item: me.createItem(members, configItem, nextItemId), members: members }];
    },

    /**
     * Copies the structure of the navigatorDefinition, replacing the config items by the members bound to them
     * and dropping everything that ends up empty.
     * @param {Set} placed Receives the members that were placed
     */
    projectOntoConfig: function (definition, bound, nextItemId, placed) {
        var me = this;
        var projected = [];

        Ext.Array.each(definition || [], function (node) {
            if (node.type === 'navigatorCategory') {
                var items = me.projectOntoConfig(node.items, bound, nextItemId, placed);
                if (items.length) projected.push({ id: 'concordance-' + node.id, type: 'navigatorCategory', name: node.name, items: items });
            } else if (node.type === 'navigatorItem' && bound.has(node)) {
                Ext.Array.each(me.placeConfigItem(node, bound.get(node), nextItemId), function (placement) {
                    Ext.Array.each(placement.members, function (member) { placed.add(member); });
                    projected.push(placement.item);
                });
            }
        });
        return projected;
    },

    /**
     * Builds the two trailing categories for the members that were not placed.
     * Empty categories are omitted, members of an unknown URI type are ignored.
     */
    buildRemainderCategories: function (members, labels, nextItemId) {
        var me = this;
        var groups = [
            { id: 'concordance-more-docs', name: labels.additionalDocuments, type: 'doc' },
            { id: 'concordance-more-resources', name: labels.additionalResources, type: 'external' }
        ];
        var categories = [];

        Ext.Array.each(groups, function (group) {
            var items = Ext.Array.map(Ext.Array.filter(members, function (member) { return member.type === group.type; }), function (member) {
                return me.createItem([member], null, nextItemId);
            });
            if (items.length) categories.push({ id: group.id, type: 'navigatorCategory', name: group.name, items: items });
        });
        return categories;
    },

    /** Collects the items that still have no name, at any depth. */
    collectNameless: function (definition) {
        var me = this;
        var nameless = [];

        Ext.Array.each(definition || [], function (node) {
            if (node.type === 'navigatorCategory') {
                nameless = nameless.concat(me.collectNameless(node.items));
            } else if (node.type === 'navigatorItem' && !node.name) {
                nameless.push(node);
            }
        });
        return nameless;
    },

    /**
     * Inverse of parseTargets for a single URI: appends the prefs as a [key=value,...] block.
     * Strings are quoted, booleans and numbers are not; other types are skipped.
     */
    buildTargets: function (uri, prefs) {
        var serialize = function (value) {
            if (typeof value === 'boolean') return value ? 'true' : 'false';
            if (typeof value === 'number') return String(value);
            if (Ext.isArray(value)) return '[' + Ext.Array.map(value, serialize).join(',') + ']';
            if (typeof value === 'string') return "'" + value + "'";
            return null;
        };
        var pairs = [];

        Ext.Object.each(prefs || {}, function (key, value) {
            var serialized = serialize(value);
            if (serialized !== null) pairs.push(key + '=' + serialized);
        });
        return pairs.length ? uri + '[' + pairs.join(',') + ']' : uri;
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

        this.concordanceConnection = null;
        this.concordanceDefinition = [];
        this.concordanceRequestId++;
        this.applyNavigatorData();

        this.updateNavigatorContent(workId);

    }
});

