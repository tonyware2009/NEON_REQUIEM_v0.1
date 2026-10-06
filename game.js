const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
const overlay=document.getElementById("overlay"),startBtn=document.getElementById("startBtn");
const W=canvas.width,H=canvas.height,ground=620;
let keys={},mouse={x:900,y:360,down:false},running=false,paused=false,last=0,spawnTimer=0,shake=0;
let score=0,kills=0,particles=[],bullets=[],enemies=[],pickups=[];
const player={x:180,y:ground-70,w:42,h:70,vx:0,vy:0,speed:330,jump:720,onGround:true,hp:100,armor:50,ammo:24,maxAmmo:24,reserve:144,reloading:0,fireCD:0,facing:1};

addEventListener("keydown",e=>{
 keys[e.code]=true;
 if(e.code==="Escape"&&running){paused=!paused; overlay.classList.toggle("show",paused); if(paused){overlay.querySelector("h1").textContent="PAUSED";overlay.querySelector("p").textContent="Signal suspended.";startBtn.textContent="RESUME";}}
 if(e.code==="KeyR") reload();
});
addEventListener("keyup",e=>keys[e.code]=false);
canvas.addEventListener("mousemove",e=>{let r=canvas.getBoundingClientRect();mouse.x=(e.clientX-r.left)*W/r.width;mouse.y=(e.clientY-r.top)*H/r.height});
canvas.addEventListener("mousedown",()=>mouse.down=true); addEventListener("mouseup",()=>mouse.down=false);
startBtn.onclick=()=>{ if(!running) reset(); paused=false;running=true;overlay.classList.remove("show");last=performance.now();requestAnimationFrame(loop) };

function reset(){score=0;kills=0;bullets=[];enemies=[];particles=[];pickups=[];Object.assign(player,{x:180,y:ground-70,vx:0,vy:0,hp:100,armor:50,ammo:24,reserve:144,reloading:0});}
function reload(){if(player.reloading<=0&&player.ammo<player.maxAmmo&&player.reserve>0)player.reloading=1.05}
function shoot(){
 if(player.fireCD>0||player.reloading>0)return;
 if(player.ammo<=0){reload();return}
 player.ammo--;player.fireCD=.105;
 let sx=player.x+player.w/2,sy=player.y+25,a=Math.atan2(mouse.y-sy,mouse.x-sx);
 bullets.push({x:sx,y:sy,vx:Math.cos(a)*1050,vy:Math.sin(a)*1050,r:4,life:1.1,enemy:false});
 burst(sx,sy,4);shake=3;
}
function enemyShoot(e){
 let sx=e.x+e.w/2,sy=e.y+e.h/2,px=player.x+player.w/2,py=player.y+30,a=Math.atan2(py-sy,px-sx);
 bullets.push({x:sx,y:sy,vx:Math.cos(a)*420,vy:Math.sin(a)*420,r:5,life:2.4,enemy:true});
}
function spawn(){
 let drone=Math.random()<.32;
 enemies.push(drone?{type:"drone",x:W+50,y:170+Math.random()*260,w:48,h:30,hp:2,vx:-120,cd:1+Math.random(),phase:Math.random()*6}:
 {type:"trooper",x:W+50,y:ground-62,w:40,h:62,hp:3,vx:-80-Math.random()*45,cd:1.2+Math.random(),phase:0});
}
function burst(x,y,n=10){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*300,vy:(Math.random()-.5)*300,life:.25+Math.random()*.45,s:2+Math.random()*4})}
function hitPlayer(dmg){let absorb=Math.min(player.armor,dmg*.65);player.armor-=absorb;player.hp-=dmg-absorb;shake=10;if(player.hp<=0)gameOver()}
function gameOver(){running=false;overlay.classList.add("show");overlay.querySelector("h1").textContent="FLATLINED";overlay.querySelector("p").textContent=`Score ${score} // ${kills} hostiles neutralized`;startBtn.textContent="REBOOT";}

