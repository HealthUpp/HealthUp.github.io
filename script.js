/* ═══════════════════════════════════════════════════════════════
   HealthUp Pro — script.js v3.1
   Estado sincronizado com o backend via /api/user
═══════════════════════════════════════════════════════════════ */

/* ── Estado local (espelho do servidor) ── */
const state = {
  progress:    0,
  workouts:    0,
  streak:      0,
  lastWorkout: "",
  goal:        "",
  rotinas:     [],
  treinoHist:  [],
  dietaGerada: false,
  perfil:      { nome: "", altura: "", peso: "" },
  imcHist:     []
};

/* ════════════════════════════════════════
   API — comunicação com o backend
════════════════════════════════════════ */
const api = {
  async loadUser() {
    try {
      const res  = await fetch("/api/user");
      const data = await res.json();
      Object.assign(state, data);
      state.dietaGerada = sessionStorage.getItem("dietaGerada") === "1";
    } catch {
      state.progress    = parseInt(sessionStorage.getItem("progress")    || "0");
      state.workouts    = parseInt(sessionStorage.getItem("workouts")    || "0");
      state.goal        = sessionStorage.getItem("goal")                 || "";
      state.rotinas     = JSON.parse(sessionStorage.getItem("rotinas")   || "[]");
      state.treinoHist  = JSON.parse(sessionStorage.getItem("treinoHist") || "[]");
      state.streak      = parseInt(sessionStorage.getItem("streak")     || "0");
      state.lastWorkout = sessionStorage.getItem("lastWorkout")         || "";
      state.dietaGerada = sessionStorage.getItem("dietaGerada")         === "1";
      state.perfil      = JSON.parse(sessionStorage.getItem("perfil")   || '{"nome":"","altura":"","peso":""}');
      state.imcHist     = JSON.parse(sessionStorage.getItem("imcHist")  || "[]");
      log("warn", "Backend offline — usando dados locais");
    }
  },

  async save(patch) {
    Object.assign(state, patch);
    for (const [k, v] of Object.entries(patch)) {
      sessionStorage.setItem(k, typeof v === "object" ? JSON.stringify(v) : v);
    }
    try {
      await fetch("/api/user", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(patch),
      });
    } catch {
      log("warn", "Falha ao salvar no servidor — dados mantidos localmente");
    }
  }
};

function log(level, msg) {
  const icons = { info: "ℹ️", warn: "⚠️", err: "❌" };
  console.log(`${icons[level] || "•"} [HealthUp] ${msg}`);
}

/* ════════════════════════════════════════
   TOAST
════════════════════════════════════════ */
function toast(msg, type = "info", duration = 3200) {
  const colors = { info:"#007aff", success:"#00b248", warning:"#e67e00", error:"#cc0000" };
  const icons  = { info:"ℹ️", success:"✅", warning:"⚠️", error:"❌" };

  const el = document.createElement("div");
  el.className = "toast-el";
  el.style.cssText = `
    position:fixed;bottom:28px;right:28px;z-index:9999;
    background:rgba(10,15,28,0.97);
    border:1px solid ${colors[type]}55;
    border-left:4px solid ${colors[type]};
    color:#f0f4ff;padding:13px 18px;border-radius:10px;
    font-size:.87rem;max-width:320px;line-height:1.5;
    box-shadow:0 8px 32px rgba(0,0,0,.55);
    display:flex;align-items:center;gap:10px;
    animation:slideInToast .3s ease both;
    font-family:'Segoe UI',system-ui,sans-serif;
  `;
  el.innerHTML = `<span style="flex-shrink:0">${icons[type]}</span><span>${msg}</span>`;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.animation = "slideOutToast .3s ease forwards";
    setTimeout(() => el.remove(), 300);
  }, duration);
}

