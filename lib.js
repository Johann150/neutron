function getScrollMaxY(){
	return document.body.scrollHeight-document.body.clientHeight;
}

function rgb2hex(rgb){
	rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
	return (rgb && rgb.length === 4) ? "#" +
		("0" + parseInt(rgb[1],10).toString(16)).slice(-2) +
		("0" + parseInt(rgb[2],10).toString(16)).slice(-2) +
		("0" + parseInt(rgb[3],10).toString(16)).slice(-2) : rgb;
}

function calculateAspectRatioFit(srcWidth,srcHeight,maxWidth,maxHeight){
	var ratio=Math.min(maxWidth/srcWidth,maxHeight/srcHeight);
	return {width:srcWidth*ratio,height:srcHeight*ratio};
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
