const C=window.CONFIG,K="ambars-day-v1",app=document.getElementById("app");
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let S=null;try{S=JSON.parse(localStorage.getItem(K))}catch(e){}
S=S||{n:C.partner,f:C.sender,d:{},go:0};
const save=()=>{try{localStorage.setItem(K,JSON.stringify(S))}catch(e){}};
const pick=a=>a[Math.floor(Math.random()*a.length)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fill=s=>s.replace(/\{nama\}/g,esc(S.n)).replace(/\{pengirim\}/g,esc(S.f));
let T=0,AC=null,mus=0,musT=0,sfxOn=true;
// ---------- audio (disintesis lokal, original, tanpa file) ----------
function tone(f,t,d,v,ty){try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();const o=AC.createOscillator(),g=AC.createGain(),n=AC.currentTime+t;o.type=ty||"sine";o.frequency.value=f;g.gain.setValueAtTime(v,n);g.gain.exponentialRampToValueAtTime(.0001,n+d);o.connect(g);g.connect(AC.destination);o.start(n);o.stop(n+d)}catch(e){}}
function sfx(k){if(!sfxOn)return;({ok:[523,659,784],no:[250,200],pop:[660],win:[523,659,784,1047]}[k]||[]).forEach((f,i)=>tone(f,i*.09,.25,.07,"triangle"))}
const NT=[262,330,392,494,392,330,294,349,440,523,440,349];
const mtick=()=>NT.forEach((f,i)=>tone(f,i*.5,.9,.035));
$("#bm").onclick=()=>{if(mus){clearInterval(musT);mus=0}else{try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();AC.resume()}catch(e){}mtick();musT=setInterval(mtick,6000);mus=1}$("#bm").classList.toggle("off",!mus)};
$("#bs").onclick=()=>{sfxOn=!sfxOn;$("#bs").classList.toggle("off",!sfxOn);$("#bs").textContent=sfxOn?"🔊":"🔇"};
$("#bm").classList.add("off");
if(document.documentElement.requestFullscreen)$("#bf").onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen().catch(()=>{});else $("#bf").hidden=true;
// ---------- efek ----------
$("#fx").innerHTML=Array.from({length:14},()=>`<i style="left:${Math.random()*100}%;animation-delay:${-Math.random()*14}s;font-size:${12+Math.random()*18}px">${pick(["💗","💕","✨","🌸"])}</i>`).join("");
function boom(){const c=$("#cf"),x=c.getContext("2d");if(!x)return;c.width=innerWidth;c.height=innerHeight;const P=Array.from({length:120},()=>({x:innerWidth/2,y:innerHeight/3,vx:(Math.random()-.5)*14,vy:Math.random()*-12-2,r:4+Math.random()*5,c:pick(["#ff8fb1","#ffd1dc","#c9b6ff","#e8b4a0","#fff1b8"])}));let n=0;(function f(){x.clearRect(0,0,c.width,c.height);P.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.35;x.fillStyle=p.c;x.beginPath();x.arc(p.x,p.y,p.r,0,7);x.fill()});if(++n<130)requestAnimationFrame(f);else x.clearRect(0,0,c.width,c.height)})()}
function toast(m){const t=document.createElement("div");t.className="toast";t.textContent=m;document.body.appendChild(t);setTimeout(()=>t.remove(),2200)}
// ---------- kerangka ----------
const G=[{t:"How Well Do You Know Us?",e:"💌",f:quiz,d:"Kuis kenangan kita"},{t:"Memory Match",e:"🃏",f:match,d:"Cocokkan kartu romantis"},{t:"This or That",e:"🎀",f:tot,d:"10 pilihan manis"},{t:"Love Treasure Hunt",e:"🗝️",f:hunt,d:"5 teka-teki cinta"},{t:"Birthday Challenge",e:"🎂",f:chal,d:"8 tantangan lucu"},{t:"The Final Surprise",e:"🎁",f:fin,d:"Terbuka setelah 5 game"}];
const dn=()=>[0,1,2,3,4].filter(i=>S.d[i]).length;
function shell(t,b){clearInterval(T);app.innerHTML=`<section class="card g"><button class="back" id="bk">← Dashboard</button><h2>${t}</h2>${b}</section>`;$("#bk").onclick=dash;scrollTo(0,0)}
function finish(i,s,m,msg){S.d[i]={s,m};save();sfx("win");boom();app.innerHTML=`<section class="card g c"><div class="big">🎉</div><h2>${G[i].t} selesai!</h2><p><b>Skor: ${s}/${m}</b></p><p>${fill(msg)}</p><button class="btn" id="ok">${dn()===5&&!S.d[5]?"Buka Final Surprise 🎁":"Kembali ke Dashboard"}</button></section>`;$("#ok").onclick=dash}
function home(){clearInterval(T);app.innerHTML=`<section class="card c"><div class="big bob">💖</div><h1>Welcome to AMBAR'S DAY ARCADE</h1><p>${fill(C.subtitle)}</p><label>Kamu mau dipanggil apa<input id="n1" maxlength="30" value="${esc(S.n)}"></label><button class="btn" id="go">Mulai Petualangan</button></section>`;
$("#go").onclick=()=>{S.n=$("#n1").value.trim()||C.partner;S.f="Your Prince";S.go=1;save();sfx("pop");dash()}}
function dash(){clearInterval(T);const done=[0,1,2,3,4,5].filter(i=>S.d[i]).length,pct=Math.round(done/6*100),lv=["Pemula 🌱","Pencari Cinta 💗","Pejuang Rindu 💫","Ratu Arcade 👑"][Math.min(3,Math.floor(done/2))];
app.innerHTML=`<section class="card c"><h1>${esc(S.n)}'s Day</h1><p class="sm">Level: ${lv}</p><div class="prog"><i style="width:${pct}%"></i></div><p class="sm">${done}/6 game selesai · ${pct}%</p></section>`+(S.d[5]?`<section class="card c"><div class="big bob">🏆</div><h2>Semua permainan selesai!</h2><p>${fill("Kamu menamatkan semuanya, {nama}. Aku bangga dan sayang banget sama kamu 💖")}</p></section>`:"")+`<div class="grid">`+G.map((g,i)=>{const lock=i===5&&dn()<5,d=S.d[i];return`<button class="gc ${lock?"lock":""} ${d?"done":""}" data-i="${i}"><span class="e">${lock?"🔒":d?"✅":g.e}</span><span><b>${g.t}</b><small>${lock?"Terkunci · selesaikan 5 game dulu":d?`Selesai · skor ${d.s}/${d.m}`:g.d}</small></span></button>`}).join("")+`</div><button class="lnk" id="ed">✏️ Ubah nama</button><button class="lnk" id="rs">Reset progres</button>`;
$$(".gc").forEach(b=>b.onclick=()=>{const i=+b.dataset.i;if(i===5&&dn()<5){sfx("no");toast("Selesaikan 5 game pertama dulu ya 💗");return}sfx("pop");G[i].f()});
$("#ed").onclick=home;$("#rs").onclick=()=>{if(confirm("Hapus semua progres dan skor?")){S.d={};save();toast("Progres direset");dash()}}}
// ---------- game 1 ----------
function quiz(){let i=0,s=0;const Q=C.quiz;const r=()=>{const q=Q[i];shell("💌 How Well Do You Know Us?",`<p class="sm">Pertanyaan ${i+1} dari ${Q.length}</p><h3>${fill(q.q)}</h3>`+q.o.map((o,j)=>`<button class="opt" data-j="${j}">${fill(o)}</button>`).join("")+`<p id="fb" class="fb"></p><button class="btn" id="nx" hidden>${i+1<Q.length?"Lanjut":"Lihat hasil"}</button>`);
$$(".opt").forEach(b=>b.onclick=()=>{const ok=+b.dataset.j===q.a;if(ok)s++;sfx(ok?"ok":"no");$$(".opt").forEach(x=>{x.disabled=true;if(+x.dataset.j===q.a)x.classList.add("ok")});if(!ok)b.classList.add("no");$("#fb").textContent=fill(pick(ok?C.fbOk:C.fbNo));$("#nx").hidden=false});
$("#nx").onclick=()=>{if(++i<Q.length)r();else finish(0,s,Q.length,C.praise[0]+" "+C.res[s>=Q.length*.8?2:s>=Q.length*.5?1:0])}};r()}
// ---------- game 2 ----------
function match(){const E=["💖","🌸","🎁","💌","🧸","🌹","✨","🍰"],d=[...E,...E].sort(()=>Math.random()-.5);let a=[],mv=0,ok=0,t=0,lock=0;
shell("🃏 Memory Match",`<div class="st"><span id="mv">Percobaan: 0</span><span id="tm">0 dtk</span></div><div class="mg">`+d.map((e,i)=>`<button class="cd" data-i="${i}"><b>?</b><u>${e}</u></button>`).join("")+`</div>`);
T=setInterval(()=>{t++;$("#tm").textContent=t+" dtk"},1000);
$$(".cd").forEach(c=>c.onclick=()=>{if(lock||c.classList.contains("fl"))return;c.classList.add("fl");sfx("pop");a.push(c);if(a.length<2)return;mv++;$("#mv").textContent="Percobaan: "+mv;const[x,y]=a;a=[];
if(d[x.dataset.i]===d[y.dataset.i]){x.classList.add("mt");y.classList.add("mt");sfx("ok");if(++ok===8){clearInterval(T);setTimeout(()=>finish(1,Math.max(10,100-(mv-8)*6),100,C.praise[1]+` Selesai dalam ${mv} percobaan & ${t} detik.`),600)}}
else{lock=1;setTimeout(()=>{x.classList.remove("fl");y.classList.remove("fl");lock=0},800)}})}
// ---------- game 3 ----------
function tot(){let i=0;const P=C.tot;const r=()=>{shell("🎀 This or That",`<p class="sm">Ronde ${i+1} dari ${P.length}</p><div class="tt anim"><button class="opt" data-j="0">${P[i][0]}</button><b>atau</b><button class="opt" data-j="1">${P[i][1]}</button></div><p id="fb" class="fb"></p>`);
$$(".opt").forEach(b=>b.onclick=()=>{sfx("pop");$$(".opt").forEach(x=>x.disabled=true);b.classList.add("ok");$("#fb").textContent=fill(pick(C.react));setTimeout(()=>{if(++i<P.length)r();else finish(2,P.length,P.length,C.praise[2])},900)})};r()}
// ---------- game 4 ----------
function hunt(){let i=0;const H=C.hunt,nm=s=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
const r=()=>{const h=H[i];shell("🗝️ Love Treasure Hunt",`<p class="sm">Tahap ${i+1} dari ${H.length}</p><p class="clue">${fill(h.clue)}</p><input id="an" placeholder="Jawabanmu…" autocomplete="off"><button class="btn" id="ck">Cek jawaban</button><button class="lnk" id="ht">Minta petunjuk</button><p id="fb" class="fb"></p>`);
$("#ht").onclick=()=>$("#fb").textContent="💡 "+h.hint;
const chk=()=>{if(h.a.some(x=>nm(x)===nm($("#an").value))){sfx("ok");boom();$("#ck").hidden=$("#ht").hidden=true;$("#an").disabled=true;$("#fb").innerHTML=`✅ ${fill(h.msg)}<button class="btn" id="nx">${i+1<H.length?"Tahap berikutnya":"Selesai"}</button>`;$("#nx").onclick=()=>{if(++i<H.length)r();else finish(3,H.length,H.length,C.praise[3])}}else{sfx("no");$("#an").classList.remove("shake");void $("#an").offsetWidth;$("#an").classList.add("shake");$("#fb").textContent="Belum tepat, coba lagi ya 💗"}};
$("#ck").onclick=chk;$("#an").onkeydown=e=>{if(e.key==="Enter")chk()}};r()}
// ---------- game 5 ----------
function chal(){const L=C.chal,ds=new Set();shell("🎂 Birthday Challenge",`<div class="prog"><i id="pg"></i></div><p id="pt" class="sm"></p>`+L.map((t,i)=>`<div class="task"><span>${fill(t)}</span><button class="mini" data-i="${i}">Selesai</button></div>`).join("")+`<button class="btn" id="fn" hidden>Selesaikan tantangan 🎉</button>`);
const up=()=>{$("#pg").style.width=ds.size/L.length*100+"%";$("#pt").textContent=`${ds.size}/${L.length} tantangan selesai`;$("#fn").hidden=ds.size<L.length};up();
$$(".mini").forEach(b=>b.onclick=()=>{ds.add(+b.dataset.i);b.textContent="✓";b.disabled=true;b.parentNode.classList.add("dn");sfx("ok");up()});$("#fn").onclick=()=>finish(4,L.length,L.length,C.praise[4])}
// ---------- game 6 ----------
function fin(){if(dn()<5){toast("Selesaikan 5 game pertama dulu ya 💗");return dash()}
shell("🎁 The Final Surprise",`<div class="c" id="fz"><button class="gift" id="gf" aria-label="Buka hadiah">🎁</button><p>Ketuk hadiahnya, ${esc(S.n)}!</p></div>`);
$("#gf").onclick=()=>{sfx("win");boom();$("#gf").classList.add("open");setTimeout(()=>{S.d[5]={s:1,m:1};save();$("#fz").innerHTML=`<div class="big">💖</div><div class="letter">`+C.letter.split(/\n\s*\n/).map(p=>`<p>${fill(p).replace(/\n/g,"<br>")}</p>`).join("")+`</div><h2 class="end">${C.closing}</h2><button class="btn" id="ok">Kembali ke Dashboard</button>`;$("#ok").onclick=dash;boom()},700)}}
S.go?dash():home();
