/* Blockcraft VR — Caves, Exploration & Animal Sounds Update */
(() => {
'use strict';
const BUILD='Biomes, Villagers & Voice Chat';

const toast=document.createElement('div');
toast.id='exploreToast';
Object.assign(toast.style,{
  position:'fixed',left:'50%',top:'72px',transform:'translateX(-50%)',
  padding:'8px 14px',borderRadius:'8px',background:'rgba(0,0,0,.58)',
  color:'#fff',font:'600 13px Segoe UI,system-ui,sans-serif',
  textShadow:'0 1px 2px #000',zIndex:'8',opacity:'0',
  pointerEvents:'none',transition:'opacity .25s'
});
document.body.appendChild(toast);
let toastTimer=0;
function exploreToast(msg){
  toast.textContent=msg;
  toast.style.opacity='1';
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>toast.style.opacity='0',2600);
}

const buildLabel=document.getElementById('buildLabel');
if(buildLabel&&/VR/i.test(buildLabel.textContent||'')){
  buildLabel.textContent='VR '+BUILD+' · ';
}

const baseGenChunk=genChunk;
const idx=(x,y,z)=>(y*CHUNK*CHUNK)+(z*CHUNK)+x;
const inLocal=(x,y,z)=>x>=0&&x<CHUNK&&z>=0&&z<CHUNK&&y>1&&y<HEIGHT-1;
const solid=id=>id!==AIR&&id!==WATER;
function carve(data,x,y,z){ if(inLocal(x,y,z)) data[idx(x,y,z)]=AIR; }
function local(data,x,y,z){ return inLocal(x,y,z)?data[idx(x,y,z)]:STONE; }

function carveEllipsoid(data,cx,cy,cz,rx,ry,rz,salt){
  const x0=Math.max(1,Math.floor(cx-rx-1)),x1=Math.min(CHUNK-2,Math.ceil(cx+rx+1));
  const z0=Math.max(1,Math.floor(cz-rz-1)),z1=Math.min(CHUNK-2,Math.ceil(cz+rz+1));
  const y0=Math.max(3,Math.floor(cy-ry-1)),y1=Math.min(HEIGHT-3,Math.ceil(cy+ry+1));
  for(let x=x0;x<=x1;x++) for(let z=z0;z<=z1;z++) for(let y=y0;y<=y1;y++){
    const d=((x-cx)*(x-cx))/(rx*rx)+((y-cy)*(y-cy))/(ry*ry)+((z-cz)*(z-cz))/(rz*rz);
    const rag=(hash3(x,y,z,salt)-.5)*.16;
    if(d+rag<1) carve(data,x,y,z);
  }
}

function addRuin(data,cy){
  const x0=3,x1=12,z0=3,z1=12,y0=cy,y1=Math.min(HEIGHT-4,cy+6);
  for(let x=x0;x<=x1;x++) for(let z=z0;z<=z1;z++) for(let y=y0;y<=y1;y++){
    const edge=x===x0||x===x1||z===z0||z===z1;
    const floor=y===y0, roof=y===y1;
    if(floor) data[idx(x,y,z)]=SBRICK;
    else if(roof&&((x+z)&1)===0) data[idx(x,y,z)]=BRICK;
    else if(edge&&y<=y0+2&&((x+z)%3===0)) data[idx(x,y,z)]=SBRICK;
    else data[idx(x,y,z)]=AIR;
  }
  for(const [x,z] of [[4,4],[11,4],[4,11],[11,11]]){
    const h=2+Math.floor(hash3(x,cy,z,19531)*3);
    for(let y=cy+1;y<=cy+h;y++) data[idx(x,y,z)]=(y&1)?BRICK:SBRICK;
  }
  data[idx(5,cy+1,8)]=GLOWB;
  data[idx(10,cy+1,8)]=GLOWB;
  data[idx(8,cy+1,8)]=CHEST;
}

function enhanceOverworldChunk(data,cx,cz){
  const wx0=cx*CHUNK,wz0=cz*CHUNK;

  // Long winding cave ribbons that connect the game's existing noise caves.
  for(let lx=0;lx<CHUNK;lx++) for(let lz=0;lz<CHUNK;lz++){
    const wx=wx0+lx,wz=wz0+lz;
    const surface=terrainHeight(wx,wz);
    const top=Math.min(surface-6,46);
    for(let y=5;y<top;y++){
      const b=data[idx(lx,y,lz)];
      if(!solid(b)) continue;
      const ribbon=Math.abs(vnoise3(wx*.033,y*.052,wz*.033,19103)-.5);
      const detail=vnoise3(wx*.093,y*.087,wz*.093,19109);
      if(ribbon<.035&&detail>.39) data[idx(lx,y,lz)]=AIR;
    }
  }

  // Occasional large chambers with a smaller connected pocket.
  if(hash(cx,cz,19121)<.30){
    const lx=4+Math.floor(hash(cx,cz,19122)*8);
    const lz=4+Math.floor(hash(cx,cz,19123)*8);
    const wx=wx0+lx,wz=wz0+lz;
    const cap=Math.max(9,Math.min(31,terrainHeight(wx,wz)-9));
    const cy=7+Math.floor(hash(cx,cz,19124)*Math.max(2,cap-7));
    carveEllipsoid(
      data,lx,cy,lz,
      4.5+hash(cx,cz,19125)*3.2,
      2.8+hash(cx,cz,19126)*2.4,
      4.5+hash(cx,cz,19127)*3.2,
      19128
    );
    const sx=Math.max(3,Math.min(12,lx+(hash(cx,cz,19129)<.5?-4:4)));
    const sz=Math.max(3,Math.min(12,lz+(hash(cx,cz,19130)<.5?-3:3)));
    carveEllipsoid(data,sx,cy+(hash(cx,cz,19131)<.5?-1:1),sz,3.1,2.1,3.5,19132);
  }

  // Rare underground ruin with glow blocks + a chest.
  if(hash(cx,cz,19200)<.055){
    const wx=wx0+8,wz=wz0+8;
    const maxY=Math.max(10,Math.min(26,terrainHeight(wx,wz)-12));
    const cy=6+Math.floor(hash(cx,cz,19201)*Math.max(3,maxY-6));
    addRuin(data,cy);
  }

  // Cave decoration: mushrooms, glow stone pockets, exposed diamond blocks.
  for(let lx=1;lx<CHUNK-1;lx++) for(let lz=1;lz<CHUNK-1;lz++){
    const wx=wx0+lx,wz=wz0+lz;
    const top=Math.min(42,terrainHeight(wx,wz)-5);
    for(let y=4;y<top;y++){
      const b=local(data,lx,y,lz);
      if(b===AIR&&solid(local(data,lx,y-1,lz))){
        const r=hash3(wx,y,wz,19300);
        if(r<.0028) data[idx(lx,y,lz)]=r<.00115?MUSHROOMB:MUSHROOMR;
      } else if(solid(b)){
        const exposed=
          local(data,lx+1,y,lz)===AIR||local(data,lx-1,y,lz)===AIR||
          local(data,lx,y,lz+1)===AIR||local(data,lx,y,lz-1)===AIR||
          local(data,lx,y+1,lz)===AIR;
        if(exposed){
          const r=hash3(wx,y,wz,19307);
          if(r<.00125) data[idx(lx,y,lz)]=GLOWB;
          else if(y<22&&r<.00205) data[idx(lx,y,lz)]=DIAMB;
        }
      }
    }
  }
  return data;
}

genChunk=function(cx,cz){
  const data=baseGenChunk(cx,cz);
  if(dim===0) enhanceOverworldChunk(data,cx,cz);
  return data;
};

// Finish distinctive calls for the three fantasy animals.
const baseAnimalCall=animalCall;
animalCall=function(type,pos,mood='idle'){
  if(!['mossling','moonhopper','crystalback'].includes(type)){
    return baseAnimalCall(type,pos,mood);
  }
  if(!AC) return;
  const d=pos?Math.hypot(pos.x-player.pos.x,pos.z-player.pos.z):0;
  if(d>34) return;
  const att=Math.max(.10,1-d/34),hurt=mood==='hurt',die=mood==='die';

  if(type==='mossling'){
    tone((hurt?260:150)*jr(.08),(hurt?150:105)*jr(.08),hurt?.16:.24,'triangle',.075*att);
    tone(420*jr(.1),300*jr(.1),.055,'square',.025*att,.08);
  } else if(type==='moonhopper'){
    const base=(hurt?760:540)*jr(.1);
    tone(base,base*1.28,.07,'sine',.075*att);
    tone(base*1.34,base*.92,die?.20:.09,'sine',.055*att,.07);
  } else {
    const base=(hurt?330:235)*jr(.06);
    tone(base,base*1.45,die?.28:.18,'sine',.07*att);
    tone(base*2.02,base*1.62,.22,'triangle',.035*att,.035);
  }
};

let lastDepthState=false,lastRuinChunk='';
function undergroundState(){
  if(!inGame||dim!==0||!player||!player.pos) return null;
  const x=Math.floor(player.pos.x),z=Math.floor(player.pos.z),y=player.pos.y;
  const surface=terrainHeight(x,z);
  return {x,z,y,surface,depth:surface-y,cx:x>>4,cz:z>>4};
}

// Subtle cave ambience with discovery messages.
setInterval(()=>{
  const s=undergroundState();
  if(!s) return;
  const deep=s.depth>8;
  if(deep&&!lastDepthState) exploreToast('Deep caves — listen for creatures and hidden ruins');
  lastDepthState=deep;
  if(!deep||!AC) return;

  if(Math.random()<.62){
    const f=650+Math.random()*650;
    tone(f,f*.55,.045,'sine',.018+Math.random()*.018);
    tone(f*.58,f*.30,.07,'sine',.010,.055);
  } else {
    const f=58+Math.random()*34;
    tone(f,f*.72,.34,'triangle',.012+Math.random()*.012);
  }

  const rk=s.cx+','+s.cz;
  if(hash(s.cx,s.cz,19200)<.055&&rk!==lastRuinChunk&&s.depth>10){
    lastRuinChunk=rk;
    exploreToast('Something ancient is hidden in this cave...');
  }
},8500);

// Crystalbacks can now inhabit underground caverns instead of only surface biomes.
setInterval(()=>{
  const s=undergroundState();
  if(!s||s.depth<9) return;

  let nearby=0;
  for(const a of animals){
    if(a.type==='crystalback'&&a.pos.distanceToSquared(player.pos)<28*28) nearby++;
  }
  if(nearby>=2||Math.random()>.55) return;

  for(let attempt=0;attempt<22;attempt++){
    const x=Math.floor(player.pos.x+(Math.random()*2-1)*18);
    const z=Math.floor(player.pos.z+(Math.random()*2-1)*18);
    const start=Math.max(4,Math.floor(player.pos.y-5));
    const end=Math.min(HEIGHT-4,Math.floor(player.pos.y+7));

    for(let y=start;y<=end;y++){
      const here=getBlock(x,y,z),head=getBlock(x,y+1,z),below=getBlock(x,y-1,z);
      if(here===AIR&&head===AIR&&solid(below)&&below!==GLOWB){
        spawnAnimal('crystalback',x+.5,y+.05,z+.5);
        if(Math.random()<.35) exploreToast('You hear a crystalback moving through the cave');
        return;
      }
    }
  }
},11000);

console.info('[Blockcraft]',BUILD,'loaded');
})();
