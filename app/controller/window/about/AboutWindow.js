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

    views: [
        'window.about.AboutWindow'
    ],

    init: function() {
        this.control({
            'aboutWindow': {
               afterlayout : this.onAfterLayout
            }
        });
    },

    onAfterLayout: function(view) {

        var me = this;

        if(view.initialized) return;
        view.initialized = true;

        // Specify URLs of CITATION.cff files of frontend and backend
        const backendURL = '@backend.url@';
        const frontendURL = location.origin + location.pathname.replaceAll("/index.html", "/");
        const frontendURLcitation = frontendURL + 'resources/CITATION.cff';
        const backendURLcitation = backendURL + 'resources/CITATION.cff';


        // Fetching content of CITATION.cff files and turn into HTML        
        async function fetchContent(url) {

            console.log("Fetching " + url);

            const response = await fetch(url);
            const citation = await response.text();

            const title = citation.match(/^title: (.*)/m)[1];
            const abstract = String(citation.match(/^abstract:\s>-\n(\s+.*\n)+/gm)).replace(/^abstract:\s>-\n/, '');
            const version = citation.match(/^version: (.*)/m)[1];
            const releaseDate = citation.match(/^date\-released: (.*)/m)[1];
            const license = citation.match(/^license: (.*)/m)[1];
            const repoUrl = citation.match(/^repository\-code: (.*)/m)[1];
            const doi = citation.match(/value: .*?([0-9]+\.[0-9]+\/zenodo\.[0-9]+)/)[1];

            const resultHTML = `                
                <h1>About ${title}</h1>
                <section class="teidiv0">
                    <p>${abstract}</p>
                    <p>Version: ${version}</p>
                    <p>Release date: ${releaseDate}</p>
                    <p>DOI: <a target="_blank" href="https://doi.org/${doi}">${doi}</a></p>
                    <p>${getLangString('view.window.about.AboutWindow_License')}: ${license}</p>
                    <p>GitHub: <a target="_blank" href="${repoUrl}">${repoUrl}</a></p>
                    <p>Contributors: <br/>
                        <a target="_blank" href="${repoUrl}/graphs/contributors" title="See contributors to ${title} GitHub project">
                            <img height="50px" id="github-contributors" src="https://contrib.rocks/image?repo=${repoUrl.replace(/^https?:\/\/github.com\//, '')}&max=14&columns=7" alt="Avatars of contributors to ${title} in GitHub" />
                        </a>
                    </p>
                </section>                
            `;

            return resultHTML;
        }

        // Fetching content of CITATION.cff files and set result
        Promise.all([
            fetchContent(frontendURLcitation),
            fetchContent(backendURLcitation)
        ]).then(function([frontend, backend]) {
            view.setResult(`
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
                    ${frontend}
                    ${backend}
                </div>`);
        }).catch(function(error) {
            console.error('Error fetching CITATION.cff files:', error);
            view.setResult(`
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
