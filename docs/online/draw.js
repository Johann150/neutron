var canvas; // main canvas for drawing
var context; // 2d drawing context
var image; // an array of former activePath's
var activePath; // object storing information on how to recreate a certain drawing feature
var redoStack; // array storing former activePath's that have been undone to be redone
var penColor; // the current colour used to draw as a string (e.g. "#ffffff")
var bgColor; // the current colour used for the background as a css value (e.g)
var penWidth; // width used to draw with the pen tool
var eraseWidth; // width used to erase something; usually >penWidth
var colorchooser; // DOM element: <input type="color">
var drawing; // boolean, wether the user is drawing at the moment
var prevX; // the previous x coordinate when drawing
var prevY; // the previous y coordinate when drawing
var grid; // boolean, wether the grid is visisble or not
var height; // current height of the canvas
var scrolled;

function resize(h){
	// check that the body isn't already the right size
	if(height<h){
		height=h;
		// adjust scrollbar styling
		document.getElementById('scroll').style.height=(document.body.clientHeight-getScrollBarMax())+"px";
	}
}

function setupHandlers(){
	document.querySelector('label[for=pen]').onclick=penClick;
	document.querySelector('label[for=erase]').onclick=eraseClick;
	document.querySelector('label[for=bg-color]').onclick=bgColorClick;
	document.querySelector('label[for=grid]').onclick=gridClick;
	document.getElementById('save-img').onclick=saveImg;
	document.getElementById('undo').onclick=undo;
	document.getElementById('redo').onclick=redo;
	document.getElementById('stroke').oninput=strokeChange;
	document.getElementById('down').onclick=down;
	document.getElementById('scroll').onmousedown=scrollStart;
	document.body.onmousemove=scrollMove;
	document.body.onmouseup=scrollStop;
	window.onscroll=repaintAll;
}

