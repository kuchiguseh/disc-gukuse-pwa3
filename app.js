let DATA = null;

function $(sel) {
  return document.querySelector(sel);
}

const STATE_KEY = "disc_pwa_state_v1";
const HISTORY_KEY = "disc_pwa_history_v1";

function saveState(state) {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem(STATE_KEY);
  return raw ? JSON.parse(raw) : null;
}

function clearState() {
  localStorage.removeItem(STATE_KEY);
}

function loadHistory() {
  const raw = localStorage.getItem(HISTORY_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 5)));
}

function showSection(id) {
  ["home", "quiz", "result"].forEach((sec) => {
    const el = document.getElementById(sec);
    if (el) el.classList.add("hidden");
  });
  const target = document.getElementById(id);
  if (target) target.classList.remove("hidden");
}

function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function renderHome() {
  const recentSection = $("#recent-section");
  const recentList = $("#recent-list");
  const history = loadHistory();

  if (!recentSection || !recentList) return;

  if (history.length === 0) {
    recentSection.classList.add("hidden");
    recentList.innerHTML = "";
    return;
  }

  recentSection.classList.remove("hidden");
  recentList.innerHTML = history
    .map((h) => `<li>${h.date}｜${h.title}</li>`)
    .join("");
}

function startQuiz() {
  const order = DATA.questions.map((_, i) => i);
  const state = {
    step: 0,
    order,
    answers: []
  };
  saveState(state);
  renderQuiz();
  showSection("quiz");
}

function renderQuiz() {
  const state = loadState();
  if (!state) {
    showSection("home");
    return;
  }

  const qIndex = state.order[state.step];
  const q = DATA.questions[qIndex];

  $("#q-title").textContent = q.q;
  $("#q-count").textContent = `${state.step + 1} / ${DATA.questions.length}`;
  $("#progress-bar").style.width = `${((state.step + 1) / DATA.questions.length) * 100}%`;

  const choicesEl = $("#choices");
  choicesEl.innerHTML = "";

  const choiceIndexes = shuffle([0, 1, 2, 3]);

  choiceIndexes.forEach((choiceIdx) => {
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.type = "button";
    btn.textContent = q.choices[choiceIdx];
    btn.onclick = () => {
      state.answers[state.step] = choiceIdx;
      state.step += 1;

      if (state.step >= DATA.questions.length) {
        saveState(state);
        renderResult();
      } else {
        saveState(state);
        renderQuiz();
      }
    };
    choicesEl.appendChild(btn);
  });

  const prevBtn = $("#prev-btn");
  prevBtn.disabled = state.step === 0;
  prevBtn.onclick = () => {
    if (state.step > 0) {
      state.step -= 1;
      saveState(state);
      renderQuiz();
    }
  };
}

function getCounts(answers) {
  const counts = { D: 0, I: 0, S: 0, C: 0 };
  answers.forEach((answerIdx) => {
    const type = DATA.map[answerIdx];
    counts[type] += 1;
  });
  return counts;
}

