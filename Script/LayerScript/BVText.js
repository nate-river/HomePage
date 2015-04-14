//
//  BVText.js
//  LayerScript
//
//  Created by Bret Victor on 2/23/11.
//  (c) 2011 Bret Victor.  MIT open-source license.
//


(function(){


//====================================================================================
//
//  BVText
//

BVText = new Class({

	Extends: BVLayer,

	initialize: function (superlayer) {
		this.parent(superlayer);
		
		this.html = "";
		this.textClass = "";
		this.textElement = new Element('div');
		this.element.grab(this.textElement, "top");
	},
	
	setHTML: function (html) {
		if (html === this.html) { return; }
		this.html = html;
		this.textElement.set("html", html);
	},

	setTextClass: function (className) {
		if (className === this.textClass) { return; }
		this.textClass = className;
		this.textElement.className = className;
	},

	setTextStyle: function (property, value) {
		this.textElement.setStyle(property, value);
	},
	
	setTextStyles: function (styles) {
		this.textElement.setStyles(styles);
	}
	
});



//====================================================================================

})();
