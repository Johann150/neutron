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
			var data=JSON.parse(reader.result);
			console.log(data);
		};
		reader.readAsBinaryString(f);
	};
	file.click();
}
