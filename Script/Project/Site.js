//
//  Site.js
//  Home2011
//
//  Created by Bret Victor on 2/23/11.
//  (c) 2011 Bret Victor.  MIT open-source license.

//  Classes:
//    Site
//    SiteBackground
//    SiteHomeButton
//    SiteDoodle
//

//  Section properties:
//   titleHeight:  height for section title and subtitle
//   hideSectionTitle: section title is never shown when zoomed
//   centered: strips are centered instead of full-justified
//   filmEdges: show perforated filmstrip edges
//
//  Strip properties:
//    scale: default segment scale before fitting to grid
//    noStretch: use scale exactly instead of fitting to grid
//    rowBreak: strip should begin a new row
//    headerClass: CSS class for header title
//    hideHeader: strip header title is hidden when unzoomed
//
//  Segment properties related to StripSegment:
//    widthScale: additional factor to stretch width
//    urlIndex: identifier when multiple segments refer to the same URL
//    hideTitle: segment title and subtitle are hidden
//    subtitleOnly: segment title is hidden
//    titleClass: CSS class for segment title
//    
//  Segment properties related to Page:
//    pageColor: background color of the page
//    pageWidth: default page width
//    pageHeight: fixed page height (dynamic if not given)
//    pageHeightCanChange: even after content loads, continue to poll for document height
//    imageWidth, imageHeight: indicates that content is an image, and default size
//    hideSiteHeight: when page is scrolled past this height, site will be hidden
//    captionColor: text color of caption above page
//
//  Segment propeties related to ContentContainer:
//    injectContent: insert content HTML into site instead of using an iframe
//    minimumImageScale: image will be fullsize if fitting to screen would squish it smaller than this
//    noSquish: do not fit the image to fit vertical space
//    noPreload: do not preload this content
//    queryWindowSize: ?width=1000&height=700 (or whatever) will be appended to URL
//


//====================================================================================
//
//  globals
//

var gSiteShowThumbnailImages = true;
var gSiteShowPageImages = true;

var kSiteZoomDuration = 900;  // ms
var kSiteUnzoomDuration = 1000;  // ms

var kSiteStripRotation =  -2 / 180 * Math.PI;
var kSiteSectionTitleRotation =  -2 / 180 * Math.PI;
var kSiteStripHeaderTitleRotation = 12 / 180 * Math.PI;

var lerp = function(a,b,t) { return a + t * (b - a); };



