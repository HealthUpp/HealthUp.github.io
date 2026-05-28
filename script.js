/* ══════════════════════════════════════════
   ESTADO GLOBAL DA APLICAÇÃO (LOCALSTORAGE)
══════════════════════════════════════════ */
let appState = {
  workoutsCount: 0,
  streak: 0,
  progress: 0,
  currentGoal: "",
  dietGenerated: false,
  routines: [],
  imcHistory: [],
  profile: { name: "", height: "", weight: "" },
  lastWorkoutDate: null
};

if (localStorage.getItem("healthup_data")) {
  appState = JSON.parse(localStorage.getItem("healthup_data"));
}

/* ══════════════════════════════════════════
   INICIALIZAÇÃO & NAVEGAÇÃO
══════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  updateDateBadge();
  renderDashboard();
  loadProfileData();
  renderIMCHistory();
  renderRoutineList();
  injetaEstilosAnimacao();
});

function navigate(pageId, buttonElement) {
  document.querySelectorAll(".page").forEach(page => page.classList.remove("show"));
  document.querySelectorAll(".nav").forEach(btn => btn.classList.remove("active"));
  
  const targetPage = document.getElementById(pageId);
  if (targetPage) targetPage.classList.add("show");
  
  if (buttonElement) {
    buttonElement.classList.add("active");
  } else {
    document.querySelectorAll(".nav").forEach(btn => {
      if (btn.getAttribute("onclick") && btn.getAttribute("onclick").includes(`'${pageId}'`)) {
        btn.classList.add("active");
      }
    });
  }
}

function updateDateBadge() {
  const badge = document.getElementById("dateBadge");
  if (badge) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    badge.textContent = new Date().toLocaleDateString('pt-BR', options);
  }
}

function saveState() {
  localStorage.setItem("healthup_data", JSON.stringify(appState));
  renderDashboard();
}

/* ══════════════════════════════════════════
   DASHBOARD MANAGEMENT
══════════════════════════════════════════ */
function renderDashboard() {
  if (document.getElementById("dashWorkouts")) document.getElementById("dashWorkouts").textContent = appState.workoutsCount;
  if (document.getElementById("dashStreak")) document.getElementById("dashStreak").textContent = `${appState.streak} dias`;
  if (document.getElementById("dashProg")) document.getElementById("dashProg").textContent = `${appState.progress}%`;
  if (document.getElementById("dashProgLabel")) document.getElementById("dashProgLabel").textContent = `${appState.progress}%`;
  if (document.getElementById("dashMeta")) document.getElementById("dashMeta").textContent = appState.currentGoal || "Nenhuma meta definida";

  const pBar = document.getElementById("dashProgressBar");
  if (pBar) pBar.style.width = `${appState.progress}%`;
  const bFill = document.getElementById("barFill");
  if (bFill) bFill.style.width = `${appState.progress}%`;
  const pFill = document.getElementById("progressFill");
  if (pFill) pFill.style.width = `${appState.progress}%`;

  if (document.getElementById("barLabel")) document.getElementById("barLabel").textContent = `${appState.progress}%`;
  if (document.getElementById("progressText")) document.getElementById("progressText").textContent = `${appState.progress}%`;
  if (document.getElementById("streakDisplay")) document.getElementById("streakDisplay").textContent = `${appState.streak} dias`;

  const dashDiet = document.getElementById("dashDiet");
  const statusDieta = document.getElementById("statusDieta");
  if (dashDiet && statusDieta) {
    if (appState.dietGenerated) {
      dashDiet.textContent = "Ativa";
      statusDieta.innerHTML = `<span class="status-dot status-dot--on"></span><span>Dieta estruturada</span>`;
    } else {
      dashDiet.textContent = "—";
      statusDieta.innerHTML = `<span class="status-dot status-dot--off"></span><span>Dieta não gerada</span>`;
    }
  }

  renderDashboardHistory();
}

function renderDashboardHistory() {
  const container = document.getElementById("treinoHistorico");
  if (!container) return;

  if (!appState.routines || appState.routines.length === 0) {
    container.innerHTML = `<p style="color:var(--muted);font-size:.85rem">Nenhum treino ainda.</p>`;
    return;
  }

  const filtered = appState.routines
    .filter(r => r.workout && r.workout.trim() !== "")
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 3);

  if (filtered.length === 0) {
    container.innerHTML = `<p style="color:var(--muted);font-size:.85rem">Nenhum treino listado na rotina.</p>`;
    return;
  }

  container.innerHTML = filtered.map(item => {
    const formattedDate = new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    return `
      <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:4px;">
        <strong>${item.workout.split('\n')[0]}</strong>
        <span style="color:var(--muted)">${formattedDate}</span>
      </div>
    `;
  }).join('');
}

