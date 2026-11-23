#!/usr/bin/env python3
"""Create 22 ORIGINAL sampled/synthesized Ogg emote sound clips to prevent silence.
These are original fallback sound designs, NOT Freesound field recordings.
To upgrade to real CC0 recordings, run `npm run audio:reactions` with originals.
Uses numpy/scipy and ffmpeg, espeak for spoken comic reactions.
"""
from pathlib import Path
import subprocess,tempfile,os
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter,sosfilt
root=Path(__file__).resolve().parent.parent
out=root/'client/public/audio/sfx'
out.mkdir(parents=True,exist_ok=True)
sr=24000
rng=np.random.default_rng(16091)

def time(d):return np.arange(int(sr*d))/sr
def smooth(y,attack=.012,release=.09):
 n=len(y); a=min(n,int(sr*attack)); b=min(n-a,int(sr*release)); y=y.copy()
 if a:y[:a]*=np.linspace(0,1,a)
 if b:y[-b:]*=np.linspace(1,0,b)
 return y

def note(freq,d=.25,ty='sine',decay=2.0,vol=.7):
 t=time(d); ph=2*np.pi*freq*t
 wave=np.sin(ph) if ty=='sine' else np.sin(ph)+.35*np.sin(ph*2)+.16*np.sin(ph*3)
 return vol*wave*np.exp(-decay*t/max(d,.01))
def noise(d,cut=None):
 y=rng.standard_normal(int(d*sr))
 if cut:
  kind,hz=cut
  sos=butter(3,hz,fs=sr,output='sos',btype=kind)
  y=sosfilt(sos,y)
 return y

def mix(*items):
 n=max(len(y)+int(at*sr) for y,at in items); o=np.zeros(n)
 for y,at in items:
  st=int(at*sr);en=min(n,st+len(y));o[st:en]+=y[:en-st]
 return o

def chirp(f0,f1,d,volume=.4):
 t=time(d); freq=f0+(f1-f0)*t/d
 return volume*np.sin(2*np.pi*(f0*t+(f1-f0)*t*t/(2*d)))*smooth(np.ones(len(t)),.004,.075)
