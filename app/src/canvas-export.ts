// Native Canvas export for the 2D sequence, using the SAME scene and seek contract.
// Bypasses unused WebGL post passes; the protected engine remains unchanged.
import Possibilities from './scenes/possibilities';
import { AudioData } from './engine/audio';
import { Lyrics } from './engine/lyrics';
import { loadFonts } from './engine/type';
import type { SceneCtx } from './engine/scene';

declare global { interface Window { __canvasRender:any } }
async function boot(){
  await loadFonts();
  const audio=await AudioData.load();
  const scene=new Possibilities({audio,lyrics:new Lyrics({lines:[]}),start:0,end:audio.duration,params:{}} as SceneCtx);
  await scene.init();
  const canvas=document.getElementById('frame') as HTMLCanvasElement;
  const c=canvas.getContext('2d',{alpha:false})!;
  c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
  const scale=Number(new URLSearchParams(location.search).get('scale')??2);
  window.__canvasRender={duration:audio.duration,render(t:number,samples=1){
    for(let i=0;i<samples;i++){
      const time=Math.max(0,Math.min(audio.duration-1/6000,t+(i/(samples||1)-.5)/120));
      const src=scene.canvasFrame({t:time,lt:time});
      c.globalAlpha=1/(i+1);
      c.drawImage(src,656*scale,0,608*scale,1080*scale,0,0,1080,1920);
    }
    c.globalAlpha=1;
    return canvas.toDataURL('image/png').split(',')[1];
  }};
}
boot().catch(e=>{window.__canvasRender={error:String(e)};});
