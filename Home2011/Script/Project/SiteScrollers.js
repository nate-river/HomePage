//
//  SiteScrollers.js
//  Home2011
//
//  Created by Bret Victor on 3/25/11.
//  (c) 2011 Bret Victor.  MIT open-source license.

//  Classes:
//    SiteScrollerThumb
//    SiteXScroller
//    SiteYScroller

(function(){


//====================================================================================
//
//  SiteScrollerThumb
//

var SiteScrollerThumb = this.SiteScrollerThumb = new Class({

	Extends: BVLayer,

	initialize: function (superlayer, segmentElement) {
		this.parent(superlayer);
		this.scroller = this.getAncestorWithClass(SiteXScroller) || this.getAncestorWithClass(SiteYScroller);
		
		this.normalColor = "#fff";
		this.hoverColor = "#bbb";
		
		this.setAccelerated(true);
		this.setBackgroundColor(this.normalColor);
		
		this.touchRegion = new BVTouchRegion(this);
		this.touchRegion.setHoverable(true);
	},
	
	setSize: function (w,h) {
		this.parent(w,h);
		if (this.touchRegion) { this.touchRegion.setBoundsWithMargin(8); }
	},
	
	touchDidGoDown: function (touches) {
		this.scroller.site.stopMomentumScrolling();
		this.positionAtTouchDown = this.getPosition();
		this.setBackgroundColor(this.hoverColor);
	},

	touchDidMove: function (touches) {
		var newX = this.positionAtTouchDown.x + touches.translation.x;
		var newY = this.positionAtTouchDown.y + touches.translation.y;
		this.scroller.setThumbPosition(newX, newY);
	},

	touchDidGoUp: function (touches) {
		this.setBackgroundColor(this.normalColor);
	},
	
	mouseEntered: function () {
		this.setBackgroundColor(this.hoverColor);
	},
	
	mouseExited: function () {
		if (!this.touchRegion.touches) { this.setBackgroundColor(this.normalColor); }
	}
	
});


//====================================================================================
//
//  SiteXScroller
//

var SiteXScroller = this.SiteXScroller = new Class({

	Extends: BVLayer,

	initialize: function (superlayer, segmentElement) {
		this.parent(superlayer);
		this.site = this.getAncestorWithClass(Site);
		
		this.setTouchable(true);
		this.setSize(this.site.width, 4);
		this.setBackgroundColor("rgba(0,0,0,0.3)");
		
		var leftMargin = 40;
		var rightMargin = 16;
		
		this.track = new BVLayer(this);
		this.track.setAccelerated(true);
		this.track.setSize(this.site.width - leftMargin - rightMargin, this.height);
		this.track.setX(leftMargin);
		
		this.thumb = new SiteScrollerThumb(this.track);
		this.thumb.setSize(60,this.track.height);
		this.thumb.setCornerRadius(this.thumb.height / 2);

		this.underline = new BVLayer(this);
		this.underline.setAccelerated(true);
		this.underline.setY(-this.height);
		this.underline.setSize(this.width,1);
		this.underline.setBackgroundColor("rgba(255,255,255,0.1)");

		this.setHidden(true);
	},
	
	setProgress: function (progress) {
		this.thumb.setX(Math.round(progress * (this.track.width - this.thumb.width)));
	},
	
	setThumbPosition: function (x,y) {
		if (!this.site.isZoomed) { return; }
		var progress = x / (this.track.width - this.thumb.width);
		this.site.setScrollX(lerp(this.site.getMaxScrollX(), this.site.getMinScrollX(), progress));
		this.site.zoomSegmentAtCenter();
	}
});



//====================================================================================
//
//  SiteYScroller
//

var SiteYScroller = this.SiteYScroller = new Class({

	Extends: BVLayer,

	initialize: function (superlayer, segmentElement) {
		this.parent(superlayer);
		this.site = this.getAncestorWithClass(Site);
		
		this.setAccelerated(true);
		this.setSize(7, this.site.height);
		
		this.track = new BVLayer(this);
		this.track.setBackgroundColor("#222");
		this.track.setY(-1);
		this.track.setSize(this.width - 1, this.height - 2);
		
		this.thumb = new SiteScrollerThumb(this.track);
		this.thumb.setSize(6,60);
		this.thumb.setCornerRadius(this.thumb.width / 2);

		this.setX(this.site.width - this.width);
	},
	
	getProgress: function (y) {
		return -y / (this.track.height - this.thumb.height);
	},

	setProgress: function (progress) {
		this.thumb.setY(-Math.round(progress * (this.track.height - this.thumb.height)));
	},
	
	setThumbPosition: function (x,y) {
		if (this.site.isZoomed) { return; }
		var progress = this.getProgress(y);
		this.site.setScrollY(lerp(this.site.getMinScrollY(), this.site.getMaxScrollY(), progress));
	},
	
	siteHeightDidChange: function (height) {
		this.setHeight(height);
		this.track.setHeight(this.height - 2);
		this.setProgress(this.getProgress(this.thumb.y));
	}
});



//====================================================================================

})();

