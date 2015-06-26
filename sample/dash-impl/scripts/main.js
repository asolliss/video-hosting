"use strict";

var streamer;

function onBodyLoad() {
	streamer = new Streamer();
	streamer.setView(document.getElementById("video"));
}

function onPlayClick() {
	var mpdPath = document.getElementById("mpd-input").value;

	streamer.play(mpdPath);
}
