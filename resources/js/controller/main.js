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
 *  ID: $Id$
 */

// Gather JS files from the resources/js/controller directory and load them into the global scope.
(function (window) {
    "use strict";

    var controllerFiles = [
        "resources/js/controller/ajax-controller.js",
        "resources/js/controller/notification-controller.js"
    ];

    controllerFiles.forEach(function (file) {
        var script = document.createElement("script");
        script.src = file;
        script.type = "text/javascript";
        document.head.appendChild(script);
    });
})(window);