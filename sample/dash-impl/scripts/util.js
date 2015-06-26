"use strict";

function fetchXHR(url, responseType, mimeType, handler) {
	var xhr = new XMLHttpRequest();
	xhr.open("GET", url, true);

	if (responseType)
		xhr.responseType = responseType;

	if (mimeType)
		xhr.overrideMimeType(mimeType);

	if (handler)
		xhr.addEventListener("load", function (e) { handler(e.target); });

	xhr.send();
}