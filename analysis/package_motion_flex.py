"""Build a focused reproducible Colab archive; no credentials or node_modules."""
from pathlib import Path
import json
import zipfile

ROOT=Path(__file__).resolve().parent.parent

def main():
    cells=[]
    def md(text): cells.append({'cell_type':'markdown','metadata':{},'source':text})
    def code(text):
        compile(text,'colab-cell','exec')
        cells.append({'cell_type':'code','metadata':{},'source':text,'execution_count':None,'outputs':[]})
    md('''# Motion Flex — possibilities + integrated cut

Upload `motion-flex-colab.zip` to the top of Google Drive. This is a separate notebook; the GitHub Trending notebook stays unchanged. The archive includes the exact edited music, measured cue map, fonts, engine and scene sources. No voice/API keys are needed. Select a GPU runtime for the preserved 3D opening; the new Canvas sequence does not need a GPU.

The 30-second soundtrack repeats a phrase from the supplied 15-second ultra-slowed Matushka Ultrafunk Short. It does not substitute the song mentioned in the screenshot.''')
    code('''from google.colab import drive
drive.mount('/content/drive')
from pathlib import Path
import zipfile, subprocess, os, shutil
destination = Path('/content').resolve()
archive = Path('/content/drive/MyDrive/motion-flex-colab.zip')
with zipfile.ZipFile(archive) as bundle:
    for entry in bundle.infolist():
        target = (destination / entry.filename).resolve()
        if not target.is_relative_to(destination / 'motion-as-code'):
            raise ValueError('Unexpected archive member: ' + entry.filename)
    bundle.extractall(destination)
project = destination / 'motion-as-code'
app = project / 'app'
for item in ['data/possibilities/cues.json', 'audio/possibilities/mix.mp3', 'audio/motion_full/mix.mp3']:
    assert (project / item).is_file(), item
print('Project and soundtrack ready')''')
    code('''subprocess.run(['apt-get','-qq','update'],check=True)
subprocess.run(['apt-get','-qq','install','-y','ffmpeg','libvulkan1','vulkan-tools'],check=True)
subprocess.run(['wget','-q','https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb','-O','/tmp/motion-chrome.deb'],check=True)
subprocess.run(['apt-get','-qq','install','-y','/tmp/motion-chrome.deb'],check=True)
subprocess.run(['bash','-lc','curl -fsSL https://bun.sh/install | bash'],check=True)
os.environ['PATH'] = '/root/.bun/bin:' + os.environ['PATH']
subprocess.run(['bun','install'],cwd=app,check=True)
subprocess.run(['bun','run','check'],cwd=app,check=True)''')
    md('Review representative frames before running the full export. All visible demos are fictional. Rendered files go to your Drive after each completed stage.')
    code('''review = project / 'out/colab_motion_review'
subprocess.run(['bun','scripts/render_possibilities.ts','--stills','0.8,3.3,6.7,9.4,12.3,15.4,18.6,21.2,24.3,26.9,28.8','--out',str(review)],cwd=app,check=True)
from IPython.display import display, Image
for file in sorted(review.glob('*.png')):
    display(Image(filename=str(file),width=216))''')
    code('''delivery = Path('/content/drive/MyDrive/techpe-trek-renders')
delivery.mkdir(parents=True,exist_ok=True)
subprocess.run(['bun','scripts/render_possibilities.ts','--fps','60','--samples','4','--out','../out/motion-flex_possibilities_60.mp4'],cwd=app,check=True)
shutil.copy2(project/'out/motion-flex_possibilities_60.mp4',delivery)
print('30-second sequence copied to Drive')''')
    code('''# Optional integrated cut: preserve the earlier 3D opening, then append the sequence.
# For slow software WebGL, try CHROME_GPU_ARGS from your original notebook.
subprocess.run(['bun','scripts/render.ts','video','--variant','motion_full','--from','0','--to','14.7','--fps','60','--samples','1','--workers','1','--preset','fast','--crf','18','--noaudio','--out','../out/motion-flex_intro_60.mp4'],cwd=app,check=True)
subprocess.run(['python','analysis/finish_motion_flex.py'],cwd=project,check=True)
shutil.copy2(project/'out/motion-flex_integrated_60.mp4',delivery)
shutil.copy2(project/'out/motion-flex_export-check.json',delivery)
print((project/'out/motion-flex_export-check.json').read_text())''')
    notebook={'nbformat':4,'nbformat_minor':5,'metadata':{'accelerator':'GPU','kernelspec':{'name':'python3','display_name':'Python 3'},'language_info':{'name':'python'}},'cells':cells}
    note=ROOT/'colab/render_motion_flex.ipynb'
    note.write_text(json.dumps(notebook,indent=1)+'\n',encoding='utf-8')
    paths=[]
    for folder in ['app/src','app/scripts','app/public/fonts','data/possibilities','data/motion_full','data/motion','audio/possibilities','audio/motion_full','audio/motion','docs','colab']:
        paths.extend(p for p in (ROOT/folder).rglob('*') if p.is_file() and p.suffix not in {'.wav','.pyc'})
    for name in ['app/package.json','app/bun.lock','app/tsconfig.json','app/tsconfig.scripts.json','app/vite.config.ts','app/index.html','app/canvas-render.html','LICENSE.pdoom-engine','README.md','CLAUDE.md','analysis/prepare_motion_music.py','analysis/build_possibilities_audio.py','analysis/finish_motion_flex.py','analysis/package_motion_flex.py','out/motion_references/wm8wIdmbVRo.webm']:
        paths.append(ROOT/name)
    target=ROOT/'motion-flex-colab.zip'
    with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=4) as bundle:
        for item in sorted(set(paths)):
            if item.is_file(): bundle.write(item,'motion-as-code/'+item.relative_to(ROOT).as_posix())
    with zipfile.ZipFile(target) as bundle:
        assert bundle.testzip() is None
    print(f'Notebook code validated; archive ready: {target.name} ({target.stat().st_size/1e6:.1f} MB)')

if __name__=='__main__':main()
