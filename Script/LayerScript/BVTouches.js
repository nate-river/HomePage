//
//  BVTouches.js
//  LayerScript
//
//  Created by Bret Victor on 2/25/11.
//  (c) 2011 Bret Victor.  MIT open-source license.
//


(function(){


//====================================================================================
//
//  BVTouches
//

var BVTouches = this.BVTouches = new Class({

	initialize: function (layer,event) {
		this.layer = layer;
		this.globalPoint = { x:event.page.x, y:-event.page.y };
		this.translation = { x:0, y:0 };
		this.deltaTranslation = { x:0, y:0 };
		this.velocity = { x:0, y:0 };
		this.count = 1;
		this.event = event;
		this.timestamp = event.event.timeStamp;
		this.downTimestamp = this.timestamp;
	},
	
	_updateWithEvent: function (event, isRemoving) {
		this.event = event;
		if (!isRemoving) {
			var dx = event.page.x - this.globalPoint.x;  // todo, transform to local coordinate space?
			var dy = -event.page.y - this.globalPoint.y;
			this.translation.x += dx;
			this.translation.y += dy;
			this.deltaTranslation.x += dx;
			this.deltaTranslation.y += dy;
			this.globalPoint.x = event.page.x;
			this.globalPoint.y = -event.page.y;
		}

		var timestamp = event.event.timeStamp;
		var dt = timestamp - this.timestamp;
		var isSamePoint = isRemoving || (dx === 0 && dy === 0);
		var isStopped = (isSamePoint && dt > 150);
		
		this.velocity.x = isStopped ? 0 : (isSamePoint || dt === 0) ? this.velocity.x : (dx / dt * 1000);
		this.velocity.y = isStopped ? 0 : (isSamePoint || dt === 0) ? this.velocity.y : (dy / dt * 1000);
		this.timestamp = timestamp;
	},
	
	_goUpWithEvent: function (event) {
		this._updateWithEvent(event, true);
		this.count = 0;
		
		var didMove = Math.abs(this.translation.x) > 10 || Math.abs(this.translation.y) > 10;
		var wasMoving = Math.abs(this.velocity.x) > 400 || Math.abs(this.velocity.y) > 400;
		this.wasTap = !didMove && !wasMoving && (this.getTimeSinceGoingDown() < 300);

		this.wasDoubleTap = this.wasTap && (this.timestamp - (this.layer.timestampOfLastTap || 0) < 400);
		if (this.wasTap) { this.layer.timestampOfLastTap = this.timestamp; }
	},
	
	getTimeSinceGoingDown: function () {
		return this.timestamp - this.downTimestamp;
	},
	
	resetDeltaTranslation: function () {
		this.deltaTranslation.x = 0;
		this.deltaTranslation.y = 0;
	}

});



//====================================================================================
//
//  BVTouchRegion (forwards touch events to superlayer)
//

var BVTouchRegion = this.BVTouchRegion = new Class({

	Extends: BVLayer,

	initialize: function (superlayer) {
		this.parent(superlayer);
		this.setTouchable(true);
		this.targetLayer = this.superlayer;
	},
	
	setTargetLayer: function (layer) {
		this.targetLayer = layer || this.superlayer;
	},
	
	setBoundsWithMargin: function(margin, width, height) {
		if (width === undefined) { width = this.targetLayer.getSize(); }
		if (height === undefined) { height = width.height; width = width.width; }
		this.setPosition(-margin, margin);
		this.setSize(width + margin * 2, height + margin * 2);
	},

	touchDidGoDown: function (touches) {
		this.targetLayer.touchDidGoDown(touches);
	},
	touchDidMove: function (touches) {
		this.targetLayer.touchDidMove(touches);
	},
	touchDidGoUp: function (touches) {
		this.targetLayer.touchDidGoUp(touches);
	},

	mouseEntered: function (touches) {
		this.targetLayer.mouseEntered();
	},
	mouseExited: function (touches) {
		this.targetLayer.mouseExited();
	}
	
});


//====================================================================================

})();
