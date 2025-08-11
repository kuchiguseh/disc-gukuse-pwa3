let DATA = null;
function $(s){return document.querySelector(s);}
function el(tag, attrs={}, ...children){
  const n=document.createElement(tag);
  Object.entries(attrs).forEach(([k,v])=>{ if(k==="class") n.className=v; else if(k==="html") n.innerHTML=v; else n.setAttribute(k,v); });
  children.forEach(c=> n.appendChild(typeof c==="string"?document.createTextNode(c):c));
  return n;
}
function shuffle(a){return a.map(v=>[Math.random(),v]).sort((x,y)=>x[0]-y[0]).map(v=>v[1]);}
function shuffleIndices(n){return shuffle(Array.from({length:n},(_,i)=>i));}

const STATE_KEY="kg_disc_state_v3";
const HISTORY_KEY="kg_disc_history_v3";
function loadState(){try{return JSON.parse(localStorage.getItem(STATE_KEY))||null;}catch{return null;}}
function saveState(s){localStorage.setItem(STATE_KEY, JSON.stringify(s));}
function clearState(){localStorage.removeItem(STATE_KEY);}
function loadHistory(){try{return JSON.parse(localStorage.getItem(HISTORY_KEY))||[];}catch{return[];}}
function saveHistory(h){localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0,5)));}

function showSection(id){
  ['home','quiz','result'].forEach(sec=>{ const n=document.getElementById(sec); if(n) n.classList.add('hidden'); });
  const tgt=document.getElementById(id); if(tgt) tgt.classList.remove('hidden');
}

function renderHome(){
  const hist=loadHistory();
  const list=$('#recent-list'); const recentSection=$('#recent-section'); if(!list) return; list.innerHTML="";
  if(hist.length){ recentSection.classList.remove('hidden'); hist.forEach(h=>{ list.appendChild(el('li',{}, `${h.date}｜タイプ：${h.type}｜Top3：「${(h.top||[]).join('」「')}」`)); }); }
  else recentSection.classList.add('hidden');
}

function startQuiz(){
  const elData=document.getElementById('APP_DATA'); if(elData && !DATA){ try{DATA=JSON.parse(elData.textContent);}catch(e){ alert('データの読み込みに失敗しました'); return; } }
  const order=shuffleIndices(DATA.questions.length).slice(0,10);
  const state={i:0, order, answers:[], map: DATA.map}; saveState(state); renderQuiz(); showSection('quiz');
}
function renderQuiz(){
  const s=loadState(); const idx=s.order[s.i]; const q=DATA.questions[idx];
  $('#q-title').textContent=q.q; $('#q-count').textContent=`${s.i+1}/10`;
  const choices=$('#choices'); choices.innerHTML="";
  const mapOrder=shuffleIndices(4);
  mapOrder.forEach(ci=>{
    const c=el('div',{class:'choice','data-choice':ci}, q.choices[ci]);
    c.onclick=()=>{ s.answers[s.i]=ci; s.i++; if(s.i>=10){ saveState(s); computeResult(); } else { saveState(s); renderQuiz(); } };
    choices.appendChild(c);
  });
  const prev=$('#prev-btn'); prev.disabled=(s.i===0); prev.onclick=()=>{ if(s.i>0){ s.i--; saveState(s); renderQuiz(); } };
  $('#progress-bar').style.width=`${(s.i/10)*100}%`;
}

function renderRich(pack, mainKey){
  const topBox = `
    <div class="soft-card">
      <div class="section-title">あなたがよく使っている口ぐせはこの３つ！</div>
      <ol class="kg-ol">
        <li class="kg-li">${pack.top?.[0]||''}</li>
        <li class="kg-li">${pack.top?.[1]||''}</li>
        <li class="kg-li">${pack.top?.[2]||''}</li>
      </ol>
    </div>`;
  const typeNames={D:'行動派',I:'社交派',S:'思いやり派',C:'こだわり派'};
  const head = `
    <h3 class="section-title">タイプ別 口ぐせ処方箋</h3>
    <div class="type-chip"><span class="type-dot">${mainKey}</span>${typeNames[mainKey]||''}タイプの処方箋</div>
    <p style="margin-top:8px;">${pack.copy||''}</p>`;
  const rephrase = `
    <h4 class="section-title">言い換え提案</h4>
    <ul>${(pack.rephrase||[]).map(x=>`<li class="kg-li">${x}</li>`).join('')}</ul>`;
  const self = `
    <h4 class="section-title">自分を整える口ぐせ</h4>
    <ul>${[pack.self, ...(pack.self_extra||[])].filter(Boolean).map(x=>`<li class="kg-li">${x}</li>`).join('')}</ul>`;
  const scriptHTML = `
    <h4 class="section-title">場面別スクリプト</h4>
    <ul>${(pack.scripts||[]).map(x=>`<li class="kg-li"><span class="kg-pill">${x.tag||'スクリプト'}</span>${x.text}</li>`).join('')}</ul>`;
  const practice = renderPractice(mainKey);
  return topBox + '<hr class="hr-soft"/>' + head + rephrase + self + scriptHTML + '<hr class="hr-soft"/>' + practice;
}