/* ══════════════════════════════════════════
   ÍCONES VETORIAIS (SVG) REUTILIZÁVEIS
══════════════════════════════════════════ */
const iconesSVG = {
  haltere: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="10" width="3" height="4" rx="1"/>
    <rect x="19" y="10" width="3" height="4" rx="1"/>
    <rect x="5" y="8" width="3" height="8" rx="1"/>
    <rect x="16" y="8" width="3" height="8" rx="1"/>
    <line x1="8" y1="12" x2="16" y2="12"/>
  </svg>`,

  corrida: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="14" cy="4" r="1.5"/>
    <path d="M10 8l2 2 2-2 1 4-3 1v4"/>
    <path d="M9 13l-2 4"/>
    <path d="M14 13l2 4"/>
    <path d="M8 10l-2 1"/>
  </svg>`,

  cronometro: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="13" r="8"/>
    <path d="M12 9v4l3 2"/>
    <path d="M10 3h4"/>
    <path d="M12 3v2"/>
    <path d="M19 6l-1.5 1.5"/>
  </svg>`,

  estrela: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2l2.9 6.1L22 9.3l-5 4.9 1.2 6.8L12 17.7l-6.2 3.3L7 14.2 2 9.3l7.1-1.2z"/>
  </svg>`,

  coracao: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.6z"/>
  </svg>`
};

/* ══════════════════════════════════════════
   BANCO DE DADOS (5 EXERCÍCIOS)
══════════════════════════════════════════ */
const dbExercicios = {
  peito: [
    { nome: "Supino Reto com Barra",        series: "4x10",  icone: iconesSVG.haltere },
    { nome: "Supino Inclinado com Halteres", series: "3x12",  icone: iconesSVG.corrida },
    { nome: "Crucifixo Reto em Banco",       series: "4x12",  icone: iconesSVG.cronometro },
    { nome: "Crossover na Polia Alta",       series: "3x15",  icone: iconesSVG.estrela },
    { nome: "Flexão de Braço Solo",          series: "3xMax", icone: iconesSVG.coracao }
  ],
  costas: [
    { nome: "Puxada Aberta no Pulley",   series: "4x10", icone: iconesSVG.haltere },
    { nome: "Remada Curvada com Barra",  series: "3x12", icone: iconesSVG.corrida },
    { nome: "Remada Baixa Triângulo",    series: "4x10", icone: iconesSVG.cronometro },
    { nome: "Pull-Down com Corda",       series: "3x15", icone: iconesSVG.estrela },
    { nome: "Levantamento Terra",        series: "3x8",  icone: iconesSVG.coracao }
  ],
  perna: [
    { nome: "Agachamento Livre com Barra",    series: "4x10", icone: iconesSVG.haltere },
    { nome: "Leg Press 45 Graus",             series: "4x12", icone: iconesSVG.corrida },
    { nome: "Cadeira Extensora",              series: "3x15", icone: iconesSVG.cronometro },
    { nome: "Mesa Flexora Deitada",           series: "4x12", icone: iconesSVG.estrela },
    { nome: "Gêmeos em Pé (Panturrilha)",     series: "4x20", icone: iconesSVG.coracao }
  ],
  biceps: [
    { nome: "Rosca Direta na Barra W",      series: "4x10", icone: iconesSVG.haltere },
    { nome: "Rosca Alternada com Halter",   series: "3x12", icone: iconesSVG.corrida },
    { nome: "Rosca Martelo na Corda",       series: "4x12", icone: iconesSVG.cronometro },
    { nome: "Rosca Concentrada",            series: "3x10", icone: iconesSVG.estrela },
    { nome: "Rosca Inversa (Antebraço)",    series: "3x12", icone: iconesSVG.coracao }
  ],
  triceps: [
    { nome: "Tríceps Pulley com Corda",      series: "4x12", icone: iconesSVG.cronometro },
    { nome: "Tríceps Testa com Barra",       series: "3x10", icone: iconesSVG.haltere },
    { nome: "Tríceps Coice na Polia",        series: "3x12", icone: iconesSVG.corrida },
    { nome: "Mergulho nos Bancos",           series: "4x10", icone: iconesSVG.coracao },
    { nome: "Tríceps Francês Unilateral",    series: "3x12", icone: iconesSVG.estrela }
  ],
  ombro: [
    { nome: "Desenvolvimento com Halteres",  series: "4x10", icone: iconesSVG.haltere },
    { nome: "Elevação Lateral Sentado",      series: "4x12", icone: iconesSVG.corrida },
    { nome: "Crucifixo Invertido Máquina",   series: "3x15", icone: iconesSVG.cronometro },
    { nome: "Elevação Frontal com Anilha",   series: "3x12", icone: iconesSVG.estrela },
    { nome: "Encolhimento (Trapézio)",       series: "4x15", icone: iconesSVG.coracao }
  ],
  abdomen: [
    { nome: "Abdominal Supra Solo",          series: "4x20",   icone: iconesSVG.coracao },
    { nome: "Abdominal Infra na Prancha",    series: "3x15",   icone: iconesSVG.corrida },
    { nome: "Prancha Isométrica",            series: "3x 1min",icone: iconesSVG.cronometro },
    { nome: "Abdominal Bicicleta",           series: "3x20",   icone: iconesSVG.estrela },
    { nome: "Toque no Calcanhar",            series: "4x15",   icone: iconesSVG.haltere }
  ]
};

/* ══════════════════════════════════════════
   SISTEMA DE MODAL COM ANIMAÇÃO DE ENTRADA
══════════════════════════════════════════ */
function openMuscleModal(muscleKey) {
  const modal = document.getElementById("customWorkoutModal");
  const modalTitle = document.getElementById("customModalTitle");
  const modalBody = document.getElementById("customModalBody");

  if (!modal || !modalBody) return;

  const nomeMusculo = muscleKey.charAt(0).toUpperCase() + muscleKey.slice(1);
  modalTitle.textContent = `Treino de ${nomeMusculo}`;

  const lista = dbExercicios[muscleKey] || [];

  if (lista.length === 0) {
    modalBody.innerHTML = `<p style="color:var(--muted)">Nenhum exercício cadastrado.</p>`;
  } else {
    modalBody.innerHTML = lista.map((ex, index) => `
      <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.03); padding:12px; border-radius:8px; margin-bottom:8px; border:1px solid rgba(255,255,255,0.05); animation: customItemFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: ${index * 0.05}s; opacity: 0; transform: translateY(12px);">
        <div style="display:flex; align-items:center; gap:12px; color:#fff;">
          <span style="color:var(--blue); display:flex; align-items:center; justify-content:center; opacity:0.9;">
            ${ex.icone}
          </span>
          <span style="font-weight:500; font-size:0.9rem;">${ex.nome}</span>
        </div>
        <span style="font-size:0.8rem; color:var(--blue); font-weight:bold; background:rgba(0,122,255,0.1); padding:4px 8px; border-radius:4px; border:1px solid rgba(0,122,255,0.15)">${ex.series}</span>
      </div>
    `).join('');
  }

  modal.classList.remove("modal-hide");
  modal.style.display = "flex";

  const modalBox = modal.querySelector(".custom-modal-content");
  if (modalBox) {
    modalBox.style.animation = "customModalScaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards";
  }
}

function closeMuscleModal() {
  const modal = document.getElementById("customWorkoutModal");
  const modalBox = modal ? modal.querySelector(".custom-modal-content") : null;

  if (!modal || !modalBox) return;

  modalBox.style.animation = "customModalScaleOut 0.2s ease-in forwards";
  modal.classList.add("modal-hide");

  setTimeout(() => { modal.style.display = "none"; }, 200);
}

/* ══════════════════════════════════════════
   GERADOR DE DIETAS COM ANIMAÇÃO
══════════════════════════════════════════ */
function generateDiet() {
  const targetPre = document.getElementById("preWorkout");
  const targetPost = document.getElementById("postWorkout");

  if (!targetPre || !targetPost) return;

  const isDeficit = appState.currentGoal.toLowerCase().includes("perder") ||
                    appState.currentGoal.toLowerCase().includes("emagrecer") ||
                    appState.currentGoal.toLowerCase().includes("secar");

  if (isDeficit) {
    targetPre.innerHTML = `
      <div class="diet-item-animated" style="animation-delay:0s;">• Café preto sem açúcar + 2 ovos mexidos</div>
      <div class="diet-item-animated" style="animation-delay:0.08s;">• 100g de morango ou maçã com 15g de aveia</div>
    `;
    targetPost.innerHTML = `
      <div class="diet-item-animated" style="animation-delay:0.16s;">• 150g de peito de frango grelhado</div>
      <div class="diet-item-animated" style="animation-delay:0.24s;">• 120g de arroz integral ou batata doce</div>
    `;
  } else {
    targetPre.innerHTML = `
      <div class="diet-item-animated" style="animation-delay:0s;">• Vitamina: 250ml de leite, 1 banana, 30g de aveia</div>
      <div class="diet-item-animated" style="animation-delay:0.08s;">• 2 fatias de pão integral com creme de amendoim</div>
      <div class="diet-item-animated" style="animation-delay:0.16s;">• 1 iogurte grego com mel e granola</div>
      <div class="diet-item-animated" style="animation-delay:0.24s;">• Banana com aveia e mel</div>
    `;
    targetPost.innerHTML = `
      <div class="diet-item-animated" style="animation-delay:0.16s;">• Iogurte natural com granola</div>
      <div class="diet-item-animated" style="animation-delay:0.24s;">• 250g de arroz branco cozido + legumes</div>
      <div class="diet-item-animated" style="animation-delay:0.32s;">• 250g de arroz branco com carne/frango</div>
      <div class="diet-item-animated" style="animation-delay:0.4s;">• Whey protein, banana e aveia</div>
    `;
  }

  appState.dietGenerated = true;
  saveState();
}

/* ══════════════════════════════════════════
   INJEÇÃO DINÂMICA DE ANIMAÇÕES CSS
══════════════════════════════════════════ */
function injetaEstilosAnimacao() {
  if (document.getElementById("appGlobalAnimations")) return;

  const styleBlock = document.createElement("style");
  styleBlock.id = "appGlobalAnimations";
  styleBlock.innerHTML = `
    .custom-modal-overlay {
      backdrop-filter: blur(0px);
      transition: backdrop-filter 0.3s ease, background-color 0.3s ease;
      background-color: rgba(0,0,0,0);
    }
    .custom-modal-overlay[style*="display: flex"] {
      backdrop-filter: blur(8px);
      background-color: rgba(0,0,0,0.55);
    }
    .custom-modal-overlay.modal-hide {
      backdrop-filter: blur(0px) !important;
      background-color: rgba(0,0,0,0) !important;
    }
    @keyframes customModalScaleIn {
      from { opacity:0; transform:scale(0.92); }
      to   { opacity:1; transform:scale(1); }
    }
    @keyframes customModalScaleOut {
      from { opacity:1; transform:scale(1); }
      to   { opacity:0; transform:scale(0.95); }
    }
    @keyframes customItemFadeIn {
      from { opacity:0; transform:translateY(12px); }
      to   { opacity:1; transform:translateY(0); }
    }
    .diet-item-animated {
      margin-bottom:6px; padding:8px 10px;
      background:rgba(255,255,255,0.03);
      border-radius:6px; border:1px solid rgba(255,255,255,0.04);
      font-size:0.9rem; color:#fff;
      opacity:0; transform:translateY(10px);
      animation: dietSlideUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards;
    }
    @keyframes dietSlideUp {
      from { opacity:0; transform:translateY(10px); }
      to   { opacity:1; transform:translateY(0); }
    }
  `;
  document.head.appendChild(styleBlock);
}

/* ══════════════════════════════════════════
   METAS & PROGRESSO
══════════════════════════════════════════ */
function setGoal() {
  const input = document.getElementById("goalInput");
  const display = document.getElementById("goalDisplay");
  const textNode = document.getElementById("goalText");

  if (!input || !input.value.trim()) return;

  appState.currentGoal = input.value.trim();
  if (textNode) textNode.textContent = appState.currentGoal;
  if (display) display.classList.add("show");
  input.value = "";

  saveState();
}

function updateGoal() {
  const input = document.getElementById("progressInput");
  if (!input) return;

  let val = parseInt(input.value, 10);
  if (isNaN(val)) return;
  if (val < 0) val = 0;
  if (val > 100) val = 100;

  appState.progress = val;
  input.value = "";
  saveState();
}

function updateProgress() {
  let currentProg = appState.progress + 10;
  if (currentProg > 100) currentProg = 100;
  appState.progress = currentProg;
  appState.workoutsCount += 1;

  const hojeStr = new Date().toISOString().split('T')[0];

  if (appState.lastWorkoutDate) {
    const diffDays = Math.ceil(
      Math.abs(new Date(hojeStr) - new Date(appState.lastWorkoutDate)) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 1) appState.streak += 1;
    else if (diffDays > 1) appState.streak = 1;
  } else {
    appState.streak = 1;
  }

  appState.lastWorkoutDate = hojeStr;
  saveState();
}

function resetProgress() {
  if (confirm("Deseja redefinir todo o progresso acumulado e sequência de dias?")) {
    appState.progress = 0;
    appState.streak = 0;
    appState.workoutsCount = 0;
    appState.lastWorkoutDate = null;
    saveState();
  }
}

/* ══════════════════════════════════════════
   ROTINA SEMANAL
══════════════════════════════════════════ */
function salvarRotina() {
  const dataInput = document.getElementById("dataInput").value;
  const treinoDia = document.getElementById("treinoDia").value.trim();
  const dietaDia = document.getElementById("dietaDia").value.trim();

  if (!dataInput) {
    alert("Selecione uma data para o registro.");
    return;
  }

  const novaRotina = { date: dataInput, workout: treinoDia, diet: dietaDia };
  const existingIdx = appState.routines.findIndex(r => r.date === dataInput);

  if (existingIdx > -1) appState.routines[existingIdx] = novaRotina;
  else appState.routines.push(novaRotina);

  document.getElementById("dataInput").value = "";
  document.getElementById("treinoDia").value = "";
  document.getElementById("dietaDia").value = "";

  saveState();
  renderRoutineList();
}

function excluirRotina(index) {
  appState.routines.splice(index, 1);
  saveState();
  renderRoutineList();
}

function renderRoutineList() {
  const listElement = document.getElementById("historicoRotina");
  if (!listElement) return;

  if (!appState.routines || appState.routines.length === 0) {
    listElement.innerHTML = `<p style="color:var(--muted);font-size:.9rem">Nenhuma rotina salva ainda.</p>`;
    return;
  }

  const ordenadas = [...appState.routines].sort((a, b) => new Date(b.date) - new Date(a.date));

  listElement.innerHTML = ordenadas.map((item, idx) => {
    const formattedDate = new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR');
    return `
      <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border); padding:12px; border-radius:8px; margin-bottom:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <strong style="color:var(--blue)">${formattedDate}</strong>
          <button onclick="excluirRotina(${idx})" style="background:none; border:none; color:var(--red); cursor:pointer; font-size:0.8rem;">Excluir</button>
        </div>
        <p style="margin:4px 0; font-size:0.9rem;"><strong>Treino:</strong> ${item.workout || 'Nenhum'}</p>
        <p style="margin:4px 0; font-size:0.9rem;"><strong>Alimentação:</strong> ${item.diet || 'Nenhuma'}</p>
      </div>
    `;
  }).join('');
}

/* ══════════════════════════════════════════
   PERFIL & CÁLCULO DE IMC
══════════════════════════════════════════ */
function loadProfileData() {
  if (appState.profile) {
    if (document.getElementById("perfilNome")) document.getElementById("perfilNome").value = appState.profile.name || "";
    if (document.getElementById("perfilAltura")) document.getElementById("perfilAltura").value = appState.profile.height || "";
    if (document.getElementById("perfilPeso")) document.getElementById("perfilPeso").value = appState.profile.weight || "";
    if (appState.profile.currentGoal) appState.currentGoal = appState.profile.currentGoal;
  }
}

function salvarPerfil(event) {
  event.preventDefault();

  const nome = document.getElementById("perfilNome").value;
  const altura = parseFloat(document.getElementById("perfilAltura").value);
  const peso = parseFloat(document.getElementById("perfilPeso").value);

  if (!nome || !altura || !peso) return;

  appState.profile = { name: nome, height: altura, weight: peso };

  const alturaMetros = altura / 100;
  const imc = (peso / (alturaMetros * alturaMetros)).toFixed(1);

  let resultado = "";
  if (imc < 18.5) resultado = "Abaixo do peso";
  else if (imc < 25) resultado = "Peso normal";
  else if (imc < 30) resultado = "Sobrepeso";
  else resultado = "Obesidade";

  if (!appState.imcHistory) appState.imcHistory = [];
  appState.imcHistory.unshift({
    date: new Date().toLocaleDateString('pt-BR'),
    weight: peso,
    imc: imc,
    result: resultado
  });

  saveState();
  renderIMCHistory();
  alert("Perfil atualizado com sucesso!");
}

function renderIMCHistory() {
  const tabela = document.getElementById("historicoImcLista");
  if (!tabela) return;

  if (!appState.imcHistory || appState.imcHistory.length === 0) {
    tabela.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--muted); padding:10px;">Nenhuma medição registrada.</td></tr>`;
    return;
  }

  tabela.innerHTML = appState.imcHistory.map(item => `
    <tr>
      <td>${item.date}</td>
      <td>${item.weight} kg</td>
      <td>${item.imc}</td>
      <td><span style="color:${item.result === 'Peso normal' ? 'var(--green)' : 'var(--orange)'}">${item.result}</span></td>
    </tr>
  `).join('');
}

function limparHistoricoIMC() {
  if (confirm("Tem certeza que deseja apagar todo o histórico de IMC?")) {
    appState.imcHistory = [];
    saveState();
    renderIMCHistory();
  }
}
