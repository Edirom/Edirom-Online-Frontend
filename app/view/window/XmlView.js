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
Ext.define('EdiromOnline.view.window.XmlView', {
    extend: 'EdiromOnline.view.window.View',

    requires: [
    ],

    alias : 'widget.xmlView',

    layout: 'fit',
    cls: 'xmlView',

    editor: null,

    initComponent: function () {

        this.items = [
            {
                html: '<pre id="' + this.id + '_editor" class="aceEditor"></pre>'
            }
        ];

        this.callParent();

        this.on('afterrender', this.createToolbarEntries, this, {single: true});
    },

    initXmlView: function() {
        var XmlMode = ace.require("ace/mode/xml").Mode;

        // ace.edit(idString) resolves the element via document.getElementById,
        // which cannot find it when this view has been reparented into a
        // WinBox's shadow root (see Desktop.wrapEdiromWindowInWinBox) - resolve
        // the element ourselves (works regardless of shadow-root nesting) and
        // pass it directly instead.
        var editorEl = this.el.dom.querySelector('#' + this.id + '_editor');
        this.editor = ace.edit(editorEl);
        this.editor.getSession().setMode(new XmlMode());
        this.editor.getSession().setUseWrapMode(false);       //bisher keine funktionale Änderung festgestellt
        this.editor.setShowPrintMargin(false);
        this.editor.renderer.setHScrollBarAlwaysVisible(false);
        this.editor.setReadOnly(true);  // false for the editable

        this.syncAceStylesIntoShadowRoot(editorEl);
    },

    // ace lazily injects its structural CSS (#ace_editor, #ace-tm, ...) into
    // document.head. Shadow DOM style encapsulation means those rules never
    // cascade into a WinBox's shadow root, so .ace_line etc. fall back to
    // browser defaults (position:static, width:0) and the text layer collapses
    // to nothing even though the gutter/line numbers still render on their own.
    // Clone ace's <style> tags into the shadow root so its layout CSS applies.
    syncAceStylesIntoShadowRoot: function(editorEl) {
        var root = editorEl.getRootNode();
        if (!root || !root.host) return; // not inside a shadow root

        var headStyles = document.head.querySelectorAll('style[id^="ace"]');
        Array.prototype.forEach.call(headStyles, function(style) {
            if (style.id && !root.getElementById(style.id)) {
                root.appendChild(style.cloneNode(true));
            }
        });
    },

    createToolbarEntries: function() {

        var me = this;

        me.decreaseFont = Ext.create('Ext.button.Button', {
            text: 'A-',
            cls: 'menuButton',
            handler: Ext.bind(me.decreaseEditorFontSize, me)
        });
        me.increaseFont = Ext.create('Ext.button.Button', {
            text: 'A+',
            cls: 'menuButton',
            handler: Ext.bind(me.increaseEditorFontSize, me)
        });
        me.lineNumbers = Ext.create('Ext.button.Button', {
            text: 'Line #',
            cls: 'menuButton',
            handler: Ext.bind(me.switchGutterVisibility, me)
        });

        me.window.getTopbar().addViewSpecificItem(me.decreaseFont, me.id);
        me.window.getTopbar().addViewSpecificItem(me.increaseFont, me.id);
        me.window.getTopbar().addViewSpecificItem(me.lineNumbers, me.id);
    },

    setXmlContent: function(xml) {
        this.editor.getSession().setValue(xml);
    },

    resize: function(){
        this.editor.renderer.onResize(true);                    //called function ace-uncompressed.js Line 13289
    },

    decreaseEditorFontSize: function(){
        var editorEl = Ext.get(this.el.dom.querySelector('#' + this.id + '_editor'));
        var currentFontSize = editorEl.getStyle('font-size').split('px')[0];
        var newFontSize = --currentFontSize + 'px';

        editorEl.setStyle('font-size', newFontSize);
    },

    increaseEditorFontSize: function(){
        var editorEl = Ext.get(this.el.dom.querySelector('#' + this.id + '_editor'));
        var currentFontSize = editorEl.getStyle('font-size').split('px')[0];
        var newFontSize = ++currentFontSize + 'px';

        editorEl.setStyle('font-size', newFontSize);
    },

    switchGutterVisibility: function(){
        var status = this.editor.renderer.getShowGutter();
        if(status == true)
            this.editor.renderer.setShowGutter(false);
        else
            this.editor.renderer.setShowGutter(true);

    },
    
    getContentConfig: function() {
        var me = this;
        return {
            id: this.id
        };
    }
});