function statsBars(counts){
  const order=['D','I','S','C'];
  const labels={D:'Dタイプ',I:'Iタイプ',S:'Sタイプ',C:'Cタイプ'};
  const cls={D:'fill-d',I:'fill-i',S:'fill-s',C:'fill-c'};
  const max=Math.max(1, ...order.map(k=>counts[k]||0));
  return '<div class="soft-card"><div class="section-title">あなたの回答傾向（選択数）</div>'+
    '<div class="stats">'+
    order.map(k=>{
      const v=counts[k]||0; const w=Math.round(100*v/max);
      return `<div class="stat">
        <div class="label">${labels[k]}</div>
        <div class="bar"><div class="fill ${cls[k]}" style="width:${w}%"></div></div>
        <div class="count">${v}問</div>
      </div>`;
    }).join('')+
    '</div></div>';
}

function computeResult(){
  const s=loadState(); const counts={D:0,I:0,S:0,C:0};
  s.answers.forEach(ci=>{ const k=DATA.map[ci]; counts[k]++; });
  const arr=Object.entries(counts).sort((a,b)=>b[1]-a[1]); const main=arr[0][0]; const pack=DATA.prescriptions[main];

  // stats
  document.getElementById('result-stats').innerHTML = statsBars(counts);

  const resultHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin:12px 0 6px;">
      <div class="type-chip"><span class="type-dot">${main}</span>${pack.title}</div>
    </div>
    <p>${pack.humor||''}</p>`;
  document.getElementById('result-content').innerHTML = resultHTML + renderRich(pack, main);

  // history
  const hist=loadHistory();
  if(hist.length){
    const prev=document.getElementById('prev-result'); const area=document.getElementById('prev-result-content');
    const p=hist[0];
    area.innerHTML = `<p>${p.date}｜タイプ：${p.type}</p><div class="top3">${(p.top||[]).map(t=>`<span class="badge">${t}</span>`).join('')}</div>`;
    prev.classList.remove('hidden');
  }
  const record={date:new Date().toLocaleDateString('ja-JP'), type: pack.title.replace(/^.. /,''), top: pack.top, key: main};
  hist.unshift(record); saveHistory(hist);

  clearState(); showSection('result'); renderHome();
}

function renderPractice(mainKey){
  const map={
    D:["朝一番に「〇〇な一日になる！」と声に出す","週替わりでテーマ口ぐせを決める","3日・3週間・3ヶ月の習慣化マイルストーンを決める"],
    I:["家族・友人に「私の口ぐせって何？」と聞いてみる","好きな音楽＋口ぐせでテンションを上げる","週に一度、ポジティブしりとりで遊ぶ"],
    S:["感情が揺れた瞬間に「大丈夫」とつぶやく","「ありがとう日記」を毎晩書く","自然の中で深呼吸しながら口ぐせを唱える"],
    C:["今日の口ぐせを寝る前にメモする","ネガティブ→ポジティブ置き換え辞書を作る","ZOOM録音やスマホで自分の話し方をチェックする"]
  };
  const items=(map[mainKey]||[]).map(x=>`<li class="kg-li">${x}</li>`).join('');
  return `<h3 class="section-title">今日から試せる実践メニュー</h3><ol class="kg-ol">${items}</ol>`;
}

function drawPNG(pack){
  const W=1000,H=760,P=40; const c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d');
  const grad=g.createLinearGradient(0,0,W,0); grad.addColorStop(0,'#ffe3ec'); grad.addColorStop(1,'#fdf5ff');
  g.fillStyle=grad; g.fillRect(0,0,W,H);
  g.fillStyle='#e85a8b'; g.font='bold 42px system-ui, sans-serif'; g.fillText('DISC別口ぐせ診断', P, 80);
  g.fillStyle='#333'; g.font='28px system-ui, sans-serif'; g.fillText(`タイプ：${pack.title.replace(/^.. /,'')}`, P, 140);
  g.font='22px system-ui, sans-serif'; g.fillText(new Date().toLocaleString('ja-JP'), P, 180);
  g.font='bold 26px system-ui, sans-serif'; g.fillText('Top3口ぐせ', P, 230);
  g.font='24px system-ui, sans-serif'; (pack.top||[]).forEach((t,i)=> g.fillText(`${i+1}. ${t}`, P, 270+i*34));
  g.font='bold 26px system-ui, sans-serif'; g.fillText('今日の処方箋', P, 360);
  g.font='22px system-ui, sans-serif'; (pack.rephrase||[]).slice(0,2).forEach((t,i)=> g.fillText(`・${t}`, P, 400+i*30));
  const url=c.toDataURL('image/png'); const a=document.createElement('a'); a.href=url; a.download='kuchiguse-result.png'; a.click();
}

document.addEventListener('DOMContentLoaded', ()=>{
  const elData=document.getElementById('APP_DATA'); if(elData){ try{ DATA=JSON.parse(elData.textContent);}catch(e){} }
  renderHome();
  document.getElementById('start-btn').onclick = startQuiz;
  document.getElementById('export-csv').onclick = ()=>{
    const hist=loadHistory(); if(!hist.length){ alert('履歴がありません'); return; }
    const header=['date','type','top1','top2','top3'];
    const rows=hist.map(h=>[h.date,h.type,h.top?.[0]||'',h.top?.[1]||'',h.top?.[2]||'']);
    const csv=[header.join(','),...rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download='history.csv'; a.click(); URL.revokeObjectURL(url);
  };
  document.getElementById('share-btn').onclick = ()=>{
    const title='口ぐせ診断'; const text='私のタイプが出ました🌸 あなたもやってみてね！'; const url=location.href;
    if(navigator.share){ navigator.share({title,text,url}).catch(()=>{}); } else { alert(url); }
  };
  document.getElementById('download-result').onclick = ()=>{
    const hist=loadHistory(); const key=hist?.[0]?.key || 'D'; const pack=DATA.prescriptions[key]; drawPNG(pack);
  };
});