/* ════════════════════════════════════════
   MODAL
════════════════════════════════════════ */
function showModal(title, body, actions = []) {
  document.getElementById("modalOverlay")?.remove();
  const overlay = document.createElement("div");
  overlay.id = "modalOverlay";
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:8888;
    display:flex;align-items:center;justify-content:center;
    backdrop-filter:blur(8px);animation:fadeModalIn .25s ease both;
    font-family:'Segoe UI',system-ui,sans-serif;
  `;
  const btns = actions.map(a => `
    <button onclick="${a.fn}();document.getElementById('modalOverlay').remove()"
      style="background:${a.danger?"linear-gradient(135deg,#a00,#f44)":"linear-gradient(135deg,#007aff,#00c6ff)"};
      color:#fff;border:none;padding:10px 22px;border-radius:8px;cursor:pointer;
      font-weight:600;font-size:.88rem;font-family:inherit;">
      ${a.label}
    </button>`).join("");
  overlay.innerHTML = `
    <div style="background:#0c1525;border:1px solid rgba(255,255,255,.1);
      border-radius:18px;padding:34px;max-width:420px;width:90%;
      box-shadow:0 28px 70px rgba(0,0,0,.65);">
      <h3 style="font-size:1.2rem;margin-bottom:12px;color:#f0f4ff">${title}</h3>
      <p style="color:#8899b0;font-size:.9rem;margin-bottom:26px;line-height:1.65">${body}</p>
      <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap">
        <button onclick="document.getElementById('modalOverlay').remove()"
          style="background:rgba(255,255,255,.07);color:#b0b8c8;
          border:1px solid rgba(255,255,255,.1);padding:10px 20px;border-radius:8px;
          cursor:pointer;font-size:.88rem;font-family:inherit;">Cancelar</button>
        ${btns}
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

/* ════════════════════════════════════════
   NAVEGAÇÃO
════════════════════════════════════════ */
function navigate(page, btn) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("show"));
  document.getElementById(page).classList.add("show");
  document.querySelectorAll(".nav").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  const label = btn?.querySelector("span")?.textContent || page;
  document.title = `HealthUp — ${label}`;
}

/* ════════════════════════════════════════
   SYNC CENTRAL DE PROGRESSO
════════════════════════════════════════ */
function syncProgress(value, save = true) {
  const prev = state.progress;
  const next = Math.min(100, Math.max(0, value));

  const pct = next + "%";
  ["progressFill","dashProgressBar","barFill"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.width = pct;
  });
  ["progressText","dashProg","dashProgLabel","barLabel"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = pct;
  });
  const inp = document.getElementById("progressInput");
  if (inp && document.activeElement !== inp) inp.value = next;

  if (save) api.save({ progress: next });
  state.progress = next;

  if (prev < 100 && next === 100) celebrateGoal();
}

/* ════════════════════════════════════════
   CELEBRAÇÃO 🎉
════════════════════════════════════════ */
function celebrateGoal() {
  launchConfetti();
  showModal(
    "🏆 Meta atingida!",
    `Parabéns! Você chegou a 100%${state.goal ? ` do objetivo "<strong>${escHtml(state.goal)}</strong>"` : ""}!<br><br>Hora de definir um novo desafio e continuar evoluindo.`,
    [{ label: "Resetar e recomeçar", fn: "resetProgress", danger: true }]
  );
}

function launchConfetti() {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;z-index:9990;pointer-events:none";
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const palette = ["#00c6ff","#007aff","#00e676","#b47cff","#ffb347","#ff6b6b","#fff"];

  const pieces = Array.from({ length: 140 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * -canvas.height * 1.2,
    r: Math.random() * 6 + 3,
    d: Math.random() * 2.5 + 1,
    color: palette[Math.floor(Math.random() * palette.length)],
    tiltAngle: 0,
    tiltSpeed: Math.random() * 0.1 + 0.04,
  }));

  let frame = 0;
  (function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.tiltAngle += p.tiltSpeed;
      p.y += p.d + Math.sin(frame * 0.01) * 0.4;
      p.x += Math.sin(frame * 0.012 + p.tiltAngle) * 0.7;
      if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width; }
      ctx.beginPath();
      ctx.lineWidth   = p.r;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + Math.sin(p.tiltAngle) * 10, p.y);
      ctx.lineTo(p.x, p.y + p.r * 1.5);
      ctx.stroke();
    });
    frame++;
    if (frame < 260) requestAnimationFrame(draw);
    else canvas.remove();
  })();
}

/* ════════════════════════════════════════
   STREAK
════════════════════════════════════════ */
function updateStreak() {
  const today     = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (state.lastWorkout === today) return;

  const newStreak = state.lastWorkout === yesterday ? state.streak + 1 : 1;
  api.save({ streak: newStreak, lastWorkout: today });
  renderStreak(newStreak);
}

function renderStreak(val) {
  const v = val ?? state.streak;
  ["dashStreak","streakDisplay"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = v + (v === 1 ? " dia" : " dias");
  });
}

