// electron stuff

const fs=require('fs');
const {remote} = require('electron');
const {dialog} = require('electron').remote;

var filePath;

// main page javascript

var image,activePath,redoStack,penColor,bgColor,penWidth,eraseWidth,colorchooser,drawing,prevX,prevY;

function circle(ctx){
	ctx.beginPath();
	ctx.arc(400,400,100,0,2*Math.PI);
	ctx.stroke();
}

function ellipse(ctx,x,y,width,height){
	ctx.save();
	ctx.beginPath();
	ctx.translate(x-width, y-height);
	ctx.scale(width, height);
	ctx.arc(1, 1, 1, 0, 2 * Math.PI, false);
	ctx.restore();
	ctx.stroke();
}

function resize(w,h){
	// get canvas
	canvas = document.getElementById("canvas");
	// check that the canvas isn't already in the right size
	if(canvas.width!==w&&canvas.height!==h){
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
	// make sure canvas gets resized if window dimension changes
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
	document.getElementById("save-img").onclick=function(evt){
		saveImg(document.getElementById("save-img"),evt);
		evt.preventDefault();
		evt.stopPropagation();
	};
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
}

function down(){
	if(window.scrollY>=getScrollMaxY()){
		resize(canvas.width,canvas.height+100);
	}
	window.scrollTo(0,getScrollMaxY());
}

function saveImg(anchor,evt){
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
		// TODO
		// anchor.setAttribute('download', filename);
		// anchor.setAttribute('href', canvas.toDataURL());
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
		// start at 0 again to also draw single points
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


function rgb2hex(rgb){
	rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
	return (rgb && rgb.length === 4) ? "#" +
		("0" + parseInt(rgb[1],10).toString(16)).slice(-2) +
		("0" + parseInt(rgb[2],10).toString(16)).slice(-2) +
		("0" + parseInt(rgb[3],10).toString(16)).slice(-2) : '';
}

function bgColorClick(){
	var btn=document.getElementById('bg-color');
	if(btn.getAttribute('data-old')=='true'){
		// background-color was already activated, user wants to change color
		bgColorChange();
		bgColor=colorchooser.value;
	}else{
		// only activate pen
		btn.setAttribute('data-old','true');
		document.body.style.background=bgColor;
	}
}

function bgColorChange(){
	colorchooser.value=rgb2hex(document.body.style.backgroundColor);
	colorchooser.onchange=function(){
		document.body.style.background=colorchooser.value;
	};
	colorchooser.click();
}

function bgTransClick(){
	document.getElementById('bg-color').setAttribute('data-old','false');
	document.body.style.background="transparent";
}

function fileSave(closing){
	var closing = (typeof closing !== 'undefined') ? closing : false;
	if(filePath===undefined){
		let options={
			title:'Tafelbild speichern',
			buttonLabel:'Speichern',
			filters:[
				{
					name:'JSON',
					extensions:['json']
				}
			]
		};
		dialog.showSaveDialog(options,(f)=>{
			if(f===undefined){
				return; // canceled
			}
			filePath=f;
			if(filePath!==undefined){
				var data={
					image:image,
					bg:rgb2hex(document.body.style.backgroundColor),
					penWidth:penWidth,
					penColor:penColor,
					eraseWidth:eraseWidth,
					redoStack:redoStack
				};
				fs.writeFile(f,JSON.stringify(data),(err)=>{
					if(err){
						alert("Beim speichern ist ein Fehler aufgetreten: "+err.message);
						// we don't want to close the program if there was an error
					}else{
						// saving done sucessfully.
						// If we have to, we can now close the window without any fear of data loss.
						if(closing){
							window.close();
						}
					}
				});
			}
		});
	}else{
		var data={
			image:image,
			bg:document.body.style.backgroundColor,
			penWidth:penWidth,
			penColor:penColor,
			eraseWidth:eraseWidth,
			redoStack:redoStack
		};
		fs.writeFile(filePath,JSON.stringify(data),(err)=>{
			if(err){
				alert("Beim speichern ist ein Fehler aufgetreten: "+err.message);
			}else{
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
		buttonLabel:'Öffnen',
		filters:[
			{
				name:'JSON',
				extensions:['json']
			}
		],
		properties:['openFile']
	};
	dialog.showOpenDialog(options,(f)=>{
		if(f.length!=='undefined'){
			filePath=f[0];
			var data=JSON.parse(fs.readFileSync(f[0]));
			image=data.image;
			if(data.bg=='transparent'){
				bgTransClick();
			}else{
				bgColor=rgb2hex(data.bg);
			}
			repaintAll();
			redoStack=data.redoStack;
			document.body.backgroundColor=bgColor;
			penWidth=data.penWidth;
			document.getElementById('stroke').value=penWidth;
			penColor=data.penColor;
			context.strokeStyle=penColor;
			eraseWidth=data.eraseWidth;
		}
	});
}

function quit(){
	let options={
		type:'question',
		title:'Neutron',
		message:'Vor dem Beenden speichern?',
		buttons:['Ja','Nein','Abbrechen'],
		// when hitting Esc, option 'Abbrechen' will be used
		cancelId:2,
		defaultId:2
	};
	if(image.length>0||redoStack.length>0){
		dialog.showMessageBox(options,(btnCode)=>{
			switch (btnCode) {
				case 0:
					// save and then exit
					fileSave(true);
					break;
				case 1:
					// don't save, just exit
					window.close();
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
