// A single shape carries the full 30s sequence. Every pose and interaction is seekable.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { Layer2D, clearRT } from '../engine/gl';
import { F, font, textPath2D } from '../engine/type';

const TAU = Math.PI*2, INK = '#141612', PAPER = '#eeeede', ACCENT = '#d8fa79';
const clamp = (x:number) => Math.max(0,Math.min(1,x));
const mix = (a:number,b:number,p:number) => a+(b-a)*p;
const ease = (x:number) => { x=clamp(x); return x*x*(3-2*x); };
// Critically damped spring, normalized to finish exactly on the measured hit.
const spring = (x:number) => { x=clamp(x); const k=8; return (1-(1+k*x)*Math.exp(-k*x))/(1-(1+k)*Math.exp(-k)); };
interface Shot { id:string; at:number; end:number; copy:string }
interface Score { duration:number; morph_lead_seconds:number; final_lockup_at:number; shots:Shot[]; interactions:Record<string,number> }
type Pose = [number,number,number,number,number]; // x, y, width, height, radius
const POSES:Pose[] = [[284,537,140,140,42],[284,533,494,356,15],[284,539,247,426,37],
  [284,534,494,351,17],[284,541,146,302,38],[284,535,460,345,15],
  [284,530,492,365,22],[284,535,492,382,8],[284,535,358,358,179],[284,500,460,350,0]];
const TITLES = [['WHAT CAN','YOU BUILD?'],['WEBSITES THAT','COME ALIVE.'],['APPS THAT','FEEL MAGICAL.'],
  ['DATA TURNED','INTO EXPERIENCES.'],['PRODUCT STORIES','THAT SELL.'],['MOTION','WITHOUT LIMITS.'],
  ['STORIES','BROUGHT TO LIFE.'],['WORLDS BUILT','FROM CODE.'],['SOUND','YOU CAN SEE.']];

