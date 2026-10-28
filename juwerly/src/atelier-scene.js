/* AUREL Atelier — editable, deterministic product geometry.
 * Uses the Three.js and React already included in the original offline bundle.
 * Stock maps are embedded by tools/build.py; no runtime CDN or network required.
 */
const AtelierTHREE = cz;
const atelierTextureCache = new Map();
const atelierGemCache = new Map();

function atelierCanvas(draw, size = 1024) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d'), size);
  const texture = new AtelierTHREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  return texture;
}

function atelierMap(name, repeat = [1, 1]) {
  const key = name + repeat.join(',');
  if (atelierTextureCache.has(key)) return atelierTextureCache.get(key);
  if (!AUREL_ASSETS[name]) return null;
  const texture = new AtelierTHREE.TextureLoader().load(AUREL_ASSETS[name]);
  texture.wrapS = texture.wrapT = AtelierTHREE.RepeatWrapping;
  texture.repeat.set(...repeat);
  texture.anisotropy = 8;
  atelierTextureCache.set(key, texture);
  return texture;
}

function atelierLeatherColor(){
  const key='croc-tint';if(atelierTextureCache.has(key))return atelierTextureCache.get(key);
  const url=AUREL_ASSETS['fabrics_0073_color_1k.jpg'];if(!url)return null;
  const texture=new AtelierTHREE.TextureLoader().load(url,t=>{
    const canvas=document.createElement('canvas');canvas.width=t.image.width;canvas.height=t.image.height;
    const ctx=canvas.getContext('2d');ctx.drawImage(t.image,0,0);const image=ctx.getImageData(0,0,canvas.width,canvas.height);
    for(let i=0;i<image.data.length;i+=4){const luma=.2126*image.data[i]+.7152*image.data[i+1]+.0722*image.data[i+2];const value=Math.min(255,80+luma*1.6);image.data[i]=image.data[i+1]=image.data[i+2]=value;}
    ctx.putImageData(image,0,0);t.image=canvas;t.needsUpdate=true;
  });
  texture.colorSpace=AtelierTHREE.SRGBColorSpace;texture.wrapS=texture.wrapT=AtelierTHREE.RepeatWrapping;texture.repeat.set(.55,1.25);texture.anisotropy=8;
  atelierTextureCache.set(key,texture);return texture;
}

function atelierBrushing() {
  if (atelierTextureCache.has('brushing')) return atelierTextureCache.get('brushing');
  const map = atelierCanvas((ctx, n) => {
    ctx.fillStyle = '#a0a0a0'; ctx.fillRect(0,0,n,n);
    for (let y=0;y<n;y++) {
      const shade = 105 + Math.round(44*(.5+.5*Math.sin(y*97.37)));
      ctx.strokeStyle = `rgb(${shade},${shade},${shade})`;
      ctx.beginPath();ctx.moveTo(0,y+.5);ctx.lineTo(n,y+.5);ctx.stroke();
    }
  });
  map.wrapS=map.wrapT=AtelierTHREE.RepeatWrapping;
  atelierTextureCache.set('brushing',map);return map;
}

function atelierMetal(color, satin = false) {
  return new AtelierTHREE.MeshPhysicalMaterial({color, metalness:1,
    roughness:satin?.33:.16, envMapIntensity:1.05,
    bumpMap:satin?atelierBrushing():null,bumpScale:satin?.0015:0,
    anisotropy:satin?.55:.12, clearcoat:.12,clearcoatRoughness:.17});
}

function atelierMesh(parent, geometry, material, position=[0,0,0], rotation=[0,0,0]) {
  const mesh=new AtelierTHREE.Mesh(geometry,material);
  mesh.position.set(...position);mesh.rotation.set(...rotation);
  mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
}

function atelierTube(parent, points, radius, material, closed=false) {
  const curve=new AtelierTHREE.CatmullRomCurve3(points.map(p=>new AtelierTHREE.Vector3(...p)),closed,'centripetal');
  return atelierMesh(parent,new AtelierTHREE.TubeGeometry(curve,Math.max(24,points.length*10),radius,10,closed),material);
}

function atelierRoundedShape(width,height,radius) {
  const s=new AtelierTHREE.Shape(),x=-width/2,y=-height/2,r=Math.min(radius,width/2,height/2);
  s.moveTo(x+r,y);s.lineTo(x+width-r,y);s.quadraticCurveTo(x+width,y,x+width,y+r);
  s.lineTo(x+width,y+height-r);s.quadraticCurveTo(x+width,y+height,x+width-r,y+height);
  s.lineTo(x+r,y+height);s.quadraticCurveTo(x,y+height,x,y+height-r);
  s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);s.closePath();return s;
}

function atelierBevel(parent,width,height,depth,radius,material,position=[0,0,0]) {
  const bevel=Math.min(.018,depth/4,radius/2);
  const geo=new AtelierTHREE.ExtrudeGeometry(atelierRoundedShape(width-2*bevel,height-2*bevel,radius),
    {depth:depth-2*bevel,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:3,curveSegments:8,steps:1});
  geo.translate(0,0,-depth/2+bevel);
  return atelierMesh(parent,geo,material,position);
}

function atelierLathe(parent,profile,material,position=[0,0,0],segments=128) {
  const signedArea=profile.reduce((sum,p,i)=>{const q=profile[(i+1)%profile.length];return sum+p[0]*q[1]-q[0]*p[1];},0);
  if(signedArea<0)profile=[...profile].reverse();
  return atelierMesh(parent,new AtelierTHREE.LatheGeometry(profile.map(p=>new AtelierTHREE.Vector2(...p)),segments),material,position,[Math.PI/2,0,0]);
}

/* Intersect half spaces to make a closed convex, flat-shaded faceted stone.
 * The same planes are used by its optical shader, so the internal reflections
 * follow the actual geometry rather than a fake sparkle overlay.
 */
