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

	setIFrameContent: function (uri, edition) {
		var me = this;

		var html = `<html>
        		<head>
					<title>Verovio</title>
					<script
						src="https://www.verovio.org/javascript/latest/verovio-toolkit.js"></script>
					<script
						src="https://code.jquery.com/jquery-3.5.1.min.js"
						integrity="sha256-9/aliU8dGd2tb6OSsuzixeV4y/faTqgFtohetphbbj0="
						crossorigin="anonymous"></script>
					<script
						src="//code.iconify.design/1/1.0.6/icon ify.min.js"></script>
				<!-- Edirom Verovio Renderer Component -->
				<script
					src="resources/js/edirom-verovio-renderer/edirom-verovio-renderer-component.js"
					type="text/javascript"></script>
				
				<link
					rel="stylesheet"
					type="text/css"
					href="resources/css/verovio-view.css"/>				</head>
				<body>
					<script>
						var uri = "${uri}";
						var edition = "${edition}";
						var movementId = "";
						var appBasePath = "@backend.url@";
						var meiUrl = appBasePath + "/data/xql/getMusicInMdiv.xql?uri=" + uri + "&edition=" + edition;
						</script>
					
					<div id="output">
						<!-- Loading spinner shown initially -->
						<div class='lds-roller'><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
					</div>
					<div
						id="toolbar"
						class="noselect">
						<span
							class="button"
							onclick="prevPage()">
							<span style="font-size: 1.3em;">&lt;</span>
						</span>
						<span
							id="page">1</span> / <span
							id="pageCount">1</span>
						<span
							class="button"
							onclick="nextPage()">
							<span style="font-size: 1.3em;">&gt;</span>
						</span>
					</div>
					<div
						class='lds-roller'><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
					
					<script
						src="resources/js/verovio-view.js"></script>
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
	},

	/*
	 * Navigate to a specific measure in a movement.
	 * @param {string} measureNumber - The measure number to go to.
	 * @param {string} movementId - The XML-ID of the movement.
	 */
	gotoMeasureByAttributes: function (measureNumber, movementId) {
		var me = this;
		var iframe = Ext.fly(me.id + '_rendContIFrame').dom.contentWindow;
		
		// First switch to the movement, then navigate to the measure
		iframe.showMovement(movementId);
		
		// Wait a bit for the movement to load, then set the measure
		setTimeout(function() {
			var renderer = iframe.document.getElementById("verovio-renderer");
			if (renderer) {
				renderer.setAttribute("measurenumber", measureNumber);
			}
		}, 500);
	}
});
