function mousedown(evt){
	context.beginPath();
	if(document.getElementById("erase").checked){
		context.globalCompositeOperation="destination-out";
		context.strokeStyle="rgba(0,0,0,1)";
		context.lineWidth=eraseWidth;
	}else{
		context.globalCompositeOperation="source-over";
		context.strokeStyle=penColor;
		context.lineWidth=penWidth;
	}
	activePath={
		color:context.strokeStyle,
		gco:context.globalCompositeOperation,
		width:context.lineWidth,
		points:[]
	};
	drawing=true;
	prevX=evt.clientX-canvas.offsetLeft;
	prevY=evt.clientY-canvas.offsetTop+window.scrollY;
	activePath.points.push({
		x:prevX,
		y:prevY
	});
	// draw a single point
	context.moveTo(prevX,prevY-window.scrollY);
	context.lineTo(prevX,prevY-window.scrollY);
	context.stroke();
}

function mousemove(evt){
	if(drawing){
		context.moveTo(prevX,prevY-window.scrollY);
		prevX=evt.clientX-canvas.offsetLeft;
		prevY=evt.clientY-canvas.offsetTop+window.scrollY;
		activePath.points.push({
			x:prevX,
			y:prevY
		});
		context.lineTo(prevX,prevY-window.scrollY);
		context.stroke();
	}
	// set erasor cursor
	var style=document.body.style;
	style.setProperty("--erase-x",evt.clientX+"px");
	style.setProperty("--erase-y",evt.clientY+"px");
}

function mouseup(evt){
	if(typeof evt!=='undefined'&&activePath!=null){
		// this is a real mouse handler call and not a delegation
		evt.stopPropagation();
		evt.preventDefault();
		context.moveTo(prevX,prevY-window.scrollY);
		prevX=evt.clientX-canvas.offsetLeft;
		prevY=evt.clientY-canvas.offsetTop+window.scrollY;
		activePath.points.push({
			x:prevX,
			y:prevY
		});
	}
	// save what was drawn
	image.push(activePath);
	saved=false;
	// display undo button as normal
	document.getElementById('undo').style.filter="";
	// user drew sth new so empty redoStack
	redoStack=[];
	// grey-out the redo button
	document.getElementById('redo').style.filter="brightness(50%)";
	context.lineTo(prevX,prevY-window.scrollY);
	context.stroke();
	drawing=false;
}

var scrolling=-1;
function scrollStart(evt){
	scrolling=evt.clientY;
}

function scrollMove(evt){
	if(scrolling!=-1){
		var d=scrolling-evt.clientY;
		scrolled=Math.min(Math.max(scrolled-d,0),getScrollBarMax())
		document.getElementById('scroll').style.top=scrolled+"px";
		scrolling=evt.clientY;
		repaintAll();
	}
}

function scrollStop(evt){
	scrolling=-1;
}