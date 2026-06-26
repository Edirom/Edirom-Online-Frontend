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
Ext.define('EdiromOnline.view.window.audio.AudioView', {

    extend: 'EdiromOnline.view.window.View',

    requires: [
    ],

    alias : 'widget.audioView',

    layout: 'fit',
    
    cls: 'audioView',

    initComponent: function () {

        var me = this;
        
        me.callParent();
    },

    initComponent: function () {

        var me = this;

        me.html = `
            <div id="` + me.id + `_contentAudioPlayer" class="audio-player-container">
                <!-- Audio player will be attached here -->
            </div>
        `;

        me.callParent();
    },

    attachPlayer: function(tracks) {
        var me = this;

        const audioHTML = `
            <edirom-audio-player 
                id="` + me.id + `_audioPlayer"
                tracks='`+ tracks +`'
                height="100%" 
                width="100%" 
                state="pause" 
                track="0" 
                start="0.0" 
                end="" 
                playbackrate="1.0" 
                playlist="true" 
                progressbar="true">
            </edirom-audio-player>
        `;

        var contEl = me.el.getById(me.id + '_contentAudioPlayer');
        contEl.setHTML(audioHTML);


    },
    
    getContentConfig: function() {
        var me = this;
        return {
            id: this.id
        };
    }

});