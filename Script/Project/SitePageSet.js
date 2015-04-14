//
//  SitePageSet.js
//  Home2011
//
//  Created by Bret Victor on 3/25/11.
//  (c) 2011 Bret Victor.  MIT open-source license.

//  Classes:
//    SitePageSet
//    SitePage
//    SitePageShadow
//    SitePageArrowRegion

(function(){


//====================================================================================
//
//  SitePageSet
//

var SitePageSet = this.SitePageSet = new Class({

	Extends: BVLayer,

	initialize: function (superlayer) {
		this.parent(superlayer);
		this.site = this.getAncestorWithClass(Site);

		this.tocTopMargin = 20;
		this.tocHeight = 250;
		this.zoomedYOffset = 30;

		this.zoomedPage = null;
		
		this.pages = new BVLayer(this);

		this.backgroundGradientY = -200;
		this.backgroundGradient = new BVLayer(this);
		this.backgroundGradient.setAccelerated(true);
		this.backgroundGradient.setHidden(true);
		this.backgroundGradient.setContentsURL("Images/BackgroundGradient.png");
		this.backgroundGradient.setY(-this.site.height);
		this.backgroundGradient.setSize(this.site.width, this.site.height + this.backgroundGradientY);
	},
	
	siteHeightDidChange: function (height) {
		if (this.y < 0) { this.setY(-height); }
		this.pages.each( function (page) {
			page.siteHeightDidChange(height);
		}, this);
		this.backgroundGradient.setHeight(height + this.backgroundGradientY);
	},


	//----------------------------------------------------------------------------------
	//
	//  adding pages
	//

	addPageForSegment: function (segment) {
		new SitePage(this.pages, segment);
	},
	
	allPagesWereAdded: function () {
		var previousPage;
		this.pages.each( function (page) {
			if (previousPage) { previousPage.nextPage = page; }
			page.previousPage = previousPage;
			previousPage = page;
		});
		this.updatePagePositionsAroundPage(this.pages.sublayers[0]);
		this.hideAllPages();
	},
	
	getAvailableHeightForPage: function (page) {
		var tocHeight = this.tocHeight * Math.max(0.51, page.segment.strip.stripScale);
		tocHeight += page.segment.properties.pageYOffset || 0;
		return Math.round(this.site.height - tocHeight - this.site.xScroller.height - this.tocTopMargin);
	},
	

	//----------------------------------------------------------------------------------
	//
	//  updating page positions
	//

	updatePagePositionsAroundPage: function (centerPage, isShowing) {
		var peekingWidth = Math.round(0.5 * (this.site.width - centerPage.width) - 100).limit(100, 200);
		if (!isShowing) { peekingWidth = Math.round(this.site.width/2); }
		
		var offpageWidth = 100;
		var offpageHeight = 100;
		var siteWidth = this.site.width;
		var siteHeight = this.site.height;
		var isRightOfCenter = false;
		var tiltRotation = BVLayer._quirks.isAccelerationAvailable ? (3.0 / 180 * Math.PI) : 0;
		
		this.pages.each( function(page) {
		
			var targetY = isShowing ? (page.showingY - this.zoomedYOffset) : (-siteHeight - offpageHeight);
			
			if (isRightOfCenter) {  // way off-right
				page.setRotation(-tiltRotation);
				page.setPosition(siteWidth + offpageWidth, targetY);
			}
			else if (page == centerPage.nextPage) {  // peeking off-right
				page.setHidden(false);
				page.setRotation(-tiltRotation);
				page.setPosition(siteWidth - peekingWidth, targetY);
				isRightOfCenter = true;
			}
			else if (page == centerPage) {  // center
				page.setHidden(false);
				page.setRotation(0);
				page.setPositionOfLocalPoint(0.5 * siteWidth, isShowing ? page.showingY : targetY, 0.5 * page.width, 0);
			}
			else if (page == centerPage.previousPage) {  // peeking off-left
				page.setHidden(false);
				page.setRotation(tiltRotation);
				page.setPositionOfLocalPoint(peekingWidth, targetY, page.width, 0);
			}
			else {  // way off-left
				page.setRotation(tiltRotation);
				page.setPosition(-page.width - offpageWidth, targetY);
			}
		}, this);
		
		this.site.pageArrowRegionLeft.updatePositionAroundPage(isShowing ? centerPage : null);
		this.site.pageArrowRegionRight.updatePositionAroundPage(isShowing ? centerPage : null);
	},
	
	hideOffscreenPagesAroundPage: function (centerPage) {
		var lastPage = null;
		var isRightOfCenter = false;
		
		this.pages.each( function(page) {
			if (isRightOfCenter) {
				page.setHidden(lastPage !== centerPage);
			}
			else if (page === centerPage) {
				page.setHidden(false);
				if (lastPage) { lastPage.setHidden(false); }
				isRightOfCenter = true;
			}
			else {
				page.setHidden(true);
			}
			lastPage = page;
		}, this);
	},
	
	showPagesAroundPage: function (centerPage) {
		var lastPage = null;
		var isRightOfCenter = false;
		
		this.pages.each( function(page) {
			if (isRightOfCenter) {
				if (lastPage === centerPage) { page.setHidden(false); }
			}
			else if (page === centerPage) {
				page.setHidden(false);
				if (lastPage) { lastPage.setHidden(false); }
				isRightOfCenter = true;
			}
			lastPage = page;
		}, this);
	},
	
	hideAllPages: function () {
		this.pages.each( function(page) { page.setHidden(true); } );
	},
		

	//----------------------------------------------------------------------------------
	//
	//  zooming
	//

	setZoomedPage: function (page) {
		var oldPage = this.zoomedPage;
		if (oldPage === page) { return; }
		this.zoomedPage = page;
		
		if (oldPage) { oldPage.setZoomed(false); oldPage.setContentShowing(false); oldPage.setZPosition(0); }
		if (page) { page.setZoomed(true); page.setZPosition(1); }

		if (this.pageTransitionTimers) { this.pageTransitionTimers.each(clearTimeout); }
		this.pageTransitionTimers = [];

		var delay = function (duration, fn, bind) {
			if (BVLayer.animationsEnabled) { bind.pageTransitionTimers.push(fn.delay(duration,bind)); }
			else { fn.call(bind); }
		};
		
		if (!oldPage) {  // showing
			this.updatePagePositionsAroundPage(page, false);
			this.backgroundGradient.setY(-this.site.height);
			this.backgroundGradient.setHidden(false);

			delay(10, (function () {
				var duration = this.site.zoomDuration - 100;
				BVLayer.animate(duration, function() {
					this.updatePagePositionsAroundPage(page, true);
					this.backgroundGradient.setY(this.backgroundGradientY);
				}, this);
				delay(duration, function () { this.zoomedPage.setContentShowing(true); }, this);
			}), this);
		}
		else if (!page) {  // hiding
			BVLayer.animate(this.site.unzoomDuration, function() {
				this.updatePagePositionsAroundPage(oldPage, false);
				this.backgroundGradient.setY(-this.site.height);
			}, this);
			delay(this.site.unzoomDuration + 200, function () {
				this.hideAllPages();
				this.backgroundGradient.setHidden(true);
			}, this);
		}
		else {  // sliding
			this.showPagesAroundPage(page);
			delay(10, (function () {
				var duration = 400;
				BVLayer.animate(duration, function() { this.updatePagePositionsAroundPage(page, true); }, this);
				delay(duration, function () { this.zoomedPage.setContentShowing(true); }, this);
			}), this);
			delay(700, (function () {
				this.hideOffscreenPagesAroundPage(page);
			}), this);
		}
	}

});


//====================================================================================
//
//  SitePage
//

var SitePage = this.SitePage = new Class({

	Extends: BVLayer,

	initialize: function (superlayer, segment) {
		this.parent(superlayer);
		this.pageSet = this.getAncestorWithClass(SitePageSet);
		this.site = this.getAncestorWithClass(Site);
		
		this.setHidden(true);
		this.setAccelerated(true);

		this.segment = segment;
		segment.page = this;
		
		this.setTouchable(true);
		this.updateSize();
		
		this.shadow = new SitePageShadow(this);
		
		this.background = new BVLayer(this);
		this.background.setSize(this.getSize());
		
		var backgroundColor = segment.properties.pageColor;
		if (backgroundColor === undefined) { backgroundColor = "fff"; }
		this.background.setBackgroundColor("#" + backgroundColor);
		
		this.previewContent = new BVLayer(this);
		if (gSiteShowPageImages) { this.previewContent.setContentsURL("PageImages/" + this.segment.name + ".jpg"); }
		if (this.segment.properties.imageWidth) { this.previewContent.setSize(this.getSize()); }
		else {
			var previewHeight = this.segment.properties.pageHeight ? Math.min(600, this.segment.properties.pageHeight) : 600;
			this.previewContent.setSize(this.width, previewHeight);
		}
		
		if (this.segment.captionString) {
			this.caption = new BVText(this);
			this.caption.setHidden(true);
			this.caption.setTextClass("pageCaption");
			this.caption.setTextStyle("pointerEvents", "auto");
			if (this.segment.properties.captionColor) {
				this.caption.setTextStyle("color", "#" + this.segment.properties.captionColor);
			}
			this.caption.setHTML(this.segment.captionString);
			this.caption.setY(17);
		}
		
		this.setContentShowing(false);
	},
	
	setZoomed: function (zoomed) {
		this.isZoomed = zoomed;
	},
	
	preloadContent: function () {
		this.root.contentContainer.preload(this.segment.displayURL);
	},
	
	setContentShowing: function (showing) {
		if (showing === this.isContentShowing) { return; }
		this.isContentShowing = showing;
		
		if (this.caption) { this.caption.setHidden(!showing); }
		
		var contentContainer = this.root.contentContainer;
		
		if (!showing) {
			if (contentContainer.url === this.segment.displayURL) { contentContainer.setURL(null); }
		}
		else {
			var globalPosition = this.superlayer.getGlobalPointForLocalPoint(Math.round(0.5 * (this.site.width - this.width)), this.showingY);
			contentContainer.setGlobalPosition(globalPosition);
			contentContainer.setSize(this.getSize());
			contentContainer.setURL(this.segment.displayURL, this.segment.contentClickURL, this.segment.properties);
			if (this.nextPage) { contentContainer.setPreloadURL(this.nextPage.segment.displayURL, this.nextPage.segment.properties); }
			this.site.setHashForSegment(this.segment);
		}
	},

	updateSize: function () {
		var availableWidth = this.site.width - 70;
		var availableHeight = this.pageSet.getAvailableHeightForPage(this);
		var contentSize = this.root.contentContainer.getContentSizeForProperties(this.segment.properties, availableWidth, availableHeight);
		this.setSize(contentSize);
		this.showingY = -this.site.height + availableHeight;
	},

	siteHeightDidChange: function (height) {
		this.updateSize();  // todo, might need to recenter?
		if (this.segment.properties.imageWidth) { this.previewContent.setSize(this.getSize()); }
		this.shadow.update();
	}

});


//====================================================================================
//
//  SitePageShadow
//

var SitePageShadow = this.SitePageShadow = new Class({

	Extends: BVLayer,

	initialize: function (superlayer, segment) {
		this.parent(superlayer);
		this.page = this.getAncestorWithClass(SitePage);

		this.addShadows();
	},

	addShadows: function () {
		var names = [ "TopLeft", "Top", "TopRight", "Left", "Right", "BottomLeft", "Bottom", "BottomRight" ];
		for (var i = 0; i < names.length; i++) {
			var shadow = new BVLayer(this);
			this[names[i]] = shadow;
			shadow.setContentsURLAndSize("Images/PageShadow" + names[i] + ".png", 60, 60);
		}

		this.update();
	},

	update: function () {
		var imageWidth = this.TopLeft.width;
		var imageHeight = this.TopLeft.height;
		var extentX = 32;
		var extentTop = 28;
		var extentBottom = 34;
		
		this.TopLeft.setPosition(-extentX, extentTop);
		this.TopRight.setPosition(this.page.width - imageWidth + extentX, extentTop);

		this.Top.setPosition(this.TopLeft.x + this.TopLeft.width, extentTop);
		this.Top.setWidth(this.TopRight.x - this.Top.x);

		this.BottomLeft.setPosition(-extentX, -this.page.height + imageHeight - extentBottom);
		this.BottomRight.setPosition(this.TopRight.x, this.BottomLeft.y);

		this.Bottom.setPosition(this.Top.x, this.BottomLeft.y);
		this.Bottom.setWidth(this.Top.width);

		this.Left.setPosition(this.TopLeft.x, this.TopLeft.y - this.TopLeft.height);
		this.Left.setHeight(this.Left.y - this.BottomLeft.y);

		this.Right.setPosition(this.TopRight.x, this.Left.y);
		this.Right.setHeight(this.Left.height);
	}

});



//====================================================================================
//
//  SitePageArrowRegion
//

var SitePageArrowRegion = this.SitePageArrowRegion = new Class({

	Extends: BVLayer,

	initialize: function (superlayer, isRight) {
		this.parent(superlayer);
		this.site = this.getAncestorWithClass(Site);
		
		this.isRight = isRight;
		this.setAccelerated(true);
		this.setTouchable(true);
		this.setHoverable(true);
		this.element.setStyle("cursor", "pointer");

		this.arrow = new BVLayer(this);
		this.arrow.setAccelerated(true);
		this.arrow.setContentsURLAndSize("Images/PageArrow" + (isRight ? "Right" : "Left") + ".png", 45, 34);

		this.setHidden(true);
		this.arrow.setHidden(true);
	},
	
	updatePositionAroundPage: function (page) {
		var targetPage = !page ? null : this.isRight ? page.nextPage : page.previousPage;
		if (!targetPage) {
			this.setHidden(true);
			this.arrow.setHidden(true);
			return;
		}
		
		this.setHidden(false);

		var scrollbarWidth = 14;
		var xMargin = 10;

		var targetPageCorner = targetPage.getGlobalPointForLocalPoint(this.isRight ? 0 : targetPage.width,0);
		
		var width;
		if (this.isRight) {
			width = Math.max(0, this.site.width - Math.max(targetPageCorner.x, page.x + page.width));
			this.setPosition(this.site.width - width, page.y);
			this.setSize(width, this.site.height + this.y);
			this.arrow.setX(this.width - this.arrow.width - scrollbarWidth - xMargin);
		}
		else {
			width = Math.max(0, Math.min(targetPageCorner.x, page.x));
			this.setPosition(0, page.y);
			this.setSize(width, this.site.height + this.y);
			this.arrow.setX(xMargin);
		}

		var localTargetPageCorner = this.getLocalPointForGlobalPoint(targetPageCorner);
		this.arrow.setY(Math.max(lerp(localTargetPageCorner.y, -this.height + this.arrow.height, 0.25),
			            localTargetPageCorner.y -0.5 * (targetPage.height - this.arrow.height)));
	},
	
	mouseEntered: function () {
		this.arrow.setHidden(false);
	},
	
	mouseExited: function () {
		this.arrow.setHidden(true);
	},

	touchDidGoDown: function (touches) {
		var zoomedPage = this.site.pageSet.zoomedPage;
		if (!zoomedPage) { return; }
		
		var pageToZoom = this.isRight ? zoomedPage.nextPage : zoomedPage.previousPage;
		if (!pageToZoom) { return; }
		
		this.site.setZoomedSegment(pageToZoom.segment, false, true);
	}

});

		

//====================================================================================

})();
