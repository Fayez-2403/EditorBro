import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
declare global { interface Window { __canvasRender:any } }
const app=fileURLToPath(new URL('..',import.meta.url));
const root=path.resolve(app,'..');
const args=process.argv.slice(2),opt=(k:string,d:string)=>{const i=args.indexOf('--'+k);return i<0?d:args[i+1]};
const fps=Number(opt('fps','60')),samples=Number(opt('samples','4'));
if(!Number.isFinite(fps)||fps<1||fps>120||!Number.isInteger(samples)||samples<1||samples>16)throw new Error('Use fps 1..120 and integer samples 1..16');
const out=path.resolve(app,opt('out','../out/motion-flex_possibilities_60.mp4'));
const times=opt('stills','').split(',').filter(Boolean).map(Number);
const port=Number(opt('port','54981'));
const exe=path.join(process.env.LOCALAPPDATA??'','Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe');
const ffmpeg=process.platform==='win32'&&existsSync(exe)?exe:'ffmpeg';
const server=Bun.spawn(['bunx','vite','--port',String(port),'--strictPort'],{cwd:app,env:{...process.env,VITE_VARIANT:'possibilities',PDOOM_NO_HMR:'1'},stdout:'ignore',stderr:'inherit'});
let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
try {
  let ready=false;
  for(let i=0;i<100;i++){try{if((await fetch(`http://localhost:${port}/canvas-render.html`)).ok){ready=true;break;}}catch{}await Bun.sleep(100);}
  if(!ready)throw new Error('Private preview server failed to start');
  browser=await chromium.launch({channel:'chrome',headless:true,args:process.platform==='linux'?['--no-sandbox']:[]});
  const page=await browser.newPage();page.on('pageerror',e=>console.error(e));
  await page.goto(`http://localhost:${port}/canvas-render.html?scale=2`);
  await page.waitForFunction(()=>window.__canvasRender,undefined,{timeout:120000});
  const state=await page.evaluate(()=>({error:window.__canvasRender.error,duration:window.__canvasRender.duration}));
  if(state.error)throw new Error(state.error);
  const frame=(t:number,s:number)=>page.evaluate(({t,s})=>window.__canvasRender.render(t,s),{t,s}) as Promise<string>;
  if(times.length){
    mkdirSync(out,{recursive:true});
    for(const t of times){await Bun.write(path.join(out,`f_${t.toFixed(3).padStart(7,'0')}.png`),Buffer.from(await frame(t,1),'base64'));}
    // A repeat seek after unrelated frames must be pixel-identical.
    const a=await frame(6.7,1);await frame(23.1,1);const b=await frame(6.7,1);
    if(a!==b)throw new Error('Out-of-order seek changed the frame');
    console.log(`Wrote ${times.length} stills; deterministic seek PASS`);
  }else{
    mkdirSync(path.dirname(out),{recursive:true});
    const ff=spawn(ffmpeg,['-y','-loglevel','error','-f','image2pipe','-framerate',String(fps),'-vcodec','png','-i','pipe:0',
      '-i',path.join(root,'audio/possibilities/mix.mp3'),'-vf','scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
      '-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-color_range','tv','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709',
      '-c:a','aac','-b:a','256k','-t',String(state.duration),'-movflags','+faststart',out],{stdio:['pipe','inherit','inherit']});
    const completion=once(ff,'close');
    ff.stdin.on('error',e=>console.error('Encoder pipe:',e.message));
    const count=Math.round(state.duration*fps),start=performance.now();
    for(let n=0;n<count;n++){
      if(ff.exitCode!==null)throw new Error(`Encoder exited with ${ff.exitCode}`);
      const bytes=Buffer.from(await frame(n/fps,samples),'base64');
      if(!ff.stdin.write(bytes))await once(ff.stdin,'drain');
      if(n%120===0)console.log(`${n}/${count} frames, ${((performance.now()-start)/1000).toFixed(1)}s`);
    }
    ff.stdin.end();const [code]=await completion;if(code!==0)throw new Error(`ffmpeg failed: ${code}`);
    console.log(`Wrote ${out} (${count} frames at ${fps} fps, ${samples} subframes)`);
  }
} finally {
  await browser?.close();
  if(process.platform==='win32')Bun.spawnSync(['taskkill','/T','/F','/PID',String(server.pid)],{stdout:'ignore',stderr:'ignore'});
  else server.kill();
}
