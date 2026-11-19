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
Ext.define('EdiromOnline.controller.window.about.AboutWindow', {

    extend: 'Ext.app.Controller',

    requires: [
        'EdiromOnline.util.CffRenderer'
    ],

    views: [
        'window.about.AboutWindow'
    ],

    init: function() {
        this.control({
            'aboutWindow': {
                render: this.onWindowRendered,
                single: true
            }
        });
    },

    onWindowRendered: function(win) {
        var me = this;

        // get backend info from config
        if(win.initialized) return;
        win.initialized = true;

        var configController = EdiromOnline.getApplication().getController('ConfigController');
        var backendURL = configController.getConfig('backendURL');


        // Specify URLs of CITATION.cff files of frontend and backend
        const frontendURL = location.origin + location.pathname.replaceAll("/index.html", "/");
        const frontendURLcitation = frontendURL + 'resources/CITATION.cff';
        const backendURLcitation = backendURL + 'resources/CITATION.cff';

        // Specify URL of the current edition's CITATION.cff file
        function getEditionCitationURL(editionURI) {
            // The edition's root collection is either everything before a "content" folder
            // (if the package uses one) or the collection containing the edition file.
            const editionPathMatch = editionURI && editionURI.match(/^(xmldb:exist:\/\/\/db\/.+?)(?:\/content(?:\/.*)?|\/[^\/]+)$/);
            if (!editionPathMatch) return null;

            const resource = editionPathMatch[1] + '/CITATION.cff';
            return backendURL + 'api/document/?' + new URLSearchParams({resource, mediaType: 'text/plain'});
        }
        
        const editionCitationURL = getEditionCitationURL(EdiromOnline.getApplication().getActiveEdition());

        // Fetching content of CITATION.cff files and turn into HTML        
        async function fetchContent(url) {

            console.log("Fetching " + url);

            const response = await fetch(url);
            if (!response.ok) {
                const error = new Error(`Status: ${response.status}`);
                error.status = response.status;
                throw error;
            }
            const citation = await response.text();

            const renderer = EdiromOnline.util.CffRenderer;
            return renderer.render(renderer.parse(citation));
        }

        // Fetching content of CITATION.cff files and set result
        Promise.all([
            fetchContent(frontendURLcitation),
            fetchContent(backendURLcitation),
            editionCitationURL
                ? fetchContent(editionCitationURL).catch(function(error) {
                    // Editions do not have to ship a CITATION.cff, so a missing file is expected
                    if (error.status === 404) {
                        console.warn('No CITATION.cff found for the edition at ' + editionCitationURL);
                    } else {
                        console.error('Error fetching or rendering edition CITATION.cff file:', error);
                    }
                    return '';
                })
                : ''
        ]).then(function([frontend, backend, editionCitation]) {
            win.setResult(`
                <div class="tei_body">
                    ${editionCitation}
                    <h1>About Edirom-Online</h1>
                    <section class="teidiv0">
                        <p>
                            Edirom-Online is a web-based platform for the collaborative editing of complex scholarly digital editions.
                            It is based on the TEI XML standard and provides a rich set of tools for the collaborative editing of texts, images, and other media.
                            Edirom-Online is developed by the Edirom Project.
                        </p>
                        <p>
                            The software consists of two main modules: the frontend and the backend.
                            Information about the parts of the software can be found below.
                        </p>
                    </section>
                    ${frontend}
                    ${backend}
                </div>`);
        }).catch(function(error) {
            console.error('Error fetching CITATION.cff files:', error);
            win.setResult(`
                <div class="tei_body">
                    <h1>About Edirom-Online</h1>
                    <section class="teidiv0">
                        <p>
                            Edirom-Online is a web-based platform for the collaborative editing of complex scholarly digital editions.
                            It is based on the TEI XML standard and provides a rich set of tools for the collaborative editing of texts, images, and other media.
                            Edirom-Online is developed by the Edirom Project.
                        </p>
                        <p>
                            The software consists of two main modules: the frontend and the backend.
                            Information about the parts of the software can be found below.
                        </p>
                    </section>
                    <section class="teidiv0">
                        <p>Error fetching content from CITATION.cff files.</p>
                        <p>URL of backend CITATION.cff file: ${backendURLcitation}</p>
                        <p>URL of frontend CITATION.cff file: ${frontendURLcitation}</p>
                        <p>When encountering this or other issues persistently, please create a report on <a href="https://github.com/Edirom/Edirom-Online/issues/new/choose">https://github.com/Edirom/Edirom-Online/issues/new/choose</a></p>
                    </section>
                </div>
            `);
        })



    }
});
