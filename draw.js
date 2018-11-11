// electron stuff

const fs=require('fs');
const path=require('path');
const url=require('url');
const {remote}=require('electron');
const {dialog}=require('electron').remote;

var filePath; // file path to use for saving

// main page javascript

var canvas; // main canvas for drawing
var context; // 2d drawing context
var image; // an array of former activePath's
var activePath; // object storing information on how to recreate a certain drawing feature
var redoStack; // array storing former activePath's that have been undone to be redone
var penColor; // the current colour used to draw as a string (e.g. "#ffffff")
var bgColor; // the current colour used for the background as a css value (e.g)
var bgImg; // image data for a background image
var penWidth; // width used to draw with the pen tool
var eraseWidth; // width used to erase something; usually >penWidth
var colorchooser; // DOM element: <input type="color">
var drawing; // boolean, wether the user is drawing at the moment
var prevX; // the previous x coordinate when drawing
var prevY; // the previous y coordinate when drawing
var saved; // boolean, wether the active state has been modified since the last save

function resize(h){
	// check that the body isn't already the right size
	if(parseInt(document.body.style.height)!==h){
		document.body.style.height=h+"px";
	}
}

function checkTemplateFile(){
	var f=path.join(process.cwd(),'template.nbrd');
	fs.stat(f,(err,stat)=>{
		if(err==null){
			// file exists
			console.log("opening template file");
			_fileRead(f);
		}
	});
}

function setupHandlers(){
	document.querySelector('label[for=pen]').onclick=penClick;
	document.querySelector('label[for=erase]').onclick=eraseClick;
	document.querySelector('label[for=bg-color]').onclick=bgColorClick;
	document.querySelector('label[for=bg-img]').onclick=bgImgClick;
	document.getElementById('save').onclick=fileSave;
	document.getElementById('open').onclick=fileOpen;
	document.getElementById('undo').onclick=undo;
	document.getElementById('redo').onclick=redo;
	document.getElementById('stroke').oninput=strokeChange;
	document.getElementById('down').onclick=down;
	document.getElementById('quit').onclick=quit;
	window.onscroll=repaintAll;
}

function setup(){
	setupHandlers();
	// grey-out undo and redo buttons
	document.getElementById('undo').style.filter="brightness(50%)";
	document.getElementById('redo').style.filter="brightness(50%)";
	// enable file drag'n'drop
	document.body.ondragover=()=>{return false;};
	document.body.ondragleave=()=>{return false;};
	document.body.ondragend=()=>{return false;};
	document.body.ondrop=(e)=>{
		e.preventDefault();
		e.stopPropagation();
		for(let f of e.dataTransfer.files){
			if(f.path.endsWith('.nbrd')){
				// file has right file extension so open it
				filePath=f.path;
				fileRead(filePath);
				// there can't be multiple files open so stop when the first valid one is found
				break;
			}
		}
		return false;
	};
	// initialize variables
	image=[];
	activePath=null;
	redoStack=[]
	penColor="#ffffff";
	document.body.style.setProperty("--pen-color",penColor);
	bgColor="#006633";
	bgImg=null;
	document.body.style.background=bgColor;
	penWidth=2;
	eraseWidth=50;
	document.getElementById('stroke').value=penWidth;
	drawing=false;
	prevX=0;
	prevY=0;
	saved=true;
	colorchooser=document.createElement('input');
	colorchooser.type="color";
	// get canvas
	canvas=document.getElementById("canvas");
	// initialize canvas and context
	canvas.width=document.documentElement.clientWidth;
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
	// key handlers
	document.onkeyup=function(evt){
		if(evt.keyCode==27){
			// Esc
			quit();
		}else if(evt.keyCode==83&&evt.ctrlKey){
			// Ctrl+S
			fileSave();
		}else if(evt.keyCode==79&&evt.ctrlKey){
			// Ctrl+O
			fileOpen();
		}else if(evt.keyCode==123){
			// F12
			remote.getCurrentWebContents().toggleDevTools();
		}
	};
	// look for default template file
	if(checkTemplateFile){
		// this should only happen on startup
		checkTemplateFile();
		checkTemplateFile=false;
	}
}

