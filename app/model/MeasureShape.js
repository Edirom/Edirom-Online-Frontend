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
 * One measure overlay on a page, as delivered by getMeasuresOnPage.xql.
 *
 * A shape is a zone, not a measure: a measure broken across systems or pages is encoded as a
 * single measure linked to two or more zones, so several shapes can carry the same measure
 * 'id'. The store is therefore keyed by 'zoneId', which is unique per shape. Keying it by the
 * default 'id' made the second of two fragments replace the first in the store's collection,
 * leaving one of them without an overlay.
 */
Ext.define('EdiromOnline.model.MeasureShape', {

    requires: [],

    extend: 'Ext.data.Model',

    idProperty: 'zoneId',

    fields: ['zoneId', 'ulx', 'uly', 'lrx', 'lry', 'id', 'name', 'type', 'rest']
});
