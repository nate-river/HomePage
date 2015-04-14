//
//  SiteContactSet.js
//  Home2011
//
//  Created by Bret Victor on 3/25/11.
//  (c) 2011 Bret Victor.  MIT open-source license.

//  Classes:
//    SiteContactSet
//    SiteContact

(function(){


//====================================================================================
//
//  SiteContactSet
//

var SiteContactSet = this.SiteContactSet = new Class({

	Extends: BVLayer,

	initialize: function (superlayer, topOrBottom) {
		this.parent(superlayer);
		this.site = this.getAncestorWithClass(Site);

		this.topOrBottom = topOrBottom;
		
		this.setAccelerated(true);
		this.setContentsURLAndSize("Images/Contacts" + (this.topOrBottom == "top" ? "Top" : "Bottom") + ".png", 61, 16);
		this.setX(this.site.width - this.width - 23);
		
		var contactWidths = [ 14, 24, 23 ];
		var x = 0;

		var liElements = document.id("contacts").getElement("ul").getChildren("li");
		liElements.each( function (element) {
			var contact = new SiteContact(this);
			contact.setX(x);
			contact.setSize(contactWidths[0], this.height);
			contact.setContactElement(element);
			x += contactWidths.shift();
		}, this);
	}

});


//====================================================================================
//
//  SiteContact
//

var SiteContact = this.SiteContact = new Class({

	Extends: BVLayer,

	initialize: function (superlayer) {
		this.parent(superlayer);
		this.contactSet = this.getAncestorWithClass(SiteContactSet);
		
		this.setTouchable(true);
		this.setHoverable(true);
		this.element.setStyle("cursor", "pointer");
	},
	
	setContactElement: function (element) {
		this.url = element.getElement("a").get("href");
		this.url = this.url.replace("-at-", "@");
		this.url = this.url.replace("-dot-", ".");
	
		var captionWidth = 140;
		var captionY = (this.contactSet.topOrBottom == "top") ? (-this.height - 3) : 19;
		
		this.caption = new BVText(this);
		this.caption.setHidden(true);
		this.caption.setTextClass("contactCaption");
		this.caption.setTextStyle("width", captionWidth);
		this.caption.setHTML(element.getElement("a").get("html"));
		this.caption.setPositionOfLocalPoint(this.contactSet.width - this.x, captionY, captionWidth, 0);
	},

	mouseEntered: function () {
		if (this.touches) { return; }
		this.setBackgroundColor("rgba(0,0,0,0.3)");
		this.caption.setHidden(false);
	},
	
	mouseExited: function () {
		if (this.touches) { return; }
		this.setBackgroundColor(null);
		this.caption.setHidden(true);
	},

	touchDidGoDown: function (touches) {
		this.setBackgroundColor("rgba(0,0,0,0.5)");
	},

	touchDidMove: function (touches) {
	},
		
	touchDidGoUp: function (touches) {
		this.setBackgroundColor(null);
		this.caption.setHidden(true);
		if (this.containsGlobalPoint(touches.globalPoint)) {
			window.location = this.url;
		}
	}
});



//====================================================================================

})();