export default class Possibilities extends Scene {
  private layer = new Layer2D();
  private score!:Score;
  private c!:CanvasRenderingContext2D;
  private titleMask!:Path2D;
  override async init() {
    const r=await fetch('data/possibilities/cues.json');
    if(!r.ok) throw new Error('Missing possibilities score: run analysis/build_possibilities_audio.py');
    this.score=await r.json();
    this.titleMask=textPath2D('MOTION',F.archivo(75,900),126,-244,-49);
  }
  private round(x:number,y:number,w:number,h:number,r:number,fill:string|CanvasGradient,stroke?:string) {
    const c=this.c;c.beginPath();c.roundRect(x,y,w,h,Math.min(r,Math.min(w,h)/2));
    c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}
  }
  private text(s:string,x:number,y:number,size=16,color=PAPER,weight=500,max=460,align:CanvasTextAlign='left') {
    const c=this.c;c.font=font(F.archivo(100,weight),size);c.fillStyle=color;c.textAlign=align;c.textBaseline='alphabetic';
    c.fillText(s,x,y,max);
  }
  private display(s:string,x:number,y:number,size:number,color=PAPER,max=490,outline=false) {
    const c=this.c;c.font=font(F.archivo(75,900),size);c.textAlign='left';c.textBaseline='alphabetic';
    const width=c.measureText(s).width;c.save();c.translate(x,y);c.scale(Math.min(1,max/width),1);
    c.fillStyle=color;c.strokeStyle=color;c.lineWidth=1;
    outline?c.strokeText(s,0,0):c.fillText(s,0,0);c.restore();
  }
  private line(points:number[][],color=ACCENT,width=2) {
    const c=this.c;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
    c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();
  }
  private circle(x:number,y:number,r:number,fill:string) {
    const c=this.c;c.beginPath();c.arc(x,y,Math.max(0,r),0,TAU);c.fillStyle=fill;c.fill();
  }
  private cursor(x:number,y:number,click:number) {
    const c=this.c;c.save();c.translate(x,y);c.scale(1-.15*click,1-.15*click);
    c.beginPath();c.moveTo(0,0);c.lineTo(0,25);c.lineTo(7,19);c.lineTo(13,30);c.lineTo(18,27);c.lineTo(12,16);c.lineTo(24,16);c.closePath();
    c.fillStyle=PAPER;c.fill();c.strokeStyle=INK;c.lineWidth=2;c.stroke();c.restore();
    if(click>.05){c.strokeStyle=ACCENT;c.lineWidth=2;c.beginPath();c.arc(x,y,9+21*(1-click),0,TAU);c.stroke();}
  }
  private geometric(x:number,y:number,r:number,p:number,color=ACCENT) {
    const c=this.c;c.save();c.translate(x,y);c.rotate(p*.7);
    for(let i=0;i<8;i++){c.save();c.rotate(i*TAU/8);this.round(-r*.14,-r,r*.28,r*.68,r*.13,color);c.restore();}
    this.circle(0,0,r*.26,color);c.restore();
  }
  private pose(t:number,index:number):Pose {
    let value=[...POSES[0]] as Pose;
    for(let i=1;i<=index+1&&i<POSES.length;i++){
      const at=this.score.shots[i].at,p=spring((t-at+this.score.morph_lead_seconds)/this.score.morph_lead_seconds);
      value=value.map((v,j)=>v+(POSES[i][j]-POSES[i-1][j])*p) as Pose;
    }
    return value;
  }
  private website(t:number) {
    const c=this.c;
    this.round(-244,-176,488,352,12,PAPER);
    this.line([[-244,-146],[244,-146]],'#c2c7b6',1);
    for(let i=0;i<3;i++)this.circle(-226+i*12,-160,3.2,i===0?INK:'#a2a996');
    this.text('studio / possibility',-158,-157,10,INK);
    this.text('SOLSTICE',-219,-120,14,INK,900);
    this.text('Work   About   Contact',67,-120,10,INK);
    const enter=spring(t/.6);
    c.save();c.beginPath();c.rect(-225,-100,450,130*enter);c.clip();
    this.display('MAKE ROOM',-220,-47,52,INK,410);
    this.display('FOR BETTER.',-220,8,52,INK,410);c.restore();
    this.text('Independent ideas. Extraordinary spaces.',-218,32,13,INK);
    this.round(-220,49,128,29,15,INK);this.text('Explore the work  ↗',-208,68,10,PAPER,700);
    for(let i=0;i<3;i++){
      const s=spring((t-.3-i*.12)/.5);c.save();c.translate(-147+i*148,130+(1-s)*65);
      this.round(-70,-36,140,73,7,i===1?ACCENT:'#d4dac7');
      if(i===0){for(let k=0;k<8;k++)this.line([[-42+k*12,28],[-16+k*8,-25]],INK,2);}
      if(i===1)this.geometric(0,0,30,t*.7,INK);
      if(i===2)for(let k=0;k<4;k++){c.save();c.rotate(k*.2+t*.2);c.strokeStyle=INK;c.strokeRect(-22,-22,44,44);c.restore();}
      c.restore();
    }
    const clickAt=this.score.interactions.website_click-this.score.shots[1].at;
    this.cursor(mix(140,-128,ease(t/clickAt)),mix(119,58,ease(t/clickAt)),Math.exp(-Math.max(0,t-clickAt)*12)*(t>clickAt?1:0));
  }
  private app(t:number,absolute:number) {
    const c=this.c;this.round(-118,-207,236,414,30,'#23281f');
    this.round(-35,-199,70,12,6,INK);this.text('9:41',-94,-184,10,PAPER,700);
    this.text('A LITTLE',-94,-139,24,PAPER,900);this.text('MORE FOCUS.',-94,-110,24,ACCENT,900);
    this.text('Your space to make something.',-94,-85,11,'#aeb7a6');
    this.round(-94,-63,188,108,15,'#343d2b');
    this.geometric(0,-13,37,t*.7);this.text('Today’s intention',-76,31,11,PAPER);
    this.round(-94,60,188,39,10,'#161b13','#6a775d');
    const typed='Build something good.'.slice(0,Math.floor(clamp((t-.2)/.65)*21));
    this.text(typed,-82,85,12,PAPER);if(t<.9)this.line([[69,72],[69,88]],ACCENT,1);
    const click=this.score.interactions.app_click;
    const q=absolute-click;
    this.round(-94,114,188,42,21,ACCENT);
    if(q<0)this.text('LET’S BEGIN',0,141,13,INK,900,170,'center');
    else if(absolute<this.score.interactions.app_complete){c.save();c.translate(0,135);c.rotate(q*TAU*2);c.beginPath();c.arc(0,0,10,0,Math.PI*1.6);c.strokeStyle=INK;c.lineWidth=3;c.stroke();c.restore();}
    else {this.line([[-51,135],[-44,141],[-32,129]],INK,3);this.text('YOU’RE READY',13,141,12,INK,900,120,'center');}
    this.round(-90,179,180,14,7,'#333b2b');this.round(-84+54*ease((t-1.8)/.5),182,53,8,4,ACCENT);
    this.cursor(mix(134,60,ease(t/(click-this.score.shots[2].at))),mix(210,143,ease(t/(click-this.score.shots[2].at))),q>=0?Math.exp(-q*14):0);
  }
  private dashboard(t:number) {
    const c=this.c;this.round(-244,-170,488,340,15,PAPER);
    this.text('OVERVIEW',-221,-140,15,INK,900);this.text('Week  /  Month',118,-140,10,INK,500);
    this.round(-219,-117,204,75,12,INK);this.text('Creative sessions',-204,-95,11,'#bcc4b0');
    this.text(String(Math.round(248*spring(t/.8))),-204,-62,30,ACCENT,900);this.text('DEMO DATA',-120,-62,9,PAPER);
    this.round(1,-117,218,75,12,'#d7dfc9');this.text('Focus time',17,-95,11,INK);
    this.text(`${Math.round(86*spring(t/.9))} h`,17,-62,30,INK,900);
    for(let i=0;i<4;i++)this.line([[-216,1+i*34],[217,1+i*34]],'#cad0bf',1);
    const points:number[][]=[];
    for(let i=0;i<8;i++){
      const x=-210+i*60,y=105-[20,39,33,71,59,82,101,115][i]*spring((t-.12*i)/.8);
      this.round(x-10,y,20,109-y,4,'#bacb9b');points.push([x,y-3]);
    }
    this.line(points,INK,3);points.forEach(([x,y])=>this.circle(x,y,4,INK));
    this.text('M',-213,138,10,INK);this.text('W',-90,138,10,INK);this.text('F',33,138,10,INK);this.text('S',208,138,10,INK);
    // The palette travels into the real graph area, while the graph remains alive.
    const paletteAt=this.score.interactions.command_palette-this.score.shots[3].at;
    if(t>paletteAt){const s=spring((t-paletteAt)/.4);c.save();c.translate(0,55+(1-s)*90);
      this.round(-156,-41,312,80,12,INK);this.text('⌘ K    Find a better question',-138,-14,12,PAPER);
      this.round(-143,1,286,24,5,ACCENT);this.text('↗  Explore this week',-133,17,11,INK,700);c.restore();}
  }
  private product(t:number) {
    const c=this.c;
    // Fictional portable speaker, with a dimensional chamfer and precise moving key light.
    c.save();c.translate(0,8);c.transform(1,.045*Math.sin(t*.8),-.14,1,0,0);
    this.round(-67,-149,145,300,35,'#778369');this.round(-76,-155,141,300,33,'#303a29');
    const metal=c.createLinearGradient(-75,0,67,0);metal.addColorStop(0,'#a5b09a');metal.addColorStop(.12,'#3d4b32');metal.addColorStop(.55,'#20291b');metal.addColorStop(.9,'#6f7e5e');metal.addColorStop(1,'#cad5b9');
    this.round(-69,-150,130,290,29,metal);
    for(let y=-114;y<90;y+=9)for(let x=-47;x<45;x+=9)this.circle(x,y,1.25,'#10170d');
    this.round(-35,-135,62,5,2,ACCENT);this.text('FORM / 01',-5,118,10,PAPER,700,90,'center');
    const h=-142+(t%2.1)/2.1*260;c.save();c.beginPath();c.roundRect(-69,-150,130,290,29);c.clip();
    c.fillStyle='rgba(230,250,203,.18)';c.fillRect(-75,h,150,17);c.restore();c.restore();
    c.save();c.globalAlpha=.5;this.line([[-160,173],[167,173]],'#7b866f',1);c.restore();
    this.text('FORM',-212,12,54,PAPER,900,170);this.text('01',100,81,66,ACCENT,900,130);
  }
  private kinetic(t:number,absolute:number) {
    const c=this.c;
    const beat=this.ctx.audio.beatAt(absolute+this.ctx.start);
    for(let row=0;row<3;row++){
      const s=spring((t-row*.14)/.55);c.save();c.translate(-212, -80+row*106);
      c.scale(1, mix(.65,1,s));this.display(['MOVE.','MAKE.','REPEAT.'][row],0,0,103,INK,438,row===1);c.restore();
    }
    // Modules change shape on measured audio hits instead of decorative random particles.
    const pulse=this.ctx.audio.hit('kick',absolute+this.ctx.start,.09);
    for(let i=0;i<6;i++){
      c.save();c.translate(-176+i*69,164);c.rotate((beat*.12+i/6)*TAU);
      if(i%2)this.round(-18,-18,36,36,mix(3,17,pulse),INK);
      else {c.fillStyle=INK;c.beginPath();c.moveTo(0,-24);c.lineTo(23,19);c.lineTo(-23,19);c.closePath();c.fill();}c.restore();
    }
  }
  private story(t:number) {
    const c=this.c;
    this.round(-245,-181,490,363,18,'#dfe5cc');
    this.circle(120,-107,34,ACCENT);
    for(let layer=0;layer<3;layer++){
      c.beginPath();c.moveTo(-250,190);
      for(let x=-250;x<=250;x+=8){const y=20+layer*57+Math.sin((x+t*18/(layer+1))/70+layer)*25;c.lineTo(x,y);}
      c.lineTo(250,190);c.closePath();c.fillStyle=['#adb99a','#738565','#3d5339'][layer];c.fill();
    }
    // An original little geometric character discovers and catches the 'idea' seed.
    const walk=ease(t/.95), x=mix(-160,-10,walk), hop=Math.sin(Math.min(t,.95)*12)*5*(1-walk);
    c.save();c.translate(x,86+hop);c.rotate(-.05+Math.sin(t*3)*.04);
    this.line([[-19,48],[-28,69]],INK,10);this.line([[18,48],[28,69]],INK,10);
    this.round(-40,-28,80,85,20,ACCENT);this.round(-32,-20,64,40,14,INK);
    this.circle(-15,-3,4,PAPER);this.circle(15,-3,4,PAPER);
    this.line([[0,-29],[0,-43]],INK,3);this.circle(0,-47,5,ACCENT);
    const reach=ease((t-.8)/.65);this.line([[38,27],[60+16*reach,22-39*reach]],ACCENT,10);
    this.line([[-38,24],[-55,37]],ACCENT,10);c.restore();
    const catchAt=this.score.interactions.catch_seed-this.score.shots[6].at;
    const catchSeed=ease((t-catchAt+.7)/.7);
    const seedX=mix(120,x+74,catchSeed),seedY=mix(-70,69,catchSeed);
    this.geometric(seedX,seedY,16,t,INK);
    if(catchSeed>.8){for(let i=0;i<5;i++){const a=i*TAU/5;this.line([[seedX+Math.cos(a)*25,seedY+Math.sin(a)*25],[seedX+Math.cos(a)*33,seedY+Math.sin(a)*33]],INK,2);}}
  }
  private world(t:number) {
    const c=this.c;const yaw=.56+t*.18;
    const project=(x:number,y:number,z:number)=>{
      const px=x*Math.cos(yaw)-z*Math.sin(yaw),pz=x*Math.sin(yaw)+z*Math.cos(yaw);
      return [px*48, pz*23-y*54+94];
    };
    // A deliberate architectural model; sorted far-to-near, no random scenery.
    const cubes=[] as {x:number;z:number;h:number}[];
    for(let z=-2;z<=2;z++)for(let x=-2;x<=2;x++){
      const i=(z+2)*5+x+2;const growth=spring((t-i*.018)/.65);
      cubes.push({x:x*1.12,z:z*1.12,h:(.45+((x*x+z*z+3)%5)*.37)*growth});
    }
    cubes.sort((a,b)=>(a.x*Math.sin(yaw)+a.z*Math.cos(yaw))-(b.x*Math.sin(yaw)+b.z*Math.cos(yaw)));
    const poly=(pts:number[][],fill:string)=>{c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();c.strokeStyle=INK;c.lineWidth=1;c.stroke();};
    for(const q of cubes){const x=q.x,z=q.z,h=q.h,s=.84;
      poly([project(x,0,z),project(x+s,0,z),project(x+s,h,z),project(x,h,z)],'#758666');
      poly([project(x+s,0,z),project(x+s,0,z+s),project(x+s,h,z+s),project(x+s,h,z)],'#465c3c');
      poly([project(x,h,z),project(x+s,h,z),project(x+s,h,z+s),project(x,h,z+s)],(q.x===0&&q.z===0)?ACCENT:PAPER);
    }
    c.save();c.translate(-20,-84);c.rotate(-.08);
    this.round(-43,-85,86,117,43,ACCENT);this.round(-28,-70,56,111,28,INK);
    this.geometric(0,-17,17,t);c.restore();
  }
  private music(t:number,absolute:number) {
    const c=this.c,au=this.ctx.audio;
    for(let i=0;i<96;i++){
      const angle=i/96*TAU-Math.PI/2;
      const env=au.env(i%3===0?'low':i%3===1?'mid':'high',Math.max(0,absolute-.35+i/96*.7));
      const radius=99, length=16+env*68;
      this.line([[Math.cos(angle)*radius,Math.sin(angle)*radius],[Math.cos(angle)*(radius+length),Math.sin(angle)*(radius+length)]],i%8===0?INK:'#708449',2.8);
    }
    this.geometric(0,0,67,t*.45,INK);
    for(let k=0;k<5;k++){
      const pts=[];for(let j=0;j<70;j++){
        const env=au.env('low',Math.max(0,absolute-.5+j/70));
        pts.push([-230+j*6.65,171+k*5+Math.sin(j*.23+t*4+k)*env*9]);
      }this.line(pts,INK,.75);
    }
  }
  private reveal(t:number,absolute:number) {
    const c=this.c;const lock=this.score.final_lockup_at;
    const revealAt=this.score.shots[9].at;
    const title=absolute>=lock;
    // Miniature fragments collapse into the letter masks: interfaces, chart, architecture.
    const contraction=ease((absolute-revealAt)/1.0);
    if(!title){
      // Keep the emotional payoff clear; scene fragments sit above the three text lines.
      for(let i=0;i<8;i++){
        c.save();c.translate(-213+i*60,-159-15*(1-contraction));c.scale(.15,.15);
        this.round(-100,-80,200,160,15,i%2?ACCENT:PAPER);
        this.line([[-70,40],[-35,8],[4,20],[55,-38]],INK,10);c.restore();
      }
      this.display('ONE IDEA.',-244,-57,83,PAPER,485);
      this.display('ENDLESS',-244,32,87,ACCENT,485);
      this.display('POSSIBILITIES.',-244,111,79,PAPER,485);
    }else{
      const arrive=spring((absolute-lock)/.28);
      c.save();c.beginPath();c.rect(-246,-193,492,360*arrive);c.clip();
      this.display('MOTION',-244,-49,126,PAPER,485);
      this.display('FLEX',-244,73,145,ACCENT,485);
      // A brief filmstrip of the earlier visual language lives INSIDE the final letterforms.
      if(absolute<lock+.65){
        c.save();c.clip(this.titleMask);
        for(let i=0;i<10;i++){
          const px=-270+i*75-(absolute-lock)*110;
          this.round(px,-150,63,112,4,i%2?ACCENT:'#657751');
          this.line([[px+5,-60],[px+20,-100],[px+40,-77],[px+59,-130]],INK,5);
        }c.restore();
      }
      c.restore();
      this.text('Powered by Claude Opus 5.5',-241,121,18,PAPER,500,480);
      this.text('COMMENT “MOTION” FOR THE WORKFLOW',-241,170,12,ACCENT,700,480);
    }
  }

  private bridge(t:number) {
    // The same 18 physical slats reconfigure at each handoff. No full-screen fade.
    const c=this.c;
    for(let k=1;k<this.score.shots.length;k++){
      const at=this.score.shots[k].at;
      if(t<at-.32||t>at+.26)continue;
      const travel=ease((t-at+.32)/.58), unfold=Math.sin(travel*Math.PI);
      for(let j=0;j<18;j++){
        const u=(j+.5)/18,a=u*TAU;
        const fromX=k<5?(j%6-2.5)*63:Math.cos(a)*159;
        const fromY=k<5?(Math.floor(j/6)-1)*67:Math.sin(a)*121;
        const toX=k===2?(j%3-1)*57:k===8?Math.cos(a)*125:(j%6-2.5)*69;
        const toY=k===2?(Math.floor(j/3)-2.5)*48:k===8?Math.sin(a)*125:(Math.floor(j/6)-1)*78;
        const x=mix(fromX,toX,travel),y=mix(fromY,toY,travel)-Math.sin(travel*Math.PI)*42;
        c.save();c.translate(284+x,537+y);c.rotate((1-travel)*.22*Math.sin(j));
        this.round(-24*unfold,-9*unfold,48*unfold,18*unfold,3*unfold,j%3===0?PAPER:ACCENT);c.restore();
      }
    }
  }

  canvasFrame(f:Pick<Frame,'t'|'lt'>):HTMLCanvasElement {
    const t=Math.max(0,Math.min(this.score.duration-1e-6,f.lt));
    const shots=this.score.shots;
    let index=0;for(let i=1;i<shots.length;i++)if(t>=shots[i].at)index=i;
    const local=t-shots[index].at, next=shots[index+1];
    const pose=this.pose(t,index), [x,y,w,h,r]=pose;
    const c=this.c=this.layer.ctx;
    const light=[1,3,8].includes(index), acid=index===5;
    const background=acid?ACCENT:light?PAPER:INK, foreground=light||acid?INK:PAPER;
    this.layer.clear(background);c.save();c.translate(656,0);

    // Architectural proportions, no decorative borders, corner labels, or title-on-gradient.
    if(index<9){
      const title=TITLES[index];const wipe= index===0?1:spring(local/.24);
      c.save();c.beginPath();c.rect(35,205,505,145*wipe);c.clip();
      this.display(title[0],38,268,62,foreground,492);
      this.display(title[1],38,328,62,acid?INK:light?INK:ACCENT,492);c.restore();
    }

    // This same container changes aspect, size and radius across browser/app/dashboard/product.
    const shell=index<=4;
    if(shell){
      c.save();c.translate(x,y);
      c.shadowColor='rgba(0,0,0,.19)';c.shadowBlur=24;c.shadowOffsetY=18;
      this.round(-w/2,-h/2,w,h,r,index===0?ACCENT:index===1||index===3?PAPER:'#39452e',index===0?undefined:light?'#abb69b':'#778766');
      c.restore();
    }

    c.save();c.translate(x,y);
    if(index<5){
      const base=POSES[index];c.scale(w/base[2],h/base[3]);
    }
    // Content has room before entering; outgoing content retracts into the carrier.
    if(next && t>next.at-.20){const closing=ease((next.at-t)/.20);c.beginPath();c.rect(-265,-230,530,460*closing);c.clip();}
    switch(index){
      case 0:{
        const u=local/shots[0].end;
        c.save();c.rotate(u*.5);for(let i=0;i<6;i++){
          const a=i*TAU/6,spread=38+70*spring(u);
          c.save();c.translate(Math.cos(a)*spread,Math.sin(a)*spread);c.rotate(a+u);
          this.round(-23,-23,46,46,9,i%2?PAPER:ACCENT);c.restore();
        }c.restore();this.geometric(0,0,46,u,INK);break;
      }
      case 1:this.website(local);break;
      case 2:this.app(local,t);break;
      case 3:this.dashboard(local);break;
      case 4:this.product(local);break;
      case 5:this.kinetic(local,t);break;
      case 6:this.story(local);break;
      case 7:this.world(local);break;
      case 8:this.music(local,f.t);break;
      case 9:this.reveal(local,t);break;
    }
    c.restore();
    this.bridge(t);

    // The seed visibly leaves each composition and steers the next transformation.
    if(index>0&&index<9){
      const lead=next?ease((t-next.at+.45)/.45):0;
      this.geometric(mix(502,284,lead),mix(726,537,lead),mix(10,24,lead),t*.65,foreground);
    }
    if(index>=1&&index<=4)this.text('FICTIONAL CONCEPT / DEMO',40,771,11,foreground,500,480);
    if(index===6)this.text('A LITTLE IDEA. A WHOLE NEW WORLD.',40,771,12,PAPER,500,480);
    if(index===7)this.text('CREATIVE-CODED SPATIAL DEMO',40,771,11,PAPER,500,480);
    if(index===8)this.text('MATUSHKA ULTRAFUNK / ULTRA SLOWED',40,771,11,INK,500,480);
    c.restore();
    return this.layer.canvas;
  }
  override render(f:Frame,out:THREE.WebGLRenderTarget):PostOverrides {
    this.canvasFrame(f);
    clearRT(this.ctx.renderer,out);
    this.ctx.comp.draw(this.ctx.renderer,this.layer.upload(),out);
    return {hud:0,frame:0,pdoom:0,bloom:0,halation:0,grain:0,ca:0,vignette:0,shake:[0,0],zoom:1};
  }
  override dispose(){this.layer.texture.dispose();}
}
