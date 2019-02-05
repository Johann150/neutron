function fileOpen(){
	var file=document.createElement('input');
	file.type="file";
	file.onchange=(evt)=>{
		var f=evt.target.files[0];
		if(!f.name.endsWith('.nbrd')){
			alert('falsches Dateiformat');
			return;
		}
		var reader=new FileReader();
		reader.onload=()=>{
			if(saved&&confirm("aktuelles Tafelbild wird überschrieben!")){
				_fileRead(JSON.parse(reader.result));
			}
		};
		reader.readAsBinaryString(f);
	};
	file.click();
}

function _fileRead(data){
	// reset everything
	setup();
	// load data
	bgColor=rgb2hex(data.bg);
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
	document.body.style.backgroundColour=bgColor;
	penWidth=data.penWidth;
	document.getElementById('stroke').value=penWidth;
	penColor=data.penColor;
	context.strokeStyle=penColor;
	document.body.style.setProperty("--pen-color",penColor);
	eraseWidth=data.eraseWidth;
	gridColor=data.gridColor;
	document.body.style.setProperty("--grid-color",gridColor);
	saved=true;
	// make sure everything will be visible
	for(var i=0;i<image.length;i++){
		resize(Math.max(image[i].points.max(),height));
	}
}
