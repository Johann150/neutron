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

function colourchoose(colours,current,handler){
	// cancel the chooser for pen colour if it was open
	if(document.getElementById('pen').getAttribute('data-old')=='close'){
		document.getElementById('pen').setAttribute('data-old','true');
	}
	// cancel the chooser for background colour if it was open
	if(document.getElementById('bg-color').getAttribute('data-open')=='true'){
		document.getElementById('bg-color').setAttribute('data-open','false');
	}
	// cancel the chooser for grid colour if it was open
	if(document.getElementById('grid').getAttribute('data-open')=='1'){
		document.getElementById('grid').setAttribute('data-open','0');
	}

	for(let i=0;i<6;i++){
		if(i>colours.length){
			// hide this one
			document.getElementById('colour-'+i).style.display="none";
		}else{
			// show colour
			document.getElementById('colour-'+i).style.display="initial";
			document.getElementById('colour-'+i).style.backgroundColor=colours[i];
			// set action handler
			document.getElementById('colour-'+i).onclick=(evt)=>{
				document.getElementById('colours-wrapper').style.display="none";
				let colour=rgb2hex(window.getComputedStyle(evt.target).backgroundColor);
				handler(colour);
			};
		}
	}
	document.getElementById('white').onclick=
	document.getElementById('black').onclick=(evt)=>{
		document.getElementById('colours-wrapper').style.display="none";
		let colour=rgb2hex(window.getComputedStyle(evt.target).backgroundColor);
		handler(colour);
	};

	document.getElementById('chooser').onclick=()=>{
		colorchooser.value=rgb2hex(current);
		colorchooser.onchange=function(evt){
			handler(colorchooser.value);
		};
		document.getElementById('colours-wrapper').style.display="none";
		colorchooser.click();
	}

	// show colour bar
	document.getElementById('colours-wrapper').style.display="block";
}

Array.prototype.max = function() {
	return Math.max.apply(null, this);
};