/* ════════════════════════════════════════
   TREINO
════════════════════════════════════════ */
const WORKOUTS = {
  peito:   [{n:"Supino reto",s:"4×8-12"},{n:"Supino inclinado",s:"3×10"},{n:"Crucifixo",s:"3×12"},{n:"Crossover",s:"3×15"},{n:"Pullover",s:"3×12"}],
  costas:  [{n:"Barra fixa",s:"4×8"},{n:"Remada curvada",s:"4×10"},{n:"Pulldown",s:"3×12"},{n:"Levantamento terra",s:"3×6"},{n:"Remada unilateral",s:"3×12"}],
  perna:   [{n:"Agachamento livre",s:"4×10"},{n:"Leg press",s:"4×12"},{n:"Cadeira extensora",s:"3×15"},{n:"Cadeira flexora",s:"3×15"},{n:"Panturrilha em pé",s:"4×20"}],
  biceps:  [{n:"Rosca direta",s:"4×10"},{n:"Rosca alternada",s:"3×12"},{n:"Rosca martelo",s:"3×12"},{n:"Rosca concentrada",s:"3×12"},{n:"Rosca 21",s:"3×21"}],
  triceps: [{n:"Tríceps corda",s:"4×12"},{n:"Tríceps testa",s:"3×10"},{n:"Mergulho no banco",s:"3×15"},{n:"Tríceps francês",s:"3×10"},{n:"Tríceps coice",s:"3×12"}],
  ombro:   [{n:"Desenvolvimento",s:"4×10"},{n:"Elevação lateral",s:"3×15"},{n:"Elevação frontal",s:"3×12"},{n:"Remada alta",s:"3×12"},{n:"Encolhimento",s:"3×15"}],
  abdomen: [{n:"Crunch",s:"4×20"},{n:"Prancha",s:"3×45s"},{n:"Abdominal bicicleta",s:"3×20"},{n:"Elevação de pernas",s:"3×15"},{n:"Oblíquo",s:"3×20"}],
};

function generateWorkout() {
  const muscle = document.getElementById("muscle").value;
  const list   = document.getElementById("workoutList");
  if (!muscle) { list.innerHTML = ""; return; }

  list.innerHTML = WORKOUTS[muscle].map((e, i) => `
    <div class="exercise" style="animation-delay:${i * 0.07}s">
      <div style="display:flex;align-items:center;gap:12px">
        <span class="ex-num">${i + 1}</span>
        <span>${e.n}</span>
      </div>
      <span class="ex-sets">${e.s}</span>
    </div>`).join("");

  const newWorkouts = state.workouts + 1;
  const entry = {
    muscle,
    exercises: WORKOUTS[muscle].map(e => e.n),
    date: new Date().toLocaleDateString("pt-BR"),
    ts: Date.now(),
  };
  const newHist = [entry, ...state.treinoHist].slice(0, 20);

  api.save({ workouts: newWorkouts, treinoHist: newHist });
  document.getElementById("dashWorkouts").textContent = newWorkouts;
  updateStreak();
  renderTreinoHist(newHist);
  toast(`Treino de ${muscle.charAt(0).toUpperCase() + muscle.slice(1)} gerado! 💪`, "success");
}

function renderTreinoHist(hist) {
  const h   = hist ?? state.treinoHist;
  const container = document.getElementById("treinoHistorico");
  if (!container) return;
  if (!h.length) {
    container.innerHTML = "<p style=\"color:var(--muted);font-size:.85rem\">Nenhum treino ainda.</p>";
    return;
  }
  container.innerHTML = h.slice(0, 6).map(t => `
    <div class="hist-item">
      <strong>${t.muscle.charAt(0).toUpperCase() + t.muscle.slice(1)}</strong>
      <span>${t.date}</span>
    </div>`).join("");
}

