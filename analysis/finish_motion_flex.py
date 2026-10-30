"""Integrate the preserved opening + 30s sequence, then verify actual exports."""
from pathlib import Path
import json
import subprocess
from prepare_motion_music import ffmpeg_binary

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'out'

def main():
    ff=ffmpeg_binary()
    intro=OUT/'motion-flex_intro_60.mp4'
    segment=OUT/'motion-flex_possibilities_60.mp4'
    final=OUT/'motion-flex_integrated_60.mp4'
    for item in (intro,segment):
        if not item.is_file(): raise SystemExit(f'Missing render: {item}')
    subprocess.run([ff,'-y','-hide_banner','-loglevel','error','-i',str(intro),'-i',str(segment),
        '-i',str(ROOT/'audio/motion_full/mix.mp3'),'-filter_complex','[0:v][1:v]concat=n=2:v=1:a=0[v]',
        '-map','[v]','-map','2:a','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p',
        '-r','60','-color_range','tv','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709',
        '-c:a','aac','-b:a','256k','-t','44.7','-movflags','+faststart',str(final)],check=True)
    probe=str(Path(ff).with_name('ffprobe.exe' if ff.endswith('.exe') else 'ffprobe'))
    report={}
    for file in (segment,final):
        meta=json.loads(subprocess.check_output([probe,'-v','error','-show_streams','-show_format','-of','json',str(file)]))
        video=next(s for s in meta['streams'] if s['codec_type']=='video')
        audio=next(s for s in meta['streams'] if s['codec_type']=='audio')
        assert (video['width'],video['height'],video['codec_name'],video['pix_fmt'],video['r_frame_rate'])==(1080,1920,'h264','yuv420p','60/1')
        assert audio['codec_name']=='aac'
        assert video.get('color_space')=='bt709' and video.get('color_range')=='tv'
        report[file.name]={'duration':float(meta['format']['duration']),'frames':video.get('nb_frames'),
                           'width':video['width'],'height':video['height'],'fps':video['r_frame_rate'],
                           'video':video['codec_name'],'audio':audio['codec_name'],
                           'pixel_format':video['pix_fmt'],'color_space':video['color_space'],'range':video['color_range']}
    (OUT/'motion-flex_export-check.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report,indent=2))

if __name__=='__main__':main()
