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
		</div>
		<div id="toolbar" class="noselect" style="
			flex-shrink: 0;
			background: #f9f9f9;
			padding: 10px;
			text-align: center;
			border-top: 1px solid #ccc;
		">
			<span id="prevButton" class="button" style="cursor:pointer;">
				<svg xmlns="http://www.w3.org/2000/svg" width="1.3em" height="1.3em" viewBox="0 0 24 24">
					<path fill="currentColor" d="M15.41 16.58L10.83 12l4.58-4.59L14 6l-6 6l6 6z"/>
				</svg>
			</span>
			<span id="page">1</span> / <span id="pageCount">1</span>
			<span id="nextButton" class="button" style="cursor:pointer;">
				<svg xmlns="http://www.w3.org/2000/svg" width="1.3em" height="1.3em" viewBox="0 0 24 24">
					<path fill="currentColor" d="M8.59 16.58L13.17 12L8.59 7.41L10 6l6 6l-6 6z"/>
				</svg>
			</span>
		</div>`;
		me.on('afterrender', function () {
			const nextBtn = document.getElementById('nextButton');
			const prevBtn = document.getElementById('prevButton');
		
			document.addEventListener('page-info-update', function(e) {
				const { pageNumber, totalPages } = e.detail;
				document.getElementById("page").textContent = pageNumber;
                document.getElementById("pageCount").textContent = totalPages;
			});
			
			if (nextBtn && prevBtn) {
				nextBtn.addEventListener('click', function () {
					const renderer = document.getElementById('verovioRenderer');
					if (renderer && typeof renderer.calculatePageNumber === 'function') {
						renderer.calculatePageNumber('next');
					}
				});  
		
				prevBtn.addEventListener('click', function () {
					const renderer = document.getElementById('verovioRenderer');
					if (renderer && typeof renderer.calculatePageNumber === 'function') {
						renderer.calculatePageNumber('previous');
					}
				});
			}
		});
				

		me.callParent();
	},

	setIFrameContent: function (uri, edition) {
		var me = this;
		var appBasePath = "/exist/apps/Edirom-Online-Backend/";
    	var meiUrl = appBasePath + "/data/xql/getMusicInMdiv.xql?uri=" + uri;

		//var iframe = me.el.getById(me.id + '_rendCont');

		var contentHTML = `    <edirom-verovio-renderer
                id="verovioRenderer"
                width="100%"
                height="100%"
                zoom="33" 
                pagenumber="1"
                meiurl="${meiUrl}"
				verovioheight="200"
				veroviowidth="200"
            </edirom-verovio-renderer>`;

    var contentDiv = me.el.getById(me.id + '_rendCont');
    contentDiv.dom.innerHTML = contentHTML;
	},

	// showMovement: function (movementId) {
	// 	var me = this;

	// 	var iframe = Ext.fly(me.id + '_rendContIFrame').dom.contentWindow;
	// 	iframe.showMovement(movementId);
	// },

    // /*
    //  * Call showMeasure of corresponding iframe.
    //  * @param {string} movementId - The XML-ID of the selected movement.
    //  * @param {string} measureId - The XML-ID of the selected measure.
    //  */
	// showMeasure: function (movementId, measureId) {
	//     var me = this;
	//     var iframe = Ext.fly(me.id + '_rendContIFrame').dom.contentWindow;
	//     iframe.showMeasure(movementId, measureId);
	// }
});