function down(){
	if(window.scrollY>=getScrollMaxY()){
		resize(parseInt(document.body.style.height,10)+100);
		saved=false;
	}
	window.scrollTo(0,getScrollMaxY());
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
					context.moveTo(point.x,point.y-window.scrollY);
					moved=true;
				}
				// always make a line to also draw lines consisting of one point only
				context.lineTo(point.x,point.y-window.scrollY);
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
		if(document.getElementById('bg-color').getAttribute('data-old')=='close'){
			document.getElementById('bg-color').setAttribute('data-old','true');
		}

		// pen was already activated, user wants to change color
		document.getElementById('pen').setAttribute('data-old','close');

		// set colour palette for pen
		document.getElementById('colour-a').style.backgroundColor="#dd0622";
		document.getElementById('colour-b').style.backgroundColor="#f8ba00";
		document.getElementById('colour-c').style.backgroundColor="#2676cc";
		document.getElementById('colour-d').style.backgroundColor="#0cfc04";
		document.getElementById('colour-e').style.backgroundColor="#b41c74";
		document.getElementById('colour-f').style.backgroundColor="#ccd4d4";

		// show additional colours
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
			document.getElementById('pen').setAttribute('data-old','true');
			penColor=rgb2hex(window.getComputedStyle(evt.srcElement).backgroundColor);
			document.body.style.setProperty("--pen-color",penColor);
			saved=false;
			document.getElementById('colours-wrapper').style.display="none";
		};

		document.getElementById('chooser').onclick=()=>{
			colorchooser.value=context.strokeStyle;
			colorchooser.onchange=function(evt){
				penColor=colorchooser.value;
				document.body.style.setProperty("--pen-color",penColor);
				saved=false;
			};
			document.getElementById('pen').setAttribute('data-old','true');
			document.getElementById('colours-wrapper').style.display="none";
			colorchooser.click();
		}
		document.getElementById('colours-wrapper').style.display="block";
	}else if(pen.getAttribute('data-old')=='close'){
		// dismiss colour chooser
		document.getElementById('colours-wrapper').style.display="none";
		document.getElementById('pen').setAttribute('data-old','true');
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
	saved=false;
}

function bgColorClick(){
	var btn=document.getElementById('bg-color');
	if(btn.getAttribute('data-old')=='true'){
		// cancel the chooser for pen colour if it was open
		if(document.getElementById('pen').getAttribute('data-old')=='close'){
			document.getElementById('pen').setAttribute('data-old','true');
		}

		// background-color was already activated, user wants to change colour
		document.getElementById('bg-color').setAttribute('data-old','close');

		// set colour palette for background
		document.getElementById('colour-a').style.backgroundColor="#063";
		document.getElementById('colour-b').style.backgroundColor="#343434";
		document.getElementById('colour-c').style.backgroundColor="#2C4474";
		document.getElementById('colour-d').style.backgroundColor="#FCD4A3";

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
			document.body.style.background=bgColor;
			saved=false;
			document.getElementById('colours-wrapper').style.display="none";
			document.getElementById('bg-color').setAttribute('data-old','true');
		};

		// remove action listener from unused buttons
		document.getElementById('colour-e').onclick=
		document.getElementById('colour-f').onclick=()=>{};

		document.getElementById('chooser').onclick=()=>{
			colorchooser.value=rgb2hex(document.body.style.backgroundColor);
			colorchooser.onchange=function(evt){
				document.body.style.background=colorchooser.value;
				bgColor=colorchooser.value;
				saved=false;
			};
			document.getElementById('bg-color').setAttribute('data-old','true');
			document.getElementById('colours-wrapper').style.display="none";
			colorchooser.click();
		}
		document.getElementById('colours-wrapper').style.display="block";
	}else if(btn.getAttribute('data-old')=='close'){
		// dismiss colour chooser
		document.getElementById('colours-wrapper').style.display="none";
		btn.setAttribute('data-old','true');
	}else{
		// only activate normal background
		btn.setAttribute('data-old','true');
		document.body.style.background=bgColor;
	}
}

function bgImgClick(){
	var btn=document.getElementById('bg-color');
	if(btn.getAttribute('data-old')=='false'||bgImg==null){
		// change image
		let options={
			title:'Hintergrundbild öffnen',
			defaultPath:process.cwd(),
			buttonLabel:'Öffnen',
			filters:[
				{
					name:'Alle',
					extensions:['png','jpg','jpeg']
				}
			],
			properties:['openFile']
		};
		dialog.showOpenDialog(options,(f)=>{
			if(typeof f!=='undefined'){
				var bgPath=f[0];
				fs.stat(bgPath,(err,stat)=>{
					if(err==null){
						// file exists
						var img=new Image();
						img.onload=function(){
							var canv=document.createElement('canvas');
							if(this.naturalWidth>1600){
								// if too big resize image so the data url does not get too large
								canv.width=1600;
								// resize appropriately
								canv.height=this.naturalHeight*1600/this.naturalWidth;
							}else{
								canv.width=this.naturalWidth;
								canv.height=this.naturalHeight;
							}
							canv.getContext('2d').drawImage(this,0,0,canv.width,canv.height);
							bgImg=canv.toDataURL('image/png');
							// remove background colour and use image instead
							document.body.style.background="";
							document.body.style.backgroundImage="url("+bgImg+")";
						};
						img.src=bgPath;
					}
				});
			}
		});
	}else{
		// only activate background image
		btn.setAttribute('data-old','false');
		document.body.style.background="";
		document.body.style.backgroundImage="url("+bgImg+")";
	}
	saved=false;
}

