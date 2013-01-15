//
//  Root.js
//  Home2011
//
//  Created by Bret Victor on 3/2/11.
//  (c) 2011 Bret Victor.  MIT open-source license.
//


(function(){


//====================================================================================
//
//  domready
//

window.addEvent('domready', function () {
	var isWebKit = navigator.userAgent.toLowerCase().match(/applewebkit/);
	var isSupported = isWebKit || Browser.safari || Browser.firefox || Browser.chrome || Browser.opera || Browser.ie9 || Browser.ie10;

	if (isSupported) {
		new Root();
	}
	else {
		var body = document.id(document.body);
		body.style.background = "white";
		body.style.color = "#111";
		body.style.overflow = "auto";
		body.style.overflowX = "auto";
		body.style.overflowY = "auto";

		document.id("sections").style.display = "block";
	}
});


//====================================================================================
//
//  Root
//

var Root = this.Root = new Class({

	Extends: BVLayer,

	initialize: function () {
		this.parent(null);
		Root.root = this;
		
		this.updateSize();
		
		this.contentContainer = new ContentContainer(this);
		this.site = new Site(this);
		
		document.id(document.body).grab(this.element, "bottom");

		window.addEvent("resize", this.windowWasResized.bind(this));
	},
	
	destroy: function () {
		this.contentContainer.setURL(null);  // kill the iframe
	
		window.removeEvents();
		document.body.removeEvents();

		this.element.destroy();
		this.element = null;
		
		Root.root = null;
	},
	
	updateSize: function () {
		var windowSize = window.getSize();
		this.setSize(Math.max(600, windowSize.x), windowSize.y);
	},
	
	windowWasResized: function () {
		this.updateSize();
		this.site.rootWasResized();
	}
	
});


//====================================================================================

})();


