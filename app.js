'use strict';

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

// ── タイブレーク用 ──────────────────────────────────────────────
const TIEBREAK_Q = {
  'DI': { text: '大事な場面で自然に出る行動は？',
    choices: [{ label: '自分が前に出て引っ張る', type: 'D' }, { label: 'みんなを盛り上げて動かす', type: 'I' }] },
  'DS': { text: 'チームで動くとき、あなたは？',
    choices: [{ label: 'スピードを上げて先導する', type: 'D' }, { label: 'ペースを合わせて支える', type: 'S' }] },
  'DC': { text: '決断する時のスタイルは？',
    choices: [{ label: '直感で素早く決める', type: 'D' }, { label: 'データを集めて慎重に決める', type: 'C' }] },
  'IS': { text: '大切な人への接し方は？',
    choices: [{ label: '一緒に楽しいことをする', type: 'I' }, { label: 'そばでそっと寄り添う', type: 'S' }] },
  'IC': { text: '新しいアイデアが浮かんだら？',
    choices: [{ label: 'すぐ周りに話して盛り上げる', type: 'I' }, { label: 'まず整理して検証してから共有する', type: 'C' }] },
  'SC': { text: 'トラブルが起きた時、まず何をする？',
    choices: [{ label: '周りを安心させて落ち着かせる', type: 'S' }, { label: '原因を分析して対策を考える', type: 'C' }] }
};
const TIEBREAK_ORDER_3 = { 'DIS':['D','I'], 'DIC':['D','I'], 'DSC':['D','S'], 'ISC':['I','S'] };
let tbQueue = [];
let tbCounts = {};

function getTiedTypes(counts){
  const max = Math.max(...Object.values(counts));
  return Object.keys(counts).filter(k => counts[k] === max);
}
function buildTbQueue(tied){
  if(tied.length===2) return [[tied[0],tied[1]]];
  if(tied.length===3){
    const key=tied.slice().sort().join('');
    const first=TIEBREAK_ORDER_3[key]||[tied[0],tied[1]];
    const rem=tied.find(t=>!first.includes(t));
    return [[first[0],first[1]],[null,rem]];
  }
  return [[tied[0],tied[1]]];
}
// ────────────────────────────────────────────────────────────────

