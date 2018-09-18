// electron stuff

const fs=require('fs');
const path=require('path');
const url=require('url');
const {remote,shell,nativeImage}=require('electron');
const {dialog}=require('electron').remote;
const pdf=require('pdf-poppler');

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

function resize(w,h){
	// get canvas
	canvas=document.getElementById("canvas");
	// check that the canvas isn't already in the right size
	if(canvas.width!==w||canvas.height!==h){
		// resize canvas
		canvas.width=w;
		canvas.height=h;
		// get context
		context=canvas.getContext("2d");
		// setup context
		// this enhances line drawing so there are no sudden gaps in the line
		context.lineJoin="round";
		context.lineCap="round";
		// image was destroyed when canvas was resized so we have to repaint it
		repaintAll();
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
	document.getElementById("save-img").onclick=saveImg;
	document.getElementById('save').onclick=fileSave;
	document.getElementById('open').onclick=fileOpen;
	document.getElementById('undo').onclick=undo;
	document.getElementById('redo').onclick=redo;
	document.getElementById('stroke').oninput=strokeChange;
	document.getElementById('down').onclick=down;
	document.getElementById('quit').onclick=quit;
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
	// initialize canvas and context
	resize(document.body.clientWidth,document.body.clientHeight);
	context.lineWidth=penWidth;
	context.clearRect(0,0,canvas.width,canvas.height);
	// make sure canvas gets resized if window dimension changes
	// but never reduce the canvas size
	document.body.onresize=function(){
		resize(Math.max(canvas.width,document.body.clientWidth),Math.max(canvas.height,document.body.clientHeight));
	};
	// mouse handlers
	canvas.onmousedown=function(evt){
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
		context.moveTo(prevX,prevY);
		context.lineTo(prevX,prevY);
		context.stroke();
	};
	canvas.onmousemove=function(evt){
		if(drawing){
			context.moveTo(prevX,prevY);
			prevX=evt.clientX-canvas.offsetLeft;
			prevY=evt.clientY-canvas.offsetTop+window.scrollY;
			activePath.points.push({
				x:prevX,
				y:prevY
			});
			context.lineTo(prevX,prevY);
			context.stroke();
		}
		// set erasor cursor
		var style=document.body.style;
		style.setProperty("--erase-x",evt.clientX+"px");
		style.setProperty("--erase-y",evt.clientY+"px");
	};
	canvas.onmouseup=function(evt){
		if(typeof evt!=='undefined'&&activePath!=null){
			// this is a real mouse handler call and not a delegation from the touch handler
			evt.stopPropagation();
			evt.preventDefault();
			context.moveTo(prevX,prevY);
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
		context.lineTo(prevX,prevY);
		context.stroke();
		drawing=false;
	};
	document.onmouseup=function(){
		if(drawing){
			// save what was drawn
			image.push(activePath);
			saved=false;
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
		resize(canvas.width,canvas.height+100);
		saved=false;
	}
	window.scrollTo(0,getScrollMaxY());
}

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
		// prepare image export by repainting
		repaintAll();
		// add the background
		context.globalCompositeOperation='destination-over';
		context.fillStyle=bgColor;
		context.fillRect(0,0,canvas.width,canvas.height);
		var data;
		if(f.match(/\.png$/i)!==null){
			// get png data
			data=canvas.toDataURL('image/png');
		}else if(f.match(/\.jpe?g$/i)!==null){
			// get jpg data
			data=canvas.toDataURL('image/jpeg');
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
			}
		});
	});
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

function penClick(){
	var pen=document.getElementById('pen');
	if(pen.getAttribute('data-old')=='true'){
		// pen was already activated, user wants to change color
		colorchooser.value=context.strokeStyle;
		colorchooser.onchange=function(evt){
			penColor=colorchooser.value;
			document.body.style.setProperty("--pen-color",penColor);
			saved=false;
		};
		colorchooser.click();
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
		// background-color was already activated, user wants to change color
		colorchooser.value=rgb2hex(document.body.style.backgroundColor);
		colorchooser.onchange=function(){
			document.body.style.background=colorchooser.value;
			bgColor=colorchooser.value;
			saved=false;
		};
		colorchooser.click();
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
					extensions:['png','jpg','jpeg','pdf']
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
						if(path.extname(bgPath)==".pdf"){
							// enable loader
							document.body.classList.add('loading');
							// copy pdf to local directory so pdf-poppler can handle it correctly
							fs.copyFileSync(bgPath,path.join(process.cwd(),'tmp.pdf'));
							bgPath=path.join(process.cwd(),'tmp.pdf');
							// convert pdf to image
							pdf.info(bgPath).then((size)=>{
								// get number of digits in page numbers
								var pageDigits=size.pages.length;
								// calculate correct size for image extraction
								size=calculateAspectRatioFit(size.width_in_pts,size.height_in_pts,canvas.width,Number.MAX_SAFE_INTEGER);
								let opts={
									format:'jpeg',
									out_dir:process.cwd()+path.sep,
									out_prefix:"tmp",
									page:null,
									// extract the image in the largest size so it does not have to be scaled up
									scale:Math.max(size.width,size.height)
								};
								// correct Windows paths: replace all backslashes with forward slashes
								bgPath=bgPath.replace(/\\/g,"/");
								// extract images
								pdf.convert(bgPath,opts).then(()=>{
									var images=[];
									var promises_or_sizes=[];
									// gather all generated images into array
									for(var i=1;fs.existsSync(formattedPagePath(pageDigits,i));i++){
										var img=new Image();
										images.push(img);
										promises_or_sizes.push(new Promise((resolve,error)=>{
											img.onload=resolve;
										}));
										img.src=url.format({
											pathname:formattedPagePath(pageDigits,i),
											protocol:'file:',
											slashes:true
										}).replace(/\\/g,'/');
									}
									// wait for all images to be loaded
									Promise.all(promises_or_sizes).then(()=>{
										// all images have been loaded
										var height=0;
										for(var i=0;i<images.length;i++){
											promises_or_sizes[i]=calculateAspectRatioFit(images[i].width,images[i].height,canvas.width,Number.MAX_SAFE_INTEGER);
											height+=promises_or_sizes[i].height;
										}
										// draw all images to a single canvas
										var canv=document.createElement('canvas');
										canv.height=height;
										canv.width=canvas.width;
										var contxt=canv.getContext('2d');
										height=0;
										for(var i=0;i<images.length;i++){
											var size=promises_or_sizes[i];
											contxt.drawImage(images[i],0,height,size.width,size.height);
											height+=size.height;
										}
										// extract data url
										bgImg=canv.toDataURL('image/png');
										document.body.style.background="";
										document.body.style.backgroundImage="url("+bgImg+")";
										// done; remove loader
										document.body.classList.remove('loading');
										// cleanup: remove temporary single page images
										for(var i=1;fs.existsSync(formattedPagePath(pageDigits,i));i++){
											fs.unlink(formattedPagePath(pageDigits,i),()=>{/*ok*/});
										}
										// remove temporary pdf
										fs.unlink(path.join(process.cwd(),'tmp.pdf'),()=>{/*ok*/});
									});
								});
							});
						}else{
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
		resize(canvas.width,Math.max(data.height,data.height*imgScale));
	}else if(data.height>canvas.height){
		// canvas was enlarged downward
		resize(canvas.width,data.height);
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
