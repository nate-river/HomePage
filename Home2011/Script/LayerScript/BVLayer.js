//
//  BVLayer.js
//  LayerScript
//
//  Created by Bret Victor on 2/23/11.
//  (c) 2011 Bret Victor.  MIT open-source license.
//


(function(){


var gDisableTransitions = false;


//====================================================================================
//
//  BVLayer
//

var BVLayer = this.BVLayer = new Class({

	initialize: function (superlayer) {
		if (!quirks) { BVLayer._initializeQuirks(); }
		
		this.root = superlayer ? superlayer.root : this;
		this.superlayer = superlayer;
		this.sublayers = [];
		
		this._offsetX = 0;  // position relative to ancestor with element
		this._offsetY = 0;
		
		this.x = 0;
		this.y = 0;
		this.width = 0;
		this.height = 0;
		this.zPosition = 0;
		
		this.accelerated = false;
		this.touchable = false;
		this.hoverable = false;
		this.hidden = false;
		this.invisible = false;
		this.masksToBounds = false;
		this.contentsURL = null;
		this.backgroundColor = null;
		this.cornerRadius = 0;
		
		this.opacity = 1;
		this.scale = 1;
		this.rotation = 0;
		
		this.globalID = null;
		this._animationDuration = 0;
		
		if (superlayer) { superlayer.sublayers.push(this); }
		this.setHasElement(true);
	},


	//----------------------------------------------------------------------------------
	//
	//  element
	//
	
	getAncestorWithElement: function () {
		for (var layer = this.superlayer; !!layer; layer = layer.superlayer) {
			if (layer.element) { return layer; }
		}
		return null;
	},
	
	setHasElement: function (hasElement) {
		if (hasElement == this.hasElement) { return; }
		this.hasElement = hasElement;
		
		if (hasElement) {
			this.element = new Element('div', BVLayer._defaultProperties);
			var ancestor = this.getAncestorWithElement();
			if (ancestor) { ancestor.element.grab(this.element); }
		}
		else {
			this.element.destroy();
			this.element = null;
		}
	},


	//----------------------------------------------------------------------------------
	//
	//  layer tree
	//
	
	removeFromSuperlayer: function () {
		if (!this.superlayer) { return; }
		
		this.setGlobalID(null);
		this.superlayer.sublayers.erase(this);
		this.superlayer = null;
		this.root = null;
		if (this.element) { this.element.destroy(); }
	},
	
	getAncestorWithClass: function (cls) {
		var superlayer = this.superlayer;
		if (!superlayer) { return null; }
		if (instanceOf(superlayer, cls)) { return superlayer; }
		return superlayer.getAncestorWithClass(cls);
	},
	
	each: function (fn, bind) {
		this.sublayers.each(fn, bind);
	},


	//----------------------------------------------------------------------------------
	//
	//  animation
	//

	_setAnimatableProperty: function (name, value, suffix) {
		suffix = suffix || "";
		if (quirks.areTransitionsAvailable) {
			var animationDuration = BVLayer.animationsEnabled ? BVLayer.animationDuration : 0;
			if (this._animationDuration !== animationDuration) {
				this._animationDuration = animationDuration;
				var durationStyleValue = "" + (0.001 * animationDuration) + "s";
				this.element.style[quirks.stylePrefix + "TransitionDuration"] = durationStyleValue;
			}
			this.element.style[name] = "" + value + suffix;
		}
		else {
			var fxProperty = "_" + name + "Fx";
			if (BVLayer.animationDuration && BVLayer.animationsEnabled) {
				if (this[fxProperty]) { this[fxProperty].cancel(); }
				this[fxProperty] = new Fx.Tween(this.element,
					{ property:name, duration:BVLayer.animationDuration, transition:"cubic:in:out" });
				this[fxProperty].start(value);
			}
			else {
				if (this[fxProperty]) { this[fxProperty].cancel(); delete this[fxProperty]; }
				this.element.style[name] = "" + value + suffix;
			}
		}
	},
		
	
	//----------------------------------------------------------------------------------
	//
	//  position
	//
	
	setX: function (x) { this.setPosition(x, this.y); },
	setY: function (y) { this.setPosition(this.x, y); },

	getPosition: function () { return { x:this.x, y:this.y }; },
	setPosition: function (x,y) {
		if (y === undefined) { y = x.y; x = x.x; }
		x = Math.round(x);  y = Math.round(y);

		if (x === this.x && y === this.y) { return; }
		this.x = x;  this.y = y;
		
		var superlayer = this.superlayer;
		if (!superlayer || superlayer.hasElement) {
			this._setOffset(x, y);
		}
		else {
			this._setOffset(x + superlayer._offsetX, y + superlayer._offsetY);
		}
	},

	_setOffset: function (offsetX, offsetY) {
		if (this._offsetX === offsetX && this._offsetY === offsetY) { return; }
		this._offsetX = offsetX;  this._offsetY = offsetY;

		if (this.hasElement) {
			this._updateElementPosition();
		}
		else {
			this.sublayers.each( function (sublayer) {
				sublayer._setOffset(sublayer.x + offsetX, sublayer.y + offsetY);
			});
		}
	},

	_updateElementPosition: function () {
		if (quirks.isAccelerationAvailable && this.accelerated) {
			this._updateTransformProperty();
		}
		else {
			this._setAnimatableProperty("left", this._offsetX, "px");
			this._setAnimatableProperty("top", -this._offsetY, "px");
		}
	},


	//----------------------------------------------------------------------------------
	//
	//  size
	//

	setWidth: function (w) { this._setSizeProperty("width", w); },
	setHeight: function (h) { this._setSizeProperty("height", h); },
	
	getSize: function () { return { width:this.width, height:this.height }; },
	setSize: function (w,h) {
		if (h === undefined) { h = w.height; w = w.width; }
		this.setWidth(w); this.setHeight(h);
	},
	
	_setSizeProperty: function (name, value) {
		value = Math.round(value);
		if (this[name] === value) { return; }
		this[name] = value;
		if (this.hasElement) { this.element.style[name] = "" + value + "px"; }
	},
	
	
	//----------------------------------------------------------------------------------
	//
	//  transform
	//

	setScale: function (scale) {
		if (this.scale === scale) { return; }
		this.scale = scale;
		this._updateTransformProperty();
	},

	setRotation: function (rotation) {
		if (this.rotation === rotation) { return; }
		this.rotation = rotation;
		this._updateTransformProperty();
	},
	
	_updateTransformProperty: function () {
		if (!this.hasElement) { return; }
		
		var translation = "";
		if (quirks.isAccelerationAvailable && this.accelerated) {
			translation = quirks.isTransform3DAvailable ? 
				"translate3d(" + this._offsetX + "px," + (-this._offsetY) + "px, 0) " :
				"translate("   + this._offsetX + "px," + (-this._offsetY) + "px) ";
			
			var animationDuration = BVLayer.animationsEnabled ? BVLayer.animationDuration : 0;
			if (this._animationDuration !== animationDuration) {
				this._animationDuration = animationDuration;
				var durationStyleValue = "" + (0.001 * animationDuration) + "s";
				this.element.style[quirks.stylePrefix + "TransitionDuration"] = durationStyleValue;
			}
		}
	
		var linear = "scale(" + this.scale + ") rotate(" + (-this.rotation) + "rad)";
		var styleValue = translation + linear;
		
		this.element.style[quirks.stylePrefix + "Transform"] = styleValue;
	},
		

	//----------------------------------------------------------------------------------
	//
	//  contents
	//

	setContentsURL: function (contentsURL) {
		if (this.contentsURL === contentsURL) { return; }
		this.contentsURL = contentsURL;
		this.element.style.backgroundImage = contentsURL ? ("url(" + contentsURL + ")") : "none";
	},

	setContentsURLAndSize: function (contentsURL,width,height) {
		this.setContentsURL(contentsURL);
		this.setSize(width,height);
	},

	setRepeatingContentsURL: function (contentsURL) {
		this.setContentsURL(contentsURL);
		this.element.style.backgroundRepeat = "repeat";
		this.element.style.backgroundSize = "auto";
		this.element.style[quirks.stylePrefix + "BackgroundSize"] = "auto";
	},
	
	setBackgroundColor: function (backgroundColor) {
		if (this.backgroundColor == backgroundColor) { return; }
		this.backgroundColor = backgroundColor;
		this.element.style.backgroundColor = backgroundColor ? backgroundColor : "transparent";
	},
	
	setCornerRadius: function (radius) {
		radius = Math.round(radius);
		if (this.cornerRadius === radius) { return; }
		this.cornerRadius = radius;
		var styleValue = "" + radius + "px";
		this.element.style.borderRadius = styleValue;
		this.element.style[quirks.stylePrefix + "BorderRadius"] = styleValue;
	},
	
	
	//----------------------------------------------------------------------------------
	//
	//  other properties
	//

	setAccelerated: function (isAccelerated) {
		this.accelerated = isAccelerated;
	},

	setHidden: function (isHidden) {
		if (this.hidden === isHidden) { return; }
		this.hidden = isHidden;
		this.element.style.display = isHidden ? "none" : "block";
	},

	setInvisible: function (isInvisible) {
		if (this.invisible === isInvisible) { return; }
		this.invisible = isInvisible;
		this.element.style.visibility = isInvisible ? "hidden" : "visible";
	},

	setMasksToBounds: function (isMasked) {
		if (this.masksToBounds === isMasked) { return; }
		this.masksToBounds = isMasked;
		this.element.style.overflow = isMasked ? "hidden" : "visible";
	},

	setZPosition: function (zPosition) {
		zPosition = Math.round(zPosition);
		if (this.zPosition === zPosition) { return; }
		this.zPosition = zPosition;
		this.element.style.zIndex = zPosition;
	},

	setOpacity: function (opacity) {
		if (this.opacity === opacity) { return; }
		this.opacity = opacity;
		this._setAnimatableProperty("opacity", opacity);
	},
	
	setGlobalID: function (id) {
		var oldID = this.globalID;
		if (oldID === id) { return; }
		this.globalID = id;
		
		if (oldID) { delete BVLayer._layersByGlobalID[oldID]; }
		if (id) { BVLayer._layersByGlobalID[id] = this; }
	},
	

	//----------------------------------------------------------------------------------
	//
	//  hover
	//

	setHoverable: function (isHoverable) {
		if (this.hoverable === isHoverable) { return; }
		this.hoverable = isHoverable;
		this.element.style.pointerEvents = (this.touchable || this.hoverable) ? "auto" : "none";

		if (isHoverable) {
			this.element.addEvent("mouseenter", this.mouseEntered.bind(this));
			this.element.addEvent("mouseleave", this.mouseExited.bind(this));
		}
		else {
			this.element.removeEvents("mouseenter");
			this.element.removeEvents("mouseleave");
		}
	},
	
	mouseEntered: function (touches) { },
	mouseExited: function (touches) { },


	//----------------------------------------------------------------------------------
	//
	//  touches
	//

	setTouchable: function (isTouchable) {
		if (this.touchable === isTouchable) { return; }
		this.touchable = isTouchable;
		this.element.style.pointerEvents = (this.touchable || this.hoverable) ? "auto" : "none";

		if (isTouchable) {
			if (!this._mouseBound) {
				this._mouseBound = {
					mouseDown: this._mouseDown.bind(this),
					mouseMove: this._mouseMove.bind(this),
					mouseUp: this._mouseUp.bind(this),
					touchStart: this._touchStart.bind(this),
					touchMove: this._touchMove.bind(this),
					touchEnd: this._touchEnd.bind(this),
					touchCancel: this._touchCancel.bind(this)
				};
			}
			this.element.addEvent("mousedown", this._mouseBound.mouseDown);
			this.element.addEvent("touchstart", this._mouseBound.touchStart);
		}
		else {
			this.element.removeEvents("mousedown");
			this.element.removeEvents("touchstart");
		}
	},
	
	touchDidGoDown: function (touches) { },
	touchDidMove: function (touches) { },
	touchDidGoUp: function (touches) { },

	
	_mouseDown: function (event) {
		event.stop();
		this.element.getDocument().addEvents({
			mousemove: this._mouseBound.mouseMove,
			mouseup: this._mouseBound.mouseUp
		});
	
		this.touches = new BVTouches(this,event);
		this.touchDidGoDown(this.touches);
	},

	_mouseMove: function (event) {
		event.stop();
		this.touches._updateWithEvent(event);
		this.touchDidMove(this.touches);
	},

	_mouseUp: function (event) {
		event.stop();
		this.touches._goUpWithEvent(event);
		this.touchDidGoUp(this.touches);
		
		delete this.touches;
		this.element.getDocument().removeEvents({
			mousemove: this._mouseBound.mouseMove,
			mouseup: this._mouseBound.mouseUp
		});
	},

	_touchStart: function (event) {
		event.stop();
		if (this.touches || event.length > 1) { this._touchCancel(event); return; }  // only-single touch for now
		
		this.element.getDocument().addEvents({
			touchmove: this._mouseBound.touchMove,
			touchend: this._mouseBound.touchEnd,
			touchcancel: this._mouseBound.touchCancel
		});
	
		this.touches = new BVTouches(this,event);
		this.touchDidGoDown(this.touches);
	},
	
	_touchMove: function (event) {
		event.stop();
		if (!this.touches) { return; }

		this.touches._updateWithEvent(event);
		this.touchDidMove(this.touches);
	},
	
	_touchEnd: function (event) {
		event.stop();
		if (!this.touches) { return; }

		this.touches._goUpWithEvent(event);
		this.touchDidGoUp(this.touches);
		
		delete this.touches;
		this.element.getDocument().removeEvents({
			touchmove: this._mouseBound.touchMove,
			touchend: this._mouseBound.touchEnd,
			touchcancel: this._mouseBound.touchCancel
		});
	},
	
	_touchCancel: function (event) {
		this._touchEnd(event);
	},
	

	//----------------------------------------------------------------------------------
	//
	//  contains point
	//
	
	containsLocalPoint: function (x,y) {
		if (y === undefined) { y = x.y; x = x.x; }
		return (x >= 0 && x < this.width && y <= 0 && y > -this.height);
	},
	
	containsGlobalPoint: function (x,y) {
		var localPoint = this.getLocalPointForGlobalPoint(x,y);
		return this.containsLocalPoint(localPoint);
	},
	
	
	//----------------------------------------------------------------------------------
	//
	//  setting position around a local point
	//

	getPositionOfLocalPoint: function (x,y) {
		if (y === undefined) { y = x.y; x = x.x; }
		
		if (this.scale !== 1) { var s = layer.scale; x *= s; y *= s; }
		if (this.rotation !== 0) {
			var r = this.rotation;
			var newX = x * Math.cos(r) - y * Math.sin(r);
			var newY = x * Math.sin(r) + y * Math.cos(r);
			x = newX;
			y = newY;
		}
		
		return { x:x, y:y };
	},

	setPositionOfLocalPoint: function (positionX, positionY, localX, localY) {
		var pivot = this.getPositionOfLocalPoint(localX, localY);
		this.setPosition(positionX - pivot.x, positionY - pivot.y);
	},


	//----------------------------------------------------------------------------------
	//
	//  bounds conversion
	//
	
	getGlobalPointForLocalPoint: function (x,y) {
		if (y === undefined) { y = x.y; x = x.x; }
		var layer = this;
		
		while (layer.superlayer) {
			if (layer.scale !== 1) { var s = layer.scale; x *= s; y *= s; }
			if (layer.rotation !== 0) {
				var r = layer.rotation;
				var newX = x * Math.cos(r) - y * Math.sin(r);
				var newY = x * Math.sin(r) + y * Math.cos(r);
				x = newX;
				y = newY;
			}
			x += layer.x;
			y += layer.y;
			layer = layer.superlayer;
		}
		
		return { x:x, y:y };
	},
	
	getLocalPointForGlobalPoint: function (x,y) {
		if (y === undefined) { y = x.y; x = x.x; }
		var lineage = [];
		var layer = this;

		while (layer.superlayer) {
			lineage.push(layer);
			layer = layer.superlayer;
		}
		
		for (var i = lineage.length - 1; i >= 0; i--) {
			layer = lineage[i];
			x -= layer.x;
			y -= layer.y;
			if (layer.scale !== 1) { var s = 1.0/layer.scale; x *= s; y *= s; }
			if (layer.rotation !== 0) {
				var r = -layer.rotation;
				var newX = x * Math.cos(r) - y * Math.sin(r);
				var newY = x * Math.sin(r) + y * Math.cos(r);
				x = newX;
				y = newY;
			}
		}
		
		return { x:x, y:y };
	},
	
	getGlobalX: function () { return this.getGlobalPosition().x; },
	getGlobalY: function () { return this.getGlobalPosition().y; },

	getGlobalPosition: function () { return this.getGlobalPointForLocalPoint(0,0);},
	setGlobalPosition: function (x,y) {
		if (!this.superlayer) { return; }
		var position = this.superlayer.getLocalPointForGlobalPoint(x,y);
		this.setPosition(position);
	},


	_theEnd: function () {}
});



//----------------------------------------------------------------------------------
//
//  quirks
//

var quirks;

BVLayer._initializeQuirks = function () {
	quirks = {};

	var isWebKit = !!navigator.userAgent.toLowerCase().match(/applewebkit/);
	quirks.stylePrefix = (Browser.ie ? "ms" : Browser.firefox ? "Moz" : isWebKit ? "webkit" : Browser.opera ? "O" : "");
	quirks.stylePrefixCSS = quirks.stylePrefix ? ("-" + quirks.stylePrefix.toLowerCase() + "-") : "";
	quirks.areTransitionsAvailable = (isWebKit) && !gDisableTransitions;
	quirks.isTransform3DAvailable = Browser.safari || Browser.chrome;
	quirks.isAccelerationAvailable = (Browser.chrome || Browser.safari) && !gDisableTransitions;
	
	BVLayer._quirks = quirks;
	BVLayer._initializeDefaultProperties();		                 
};


//----------------------------------------------------------------------------------
//
//  default properties
//

BVLayer._initializeDefaultProperties = function () {
	var styles = {
		position: "absolute",
		zIndex: "0",
		left: "0px",
		top: "0px",
		backgroundRepeat: "no-repeat",
		backgroundSize: "100% 100%",
		pointerEvents: "none"
	};
	
	var stylePrefix = quirks.stylePrefix;
	styles[stylePrefix + "TransformOrigin"] = "0% 0%";
	styles[stylePrefix + "BackgroundSize"] = styles.backgroundSize;
	
	if (quirks.areTransitionsAvailable) {
		styles[stylePrefix + "TransitionProperty"] = 
			quirks.isAccelerationAvailable ? (quirks.stylePrefixCSS + "transform, opacity") : "left, top, opacity";
		styles[stylePrefix + "TransitionDuration"] = "0s";
		styles[stylePrefix + "TransitionTimingFunction"] = "ease-in-out";
	}
	
	BVLayer._defaultProperties = { styles:styles };
};

BVLayer.addPrefixToStyleName = function (name) {
	return quirks.stylePrefix + name;
};


//----------------------------------------------------------------------------------
//
//  global ID
//

BVLayer._layersByGlobalID = { };

BVLayer.getByGlobalID = function (id) { return BVLayer._layersByGlobalID[id]; };


//----------------------------------------------------------------------------------
//
//  animation
//

BVLayer.animationDuration = 0;
BVLayer.animationsEnabled = true;

BVLayer.animate = function (duration, fn, bind) {
	var oldDuration = BVLayer.animationDuration;
	BVLayer.animationDuration = duration;
	fn.call(bind);
	BVLayer.animationDuration = oldDuration;
};

BVLayer.setAnimationsEnabled = function (enabled) {
	BVLayer.animationsEnabled = enabled;
};


//----------------------------------------------------------------------------------
//
//  mootools override
//

// mootools' opacity setter messes with the visibility property, which messes up transitions
Element.Properties.opacity.set = function (opacity) {
	this.style.opacity = opacity;
};



//====================================================================================

})();
