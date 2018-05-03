var image=[];
var activePath;
var redoStack=[];
var penColor="#ffffff";
var penWidth=1;
var eraseWidth=50;
var colorchooser=document.createElement('input');
colorchooser.type="color";

function resize(w,h){
	// get canvas
	canvas = document.getElementById("canvas");
	// check that the canvas isn't already in the right size
	if(canvas.width!==w||canvas.height!==h){
		// resize canvas
		canvas.width=w;
		canvas.height=h;
		// get context
		context = canvas.getContext("2d");
		// setup context
		// this enhances line drawing so there are no sudden gaps in the line
		context.lineJoin="round";
		context.lineCap="round";
		// image was destroyed when canvas was resized so we have to repaint it
		repaintAll();
	}
}

function setup(){
	// grey-out undo and redo buttons
	document.getElementById('undo').style.filter="brightness(50%)";
	document.getElementById('redo').style.filter="brightness(50%)";
	// initialize variables
	image=[];
	redoStack=[]
	penColor="#ffffff";
	bgColor="#006633";
	document.body.style.backgroundColor=bgColor;
	penWidth=1;
	eraseWidth=50;
	document.getElementById('stroke').value=penWidth;
	drawing=false;
	prevX=0;
	prevY=0;
	colorchooser=document.createElement('input');
	colorchooser.type="color";
	// initialize canvas and context
	resize(window.innerWidth,window.innerHeight);
	context.lineWidth=penWidth;
	context.clearRect(0,0,canvas.width,canvas.height);
	// make sure canvas gets resized if window dimensión changes
	// but never reduce the canvas size
	document.body.onresize=function(){
		resize(Math.max(canvas.width,window.innerWidth),Math.max(canvas.height,window.innerHeight));
	};
	// mouse handlers
	canvas.onmousedown=function(evt){
		context.beginPath();
		if(document.getElementById("erase").checked){
			context.globalCompositeOperation="destination-out";
			context.strokeStyle = "rgba(0,0,0,1)";
			context.lineWidth=eraseWidth;
		}else{
			context.globalCompositeOperation="source-over";
			context.strokeStyle=penColor;
			context.lineWidth=penWidth+1;
		}
		activePath={
			color:context.strokeStyle,
			gco:context.globalCompositeOperation,
			width:context.lineWidth,
			points:[]
		};
		drawing=true;
		prevX=evt.clientX - canvas.offsetLeft;
		prevY=evt.clientY - canvas.offsetTop + window.scrollY;
		activePath.points.push({
			x:prevX,
			y:prevY
		});
		// draw a single point
		context.moveTo(prevX,prevY);
		context.lineTo(prevX,prevY);
		context.stroke();
	};
	canvas.onmousemove=function(evt){
		if(drawing){
			context.moveTo(prevX,prevY);
			prevX=evt.clientX - canvas.offsetLeft;
			prevY=evt.clientY - canvas.offsetTop + window.scrollY;
			activePath.points.push({
				x:prevX,
				y:prevY
			});
			context.lineTo(prevX,prevY);
			context.stroke();
		}
	};
	canvas.onmouseup=function(evt){
		if(typeof evt !== 'undefined'){
			// this is a real mouse handler call
			evt.stopPropagation();
			evt.preventDefault();
			context.moveTo(prevX,prevY);
			prevX=evt.clientX - canvas.offsetLeft;
			prevY=evt.clientY - canvas.offsetTop + window.scrollY;
			activePath.points.push({
				x:prevX,
				y:prevY
			});
		}
		// save what was drawn
		image.push(activePath);
		// display undo button as normal
		document.getElementById('undo').style.filter="";
		// user drew sth new so empty redoStack
		redoStack=[];
		// grey-out the redo button
		document.getElementById('redo').style.filter="brightness(50%)";
		context.lineTo(prevX,prevY);
		context.stroke();
		drawing=false;
	};
	document.onmouseup=function(){
		if(drawing){
			// save what was drawn
			image.push(activePath);
			// display undo button as normal
			document.getElementById('undo').style.filter="";
			// user drew sth new so empty redoStack
			redoStack=[];
			// grey-out the redo button
			document.getElementById('redo').style.filter="brightness(50%)";
			drawing=false;
		}
	};
	// touch handlers
	canvas.ontouchstart=function(evt){
		evt.preventDefault();
		evt.stopPropagation();
		canvas.onmousedown(evt.touches[0]);
	};
	canvas.ontouchmove=function(evt){
		evt.preventDefault();
		evt.stopPropagation();
		canvas.onmousemove(evt.touches[0]);
	};
	canvas.ontouchend=function(evt){
		evt.preventDefault();
		evt.stopPropagation();
		canvas.onmouseup();
	};
	canvas.ontouchcancel=document.onmouseup;
	// save handler
	document.getElementById("save").onclick=function(evt){
		save(document.getElementById("save"),evt);
	};
}

