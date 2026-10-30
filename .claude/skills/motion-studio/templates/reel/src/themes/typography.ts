// Two open-licensed families (SIL OFL 1.1, files + licences in public/fonts):
//   Inter (variable 100-900)   every headline, caption and label
//   JetBrains Mono (variable)  tokens, model ids, versions: things that are literally code
import { continueRender, delayRender, staticFile } from 'remotion';

const FACES: [string, string, FontFaceDescriptors][] = [
  ['Archivo', 'fonts/Archivo-VF.ttf', { weight: '100 900', stretch: '62% 125%' }],
  ['Inter', 'fonts/InterVariable.woff2', { weight: '100 900' }],
  ['JetBrains Mono', 'fonts/JetBrainsMono-VF.ttf', { weight: '100 800' }],
];

let loaded = false;
export function loadFonts() {
  if (loaded || typeof document === 'undefined') return;
  loaded = true;
  const h = delayRender('fonts');
  Promise.all(FACES.map(([family, file, d]) => {
    const face = new FontFace(family, `url(${staticFile(file)})`, d);
    (document.fonts as unknown as { add: (f: FontFace) => void }).add(face);
    return face.load();
  })).then(() => continueRender(h)).catch((e) => { console.error('font load failed', e); continueRender(h); });
}