function showSection(id){
  ['home','quiz','result','tiebreak'].forEach(sec=>{
    const n=document.getElementById(sec); if(n) n.classList.add('hidden');
  });
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
  const state={i:0, order, answers:[], map:DATA.map}; saveState(state); renderQuiz(); showSection('quiz');
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

function renderTiebreak(){
  if(tbQueue.length===0){ finalizeResult(); return; }
  const [tA,tB]=tbQueue[0];
  const key=[tA,tB].sort().join('');
  const q=TIEBREAK_Q[key];
  if(!q){ tbQueue.shift(); renderTiebreak(); return; }
  let tbSection=document.getElementById('tiebreak');
  if(!tbSection){ tbSection=document.createElement('section'); tbSection.id='tiebreak'; document.querySelector('main').appendChild(tbSection); }
  tbSection.innerHTML='';
  tbSection.classList.remove('hidden');
  tbSection.style.cssText='padding:20px;background:#fff;border-radius:12px;margin:12px 0;';
  const notice=document.createElement('p');
  notice.innerHTML=`🌸 <strong>${tA}・${tB}タイプが同点</strong>です。追加質問に答えてください`;
  notice.style.cssText='color:#e07040;margin-bottom:12px;font-size:0.95em;';
  const qTitle=document.createElement('p');
  qTitle.textContent=q.text;
  qTitle.style.cssText='font-size:1.1em;font-weight:700;margin-bottom:16px;';
  const choicesDiv=document.createElement('div');
  choicesDiv.className='choices';
  q.choices.forEach(c=>{
    const btn=el('div',{class:'choice'},c.label);
    btn.onclick=()=>{
      tbCounts[c.type]=(tbCounts[c.type]||0)+1;
      const winner=c.type;
      tbQueue.shift();
      if(tbQueue.length>0){
        if(tbQueue[0][0]===null) tbQueue[0][0]=winner;
        else if(tbQueue[0][1]===null) tbQueue[0][1]=winner;
      }
      setTimeout(()=>renderTiebreak(),300);
    };
    choicesDiv.appendChild(btn);
  });
  tbSection.appendChild(notice); tbSection.appendChild(qTitle); tbSection.appendChild(choicesDiv);
  showSection('tiebreak');
}

function finalizeResult(){
  const s=loadState(); const mainCounts={D:0,I:0,S:0,C:0};
  if(s){ s.answers.forEach(ci=>{ const k=DATA.map[ci]; mainCounts[k]++; }); }
  Object.keys(tbCounts).forEach(t=>{ mainCounts[t]+=tbCounts[t]; });
  const arr=Object.entries(mainCounts).sort((a,b)=>b[1]-a[1]);
  renderResult(mainCounts, arr[0][0]);
}

function computeResult(){
  const s=loadState(); const counts={D:0,I:0,S:0,C:0};
  s.answers.forEach(ci=>{ const k=DATA.map[ci]; counts[k]++; });
  const tied=getTiedTypes(counts);
  if(tied.length>=2){
    tbQueue=buildTbQueue(tied); tbCounts={};
    saveState({...s, baseCounts:counts});
    renderTiebreak();
  } else {
    renderResult(counts, tied[0]);
  }
}

// ── PDF風結果画面レンダリング ────────────────────────────────────
function renderResult(counts, main){
  const pack=DATA.prescriptions[main];
  const color=pack.color||'d';
  const today=new Date().toLocaleDateString('ja-JP',{year:'numeric',month:'long',day:'numeric'});
  const max=Math.max(1,...Object.values(counts));

  // タイプ別カラー設定
  const barColors={D:'fill-d',I:'fill-i',S:'fill-s',C:'fill-c'};
  const sectionColors={D:'orange',I:'pink',S:'green',C:'teal'};
  const sc=sectionColors[main]||'orange';

  // 統計バー
  const statsHTML=`
    <div class="stats-section">
      <div class="section-bar" style="margin-top:0;">回答傾向（DISC選択数）</div>
      ${['D','I','S','C'].map(k=>`
        <div class="stat-row">
          <div class="stat-label">${k}タイプ</div>
          <div class="stat-bar-wrap"><div class="stat-bar-fill ${barColors[k]}" style="width:${Math.round(100*(counts[k]||0)/max)}%"></div></div>
          <div class="stat-count">${counts[k]||0}問</div>
        </div>`).join('')}
    </div>`;

  // TOP3タグ
  const top3HTML=`
    <div class="section-bar ${sc}">あなたがよく使う口ぐせ（TOP3）</div>
    <div class="top3-wrap">
      ${(pack.top||[]).map(t=>`<span class="top3-tag ${color}">${t}</span>`).join('')}
    </div>`;

  // 言い換え提案
  const rephraseHTML=`
    <div class="section-bar ${sc}">口ぐせ処方箋（${main}：${pack.title.replace(/\s*\([DISC]\)/,'')}）</div>
    <table class="rephrase-table">
      ${(pack.rephrase||[]).map(r=>`
        <tr>
          <td class="rephrase-bad">${r.bad}</td>
          <td class="rephrase-arrow">→</td>
          <td class="rephrase-good">${r.good}</td>
        </tr>`).join('')}
    </table>`;

  // 自分を整える口ぐせ（3カラム）
  const selfItems=pack.self||[];
  const selfEx=pack.self_ex||[];
  const selfHTML=`
    <div class="section-bar ${sc}">自分を整える口ぐせ</div>
    <div class="self-grid">
      ${selfItems.map((s,i)=>`
        <div class="self-card">
          <div class="self-main">${s}</div>
          <div class="self-ex">${selfEx[i]||''}</div>
        </div>`).join('')}
    </div>`;

  // 場面別スクリプト
  const scriptHTML=`
    <div class="section-bar ${sc}">場面別スクリプト</div>
    ${(pack.scripts||[]).map(s=>`
      <div class="script-row">
        <span class="script-tag">${s.tag}</span>
        <div class="script-main">${s.text}</div>
        <div class="script-ex">${s.ex||''}</div>
      </div>`).join('')}`;

  // 実践メニュー
  const practiceHTML=`
    <div class="section-bar gray">今日からの実践メニュー</div>
    <ul class="practice-list">
      ${(pack.practice||[]).map(p=>`<li>${p}</li>`).join('')}
    </ul>`;

  // DISCとは？
  const discHTML=`
    <div class="section-bar" style="background:#4a7fa5;">DISCとは？</div>
    <p style="font-size:13px;color:#444;margin-bottom:10px;">DISC理論は、人の行動パターンを4つのタイプに分類する心理モデルです。あなたの口ぐせには、このタイプ特有の思考パターンが表れています。</p>
    <div class="disc-grid">
      <div class="disc-card d">
        <div class="disc-type">D（主導型）</div>
        <div class="disc-sub">行動力・決断力・リーダー気質</div>
        <div class="disc-ex">・「早くやろう！」<br>・「こうすれば絶対うまくいく」</div>
      </div>
      <div class="disc-card i">
        <div class="disc-type">I（感化型）</div>
        <div class="disc-sub">社交的・楽観的・表現力豊か</div>
        <div class="disc-ex">・「楽しみだね！」<br>・「なんとかなる！」</div>
      </div>
      <div class="disc-card s">
        <div class="disc-type">S（安定型）</div>
        <div class="disc-sub">協調性・思いやり・穏やか</div>
        <div class="disc-ex">・「大丈夫？」<br>・「いつもありがとう」</div>
      </div>
      <div class="disc-card c">
        <div class="disc-type">C（慎重型）</div>
        <div class="disc-sub">分析力・正確さ・こだわり強め</div>
        <div class="disc-ex">・「ちゃんと確認しよう」<br>・「段取りが大事」</div>
      </div>
    </div>`;

  // 講師プロフィール
  const profileHTML=`
    <div class="section-bar gray">講師プロフィール・セミナーのご案内</div>
    <div class="profile-box">
      <div class="profile-right">
        <div class="profile-name">口ぐせセラピスト 大石ゆうじ</div>
        <div class="profile-desc">口ぐせ改善コンサルタント<br>長野県佐久市在住</div>
      </div>
      <div class="seminar-box">
        <div class="seminar-title">セミナー・セッションのご案内</div>
        <div class="seminar-desc">オンラインセミナー：<br>毎週水曜日 10:00〜 / 土曜日 10:00〜<br>口ぐせセッション（個別）も是非ご検討ください</div>
      </div>
    </div>`;

  // フッター
  const footerHTML=`<div class="report-footer-bar">口ぐせを変えると、人生が変わる　― DISC別口ぐせ診断 パーソナルレポート</div>`;

  // ヘッダーボックス
  const headerHTML=`
    <div class="report-date">診断日：${today}</div>
    <div class="report-header">
      <div class="type-label">あなたのタイプ</div>
      <div class="type-name">${pack.title}</div>
      <div class="type-catch">${pack.copy}</div>
    </div>`;

  document.getElementById('result-stats').innerHTML=statsHTML;
  document.getElementById('result-content').innerHTML=
    headerHTML + top3HTML + rephraseHTML + selfHTML + scriptHTML + practiceHTML + discHTML + profileHTML + footerHTML;

  window.LAST_EXPORT={counts, pack, main};

  // history
  const hist=loadHistory();
  if(hist.length){
    const prev=document.getElementById('prev-result'); const area=document.getElementById('prev-result-content');
    const p=hist[0];
    area.innerHTML=`<p>${p.date}｜タイプ：${p.type}</p><div class="top3-wrap">${(p.top||[]).map(t=>`<span class="top3-tag ${(p.key||'d').toLowerCase()}">${t}</span>`).join('')}</div>`;
    prev.classList.remove('hidden');
  }
  const record={date:today, type:pack.title.replace(/\s*\([DISC]\)/,''), top:pack.top, key:main};
  hist.unshift(record); saveHistory(hist);
  clearState(); showSection('result'); renderHome();
}
// ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', ()=>{
  const elData=document.getElementById('APP_DATA'); if(elData){ try{ DATA=JSON.parse(elData.textContent);}catch(e){} }
  renderHome();
  document.getElementById('start-btn').onclick=startQuiz;
  document.getElementById('export-csv').onclick=()=>{
    const hist=loadHistory(); if(!hist.length){ alert('履歴がありません'); return; }
    const header=['date','type','top1','top2','top3'];
    const rows=hist.map(h=>[h.date,h.type,h.top?.[0]||'',h.top?.[1]||'',h.top?.[2]||'']);
    const csv=[header.join(','),...rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download='history.csv'; a.click(); URL.revokeObjectURL(url);
  };
  document.getElementById('share-btn').onclick=()=>{
    const title='口ぐせ診断'; const text='私のタイプが出ました🌸 あなたもやってみてね！'; const url=location.href;
    if(navigator.share){ navigator.share({title,text,url}).catch(()=>{}); } else { alert(url); }
  };
  document.getElementById('download-result').onclick=()=>{
    if(window.LAST_EXPORT){ drawFullPNG(); } else { alert('結果を生成後に保存してください'); }
  };
});

