//
//  ContentContainer.js
//  Home2011
//
//  Created by Bret Victor on 2/23/11.
//  (c) 2011 Bret Victor.  MIT open-source license.
//


(function(){


var kDefaultPageWidth = 900;
var kDefaultMinimumImageScale = 0.7;
var kShouldAutoplayMovie = true;
var kAutoplayMovieDelay = 300;


//====================================================================================
//
//  ContentContainer
//

var ContentContainer = this.ContentContainer = new Class({

	Extends: BVLayer,

	initialize: function (superlayer) {
		this.parent(superlayer);
		
		this.setZPosition(10);

		this.url = null;
		this.clickURL = null;
		this.preloadURL = null;
		this.preloadedURLs = {};
		
		this.bottomSpacer = new BVLayer(this);
		this.bottomSpacer.setSize(2,20);
		this.bottomSpacer.setHidden(true);
	},
	
	setURL: function (url, clickURL, properties) {
		if (url === this.url) { return; }

		this.url = url;
		this.clickURL = clickURL || url;
		this.preloadURL = null;
		
		if (this.content) { this.content.destroy();  delete this.content; }
		
		this.setHidden(!url);
		this.bottomSpacer.setHidden(this.hidden);
		if (!url) { return; }

		this.bottomSpacer.setY(-this.height);
		
		var contentClass = this.getContentClassForURL(url, properties);
		this.content = new contentClass(this, properties);
	},
	
	getContentClassForURL: function (url, properties) {
		return (properties && properties.vimeo) ? ContentVimeo :
			ContentContainer.isMovieURL(url) ? ContentMovie :
			ContentContainer.isImageURL(url) ? ContentImage :
			(properties && properties.injectContent) ? ContentHTML : 
			ContentIframe;
	},


	//----------------------------------------------------------------------------------
	//
	//  size
	//
	
	getContentSizeForProperties: function (properties, availableWidth, availableHeight) {
		var pageWidth = properties.imageWidth || properties.pageWidth || kDefaultPageWidth;
		var pageHeight = properties.imageHeight || properties.pageHeight || availableHeight;
		var minimumImageScale = properties.minimumImageScale || kDefaultMinimumImageScale;
		var availableImageHeight = availableHeight - this.bottomSpacer.height;
		
		if (properties.imageHeight && pageHeight > availableImageHeight && !properties.noSquish) {  // try to squish image to fit vertically
			var heightScale = availableImageHeight / pageHeight;
			if (heightScale > minimumImageScale) {
				pageWidth = Math.round(pageWidth * heightScale);
				pageHeight = Math.round(pageHeight * heightScale);
			}
		}

		if (pageWidth > availableWidth) {  // fit horizontally
			if (!properties.imageWidth) {
				pageWidth = availableWidth;
			}
			else {
				var widthScale = availableWidth / pageWidth;
				if (widthScale > minimumImageScale) {
					pageWidth = Math.round(pageWidth * widthScale);
					pageHeight = Math.round(pageHeight * widthScale);
				}
			}
		}
		
		return { width:pageWidth, height:pageHeight };
	},

	
	//----------------------------------------------------------------------------------
	//
	//  preload
	//
	
	setPreloadURL: function (preloadURL, properties) {
		if (properties.noPreload) { preloadURL = null; }
		this.preloadURL = preloadURL;
	},

	preload: function (url) {
		url = url || this.preloadURL;
		if (url && !this.preloadedURLs[url]) {
			var contentClass = this.getContentClassForURL(url);
			contentClass.preloadWithURL(url);
			this.preloadedURLs[url] = true;
		}
		this.preloadURL = null;
	}

});

ContentContainer.getBrowserSpecificURL = function (url) {
	if (this.isMovieURL(url)) { return this.getBrowserSpecificMovieURL(url); }
	return url;
};

ContentContainer.getPreviewURL = function (url) {
	if (this.isMovieURL(url)) { return this.getMoviePreviewURL(url); }
	return url;
};


//====================================================================================
//
//  ContentImage
//

var ContentImage = new Class({

	Extends: BVLayer,

	initialize: function (superlayer, properties) {
		this.parent(superlayer);
		var container = this.container = this.getAncestorWithClass(ContentContainer);
		
		this.setContentsURLAndSize(container.url, container.width, container.height);
		this.element.setStyle("pointerEvents", "auto");
		if (container.clickURL) {
			var clickURL = container.clickURL;
			this.element.setStyle("cursor", "pointer");
			this.element.addEvent("click", function () { window.location = clickURL; });
		}

		if (this.preloadTimer) { clearTimeout(this.preloadTimer); }
		this.preloadTimer = this.container.preload.delay(1000, this.container); // can't actually tell when image finishes loading, so just use a delay
	},
	
	destroy: function () {
		if (this.preloadTimer) { clearTimeout(this.preloadTimer); delete this.preloadTimer; }
		this.removeFromSuperlayer();
		this.container = null;
	}
});

ContentImage.preloadWithURL = function (url) {
		var image = new Image();
		image.src = url;
};

ContentContainer.isImageURL = function (url) {
	return !!(url.match(/\.jpg$/) || url.match(/\.png$/));
};



//====================================================================================
//
//  ContentMovie
//

var ContentMovie = new Class({

	Extends: BVLayer,

	initialize: function (superlayer, properties) {
		this.parent(superlayer);
		var container = this.container = this.getAncestorWithClass(ContentContainer);

		var previewURL = ContentContainer.getMoviePreviewURL(container.url);
		this.setContentsURLAndSize(previewURL, container.width, container.height);
		
		if (kShouldAutoplayMovie) { this.autoplayTimer = this.playMovie.delay(kAutoplayMovieDelay, this); }

		this.element.setStyle("pointerEvents", "auto");
		this.element.setStyle("cursor", "pointer");
		this.element.addEvent("click", this.playMovie.bind(this));
		
		this.spinner = new BVSpinner(this);
		this.spinner.setPosition(0.5 * (container.width - this.spinner.width), -0.5 * (container.height - this.spinner.height));
		this.spinner.setSpinning(true);
	},
	
	playMovie: function () {
		if (this.autoplayTimer) { clearTimeout(this.autoplayTimer);  delete this.autoplayTimer; }
	
		this.element.removeEvents("click");
		this.element.setStyle("cursor", "auto");
		
		this.videoElement = new Element("video", {
			src: this.container.url,
			width: this.width,
			height: this.height
		});

		if (!this.videoElement) { return; }
		this.videoElement.loop = true;
		
		this.canPlayEventListener = this.movieCanPlayThrough.bind(this);
		this.videoElement.addEventListener('canplaythrough', this.canPlayEventListener, false);
	},
	
	movieCanPlayThrough: function () {
		this.spinner.setSpinning(false);
		this.element.grab(this.videoElement);
		this.videoElement.play();
	},
	
	destroy: function () {
		if (this.autoplayTimer) { clearTimeout(this.autoplayTimer);  delete this.autoplayTimer; }
		if (this.videoElement) {
			this.videoElement.removeEventListener('canplaythrough', this.canPlayEventListener, false);
			this.videoElement.pause();
			this.videoElement.src = "";
		}
		this.spinner.setSpinning(false);
		this.removeFromSuperlayer();
		this.container = null;
	}

});

ContentMovie.preloadWithURL = function (url) {
};

ContentContainer.isMovieURL = function (url) {
	return !!(url.match(/\.mov$/) || url.match(/\.mp4$/) || url.match(/\.ogv$/) || url.match(/\.webm$/));
};

ContentContainer.getBrowserSpecificMovieURL = function (url) {
	var suffix = Browser.firefox3 ? ".ogv" : (Browser.firefox || Browser.chrome) ? ".webm" : null;
	if (suffix) { url = url.replace(/\.\w+$/, suffix); }
	return url;
};

ContentContainer.getMoviePreviewURL = function (url) {
	return url.replace(/\.\w+$/, ".jpg");
};


//====================================================================================
//
//  ContentHTML
//

var ContentHTML = new Class({

	Extends: BVLayer,

	initialize: function (superlayer, properties) {
		this.parent(superlayer);
		var container = this.container = this.getAncestorWithClass(ContentContainer);
		
		this.setSize(container.width, container.height);
		this.element.setStyle("pointerEvents", "auto");
		
		this.request = new Request({
			url: container.url,
			method: "get",
			urlEncoded: "false",
			headers: {
				Accept: 'text/html, application/xml, text/xml, */*'
			}
		});
		this.request.addEvent("success", this.requestWasSuccessful.bind(this));
		this.request.send();
	},
	
	destroy: function () {
		if (this.preloadTimer) { clearTimeout(this.preloadTimer); delete this.preloadTimer; }
		if (this.request) { this.request.cancel(); delete this.request; }
		this.removeFromSuperlayer();
		this.container = null;
	},
	
	requestWasSuccessful: function (responseText) {
		var match = responseText.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
		if (!match) { return; }
		var html = match[1];
		
		this.element.set("html", html);

		if (this.preloadTimer) { clearTimeout(this.preloadTimer); }
		this.preloadTimer = this.container.preload.delay(1000, this.container);
	}
});

ContentHTML.preloadWithURL = function (url) {
	ContentIframe.preloadWithURL(url);
};


		
//====================================================================================
//
//  ContentIframe
//

var ContentIframe = new Class({

	initialize: function (container, properties) {
		this.container = container;
		
		var globalPosition = container.getGlobalPosition();
		var backgroundColor = properties.pageColor;
		if (backgroundColor === undefined) { backgroundColor = "fff"; }
		
		var url = container.url;
		if (properties.queryWindowSize) {
			url += "?width=" + this.container.width + "&height=" + Root.root.height;
		}
		
		this.iframe = new IFrame({
    		src: url,
    		styles: {
    			position:"absolute",
    			left: "" + globalPosition.x + "px",
	  			top: "" + (-globalPosition.y) + "px",
    			backgroundColor: "#" + backgroundColor,
    			zIndex:20,
    			visibility:"hidden"
    		},
    		events: {
    			load: this.iframeDidLoad.bind(this)
    		},
    		width: "" + container.width,
    		height: "" + container.height,
    		frameBorder: "0",
    		scrolling: "no"
    	});
    	
    	this.iframeIsVisible = false;
    	this.iframeHeight = container.height;
    	this.iframeShouldUpdateHeight = !properties.pageHeight;
    	this.iframeHeightCanChange = !!properties.pageHeightCanChange;
    	this.iframeShouldScrollToEnd = (properties.pageHeightCanChange === "scrollToEnd");
    	this.iframeUpdateInterval = this.updateIframeVisibilityAndHeight.periodical(500, this);

		document.id(document.body).grab(this.iframe, "bottom");

		this.container.bottomSpacer.setY(-this.iframeHeight);
	},
	
	destroy: function () {
		if (this.iframe) { this.iframe.destroy(); delete this.iframe; }
		if (this.iframeUpdateInterval !== undefined) { clearInterval(this.iframeUpdateInterval); delete this.iframeUpdateInterval; }
		this.container = null;
	},
	
	iframeDidLoad: function () {
		this.updateIframeVisibilityAndHeight();
		this.iframeIsLoaded = true;
		if (!this.iframe) { return; }

		if (this.iframeUpdateInterval !== undefined) { clearInterval(this.iframeUpdateInterval);  delete this.iframeUpdateInterval; }
		if (this.iframeShouldUpdateHeight && this.iframeHeightCanChange) {
	    	this.iframeUpdateInterval = this.updateIframeVisibilityAndHeight.periodical(500, this);
		}
		if (this.container) { this.container.preload(); }
	},
	
	updateIframeVisibilityAndHeight: function () {
		if (!this.iframe) { return; }
		
		if (!this.iframeIsVisible) {
			this.iframeIsVisible = true;
			this.iframe.style.visibility = "visible";
		}
		
		if (this.iframeShouldUpdateHeight) {
			var height = this.container.height;
			var doc = this.iframe.contentDocument;
			if (doc) {
				var db = doc.body;
				var dde = doc.documentElement;
				if (db) { height = Math.max(height, db.scrollHeight, db.offsetHeight, db.clientHeight); }
				if (dde) { height = Math.max(height, dde.scrollHeight, dde.offsetHeight, dde.clientHeight); }
			}
			
			if (height != this.iframeHeight) {
				this.iframeHeight = height;
				this.iframe.set("height", height);
				
				if (this.iframeIsLoaded && this.iframeShouldScrollToEnd) {
					(function () { window.scrollBy(0,10000); }).delay(10);
				}
			}
		}

		this.container.bottomSpacer.setY(-this.iframeHeight);
	}
		
});

ContentIframe.preloadWithURL = function (url) {
    var baseURL = url.replace(/\w+\.\w+$/, "");
    if (!baseURL.match(/\/$/)) { baseURL += "/"; }

	var htmlRequest = getRequestForHTML();

	htmlRequest.addEvent("success", function (html) {
		if (!html) { return; }

		var cssRequest = getRequestForCSS(html);
		if (cssRequest) {
			cssRequest.addEvent("success", function (css) {	requestFirstImage(html); });
			cssRequest.send();
		}
		else {
			requestFirstImage(html);
		}
	});

	htmlRequest.send();
	
	
	function getRequestForHTML () {
		return new Request({ url: url, method: "get" });
	}

	function getRequestForCSS (html) {
		var match = html.match(/href="(\w+.css)"/);
		if (!match) { return null; }
		return new Request({ url: baseURL + match[1], method: "get" });
	}
	
	function requestFirstImage (html) {
		var match = html.match(/preload-image href="([^"]+)"/);
		if (!match) { return; }
		var image = new Image();
		image.src = match[1];
	}
};



//====================================================================================
//
//  ContentVimeo
//

var ContentVimeo = new Class({

	initialize: function (container, properties) {
		this.container = container;
		var vimeoID = properties.vimeo;
		var globalPosition = container.getGlobalPosition();
		
		this.iframe = new IFrame({
    		src: "http://player.vimeo.com/video/" + vimeoID + "?title=0&byline=0&portrait=0",
    		styles: {
    			position:"absolute",
    			left: "" + globalPosition.x + "px",
	  			top: "" + (-globalPosition.y) + "px",
    			zIndex:20,
    			visibility:"hidden",
    		},
    		events: {
    			load: this.iframeDidLoad.bind(this)
    		},
    		width: "" + container.width,
    		height: "" + container.height,
    		frameBorder: "0",
    		scrolling: "no"
    	});
    	
		document.id(document.body).grab(this.iframe, "bottom");
	},
	
	destroy: function () {
		if (this.iframe) { this.iframe.destroy(); delete this.iframe; }
		this.container = null;
	},
	
	iframeDidLoad: function () {
		if (!this.iframe) { return; }
		this.iframe.style.visibility = "visible";
	}
		
});



//====================================================================================
//
//  BVSpinner
//

var BVSpinner = new Class({

	Extends: BVLayer,

	initialize: function (superlayer, properties) {
		this.parent(superlayer);
		this.element.setStyle(BVLayer.addPrefixToStyleName("TransformOrigin"), "50% 50%");
		this.setContentsURLAndSize("Images/Spinner.png",40,40);
		this.setHidden(true);
	},
	
	setSpinning: function (spinning) {
		if (spinning == this.isSpinning) { return; }
		this.isSpinning = spinning;
		this.setHidden(!spinning);

		if (this.spinTimer) { clearTimeout(this.spinTimer); delete this.spinTimer; }
		if (spinning) {
			this.spinTimer = this.updateSpin.periodical(1/30,this);
			this.lastTimestamp = Date.now();
		}
	},

	updateSpin: function () {
		var timestamp = Date.now();
		var dt = timestamp - this.lastTimestamp;
		this.lastTimestamp = timestamp;
		
		this.setRotation(this.rotation + 8 * dt/1000);
	}
	
});
		

//====================================================================================

})();