function update(dt){
 if(paused)return;
 player.fireCD=Math.max(0,player.fireCD-dt);
 if(player.reloading>0){player.reloading-=dt;if(player.reloading<=0){let n=Math.min(player.maxAmmo-player.ammo,player.reserve);player.ammo+=n;player.reserve-=n}}
 let dir=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0);player.vx=dir*player.speed;player.x+=player.vx*dt;
 if((keys.KeyW||keys.Space||keys.ArrowUp)&&player.onGround){player.vy=-player.jump;player.onGround=false}
 player.vy+=1850*dt;player.y+=player.vy*dt;if(player.y+player.h>=ground){player.y=ground-player.h;player.vy=0;player.onGround=true}
 player.x=Math.max(25,Math.min(W-player.w-25,player.x));player.facing=mouse.x>player.x?1:-1;if(mouse.down)shoot();

 spawnTimer-=dt;if(spawnTimer<=0){spawn();spawnTimer=Math.max(.55,1.45-kills*.012)}
 for(let e of enemies){e.x+=e.vx*dt;if(e.type==="drone")e.y+=Math.sin(performance.now()/400+e.phase)*25*dt;e.cd-=dt;if(e.cd<=0&&e.x<W-100){enemyShoot(e);e.cd=1.2+Math.random()*1.4}}
 for(let b of bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt}
 for(let b of bullets)if(b.life>0){
   if(!b.enemy){for(let e of enemies)if(e.hp>0&&rectCircle(e,b)){e.hp--;b.life=0;burst(b.x,b.y,8);if(e.hp<=0){score+=e.type==="drone"?150:100;kills++;burst(e.x+e.w/2,e.y+e.h/2,24);if(Math.random()<.12)pickups.push({x:e.x,y:e.y,type:Math.random()<.5?"armor":"ammo"})}}}
   else if(rectCircle(player,b)){b.life=0;hitPlayer(14);burst(b.x,b.y,10)}
 }
 enemies=enemies.filter(e=>e.hp>0&&e.x>-100);bullets=bullets.filter(b=>b.life>0&&b.x>-50&&b.x<W+50&&b.y>-50&&b.y<H+50);
 for(let p of pickups){p.x-=50*dt;if(overlap(player,{x:p.x,y:p.y,w:28,h:28})){if(p.type==="armor")player.armor=Math.min(100,player.armor+30);else player.reserve+=48;p.dead=true}}
 pickups=pickups.filter(p=>!p.dead&&p.x>-40);
 for(let p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=350*dt;p.life-=dt}particles=particles.filter(p=>p.life>0);
 shake=Math.max(0,shake-25*dt);
}
function rectCircle(r,c){let x=Math.max(r.x,Math.min(c.x,r.x+r.w)),y=Math.max(r.y,Math.min(c.y,r.y+r.h));return (c.x-x)**2+(c.y-y)**2<c.r*c.r}
function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}

