/* Reference photography on a shallow depth surface. This is a 2.5D actor,
   preserving real fur/anatomy and photographic wing frames, not a 360 model. */
(() => {
  'use strict';
  const host=document.querySelector('.bee-float');
  if(!host||!window.THREE)return;
  const T=window.THREE;
  const pose={flying:false,yaw:-.28,pitch:0,bank:-.1,visible:true};
  let renderer;
  try{renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch(_){return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.setClearColor(0x000000,0);renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.domElement.className='bee-webgl';renderer.domElement.setAttribute('aria-hidden','true');
  host.appendChild(renderer.domElement);
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,.1,20);
  camera.position.z=6.8;
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{alpha:true});
  const texture=new T.CanvasTexture(canvas);
  texture.colorSpace=T.SRGBColorSpace;texture.minFilter=T.LinearFilter;texture.magFilter=T.LinearFilter;texture.generateMipmaps=false;
  const geometry=new T.PlaneGeometry(3.7,3.7*566/666,64,52);
  const position=geometry.attributes.position;
  for(let i=0;i<position.count;i++){
    const x=position.getX(i),y=position.getY(i);
    const thorax=Math.exp(-((x-.25)**2/.40+(y+.15)**2/.38));
    const abdomen=Math.exp(-((x+.75)**2/.52+(y+.62)**2/.24));
    const head=Math.exp(-((x-.95)**2/.16+(y+.25)**2/.24));
    position.setZ(i,thorax*.24+abdomen*.18+head*.2);
  }
  geometry.computeVertexNormals();
  const material=new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false});
  const actor=new T.Group(),surface=new T.Mesh(geometry,material);
  actor.add(surface);scene.add(actor);
  let active=false,ready=false,raf=0,last=0,energy=0,facing=1;
  let currentFrame=-1,frameBusy=false,decoder=null,frameCount=1,loopTime=720,flightClock=0,decodedFrame=null;
  const source=new Image();source.decoding='async';
  function draw(image,index){
    const width=image.displayWidth||image.naturalWidth;
    const height=image.displayHeight||image.naturalHeight;
    if(width&&height&&(canvas.width!==width||canvas.height!==height)){
      canvas.width=width;canvas.height=height;
      surface.scale.y=(height/width)/(566/666);
    }
    ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
    texture.needsUpdate=true;currentFrame=index;ready=true;host.classList.toggle('has-3d',active);wake();
  }
  source.addEventListener('load',()=>{
    // A late image load must not overwrite an already-playing decoded frame.
    if(!decodedFrame){try{draw(source,0);}catch(_){return;}}
  });
  source.src='assets/bee.webp';
  async function loadAnimation(){
    // WebCodecs exposes the original 25fps wing frames; retain one decoded
    // frame instead of loading a large photographic atlas into GPU memory.
    if(!('ImageDecoder'in window))return;
    try{
      if(!await ImageDecoder.isTypeSupported('image/webp'))return;
      const response=await fetch('assets/bee.webp');if(!response.ok)return;
      decoder=new ImageDecoder({data:await response.arrayBuffer(),type:'image/webp'});
      await decoder.tracks.ready;frameCount=decoder.tracks.selectedTrack.frameCount;loopTime=frameCount*40;
      await updateFrame(0);
    }catch(_){decoder=null;}
  }
  async function updateFrame(index){
    if(!decoder||frameBusy||(index===currentFrame&&decodedFrame))return;
    frameBusy=true;
    try{
      const result=await decoder.decode({frameIndex:index,completeFramesOnly:true});
      const previous=decodedFrame;decodedFrame=result.image;
      draw(decodedFrame,index);previous?.close();
    }catch(_){decoder=null;}finally{frameBusy=false;}
  }
  function render(now){
    raf=0;if(!active||document.hidden||!pose.visible||!ready)return;
    const dt=Math.min((now-last)/1000,.05)||.016;last=now;
    const easing=1-Math.exp(-dt*12);
    energy+=((pose.flying?1:0)-energy)*easing;
    if(pose.flying)flightClock+=dt*1000;else if(energy<.04)flightClock=0;
    const index=pose.flying||energy>.04?Math.floor((flightClock%loopTime)/40)%frameCount:0;
    if(decoder)updateFrame(index);
    host.classList.toggle('uses-native-animation',!decoder&&pose.flying);
    const direction=Math.cos(pose.yaw)<0?-1:1;
    host.style.setProperty('--bee-facing',direction);
    host.style.setProperty('--bee-bank',pose.bank+'rad');
    facing+=(direction-facing)*(1-Math.exp(-dt*16));
    surface.scale.x=(facing<0?-1:1)*(.86+.14*Math.abs(facing));
    // Limited perspective preserves the photographic side view through turns.
    const yaw=Math.sin(pose.yaw)*.28;
    actor.rotation.y+=(yaw-actor.rotation.y)*easing;
    actor.rotation.x+=(pose.pitch*.5-actor.rotation.x)*easing;
    actor.rotation.z+=(pose.bank-actor.rotation.z)*easing;
    actor.position.y=energy*Math.sin(now*.008)*.018;
    renderer.render(scene,camera);
    // Perched bees hold their wings still and release the continuous render loop.
    if(pose.flying||energy>.002||Math.abs(facing-direction)>.002||Math.abs(actor.rotation.z-pose.bank)>.001)raf=requestAnimationFrame(render);
  }
  function wake(){if(active&&ready&&!raf&&!document.hidden&&pose.visible){last=performance.now();raf=requestAnimationFrame(render);}}
  new ResizeObserver(()=>{if(host.clientWidth>0)renderer.setSize(host.clientWidth,host.clientWidth,false);wake();}).observe(host);
  document.addEventListener('visibilitychange',wake);
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();ready=false;host.classList.remove('has-3d');});
  window.Bee3D={
    setPose(next){Object.assign(pose,next);wake();},
    setActive(value){active=value;host.classList.toggle('has-3d',active&&ready);if(!active&&raf){cancelAnimationFrame(raf);raf=0;}wake();},
    getStatus(){return{ready,animated:!!decoder,frame:currentFrame,frameCount,active,flying:pose.flying};}
  };
  loadAnimation();
})();