function atelierGemGeometry(shape) {
  if(atelierGemCache.has(shape))return atelierGemCache.get(shape);
  const planes=[];
  const add=(x,y,z,d)=>{const l=Math.hypot(x,y,z);planes.push(new AtelierTHREE.Vector4(x/l,y/l,z/l,d/l));};
  add(0,1,0,.30);add(0,-1,0,.83);
  const sides=shape==='princess'?8:shape==='emerald'?8:shape==='cushion'?16:24;
  for(let k=0;k<sides;k++){
    const a=2*Math.PI*k/sides, cx=Math.cos(a),sz=Math.sin(a);
    let radius=1, sx=1,sy=1;
    if(shape==='oval')sy=1.32;
    if(shape==='emerald'){sx=.82;sy=1.18;radius=(k%2)?1.22:1;}
    if(shape==='princess')radius=k%2?1.08:.82;
    if(shape==='cushion')radius=.91+.09*Math.abs(Math.sin(2*a));
    if(shape==='pear'){sy=1.28;radius=1-.24*sz;}
    add(cx/sx,0,sz/sy,radius);
    if(shape==='emerald'){
      add(.60*cx/sx,1,.60*sz/sy,.60*radius+.015);
      add(.32*cx/sx,1,.32*sz/sy,.44*radius);
      add(.92*cx/sx,-1,.92*sz/sy,.92*radius+.015);
      add(1.7*cx/sx,-1,1.7*sz/sy,1.35*radius);
    }else{
      if(k%(sides>=16?3:1)===0)add(.70*cx/sx,1,.70*sz/sy,.70*radius+.015);
      add(.90*cx/sx,-1,.90*sz/sy,.90*radius+.015);
    }
  }
  if(shape!=='emerald')for(let k=0;k<8;k++){
    const a=(k+.5)*Math.PI/4;
    const sy=(shape==='oval'||shape==='pear')?1.3:1;
    if(shape!=='princess'&&shape!=='pear')add(.42*Math.cos(a),1,.42*Math.sin(a)/sy,.54);
  }
  const vertices=[], normals=[], positions=[];
  const vec=p=>new AtelierTHREE.Vector3(p.x,p.y,p.z);
  for(let a=0;a<planes.length-2;a++)for(let b=a+1;b<planes.length-1;b++)for(let c=b+1;c<planes.length;c++){
    const p=planes[a],q=planes[b],r=planes[c],pn=vec(p),qn=vec(q),rn=vec(r);
    const qr=qn.clone().cross(rn),det=pn.dot(qr);if(Math.abs(det)<1e-7)continue;
    const point=qr.multiplyScalar(p.w).add(rn.clone().cross(pn).multiplyScalar(q.w)).add(pn.clone().cross(qn).multiplyScalar(r.w)).divideScalar(det);
    if(planes.every(v=>v.x*point.x+v.y*point.y+v.z*point.z<=v.w+1e-5)&&!vertices.some(v=>v.distanceToSquared(point)<1e-9))vertices.push(point);
  }
  const active=[];
  for(const p of planes){
    const normal=vec(p),face=vertices.filter(v=>Math.abs(normal.dot(v)-p.w)<1e-4);if(face.length<3)continue;
    const center=face.reduce((s,v)=>s.add(v),new AtelierTHREE.Vector3()).divideScalar(face.length);
    const u=face[0].clone().sub(center).normalize(),v=normal.clone().cross(u);
    face.sort((a,b)=>Math.atan2(a.clone().sub(center).dot(v),a.clone().sub(center).dot(u))-Math.atan2(b.clone().sub(center).dot(v),b.clone().sub(center).dot(u)));
    for(let j=1;j<face.length-1;j++)for(const point of [face[0],face[j],face[j+1]]){positions.push(...point);normals.push(...normal);}
    active.push(p);
  }
  const geometry=new AtelierTHREE.BufferGeometry();
  geometry.setAttribute('position',new AtelierTHREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new AtelierTHREE.Float32BufferAttribute(normals,3));
  geometry.computeBoundingSphere();geometry.userData.shared=true;
  const result={geometry,planes:active};atelierGemCache.set(shape,result);return result;
}

