// canvas drawing handlers

function drawStart(evt){
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
	if(drawing&&activePath!==null){
		// something went wrong; save it anyway
		image.push(activePath);
	}
	activePath={
		color:context.strokeStyle,
		gco:context.globalCompositeOperation,
		width:context.lineWidth,
		points:[]
	};
	drawing=true;
	prevX=evt.clientX-canvas.offsetLeft;
	prevY=evt.clientY-canvas.offsetTop+scrolled;
	activePath.points.push({
		x:prevX,
		y:prevY
	});
	// draw a single point
	context.moveTo(prevX,prevY-scrolled);
	context.lineTo(prevX,prevY-scrolled);
	context.stroke();
}

function drawMove(evt){
	if(drawing){
		context.moveTo(prevX,prevY-scrolled);
		prevX=evt.clientX-canvas.offsetLeft;
		prevY=evt.clientY-canvas.offsetTop+scrolled;
		activePath.points.push({
			x:prevX,
			y:prevY
		});
		context.lineTo(prevX,prevY-scrolled);
		context.stroke();
	}
	// set erasor cursor
	var style=document.body.style;
	style.setProperty("--erase-x",evt.clientX+"px");
	style.setProperty("--erase-y",evt.clientY+"px");
}

function drawStop(evt){
	if(drawing!==true) return;
	if(typeof evt!=='undefined'&&activePath!=null){
		// this is a real mouse handler call and not a delegation
		context.moveTo(prevX,prevY-scrolled);
		prevX=evt.clientX-canvas.offsetLeft;
		prevY=evt.clientY-canvas.offsetTop+scrolled;
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
	context.lineTo(prevX,prevY-scrolled);
	context.stroke();
	drawing=false;
}

// scrolling handlers

var scrolling=-1;
function scrollStart(evt){
	scrolling=evt.clientY;
}

function scrollMove(evt){
	if(scrolling!=-1){
		var d=scrolling-evt.clientY;
		scrolled=Math.min(Math.max(scrolled-(d*height/document.documentElement.clientHeight),0),getScrollBarMax())
		document.getElementById('scroll').style.top=(scrolled*document.documentElement.clientHeight/height)+"px";
		document.body.style.backgroundPosition=`top ${-scrolled}px left 0`;
		scrolling=evt.clientY;
		repaintAll();
	}
}

function scrollStop(){
	scrolling=-1;
}

// toolbar handlers

function penClick(){
	var pen=document.getElementById('pen');
	if(pen.getAttribute('data-old')=='true'){
		// pen was already activated, user wants to change color
		pen.setAttribute('data-old','close');

		colourchoose(["#dd0622","#f8ba00","#2676cc","#0cfc04","#b41c74","#ccd4d4"],context.strokeStyle,(colour)=>{
			pen.setAttribute('data-old','true');
			penColor=colour;
			document.body.style.setProperty("--pen-color",penColor);
			saved=false;
		});
	}else if(pen.getAttribute('data-old')=='close'){
		// dismiss colour chooser
		document.getElementById('colours-wrapper').style.display="none";
		pen.setAttribute('data-old','true');
	}else{
		// only activate pen
		pen.setAttribute('data-old','true');
		document.getElementById('stroke').value=penWidth;
		document.getElementById('erase-cur').style.display="none";
		document.getElementById('canvas').style.cursor="";
	}
}


function eraseClick(){
	var pen=document.getElementById('pen');
	// dismiss colour chooser if it was open
	if(pen.getAttribute('data-old')=='close'){
		document.getElementById('colours-wrapper').style.display="none";
	}
	pen.setAttribute('data-old','false');
	document.getElementById('stroke').value=eraseWidth;
	document.getElementById('erase-cur').style.display="block";
	document.body.style.setProperty("--erase-size",eraseWidth+"px");
	document.getElementById('canvas').style.cursor="none";
}

function bgColorClick(){
	var btn=document.getElementById('bg-color');
	if(btn.getAttribute('data-open')=='true'){
		// dismiss colour chooser
		document.getElementById('colours-wrapper').style.display="none";
		btn.setAttribute('data-open','true');
	}else{
		colourchoose(["#063","#343434","#2C4474","#FCD4A3"],document.body.style.backgroundColor,(colour)=>{
			bgColor=colour;
			document.body.style.backgroundColor=bgColor;
			document.getElementById('bg-color').setAttribute('data-open','false');
			saved=false;
		});
		btn.setAttribute('data-open','true');
	}
}

function gridClick(evt){
	evt.preventDefault();
	var g=document.getElementById('grid');
	if(g.getAttribute('data-old')=='0'){
		// grid was already activated, user wants to change color
		g.setAttribute('data-old','1');
		colourchoose(["#eaeaea","#4c4c4c","#096"],grid,(colour)=>{
			grid=colour;
			document.body.style.setProperty('--grid-color',grid);
			document.getElementById('grid').setAttribute('data-old','2');
			saved=false;
		});
		g.checked=true;
	}else if(g.getAttribute('data-old')=='1'){
		// dismiss colour chooser
		document.getElementById('colours-wrapper').style.display="none";
		g.setAttribute('data-old','2');
		g.checked=true;
	}else if(g.getAttribute('data-old')=='2'){
		// deactivate grid
		document.body.classList.remove('grid');
		g.setAttribute('data-old','3');
		g.checked=false;
	}else if(g.getAttribute('data-old')=='3'){
		// activate grid
		document.body.classList.add('grid');
		g.setAttribute('data-old','0');
		g.checked=true;
	}
}

function undo(){
	if(image.length>0){
		redoStack.push(image.pop());
		saved=false;
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
		saved=false;
		document.getElementById('undo').style.filter="";
	}
	repaintAll();
	if(redoStack.length<=0){
		document.getElementById('redo').style.filter="brightness(50%)";
	}
}

function strokeChange(){
	var stroke=document.getElementById('stroke').value;
	if(document.getElementById('erase').checked){
		eraseWidth=stroke;
		document.body.style.setProperty("--erase-size",eraseWidth+"px");
	}else{
		penWidth=stroke;
	}
	saved=false;
}

function down(){
	if(height<document.documentElement.clientHeight){
		height=document.documentElement.clientHeight;
	}
	if(scrolled>=getScrollBarMax()){
		resize(height+100);
		saved=false;
	}
	scrolled=getScrollBarMax();
	document.getElementById('scroll').style.top=(scrolled*document.documentElement.clientHeight/height)+"px";
	document.body.style.backgroundPosition=`top ${-scrolled}px left 0`;
	repaintAll();
}
