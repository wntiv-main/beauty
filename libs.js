//element.addEvent: add events so that element.on_____(e) is possible
function addEvent(even_t, callback) {
	if (!this.events) this.events = {};
	if (!this.events[even_t]) {
		this.events[even_t] = [];
		var element = this;
		this['on' + even_t] = function (e) {
			e = e || window.event;
			if (element.events[even_t + '.preventDefault']) e.preventDefault();
			var events = element.events[even_t], r = undefined;
			for (var i = 0; i < events.length; i++) {
				r = events[i](e);
			}
			return r;
		}
	}
	if (typeof callback == 'function' || callback instanceof Function) this.events[even_t].push(callback);
	else if (callback == 'preventDefault') this.events[even_t + '.preventDefault'] = true;
}
HTMLElement.prototype.addEvent = addEvent;
     Window.prototype.addEvent = addEvent;
   Document.prototype.addEvent = addEvent;

//Object.hasProperty(name)
Object.defineProperty(Object.prototype, 'hasProperty', { value: function (name) { return !"undefinednull".includes(typeof this[name]); }, enumerable: false });

//expose a variable to window
function expose(variable) {
	return {
		variable: variable,
		as: function (name) {
			path = name.split('.');
			place = window;
			for (var i = 0; i < path.length - 1; i++) {
				if (!place[path[i]]) place[path[i]] = {};
				place = place[path[i]];
			}
			place[path[path.length - 1]] = this.variable;
		}
	}
}

//settings utilities
function Slider(){}
function Toggle(){}


//noise
(function () {
	const PERLIN_YWRAPB = 4;
	const PERLIN_YWRAP = 1 << PERLIN_YWRAPB;
	const PERLIN_ZWRAPB = 8;
	const PERLIN_ZWRAP = 1 << PERLIN_ZWRAPB;
	const PERLIN_SIZE = 4095;
	let perlin_octaves = 4;
	let perlin_amp_falloff = 0.5;
	const scaled_cosine = i => 0.5 * (1.0 - Math.cos(i * Math.PI));
	let perlin;
	function noise (x, y = 0, z = 0) {
		if (perlin == null) {
			perlin = new Array(PERLIN_SIZE + 1);
			for (let i = 0; i < PERLIN_SIZE + 1; i++) {
				perlin[i] = Math.random();
			}
		}
		if (x < 0) {
			x = -x;
		}
		if (y < 0) {
			y = -y;
		}
		if (z < 0) {
			z = -z;
		}
		let xi = Math.floor(x),
			yi = Math.floor(y),
			zi = Math.floor(z);
		let xf = x - xi;
		let yf = y - yi;
		let zf = z - zi;
		let rxf, ryf;
		let r = 0;
		let ampl = 0.5;
		let n1, n2, n3;
		for (let o = 0; o < perlin_octaves; o++) {
			let of = xi + (yi << PERLIN_YWRAPB) + (zi << PERLIN_ZWRAPB);
			rxf = scaled_cosine(xf);
			ryf = scaled_cosine(yf);
			n1 = perlin[of & PERLIN_SIZE];
			n1 += rxf * (perlin[(of + 1) & PERLIN_SIZE] - n1);
			n2 = perlin[(of + PERLIN_YWRAP) & PERLIN_SIZE];
			n2 += rxf * (perlin[(of + PERLIN_YWRAP + 1) & PERLIN_SIZE] - n2);
			n1 += ryf * (n2 - n1);
			of += PERLIN_ZWRAP;
			n2 = perlin[of & PERLIN_SIZE];
			n2 += rxf * (perlin[(of + 1) & PERLIN_SIZE] - n2);
			n3 = perlin[(of + PERLIN_YWRAP) & PERLIN_SIZE];
			n3 += rxf * (perlin[(of + PERLIN_YWRAP + 1) & PERLIN_SIZE] - n3);
			n2 += ryf * (n3 - n2);
			n1 += scaled_cosine(zf) * (n2 - n1);
			r += n1 * ampl;
			ampl *= perlin_amp_falloff;
			xi <<= 1;
			xf *= 2;
			yi <<= 1;
			yf *= 2;
			zi <<= 1;
			zf *= 2;
			if (xf >= 1.0) {
				xi++;
				xf--;
			}
			if (yf >= 1.0) {
				yi++;
				yf--;
			}
			if (zf >= 1.0) {
				zi++;
				zf--;
			}
		}
		return r;
	};
	function noiseDetail (lod, falloff) {
		if (lod > 0) {
			perlin_octaves = lod;
		}
		if (falloff > 0) {
			perlin_amp_falloff = falloff;
		}
	};
	function noiseSeed (seed) {
		const lcg = (() => {
			const m = 4294967296;
			const a = 1664525;
			const c = 1013904223;
			let seed, z;
			return {
				setSeed(val) {
					z = seed = (val == null ? Math.random() * m : val) >>> 0;
				},
				getSeed() {
					return seed;
				},
				rand() {
					z = (a * z + c) % m;
					return z / m;
				}
			};
		})();
		lcg.setSeed(seed);
		perlin = new Array(PERLIN_SIZE + 1);
		for (let i = 0; i < PERLIN_SIZE + 1; i++) {
			perlin[i] = lcg.rand();
		}
	};
	expose(noise).as('noise.get');
	expose(noiseDetail).as('noise.detail');
	expose(noiseSeed).as('noise.seed');
})();