function fileSave(closing){
	var closing=(typeof closing!=='undefined')?closing:false;
	var data={
		image:image,
		bg:document.body.style.background,
		penWidth:penWidth,
		penColor:penColor,
		eraseWidth:eraseWidth,
		redoStack:redoStack,
		width:canvas.width,
		height:canvas.height
	};
	if(filePath===undefined){
		var date=new Date();
		let options={
			title:'Tafelbild speichern',
			buttonLabel:'Speichern',
			defaultPath:path.join(process.cwd(),date.getFullYear()+'-'+(date.getMonth()+1)+'-'+date.getDate()+'.nbrd'),
			filters:[
				{
					name:'Neutron-Tafelbild',
					extensions:['nbrd']
				}
			]
		};
		dialog.showSaveDialog(options,(f)=>{
			if(f===undefined){
				return; // canceled
			}
			filePath=f;
			if(filePath!==undefined){
				fs.writeFile(f,JSON.stringify(data),(err)=>{
					if(err){
						alert("Beim Speichern ist ein Fehler aufgetreten: "+err.message);
						// we don't want to close the program if there was an error
					}else{
						// saving done sucessfully.
						// If we have to, we can now close the window without any fear of data loss.
						saved=true;
						if(closing){
							window.close();
						}
					}
				});
			}
		});
	}else{
		fs.writeFile(filePath,JSON.stringify(data),(err)=>{
			if(err){
				alert("Beim Speichern ist ein Fehler aufgetreten: "+err.message);
			}else{
				saved=true;
				if(closing){
					window.close();
				}
			}
		});
	}
}

function fileOpen(){
	let options={
		title:'Tafelbild öffnen',
		defaultPath:process.cwd(),
		buttonLabel:'Öffnen',
		filters:[
			{
				name:'Neutron-Tafelbild',
				extensions:['nbrd']
			}
		],
		properties:['openFile']
	};
	dialog.showOpenDialog(options,(f)=>{
		if(typeof f!=='undefined'){
			filePath=f[0];
			fileRead(filePath);
		}
	});
}

function quit(){
	if(!saved){
		let options={
			type:'question',
			title:'Neutron',
			message:'Vor dem Beenden speichern?',
			buttons:['Ja','Nein','Abbrechen'],
			// when hitting Esc, option 'Abbrechen' will be used
			cancelId:2,
			defaultId:2
		};
		dialog.showMessageBox(options,(btnCode)=>{
			switch(btnCode){
				case 0:
					// save and then exit
					fileSave(true);
					break;
				case 1:
					// don't save, just exit
					window.close();
					break;
				case 3:
					// cancel so do nothing
					break;
			}
		});
	}else{
		// nothing too important to save
		window.close();
	}
}

function fileRead(f){
	if(!saved){
		// there are unsaved changes
		let options={
			type:'question',
			title:'Neutron',
			message:'Vor dem Öffnen speichern?',
			buttons:['Ja','Nein','Abbrechen'],
			// when hitting Esc, option 'Abbrechen' will be used
			cancelId:2,
			defaultId:2
		};
		dialog.showMessageBox(options,(btnCode)=>{
			switch(btnCode){
				case 0:
					// save
					fileSave();
					filePath=f;
					_fileRead(f);
					break;
				case 1:
					// discard changes
					_fileRead(f);
					break;
				case 3:
					// cancel so do nothing
					break;
			}
		});
	}else{
		_fileRead(f);
	}
}

function _fileRead(f){
	// reset everything
	setup();
	// load data
	var data=JSON.parse(fs.readFileSync(f));
	if(data.bg.startsWith('url(')){
		// background image
		bgImg=data.bg.substr(4);
		bgImg=bgImg.substr(0,bgImg.length-1);
		// switch on corresponding button
		document.getElementById('bg-img').checked=true;
		document.getElementById('bg-color').setAttribute('data-old','false');
	}else{
		bgColor=rgb2hex(data.bg);
	}
	if(data.image==null){
		image=[];
		document.getElementById('undo').style.filter="brightness(50%)";
	}else{
		image=data.image;
		document.getElementById('undo').style.filter="";
	}
	if(data.width!=canvas.width){
		// adjust for different screen size
		var imgScale=canvas.width/data.width;
		for(var obj in image){
			for(var pt in obj.points){
				pt.x*=imgScale;
				pt.y*=imgScale;
			}
		}
		resize(Math.max(data.height,data.height*imgScale));
	}else if(data.height>canvas.height){
		// canvas was enlarged downward
		resize(data.height);
	}
	repaintAll();
	redoStack=data.redoStack;
	if(redoStack.length>0){
		document.getElementById('redo').style.filter="";
	}else{
		document.getElementById('redo').style.filter="brightness(50%)";
	}
	if(bgImg==null){
		document.body.style.background=bgColor;
	}else{
		document.body.style.background="";
		document.body.style.backgroundImage="url("+bgImg+")";
	}
	penWidth=data.penWidth;
	document.getElementById('stroke').value=penWidth;
	penColor=data.penColor;
	context.strokeStyle=penColor;
	document.body.style.setProperty("--pen-color",penColor);
	eraseWidth=data.eraseWidth;
	saved=true;
}

// start neutron
setup();