function drawFullPNG(){
  const exp=window.LAST_EXPORT; if(!exp){ alert('結果がありません'); return; }
  const {counts,pack,main}=exp;
  const W=1100,H=1800,P=40;
  const c=document.createElement('canvas'); c.width=W; c.height=H;
  const g=c.getContext('2d');
  const grad=g.createLinearGradient(0,0,W,0); grad.addColorStop(0,'#ffe3ec'); grad.addColorStop(1,'#fdf5ff');
  g.fillStyle=grad; g.fillRect(0,0,W,H);
  g.fillStyle='#e85a8b'; g.font='bold 42px system-ui, sans-serif'; g.fillText('口ぐせ診断 パーソナルレポート',P,60);
  g.fillStyle='#888'; g.font='20px system-ui, sans-serif'; g.fillText(`診断日：${new Date().toLocaleDateString('ja-JP')}`,P,92);
  g.fillStyle='#c94a1a'; g.font='bold 32px system-ui, sans-serif'; g.fillText(`あなたのタイプ：${pack.title}`,P,136);
  g.fillStyle='#555'; g.font='20px system-ui, sans-serif';
  let y=172; const words=pack.copy.split(''); let line='';
  words.forEach(ch=>{ if(g.measureText(line+ch).width>W-2*P){ g.fillText(line,P,y); y+=28; line=ch; }else{ line+=ch; } });
  if(line){ g.fillText(line,P,y); y+=36; }
  g.fillStyle='#4a7fa5'; g.font='bold 22px system-ui, sans-serif'; g.fillText('回答傾向（DISC選択数）',P,y); y+=28;
  const order=['D','I','S','C']; const clrs={D:'#e85a5a',I:'#f0a030',S:'#50b870',C:'#4a90d9'}; const mx=Math.max(1,...order.map(k=>counts[k]||0));
  order.forEach(k=>{ const v=counts[k]||0; g.fillStyle='#333'; g.font='bold 20px system-ui, sans-serif'; g.fillText(`${k}タイプ`,P,y+20); g.fillStyle='#f1f1f1'; g.fillRect(120,y+6,600,16); g.fillStyle=clrs[k]; g.fillRect(120,y+6,Math.round(600*v/mx),16); g.fillStyle='#333'; g.font='18px system-ui, sans-serif'; g.fillText(`${v}問`,734,y+20); y+=36; });
  y+=10;
  g.fillStyle='#e07040'; g.font='bold 22px system-ui, sans-serif'; g.fillText('よく使う口ぐせ TOP3',P,y); y+=30;
  g.fillStyle='#333'; g.font='22px system-ui, sans-serif'; (pack.top||[]).forEach(t=>{ g.fillText(`・${t}`,P,y); y+=30; }); y+=10;
  g.fillStyle='#e07040'; g.font='bold 22px system-ui, sans-serif'; g.fillText('口ぐせ処方箋',P,y); y+=30;
  g.font='20px system-ui, sans-serif'; (pack.rephrase||[]).forEach(r=>{ g.fillStyle='#555'; g.fillText(r.bad,P,y); g.fillStyle='#e07040'; g.fillText('→',360,y); g.fillStyle='#1a60a0'; g.fillText(r.good,400,y); y+=32; }); y+=10;
  g.fillStyle='#5a9a6a'; g.font='bold 22px system-ui, sans-serif'; g.fillText('自分を整える口ぐせ',P,y); y+=30;
  g.fillStyle='#333'; g.font='20px system-ui, sans-serif'; (pack.self||[]).forEach((s,i)=>{ g.fillText(`・${s}`,P,y); if(pack.self_ex?.[i]){ g.fillStyle='#888'; g.font='17px system-ui, sans-serif'; g.fillText(pack.self_ex[i],P+20,y+22); g.fillStyle='#333'; g.font='20px system-ui, sans-serif'; y+=22; } y+=30; }); y+=10;
  g.fillStyle='#4a7fa5'; g.font='bold 22px system-ui, sans-serif'; g.fillText('場面別スクリプト',P,y); y+=30;
  g.font='20px system-ui, sans-serif'; (pack.scripts||[]).forEach(s=>{ g.fillStyle='#4a7fa5'; g.fillText(`【${s.tag}】`,P,y); g.fillStyle='#222'; g.fillText(s.text,P+80,y); y+=28; if(s.ex){ g.fillStyle='#888'; g.font='17px system-ui, sans-serif'; g.fillText(s.ex,P+80,y); y+=22; g.font='20px system-ui, sans-serif'; } }); y+=10;
  g.fillStyle='#666'; g.font='bold 22px system-ui, sans-serif'; g.fillText('今日からの実践メニュー',P,y); y+=30;
  g.fillStyle='#333'; g.font='20px system-ui, sans-serif'; (pack.practice||[]).forEach(p=>{ g.fillText(`・${p}`,P,y); y+=30; });
  const url=c.toDataURL('image/png'); const a=document.createElement('a'); a.href=url; a.download='kuchiguse-result.png'; a.click();
}
