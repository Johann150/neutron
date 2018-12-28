function getScrollMaxY(){
	return document.documentElement.scrollHeight-document.documentElement.clientHeight;
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
	return (window.scrollY<=point.y&&point.y<window.scrollY+document.documentElement.clientHeight);
}

Array.prototype.max = function() {
	return Math.max.apply(null, this);
};
