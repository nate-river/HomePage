//
//  SiteSection.js
//  Home2011
//
//  Created by Bret Victor on 3/25/11.
//  (c) 2011 Bret Victor.  MIT open-source license.

//  Classes:
//    SiteSection
//    SiteSectionTitleSet

(function(){


//====================================================================================
//
//  SiteSection
//

var SiteSection = this.SiteSection = new Class({

	Extends: BVLayer,

	initialize: function (superlayer, sectionElement) {
		this.parent(superlayer);
		this.site = this.getAncestorWithClass(Site);
		
		this.setHasElement(false);

		this.properties = this.site.mergePropertiesFromElement( {}, sectionElement);

		this.stripXMargin = 60;
		this.rowWidth = this.site.width - 2 * this.stripXMargin + 10;
		this.segmentUnscaledWidth = 218;
		this.segmentUnscaledHeight = this.properties.filmEdges ? 235 : 204;
		
		this.titleHeight = this.properties.titleHeight || 0;

		this.setWidth(this.site.width);
		
		this.strips = new BVLayer(this);
		this.strips.setHasElement(false);
		this.addStrips(sectionElement);
		this.updateStripPositions();

		this.titleSet = new SiteSectionTitleSet(this.site.sectionTitles, this, sectionElement);
	},

	setTitleOpacity: function (opacity) { this.titleSet.setOpacity(opacity); },
	updateTitlePosition: function () { this.titleSet.updatePosition(); },
	showTitlesThatHaveScrolledOffscreen: function () { this.titleSet.showTitlesThatHaveScrolledOffscreen(); },
	
	addStrips: function (sectionElement) {
		var subsectionTitleElements = sectionElement.getChildren("h2");
		var subsectionElements = sectionElement.getChildren("ul");

		// group segments into strips, and strips into rows
		
		var rowWidth = 0;
		var targetRowWidth = this.rowWidth;
		
		var rowInfos = [];
		
		for (var i = 0; i < subsectionElements.length; i++) {
			var subsectionTitle = subsectionTitleElements[i].get("html");
			var segmentElements = subsectionElements[i].getChildren("li");
			
			var stripProperties = this.site.mergePropertiesFromElement(this.properties, subsectionElements[i]);
			var stripScale = stripProperties.scale;
			var segmentWidth = Math.round(this.segmentUnscaledWidth * stripScale);
			
			if (!stripProperties.noStretch) {  // stretch grid to extend across entire row
				var columnCount = Math.round(targetRowWidth / segmentWidth);
				segmentWidth = Math.floor(targetRowWidth / columnCount);
				stripScale = segmentWidth / this.segmentUnscaledWidth;
			}
		
			var segmentCount = segmentElements.length;
			var segmentIndex = 0;
			
			while (segmentIndex < segmentCount) {
				var stripSegmentCount = 0;
				var stripWidth = 0;

				var addSegmentsToRow = (function () {
					stripSegmentCount = 0;
					stripWidth = 0;
					for (var k = segmentIndex; k < segmentCount; k++) {
						var segmentProperties = this.site.mergePropertiesFromElement(stripProperties, segmentElements[k]);

						var kWidth = segmentWidth;
						if (segmentProperties.widthScale) { kWidth = Math.round(kWidth * segmentProperties.widthScale); }
						if (k == 0) { kWidth += segmentWidth; }  // title
						
						if (rowWidth + stripWidth + kWidth > targetRowWidth) { break; }
						
						stripSegmentCount++;
						stripWidth += kWidth;
					}
				}).bind(this);
				
				if (stripProperties.rowBreak) {	rowWidth = 0; }
				addSegmentsToRow();  // try adding segments to the row-in-progress

				if (stripSegmentCount == 0) {  // if we couldn't fit any more segments on this row, start a new row
					rowWidth = 0;
					addSegmentsToRow();
				}
				
				var stripInfo = {
					segmentElements: segmentElements.slice(segmentIndex, segmentIndex + stripSegmentCount),
					properties: stripProperties,
					isFirstInSubsection: (segmentIndex == 0),
					isLastInSubsection: (segmentIndex + stripSegmentCount >= segmentCount),
					isFirstInRow: (rowWidth == 0),
					title: (segmentIndex == 0) ? subsectionTitle : null,
					scale: stripScale,
					rowWidth: stripWidth + rowWidth
				};
				
				if (stripInfo.isFirstInRow) { rowInfos.push( [] ); }
				rowInfos[rowInfos.length - 1].push(stripInfo);
				
				rowWidth += stripWidth;
				segmentIndex += stripSegmentCount;
			}
		}
		
		// space out strips to fill row, and create strip layers
		
		var firstStripInSubsection = null;
		var subsectionWidth = 0;
		
		rowInfos.each( function (stripInfos, rowIndex) {
			var rowWidth = stripInfos[stripInfos.length - 1].rowWidth;
			var excessWidth = targetRowWidth - rowWidth;
			var stripPaddingLeft = (stripInfos.length > 1) ? Math.floor(excessWidth / (stripInfos.length - 1)) : 0;

			var isLastRow = (rowIndex == rowInfos.length - 1);
			if (isLastRow) { stripPaddingLeft = 0; }
			
			stripInfos.each( function (stripInfo, stripIndex) {
				var isFirstInRow = (stripIndex == 0);
				var isLastInRow = (stripIndex == stripInfos.length - 1);
			
				var strip = new SiteStrip(this.strips, stripInfo);
				var shouldPad = (!isFirstInRow && !(isLastInRow && stripInfo.isLastInSubsection));
				if (shouldPad) { strip.paddingLeft = stripPaddingLeft; }
				
				subsectionWidth += strip.width;
				if (stripInfo.isFirstInSubsection) { firstStripInSubsection = strip; }
				if (stripInfo.isLastInSubsection) {
					firstStripInSubsection.subsectionWidth = subsectionWidth;
					subsectionWidth = 0;
				}
			}, this);
		}, this);
	},
	
	updateStripPositionsZoomed: function () {
		var x = 30;
		var y = 0;
		var rotation = kSiteStripRotation;
		
		this.strips.each( function (strip) {
			strip.setZoomed(true);
			strip.setPosition(x,y);

			x = Math.round(x + strip.width * Math.cos(rotation));
			y = Math.round(y + strip.width * Math.sin(rotation));
		}, this);
		
		this.setSize(x, -y);
	},
	
	updateStripPositionsUnzoomed: function () {
		var rowY = -this.titleHeight;
		var lastStrip = null;
		var lastDy = 0;
		var rowHeight = 0;
		
		this.strips.each( function (strip, stripIndex) {
			strip.setZoomed(false);
			
			var offsetY = strip.header ? -8 : 0;
			rowY += offsetY;
			
			if (strip.isFirstInRow) {
				if (this.properties.centered) {
					strip.setPositionOfLocalPoint(0.5 * this.site.width, rowY, 0.5 * (strip.width + strip.segments.sublayers[0].width), 0);
				}
				else {
					strip.setPosition(this.stripXMargin, rowY);
				}
				rowHeight = strip.height;
			}
			else {
				rowY += lastDy;
				rowHeight = Math.max(strip.height, rowHeight);
				var topPadding = rowHeight - strip.height;
				strip.setX(Math.round(lastStrip.x + (strip.paddingLeft + lastStrip.width) * Math.cos(kSiteStripRotation)));
				strip.setY(Math.round(offsetY + lastStrip.y - topPadding + (strip.paddingLeft + lastStrip.width) * Math.sin(kSiteStripRotation)));
			}
			
			lastDy = rowHeight - 4;
			rowY -= lastDy;
			lastStrip = strip;
		}, this);
		
		this.setSize(this.site.width, -rowY);
	},
	
	updateStripPositions: function () {
		if (this.site.isZoomed) { this.updateStripPositionsZoomed(); }
		else { this.updateStripPositionsUnzoomed(); }
	},
	
	updateHeaderPositions: function () {
		this.strips.each( function (strip) { strip.updateHeaderPosition(); });
	}

});
	


//====================================================================================
//
//  SiteSectionTitleSet
//

var SiteSectionTitleSet = new Class({

	Extends: BVLayer,

	initialize: function (superlayer, section, sectionElement) {
		this.parent(superlayer);
		this.site = this.getAncestorWithClass(Site);
		this.section = section;
		this.setHasElement(false);

		this.isInZoomedPosition = false;

		this.firstSegment = this.section.strips.sublayers[0].segments.sublayers[1];
		var firstSegmentPosition = this.firstSegment.getGlobalPosition();

		var titleElement = sectionElement.getChildren("h1")[0];
		var subtitleElement = sectionElement.getChildren("h3")[0];
		
		this.titleWidth = (section.properties.titleWidth || 750);
		this.subtitleWidth = 750;
		this.subtitleY = -46;

		this.titleString = titleElement.get("html");
		this.subtitleString = subtitleElement ? subtitleElement.get("html") : "";
		if (section.properties.magicSubtitle) { this.subtitleString = "<span>" + this.subtitleString + "</span>"; }
		
		this.title = new BVText(this);
		this.title.setAccelerated(true);
		this.title.setTextClass("sectionTitle");
		this.title.setTextStyle("width", this.titleWidth);
		this.title.setHTML(this.titleString);
		this.title.setRotation(kSiteSectionTitleRotation);
		this.title.setPositionOfLocalPoint(0.5 * this.site.width, 0, 0.5 * this.titleWidth, 0);
		var titlePosition = this.title.getGlobalPosition();
		this.title.segmentOffsetUnzoomed = { x: titlePosition.x - firstSegmentPosition.x, y: titlePosition.y - firstSegmentPosition.y };
		this.title.segmentOffsetZoomed = { x: -2, y: 42 };
		
		this.subtitle = new BVText(this);
    	this.subtitle.setAccelerated(true);
    	this.subtitle.setTextClass("sectionSubtitle");
		this.subtitle.setTextStyle("width", this.subtitleWidth);
    	this.subtitle.setHTML(this.subtitleString);
    	this.subtitle.setRotation(this.title.rotation);
		this.subtitle.setPositionOfLocalPoint(0.5 * this.site.width, 0, 0.5 * this.subtitleWidth, -this.subtitleY);
		var subtitlePosition = this.subtitle.getGlobalPosition();
		this.subtitle.segmentOffsetUnzoomed = { x:subtitlePosition.x - firstSegmentPosition.x, y:subtitlePosition.y - firstSegmentPosition.y };
		this.subtitle.segmentOffsetZoomed =
			{ x: this.subtitle.segmentOffsetUnzoomed.x + this.title.segmentOffsetZoomed.x - this.title.segmentOffsetUnzoomed.x,
			  y: this.subtitle.segmentOffsetUnzoomed.y + this.title.segmentOffsetZoomed.y - this.title.segmentOffsetUnzoomed.y };

		if (section.properties.magicSubtitle) {
			this.magicSubtitleSpan = this.subtitle.textElement.getElementsByTagName("span")[0];
			this.addMagicToSubtitle();
		}		
	},

	updatePosition: function () {
		if (!this.site.isZoomed) { this.isInZoomedPosition = false; }
		
		var titleSegmentOffset = this.isInZoomedPosition ? this.title.segmentOffsetZoomed : this.title.segmentOffsetUnzoomed;
		var subtitleSegmentOffset = this.isInZoomedPosition ? this.subtitle.segmentOffsetZoomed : this.subtitle.segmentOffsetUnzoomed;
	
		var firstSegmentPosition = this.firstSegment.getGlobalPosition();
		this.title.setGlobalPosition(firstSegmentPosition.x + titleSegmentOffset.x, firstSegmentPosition.y + titleSegmentOffset.y);
		this.subtitle.setGlobalPosition(firstSegmentPosition.x + subtitleSegmentOffset.x, firstSegmentPosition.y + subtitleSegmentOffset.y);
//		console.log(this.title.textElement.offsetWidth);
	},
	
	setOpacity: function (opacity) {
		this.opacity = opacity;
		this.title.setOpacity(opacity);
		this.subtitle.setOpacity(opacity);
	},

	showTitlesThatHaveScrolledOffscreen: function () {
		if (!this.site.isZoomed || this.title.opacity == 1 || this.section.properties.hideSectionTitle) { return; }

		var firstSegmentPosition = this.firstSegment.getGlobalPosition();
		var zoomedTitleLeftX = firstSegmentPosition.x + this.title.segmentOffsetZoomed.x;
		if (zoomedTitleLeftX + this.titleWidth < 0 || zoomedTitleLeftX > this.site.width) {
			this.title.setOpacity(1);
			this.isInZoomedPosition = true;
		}
	},
	
	addMagicToSubtitle: function () {
		this.magicSubtitleSpan.setStyle("cursor", "pointer");
		this.magicSubtitleSpan.setStyle("pointerEvents", "auto");
		this.magicSubtitleSpan.addEvent("click", this.magicSubtitleWasClicked.bind(this));
	},
	
	magicSubtitleWasClicked: function () {
		if (!this.magicSubtitleIndex) { this.magicSubtitleIndex = 0; }
		var titles = this.getMagicSubtitles();
		if (this.magicSubtitleIndex >= titles.length) { return; }
		
		var newSubtitle = titles[this.magicSubtitleIndex];
		this.magicSubtitleSpan.set("html", newSubtitle);
		this.magicSubtitleIndex++;
		
		if (this.magicSubtitleIndex >= titles.length) { this.site.explode(); }
	},

	getMagicSubtitles: function () {
		if (!this.magicSubtitles) {
			this.magicSubtitles = this.getMagicCode().split("OO").map( function (code) {
				return code.match(/\w\w/g).map(function (bb) { return String.fromCharCode(parseInt("0x"+bb)^0xbb); }).join("");
			});
		}
		return this.magicSubtitles;
	},
	
	getMagicCode: function () {
		return "d0dad6d2d0dac1de9bdfdec8d2dcd5dec9OOd9dac9d9ded8ced2d5dc9bc2d4cec99bc8dad8c9dedf" +
		"9bd8d4ccOOd8d4d5dcded5d2cfdad7d7c29bced5daddddd2d7d2dacfdedfOOd6dac8cfdec99bdfde" +
		"d7cec8d2d4d5d2c8cfOOd8d4d5c8ced6d6dacfde9bced5cbc9d4dddec8c8d2d4d5dad7OOd3dedadf" +
		"9bd4dd9bcfd3de9bd2d8d4d5d4d8d7dac8c8OOd8d4dcd5d2cfd2cdde9bcfc9d2cfd4d5deOOcbd7da" +
		"cec8d2d9d7c29bdfded5d2dad9d7deOOcddad8d8d2d5dacfdedf9bdadcdad2d5c8cf9bd3d4cbdeOO" +
		"d6dac3d2d6d2c1d2d5dc9bcfd3de9bd6d2d5d2d6daOOddc9dede9bc8cbd2c9d2cf979bd4c99bdacf" +
		"9bd7dedac8cf9bd3dedacdd2d7c29bdfd2c8d8d4ced5cfdedfOOd5d4cf9bdfdedddedacfd2d5dc9b" +
		"cfd3de9bcbcec9cbd4c8de979bd9cecf9bcbcecfcfd2d5dc9bcecb9bda9bdcd4d4df9bddd2dcd3cf" +
		"OOccd4d59ccf9bd7decf9bc9dedad7d2cfc29bc8cfdad5df9bd2d59bcfd3de9bccdac2OOcacedad5" +
		"cfd2cfc29bd4cddec99bcbdec9c8d4d5dad7d2cfc2OOcfd4d49bd6dad5c29bcfc9d2d8d0c8979bd5" +
		"d4cf9bded5d4cedcd39bdfd4dcOOd3dac89bc8d49bd6ced8d39bcfd49bdcd2cddeOOc9ced2d5d2d5" +
		"dc9bc2d4ce9bddd4c99bdad7d79bd4cfd3dec9c8OOd6cecfcedad7d7c296dac8c8cec9dedf9bd3de" +
		"dac9cfd9c9dedad0OOd6dadfde9bc2d4ce9bd8d7d2d8d0OOd6dadfde9bc2d4ce9bd8d7d2d8d09bda" +
		"dcdad2d5OOd4d0dac2979bded5d4cedcd3979bc8cfd4cb9bd8d7d2d8d0d2d5dcOOd5d4979bc9deda" +
		"d7d7c2OOc8cfd4cbOOcbd7dedac8deOOc8cfd4cbOOcbd7dedac8deOOc8cfd4cbOOd4d39bdcd4df";
	}
	

});


//====================================================================================

})();