function down(){
	if(window.scrollY>=getScrollMaxY()){
		resize(canvas.width,canvas.height+100);
	}
	window.scrollTo(0,getScrollMaxY());
}

function save(anchor,evt){
	// repaint for png download
	repaintAll();
	// paint background
	context.globalCompositeOperation='destination-over';
	context.fillStyle=bgColor;
	context.fillRect(0,0,canvas.width,canvas.height);
	// make browser download the file
	if(window.navigator.msSaveBlob){
		window.navigator.msSaveBlob(canvas.msToBlob(), fileName);
		evt.preventDefault();
	}else{
		var date=new Date();
		var filename=date.getDate();
		filename+="-";
		filename+=date.getMonth()+1;
		filename+="-";
		filename+=date.getFullYear();
		filename+=".png";
		anchor.setAttribute('download', filename);
		anchor.setAttribute('href', canvas.toDataURL());
	}
}

function undo(){
	if(image.length>0){
		redoStack.push(image.pop());
		document.getElementById('redo').style.filter="";
	}
	repaintAll();
	if(image.length<=0){
		document.getElementById('undo').style.filter="brightness(50%)";
	}
}

function redo(){
	if(redoStack.length>0){
		image.push(redoStack.pop());
		document.getElementById('undo').style.filter="";
	}
	repaintAll();
	if(redoStack.length<=0){
		document.getElementById('redo').style.filter="brightness(50%)";
	}
}

function repaintAll(){
	// clear image
	context.clearRect(0,0,canvas.width,canvas.height);
	// paint all paths
	for(var i=0;i<image.length;i++){
		context.beginPath();
		var path=image[i];
		// set appearance
		context.strokeStyle=path.color;
		context.lineWidth=path.width+1;
		context.globalCompositeOperation=path.gco;
		// add all points
		var point=path.points[0];
		context.moveTo(point.x,point.y);
		// starting at zero enables single points
		for(var j=0;j<path.points.length;j++){
			point=path.points[j];
			context.lineTo(point.x,point.y);
		}
		// draw!
		context.stroke();
	}
}

function getScrollMaxY(){
	var innerh;
	if (window.innerHeight){
		innerh = window.innerHeight;
	}else{
		innerh = document.body.clientHeight;
	}
	if (window.innerHeight && window.scrollMaxY){
		// Firefox
		yWithScroll = window.innerHeight + window.scrollMaxY;
	} else if (document.body.scrollHeight > document.body.offsetHeight){
		// all but Explorer Mac
		yWithScroll = document.body.scrollHeight;
	} else {
		// works in Explorer 6 Strict, Mozilla (not FF) and Safari
		yWithScroll = document.body.offsetHeight;
	}
	return yWithScroll-innerh;
}

function penClick(){
	var pen=document.getElementById('pen');
	if(pen.getAttribute('data-old')=='true'){
		// pen was already activated, user wants to change color
		colorchooser.value=context.strokeStyle;
		colorchooser.onchange=function(evt){
			penColor=colorchooser.value;
		};
		colorchooser.click();
	}else{
		// only activate pen
		pen.setAttribute('data-old','true');
		document.getElementById('stroke').value=penWidth;
	}
}

function eraseClick(){
	var pen=document.getElementById('pen');
	pen.setAttribute('data-old','false');
	document.getElementById('stroke').value=eraseWidth;
}

function strokeChange(){
	var stroke=document.getElementById('stroke').value;
	if(document.getElementById('erase').checked){
		eraseWidth=stroke;
	}else{
		penWidth=stroke;
	}
}

function bgColorChange(){
	colorchooser.value=rgb2hex(document.body.style.backgroundColor);
	colorchooser.onchange=function(){
		document.body.style.background=colorchooser.value;
	};
	colorchooser.click();
}

function rgb2hex(rgb){
	rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
	return (rgb && rgb.length === 4) ? "#" +
		("0" + parseInt(rgb[1],10).toString(16)).slice(-2) +
		("0" + parseInt(rgb[2],10).toString(16)).slice(-2) +
		("0" + parseInt(rgb[3],10).toString(16)).slice(-2) : '';
}
