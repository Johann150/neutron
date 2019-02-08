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
		if(document.documentElement.requestFullscreen){
			document.documentElement.requestFullscreen();
		}else if(document.documentElement.mozRequestFullScreen){
			document.documentElement.mozRequestFullScreen();
		}else if(document.documentElement.webkitRequestFullScreen){
			document.documentElement.webkitRequestFullScreen();
		}else if(document.documentElement.msRequestFullscreen){
			document.documentElement.msRequestFullscreen();
		}
		document.getElementById('fullscreen').src="fullscreen-off.svg";
	}else{
		if(document.exitFullscreen){
			document.exitFullscreen();
		}else if(document.mozCancelFullScreen){
			document.mozCancelFullScreen();
		}else if(document.webkitCancelFullScreen){
			document.webkitCancelFullScreen();
		}else if(document.msExitFullscreen){
			document.msExitFullscreen();
		}
		document.getElementById('fullscreen').src="fullscreen-on.svg";
	}
}

Array.prototype.max = function() {
	return Math.max.apply(null, this);
};
