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
 *
 */
Ext.define("EdiromOnline.view.window.text.FacsimileView", {
    extend: "EdiromOnline.view.window.View",

    requires: [
        "EdiromOnline.view.window.image.ImageViewer",
        "EdiromOnline.view.window.util.PageSpinner"
    ],

    alias: "widget.facsimileView",

    layout: "border",

    border: 0,

    imageSet: null,
    imageToShow: null,

    measuresVisible: false,
    annotationsVisible: false,

    image_server: null,

    cls: "facsimileView",

    initComponent: function () {
        var me = this;

        me.addEvents();

        // Always use the OSD web component; digilib renders through its
        // buildTileSource digilib branch (see ImageViewer.js). Also wires
        // zoomChanged/imageChanged.
        EdiromOnline.view.window.image.ImageViewerHost.initImageViewer(me);

        me.imageViewer.region = "center";

        me.bottomBar = new EdiromOnline.view.window.BottomBar({
            owner: me,
            region: "south",
            enableOverflow: false,
        });

        me.items = [me.imageViewer, me.bottomBar];

        me.callParent();

        me.on("afterrender", me.createMenuEntries, me, { single: true });
        me.on("afterrender", me.createToolbarEntries, me, { single: true });

        me.window.on("loadInternalLink", me.loadInternalId, me);
    },

    getWeightForInternalLink: function (uri, type, id) {
        var me = this;

        if (me.uri != uri) return 0;

        if (type == "graphic" || type == "surface" || type == "zone") return 70;

        return 0;
    },

    loadInternalId: function () {
        var me = this;

        if (
            me.window.internalIdType == "surface" ||
            me.window.internalIdType == "graphic"
        ) {
            me.window.requestForActiveView(me);
            me.showPage(me.window.internalId);
        }
    },

    setImageSet: function (imageSet) {
        var me = this;
        me.imageSet = imageSet;

        me.pageSpinner.setStore(me.imageSet);

        // When the viewer supports native pagination (ImageViewer),
        // load the whole set as a sequence once so page changes only switch
        // the component's page number instead of reloading a single image.
        if (typeof me.imageViewer.setImages === 'function') {
            me.imageViewer.setImages(me.imageSet);
        }

        if (me.imageToShow != null) {
            me.pageSpinner.setPage(me.imageSet.getById(me.imageToShow));
            me.imageToShow = null;
        } else if (me.imageSet.getCount() > 0)
            me.pageSpinner.setPage(me.imageSet.getAt(0));

        me.fireEvent("afterImagesLoaded", me, imageSet);
    },

    setPage: function (combo, store) {
        var me = this;

        // Remove old stuff
        me.imageViewer.clear();

        var id = combo.getValue();
        var imgIndex = me.imageSet.findExact("id", id);
        me.activePage = me.imageSet.getAt(imgIndex);

        // Prefer the viewer's native sequence pagination; fall back to
        // reloading a single image (e.g. the digilib ImageViewer).
        if (typeof me.imageViewer.goToPageById === 'function'
                && me.imageViewer.goToPageById(id)) {
            return;
        }

        me.imageViewer.showImage(
            me.activePage.get("path"),
            me.activePage.get("width"),
            me.activePage.get("height")
        );
    },

    showPage: function (pageId) {
        var me = this;

        if (me.imageSet == null) {
            me.imageToShow = pageId;
            return;
        }

        me.pageSpinner.setPage(me.imageSet.getById(pageId));
    },

    getActivePage: function () {
        return this.activePage;
    },

    // Bound as listeners by ImageViewerHost.initImageViewer/createZoomSlider,
    // so these names must stay stable even though the logic lives there.
    onViewerImageChanged: function (viewer, path, id) {
        EdiromOnline.view.window.image.ImageViewerHost.onViewerImageChanged(this, viewer, path, id);
    },

    updateZoom: function (zoom) {
        EdiromOnline.view.window.image.ImageViewerHost.updateZoom(this, zoom);
    },

    zoomChanged: function (slider) {
        EdiromOnline.view.window.image.ImageViewerHost.zoomChanged(this, slider);
    },

    fitFacsimile: function () {
        EdiromOnline.view.window.image.ImageViewerHost.fitFacsimile(this);
    },

    hideToolbarEntries: function () {
        EdiromOnline.view.window.image.ImageViewerHost.hideToolbarEntries(this);
    },

    showToolbarEntries: function () {
        EdiromOnline.view.window.image.ImageViewerHost.showToolbarEntries(this);
    },

    createMenuEntries: function () {
        var me = this;

        me.viewMenu = Ext.create("Ext.button.Button", {
            text: getLangString("view.window.source.SourceView_viewMenu"),
            indent: false,
            cls: "menuButton",
            menu: {
                items: [
                    {
                        id: me.id + "_fitFacsimile",
                        text: getLangString(
                            "view.window.source.SourceView_fitView"
                        ),
                        handler: Ext.bind(me.fitFacsimile, me, [], 0),
                    },
                ],
            },
        });
        me.window.getTopbar().addViewSpecificItem(me.viewMenu, me.id);
    },

    createToolbarEntries: function () {
        var me = this;
        var imageViewerHost = EdiromOnline.view.window.image.ImageViewerHost;

        imageViewerHost.createZoomSlider(me, 140);
        imageViewerHost.createPageSpinner(me, 121);
        me.separator = Ext.create("Ext.toolbar.Separator");

        var entries = [];

        if (me.zoomSlider) {
            entries = [me.zoomSlider, me.separator, me.pageSpinner];
        } else {
            entries = [me.pageSpinner];
        }

        Ext.Array.each(entries, function (entry) {
            if (me.zoomSlider) {
                me.bottomBar.add(entry);
            } else if (
                entry.initialCls !== "zoomSlider" &&
                entry.xtype !== "tbseparator"
            ) {
                me.bottomBar.add(entry);
            }
        });
    },

    setChapters: function (chapters) {
        var me = this;

        if (chapters.getTotalCount() == 0) return;

        me.gotoMenu = Ext.create("Ext.button.Button", {
            text: getLangString("view.window.text.TextView_gotoMenu"),
            indent: false,
            cls: "menuButton",
            menu: {
                items: [],
            },
        });
        me.window.getTopbar().addViewSpecificItem(me.gotoMenu, me.id);

        me.chapters = chapters;

        var chapterItems = [];
        chapters.each(function (chapter) {
            chapterItems.push({
                text: chapter.get("name"),
                handler: Ext.bind(
                    me.gotoChapter,
                    me,
                    chapter.get("pageId"),
                    true
                ),
            });
        });

        me.gotoMenu.menu.add(chapterItems);
        me.gotoMenu.show();
    },

    gotoChapter: function (menuItem, event, pageId) {
        this.fireEvent("gotoChapter", this, pageId);
    },

    gotoPage: function (pageId) {
        var me = this;
        me.pageSpinner.setPage(me.imageSet.getById(pageId));
    },
});
