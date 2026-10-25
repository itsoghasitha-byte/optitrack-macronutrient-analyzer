/* Mobile-friendly 3D-inspired tilt and reveal; disabled when reduced motion is requested. */
(() => {
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cards = document.querySelectorAll('.metric-card,.preview-window,.panel,.card,.safety-card,.media-card,.landmark-card,.scenario-card,.side-card');
  cards.forEach(el => el.classList.add('immersive-card'));
  if (!reduced && window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
    cards.forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        const rx = (0.5 - y) * 4;
        const ry = (x - 0.5) * 5;
        el.style.transform = 'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) translateY(-2px)';
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }
  if (!reduced && 'IntersectionObserver' in window) {
    const targets = document.querySelectorAll('.landmark-card,.metric-card,.api-console,.panel,.safety-card,.media-card');
    targets.forEach((el, i) => { el.classList.add('immersive-reveal'); el.style.transitionDelay = Math.min(i % 4, 3) * 55 + 'ms'; });
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), {threshold: 0.12});
    targets.forEach(el => observer.observe(el));
  } else {
    document.querySelectorAll('.immersive-reveal').forEach(el => el.classList.add('is-visible'));
  }
})();


/* OptiTrack animated world: Three.js scene with shadow maps + graceful fallback. */
(() => {
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const world=document.createElement('div');world.id='opti-world';world.setAttribute('aria-hidden','true');
  const track=document.createElement('div');track.id='opti-runner-track';track.setAttribute('aria-hidden','true');
  document.body.prepend(world);document.body.prepend(track);
  let renderer,scene,camera,raf,meshGroup;
  const dark=()=>document.documentElement.dataset.theme!=='light';
  const resize=()=>{if(!renderer||!camera)return;const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()};
  function fallback(){world.style.background='radial-gradient(ellipse at 50% 20%,color-mix(in srgb,var(--opti-green,#b9d879) 13%,transparent),transparent 52%)';}
  function initThree(){
    if(reduced||!window.WebGLRenderingContext){fallback();return}
    const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js';s.async=true;
    s.onload=()=>{
      try{
        const T=window.THREE;if(!T)throw Error('Three.js unavailable');
        scene=new T.Scene();scene.fog=new T.FogExp2(0x101810,.025);
        camera=new T.PerspectiveCamera(48,innerWidth/innerHeight,.1,100);camera.position.set(0,3.5,12);camera.lookAt(0,0,0);
        renderer=new T.WebGLRenderer({alpha:true,antialias:innerWidth>700,powerPreference:'low-power'});
        renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(innerWidth,innerHeight);
        renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
        renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
        world.appendChild(renderer.domElement);
        const hemi=new T.HemisphereLight(0xe8f4dc,0x201c2b,dark()?1.5:2.2);scene.add(hemi);
        const key=new T.DirectionalLight(0xffffff,dark()?3.0:2.3);key.position.set(-4,8,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-12;key.shadow.camera.right=12;key.shadow.camera.top=12;key.shadow.camera.bottom=-12;key.shadow.bias=-.00025;scene.add(key);
        const fill=new T.PointLight(dark()?0xc58cc7:0x527d43,22,18);fill.position.set(5,2,1);scene.add(fill);
        const floor=new T.Mesh(new T.PlaneGeometry(60,60),new T.MeshStandardMaterial({color:dark()?0x18231a:0xe6eadc,roughness:.9,metalness:.05}));floor.rotation.x=-Math.PI/2;floor.position.y=-2.3;floor.receiveShadow=true;scene.add(floor);
        const grid=new T.GridHelper(48,48,dark()?0x55734c:0x78976c,dark()?0x2c4030:0xc3d0b6);grid.position.y=-2.28;grid.material.transparent=true;grid.material.opacity=.23;scene.add(grid);
        meshGroup=new T.Group();scene.add(meshGroup);
        const mats=[new T.MeshStandardMaterial({color:dark()?0xb9d879:0x527d43,roughness:.28,metalness:.22}),new T.MeshStandardMaterial({color:dark()?0xc58cc7:0x865783,roughness:.25,metalness:.3}),new T.MeshStandardMaterial({color:dark()?0xe6b77b:0xb56d39,roughness:.3,metalness:.12})];
        for(let i=0;i<15;i++){
          const geo=i%3===0?new T.IcosahedronGeometry(.35+Math.random()*.42,1):i%3===1?new T.TorusKnotGeometry(.25+Math.random()*.2,.07,64,8):new T.OctahedronGeometry(.38+Math.random()*.32,0);
          const m=new T.Mesh(geo,mats[i%3]);m.position.set((Math.random()-.5)*17,(Math.random()-.5)*6-0.1,-2-Math.random()*17);m.rotation.set(Math.random()*3,Math.random()*3,Math.random()*3);m.castShadow=true;m.receiveShadow=true;m.userData={seed:Math.random()*7,baseY:m.position.y};meshGroup.add(m);
        }
        const clock=new T.Clock();function animate(){raf=requestAnimationFrame(animate);const t=clock.getElapsedTime();meshGroup.children.forEach((m,i)=>{m.rotation.x+=.0015+(i%3)*.0004;m.rotation.y+=.002;m.position.y=m.userData.baseY+Math.sin(t*.65+m.userData.seed)*.18});renderer.render(scene,camera)}animate();
        addEventListener('resize',resize,{passive:true});
        document.addEventListener('visibilitychange',()=>{if(document.hidden&&raf)cancelAnimationFrame(raf);else if(!document.hidden){if(raf)cancelAnimationFrame(raf);animate()}});
        const observer=new MutationObserver(()=>{scene.fog.color.set(dark()?0x101810:0xf6f1e5);floor.material.color.set(dark()?0x18231a:0xe6eadc);hemi.intensity=dark()?1.5:2.2});observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
      }catch(e){fallback()}
    };s.onerror=fallback;document.head.appendChild(s);
  }
  initThree();
  if(!reduced){
    let last=0;document.addEventListener('pointerdown',e=>{
      if(Date.now()-last<90)return;last=Date.now();
      document.body.classList.remove('sugar-rush');void document.body.offsetWidth;document.body.classList.add('sugar-rush');
      for(let i=0;i<10;i++){const p=document.createElement('i');p.className='sugar-spark';p.style.left=e.clientX+'px';p.style.top=e.clientY+'px';p.style.setProperty('--dx',((Math.random()-.5)*170)+'px');p.style.setProperty('--dy',((Math.random()-.5)*170)+'px');document.body.appendChild(p);setTimeout(()=>p.remove(),1000)}
    },{passive:true});
    // Small candy particles drift on scroll without blocking controls.
    let busy=false;addEventListener('scroll',()=>{if(busy)return;busy=true;requestAnimationFrame(()=>{if(Math.random()>.45){const p=document.createElement('i');p.className='sugar-spark';p.style.left=(Math.random()*innerWidth)+'px';p.style.top=(innerHeight-12)+'px';p.style.setProperty('--dx',((Math.random()-.5)*100)+'px');p.style.setProperty('--dy',(-80-Math.random()*130)+'px');document.body.appendChild(p);setTimeout(()=>p.remove(),1000)}busy=false})},{passive:true});
  }
})();