/* ════════════════════════════════════════
   DIETA — sugestões locais
════════════════════════════════════════ */
function generateDiet() {
  const btn = document.querySelector("#dieta .btn");
  if (btn) { btn.disabled = true; btn.textContent = "Gerando dieta…"; }

  const preMeals  = ["Banana com aveia e mel","Tapioca com queijo branco","Pão integral com pasta de amendoim","Batata-doce assada"];
  const postMeals = ["Arroz integral + frango grelhado","Whey protein + fruta","Wrap com ovo mexido + legumes","Omelete com queijo e espinafre"];

  document.getElementById("preWorkout").innerHTML  = preMeals.map(e  => `<div class="diet-item">${escHtml(e)}</div>`).join("");
  document.getElementById("postWorkout").innerHTML = postMeals.map(e => `<div class="diet-item">${escHtml(e)}</div>`).join("");
  toast("Dieta gerada com sugestões disponíveis! 🥗", "success");

  state.dietaGerada = true;
  sessionStorage.setItem("dietaGerada", "1");
  document.getElementById("dashDiet").textContent = "✓ OK";
  const s = document.getElementById("statusDieta");
  if (s) s.innerHTML = "<span class=\"status-dot status-dot--on\"></span><span>Dieta gerada</span>";

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Gerar nova dieta`;
  }
}

/* ════════════════════════════════════════
   META
════════════════════════════════════════ */
function setGoal() {
  const val = document.getElementById("goalInput").value.trim();
  if (!val) { toast("Digite uma meta antes de salvar.", "warning"); return; }
  api.save({ goal: val });
  document.getElementById("goalText").textContent = val;
  document.getElementById("goalDisplay").classList.add("show");
  const dashMeta = document.getElementById("dashMeta");
  if (dashMeta) dashMeta.textContent = val.length > 18 ? val.slice(0, 18) + "…" : val;
  toast("Meta salva! 🎯", "success");
}

function updateGoal() {
  const raw = document.getElementById("progressInput").value;
  const val = parseInt(raw);
  if (isNaN(val) || raw === "") { toast("Digite um valor entre 0 e 100.", "warning"); return; }
  syncProgress(val);
  toast(`Progresso atualizado para ${Math.min(100, Math.max(0, val))}%`, "info");
}

/* ════════════════════════════════════════
   PROGRESSO
════════════════════════════════════════ */
function updateProgress() {
  if (state.progress >= 100) {
    showModal("Já está em 100%!", "Você já atingiu a meta. Deseja resetar o progresso para um novo ciclo?",
      [{ label: "Resetar", fn: "resetProgress", danger: true }]);
    return;
  }
  syncProgress(state.progress + 10);
  updateStreak();
  toast(`+10% — você está em ${state.progress}%! 🔥`, "success");
}

function resetProgress() {
  syncProgress(0);
  toast("Progresso resetado. Bora pro próximo ciclo! 💪", "info");
}
window.resetProgress = resetProgress;

/* ════════════════════════════════════════
   ROTINA
════════════════════════════════════════ */
function salvarRotina() {
  const data   = document.getElementById("dataInput").value;
  const treino = document.getElementById("treinoDia").value.trim();
  const dieta  = document.getElementById("dietaDia").value.trim();

  if (!data)              { toast("Escolha uma data!", "warning");                                  return; }
  if (!treino && !dieta) { toast("Preencha treino ou alimentação.", "warning");             return; }

  const newRotinas = [...state.rotinas, { data, treino, dieta }];
  api.save({ rotinas: newRotinas });

  document.getElementById("treinoDia").value = "";
  document.getElementById("dietaDia").value  = "";
  document.getElementById("dataInput").value = "";

  renderRotinas(newRotinas);
  toast("Rotina salva! 📅", "success");
}

function deletarRotina(index) {
  showModal("Excluir rotina", "Tem certeza? Esta ação não pode ser desfeita.",
    [{ label: "Excluir", fn: `_confirmarDeletar(${index})`, danger: true }]);
}
window._confirmarDeletar = function(index) {
  const newRotinas = [...state.rotinas];
  newRotinas.splice(index, 1);
  api.save({ rotinas: newRotinas });
  renderRotinas(newRotinas);
  toast("Rotina excluída.", "info");
};

function renderRotinas(rotinas) {
  const r         = rotinas ?? state.rotinas;
  const container = document.getElementById("historicoRotina");
  if (!container) return;
  if (!r.length) {
    container.innerHTML = "<p style=\"color:var(--muted);font-size:.88rem\">Nenhuma rotina salva ainda.</p>";
    return;
  }
  container.innerHTML = [...r]
    .map((item, i) => ({ item, i }))
    .reverse()
    .map(({ item, i }) => `
      <div class="itemRotina">
        <strong>📅 ${formatDate(item.data)}</strong>
        ${item.treino ? `<p>💪 ${escHtml(item.treino)}</p>` : ""}
        ${item.dieta  ? `<p>🍎 ${escHtml(item.dieta)}</p>`  : ""}
        <div class="rotina-actions">
          <button class="btn btn-sm btn-danger" onclick="deletarRotina(${i})">Excluir</button>
        </div>
      </div>`).join("");
}

/* ════════════════════════════════════════
   PERFIL E CÁLCULO DE IMC
════════════════════════════════════════ */
function salvarPerfil(e) {
  e.preventDefault();
  
  const nome = document.getElementById("perfilNome").value.trim();
  const altura = parseFloat(document.getElementById("perfilAltura").value);
  const peso = parseFloat(document.getElementById("perfilPeso").value);

  if (!nome || isNaN(altura) || isNaN(peso)) {
    toast("Preencha todos os campos corretamente.", "warning");
    return;
  }

  const alturaMetros = altura / 100;
  const imcVal = (peso / (alturaMetros * alturaMetros)).toFixed(1);
  
  let classe = "imc-badge--normal";
  let resultado = "Peso Normal";

  if (imcVal < 18.5) {
    resultado = "Abaixo do Peso";
    classe = "imc-badge--alerta";
  } else if (imcVal >= 25 && imcVal < 30) {
    resultado = "Sobrepeso";
    classe = "imc-badge--alerta";
  } else if (imcVal >= 30) {
    resultado = "Obesidade";
    classe = "imc-badge--perigo";
  }

  const novoPerfil = { nome, altura, peso };
  const novaMedicao = {
    data: new Date().toLocaleDateString("pt-BR"),
    peso: peso + " kg",
    imc: imcVal,
    resultado,
    classe,
    ts: Date.now()
  };

  const novoHist = [novaMedicao, ...state.imcHist].slice(0, 15);

  state.perfil = novoPerfil;
  api.save({ perfil: novoPerfil, imcHist: novoHist });

  renderImcHist(novoHist);
  toast(`Perfil salvo! Seu IMC é ${imcVal} (${resultado}).`, "success");
}

function renderImcHist(hist) {
  const h = hist ?? state.imcHist;
  const container = document.getElementById("historicoImcLista");
  if (!container) return;

  if (!h.length) {
    container.innerHTML = `<tr><td colspan="4" style="color:var(--muted); text-align:center; font-size:.85rem; padding: 20px;">Nenhuma medição cadastrada.</td></tr>`;
    return;
  }

  container.innerHTML = h.map(m => `
    <tr>
      <td>${m.data}</td>
      <td><strong>${m.peso}</strong></td>
      <td>${m.imc}</td>
      <td><span class="imc-badge ${m.classe}">${m.resultado}</span></td>
    </tr>
  `).join("");
}

function limparHistoricoIMC() {
  showModal("Apagar Histórico de IMC", "Deseja realmente deletar todas as suas medições passadas?", [
    {
      label: "Apagar tudo",
      danger: true,
      fn: "_confirmarLimparIMC"
    }
  ]);
}

window._confirmarLimparIMC = function() {
  api.save({ imcHist: [] });
  renderImcHist([]);
  toast("Histórico de medições limpo.", "info");
};

/* ════════════════════════════════════════
   HELPERS
════════════════════════════════════════ */
function formatDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
function escHtml(str) {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

/* ════════════════════════════════════════
   INIT
════════════════════════════════════════ */
window.addEventListener("DOMContentLoaded", async () => {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes slideInToast  { from{opacity:0;transform:translateX(60px)} to{opacity:1;transform:translateX(0)} }
    @keyframes slideOutToast { from{opacity:1;transform:translateX(0)} to{opacity:0;transform:translateX(60px)} }
    @keyframes fadeModalIn   { from{opacity:0} to{opacity:1} }
  `;
  document.head.appendChild(style);

  const dateBadge = document.getElementById("dateBadge");
  if (dateBadge) dateBadge.textContent = new Date().toLocaleDateString("pt-BR", { weekday:"long", day:"numeric", month:"long" });

  await api.loadUser();

  syncProgress(state.progress, false);
  document.getElementById("dashWorkouts").textContent = state.workouts;
  renderStreak();

  if (state.goal) {
    document.getElementById("goalText").textContent = state.goal;
    document.getElementById("goalInput").value      = state.goal;
    document.getElementById("goalDisplay").classList.add("show");
    const dashMeta = document.getElementById("dashMeta");
    if (dashMeta) dashMeta.textContent = state.goal.length > 18 ? state.goal.slice(0, 18) + "…" : state.goal;
  }

  if (state.dietaGerada) {
    document.getElementById("dashDiet").textContent = "✓ OK";
    const s = document.getElementById("statusDieta");
    if (s) s.innerHTML = "<span class=\"status-dot status-dot--on\"></span><span>Dieta gerada</span>";
  }

  if (state.perfil && state.perfil.nome) {
    document.getElementById("perfilNome").value = state.perfil.nome;
    document.getElementById("perfilAltura").value = state.perfil.altura;
    document.getElementById("perfilPeso").value = state.perfil.peso;
  }

  renderTreinoHist();
  renderRotinas();
  renderImcHist();

  document.getElementById("progressInput")?.addEventListener("input", function() {
    const v = parseInt(this.value);
    this.style.borderColor = (isNaN(v) || v < 0 || v > 100) ? "#f44" : "";
  });
});
