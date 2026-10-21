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
(function (window) {
    "use strict";


    /**
     * Returns a notification and handles where to send it.
     *
     * @param {string} [target] - Target for the notification (e.g., "console", "popover", "alert").
     * @param {string} message - The message to be displayed in the notification.
     * @param {number} statusCode - Optional HTTP status code of the notification.
     * @param {object} [params] - Optional parameters for the notification.
     * 
     */
    function notification (target, message, statusCode, params) {
        var me = this;

        params = params || {};

        // if target is set to some console method
        if (target.startsWith("console.") && typeof console !== "undefined" && typeof console[target.split(".")[1]] === "function") {
            console[target.split(".")[1]](message, params);
        } else

        // if target is set to popover method
        if (target === "popover") {
            showPopoverNotification(message, params);
        } else

        // if target is set to banner method
        if (target === "banner") {
            showBannerNotification(message, params);
        } else

        // if target is set to alert method
        if (target === "alert") {
            alert(message);
        }
        // if target is set to some unsupported method
        else {
            console.warn("Notification target method does not exist: " + target);
            console.log(message, params);
        }

    }


    /**
     * Method to show a popover notification. 
     */
    function showPopoverNotification(message, params) {
        // Implementation for showing a popover notification
        // This could involve creating a popover element and displaying it on the screen
        notification("console.log", "Popover Notification: " + message, params);

        // create a popover element and display it on the screen (with Popover API)

        console.log("Creating popover notification with message: " + message);

        // Create a popover element that covers the entire screen
        var popover = document.createElement("div");
        popover.className = "notification-popover";
        popover.style.position = "fixed";
        popover.style.top = 0;
        popover.style.left = 0;
        popover.style.width = "100%";
        popover.style.height = "100%";
        popover.style.backgroundColor = "rgba(92, 92, 92, 0.5)";
        popover.style.zIndex = 9999;

        // Create a popover box to display the message
        var popoverBox = document.createElement("div");
        popoverBox.className = "notification-popoverbox";
        popoverBox.innerText = message;

        // Position the popover in the center of the screen
        popoverBox.style.position = "fixed";
        popoverBox.style.top = "50%";
        popoverBox.style.left = "50%";
        popoverBox.style.transform = "translate(-50%, -50%)";
        popoverBox.style.backgroundColor = "#fff";
        popoverBox.style.border = "1px solid #ffffff";
        popoverBox.style.padding = "10px";
        popoverBox.style.zIndex = 10000;

        // add close button
        var closeButton = document.createElement("button");
        closeButton.style.display = "block";
        closeButton.style.marginTop = "10px";
        closeButton.innerText = "Close";
        closeButton.addEventListener("click", function () {
            document.body.removeChild(popover);
        });

        // append the elements to parents
        popoverBox.appendChild(closeButton);
        popover.appendChild(popoverBox);
        document.body.appendChild(popoverBox);
    }
    

    /**
     * Method to show a banner notification. 
     */
    function showBannerNotification(message, params) {
        // Implementation for showing a banner notification
        // This could involve creating a banner element and displaying it at the top or bottom of the screen
        notification("console.log", "Banner Notification: " + message, params);
    }


    /**
     * Method to initialize the notification system with the application context.
     * This allows the notification function to access application-specific data and methods.
     */    
    window.initializeNotification = function (application) {
        var context = {
            application: application,
            notification: notification
        };

        window.notification = notification.bind(context);
    };

})(window);