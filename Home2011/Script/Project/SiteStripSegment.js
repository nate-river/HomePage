//
//  SiteStripSegment.js
//  Home2011
//
//  Created by Bret Victor on 3/25/11.
//  (c) 2011 Bret Victor.  MIT open-source license.

//  Classes:
//    SiteStripSegment
//    SiteStripSegmentButtonSet
//    SiteStripSegmentButton

(function(){


//====================================================================================
//
//  SiteStripSegment
//

var SiteStripSegment = this.SiteStripSegment = new Class({

	Extends: BVLayer,

	initialize: function (superlayer, segmentElement) {
		this.parent(superlayer);
		this.strip = this.getAncestorWithClass(SiteStrip);
		this.section = this.getAncestorWithClass(SiteSection);
		this.site = this.getAncestorWithClass(Site);
		
		this.setHoverable(true);
		this.setTouchable(true);
		this.element.setStyle("cursor", "pointer");
		
		this.properties = this.site.mergePropertiesFromElement(this.strip.properties, segmentElement);

		this.parseSegmentElement(segmentElement);
		
		var scale = this.strip.stripScale;
		var widthScale = this.properties.widthScale || 1;
		this.setSize(this.strip.segmentSize.width * widthScale, this.strip.segmentSize.height);
		
		var windowOffsetY = this.properties.filmEdges ? -29 : -14;
		var windowPosition = { x: Math.round(5 * scale),   y:Math.round(windowOffsetY * scale) };
		var windowSize = { width: Math.round((218 * widthScale - 10) * scale), height: Math.round(170 * scale) };

		var xwindowPosition = { x: Math.round(4 * scale),   y:Math.round((windowOffsetY + 1) * scale) };
		var xwindowSize = { width: Math.round((220 * widthScale - 10) * scale), height: Math.round(172 * scale) };

		this.film = new BVLayer(this);
		var filmURL = "Images/FilmMiddle" + (this.properties.filmEdges ? "" : "Solid") + ".png";
		this.film.setContentsURLAndSize(filmURL, this.getSize());

		this.contentClip = new BVLayer(this);
		this.contentClip.setPosition(windowPosition);
		this.contentClip.setSize(windowSize.width, windowSize.height - 1);
//		this.contentClip.setMasksToBounds(true);  // todo
		
		this.window = new BVLayer(this);
		this.window.setContentsURLAndSize("Images/Window.png", windowSize);
		this.window.setPosition(windowPosition);
		this.window.setHidden(false);

		this.windowOverlay = new BVLayer(this.window);
		this.windowOverlay.setSize(this.window.getSize());
		this.windowOverlay.setHidden(true);

		this.addContent();
	},

	parseSegmentElement: function (segmentElement) {
		var linkElement = segmentElement.getElement("a");
		this.name = linkElement.get("id");
		this.url = ContentContainer.getBrowserSpecificURL(linkElement.get("href"));

		var displayLinkElement = segmentElement.getElement(".display") || linkElement;
		this.displayURL = ContentContainer.getBrowserSpecificURL(displayLinkElement.get("href"));
		
		this.contentClickURL = (this.displayURL == this.url) ? null : this.url;

		var previewLinkElement = segmentElement.getElement(".preview") || displayLinkElement;
		this.previewURL = ContentContainer.getPreviewURL(previewLinkElement.get("href"));

		var matches = this.url.match(/\.com\/(.+)/);
		this.localURL = (matches && matches[1]) ? matches[1] : this.url;
		this.localURL = this.localURL.replace(/\/$/, "");
		this.urlIndex = (this.properties.urlIndex || 0) * 1;
		
		var titleElement = segmentElement.getElement(".title");
		this.titleString = titleElement ? titleElement.get("html") : "";

		var subtitleElement = segmentElement.getElement(".subtitle");
		this.subtitleString = subtitleElement ? subtitleElement.get("html") : "";
		
		var captionElement = segmentElement.getElement(".caption");
		this.captionString = captionElement ? captionElement.get("html") : "";
	},
	
	addContent: function () {
		this.content = new BVLayer(this.contentClip);
		if (gSiteShowThumbnailImages) { this.content.setContentsURLAndSize("ThumbnailImages/" + this.name + ".jpg", this.contentClip.getSize()); }
		
		if (!this.properties.hideTitle) {
			this.title = new BVText(this.contentClip);
			this.title.setPosition(0, -this.contentClip.height);
			
			var styles = {
				position: "absolute",
				bottom: "0px",
				left: "0px",
				width: this.contentClip.width + "px",
				backgroundImage: "url(Images/WindowCaption.png)",
				backgroundRepeat: "repeat-x"
			};
			this.title.setTextStyles(styles);
			
			var titleClass = this.properties.titleClass ? (" " + this.properties.titleClass) : "";
			var titleHTML = this.properties.subtitleOnly ? ("<div class='segmentSubtitleSolo'>" + this.subtitleString + "</div>") :
			                         this.subtitleString ? ("<div class='segmentTitle" + titleClass + "'>" + this.titleString + "</div>" +
			                                                "<div class='segmentSubtitle'>" + this.subtitleString + "</div>") :
			                                               ("<div class='segmentTitleSolo" + titleClass + "'>" + this.titleString + "</div>");
			this.title.setHTML(titleHTML);
		}
	},
	
	setHighlighted: function (highlighted) {
		this.window.setContentsURL(highlighted ? "Images/WindowHighlighted.png" : "Images/Window.png");
		if (highlighted) { this.windowOverlay.setHidden(true); }
//		this.buttonSet.setHidden(!highlighted);
	},
	

	//----------------------------------------------------------------------------------
	//
	//  touches
	//

	mouseEntered: function () {
		if (this.site.isScrolling || this.site.zoomedSegment == this) { return; }
		this.windowOverlay.setBackgroundColor("rgba(0,0,0,0.2)");
		this.windowOverlay.setHidden(false);
	},
	
	mouseExited: function () {
		this.windowOverlay.setHidden(true);
	},

	touchDidGoDown: function (touches) {
		this.site.isScrolling = false;
		this.site.stopMomentumScrolling();
		if (this.site.zoomedSegment != this) {
			this.windowOverlay.setBackgroundColor("rgba(0,0,0,0.35)");
			this.windowOverlay.setHidden(false);
		}
	},

	touchDidMove: function (touches) {
		if (this.site.isScrolling) { this.site.scrollWithTouches(touches); return; }
		var showOverlay = (this.site.zoomedSegment != this) && this.containsGlobalPoint(touches.globalPoint);
		if (Math.abs(touches.translation.x) > 8 || Math.abs(touches.translation.y) > 8) {
			this.site.isScrolling = true;
			touches.resetDeltaTranslation();
			showOverlay = false;
		}
		this.windowOverlay.setHidden(!showOverlay);
	},
		
	touchDidGoUp: function (touches) {
		this.windowOverlay.setHidden(true);
		if (this.site.isScrolling) {
			this.site.isScrolling = false;
			this.site.momentumScrollWithTouches(touches);
			return;
		}
		
		if (touches.event.control || touches.event.alt || touches.event.meta) {
			window.open(this.url);  // open in new tab, if we're lucky
		}
		else if (this.site.zoomedSegment != this) {
			var wasZoomed = this.site.isZoomed;
			var shouldBeSlow = touches.event.shift;
			this.site.setZoomedSegment(this, shouldBeSlow, true);
		}
		else if (touches.wasDoubleTap) {
			window.location = this.url;
		}
	}

});


//====================================================================================
//
//  SiteStripSegmentButtonSet
//

var SiteStripSegmentButtonSet = this.SiteStripSegmentButtonSet = new Class({

	Extends: BVLayer,

	initialize: function (superlayer) {
		this.parent(superlayer);
		this.segment = this.getAncestorWithClass(SiteStripSegment);
		this.site = this.getAncestorWithClass(Site);
		
		this.closeButton = new SiteStripSegmentButton(this, "Close");
		this.expandButton = new SiteStripSegmentButton(this, "Expand");
		this.expandButton.setX(superlayer.width - this.expandButton.width);
	},
	
	buttonWasClicked: function (button, event) {
		if (this.segment !== this.site.zoomedSegment) { return; }
	
		if (button === this.closeButton) {
			var shouldBeSlow = event.shift;
			this.site.setZoomedSegment(null, shouldBeSlow);
		}
		else if (button === this.expandButton) {
			var url = this.segment.url;
			if (url) { window.location = url; }
		}
	}
});
		

//====================================================================================
//
//  SiteStripSegmentButton
//

var SiteStripSegmentButton = this.SiteStripSegmentButton = new Class({

	Extends: BVLayer,

	initialize: function (superlayer, name) {
		this.parent(superlayer);
		this.buttonSet = this.getAncestorWithClass(SiteStripSegmentButtonSet);

		this.imageURL = "Images/Window" + name + "Button.png";
		this.hoverURL = "Images/Window" + name + "ButtonHover.png";
		
		this.setTouchable(true);
		this.setHoverable(true);
		this.setContentsURLAndSize(this.imageURL, 38, 34);
	},
	
	mouseEntered: function () {
		this.setContentsURL(this.hoverURL);
	},
	
	mouseExited: function () {
		this.setContentsURL(this.imageURL);
	},
	
	touchDidGoUp: function (touches) {
		if (!this.containsGlobalPoint(touches.globalPoint)) { return; }
		this.setContentsURL(this.imageURL);
		this.buttonSet.buttonWasClicked(this, touches.event);
	}
});
		

//====================================================================================

})();