(function(){

//====================================================================================
//
//  Site
//

var Site = this.Site = new Class({

	Extends: BVLayer,

	initialize: function (superlayer) {
		this.parent(superlayer);
		
		this.scrollX = 0;
		this.scrollY = 1;  // start off accelerated
		this.backgroundOffsetX = 0;
		this.backgroundOffsetY = 0;
		
		this.zoomedSegment = null;
		this.isZoomed = false;
		this.isZoomTransitioning = false;
		
		this.setTouchable(true);
		this.setSize(this.root.getSize());
		this.setMasksToBounds(true);
		
		this.background = new SiteBackground(this);

		this.sectionsContainer = new BVLayer(this);  // to reserve z-order
		this.sections = new BVLayer(this.sectionsContainer);
		this.sections.setHasElement(false);

		this.sectionTitles = new BVLayer(this);
		
		this.pageSet = new SitePageSet(this);

		this.edgeShadows = new BVLayer(this);
		this.edgeShadows.setHasElement(false);
		this.addEdgeShadows();

		this.pageArrowRegionLeft = new SitePageArrowRegion(this,false);
		this.pageArrowRegionRight = new SitePageArrowRegion(this,true);
		
		// this.topContactSet = new SiteContactSet(this, "top");
		// this.bottomContactSet = new SiteContactSet(this, "bottom");
		
		this.headerTitles = new BVLayer(this);
		this.doodle = new SiteDoodle(this);

		this.xScroller = new SiteXScroller(this);
		this.yScroller = new SiteYScroller(this);
		
		this.homeButton = new SiteHomeButton(this);
		
		this.addSectionsAndPages();
		
		BVLayer.setAnimationsEnabled(false);
		this.zoomHashedSegment();
		BVLayer.setAnimationsEnabled(true);

		window.addEvent("hashchange", this.zoomHashedSegment.bind(this));
		window.addEvent('scroll', this.windowDidScroll.bind(this));
		window.addEvent("mousewheel", this.mouseWheelWithEvent.bind(this));

		this.graduallyShowStrips();
		this.setScrollOffset(this.scrollX, this.scrollY);  // accelerate
	},
	
	addEdgeShadows: function () {
		this.edgeShadows.topShadow = new BVLayer(this.edgeShadows);
		this.edgeShadows.topShadow.setAccelerated(true);
		this.edgeShadows.topShadow.setContentsURLAndSize("Images/EdgeShadowTop.png", this.width, 200);

		this.edgeShadows.bottomShadow = new BVLayer(this.edgeShadows);
		this.edgeShadows.bottomShadow.setAccelerated(true);
		this.edgeShadows.bottomShadow.setContentsURLAndSize("Images/EdgeShadowBottom.png", this.width, 200);
		this.edgeShadows.bottomShadow.setY(-this.height + this.edgeShadows.bottomShadow.height);

		this.edgeShadows.leftShadow = new BVLayer(this.edgeShadows);
		this.edgeShadows.leftShadow.setAccelerated(true);
		this.edgeShadows.leftShadow.setContentsURLAndSize("Images/EdgeShadowLeft.png", 142, this.height);

		this.edgeShadows.rightShadow = new BVLayer(this.edgeShadows);
		this.edgeShadows.rightShadow.setAccelerated(true);
		this.edgeShadows.rightShadow.setContentsURLAndSize("Images/EdgeShadowRight.png", 142, this.height);
		this.edgeShadows.rightShadow.setX(this.width - this.edgeShadows.rightShadow.width);

		this.edgeShadows.headerTitleShadow = new BVLayer(this.edgeShadows);
		this.edgeShadows.headerTitleShadow.setContentsURLAndSize("Images/HeaderTitleShadow.png", 180, 183);
		this.edgeShadows.headerTitleShadow.setHidden(true);
		this.edgeShadows.headerTitleShadow.setAccelerated(true);
	},
	

	//----------------------------------------------------------------------------------
	//
	//  gradual load
	//
	
	graduallyShowStrips: function () {
		this.preloadImageURLs = this.getPreloadImageURLs();
		var intervalID = (function () {
		
			if (!this.areAllStripsShowing) {
				var showCount = 2;
				var sections = this.sections.sublayers;
				for (var i = 0; i < sections.length; i++) {
					var strips = sections[i].strips.sublayers;
					var stripCount = strips.length;
					for (var j = 0; j < stripCount; j++) {
						var strip = strips[j];
						if (strip.hidden) {
							strip.setHidden(false);
							showCount--;
							if (showCount === 0) { return; }
						}
					}
				}
				this.areAllStripsShowing = true;
			}
			else if (!this.areImagesPreloaded) {
				var loadCount = Math.min(5, this.preloadImageURLs.length);
				for (var k = 0; k < loadCount; k++) {
					var image = new Image();
					image.src = this.preloadImageURLs.shift();
				}
				if (loadCount === 0) { this.areImagesPreloaded = true; }
			}
			else {
				clearInterval(intervalID);
			}
			
		}).periodical(50,this);
		
		this.sections.sublayers[0].strips.sublayers[0].setHidden(false);  // show first strip immediately
	},
	
	getPreloadImageURLs: function () {
		var urls = [
		    "Images/HeaderTitleShadow.png",
		    "Images/ButtonHome.png",
		    "Images/BackgroundGradient.png",
		    "Images/PageShadowBottom.png",
		    "Images/PageShadowBottomLeft.png",
		    "Images/PageShadowBottomRight.png",
		    "Images/PageShadowLeft.png",
		    "Images/PageShadowRight.png",
		    "Images/PageShadowTop.png",
		    "Images/PageShadowTopLeft.png",
		    "Images/PageShadowTopRight.png"
		];
		
		this.pageSet.pages.each( function (page) {
			urls.push("PageImages/" + page.segment.name + ".jpg");
		});
		
		return urls;
	},
	

	//----------------------------------------------------------------------------------
	//
	//  hash
	//
	
	setHashForSegment: function (segment) {
		if (segment) { window.location.hash = "!" + (segment.urlIndex || "") + "/" + segment.localURL; }
		else { window.location.hash = ""; }
	},
	
	zoomHashedSegment: function () {
		var hash = window.location.hash;
		var matches = hash.match(/^\#?\!(\d)?\/(.+)/) || [];
		var index = (matches[1] || 0) * 1;
		var url = matches[2] || null;
		if (!url) {
			this.setZoomedSegment(null);
		}
		else if (!this.zoomedSegment || this.zoomedSegment.localURL !== url) {
			var segment = this.getSegmentWithLocalURL(url, index);
			this.setZoomedSegment(segment);
			if (segment) { this.scrollSegmentToCenter(segment); }
		}
	},
	

	//----------------------------------------------------------------------------------
	//
	//  resize
	//
	
	rootWasResized: function () {
		if (this.resizeTimer !== undefined) { clearTimeout(this.resizeTimer); delete this.resizeTimer; }

		if (this.root.width === this.width) {
			this.updateForNewRootHeight();
		}
		else {
			this.yScroller.setHidden(true);
			this.setNativeScrollbarHidden(true);
			this.resizeTimer = this.updateForNewRootSize.delay(300,this);
		}
	},
	
	updateForNewRootSize: function () {
		if (this.root.width === this.width) {
			this.yScroller.setHidden(this.isZoomed);
			this.setNativeScrollbarHidden(!this.isZoomed);
			if (this.root.height !== this.height) { this.updateForNewRootHeight(); }
		}
		else {
			var scrollY = this.scrollY;

			this.root.destroy();
			var newRoot = new Root();

			if (!newRoot.site.zoomedSegment) { newRoot.site.setScrollY(scrollY); }
		}
	},
	
	updateForNewRootHeight: function () {
		var height = this.root.height;
		this.setHeight(height);

		this.yScroller.setHidden(this.isZoomed);
		this.setNativeScrollbarHidden(!this.isZoomed);
		
		this.edgeShadows.leftShadow.setHeight(height);
		this.edgeShadows.rightShadow.setHeight(height);
		this.setScrollOffset(this.scrollX, this.scrollY);

		this.pageSet.siteHeightDidChange(height);
		this.yScroller.siteHeightDidChange(height);
	},
	

	//----------------------------------------------------------------------------------
	//
	//  window scroll
	//

	windowDidScroll: function (event) {
		var shouldHide = false;
		if (this.zoomedSegment) {
			var scrollY = window.getScroll().y;
			var hideScrollY = this.zoomedSegment.properties.hideSiteHeight ? 
				Math.max(360, (this.zoomedSegment.properties.hideSiteHeight - this.zoomedSegment.page.y - this.height)) :
				(this.height * 2);
			shouldHide = (scrollY >= hideScrollY);
		}
		this.setHidden(shouldHide); // todo, must unhide on other things? (hash change, etc)
	},

	
	//----------------------------------------------------------------------------------
	//
	//  properties
	//

	mergePropertiesFromElement: function (inheritedProperties, element) {
		var properties = {};
		for (var p in inheritedProperties) { properties[p] = inheritedProperties[p]; }
		
		var className = element.className || "";
		var names = className.split(" ");
	
		for (var i=0; i < names.length; i++) {
			var name = names[i];
			var substrings = name.split('-');
			if (substrings.length != 2) { continue; }
			
			var property = substrings[0];
			var value = substrings[1];
			var valueAsInt = parseInt(value);
			var hasNonDigit = value.match(/\D/);
			var hasLeadingZero = (value.length > 1 && value.substr(0,1) === "0");
			if (!hasNonDigit && !hasLeadingZero && !isNaN(valueAsInt)) { value = valueAsInt; }
			
			var percentMatch = property.match(/(.+)Percent$/);
			if (percentMatch) { property = percentMatch[1]; value = value / 100; }
			
			properties[property] = value;
		}
		return properties;
	},


	//----------------------------------------------------------------------------------
	//
	//  sections
	//
	
	addSectionsAndPages: function () {
		var sectionElements = document.id("sections").getChildren("div");
		sectionElements.each( function(sectionElement) {
			if (sectionElement.hasClass("hidden-1")) { return; }
			new SiteSection(this.sections, sectionElement);
		}, this);
		
		this.updateSectionPositions();
		this.pageSet.allPagesWereAdded();
	},

	setSectionTitlesOpacity: function (opacity) {
		this.sections.each( function (section) {
			section.setTitleOpacity(opacity);
		}, this);
	},
	
	updateSectionTitlePositions: function () {
		this.sections.each( function (section) {
			section.updateTitlePosition();
		}, this);
	},

	updateSectionTitlesHidden: function () {
		if (!this.isZoomed) { return; }
		this.sections.each( function (section) {
			section.showTitlesThatHaveScrolledOffscreen();
		}, this);
	},

	setStripHeadersHidden: function (hidden) {
		this.sections.each( function (section) {
			section.strips.each( function (strip) {
				strip.setHeaderHidden(hidden);
			}, this);
		}, this);
	},
	
	updateSectionPositions: function () {
		var x = 0;
		var y = -100;
		
		this.sections.each( function (section) {
			section.updateStripPositions();
			
			section.setPosition(x,y);
			if (this.isZoomed) {
				x += section.width;
				y -= section.height;
			}
			else {
				y -= section.height + 100;
			}
		}, this);
		
		this.sections.setSize(this.isZoomed ? x : this.width, -y);
	},
	
	updateSectionPositionsPreservingPositionOfSegment: function (segment) {
		var oldSegmentPosition = segment.getGlobalPosition();
		this.updateSectionPositions();
		
		this.sections.setPosition(0,0);
		var newSegmentPosition = segment.getGlobalPosition();
		
		var offsetX = oldSegmentPosition.x - newSegmentPosition.x;
		var offsetY = oldSegmentPosition.y - newSegmentPosition.y;
		
		this.backgroundOffsetX = (this.background.x - offsetX).round();
		this.backgroundOffsetY = (this.background.y - offsetY).round();
		
		this.setScrollOffset(offsetX, offsetY, true);
	},
	
	updateHeaderPositions: function () {
		this.sections.each( function (section) { section.updateHeaderPositions(); });
	},
	
	
	//----------------------------------------------------------------------------------
	//
	//  segments
	//

	eachSegment: function (fn, bind) {
		this.sections.each( function (section) {
			section.strips.each( function (strip) {
				strip.segments.each( function (segment) {
					if (segment.isHeader) { return; }
					fn.call(bind,segment);
				}, this);
			}, this);
		}, this);
	},
	
	getSegmentNearX: function (x) {
		var closestDx = 1e10;
		var closestSegment = null;
		
		this.eachSegment( function (segment) {
			var centerX = segment.getGlobalX() + 0.5 * segment.width;
			var dx = Math.abs(x - centerX);
			if (dx < closestDx) {
				closestDx = dx;
				closestSegment = segment;
			}
		}, this);
	
		return closestSegment;
	},

	getSegmentWithLocalURL: function (url, urlIndex) {
		urlIndex = urlIndex || 0;
		var foundSegment = null;

		this.eachSegment( function (segment) {
			if (segment.localURL === url && segment.urlIndex === urlIndex) { foundSegment = segment; }
		}, this);
		
		return foundSegment;
	},
	
	getSegmentPageInfos: function () {
		var infos = "";
		this.eachSegment( function (segment) {
			var pageSize = this.root.contentContainer.getContentSizeForProperties(segment.properties, 2000, 2000);
			var pageColor = segment.properties.pageColor;
			if (pageColor === undefined) { pageColor = "fff"; }
			infos += segment.name + " " + pageColor + " " + pageSize.width + " " + pageSize.height + " " + segment.previewURL + "\n";
		}, this);
		return infos;
	},

	getSegmentThumbnailInfos: function () {
		var infos = "";
		this.eachSegment( function (segment) {
			infos += segment.name + " " + (segment.properties.scale || 1) + " " + (segment.properties.widthScale || 1) + "\n";
		}, this);
		return infos;
	},
	
		
	//----------------------------------------------------------------------------------
	//
	//  mouse wheel
	//

	mouseWheelWithEvent : function (event) {
		var domEvent = event.event;
		var isHorizontal = (domEvent.axis !== undefined) ? (domEvent.axis === domEvent.HORIZONTAL_AXIS) :
		                   (domEvent.wheelDeltaX !== undefined) ? (Math.abs(domEvent.wheelDeltaX) > Math.abs(domEvent.wheelDeltaY)) : false;
		                   
		var delta = domEvent.detail ? (-domEvent.detail) :
			        domEvent.wheelDelta ? (domEvent.wheelDelta / (((domEvent.wheelDelta % 120) === 0) ? 120 : 3)) : 0;
		delta *= Browser.firefox ? 6 : 1;

		if (isHorizontal) { this.mouseWheelHorizontal(-delta, event); }
		else { this.mouseWheelVertical(delta, event); }
	},
		
	mouseWheelHorizontal: function (dx,event) {
		event.stop();  // always eat horizontal scroll
		
		if (this.isZoomTransitioning) { return; }
		if (!this.isZoomed || !this.pageSet.zoomedPage) { return; }
		
		var pageY = this.pageSet.zoomedPage.getGlobalPosition().y;
		if (-event.page.y <= pageY) { return; }  // ignore if mouse is over a zoomed page
		
		this.recenterBackgroundOffset();
		this.setScrollX(this.scrollX - dx);
		this.zoomSegmentAtCenter();
	},

	mouseWheelVertical: function (dy,event) {
		if (this.isZoomed) { return; }  // pass through vertical scroll so zoomed page can scroll
		event.stop();  // if no zoomed page, eat the vertical scrolll

		if (this.isZoomTransitioning) { return; }
		
		this.recenterBackgroundOffset();
		this.setScrollY(this.scrollY - dy);
	},
	

	//----------------------------------------------------------------------------------
	//
	//  scrolling
	//
	
	getMinScrollX: function () { return -this.sections.width + 0.5 * this.width; },
	getMaxScrollX: function () { return 0.5 * this.width; },
	getMinScrollY: function () { return 0; },
	getMaxScrollY: function () { return this.sections.height - this.height; },

	setScrollOffset: function (scrollX, scrollY, canScrollBeyondBounds) {
		if (!canScrollBeyondBounds) {
			scrollX = this.isZoomed ? scrollX.limit(this.getMinScrollX(), this.getMaxScrollX()) : 0;
			scrollY = this.isZoomed ? scrollY : scrollY.limit(this.getMinScrollY(), this.getMaxScrollY());
		}
		this.scrollX = scrollX;
		this.scrollY = scrollY;

		if (BVLayer.animationDuration === 0) { this.recenterBackgroundOffset(); }
		
		this.sections.setPosition(scrollX,scrollY);
		this.updateEdgeShadows();
		this.updateBackgroundPosition();
		this.updateHeaderPositions();
		this.updateSectionTitlePositions();
		this.updateDoodlePosition();
		this.updateContactsPosition();
		this.updateSectionTitlesHidden();
	},
	
	updateBackgroundPosition: function () {
		this.background.setPosition(this.scrollX + this.backgroundOffsetX, this.scrollY + this.backgroundOffsetY);
	},

	updateContactsPosition: function () {
		// this.topContactSet.setY(this.scrollY - 7);
		// this.bottomContactSet.setY(this.scrollY - this.sections.height + 22);
		// this.topContactSet.setHidden(this.isZoomed);
		// this.bottomContactSet.setHidden(this.isZoomed);
	},

	updateDoodlePosition: function () {
		this.doodle.updateWithStrip(this.sections.sublayers[0].strips.sublayers[0]);
	},
	
	updateEdgeShadows: function () {
		this.edgeShadows.topShadow.setY(this.isZoomed ? (this.edgeShadows.topShadow.height + 2) : this.scrollY);
		this.edgeShadows.bottomShadow.setHidden(this.isZoomed);
		this.edgeShadows.bottomShadow.setY(Math.min(-this.sections.height + this.scrollY, -this.height) + this.edgeShadows.bottomShadow.height);
	},
	
	setScrollY: function (scrollY) {
		this.setScrollOffset(this.scrollX, scrollY);
		
		BVLayer.animate(0, function () {
			var progress = (this.scrollY - this.getMinScrollY()) / (this.getMaxScrollY() - this.getMinScrollY());
			this.yScroller.setProgress(progress);
		}, this);
	},

	setScrollX: function (scrollX) {
		scrollX = scrollX.limit(this.getMinScrollX(), this.getMaxScrollX());
		var scrollY = this.scrollY + (scrollX - this.scrollX) * Math.tan(kSiteStripRotation);
		this.setScrollOffset(scrollX, scrollY);
		
		var progress = (this.scrollX - this.getMaxScrollX()) / (this.getMinScrollX() - this.getMaxScrollX());
		this.xScroller.setProgress(progress);
	},
	
	scrollSegmentToCenter: function (segment, animationDuration) {
		if (animationDuration === undefined) { animationDuration = 400; }
		var segmentX = this.getLocalPointForGlobalPoint(segment.getGlobalPosition()).x;
		var dx = 0.5 * this.width - (segmentX + 0.5 * segment.width);
	
		BVLayer.animate(animationDuration, function () {
			this.setScrollX(this.scrollX + dx);
		}, this);
		
		if (this.recenterBackgroundTimer) { clearTimeout(this.recenterBackgroundTimer); }
		this.recenterBackgroundTimer = (function () {
			this.recenterBackgroundOffset();
			this.updateBackgroundPosition();
		}).delay(animationDuration + 200, this);
	},
	
	recenterBackgroundOffset: function () {
		var dx = this.backgroundOffsetX + this.scrollX;
		dx -= Math.floor(dx / this.background.tileWidth) * this.background.tileWidth;
		this.backgroundOffsetX = dx - this.scrollX;
	
		var dy = this.backgroundOffsetY + this.scrollY;
		dy -= Math.floor(dy / this.background.tileHeight) * this.background.tileHeight;
		this.backgroundOffsetY = dy - this.scrollY;
	},
	
	scrollWithTouches: function (touches) {
		if (this.isZoomed) {
			this.setScrollX(this.scrollX  + touches.deltaTranslation.x);
			this.zoomSegmentAtCenter();
		}
		else {
			this.setScrollY(this.scrollY + touches.deltaTranslation.y);
		}
		touches.resetDeltaTranslation();
	},
	
	setNativeScrollbarHidden: function (hidden) {
		if (hidden === this.isNativeScrollbarHidden) { return; }
		this.isNativeScrollbarHidden = hidden;
		
		document.id(document.body).setStyle("overflowY", hidden ? "hidden" : "scroll");
	},
	

	//----------------------------------------------------------------------------------
	//
	//  momentum
	//
	
	stopMomentumScrolling: function () {
		if (this.momentumScrollInterval) { clearInterval(this.momentumScrollInterval); delete this.momentumScrollInterval; }
	},

	momentumScrollWithTouches: function (touches) {
		this.stopMomentumScrolling();

		var velocity = this.isZoomed ? touches.velocity.x : touches.velocity.y;
		var shouldMomentumScroll = Math.abs(velocity) > 40;
		if (!shouldMomentumScroll) { return; }
		
		this.momentumVelocity = velocity;
		this.momentumLastTimestamp = Date.now();
		this.momentumScrollInterval = this.updateMomentumScroll.periodical(20,this);
	},

	updateMomentumScroll: function () {
		var timestamp = Date.now();
		var dt = timestamp - this.momentumLastTimestamp;
		this.momentumLastTimestamp = timestamp;

		this.momentumVelocity *= Math.exp(-0.005 * dt);
		if (Math.abs(this.momentumVelocity) < 30) { this.stopMomentumScrolling(); return; }
		
		var dx = (this.momentumVelocity * dt / 1000).limit(-200,200);
		
		if (this.isZoomed) {
			this.setScrollX(this.scrollX + dx);
			this.zoomSegmentAtCenter();
		}
		else {
			this.setScrollY(this.scrollY + dx);
		}
	},
	

	//----------------------------------------------------------------------------------
	//
	//  zooming
	//
	
	setZoomedSegment: function (segment, shouldBeSlow, shouldScrollToCenter) {
		var oldSegment = this.zoomedSegment;
		if (oldSegment === segment) { return; }
		this.zoomedSegment = segment;
		
		var wasZoomed = !!oldSegment;
		var isZoomed = !!segment;
		
		if (oldSegment) { oldSegment.setHighlighted(false); }
		if (segment) { segment.setHighlighted(true); }

		if (segment && segment.strip.hidden) { segment.strip.setHidden(false); }
		if (segment && segment.page.hidden) { segment.page.setHidden(false); }
		
		if (wasZoomed && isZoomed) {
			if (shouldScrollToCenter) { segment.page.preloadContent(); }  // don't preload when scrolling through
			this.pageSet.setZoomedPage(segment.page);
			if (shouldScrollToCenter) { this.scrollSegmentToCenter(segment); }
			return;
		}
		
		// transitioning from zoomed to unzoomed, or vice versa
		
		this.isZoomTransitioning = true;
		var stripTopMargin = 23;

		if (this.zoomTransitionTimers) { this.zoomTransitionTimers.each(clearTimeout); }
		this.zoomTransitionTimers = [];

		var delay = function (duration, fn, bind) {
			if (BVLayer.animationsEnabled) { bind.zoomTransitionTimers.push(fn.delay(duration,bind)); }
			else { fn.call(bind); }
		};
		
		this.zoomDuration = kSiteZoomDuration * (shouldBeSlow ? 5 : 1);
		this.unzoomDuration = kSiteUnzoomDuration * (shouldBeSlow ? 5 : 1);
		
		if (!wasZoomed && isZoomed) {  // zooming
			segment.page.preloadContent();
		
			this.isZoomed = true;
			this.edgeShadows.headerTitleShadow.setHidden(false);

			this.homeButton.setHidden(false);
			this.xScroller.setHidden(false);

			BVLayer.animate(this.zoomDuration, function () {
				this.updateSectionPositionsPreservingPositionOfSegment(segment);
			}, this);
			
			this.yScroller.setHidden(true);
			this.setNativeScrollbarHidden(false);

			this.scrollSegmentToCenter(segment, this.zoomDuration);
			BVLayer.animate(this.zoomDuration, function () {
				var segmentY = this.sections.getLocalPointForGlobalPoint(segment.getGlobalPosition()).y;
				this.setScrollY(-segmentY - this.xScroller.height - stripTopMargin);
				this.doodle.setOpacity(0);
				this.setSectionTitlesOpacity(0);
			}, this);

			this.pageSet.setZoomedPage(segment.page);
			
			delay(this.zoomDuration, function () {
				this.isZoomTransitioning = false;
				this.setStripHeadersHidden(false);
			}, this);
		}
		else if (wasZoomed && !isZoomed) {  // unzooming
			this.isZoomed = false;

			this.homeButton.setHidden(true);
			this.setStripHeadersHidden(true);
			this.edgeShadows.headerTitleShadow.setHidden(true);
			this.xScroller.setHidden(true);

			BVLayer.animate(this.unzoomDuration, function () {
				this.updateSectionPositionsPreservingPositionOfSegment(oldSegment);
			}, this);

			this.yScroller.setHidden(false);
			this.setNativeScrollbarHidden(true);

			BVLayer.animate(this.unzoomDuration, function () {
				this.setScrollY(this.scrollY - 180);
				this.doodle.setOpacity(1);
				this.setSectionTitlesOpacity(1);
			}, this);

			this.setHashForSegment(null);
			this.pageSet.setZoomedPage(null);

			delay(this.unzoomDuration, function () {
				this.isZoomTransitioning = false;
			}, this);
		}
	},

	zoomSegmentAtCenter: function () {
		var segment = this.getSegmentNearX(0.5 * this.width);
		if (!segment.isHeader) { this.setZoomedSegment(segment); }
	},


	//----------------------------------------------------------------------------------
	//
	//  touches
	//
	
	touchDidGoDown: function (touches)  {
		this.isScrolling = false;
		this.stopMomentumScrolling();
	},

	touchDidMove: function (touches)  {
		if (this.isScrolling) { this.scrollWithTouches(touches); return; }
		if (Math.abs(touches.translation.x) > 4 || Math.abs(touches.translation.y) > 4) {
			this.isScrolling = true;
			touches.resetDeltaTranslation();
		}
	},
	
	touchDidGoUp: function (touches) {
		if (this.isScrolling) {
			this.isScrolling = false;
			this.momentumScrollWithTouches(touches);
		}
		else if (touches.wasDoubleTap) {
			this.setZoomedSegment(null);
		}
	},


	//----------------------------------------------------------------------------------
	//
	//  explode
	//
	
	explode: function () {
		var lastTimestamp = Date.now();
		var radius = 0;
		var frequency = 1/200;
		
		(function () {
			var now = Date.now();
			var dt = now - lastTimestamp;
			lastTimestamp = now;
			
			var dPhase = frequency * Math.PI * 2 * dt;
			
			var explodeLayer = function (layer) {
				if (layer.accelerated) {
					if (layer.explodePhase === undefined) { layer.explodePhase = Math.random() * Math.PI * 2; }
					layer.setPosition(layer.x + radius * Math.cos(layer.explodePhase), layer.y + radius * Math.sin(layer.explodePhase));
					layer.explodePhase += dPhase;
				}
				layer.sublayers.each(explodeLayer);
			};
			
			explodeLayer(this);

			radius += dt / 100;
			radius = Math.min(radius, 400);
			frequency *= Math.pow(0.99, dt/50);
			frequency = Math.max(frequency, 1/1000);
			
		}).periodical(50,this);
	}

});



//====================================================================================
//
//  SiteBackground
//

var SiteBackground = new Class({

	Extends: BVLayer,

	initialize: function (superlayer, segmentElement) {
		this.parent(superlayer);
		this.site = this.getAncestorWithClass(Site);

		this.setHasElement(false);

		this.tileWidth = 622;
		this.tileHeight = 400;
		
		// todo, should update when site size changes
		
		var offscreenTileCount = 2;
		var rowCount = Math.ceil(this.site.height / this.tileHeight) + 2 * offscreenTileCount;
		var columnCount = Math.ceil(this.site.width / this.tileWidth) + 2 * offscreenTileCount;
		
		for (var row = 0; row < rowCount; row++) {
			for (var column = 0; column < columnCount; column++){
				var image = new BVLayer(this);
				image.setAccelerated(true);
				image.setContentsURLAndSize("Images/Background.jpg", this.tileWidth, this.tileHeight);
				image.setPosition((column - offscreenTileCount) * this.tileWidth, -(row - offscreenTileCount) * this.tileHeight);
			}
		}
	}
	
});



//====================================================================================
//
//  SiteHomeButton
//

var SiteHomeButton = new Class({

	Extends: BVLayer,

	initialize: function (superlayer, segmentElement) {
		this.parent(superlayer);
		this.site = this.getAncestorWithClass(Site);
		
		this.setAccelerated(true);
		this.setHoverable(true);
		this.setTouchable(true);
		this.element.setStyle("cursor","pointer");

		this.setHidden(true);
		this.setSize(60,70);

		this.image = new BVLayer(this);
		this.image.setPosition(6,-5);
		this.image.setContentsURLAndSize("Images/ButtonHome.png", 23, 38);
		
		this.overlay = new BVLayer(this);
		this.overlay.setPosition(this.image.getPosition());
		this.overlay.setSize(this.image.getSize());
	},
	
	mouseEntered: function () {
		if (this.touches) { return; }
		this.overlay.setBackgroundColor("rgba(0,0,0,0.3)");
	},
	
	mouseExited: function () {
		if (this.touches) { return; }
		this.overlay.setBackgroundColor(null);
	},

	touchDidGoDown: function (touches) {
		this.overlay.setBackgroundColor("rgba(0,0,0,0.5)");
	},

	touchDidMove: function (touches) {
	},
		
	touchDidGoUp: function (touches) {
		this.overlay.setBackgroundColor(null);
		if (this.containsGlobalPoint(touches.globalPoint)) {
			var shouldBeSlow = touches.event.shift;
			this.site.setZoomedSegment(null, shouldBeSlow);
		}
	}
	
});


//====================================================================================
//
//  SiteDoodle
//

var SiteDoodle = new Class({

	Extends: BVLayer,

	initialize: function (superlayer) {
		this.parent(superlayer);
		this.site = this.getAncestorWithClass(Site);
		this.setHasElement(false);

		this.leftDoodle = new BVLayer(this);
		this.leftDoodle.setContentsURLAndSize("Images/DoodleLeft.png", 86, 170);
		this.leftDoodle.setAccelerated(true);

		this.rightDoodle = new BVLayer(this);
		this.rightDoodle.setContentsURLAndSize("Images/DoodleRight.png", 67, 184);
		this.rightDoodle.setAccelerated(true);
	},
	
	updateWithStrip: function (strip) {
		var firstSegment = strip.segments.sublayers[1];
		var topLeft = firstSegment.getGlobalPosition();
		this.leftDoodle.setPosition(topLeft.x - 16, topLeft.y + this.leftDoodle.height - 6);
		
		var lastSegment = strip.segments.sublayers[strip.segments.sublayers.length - 1];
		var topRight = lastSegment.getGlobalPointForLocalPoint(lastSegment.width,0);
		this.rightDoodle.setPosition(topRight.x - this.rightDoodle.width + 18, topRight.y + this.rightDoodle.height - 7);
	},
	
	setOpacity: function (opacity) {
		this.opacity = opacity;
		this.leftDoodle.setOpacity(opacity);
		this.rightDoodle.setOpacity(opacity);
	}

});




//====================================================================================

})();