function setup(){
	setupHandlers();
	// grey-out undo and redo buttons
	document.getElementById('undo').style.filter="brightness(50%)";
	document.getElementById('redo').style.filter="brightness(50%)";
	// initialize variables
	image=[];
	activePath=null;
	redoStack=[]
	penColor="#ffffff";
	document.body.style.setProperty("--pen-color",penColor);
	bgColor="#006633";
	grid="#000000";
	document.body.style.backgroundColour=bgColor;
	penWidth=2;
	eraseWidth=50;
	document.getElementById('stroke').value=penWidth;
	drawing=false;
	prevX=0;
	prevY=0;
	height=document.documentElement.clientHeight;
	scrolled=0;
	colorchooser=document.createElement('input');
	colorchooser.type="color";
	// get canvas
	canvas=document.getElementById("canvas");
	// initialize canvas and context
	canvas.width=document.documentElement.clientWidth-20;// subtract scrollbar size
	canvas.height=document.documentElement.clientHeight;
	// get context
	context=canvas.getContext("2d");
	// setup context
	// this enhances line drawing so there are no sudden gaps in the line
	context.lineJoin="round";
	context.lineCap="round";
	resize(document.documentElement.clientHeight);
	context.lineWidth=penWidth;
	context.clearRect(0,0,canvas.width,canvas.height);
	// make sure canvas gets resized if window dimension changes
	// but never reduce the canvas size
	document.body.onresize=function(){
		if(canvas.width!==document.documentElement.clientWidth){
			canvas.width=document.documentElement.clientWidth;
			canvas.height=document.documentElement.clientHeight;
			// get context
			context=canvas.getContext("2d");
			// setup context
			// this enhances line drawing so there are no sudden gaps in the line
			context.lineJoin="round";
			context.lineCap="round";
			context.lineWidth=penWidth;
			repaintAll();
		}else{
			resize(Math.max(canvas.height,document.body.clientHeight));
		}
	};
	// mouse handlers
	canvas.onmousedown=mousedown;
	canvas.onmousemove=mousemove;
	canvas.onmouseup=mouseup;
	document.onmouseup=function(){
		if(drawing){
			mouseup();
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
}

/*
only saves background colour and what was written
background images will be ignored
*/
function saveImg(){
	var date=new Date();
	let options={
		title:'Als Bild speichern',
		buttonLabel:'Speichern',
		defaultPath:date.getFullYear()+'-'+(date.getMonth()+1)+'-'+date.getDate(),
		filters:[
			{
				name:'PNG-Bild',
				extensions:['png']
			},
			{
				name:'JPEG-Bild',
				extensions:['jpg','jpeg']
			}
		]
	};
	dialog.showSaveDialog(options,(f)=>{
		if(f===undefined){
			return; // canceled
		}
		var canv,ctx;
		canv=document.createElement('canvas');
		canv.width=document.body.clientWidth;
		canv.height=document.body.clientHeight;
		ctx=canv.getContext('2d');
		// clear image
		ctx.clearRect(0,0,canv.width,canv.height);
		// paint all paths
		for(var i=0;i<image.length;i++){
			ctx.beginPath();
			var path=image[i];
			if(path==null){
				continue;
			}
			// set appearance
			ctx.strokeStyle=path.color;
			ctx.lineWidth=path.width+1;
			ctx.globalCompositeOperation=path.gco;
			// add all points
			var point=path.points[0];
			ctx.moveTo(point.x,point.y);
			// start at 0 again to also draw single points
			for(var j=0;j<path.points.length;j++){
				point=path.points[j];
				ctx.lineTo(point.x,point.y);
			}
			// draw!
			ctx.stroke();
		}
		// add the background
		ctx.globalCompositeOperation='destination-over';
		ctx.fillStyle=bgColor;
		ctx.fillRect(0,0,canv.width,canv.height);
		// save image
		var data;
		if(f.match(/\.png$/i)!==null){
			// get png data
			data=canv.toDataURL('image/png');
		}else if(f.match(/\.jpe?g$/i)!==null){
			// get jpg data
			data=canv.toDataURL('image/jpeg');
		}
		var img=nativeImage.createFromDataURL(data);
		if(f.match(/\.png$/i)!==null){
			// get png data
			data=img.toPNG();
		}else if(f.match(/\.jpe?g$/i)!==null){
			// get jpg data
			data=img.toJPEG(1);
		}
		fs.writeFile(f,data,(err)=>{
			if(err){
				alert("Beim Speichern ist ein Fehler aufgetreten: "+err.message);
				console.error("saving error:"+err.message);
			}
		});
	});
}

function down(){
	if(scrolled>=getScrollBarMax()){
		resize(height+100);
	}
	scrolled=getScrollBarMax();
	document.getElementById('scroll').style.top=scrolled+"px";
	document.body.style.backgroundPosition=`top ${-scrolled}px left 0`;
	repaintAll();
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
	if(typeof canvas=='undefined'||typeof context=='undefined'){
		console.warn("canvas not defined");
		return;
	}
	// clear image
	context.clearRect(0,0,canvas.width,canvas.height);
	// paint all paths
	for(var i=0;i<image.length;i++){
		context.beginPath();
		var path=image[i];
		if(path==null){
			continue;
		}
		// set appearance
		context.strokeStyle=path.color;
		context.lineWidth=path.width+1;
		context.globalCompositeOperation=path.gco;
		// add all the points
		var moved=false;
		for(var j=0;j<path.points.length;j++){
			var point=path.points[j];
			if(
				(j>0&&pointInViewport(path.points[j-1]))// the previous point is in the viewport
				||
				pointInViewport(point)// this point is in the viewport
				||
				(j+1<path.points.length&&pointInViewport(path.points[j+1]))
					// the next point is in the viewport
					// the current point is needed for drawing the line to the next point
			){
				// this point is required
				if(!moved){
					context.moveTo(point.x,point.y-scrolled);
					moved=true;
				}
				// always make a line to also draw lines consisting of one point only
				context.lineTo(point.x,point.y-scrolled);
			}
		}
		// draw the current path
		context.stroke();
	}
}

function penClick(){
	var pen=document.getElementById('pen');
	if(pen.getAttribute('data-old')=='true'){
		// cancel the chooser for background colour if it was open
		if(document.getElementById('bg-color').getAttribute('data-open')=='true'){
			document.getElementById('bg-color').setAttribute('data-open','false');
		}
		// cancel the chooser for grid colour if it was open
		if(document.getElementById('grid').getAttribute('data-open')=='1'){
			document.getElementById('grid').setAttribute('data-open','0');
		}

		// pen was already activated, user wants to change color
		pen.setAttribute('data-old','close');

		// set colour palette for pen
		document.getElementById('colour-a').style.backgroundColor="#dd0622";
		document.getElementById('colour-b').style.backgroundColor="#f8ba00";
		document.getElementById('colour-c').style.backgroundColor="#2676cc";
		document.getElementById('colour-d').style.backgroundColor="#0cfc04";
		document.getElementById('colour-e').style.backgroundColor="#b41c74";
		document.getElementById('colour-f').style.backgroundColor="#ccd4d4";

		// show additional colours
		document.getElementById('colour-c').style.display=
		document.getElementById('colour-d').style.display=
		document.getElementById('colour-e').style.display=
		document.getElementById('colour-f').style.display="initial";

		document.getElementById('colour-a').onclick=
		document.getElementById('colour-b').onclick=
		document.getElementById('colour-c').onclick=
		document.getElementById('colour-d').onclick=
		document.getElementById('colour-e').onclick=
		document.getElementById('colour-f').onclick=
		document.getElementById('white').onclick=
		document.getElementById('black').onclick=
		(evt)=>{
			pen.setAttribute('data-old','true');
			penColor=rgb2hex(window.getComputedStyle(evt.srcElement).backgroundColor);
			document.body.style.setProperty("--pen-color",penColor);
			document.getElementById('colours-wrapper').style.display="none";
		};

		document.getElementById('chooser').onclick=()=>{
			colorchooser.value=context.strokeStyle;
			colorchooser.onchange=function(evt){
				penColor=colorchooser.value;
				document.body.style.setProperty("--pen-color",penColor);
			};
			pen.setAttribute('data-old','true');
			document.getElementById('colours-wrapper').style.display="none";
			colorchooser.click();
		}
		document.getElementById('colours-wrapper').style.display="block";
	}else if(pen.getAttribute('data-old')=='close'){
		// dismiss colour chooser
		document.getElementById('colours-wrapper').style.display="none";
		pen.setAttribute('data-old','true');
	}else{
		// only activate pen
		pen.setAttribute('data-old','true');
		document.getElementById('stroke').value=penWidth;
		document.getElementById('erase-cur').style.display="none";
		document.getElementById('canvas').style.cursor="url(pen.cur),crosshair";
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

function strokeChange(){
	var stroke=document.getElementById('stroke').value;
	if(document.getElementById('erase').checked){
		eraseWidth=stroke;
		document.body.style.setProperty("--erase-size",eraseWidth+"px");
	}else{
		penWidth=stroke;
	}
}

function bgColorClick(){
	var btn=document.getElementById('bg-color');
	if(btn.getAttribute('data-open')=='true'){
		// dismiss colour chooser
		document.getElementById('colours-wrapper').style.display="none";
		btn.setAttribute('data-open','true');
	}else{
		// cancel the chooser for pen colour if it was open
		if(document.getElementById('pen').getAttribute('data-old')=='close'){
			document.getElementById('pen').setAttribute('data-old','true');
		}
		// cancel the chooser for grid colour if it was open
		if(document.getElementById('grid').getAttribute('data-open')=='1'){
			document.getElementById('grid').setAttribute('data-open','0');
		}

		// set colour palette for background
		document.getElementById('colour-a').style.backgroundColor="#063";
		document.getElementById('colour-b').style.backgroundColor="#343434";
		document.getElementById('colour-c').style.backgroundColor="#2C4474";
		document.getElementById('colour-d').style.backgroundColor="#FCD4A3";

		// show additional colours
		document.getElementById('colour-c').style.display=
		document.getElementById('colour-d').style.display="initial";

		// hide unused colours
		document.getElementById('colour-e').style.display=
		document.getElementById('colour-f').style.display="none";

		document.getElementById('colour-a').onclick=
		document.getElementById('colour-b').onclick=
		document.getElementById('colour-c').onclick=
		document.getElementById('colour-d').onclick=
		document.getElementById('white').onclick=
		document.getElementById('black').onclick=
		(evt)=>{
			bgColor=rgb2hex(window.getComputedStyle(evt.srcElement).backgroundColor);
			document.body.style.backgroundColor=bgColor;
			document.getElementById('colours-wrapper').style.display="none";
			document.getElementById('bg-color').setAttribute('data-open','false');
		};

		// remove action listener from unused buttons
		document.getElementById('colour-e').onclick=
		document.getElementById('colour-f').onclick=()=>{};

		document.getElementById('chooser').onclick=()=>{
			colorchooser.value=rgb2hex(document.body.style.backgroundColor);
			colorchooser.onchange=function(evt){
				document.body.style.backgroundColor=colorchooser.value;
				bgColor=colorchooser.value;
			};
			document.getElementById('bg-color').setAttribute('data-open','false');
			document.getElementById('colours-wrapper').style.display="none";
			colorchooser.click();
		}

		document.getElementById('bg-color').setAttribute('data-open','true');
		document.getElementById('colours-wrapper').style.display="block";
	}
}

function gridClick(evt){
	evt.preventDefault();
	var g=document.getElementById('grid');
	if(g.getAttribute('data-old')=='0'){
		// cancel the chooser for pen colour if it was open
		if(document.getElementById('pen').getAttribute('data-old')=='close'){
			document.getElementById('pen').setAttribute('data-old','true');
		}
		// cancel the chooser for background colour if it was open
		if(document.getElementById('bg-color').getAttribute('data-open')=='true'){
			document.getElementById('bg-color').setAttribute('data-open','false');
		}

		// grid was already activated, user wants to change color
		g.setAttribute('data-old','1');

		// set colour palette for grid
		document.getElementById('colour-a').style.backgroundColor="#eaeaea";
		document.getElementById('colour-b').style.backgroundColor="#4c4c4c";
		document.getElementById('colour-c').style.backgroundColor="#096";

		// hide unused colours
		document.getElementById('colour-d').style.display=
		document.getElementById('colour-e').style.display=
		document.getElementById('colour-f').style.display="none";

		document.getElementById('colour-a').onclick=
		document.getElementById('colour-b').onclick=
		document.getElementById('colour-c').onclick=
		document.getElementById('white').onclick=
		document.getElementById('black').onclick=
		(evt)=>{
			grid=rgb2hex(window.getComputedStyle(evt.srcElement).backgroundColor);
			document.body.style.setProperty('--grid-color',grid);
			document.getElementById('colours-wrapper').style.display="none";
			document.getElementById('grid').setAttribute('data-old','2');
		};

		// remove action listener from unused buttons
		document.getElementById('colour-d').onclick=
		document.getElementById('colour-e').onclick=
		document.getElementById('colour-f').onclick=()=>{};

		document.getElementById('chooser').onclick=()=>{
			colorchooser.value=rgb2hex(grid);
			colorchooser.onchange=function(evt){
				grid=colorchooser.value;
				document.body.style.setProperty('--grid-color',grid);
			};
			document.getElementById('colours-wrapper').style.display="none";
			document.getElementById('grid').setAttribute('data-old','2');
			evt.preventDefault();
			colorchooser.click();
		}
		document.getElementById('colours-wrapper').style.display="block";
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

// start neutron
setup();
