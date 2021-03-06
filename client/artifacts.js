function getPalette(rng){
	var r=Math.floor(rng()*255);
	var g=Math.floor(rng()*255);
	var b=Math.floor(rng()*255);
	return [
		rgb(r,g,b),
		rgb(Math.floor(r+rng()*100+50)%255,Math.floor(g+rng()*100+50)%255,Math.floor(b+rng()*100+50)%255)
	];
}

function getArtifact(_seed){
	var rng=seed(_seed);
	if(getArtifact.recursion == 0){
		getArtifact.palette=getPalette(rng);
	}
	++getArtifact.recursion;


	var g = new PIXI.Graphics();


	var path=[0,0,rng()*16-rng()*16,rng()*16-rng()*16];
	while(Math.abs(path[2])+Math.abs(path[3]) < 1 ){
		path[2]=rng()*16-rng()*16;
		path[3]=rng()*16-rng()*16;
	}

	var p=fractalCurve({
		start_path:path,
		iterations:3+rng()*4,
		degradation:rng()*1,
		angle:90+10*rng()
	});


	// scale points
	var scale=[rng()+0.5,rng()+0.5];
	for(var i=0;i<p.length-1;i+=2){
		p[i]*=scale[0];
		p[i+1]*=scale[1];
	}


	// offset points
	var offset=[rng()*64-rng()*64,rng()*64-rng()*64];

	for(var i=0;i<p.length-1;i+=2){
		p[i]+=offset[0];
		p[i+1]+=offset[1];
	}

	// reflect points
	var reflect_count=Math.floor(rng()*3)+1;

	for(var r=1;r<reflect_count;++r){
		var l=p.length;
		var reflection_ratio=Math.floor(1+rng()*15);
		var v=[
			p[Math.round(l/reflection_ratio)-2]-p[0],
			p[Math.round(l/reflection_ratio)-1]-p[1]
		];
		for(var i=l-2;i>=0;i-=2){
			var t=reflect([p[i],p[i+1]],v)
			p.push(t[0]);
			p.push(t[1]);
		}
	}

	// get bounds
	var bounds=[Infinity,Infinity,-Infinity,-Infinity];
	for(var i=0;i<p.length-1;i+=2){
		bounds[0]=Math.min(bounds[0],p[i]);
		bounds[2]=Math.max(bounds[2],p[i]);
		bounds[1]=Math.min(bounds[1],p[i+1]);
		bounds[3]=Math.max(bounds[3],p[i+1]);
	}

	if(bounds[0]==bounds[2] || bounds[1]==bounds[3]){
		console.error("artifact has no area");
	}

	bounds.max=Math.max(bounds[2]-bounds[0],bounds[3]-bounds[1]);
	for(var i=0;i<p.length-1;i+=2){
		p[i]-=bounds[0];
		p[i]/=bounds.max;
		p[i+1]-=bounds[1];
		p[i+1]/=bounds.max;

		p[i]*=size[0]/10;
		p[i+1]*=size[1]/10;
	}



	// triangulate
	var triangles=[];
	for(var i=0;i<p.length-3;i+=2){
		triangles.push(new PIXI.Polygon([0,0,
			p[i],p[i+1],
			p[i+2],p[i+3]
		]));
	}
	
	
	//outlines
	g.beginFill(0,0);
	for(var i=0;i<triangles.length;++i){
		g.lineStyle(5, getArtifact.palette[0], 1);
		g.moveTo(triangles[i].points[0],triangles[i].points[1]);
		g.lineTo(triangles[i].points[2],triangles[i].points[3]);
		g.lineStyle(5, getArtifact.palette[0], 1);
		g.lineTo(triangles[i].points[4],triangles[i].points[5]);
	}
	g.endFill();
	 

	// primary
	for(var i=0;i<triangles.length;++i){
		g.beginFill(getArtifact.palette[0]);
		g.lineStyle(0,0,0);
		g.moveTo(triangles[i].points[0],triangles[i].points[1]);
		g.lineTo(triangles[i].points[2],triangles[i].points[3]);
		g.lineTo(triangles[i].points[4],triangles[i].points[5]);
		g.lineTo(triangles[i].points[0],triangles[i].points[1]);
		g.endFill();
	}
	
	// secondary
	var skip=Math.round(rng()*15+5);
	g.beginFill(getArtifact.palette[1],1);
	g.lineStyle(0,0,0);
	for(var i=0;i<triangles.length;i+=skip){
		g.beginFill(getArtifact.palette[1]);
		g.lineStyle(0,0,0);
		g.moveTo(triangles[i].points[0],triangles[i].points[1]);
		g.lineTo(triangles[i].points[2],triangles[i].points[3]);
		g.lineTo(triangles[i].points[4],triangles[i].points[5]);
		g.lineTo(triangles[i].points[0],triangles[i].points[1]);
		g.endFill();
	}
	g.endFill();


	var connections=[];
	connections.push([p[0],p[1]]);
	connections.push([p[p.length-2],p[p.length-1]]);
	connections.push([p[Math.round(p.length/2)],p[Math.round(p.length/2)-1]]);

	for(var i=0;i<connections.length;++i){
		/*
		// connection indicators
		g.beginFill(rgb(0,0,100),0.5);
		g.lineStyle(2, rgb(200,150,100), 0.5);
		g.drawCircle(connections[i][0],connections[i][1],5);
		g.endFill();*/

		if(i!=0 && getArtifact.recursion < 5 && rng() < 0.9*1/(getArtifact.recursion*getArtifact.recursion)){
			var child = getArtifact(rng()*10000);
			g.addChild(child);

			child.x=connections[i][0];
			child.y=connections[i][1];
		}
	}


	g.pivot.x=connections[0][0];
	g.pivot.y=connections[0][1];

	g.rotation=rng();
	g.rotationMult=rng()*2-1;
	g.rotationTime=rng()*2000+100;

	g.x=size[0]/2;
	g.y=size[1]/2;


	g.rotate=function(a){
		g.rotation += a*g.rotationMult;
		for(var i=0; i < g.children.length; ++i){
			g.children[i].rotate(a);
		}
	}

	--getArtifact.recursion;

	return g;
}

getArtifact.recursion=0;