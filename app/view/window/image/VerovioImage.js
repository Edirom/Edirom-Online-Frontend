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
Ext.define('EdiromOnline.view.window.image.VerovioImage', {
	extend: 'Ext.panel.Panel',

	layout: 'fit',

	initComponent: function () {

		var me = this;

		me.html = `<div id="${me.id}_rendCont" class="renderingViewContent">
		<iframe id="${me.id}_rendContIFrame"></iframe></div>`;

		me.callParent();
	},

setIFrameContent: function(uri, edition) {
    var appBasePath = "/exist/apps/Edirom-Online-Backend/";
    var meiUrl = appBasePath + "/data/xql/getMusicInMdiv.xql?uri=" + uri;

    var me = this;
    var html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verovio Renderer</title>

        <!-- Import Web Component -->
        <script src="./resources/js/edirom-verovio-renderer/edirom-verovio-renderer-component.js" type="text/javascript" charset="utf-8"></script>

        <script src="https://code.jquery.com/jquery-3.5.1.min.js"
                integrity="sha256-9/aliU8dGd2tb6OSsuzixeV4y/faTqgFtohetphbbj0="
                crossorigin="anonymous"></script>

        <script src="//code.iconify.design/1/1.0.6/iconify.min.js"></script>
        <script src="resources/js/he.js"></script>
        <script src="resources/js/tipped/tipped.js"></script>

        <link rel="stylesheet" type="text/css" href="resources/css/tipped/tipped.css"/>
        <link rel="stylesheet" type="text/css" href="resources/css/verovio-view.css"/>
    </head>

    <body style="margin:0; display:flex; flex-direction:column; height:100vh;">

        <!-- Verovio Component container -->
        <div style="flex: 1 1 auto; overflow:auto;">
            <edirom-verovio-renderer
                id="verovioRenderer"
                width="100%"
                height="100%"
                zoom="33"
                pagenumber="1"
                meiurl="${meiUrl}"
				verovioheight="200"
				veroviowidth="200">
            </edirom-verovio-renderer>
        </div>

        <!-- Toolbar -->
        <div id="toolbar" class="noselect" style="
            flex-shrink: 0;
            background: #f9f9f9;
            padding: 10px;
            text-align: center;
            border-top: 1px solid #ccc;
        ">
            <span class="button" onclick="prevPage()" style="cursor:pointer;">
                <svg xmlns="http://www.w3.org/2000/svg" width="1.3em" height="1.3em" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M15.41 16.58L10.83 12l4.58-4.59L14 6l-6 6l6 6z"/>
                </svg>
            </span>
            <span id="page">1</span> / <span id="pageCount">1</span>
            <span class="button" onclick="nextPage()" style="cursor:pointer;">
                <svg xmlns="http://www.w3.org/2000/svg" width="1.3em" height="1.3em" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M8.59 16.58L13.17 12L8.59 7.41L10 6l6 6l-6 6z"/>
                </svg>
            </span>
        </div>

        <!-- Loader (you had this) -->
        <div class='lds-roller'>
            <div></div><div></div><div></div><div></div>
            <div></div><div></div><div></div><div></div>
        </div>

        <script>
            const appBasePath = "/exist/apps/Edirom-Online-Backend/";
            const verovioRenderer = document.getElementById("verovioRenderer");

            // Sync page info
            document.addEventListener('page-info-update', function(e) {
                const { pageNumber, totalPages } = e.detail;
                document.getElementById("page").textContent = pageNumber;
                document.getElementById("pageCount").textContent = totalPages;
            });

            // Navigation
            function nextPage() {
                verovioRenderer.calculatePageNumber("next");
            }

            function prevPage() {
                verovioRenderer.calculatePageNumber("previous");
            }

            // Movement switching
            function showMovement(movementId) {
                const newUrl = appBasePath + "/data/xql/getMusicInMdiv.xql?uri=" + uri + "&edition=" + edition + "&movementId=" + movementId;
                verovioRenderer.setAttribute("meiurl", newUrl);
                verovioRenderer.setAttribute("pagenumber", "1");
            }

            // Go to a specific measure
            function showMeasure(movementId, measureN) {
                showMovement(movementId);
                setTimeout(() => {
                    verovioRenderer.setAttribute("measurenumber", measureN);
                }, 400);
            }

            // Expose for external calls
            window.showMovement = showMovement;
            window.showMeasure = showMeasure;
        </script>
    </body>
    </html>`;

    var iframe = me.el.getById(me.id + '_rendContIFrame');
    iframe.dom.contentWindow.document.open();
    iframe.dom.contentWindow.document.write(html);
    iframe.dom.contentWindow.document.close();
},

	showMovement: function (movementId) {
		var me = this;

		var iframe = Ext.fly(me.id + '_rendContIFrame').dom.contentWindow;
		iframe.showMovement(movementId);
	},

    /*
     * Call showMeasure of corresponding iframe.
     * @param {string} movementId - The XML-ID of the selected movement.
     * @param {string} measureId - The XML-ID of the selected measure.
     */
	showMeasure: function (movementId, measureId) {
	    var me = this;
	    var iframe = Ext.fly(me.id + '_rendContIFrame').dom.contentWindow;
	    iframe.showMeasure(movementId, measureId);
	}
});
