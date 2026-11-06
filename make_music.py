"""Synthesize a short original romantic piano-style instrumental loop (public-domain original)."""
import math, wave, os, subprocess
import numpy as np

SR = 44100
def note(freq, dur, vol=0.28, decay=2.2):
    t = np.linspace(0, dur, int(SR*dur), endpoint=False)
    w = (np.sin(2*np.pi*freq*t) * 1.0 +
         np.sin(2*np.pi*freq*2*t) * 0.45 +
         np.sin(2*np.pi*freq*3*t) * 0.18 +
         np.sin(2*np.pi*freq*4*t) * 0.07)
    env = np.exp(-decay*t) * (1 - np.exp(-t*400))
    return w * env * vol

def chord(root, third, fifth, dur=1.9, vol=0.10):
    return note(root,dur,vol,1.6)+note(third,dur,vol,1.6)+note(fifth,dur,vol,1.6)

C4,G4,A4,F4,E4,D4 = 261.63,392.00,440.00,349.23,329.63,293.66
C3,G3,A3,F3 = 130.81,196.00,220.00,174.61
C5,D5,E5 = 523.25,587.33,659.26
B3 = 246.94

bar_dur = 1.9
total = int(SR*bar_dur*4)
song = np.zeros(total)

for i,(r,t3,f5) in enumerate([(C3,E4,G4),(G3,D4,B3),(A3,C4,E4),(F3,A4,C5)]):
    start = int(SR*bar_dur*i)
    seg = chord(r,t3,f5,vol=0.07)
    end = min(start+len(seg), total)
    song[start:end] += seg[:end-start]

melody_seq = [
    (E5,0.0,0.9),(D5,0.95,0.45),(C5,1.4,0.5),
    (D5,1.9,0.9),(C5,2.85,0.45),(G4,3.3,0.55),
    (C5,3.8,0.9),(A4,4.75,0.45),(G4,5.2,0.5),
    (A4,5.7,0.9),(G4,6.65,0.45),(F4,7.1,0.7),
]
for f,st,d in melody_seq:
    start=int(SR*st); seg = note(f, d, vol=0.22, decay=1.8)
    end=min(start+len(seg), total)
    song[start:end] += seg[:end-start]

song_full = np.concatenate([song, song.copy()])
tail = np.zeros(int(SR*1.2))
song_full = np.concatenate([song_full, tail])
peak = np.max(np.abs(song_full)); song_full = song_full/peak*0.85
fade = int(SR*1.1); song_full[-fade:] *= np.linspace(1,0,fade)
right = np.roll(song_full, int(SR*0.012))
stereo = np.stack([song_full, right], axis=1)
pcm = (stereo*32767).astype(np.int16)

wav_path = "/home/agentuser/birthday25/media/music.wav"
with wave.open(wav_path,'w') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("wav:", os.path.getsize(wav_path)//1024, "KB, dur", round(len(song_full)/SR,1),"s")

r = subprocess.run(["ffmpeg","-y","-i",wav_path,"-codec:a","libmp3lame","-b:a","128k","-loglevel","error","/home/agentuser/birthday25/media/music.mp3"], capture_output=True, text=True)
mp3 = "/home/agentuser/birthday25/media/music.mp3"
print("mp3:", (os.path.getsize(mp3)//1024, "KB") if os.path.exists(mp3) else ("FAIL", r.stderr[:300]))
