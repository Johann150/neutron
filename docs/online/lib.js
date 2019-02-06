function getScrollBarMax(){
	return height-document.documentElement.clientHeight;
}

function rgb2hex(rgb){
	rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
	return (rgb && rgb.length === 4) ? "#" +
		("0" + parseInt(rgb[1],10).toString(16)).slice(-2) +
		("0" + parseInt(rgb[2],10).toString(16)).slice(-2) +
		("0" + parseInt(rgb[3],10).toString(16)).slice(-2) : rgb;
}

function pointInViewport(point){
	// x does not need to be checked
	return (scrolled<=point.y&&point.y<scrolled+document.documentElement.clientHeight);
}

function toggleFullscreen() {
	if(!document.fullscreenElement){
		document.documentElement.requestFullscreen();
		document.getElementById('fullscreen').src="fullscreen-off.svg";
	}else{
		if(document.exitFullscreen){
			document.exitFullscreen();
			document.getElementById('fullscreen').src="fullscreen-on.svg";
		}
	}
}

Array.prototype.max = function() {
	return Math.max.apply(null, this);
};
