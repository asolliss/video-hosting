"use strict";


function MPD() {
	this.xml = null;
	this.onload = function () {
	};
}

MPD.prototype.fetch = function (address) {
	fetchXHR(address, null, "text/xml",
		function (xhr) {
			if (xhr.status != 200)
				return;

			this.xml = xhr.responseXML;
			this.onload();
		}.bind(this)
	);
};

MPD.prototype.isLoaded = function () {
	return this.xml;
};

MPD.prototype.getMIME = function () {
	console.assert(this.xml);

	return this.xml.xpath("//MPD/Period/AdaptationSet/Representation/@mimeType", XPathResult.STRING_TYPE);
};

MPD.prototype.getCodecs = function () {
	console.assert(this.xml);

	return this.xml.xpath("//MPD/Period/AdaptationSet/Representation/@codecs", XPathResult.STRING_TYPE);
};

MPD.prototype.getInit = function () {
	console.assert(this.xml);

	return this.xml.xpath("//MPD/Period/AdaptationSet/Representation/SegmentList/Initialization/@sourceURL",
		XPathResult.STRING_TYPE);
};

MPD.prototype.getSegments = function () {
	console.assert(this.xml);

	var attr = this.xml.xpath("//MPD/Period/AdaptationSet/Representation/SegmentList/SegmentURL/@media");

	for (var i = 0; i < attr.length; ++i)
		attr[i] = attr[i].value;

	return attr;
};









function SegmentFetcher() {
	this.root = null;
	this.mpd = null;
	this.segmentIndex = 0;
	this.segmentURL = [];
	this.segments = [];
	this.onload = function () {};
}

SegmentFetcher.prototype.setRoot = function (root) {
	this.root = root;
};

SegmentFetcher.prototype.setMPD = function (mpd) {
	this.mpd = mpd;
	this.segmentURL = this.mpd.getSegments();
};

SegmentFetcher.prototype.fetch = function (url) {
	fetchXHR(url, "arraybuffer", null,
		function (xhr) {
			this.segments.push(new Uint8Array(xhr.response));
			this.onload();
		}.bind(this)
	);
};

SegmentFetcher.prototype.fetchInit = function () {
	console.assert(this.mpd, "MPD not set");

	this.fetch(this.root + '/' + this.mpd.getInit());
};

SegmentFetcher.prototype.isLastLoaded = function () {
	return (this.segmentIndex + 1) >= this.segmentURL.length;
};

SegmentFetcher.prototype.fetchNextSegment = function () {
	console.assert(this.mpd, "MPD not set");
	console.assert(!this.isLastLoaded());

	var url = this.root + '/' + this.segmentURL[this.segmentIndex];
	++this.segmentIndex;

	console.log("fetchNextSegment(): url: " + url);

	this.fetch(url);
};

SegmentFetcher.prototype.hasNext = function () {
	return this.segments.length > 0;
};

SegmentFetcher.prototype.next = function () {
	console.assert(this.hasNext, "next() while hasNext() == false");
	return this.segments.shift();
};








function Streamer() {
	this.root = null;
	this.mpd = null;
	this.fetcher = null;
	this.source = null;
	this.buffer = null;
}

Streamer.prototype.setView = function (element) {
	if (this.source)
		URL.revokeObjectURL(this.source);

	this.source = new MediaSource();
	this.source.addEventListener("sourceopen", this.readyCheckHandler.bind(this));

	element.src = URL.createObjectURL(this.source);
};

Streamer.prototype.play = function (mpdAddress) {
	this.root = mpdAddress.substring(0, mpdAddress.lastIndexOf('/'));

	this.mpd = new MPD();
	this.mpd.onload = this.readyCheckHandler.bind(this);
	this.mpd.fetch(mpdAddress);
};

Streamer.prototype.isReady = function () {
	return this.mpd && this.mpd.isLoaded()
		&& this.source && this.source.readyState == "open";
};

Streamer.prototype.readyCheckHandler = function () {
	if (this.isReady())
		this.onStreamReady();
};

Streamer.prototype.onStreamReady = function () {
	console.assert(this.mpd.isLoaded());
	console.assert(this.source.readyState == "open");

	var type = this.mpd.getMIME() + '; codecs=\"' + this.mpd.getCodecs() + '\"';
	this.buffer = this.source.addSourceBuffer(type);
	this.buffer.addEventListener("update", this.onBufferUpdate.bind(this));

	this.fetcher = new SegmentFetcher();
	this.fetcher.setRoot(this.root);
	this.fetcher.setMPD(this.mpd);
	this.fetcher.onload = this.onInitLoad.bind(this);
	this.fetcher.fetchInit();
};

Streamer.prototype.onInitLoad = function () {
	console.log("onInitLoad()");

	console.assert(this.source, "Source not set");

	this.buffer.appendBuffer(this.fetcher.next());

	this.fetcher.onload = this.onSegmentLoad.bind(this);
};

Streamer.prototype.onBufferUpdate = function () {
	console.log("onBufferUpdate");

	if (this.fetcher.isLastLoaded())
		this.source.endOfStream();
	else
		this.fetcher.fetchNextSegment();
};

Streamer.prototype.onSegmentLoad = function () {
	console.log("onSegmentLoad()");

	console.assert(this.source, "Source not set");

	this.buffer.appendBuffer(this.fetcher.next());
};
