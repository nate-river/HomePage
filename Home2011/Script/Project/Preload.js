//
//  Preload.js
//  Home2011
//
//  Created by Bret Victor on 4/17/11.
//  (c) 2011 Bret Victor.  MIT open-source license.
//
//  Put some image downloads in the pipeline before spending the
//  time to set up the layer tree.


(function(){

var urls = [
    "Images/Background.jpg",
	"Images/Window.png",
	"Images/WindowCaption.png",
	"Images/EdgeShadowTop.png",
	"Images/EdgeShadowLeft.png",
	"Images/EdgeShadowRight.png",
	"Images/FilmLeft.png",
	"Images/FilmRight.png",
	"Images/FilmMiddle.png",
	"Images/DoodleLeft.png",
	"Images/DoodleRight.png",
	"Images/ContactsTop.png",
	"Images/WindowHighlighted.png"
];

var images = [];

for (var i = 0; i < urls.length; i++) {
	var image = new Image();
	image.src = urls[i];
	images.push(image);
}


})();

