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

/**
 * Parses CITATION.cff files and renders them as HTML for the About window.
 *
 * Every field is optional: a line is only rendered for a field that is present.
 * Fields with a dedicated layout are rendered first, in a fixed order; all other
 * fields follow as generic label/value rows. All values are HTML-escaped, and a
 * value only becomes a link when it is an http(s) URL.
 *
 * Requires js-yaml (global `jsyaml`), loaded from index.html.
 */
Ext.define('EdiromOnline.util.CffRenderer', {

    singleton: true,

    /**
     * Fields that are rendered with a dedicated layout, or deliberately not at all.
     * `cff-version` describes the file format, not the cited work.
     */
    handledFields: [
        'cff-version', 'title', 'abstract', 'version', 'date-released', 'doi',
        'identifiers', 'license', 'repository-code', 'commit', 'authors'
    ],

    /**
     * Parses the text of a CITATION.cff file.
     *
     * The failsafe schema keeps every scalar a string, so values such as
     * `version: 1.0` or `date-released: 2021-08-11` are shown exactly as written.
     *
     * @param {String} text The file content
     * @return {Object} The parsed top-level mapping
     */
    parse: function(text) {
        var cff = jsyaml.load(text, { schema: jsyaml.FAILSAFE_SCHEMA });

        if (!cff || typeof cff !== 'object' || Ext.isArray(cff)) {
            throw new Error('CITATION.cff does not contain a YAML mapping');
        }

        return cff;
    },

    /**
     * Renders a parsed CITATION.cff as HTML.
     *
     * @param {Object} cff The parsed file, see #parse
     * @return {String} The HTML
     */
    render: function(cff) {
        var me = this;
        var rows = [];
        var title = me.text(cff.title);
        var repoUrl = me.isHttpUrl(cff['repository-code']) ? cff['repository-code'] : null;
        var githubRepo = me.getGithubRepo(repoUrl);
        var doi = me.getDoi(cff);
        var commit = me.text(cff.commit);
        var html = '';

        if (me.text(cff.abstract)) {
            rows.push('<p>' + me.escape(cff.abstract) + '</p>');
        }
        if (me.text(cff.version)) {
            rows.push('<p>Version: ' + me.escape(cff.version) + '</p>');
        }
        if (me.text(cff['date-released'])) {
            rows.push('<p>Date: ' + me.escape(cff['date-released']) + '</p>');
        }
        if (doi) {
            rows.push('<p>DOI: ' + me.link('https://doi.org/' + doi, doi) + '</p>');
        }
        if (cff.license) {
            rows.push('<p>' + getLangString('view.window.about.AboutWindow_License') + ': '
                + me.escape(Ext.isArray(cff.license) ? cff.license.join(', ') : cff.license) + '</p>');
        }
        if (repoUrl) {
            rows.push('<p>' + (githubRepo ? 'GitHub' : 'Repository') + ': ' + me.link(repoUrl, repoUrl) + '</p>');
        } else if (me.text(cff['repository-code'])) {
            rows.push('<p>Repository: ' + me.escape(cff['repository-code']) + '</p>');
        }
        if (commit) {
            rows.push('<p>Revision: ' + (githubRepo
                ? me.link(repoUrl.replace(/\/+$/, '') + '/tree/' + encodeURIComponent(commit), commit.substring(0, 7) + '...')
                : me.escape(commit)) + '</p>');
        }
        if (githubRepo) {
            rows.push('<p>Contributors: <br/>'
                + '<a target="_blank" href="' + me.escape('https://github.com/' + githubRepo + '/graphs/contributors') + '"'
                + ' title="' + me.escape('See contributors to ' + (title || githubRepo) + ' GitHub project') + '">'
                + '<img height="50px" src="' + me.escape('https://contrib.rocks/image?repo=' + githubRepo + '&max=14&columns=7') + '"'
                + ' alt="' + me.escape('Avatars of contributors to ' + (title || githubRepo) + ' in GitHub') + '" />'
                + '</a></p>');
        }
        if (Ext.isArray(cff.authors) && cff.authors.length > 0) {
            rows.push('<p>Authors: ' + Ext.Array.map(cff.authors, me.renderPerson, me).join('; ') + '</p>');
        }

        Ext.Array.each(me.getOtherIdentifiers(cff, doi), function(identifier) {
            rows.push(me.row(me.label(identifier.type || 'identifier'), me.renderValue(identifier.value)
                + (me.text(identifier.description) ? ' (' + me.escape(identifier.description) + ')' : '')));
        });

        Ext.Object.each(cff, function(key, value) {
            if (Ext.Array.contains(me.handledFields, key)) return;
            var rendered = me.renderValue(value);
            if (rendered) {
                rows.push(me.row(me.label(key), rendered));
            }
        });

        if (title) {
            html += '<h1>About ' + me.escape(title) + '</h1>';
        }
        if (rows.length > 0) {
            html += '<section class="teidiv0">' + rows.join('') + '</section>';
        }

        return html;
    },

    /**
     * Renders a CFF person or entity: name, linked to the ORCID when there is one.
     */
    renderPerson: function(person) {
        var me = this;

        if (!person || typeof person !== 'object') {
            return me.escape(person);
        }

        var name = me.text(person.name) || Ext.Array.filter([
            person['given-names'], person['name-particle'], person['family-names'], person['name-suffix']
        ], function(part) { return me.text(part); }).join(' ') || me.text(person.alias);

        if (!name) return '';

        return me.isHttpUrl(person.orcid) ? me.link(person.orcid, name) : me.escape(name);
    },

    /**
     * Renders any parsed YAML value: strings, lists and mappings, recursively.
     */
    renderValue: function(value) {
        var me = this;

        if (value === null || value === undefined) return '';

        if (Ext.isArray(value)) {
            var items = Ext.Array.filter(Ext.Array.map(value, me.renderValue, me), function(item) { return item; });
            return items.length > 0 ? '<ul><li>' + items.join('</li><li>') + '</li></ul>' : '';
        }

        if (typeof value === 'object') {
            var entries = [];
            Ext.Object.each(value, function(key, nested) {
                var rendered = me.renderValue(nested);
                if (rendered) entries.push('<em>' + me.escape(me.label(key)) + '</em>: ' + rendered);
            });
            return entries.length > 0 ? '<ul><li>' + entries.join('</li><li>') + '</li></ul>' : '';
        }

        var text = me.text(value);
        if (!text) return '';
        return me.isHttpUrl(text) ? me.link(text, text) : me.escape(text);
    },

    /**
     * Returns the DOI, from the top-level `doi` field or the first identifier of type `doi`.
     * A DOI given as a resolver URL is reduced to the bare DOI.
     */
    getDoi: function(cff) {
        var me = this;
        var doi = me.text(cff.doi);

        if (!doi && Ext.isArray(cff.identifiers)) {
            Ext.Array.each(cff.identifiers, function(identifier) {
                if (identifier && identifier.type === 'doi' && me.text(identifier.value)) {
                    doi = me.text(identifier.value);
                    return false;
                }
            });
        }

        return doi ? doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '') : null;
    },

    /**
     * Returns the identifiers that are not already shown as the DOI line.
     */
    getOtherIdentifiers: function(cff, doi) {
        var me = this;
        var doiShown = false;

        if (!Ext.isArray(cff.identifiers)) return [];

        return Ext.Array.filter(cff.identifiers, function(identifier) {
            if (!identifier || typeof identifier !== 'object') return false;
            if (!doiShown && doi && !me.text(cff.doi) && identifier.type === 'doi'
                    && me.text(identifier.value).replace(/^https?:\/\/(dx\.)?doi\.org\//i, '') === doi) {
                doiShown = true;
                return false;
            }
            return !!me.text(identifier.value);
        });
    },

    /**
     * Returns `owner/name` for a github.com repository URL, otherwise null.
     */
    getGithubRepo: function(url) {
        var match = url && url.match(/^https?:\/\/(?:www\.)?github\.com\/([^\/\s?#]+\/[^\/\s?#]+?)(?:\.git)?\/?$/i);
        return match ? match[1] : null;
    },

    /**
     * Labels for keys and identifier types that are abbreviations.
     */
    labels: {
        'doi': 'DOI',
        'url': 'URL',
        'swh': 'SWH'
    },

    /**
     * Turns a CFF key into a label, e.g. `repository-artifact` into `Repository artifact`.
     */
    label: function(key) {
        var text = String(key);
        if (this.labels.hasOwnProperty(text)) return this.labels[text];
        text = text.replace(/-/g, ' ');
        return text.charAt(0).toUpperCase() + text.slice(1);
    },

    /**
     * Renders one label/value row. A value containing a list needs a block
     * container, because a list is not allowed inside a paragraph.
     */
    row: function(label, valueHtml) {
        var tag = valueHtml.indexOf('<ul>') !== -1 ? 'div' : 'p';
        return '<' + tag + '>' + this.escape(label) + ': ' + valueHtml + '</' + tag + '>';
    },

    link: function(url, text) {
        return '<a target="_blank" href="' + this.escape(url) + '">' + this.escape(text) + '</a>';
    },

    isHttpUrl: function(value) {
        return typeof value === 'string' && /^https?:\/\/[^\s"'<>]+$/i.test(value.trim());
    },

    /**
     * Returns a trimmed string for a scalar value, or '' for anything else.
     */
    text: function(value) {
        return typeof value === 'string' ? value.trim() : '';
    },

    escape: function(value) {
        return String(value === null || value === undefined ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
});