//length of arrays with negative numbers
function length(a){var r=0;for(var i in a){r++}return r;}

//render heightmap
(function(){
	var canvas = document.createElement('canvas');
	var ctx = canvas.getContext('2d');
	function drawMap(w=100, h=100, src, callback, heightOffset=1, defX=0, defY=0) {//draw a landscape from an image heightmap(pass in image url, (new Image()), or format Object{data:[], width:0, height:0})
		var depth = h;
		var width = w;
		canvas.width = w;
		canvas.height = h;
		ctx.clearRect(0, 0, w, h);
		if (typeof src == "string") {
			var img = new Image();
			img.src = src;
			img.onload = function () {
				var spacingX = width / img.width;
				var spacingZ = depth / img.height;
				ctx.drawImage(img, 0, 0, width, depth);
				var pixel = ctx.getImageData(0, 0, width, depth);
				var geom = new THREE.Geometry();
				var output = [];
				for (var x = 0; x < depth; x++) {
					for (var z = 0; z < width; z++) {
						var yValue = pixel.data[z * 4 + (depth * x * 4)] / heightOffset;
						var vertex = new THREE.Vector3(x * spacingX, yValue, z * spacingZ);
						geom.vertices.push(vertex);
					}
				}
				for (var z = 0; z < depth - 1; z++) {
					for (var x = 0; x < width - 1; x++) {
						var a = x + z * width;
						var b = (x + 1) + (z * width);
						var c = x + ((z + 1) * width);
						var d = (x + 1) + ((z + 1) * width);
						var face1 = new THREE.Face3(a, b, d);
						var face2 = new THREE.Face3(d, c, a);
						geom.faces.push(face1);
						geom.faces.push(face2);
						geom.faces[geom.faces.length - 1].color = new THREE.Color(0xff0000);
					}
				}
				geom.computeVertexNormals(true);
				geom.computeFaceNormals();
				var meshI = new THREE.Mesh(geom, new THREE.MeshPhongMaterial({/*color: 0xf00,*/ side: THREE.DoubleSide, flatShading: !1, /*emissive:0x0f0, specular:0x00f,*/ shininess: 1, fog: true, /*envMap:'reflection'*/ }));
				meshI.position.z = h/2; meshI.position.x = w/2;
				var mesh = new THREE.Object3D();
				mesh.position.x = defX; mesh.position.z = defY;
				mesh.add(meshI);
				callback(mesh);
			}
		} else if ((src instanceof ImageData) || (src['data'] && src['width'] && src['height'])) {
			var offset = src.data.length / (src.width * src.height);
			var spacingX = width / src.width;
			var spacingZ = depth / src.height;
			var geom = new THREE.Geometry();
			var pixel = src;
			var output = [];
			for (var x = 0; x < src.height; x++) {
				for (var z = 0; z < src.width; z++) {
					var yValue = pixel.data[z * offset + (src.height * x * offset)] / heightOffset;
					var vertex = new THREE.Vector3(x * spacingX, yValue, z * spacingZ);
					geom.vertices.push(vertex);
				}
			}
			for (var z = 0; z < src.height - 1; z++) {
				for (var x = 0; x < src.width - 1; x++) {
					var a = x + z * src.width;
					var b = (x + 1) + (z * src.width);
					var c = x + ((z + 1) * src.width);
					var d = (x + 1) + ((z + 1) * src.width);
					var face1 = new THREE.Face3(a, b, d);
					var face2 = new THREE.Face3(d, c, a);
					geom.faces.push(face1);
					geom.faces.push(face2);
					geom.faces[geom.faces.length - 1].color = new THREE.Color(0xff0000);
				}
			}
			geom.computeVertexNormals(true);
			geom.computeFaceNormals();
			var meshI = new THREE.Mesh(geom, new THREE.MeshPhongMaterial({color: 0xf00, side: THREE.DoubleSide, flatShading: !1, emissive:0x0f0, specular:0x00f, shininess: 1, fog: true, /*envMap:'reflection'*/ }));
			var mesh = new THREE.Object3D();
			mesh.position.x = defX; mesh.position.z = defY;
			mesh.add(meshI);
			callback(mesh);
		} else if (src instanceof Image) {
			var spacingX = width / src.width;
			var spacingZ = depth / src.height;
			ctx.drawImage(src, 0, 0, width, depth);
			var pixel = ctx.getImageData(0, 0, width, depth);
			var geom = new THREE.Geometry();
			var output = [];
			for (var x = 0; x < depth; x++) {
				for (var z = 0; z < width; z++) {
					var yValue = pixel.data[z * 4 + (depth * x * 4)] / heightOffset;
					var vertex = new THREE.Vector3(x * spacingX, yValue, z * spacingZ);
					geom.vertices.push(vertex);
				}
			}
			for (var z = 0; z < depth - 1; z++) {
				for (var x = 0; x < width - 1; x++) {
					var a = x + z * width;
					var b = (x + 1) + (z * width);
					var c = x + ((z + 1) * width);
					var d = (x + 1) + ((z + 1) * width);
					var face1 = new THREE.Face3(a, b, d);
					var face2 = new THREE.Face3(d, c, a);
					geom.faces.push(face1);
					geom.faces.push(face2);
					geom.faces[geom.faces.length - 1].color = new THREE.Color(0xff0000);
				}
			}
			geom.computeVertexNormals(true);
			geom.computeFaceNormals();
			var meshI = new THREE.Mesh(geom, new THREE.MeshPhongMaterial({/*color: 0xf00,*/ side: THREE.DoubleSide, flatShading: !1, /*emissive:0x0f0, specular:0x00f,*/ shininess: 1, fog: true, /*envMap:'reflection'*/ }));
			meshI.position.z = h/2; meshI.position.x = w/2;
			var mesh = new THREE.Object3D();
			mesh.position.x = defX; mesh.position.z = defY;
			mesh.add(meshI);
			callback(mesh);
		}
	}
	function HeightMap(){
		this.width = 0;
		this.height = 0;
		this.loadedChunks = [];
		this.data = [];
	}
	HeightMap.prototype.extend = function(data, chunk){
		//data is 2D array, 100*100, convert to 1D
		var formatted = [];
		if(data.length==10000){
			formatted = data;
		}
		else if(data.length==100){
			for(var i=0;i<100;i++){
				[].push.apply(formatted, data[i]);
			}
		}
		else throw new Error('data is not formatted correctly (must be [100 by 100] or [10000])');
		if(typeof this.data[chunk.y]=='undefined')this.data[chunk.y] = [];
		this.data[chunk.y][chunk.x] = formatted;
		if(typeof this.loadedChunks[chunk.y]=='undefined')this.loadedChunks[chunk.y] = [];
		this.loadedChunks[chunk.y][chunk.x] = true;
		this.height = length(this.loadedChunks);
		this.width = 0;
		for(var i in this.loadedChunks){if(length(this.loadedChunks[i])>this.width)this.width = length(this.loadedChunks[i]);}
	};
	HeightMap.prototype.load = function(chunk, callback){
		drawMap(10, 10, {data:this.data[chunk.y][chunk.x], width: 100, height:100}, function(mesh){
			mesh.position.x = 10*chunk.x;
			mesh.position.z = 10*chunk.y;
			mesh.children[0].position.x = mesh.children[0].position.z = -5;
			mesh.children[0].rotation.y = Math.PI/4*3;
			callback(mesh);
		}, 1);
	};
	expose(HeightMap).as('RenderingInstance');
})();
