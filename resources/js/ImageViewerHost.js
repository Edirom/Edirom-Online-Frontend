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
 * Shared host-side plumbing for views that embed a single
 * EdiromOnline.view.window.image.ImageViewer: creating/wiring the viewer, and
 * building the zoom slider + page spinner toolbar pair. Used by PageBasedView,
 * FacsimileView and TextFacsimileSplitView, which previously each
 * re-implemented this block independently (and, in TextFacsimileSplitView's
 * case, incompletely - its zoom slider was never wired up to the viewer).
 */
(function () {
    window.EdiromOnline = window.EdiromOnline || {};
    EdiromOnline.view = EdiromOnline.view || {};
    EdiromOnline.view.window = EdiromOnline.view.window || {};
    EdiromOnline.view.window.image = EdiromOnline.view.window.image || {};

    EdiromOnline.view.window.image.ImageViewerHost = {

        
        initImageViewer: function (host, cfg) {
            host.imageViewer = Ext.create('EdiromOnline.view.window.image.ImageViewer', cfg);

            host.imageViewer.on('zoomChanged', host.updateZoom, host);
            host.imageViewer.on('imageChanged', host.onViewerImageChanged, host);

            if (typeof host.onViewerAnnotationFilterChanged === 'function')
                host.imageViewer.on('annotationFilterChanged', host.onViewerAnnotationFilterChanged, host);
            if (typeof host.onViewerTotalPagesChanged === 'function')
                host.imageViewer.on('totalPagesChanged', host.onViewerTotalPagesChanged, host);
            if (typeof host.onViewerShowAnnotationsChanged === 'function')
                host.imageViewer.on('showAnnotationsChanged', host.onViewerShowAnnotationsChanged, host);

            return host.imageViewer;
        },

        // Keeps the page spinner in sync when the viewer changes page on its own
        // (native sequence navigation, a measure/zone jump, ...). Hosts that need
        // to react further (PageBasedView reloads that page's overlays) define
        // their own onViewerImageChanged and call back into this one first.
        onViewerImageChanged: function (host, viewer, path, id) {
            if (host.pageSpinner && typeof host.pageSpinner.syncPage === 'function')
                host.pageSpinner.syncPage(id);
        },

        // digilib now also renders through the OSD web component, so it uses the
        // same viewport zoom-level range as openseadragon. Creates nothing (and
        // returns undefined) for any other image_server value.
        createZoomSlider: function (host, width) {
            var image_server = getPreference('image_server');

            if (image_server !== 'digilib' && image_server !== 'openseadragon')
                return undefined;

            host.zoomSlider = Ext.create('Ext.slider.Single', {
                width: width || 140,
                value: 100,
                increment: 5,
                minValue: 90,
                maxValue: 700,
                checkChangeBuffer: 100,
                useTips: true,
                cls: 'zoomSlider',
                tipText: function (thumb) {
                    return Ext.String.format('{0}%', thumb.value);
                },
                listeners: {
                    change: Ext.bind(host.zoomChanged, host, [], 0)
                }
            });

            return host.zoomSlider;
        },

        createPageSpinner: function (host, width) {
            host.pageSpinner = Ext.create('EdiromOnline.view.window.util.PageSpinner', {
                width: width || 100,
                cls: 'pageSpinner',
                owner: host
            });

            return host.pageSpinner;
        },

        hideToolbarEntries: function (host) {
            if (host.zoomSlider) host.zoomSlider.hide();
            if (host.separator) host.separator.hide();
            if (host.pageSpinner) host.pageSpinner.hide();
        },

        showToolbarEntries: function (host) {
            if (host.zoomSlider) host.zoomSlider.show();
            if (host.separator) host.separator.show();
            if (host.pageSpinner) host.pageSpinner.show();
        },

        fitFacsimile: function (host) {
            host.imageViewer.fitInImage();
        },

        updateZoom: function (host, zoom) {
            if (host.zoomSlider) {
                host.zoomSlider.suspendEvents();
                host.zoomSlider.setValue(Math.round(zoom * 100));
                host.zoomSlider.resumeEvents();
            }
        },

        zoomChanged: function (host, slider) {
            host.imageViewer.setZoomAndCenter(slider.getValue() / 100);
        }
    };
})();