function getMainType(counts) {
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function renderStats(counts) {
  const max = Math.max(...Object.values(counts));
  const labels = {
    D: "Dタイプ",
    I: "Iタイプ",
    S: "Sタイプ",
    C: "Cタイプ"
  };

  const colors = {
    D: "#ee8a5a",
    I: "#f0a030",
    S: "#50b870",
    C: "#4a90d9"
  };

  return `
    <div class="stats-section">
      <div class="section-bar section-bar-gray">あなたの回答傾向（選択数）</div>
      ${["D", "I", "S", "C"]
        .map((key) => {
          const width = max > 0 ? (counts[key] / max) * 100 : 0;
          return `
            <div class="stat-row">
              <div class="stat-label">${labels[key]}</div>
              <div class="stat-bar-wrap">
                <div class="stat-bar-fill" style="width:${width}%; background:${colors[key]};"></div>
              </div>
              <div class="stat-count">${counts[key]}問</div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderTopTags(pack, mainType) {
  return `
    <div class="top3-wrap">
      ${pack.top
        .map((t) => `<span class="top3-tag ${mainType.toLowerCase()}">${t}</span>`)
        .join("")}
    </div>
  `;
}

function renderRephraseTable(items) {
  return `
    <table class="rephrase-table">
      <tbody>
        ${items
          .map(
            (item) => `
          <tr>
            <td class="rephrase-bad">${item.bad}</td>
            <td class="rephrase-arrow">→</td>
            <td class="rephrase-good">${item.good}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderSelfCards(items, examples) {
  return `
    <div class="self-grid">
      ${items
        .map((item, i) => {
          const ex = examples[i] || "";
          return `
            <div class="self-card">
              <div class="self-main">${item}</div>
              <div class="self-ex">${ex}</div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderScripts(items) {
  return `
    ${items
      .map(
        (item) => `
      <div class="script-row">
        <div class="script-tag">${item.tag}</div>
        <div class="script-main">${item.text}</div>
        <div class="script-ex">${item.ex || ""}</div>
      </div>
    `
      )
      .join("")}
  `;
}

function renderPractice(items) {
  return `
    <ul class="practice-list">
      ${items.map((item) => `<li>${item}</li>`).join("")}
    </ul>
  `;
}

function renderResult() {
  const state = loadState();
  if (!state) return;

  const counts = getCounts(state.answers);
  const mainType = getMainType(counts);
  const pack = DATA.prescriptions[mainType];

  $("#result-stats").innerHTML = renderStats(counts);

  $("#result-content").innerHTML = `
    <div class="report-wrap">
      <div class="report-header">
        <div class="type-label">${mainType}</div>
        <div class="type-name">${pack.title}</div>
        <div class="type-catch">${pack.humor}</div>
      </div>

      <div class="section-bar section-bar-pink">あなたがよく使っている口ぐせはこの３つ！</div>
      ${renderTopTags(pack, mainType)}

      <div class="section-bar section-bar-orange">タイプ別 口ぐせ処方箋</div>
      <div class="disc-card ${pack.color}">
        <div class="disc-type">${mainType}</div>
        <div class="disc-sub">${pack.title}</div>
        <div class="disc-copy">${pack.copy}</div>
      </div>

      <div class="section-bar section-bar-green">言い換え提案</div>
      ${renderRephraseTable(pack.rephrase)}

      <div class="section-bar section-bar-purple">自分を整える口ぐせ</div>
      ${renderSelfCards(pack.self, pack.self_ex)}

      <div class="section-bar section-bar-teal">場面別スクリプト</div>
      ${renderScripts(pack.scripts)}

      <div class="section-bar section-bar-gray">今日から試せる実践メニュー</div>
      ${renderPractice(pack.practice)}
    </div>
  `;

  const history = loadHistory();
  if (history.length > 0) {
    $("#prev-result").classList.remove("hidden");
    $("#prev-result-content").innerHTML = `
      <p>${history[0].date}｜${history[0].title}</p>
    `;
  } else {
    $("#prev-result").classList.add("hidden");
  }

  history.unshift({
    date: new Date().toLocaleDateString("ja-JP"),
    title: pack.title
  });
  saveHistory(history);

  showSection("result");
  clearState();
}

function exportCSV() {
  const history = loadHistory();
  if (!history.length) {
    alert("履歴がありません。");
    return;
  }

  const rows = [["date", "title"], ...history.map((h) => [h.date, h.title])];
  const csv = rows.map((row) => row.map((v) => `"${v}"`).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "history.csv";
  a.click();

  URL.revokeObjectURL(url);
}

function downloadResultAsPNG() {
  const target = document.querySelector("#result-content");
  if (!target) return;

  alert("PNG保存は現在の簡易版では未実装です。必要なら次に追加します。");
}

document.addEventListener("DOMContentLoaded", () => {
  try {
    const raw = document.getElementById("APP_DATA").textContent;
    DATA = JSON.parse(raw);
  } catch (e) {
    console.error("APP_DATA parse error:", e);
    alert("診断データの読み込みに失敗しました。index.htmlのAPP_DATAを確認してください。");
    return;
  }

  renderHome();
  showSection("home");

  $("#start-btn").onclick = startQuiz;
  $("#export-csv").onclick = exportCSV;
  $("#download-result").onclick = downloadResultAsPNG;
  $("#share-btn").onclick = () => {
    alert("共有機能は次に追加できます。");
  };
});