def spoken(words,duration=None,pitch=46,speed=140):
 with tempfile.NamedTemporaryFile(suffix='.wav',delete=False) as f:path=f.name
 try:
  subprocess.run(['espeak','-w',path,'-v','en-us','-p',str(pitch),'-s',str(speed),words],check=True,capture_output=True)
  sample,raw=wavfile.read(path)
  y=raw.astype(float)/np.iinfo(raw.dtype).max if np.issubdtype(raw.dtype,np.integer) else raw.astype(float)
  if y.ndim>1:y=y.mean(axis=1)
  if sample!=sr:
   from scipy.signal import resample_poly
   from math import gcd
   factor=gcd(sample,sr);y=resample_poly(y,sr//factor,sample//factor)
  if duration and len(y)>int(duration*sr):y=y[:int(duration*sr)]
  return smooth(y,.01,.06)*.72
 finally:
  os.remove(path)

def hit(d=.16,low=False):
 n=noise(d,('lowpass',2800 if low else 6000));t=time(d)
 return .75*n*np.exp(-t*21)

def tramp(d=.65):
 t=time(d);f=100+(20*np.sin(2*np.pi*7*t))
 w=np.sin(2*np.pi*np.cumsum(f)/sr)
 return smooth(w*np.exp(-t*3),.01,.05)

def rattle(d=.7):
 t=time(d);amp=((np.sin(2*np.pi*22*t)>0.8).astype(float))*np.exp(-t/d)
 return noise(d,('highpass',420))*amp

def synth(kind):
 if kind=='crickets':
  clips=[]
  for k in range(10):
   t=time(.11); tonewave=np.sin(2*np.pi*(3700*t+250*t*t))*np.sin(2*np.pi*53*t)**2
   clips.append((tonewave*.48*np.exp(-t*4),k*.19))
  return mix(*clips)
 if kind=='highfive':return mix((hit(.28),0),(note(130,.18,'horn',4,.25),0))
 if kind=='aww':return spoken('Awwww!',2.3,pitch=56,speed=100)
 if kind=='mindblown':
  d=1.6;t=time(d)
  return smooth(noise(d,('lowpass',2900))*.7*np.exp(-t*3)+note(65,d,'horn',6,.55),.005,.14)
 if kind=='thinking':return spoken('Hmmm...',1.6,pitch=38,speed=95)
 if kind=='womp':
  def muted(freq,d):
   t=time(d); ff=freq*(1-.1*t/d)
   y=np.sin(2*np.pi*np.cumsum(ff)/sr)+.35*np.sin(4*np.pi*np.cumsum(ff)/sr)
   return smooth(y,.018,.08)*.46
  return mix((muted(220,.48),0),(muted(174,.6),.47))
 if kind=='wrong':return mix((note(152,.5,'horn',1.4,.7),0),(note(146,.5,'horn',1.4,.45),0))
 if kind=='nailed':return mix((note(880,.85,'horn',7,.7),0),(note(1320,.67,'sine',8,.4),.08))
 if kind=='applause':
  clips=[(hit(.115,True)*rng.uniform(.2,.45),rng.uniform(0,2.3)) for i in range(60)]
  return mix(*clips)
 if kind=='awkward':
  d=.85;t=time(d);freq=1100*(1-t/d)**2+70
  ph=2*np.pi*np.cumsum(freq)/sr
  return smooth(.58*np.sin(ph)+.31*noise(d,('highpass',1200))*np.sin(2*np.pi*15*t),.003,.13)
 if kind=='oooh':return spoken('Oooooooh!',2.0,pitch=61,speed=105)
 if kind=='celebrate':return mix((chirp(400,1300,.65,.6),0),(chirp(850,1700,.45,.4),.22))
 if kind=='drumroll':
  clips=[(hit(.09,True)*(.45+i*.01),i*.11) for i in range(24)]
  clips.append((hit(.4,True)*1.1,2.65))
  return mix(*clips)
 if kind=='goat':return mix((spoken('Maaaaaah!',1.6,pitch=72,speed=90),0),(tramp(.75)*.1,.23))
 if kind=='facepalm':return spoken('Uuuugh!',1.8,pitch=35,speed=100)
 if kind=='poop':
  d=.95;t=time(d);f=45+20*np.sin(2*np.pi*9*t);ph=2*np.pi*np.cumsum(f)/sr
  return smooth(.45*np.sin(ph)+.23*noise(d,('lowpass',550))*(.4+.6*np.sin(2*np.pi*17*t)**2),.015,.17)
 if kind=='barf':return mix((spoken('Bleurgh!',.92,pitch=20,speed=115),0),(tramp(.55)*.5,.52))
 if kind=='burp':return mix((spoken('Urrrrp!',.9,pitch=21,speed=86),0),(tramp(.56)*.28,.15))
 if kind=='woozy':return mix((spoken('Hic!',.42,pitch=67,speed=190),0),(spoken('Hic!',.42,pitch=79,speed=205),.57))
 if kind=='finger':return spoken('Fuck you!',1.9,pitch=47,speed=145)
 if kind=='wtf':return spoken('What the fuck?',2.2,pitch=56,speed=145)
 if kind=='bullshit':return spoken('Bullshit!',1.8,pitch=36,speed=133)
 raise ValueError(kind)

ids=['crickets','highfive','aww','mindblown','thinking','womp','wrong','nailed','applause','awkward','oooh','celebrate','drumroll','goat','facepalm','poop','barf','burp','woozy','finger','wtf','bullshit']
for emote in ids:
 y=synth(emote)
 if not np.any(y):raise RuntimeError(emote)
 peak=np.max(np.abs(y))
 y=np.clip(y/(peak+1e-9)*.75,-.96,.96)
 with tempfile.NamedTemporaryFile(suffix='.wav',delete=False) as f:path=f.name
 try:
  wavfile.write(path,sr,(y*32767).astype(np.int16))
  subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-i',path,'-ar','24000','-ac','1','-c:a','libvorbis','-q:a','4',str(out/f'reaction-{emote}.ogg')],check=True)
 finally:os.remove(path)
 print(emote,len(y)/sr,(out/f'reaction-{emote}.ogg').stat().st_size)
