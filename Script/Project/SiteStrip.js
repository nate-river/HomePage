//
//  SiteStrip.js
//  Home2011
//
//  Created by Bret Victor on 3/25/11.
//  (c) 2011 Bret Victor.  MIT open-source license.

//  Classes:
//    SiteStrip
//    SiteStripHeader
//    SiteStripHeaderTitle

(function(){


//====================================================================================
//
//  SiteStrip
//

var SiteStrip = this.SiteStrip = new Class({

	Extends: BVLayer,

	initialize: function (superlayer, info) {
		this.parent(superlayer);
		this.section = this.getAncestorWithClass(SiteSection);
		this.site = this.getAncestorWithClass(Site);

		this.setAccelerated(true);
		this.setHidden(true);

		this.properties = info.properties;
		this.isFirstInSubsection = info.isFirstInSubsection;
		this.isLastInSubsection = info.isLastInSubsection;
		this.isFirstInRow = info.isFirstInRow;
		this.shouldHideHeaderTitle = !!this.properties.hideHeader;
		this.paddingLeft = 0;

		this.stripScale = info.scale;
		this.segmentSize = { width:Math.round(this.section.segmentUnscaledWidth * this.stripScale), 
		                     height:Math.round(this.section.segmentUnscaledHeight * this.stripScale) };

		if (info.title === null) {
			this.offLeft = new BVLayer(this);
			this.offLeft.setContentsURL("Images/FilmOffleft.png");
			this.offLeft.setSize(Math.round(57 * this.segmentSize.height / 235), this.segmentSize.height);
			this.offLeft.setX(-this.offLeft.width);
		}
		
		this.segments = new BVLayer(this);
		
		var x = 0;
		var height = 0;
		
		if (info.title !== null) {
			this.header = new SiteStripHeader(this.segments, info.title);
			this.setHeaderHidden(true);
			x += this.header.width;
		}
		
		var pageSet = this.section.site.pageSet;
		
		info.segmentElements.each( function (segmentElement) {
			var segment = new SiteStripSegment(this.segments, segmentElement);
			pageSet.addPageForSegment(segment);
			segment.setX(x);
			x += segment.width;
			height = Math.max(height, segment.height);
		}, this);
		
		this.setSize(x,height);
		
		this.offRight = new BVLayer(this);
		if (this.isLastInSubsection) { this.offRight.setContentsURLAndSize("Images/FilmLeft.png", this.segmentSize); }
		else {
			this.offRight.setContentsURL("Images/FilmOffright.png");
			this.offRight.setSize(Math.round(57 * this.segmentSize.height / 235), this.segmentSize.height);
		}
		this.offRight.setX(this.width);
		
		this.setRotation(kSiteStripRotation);
	},
	
	setZoomed: function (zoomed) {
		if (this.offLeft) { this.offLeft.setHidden(zoomed); }
		this.offRight.setHidden(zoomed && !this.isLastInSubsection);
	},
	
	setHeaderHidden: function (hidden) {
		if (this.shouldHideHeaderTitle && this.header) { this.header.title.setHidden(hidden); }
	},
	
	updateHeaderPosition: function () {
		if (this.header) { this.header.title.updatePosition(); }
	}
	
});


//====================================================================================
//
//  SiteStripHeader
//

var SiteStripHeader = this.SiteStripHeader = new Class({

	Extends: BVLayer,

	initialize: function (superlayer, title) {
		this.parent(superlayer);
		this.strip = this.getAncestorWithClass(SiteStrip);
		this.site = this.getAncestorWithClass(Site);
		
		this.isHeader = true;
		this.setSize(this.strip.segmentSize);
		
		this.film = new BVLayer(this);
		this.film.setContentsURLAndSize("Images/FilmRight.png", this.getSize());
		
		this.title = new SiteStripHeaderTitle(this.site.headerTitles, this.strip, title);
	}
	
});


		
//====================================================================================
//
//  SiteStripHeaderTitle
//

var SiteStripHeaderTitle = this.SiteStripHeaderTitle = new Class({

	Extends: BVLayer,

	initialize: function (superlayer, strip, title) {
		this.parent(superlayer);
		this.site = this.getAncestorWithClass(Site);
		this.strip = strip;

		this.segmentWidth = this.strip.segmentSize.width;
		this.segmentHeight = this.strip.segmentSize.height;
		
		this.setAccelerated(true);
		this.setRotation(kSiteStripRotation);
		
		this.text = new BVText(this);
		var headerClass = strip.properties.headerClass || "stripHeader";
	
		this.text.setTextClass(headerClass);
		this.text.setTextStyles({
			position: "absolute",
			bottom: "0px",
			right: "0px",
			width: "200px"
		});
		
		var isTwoLines = title.contains(" ");
		var titleHTML = title.replace(" ", "<br/>");  // convert spaces to line breaks
		this.text.setHTML(titleHTML);
		
		var scale = this.strip.stripScale;
		this.text.setRotation(kSiteStripHeaderTitleRotation);
		this.localTargetPosition = { x:this.segmentWidth - Math.round(26 * scale), y:-this.segmentHeight + Math.round((isTwoLines ? 80 : 88) * scale) };
	},
	
	updatePosition: function () {
		var targetPosition = this.strip.getGlobalPointForLocalPoint(this.localTargetPosition);
		if (!this.site.isZoomed) { this.setGlobalPosition(targetPosition); return; }
		
		var travelWidth = this.segmentWidth;
		var stopWidth = this.strip.subsectionWidth - Math.round(0.5 * (this.site.width + this.segmentWidth) - this.segmentWidth);
		if (stopWidth <= travelWidth) { this.setGlobalPosition(targetPosition); return; }

		var stripPosition = this.strip.getGlobalPosition();
		var stripTailX = stripPosition.x + stopWidth;
		var leftEdgeX = -20;
		var stoppedPosition = { x:leftEdgeX + -3 + this.localTargetPosition.x, y:-20 + this.localTargetPosition.y };
			 // todo: shouldn't be hard-coded! how to calculate these offsets?

		if (stripTailX < 0) {  // all the way off to the left, stay at head of strip
		}
		else if (stripTailX < travelWidth) {  // going off to the left
			var travel = stripTailX / travelWidth;
			targetPosition.x = lerp(-this.segmentWidth, 0, travel) + this.localTargetPosition.x;
			targetPosition.y = stoppedPosition.y;
		}
		else if (stripPosition.x < leftEdgeX) {  // stopped at the left edge
			targetPosition = stoppedPosition;
		}
		else {  // coming in from the right, stay at head of strip
		}
	
		this.setGlobalPosition(targetPosition);
	}
});


//====================================================================================

})();