function atelierGemMaterial(data, environment, color='F') {
  const tint={D:'#ffffff',E:'#fffefd',F:'#fffdfa',G:'#fffaf1',H:'#fff6e5',I:'#fff0d7',J:'#ffebc6'}[color]||'#ffffff';
  return new AtelierTHREE.ShaderMaterial({
    uniforms:{planes:{value:data.planes},env:{value:environment},hasEnv:{value:!!environment},
      inverseModel:{value:new AtelierTHREE.Matrix4()},worldMatrix:{value:new AtelierTHREE.Matrix4()},gemTint:{value:new AtelierTHREE.Color(tint)}},
    vertexShader:`varying vec3 localPoint;varying vec3 localNormal;
      void main(){localPoint=position;localNormal=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`
      uniform vec4 planes[${data.planes.length}];uniform sampler2D env;uniform bool hasEnv;
      uniform mat4 inverseModel;uniform mat4 worldMatrix;uniform vec3 gemTint;
      varying vec3 localPoint;varying vec3 localNormal;
      vec3 environment(vec3 d){
        d=normalize(mat3(worldMatrix)*d);
        if(hasEnv){vec2 uv=vec2(atan(d.z,d.x)*0.159154943+0.5,asin(clamp(d.y,-1.,1.))*0.318309886+0.5);return texture2D(env,uv).rgb;}
        float light=pow(max(0.,dot(d,normalize(vec3(-1.,2.,2.)))),24.);
        return vec3(.22+.35*max(0.,d.y)+light*5.);
      }
      vec3 disperse(vec3 d){
        vec3 offset=normalize(cross(d,vec3(.3,1.,.2)))*.008;
        return vec3(environment(d-offset).r,environment(d).g,environment(d+offset).b);
      }
      void main(){
        vec3 eye=(inverseModel*vec4(cameraPosition,1.)).xyz;
        vec3 incident=normalize(localPoint-eye),n=normalize(localNormal);
        float fresnel=.172+(1.-.172)*pow(1.-max(0.,dot(-incident,n)),5.);
        vec3 surface=environment(reflect(incident,n));
        vec3 ray=refract(incident,n,1./2.417),point=localPoint+ray*.0002;
        vec3 optical=vec3(0.);float energy=1.;
        for(int bounce=0;bounce<5;bounce++){
          float nearest=10000.;vec3 face=vec3(0.);
          for(int i=0;i<${data.planes.length};i++){
            float denom=dot(planes[i].xyz,ray);
            if(denom>.00001){float t=(planes[i].w-dot(planes[i].xyz,point))/denom;
              if(t>.00001&&t<nearest){nearest=t;face=planes[i].xyz;}}
          }
          if(nearest>999.)break;
          point+=ray*nearest;
          vec3 outRay=refract(ray,-face,2.417);
          if(dot(outRay,outRay)>.01){
            float f=.172+.828*pow(1.-max(0.,dot(ray,face)),5.);
            optical+=energy*(1.-f)*disperse(outRay);energy*=f;
          }
          ray=reflect(ray,face);point+=ray*.0003;
        }
        optical+=energy*environment(ray)*.6;
        vec3 result=mix(optical*gemTint,surface,fresnel);
        gl_FragColor=vec4(result,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
}

function atelierGem(parent, shape, size, position, environment, color='F') {
  const data=atelierGemGeometry(shape),mat=atelierGemMaterial(data,environment,color);
  const mesh=atelierMesh(parent,data.geometry,mat,position);mesh.scale.setScalar(size);
  mesh.name='Faceted '+shape+' diamond';
  mesh.onBeforeRender=()=>{mat.uniforms.inverseModel.value.copy(mesh.matrixWorld).invert();mat.uniforms.worldMatrix.value.copy(mesh.matrixWorld);};
  return mesh;
}

function atelierBand(width, setting) {
  const p=[],uv=[],idx=[],radial=192,cross=24;
  for(let i=0;i<=radial;i++){
    const a=i*2*Math.PI/radial,top=Math.max(0,Math.sin(a));
    const taper=setting==='cathedral'?1-.26*top**8:1-.14*top**8;
    for(let j=0;j<=cross;j++){
      const b=j*2*Math.PI/cross;
      const r=1.145+.095*Math.cos(b);
      const z=Math.sign(Math.sin(b))*Math.abs(Math.sin(b))**.65*(width/17)*taper;
      p.push(r*Math.cos(a),r*Math.sin(a),z);uv.push(i/radial,j/cross);
      if(i<radial&&j<cross){const k=i*(cross+1)+j;idx.push(k,k+cross+1,k+1,k+1,k+cross+1,k+cross+2);}
    }
  }
  const geo=new AtelierTHREE.BufferGeometry();geo.setAttribute('position',new AtelierTHREE.Float32BufferAttribute(p,3));geo.setAttribute('uv',new AtelierTHREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();return geo;
}

function atelierBasket(parent, shape, size, y, count, metal) {
  const points=[],planes=atelierGemGeometry(shape).planes;
  const radius=(a,h)=>Math.min(...planes.filter(p=>p.x*Math.cos(a)+p.z*Math.sin(a)>1e-5).map(p=>(p.w-p.y*h)/(p.x*Math.cos(a)+p.z*Math.sin(a))));
  for(let k=0;k<48;k++){const a=k*Math.PI/24,r=radius(a,-.22)*size;points.push([Math.cos(a)*r,y-size*.22,Math.sin(a)*r]);}
  atelierTube(parent,points,.023,metal,true);
  const base=[];for(let k=0;k<32;k++){const a=k*Math.PI/16,r=radius(a,-.57)*size;base.push([Math.cos(a)*r,y-size*.57,Math.sin(a)*r]);}
  atelierTube(parent,base,.025,metal,true);
  for(let k=0;k<count;k++){
    const a=(k+.5)*Math.PI*2/count,c=Math.cos(a),s=Math.sin(a),r0=radius(a,0)*size,r1=radius(a,.15)*size;
    atelierTube(parent,[[c*r0*.36,y-size*.64,s*r0*.36],[c*r0*.78,y-size*.36,s*r0*.78],
      [c*r0*1.025,y+.015,s*r0*1.025],[c*r1,y+size*.15,s*r1]],size*.062,metal);
    const tip=atelierMesh(parent,new AtelierTHREE.SphereGeometry(size*.073,16,12),metal,[c*r1,y+size*.15,s*r1]);tip.scale.y=.65;
  }
}

function atelierEngraving(parent,text,font,ring) {
  if(!text)return;
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#4f473a';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font=`${font==='script'?'italic ':''}64px ${font==='sans'?'Arial':'Georgia'}`;ctx.fillText(text,512,64,960);
  const tex=new AtelierTHREE.CanvasTexture(canvas);tex.colorSpace=AtelierTHREE.SRGBColorSpace;
  const mat=new AtelierTHREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
  if(ring){
    const positions=[],uv=[],indices=[];
    for(let i=0;i<=48;i++)for(let j=0;j<2;j++){
      const angle=(i/48-.5)*1.25;positions.push(Math.sin(angle)*1.047,-Math.cos(angle)*1.047,(j-.5)*.14);uv.push(i/48,j);
      if(i<48&&j===0){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
    }
    const geometry=new AtelierTHREE.BufferGeometry();geometry.setAttribute('position',new AtelierTHREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new AtelierTHREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();atelierMesh(parent,geometry,mat);
  }else atelierMesh(parent,new AtelierTHREE.PlaneGeometry(1.6,.20),mat,[0,-.42,-.242],[0,Math.PI,0]);
}

function atelierRing(config,environment){
  const group=new AtelierTHREE.Group();group.name='Atelier / ring';
  const colors={yellow:'#d9b875',white:'#e0e0db',rose:'#d9a28a',platinum:'#c5cdd2'};
  const metal=atelierMetal(colors[config.metal],config.finish==='matte');
  const bright=atelierMetal(colors[config.metal]);
  atelierMesh(group,atelierBand(config.width,config.setting),metal).name='Comfort fit sculpted shank';
  const size=.43*Math.cbrt(config.carat),height=1.27+size*.63;
  atelierGem(group,config.shape,size,[0,height,0],environment,config.color);
  atelierBasket(group,config.shape,size,height,Number(config.prongs),bright);
  for(const sign of [-1,1]){
    const start=config.setting==='cathedral'?.83:.53;
    atelierTube(group,[[sign*start,Math.sqrt(1.22**2-start**2),0],[sign*.56,1.16,0],
      [sign*size*.62,height-.2,0],[sign*size*.73,height-.1,0]],config.setting==='cathedral'?.065:.046,metal);
  }
  if(config.setting==='halo'){
    const radius=size+.10,count=Math.max(18,Math.round(2*Math.PI*radius/.13)),rail=[];
    const outline=atelierGemGeometry(config.shape).planes;
    const edge=a=>Math.min(...outline.filter(p=>p.x*Math.cos(a)+p.z*Math.sin(a)>1e-5).map(p=>p.w/(p.x*Math.cos(a)+p.z*Math.sin(a))))*size+.10;
    for(let k=0;k<count;k++){
      const a=k*Math.PI*2/count,r=edge(a),p=[Math.cos(a)*r,height-.015,Math.sin(a)*r];
      atelierGem(group,'round',.069,p,environment);rail.push([p[0],p[1]-.045,p[2]]);
      const b=a+Math.PI/count,bead=edge(b);
      atelierMesh(group,new AtelierTHREE.SphereGeometry(.019,8,6),bright,[Math.cos(b)*bead,height+.005,Math.sin(b)*bead]);
    }atelierTube(group,rail,.038,bright,true);
  }
  if(config.setting==='trilogy')for(const sign of [-1,1]){
    const side=new AtelierTHREE.Group();group.add(side);side.position.set(sign*size*1.62,height-.15,0);side.rotation.z=-sign*.25;
    atelierGem(side,'round',size*.61,[0,0,0],environment,config.color);atelierBasket(side,'round',size*.61,0,4,bright);
  }
  if(['pave','halo'].includes(config.setting))for(const sign of [-1,1])for(let i=0;i<10;i++){
    const a=sign*(.34+i*.105),seat=new AtelierTHREE.Group();seat.rotation.z=-a;group.add(seat);
    const stoneSize=Math.min(.062,config.width/38);
    atelierGem(seat,'round',stoneSize,[0,1.258,0],environment);
    for(const z of [-1,1])atelierMesh(seat,new AtelierTHREE.SphereGeometry(.017,8,6),bright,[.044,1.25,z*stoneSize*.76]);
  }
  atelierEngraving(group,config.engraving,config.font,true);
  group.rotation.set(.16,-.20,-.22);group.position.y=-.08;group.scale.setScalar(1.18*Math.sqrt(config.size/17));
  return group;
}

function atelierDial(config){
  const dark=config.dial!=='ivory',colors={ivory:'#e5dcc4',black:'#151a19',blue:'#17354b',green:'#274b3e'};
  const map=atelierCanvas((ctx,n)=>{
    ctx.fillStyle=colors[config.dial];ctx.fillRect(0,0,n,n);ctx.translate(n/2,n/2);ctx.scale(n/1024,n/1024);
    if(config.texture==='sunburst')for(let i=0;i<3600;i++){
      const a=i*Math.PI/1800;ctx.strokeStyle=`rgba(${dark?'220,230,218':'255,255,250'},${.012+.04*(.5+.5*Math.sin(i*52.21))})`;
      ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.sin(a)*n,Math.cos(a)*n);ctx.stroke();
    }
    if(config.texture==='guilloche'){
      ctx.strokeStyle=dark?'#c5cebc28':'#51493728';ctx.lineWidth=.7;
      for(let j=0;j<100;j++){ctx.beginPath();for(let k=0;k<=720;k++){
        const a=k*Math.PI/360,r=25+j*5+4*Math.sin(a*36+j*.17),x=Math.cos(a)*r,y=Math.sin(a)*r;
        k?ctx.lineTo(x,y):ctx.moveTo(x,y);
      }ctx.stroke();}
    }
    const ink=dark?'#e9dec4':'#4b473c';ctx.strokeStyle=ink;ctx.fillStyle=ink;
    for(let k=0;k<60;k++){
      ctx.save();ctx.rotate(k*Math.PI/30);ctx.lineWidth=k%5===0?2.4:1.2;
      ctx.beginPath();ctx.moveTo(0,-468);ctx.lineTo(0,k%5===0?-448:-457);ctx.stroke();ctx.restore();
    }
    ctx.lineWidth=.8;ctx.beginPath();ctx.arc(0,0,475,0,Math.PI*2);ctx.stroke();
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font='47px Georgia';ctx.fillText('A U R É L',0,-172);
    ctx.font='12px Arial';ctx.fillText('A T E L I E R   H O R L O G E R',0,-124);
    if(config.complication!=='seconds'){
      ctx.font='17px Georgia';ctx.fillText(config.movement==='automatic'?'AUTOMATIQUE':config.movement==='quartz'?'QUARTZ':'MÉCANIQUE',0,175);
      ctx.font='11px Arial';ctx.fillText(`${config.water} M  ·  ATELIER`,0,207);
    }
    if(config.complication==='date'){
      ctx.fillStyle='#151714';ctx.fillRect(282,-32,81,64);ctx.fillStyle='#f6f0dc';ctx.fillRect(288,-27,69,54);
      ctx.fillStyle='#282b25';ctx.font='36px Georgia';ctx.fillText('15',322,2);
    }
    if(config.complication==='seconds'){
      for(let r=73;r<82;r+=2){ctx.beginPath();ctx.arc(0,252,r,0,Math.PI*2);ctx.stroke();}
      for(let i=0;i<60;i++){
        const a=i*Math.PI/30,outer=73,inner=i%5===0?61:68;
        ctx.beginPath();ctx.moveTo(Math.sin(a)*inner,252-Math.cos(a)*inner);ctx.lineTo(Math.sin(a)*outer,252-Math.cos(a)*outer);ctx.stroke();
      }
    }
    ctx.fillStyle=ink;ctx.font='10px Arial';ctx.fillText('CRÉATION PERSONNELLE',0,431);
  },2048);map.colorSpace=AtelierTHREE.SRGBColorSpace;return map;
}

function atelierHand(parent,length,angle,style,material,z){
  const shape=new AtelierTHREE.Shape();
  if(style==='leaf'){
    shape.moveTo(0,-.10);shape.bezierCurveTo(-.04,.03,-.11,length*.5,0,length);
    shape.bezierCurveTo(.11,length*.5,.04,.03,0,-.1);
  }else{
    const width=style==='sword'?.045:.075;
    shape.moveTo(-.025,-.1);shape.lineTo(-width,.12);shape.lineTo(0,length);shape.lineTo(width,.12);shape.lineTo(.025,-.1);shape.closePath();
  }
  const mesh=atelierMesh(parent,new AtelierTHREE.ExtrudeGeometry(shape,{depth:.013,bevelEnabled:true,bevelSize:.008,bevelThickness:.007,bevelSegments:2,curveSegments:24}),material,[0,0,z],[0,0,angle]);
  const ridge=new AtelierTHREE.Mesh(new AtelierTHREE.BoxGeometry(.008,length*.69,.009),atelierMetal('#e6e5db'));
  ridge.position.set(0,length*.43,.023);mesh.add(ridge);return mesh;
}

function atelierRoman(parent,text,x,y,material){
  const group=new AtelierTHREE.Group();parent.add(group);group.position.set(x,y,.253);
  const stroke=(x1,y1,x2,y2)=>{
    const dx=x2-x1,dy=y2-y1;
    const mesh=atelierBevel(group,.009,Math.hypot(dx,dy),.018,.003,material,[(x1+x2)/2,(y1+y2)/2,0]);mesh.rotation.z=-Math.atan2(dx,dy);
  };
  [...text].forEach((c,i)=>{
    const offset=(i-(text.length-1)/2)*.046;
    if(c==='I'){stroke(offset,-.052,offset,.052);stroke(offset-.013,-.05,offset+.013,-.05);stroke(offset-.013,.05,offset+.013,.05);}
    if(c==='V'){stroke(offset-.018,.052,offset,-.052);stroke(offset,-.052,offset+.018,.052);}
    if(c==='X'){stroke(offset-.018,.052,offset+.018,-.052);stroke(offset+.018,.052,offset-.018,-.052);}
  });
}

function atelierSubdivide(geometry){
  const input=geometry.index?geometry.toNonIndexed():geometry,p=input.attributes.position,uv=input.attributes.uv;
  const positions=[],uvs=[],indices=[],lookup=new Map();
  const emit=v=>{const key=v.map(x=>x.toFixed(5)).join(',');let i=lookup.get(key);if(i===undefined){i=positions.length/3;lookup.set(key,i);positions.push(...v.slice(0,3));uvs.push(...v.slice(3));}indices.push(i);};
  const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
  function split(a,b,c,depth=0){
    const edges=[distance(a,b),distance(b,c),distance(c,a)],longest=Math.max(...edges);
    if(longest<.14||depth>12){emit(a);emit(b);emit(c);return;}
    const midpoint=(a,b)=>a.map((v,i)=>(v+b[i])/2);
    const edge=edges.indexOf(longest);
    if(edge===0){const m=midpoint(a,b);split(a,m,c,depth+1);split(m,b,c,depth+1);}
    else if(edge===1){const m=midpoint(b,c);split(a,b,m,depth+1);split(a,m,c,depth+1);}
    else{const m=midpoint(c,a);split(a,b,m,depth+1);split(m,b,c,depth+1);}
  }
  const vertex=i=>[p.getX(i),p.getY(i),p.getZ(i),uv.getX(i),uv.getY(i)];
  for(let i=0;i<p.count;i+=3)split(vertex(i),vertex(i+1),vertex(i+2));
  const result=new AtelierTHREE.BufferGeometry();result.setAttribute('position',new AtelierTHREE.Float32BufferAttribute(positions,3));result.setAttribute('uv',new AtelierTHREE.Float32BufferAttribute(uvs,2));result.setIndex(indices);
  if(input!==geometry)input.dispose();geometry.dispose();return result;
}

function atelierStrapGeometry(sign,length,holes=false){
  const shape=new AtelierTHREE.Shape(),w=.475,tip=.34;
  shape.moveTo(-w,0);shape.lineTo(w,0);shape.lineTo(tip,length-.18);
  shape.quadraticCurveTo(tip,length,0,length+.05);shape.quadraticCurveTo(-tip,length,-tip,length-.18);shape.closePath();
  if(holes)for(let i=0;i<6;i++){const hole=new AtelierTHREE.Path();hole.absellipse(0,length*(.42+i*.09),.026,.043,0,Math.PI*2,true);shape.holes.push(hole);}
  const geo=atelierSubdivide(new AtelierTHREE.ExtrudeGeometry(shape,{depth:.095,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:3,curveSegments:24,steps:1}));
  const pos=geo.attributes.position,uv=geo.attributes.uv;
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),t=pos.getY(i),z=pos.getZ(i);
    pos.setXYZ(i,x,sign*(1.34+t),z-.07-.10*(t/length)**2+.048*(1-(x/.5)**2)*Math.sin(Math.PI*t/length));
    uv.setXY(i,(x+.5),t*.62);
  }
  if(sign<0){const indices=geo.index.array;for(let i=0;i<indices.length;i+=3){const tmp=indices[i+1];indices[i+1]=indices[i+2];indices[i+2]=tmp;}}
  geo.computeVertexNormals();return geo;
}

function atelierFlutedBezel(){
  const positions=[],indices=[],rings=[[1.113,.265],[1.153,.310],[1.202,.303],[1.254,.239],[1.268,.190]],segments=384;
  for(let row=0;row<rings.length;row++)for(let i=0;i<=segments;i++){
    const angle=i*Math.PI*2/segments,r=rings[row][0]+(row===0||row===4?0:.008*Math.cos(angle*96));
    positions.push(Math.sin(angle)*r,Math.cos(angle)*r,rings[row][1]);
    if(row<rings.length-1&&i<segments){const k=row*(segments+1)+i;indices.push(k,k+1,k+segments+1,k+1,k+segments+2,k+segments+1);}
  }
  const geometry=new AtelierTHREE.BufferGeometry();geometry.setAttribute('position',new AtelierTHREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

function atelierWatch(config,environment){
  const root=new AtelierTHREE.Group(),body=new AtelierTHREE.Group();root.add(body);
  const colors={steel:'#d1d5d5',gold:'#d4b478',rose:'#d6a28d',titanium:'#969fa4'};
  const metal=atelierMetal(colors[config.caseMetal]),satin=atelierMetal(colors[config.caseMetal],true);
  const dark=new AtelierTHREE.MeshStandardMaterial({color:'#272a28',roughness:.6});
  const handColor=config.handColor==='gold'?'#d1af67':config.handColor==='silver'?'#e0e3e0':'#234d88';
  const hands=atelierMetal(handColor);
  const scale=config.diameter/40;body.scale.set(scale,scale,1);
  atelierLathe(body,[[0,-.23],[1.12,-.23],[1.22,-.21],[1.28,-.15],[1.29,-.10],[1.29,.11],[1.27,.16],[1.21,.20],[1.09,.20],[1.09,-.2],[0,-.23]],satin);
  atelierLathe(body,[[1.10,.18],[1.11,.27],[1.15,.31],[1.20,.30],[1.25,.24],[1.27,.19],[1.25,.17],[1.10,.18]],metal);
  atelierLathe(body,[[1.11,-.23],[1.14,-.22],[1.19,-.19],[1.19,-.16],[1.16,-.15],[1.11,-.23]],metal);
  const back=atelierMesh(body,new AtelierTHREE.CircleGeometry(1.12,96),satin,[0,0,-.235],[0,Math.PI,0]);
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3;
    const screw=atelierMesh(body,new AtelierTHREE.CylinderGeometry(.036,.036,.012,16),metal,[Math.sin(a)*1.065,Math.cos(a)*1.065,-.241],[Math.PI/2,0,0]);
    atelierBevel(body,.045,.006,.003,.002,dark,[Math.sin(a)*1.065,Math.cos(a)*1.065,-.25]);
  }
  if(config.bezel==='fluted')atelierMesh(body,atelierFlutedBezel(),metal);
  const dial=atelierDial(config);
  atelierMesh(body,new AtelierTHREE.CircleGeometry(1.105,160),new AtelierTHREE.MeshPhysicalMaterial({map:dial,metalness:.04,roughness:config.texture==='matte'?.58:.43,envMapIntensity:.6,clearcoat:.04,clearcoatRoughness:.4}),[0,0,.221]);
  atelierLathe(body,[[1.07,.222],[1.075,.245],[1.10,.265],[1.11,.26],[1.1,.22],[1.07,.222]],metal);
  if(config.indices==='roman'){
    const numerals=['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'];
    numerals.forEach((text,i)=>{if(config.complication==='date'&&i===3)return;const angle=i*Math.PI/6;atelierRoman(body,text,Math.sin(angle)*.825,Math.cos(angle)*.825,hands);});
  }
  if(config.indices!=='roman')for(let i=0;i<12;i++){
    if(config.complication==='date'&&i===3)continue;
    const a=i*Math.PI/6,x=Math.sin(a)*.905,y=Math.cos(a)*.905;
    const index=new AtelierTHREE.Group();body.add(index);index.position.set(x,y,.252);index.rotation.z=-a;
    if(config.indices==='diamonds'){
      atelierBevel(index,.095,.095,.024,.02,metal);
      const gem=atelierGem(index,'round',.042,[0,0,.031],environment);gem.rotation.x=Math.PI/2;
    }else{
      atelierBevel(index,.037,i===0?.17:.14,.027,.009,hands);
      if(i===0)atelierBevel(index,.015,.17,.025,.005,hands,[.047,0,0]);
    }
  }
  if(config.complication==='date'){
    const frame=atelierRoundedShape(.19,.157,.009),hole=new AtelierTHREE.Path();
    hole.moveTo(-.078,-.06);hole.lineTo(-.078,.06);hole.lineTo(.078,.06);hole.lineTo(.078,-.06);hole.closePath();frame.holes.push(hole);
    atelierMesh(body,new AtelierTHREE.ExtrudeGeometry(frame,{depth:.008,bevelEnabled:true,bevelSize:.004,bevelThickness:.004,bevelSegments:2}),metal,[.694,0,.24]);
  }
  atelierHand(body,.65,Math.PI/3,config.hands,hands,.279);
  atelierHand(body,.90,-Math.PI/3,config.hands,hands,.316);
  if(config.complication==='seconds'){
    atelierBevel(body,.008,.138,.008,.002,hands,[.027,-.50,.277]).rotation.z=-.4;
    atelierMesh(body,new AtelierTHREE.SphereGeometry(.017,12,8),metal,[0,-.543,.278]);
  }else{
    const seconds=new AtelierTHREE.Group();body.add(seconds);seconds.position.z=.358;seconds.rotation.z=-2.6;
    atelierBevel(seconds,.008,1.12,.007,.002,hands,[0,.37,0]);
    atelierMesh(seconds,new AtelierTHREE.TorusGeometry(.039,.007,6,24),hands,[0,-.18,0]);
  }
  atelierLathe(body,[[0,.363],[.037,.363],[.046,.354],[.046,.34],[0,.34],[0,.363]],metal,[0,0,0],32);
  /* A separate domed sapphire/mineral crystal, with restrained AR reflections. */
  const crystal=new AtelierTHREE.MeshPhysicalMaterial({color:'#dce8ff',metalness:0,roughness:.025,transparent:true,opacity:config.sapphire?.10:.16,depthWrite:false,ior:config.sapphire?1.76:1.52,envMapIntensity:.48,specularIntensity:.4,clearcoat:0});
  atelierLathe(body,[[0,.397],[.55,.395],[.98,.383],[1.075,.369],[1.083,.354],[1.075,.346],[0,.372],[0,.397]],crystal);
  // Crown collar, toothed crown and engraved end cap.
  const crown=new AtelierTHREE.Group();body.add(crown);crown.position.set(1.3,0,0);crown.rotation.z=-Math.PI/2;
  atelierMesh(crown,new AtelierTHREE.CylinderGeometry(.115,.115,.11,48),metal,[0,.02,0]);
  atelierMesh(crown,new AtelierTHREE.CylinderGeometry(.126,.126,.16,48),satin,[0,.12,0]);
  for(let i=0;i<36;i++){
    const a=i*Math.PI/18;atelierMesh(crown,new AtelierTHREE.CylinderGeometry(.009,.009,.15,6),metal,[Math.cos(a)*.125,.12,Math.sin(a)*.125]);
  }
  atelierMesh(crown,new AtelierTHREE.SphereGeometry(.115,32,12),metal,[0,.202,0]).scale.y=.15;
  for(const sign of [-1,1])for(const side of [-1,1]){
    const lug=atelierBevel(body,.175,.52,.22,.05,metal,[side*.57,sign*1.21,-.025]);lug.rotation.x=sign*.12;lug.rotation.z=-sign*side*.07;
    atelierMesh(body,new AtelierTHREE.CylinderGeometry(.028,.028,.97,16),satin,[0,sign*1.42,-.015],[0,0,Math.PI/2]);
  }
  const strapColors={brown:'#68432c',black:'#202421',blue:'#253f51',green:'#344f3c',cream:'#b8a58a'};
  const leather=new AtelierTHREE.MeshPhysicalMaterial({color:strapColors[config.strapColor],roughness:config.strap==='rubber'?.68:.48,
    map:config.strap==='alligator'?atelierLeatherColor():null,
    normalMap:config.strap==='rubber'?null:config.strap==='alligator'?atelierMap('fabrics_0073_normal_opengl_1k.png',[.55,1.25]):atelierMap('Leather037_1K-JPG_NormalGL.jpg',[1,2]),
    normalScale:new AtelierTHREE.Vector2(.8,.8),roughnessMap:config.strap==='rubber'?null:config.strap==='alligator'?atelierMap('fabrics_0073_roughness_1k.jpg',[.55,1.25]):atelierMap('Leather037_1K-JPG_Roughness.jpg',[1,2]),
    clearcoat:config.strap==='alligator'?.18:.04,clearcoatRoughness:.38});
  const thread=new AtelierTHREE.MeshStandardMaterial({color:config.strapColor==='black'?'#777063':'#cab493',roughness:.9});
  const edge=new AtelierTHREE.MeshStandardMaterial({color:config.strapColor==='cream'?'#817158':'#302820',roughness:.75});
  for(const sign of [-1,1]){
    if(config.strap==='steel'){
      const count=10+Math.round((config.wrist-18)*.6);
      for(let i=0;i<count;i++){
        const t=i/(count-1),width=.98-.16*t;
        for(let col=-2;col<=2;col++){
          const outer=Math.abs(col)===2,x=outer?Math.sign(col)*width*.357:col*width*.145;
          const link=atelierBevel(root,width*(outer?.265:.134),outer?.19:.176,outer?.12:.15,.045,outer?satin:metal,
            [x,sign*(1.48+i*.194+(outer?0:.075))*scale,-.02-.16*t*t+(outer?0:.016)]);
          link.rotation.x=-sign*(.04+.14*t);
          if(outer)atelierMesh(root,new AtelierTHREE.CylinderGeometry(.018,.018,.018,12),metal,
            [Math.sign(col)*width*.496,sign*(1.48+i*.194)*scale,-.04-.16*t*t],[0,0,Math.PI/2]);
        }
      }
    }else{
      const length=(sign<0?2.05:1.62)+(config.wrist-18)*.055;
      const strap=new AtelierTHREE.Group();root.add(strap);strap.scale.set(scale,scale,1);
      atelierMesh(strap,atelierStrapGeometry(sign,length,sign<0),leather).name='Tapered padded strap';
      for(const side of [-1,1]){
        const points=[];
        for(let i=0;i<=28;i++){
          const t=.04+(length-.23)*i/28,x=side*(.47-.135*t/length);
          points.push([x,sign*(1.34+t),.017-.10*(t/length)**2]);
        }atelierTube(strap,points,.008,edge);
        if(config.strap!=='rubber')for(let i=0;i<28;i++){
          const t=.08+(length-.34)*i/28,x=side*(.405-.12*t/length),z=.056-.10*(t/length)**2;
          atelierTube(strap,[[x,sign*(1.34+t),z],[x-side*.009,sign*(1.34+t+.037),z]],.0045,thread);
        }
      }
      if(config.strap==='rubber')for(let i=0;i<20;i++){
        const t=.15+i*(length-.4)/20;
        atelierBevel(strap,.56-.08*t,.016,.012,.005,edge,[0,sign*(1.34+t),.035-.10*(t/length)**2]);
      }
      if(sign>0){
        // Raised keeper loop and a real open tang buckle / folding clasp.
        for(const y of [1.85,2.06])atelierBevel(strap,.98,.12,.22,.04,leather,[0,y,-.005]);
        const y=1.34+length;
        if(config.clasp==='buckle'){
          atelierTube(strap,[[-.38,y-.08,-.06],[-.43,y+.18,-.06],[-.29,y+.27,-.06],[.29,y+.27,-.06],[.43,y+.18,-.06],[.38,y-.08,-.06]],.035,metal);
          atelierTube(strap,[[0,y-.12,-.03],[0,y+.15,-.015],[0,y+.24,-.06]],.022,metal);
        }else{
          atelierBevel(strap,.66,.48,.08,.07,satin,[0,y,-.12]);
          atelierBevel(strap,.48,.34,.035,.04,metal,[0,y,-.17]);
        }
      }
    }
  }
  if(config.strap==='steel'){
    atelierBevel(root,.70,.38,.16,.06,satin,[0,2.52*scale,-.08]);
    atelierBevel(root,.38,.22,.035,.04,metal,[0,2.52*scale,.015]);
  }
  atelierEngraving(body,config.engraving,config.font,false);
  root.name='Atelier / watch';root.rotation.set(-.12,-.16,-.18);root.scale.setScalar(.78);return root;
}

function atelierDispose(group){
  const materials=new Set(),geometries=new Set(),textures=new Set();
  group.traverse(o=>{if(o.geometry&&!o.geometry.userData.shared)geometries.add(o.geometry);if(o.material)materials.add(o.material);});
  materials.forEach(m=>{for(const v of Object.values(m))if(v?.isTexture&&!Array.from(atelierTextureCache.values()).includes(v))textures.add(v);m.dispose();});
  geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());
}

function AtelierProduct({config,environment}){
  const selected=config.product==='ring'?config.ring:config.watch;
  const object=le.useMemo(()=>config.product==='ring'?atelierRing(selected,environment):atelierWatch(selected,environment),[config.product,selected,environment]);
  le.useEffect(()=>()=>atelierDispose(object),[object]);
  return w.jsx('primitive',{object,dispose:null});
}

function AtelierEnvironment({onLoad}){
  le.useEffect(()=>{
    let cancelled=false,hdr;
    const url=AUREL_ASSETS['studio_small_03_2k.hdr'];
    if(url)new RB().load(url,texture=>{
      if(cancelled){texture.dispose();return;}
      hdr=texture;hdr.mapping=AtelierTHREE.EquirectangularReflectionMapping;
      onLoad(hdr);
    },undefined,error=>console.warn('Atelier HDRI unavailable; studio panels remain active.',error));
    return()=>{cancelled=true;hdr?.dispose();};
  },[onLoad]);return null;
}

function i5({config,view,zoom,autoRotate}){
  const controls=le.useRef(null),{camera}=xi();
  le.useEffect(()=>{
    if(view.startsWith('top'))config.product==='ring'?camera.position.set(.01,7.2,.7):camera.position.set(.01,1,8);
    else if(view.startsWith('back'))camera.position.set(0,.8,-8);
    else if(view.startsWith('front'))camera.position.set(0,.5,8);
    else config.product==='watch'?camera.position.set(1.4,2.3,9):camera.position.set(3.3,3.5,6.3);
    const y=config.product==='ring'?.25:0;camera.lookAt(0,y,0);controls.current?.target.set(0,y,0);controls.current?.update();
  },[view,config.product,camera]);
  le.useEffect(()=>{camera.zoom=zoom;camera.updateProjectionMatrix();},[zoom,camera]);
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return w.jsx(IB,{ref:controls,makeDefault:true,enablePan:false,minDistance:3.6,maxDistance:14,autoRotate:autoRotate&&!reduced,autoRotateSpeed:.65,enableDamping:true,dampingFactor:.08});
}

class r5 extends le.Component{
  constructor(props){super(props);this.state={failed:false};}
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?w.jsxs('div',{className:'viewer-fallback',children:[w.jsx('span',{children:'◇'}),w.jsx('h3',{children:'3D-просмотр недоступен'}),w.jsx('p',{children:'Включите аппаратное ускорение в браузере. Все настройки и расчёты доступны.'})]}):this.props.children;}
}

function s5({config,view,zoom,autoRotate}){
  const [environment,setEnvironment]=le.useState(null);
  return w.jsx(r5,{children:w.jsxs(nB,{shadows:true,dpr:[1,Math.min(2,window.devicePixelRatio||1)],
    camera:{position:[3.3,3.5,6.3],fov:36},gl:{antialias:true,preserveDrawingBuffer:true,alpha:true,powerPreference:'high-performance'},
    onCreated:({gl})=>{gl.toneMapping=AtelierTHREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.12;gl.outputColorSpace=AtelierTHREE.SRGBColorSpace;},
    'aria-label':config.product==='ring'?'Интерактивная 3D-модель кольца':'Интерактивная 3D-модель часов',
    children:[w.jsx('ambientLight',{intensity:.18}),w.jsx('directionalLight',{position:[3,6,5],intensity:2.2}),
      w.jsx('directionalLight',{position:[-4,3,-3],intensity:1.5}),
      environment?w.jsx(KB,{map:environment,environmentIntensity:1.05}):w.jsxs(KB,{resolution:256,children:[
        w.jsx(Sp,{intensity:4,position:[-3,4,3],scale:[2,7,1]}),
        w.jsx(Sp,{intensity:3,position:[4,2,-2],scale:[2,6,1]}),
        w.jsx(Sp,{intensity:2,position:[0,5,0],scale:[5,3,1]})]}),
      w.jsx(AtelierEnvironment,{onLoad:setEnvironment}),w.jsx(AtelierProduct,{config,environment}),
      w.jsx(JB,{position:[0,config.product==='ring'?-1.58:-2.99,0],opacity:.24,scale:11,blur:2.8,far:5,resolution:512,frames:1,key:JSON.stringify(config)}),
      w.jsx(i5,{config,view,zoom,autoRotate})]})});
}
