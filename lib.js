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

Image.prototype.load = function(url){
	var thisImg = this;
	var xmlHTTP = new XMLHttpRequest();
	xmlHTTP.open('GET', url,true);
	xmlHTTP.responseType = 'arraybuffer';
	xmlHTTP.onload = function(e) {
		var blob = new Blob([this.response]);
		thisImg.src = window.URL.createObjectURL(blob);
		thisImg.onload();
	};
	xmlHTTP.onprogress = function(e) {
		thisImg.completedPercentage = parseInt((e.loaded / e.total) * 100);
	};
	xmlHTTP.onloadstart = function() {
		thisImg.completedPercentage = 0;
	};
	xmlHTTP.send();
};

Image.prototype.completedPercentage = 0;

Array.prototype.max = function() {
	return Math.max.apply(null, this);
};
