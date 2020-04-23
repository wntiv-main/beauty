window.addEvent('load', function(){
	var scene = new THREE.Scene();
	var game = document.getElementById("game");
	var focused = false;
	var closable = true;
	var reservedKeys = {
		chars: ["F5"], 
		codes: [116]
	};
	var player = {
		inventory:{
			inventory: [], 
			armour: [], 
			hotbar: {
				_: [], 
				selected: 0
			},
			onchange: function(){}, 
			addEvent: addEvent
		}
	};
	var settings = {
		FOV: 45, 
		renderDistance: 1000,
		sensitivity: 0, 
		camera: "First Person", 
		calcSensitivity: function(){
			//-99 - 1000
			return 0.1+0.1*(this.sensitivity/100);
		}, 
		fullscreen: false, 
		pointerlock: true, 
		onchange: function(){},  
		addEvent: addEvent
	};
	settings.onchange(settings);
	var mouse = {
				//left, right, middle, back, forward
		buttons: [false, false, false, false, false], 
		wheel: 0, 
		pointerIds: [], 
		onchange: function(){},  
		addEvent: addEvent
	};
	var cameras = {"First Person": 'fp', "Third Person 1": 'tp1', "Third Person 2": 'tp2', cameras: ["First Person", "Third Person 1", "Third Person 2"]};
	var camera = {gyroY: new THREE.Object3D(), gyroX: new THREE.Object3D(), shell: null, fp: null, tp1: null, tp2: null};
	camera.shell = (function(THREE){
		var g = new THREE.BoxGeometry(0.5, 2, 0.5);
		var m = new THREE.MeshBasicMaterial({color: 0xff0000, opacity:0, transparent:true});
		var c = new THREE.Mesh(g, m);
		return c;
	})(THREE);
	camera.fp = new THREE.PerspectiveCamera(settings.FOV, window.innerWidth/window.innerHeight, 0.1, settings.renderDistance);
	camera.fp.position.z = 0.4;
	camera.gyroX.add(camera.fp);

	camera.tp1 = new THREE.PerspectiveCamera(settings.FOV, window.innerWidth/window.innerHeight, 0.1, settings.renderDistance);
	camera.tp1.position.z = 10;
	camera.gyroX.add(camera.tp1);
	
	camera.tp2 = new THREE.PerspectiveCamera(settings.FOV, window.innerWidth/window.innerHeight, 0.1, settings.renderDistance);
	camera.tp2.position.z = -10;
	camera.tp2.rotation.y = Math.PI;
	camera.gyroX.add(camera.tp2);

	camera.gyroY.add(camera.gyroX);
	camera.shell.add(camera.gyroY);
	scene.add(camera.shell);
	var renderer = new THREE.WebGLRenderer(), rdE = renderer.domElement;
	renderer.setSize(window.innerWidth, window.innerHeight);
	game.appendChild(rdE);
	window.addEvent('resize', function(){
		camera.fp.aspect = window.innerWidth/window.innerHeight;
		camera.fp.updateProjectionMatrix();
		camera.tp1.aspect = window.innerWidth/window.innerHeight;
		camera.tp1.updateProjectionMatrix();
		camera.tp2.aspect = window.innerWidth/window.innerHeight;
		camera.tp2.updateProjectionMatrix();
		renderer.setSize(window.innerWidth, window.innerHeight);
	});
	rdE.addEvent('click', function(){
		if(!focused){
			if(settings.fullscreen){
				if(game.requestFullscreen)game.requestFullscreen();
				if(game.requestFullScreen)game.requestFullScreen();
				if(game.webkitRequestFullscreen)game.webkitRequestFullscreen();
				if(game.webkitRequestFullScreen)game.webkitRequestFullScreen();
			}
			if(settings.pointerlock){
				if(rdE.requestPointerLock)rdE.requestPointerLock();
				if(rdE.mozRequestPointerLock)rdE.mozRequestPointerLock();
			}
		}
	});
	rdE.addEvent('pointerdown', function(e){
		if(!settings.pointerlock){
			focused = true;
			rdE.setPointerCapture(e.pointerId);
		}
		if(!mouse.pointerIds.includes(e.pointerId)){
			mouse.pointerIds.push(e.pointerId);
			mouse.onchange({type:"pointeradded", detail:mouse});
		}
	});
	rdE.addEvent('mousedown', function(e){
		mouse.onchange({type:"mousedown", detail:mouse});
		var buttonsPressed = [0, 0, 0, 0, 0];
		if(e.hasProperty('buttons')){
			var buttonIndicies = [1, 2, 4, 8, 16];
			var binButtons = e.buttons;
			for(var i=16;i>0;i/=2){
				if(binButtons>=i){
					binButtons-=i;
					buttonsPressed[buttonIndicies.indexOf(i)] = 1;
				}
			}
		}
		if(e.hasProperty('button')){
			var buttonIndicies = [0, 2, 1, 3, 4];
			buttonsPressed[buttonIndicies.indexOf(e.button)] = 1;
		}else if(e.hasProperty('which')){
			var buttonIndicies = [1, 3, 2, null, null, 0];
			buttonsPressed[buttonIndicies.indexOf(e.button)] = 1;
		}
		for(var i=0;i<buttonsPressed.length;i++){
			if(buttonsPressed[i])mouse.buttons[i] = true;
		}
	});
	rdE.addEvent('pointerup', function(e){
		if(!settings.pointerlock){
			focused = false;
			rdE.releasePointerCapture(e.pointerId);
		}
	});
	window.addEvent('mouseup', function(e){
		mouse.onchange({type:"mouseup", detail:mouse});
		var buttonsPressed = [0, 0, 0, 0, 0];
		if(e.hasProperty('buttons')){
			var buttonIndicies = [1, 2, 4, 8, 16];
			var binButtons = e.buttons;
			for(var i=16;i>0;i/=2){
				if(binButtons>=i){
					binButtons-=i;
					buttonsPressed[buttonIndicies.indexOf(i)] = 1;
				}
			}
			mouse.buttons = [false, false, false, false, false];
			for(var i=0;i<buttonsPressed.length;i++){
				if(buttonsPressed[i])mouse.buttons[i] = true;
			}
		}else{
			if(e.hasProperty('button')){
				var buttonIndicies = [0, 2, 1, 3, 4];
				buttonsPressed[buttonIndicies.indexOf(e.button)] = 1;
			}else if(e.hasProperty('which')){
				var buttonIndicies = [1, 3, 2, null, null, 0];
				buttonsPressed[buttonIndicies.indexOf(e.button)] = 1;
			}
			for(var i=0;i<buttonsPressed.length;i++){
				if(buttonsPressed[i])mouse.buttons[i] = false;
			}
		}
	});
	document.addEvent('pointerlockchange', function(){focused = !focused;});
	document.addEvent('pointerlockerror', function(){settings.pointerlock = false;settings.onchange(settings);});
	document.addEvent('fullscreenerror', function(){settings.fullscreen = false;settings.onchange(settings);});
	document.addEvent('wheel', function(e){if(mouse.buttons[2]&&Math.abs(e.deltaY/100)>2)return;mouse.wheel+=e.deltaY/100;mouse.onchange({type:"wheelchange", detail:mouse, delta: e.deltaY/100});}); 
	document.addEvent('contextmenu', 'preventDefault');
	document.addEventListener('keydown', function(e){e=e||event;if(focused&&(reservedKeys.chars.includes(e.char)||reservedKeys.chars.includes(e.key)||reservedKeys.codes.includes(e.charCode)||reservedKeys.codes.includes(e.keyCode)||reservedKeys.codes.includes(e.which)))e.preventDefault();});
	document.addEventListener('mousedown', function(e){e=e||event;if(focused)e.preventDefault();});
	window.addEvent('beforeunload', ()=>{if(!closable||focused)return 0;});
	window.addEvent('keyup', function(e){
		if(e.code=="F5"||e.key=="F5"||e.charCode==116||e.keyCode==116||e.which==116){
			settings.camera = cameras.cameras[(cameras.cameras.indexOf(settings.camera) + 1)%cameras.cameras.length];
			settings.onchange(settings);
		}
	});
	mouse.addEvent('change', function(e){
		if(e.type=='wheelchange'){
			player.inventory.hotbar.selected += e.delta;
			player.inventory.hotbar.selected = Math.floor(player.inventory.hotbar.selected);
			player.inventory.hotbar.selected %= 7;
			while(player.inventory.hotbar.selected<0)player.inventory.hotbar.selected+=7;
		}
	});
	settings.addEvent('change', function(e){
		camera.shell.material.transparent = e.camera=='First Person';
		if(!e.pointerlock)document.exitPointerLock();
		if(!e.fullscreen)document.exitFullscreen();
		camera.fp.fov = e.FOV;
		camera.fp.far = e.renderDistance;
		camera.fp.updateProjectionMatrix();
		camera.tp1.fov = e.FOV;
		camera.tp1.far = e.renderDistance;
		camera.tp1.updateProjectionMatrix();
		camera.tp2.fov = e.FOV;
		camera.tp2.far = e.renderDistance;
		camera.tp2.updateProjectionMatrix();
	});
	rdE.addEvent('mousemove', function(e){
		if(!focused)return;
		var r1 = (!!settings.pointerlock?-1:1), r2 = (settings.camera=='Third Person 2'?-1:1), r3 = (settings.pointerlock||settings.camera=='First Person'?1:-1);
		camera.gyroY.rotation.y += e.movementX*settings.calcSensitivity()/180*Math.PI*r1*r3;
		camera.gyroX.rotation.x = Math.min(Math.max(camera.gyroX.rotation.x + e.movementY*settings.calcSensitivity()/180*Math.PI*r1*r2*r3, -Math.PI/2), Math.PI/2);
	});
	(function THREEAnimationLoop(){
		renderer.render(scene, camera[cameras[settings.camera]]);
		requestAnimationFrame(THREEAnimationLoop);
	})();

	var geometry = new THREE.BoxGeometry(1, 1, 1);
	var material = new THREE.MeshBasicMaterial({color: 0x00ff00});
	var cube = new THREE.Mesh( geometry, material );
	cube.position.z = -5;
	scene.add(cube);

	var geometry = new THREE.BoxGeometry(1, 1, 1);
	var material = new THREE.MeshBasicMaterial({color: 0x00ff00});
	var cube = new THREE.Mesh( geometry, material );
	cube.position.y = -5;
	scene.add(cube);

	expose(settings).as('settings');
	expose(mouse).as('mouse.info');
	expose(scene).as('THREE.myScene');
	expose(camera.shell).as('camera.shell');
	expose(player).as('player');
});
if(document.readyState=='interactive'||document.readyState=='complete')window.onload();