function background(t){
 let g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,"#070616");g.addColorStop(.55,"#15102a");g.addColorStop(1,"#05070d");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 ctx.fillStyle="#b938ff";ctx.globalAlpha=.14;ctx.beginPath();ctx.arc(990,155,120,0,7);ctx.fill();ctx.globalAlpha=1;
 for(let layer=0;layer<2;layer++){let speed=layer?25:12,base=layer?530:470;for(let i=0;i<14;i++){let bw=80+(i*37)%100,bh=100+(i*73)%270,x=((i*137-t*speed/1000)%(W+200))-100;ctx.fillStyle=layer?"#0b1020":"#090b18";ctx.fillRect(x,base-bh,bw,bh);ctx.fillStyle=layer?"#00e5ff55":"#ff2bd633";for(let yy=base-bh+20;yy<base-15;yy+=28)for(let xx=x+15;xx<x+bw-10;xx+=25)if((xx+yy+i)%3>1)ctx.fillRect(xx,yy,5,9)}}
 ctx.strokeStyle="#00e5ff22";ctx.lineWidth=1;for(let x=0;x<W;x+=80){ctx.beginPath();ctx.moveTo(x,ground);ctx.lineTo(W/2+(x-W/2)*2,H);ctx.stroke()}for(let y=ground;y<H;y+=24){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
 ctx.fillStyle="#080a10";ctx.fillRect(0,ground,W,H-ground);ctx.fillStyle="#ff2bd655";ctx.fillRect(0,ground, W,3);
 for(let i=0;i<70;i++){let x=(i*191+t*.16)%W,y=(i*83+t*.45)%H;ctx.fillStyle=i%2?"#00e5ff55":"#ff2bd655";ctx.fillRect(x,y,1,10)}
}
function draw(t){
 ctx.save();let sx=(Math.random()-.5)*shake,sy=(Math.random()-.5)*shake;ctx.translate(sx,sy);background(t);
 for(let p of pickups){ctx.shadowBlur=18;ctx.shadowColor=p.type==="armor"?"#00e5ff":"#ffd84a";ctx.fillStyle=p.type==="armor"?"#00e5ff":"#ffd84a";ctx.fillRect(p.x,p.y,28,28);ctx.shadowBlur=0}
 for(let e of enemies){ctx.shadowBlur=12;ctx.shadowColor=e.type==="drone"?"#ff2bd6":"#ff395e";ctx.fillStyle=e.type==="drone"?"#7c1a80":"#321323";ctx.fillRect(e.x,e.y,e.w,e.h);ctx.fillStyle="#ff395e";ctx.fillRect(e.x+(e.type==="drone"?8:10),e.y+10,e.type==="drone"?32:20,5);ctx.shadowBlur=0}
 let px=player.x,py=player.y;ctx.shadowBlur=14;ctx.shadowColor="#00e5ff";ctx.fillStyle="#11293a";ctx.fillRect(px,py,player.w,player.h);ctx.fillStyle="#00e5ff";ctx.fillRect(px+8,py+8,26,8);ctx.fillStyle="#ff2bd6";ctx.fillRect(px+(player.facing>0?30:-14),py+25,26,8);ctx.shadowBlur=0;
 for(let b of bullets){ctx.shadowBlur=15;ctx.shadowColor=b.enemy?"#ff395e":"#00e5ff";ctx.fillStyle=b.enemy?"#ff395e":"#e9ffff";ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,7);ctx.fill();ctx.shadowBlur=0}
 for(let p of particles){ctx.globalAlpha=Math.max(0,p.life*2);ctx.fillStyle=Math.random()>.5?"#00e5ff":"#ff2bd6";ctx.fillRect(p.x,p.y,p.s,p.s)}ctx.globalAlpha=1;ctx.restore();hud();
}
function hud(){
 ctx.fillStyle="#06101bcc";ctx.fillRect(25,25,350,92);ctx.strokeStyle="#00e5ff88";ctx.strokeRect(25,25,350,92);
 ctx.fillStyle="#9eeeff";ctx.font="14px Consolas";ctx.fillText("VITALS",42,48);ctx.fillStyle="#222";ctx.fillRect(42,60,210,12);ctx.fillStyle="#ff395e";ctx.fillRect(42,60,210*Math.max(0,player.hp)/100,12);ctx.fillStyle="#222";ctx.fillRect(42,82,210,9);ctx.fillStyle="#00e5ff";ctx.fillRect(42,82,210*player.armor/100,9);
 ctx.fillStyle="#dff";ctx.font="bold 22px Consolas";ctx.fillText(`${player.ammo.toString().padStart(2,"0")} / ${player.reserve}`,270,78);ctx.font="12px Consolas";ctx.fillStyle="#ff2bd6";ctx.fillText(player.reloading>0?"RELOADING...":"SMART-RIFLE",270,98);
 ctx.textAlign="right";ctx.font="16px Consolas";ctx.fillStyle="#00e5ff";ctx.fillText(`SCORE ${score.toString().padStart(6,"0")}`,W-35,45);ctx.fillStyle="#ff2bd6";ctx.fillText(`KILLS ${kills}`,W-35,70);ctx.textAlign="left";
}
function loop(t){if(!running)return;let dt=Math.min(.033,(t-last)/1000);last=t;update(dt);draw(t);requestAnimationFrame(loop)}
draw(0);
