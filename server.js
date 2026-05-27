/**
 * HealthUp Pro — Backend v3.0
 * ─────────────────────────────────────────────────────────────
 * Funcionalidades:
 *  - Proxy seguro para a API do Claude (chave nunca vai ao browser)
 *  - Rate limiting por IP (evita abuso da API)
 *  - Cache de respostas da IA (economiza créditos em perguntas repetidas)
 *  - Persistência de dados do usuário em JSON local (treinos, rotinas, progresso)
 *  - Rota de dicas estáticas
 *  - Helmet para segurança de headers HTTP
 *  - Logs coloridos com timestamp
 *  - Graceful shutdown
 *  - Variáveis de ambiente via .env
 * ─────────────────────────────────────────────────────────────
 * Instalar dependências:
 *   npm install express cors helmet express-rate-limit dotenv
 *
 * Criar arquivo .env na mesma pasta:
 *   ANTHROPIC_API_KEY=sk-ant-...
 *   PORT=3000
 *
 * Rodar:
 *   node server.js
 */

"use strict";

// ── Dependências ──────────────────────────────────────────────
require("dotenv").config();
const express    = require("express");
const cors       = require("cors");
const helmet     = require("helmet");
const rateLimit  = require("express-rate-limit");
const https      = require("https");
const path       = require("path");
const fs         = require("fs");

// ── Configuração ──────────────────────────────────────────────
const PORT    = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY || "";
const DB_PATH = path.join(__dirname, "db.json");

if (!API_KEY) {
  log("AVISO", "ANTHROPIC_API_KEY não definida. Crie um arquivo .env com a chave.", "yellow");
}

// ── Logger colorido ───────────────────────────────────────────
const COLORS = { reset:"\x1b[0m", green:"\x1b[32m", yellow:"\x1b[33m", red:"\x1b[31m", cyan:"\x1b[36m", gray:"\x1b[90m" };
function log(level, msg, color = "reset") {
  const ts = new Date().toLocaleTimeString("pt-BR");
  console.log(`${COLORS.gray}[${ts}]${COLORS.reset} ${COLORS[color]}[${level}]${COLORS.reset} ${msg}`);
}

// ── Banco de dados local (JSON) ───────────────────────────────
function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  } catch { /* arquivo corrompido — recria */ }
  return { users: {}, dicas: null };
}

function saveDB(db) {
  try { fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); }
  catch (e) { log("ERRO", "Falha ao salvar db.json: " + e.message, "red"); }
}

let db = loadDB();

// Helpers de usuário (identifica pelo IP como chave, adequado para uso local)
function getUser(ip) {
  if (!db.users[ip]) {
    db.users[ip] = { progress: 0, workouts: 0, streak: 0, lastWorkout: "", goal: "", rotinas: [], treinoHist: [] };
  }
  return db.users[ip];
}
function saveUser(ip, data) {
  db.users[ip] = data;
  saveDB(db);
}

// ── Cache de IA (chave = hash simples da mensagem) ─────────────
const aiCache = new Map();
function cacheKey(messages) {
  return messages.map(m => m.role + m.content).join("|").slice(0, 200);
}

// ── App Express ───────────────────────────────────────────────
const app = express();

// Segurança de headers (desabilita CSP pois temos SVG inline)
app.use(helmet({ contentSecurityPolicy: false }));

// CORS — permite apenas origem local em produção
app.use(cors({ origin: [`http://localhost:${PORT}`, "http://127.0.0.1:" + PORT] }));

app.use(express.json({ limit: "64kb" }));

// Log de cada requisição
app.use((req, _res, next) => {
  log("REQ", `${req.method} ${req.path}`, "cyan");
  next();
});

// ── Arquivos estáticos ────────────────────────────────────────
app.use(express.static(path.join(__dirname, "..", "frontend"), {
  etag: true,
  maxAge: "1h",
}));

// ── Rate limiting ─────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minuto
  max: 20,                    // máx 20 req/min por IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    log("AVISO", "Rate limit atingido", "yellow");
    res.status(429).json({ error: "Muitas requisições. Aguarde um momento." });
  },
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 8,                     // máx 8 mensagens/min para a IA
  handler: (_req, res) => {
    res.status(429).json({ error: "Limite de mensagens atingido. Aguarde 1 minuto." });
  },
});

// ════════════════════════════════════════════════════════════════
// ROTAS DE DADOS DO USUÁRIO
// ════════════════════════════════════════════════════════════════

// GET /api/user — carrega estado do usuário
app.get("/api/user", apiLimiter, (req, res) => {
  const user = getUser(req.ip);
  res.json(user);
});

// PATCH /api/user — salva estado parcial do usuário
app.patch("/api/user", apiLimiter, (req, res) => {
  const allowed = ["progress","workouts","streak","lastWorkout","goal","rotinas","treinoHist"];
  const user    = getUser(req.ip);
  let changed   = false;

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      user[key] = req.body[key];
      changed   = true;
    }
  }

  if (!changed) return res.status(400).json({ error: "Nenhum campo válido enviado." });

  // Validação de tipos básicos
  if (typeof user.progress !== "number" || user.progress < 0 || user.progress > 100)
    return res.status(400).json({ error: "progress deve ser número entre 0 e 100." });

  saveUser(req.ip, user);
  log("DB", `Usuário ${req.ip} atualizado`, "green");
  res.json({ ok: true, user });
});

// ════════════════════════════════════════════════════════════════
// PROXY DA API DO CLAUDE
// ════════════════════════════════════════════════════════════════
app.post("/api/chat", chatLimiter, (req, res) => {
  if (!API_KEY) {
    return res.status(503).json({ error: "Chave da API não configurada. Adicione ANTHROPIC_API_KEY no arquivo .env" });
  }

  const { model, max_tokens, system, messages } = req.body;

  // Validação mínima
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Campo 'messages' inválido." });
  }

  // Cache — evita chamar a API duas vezes para a mesma pergunta
  const key = cacheKey(messages);
  if (aiCache.has(key)) {
    log("CACHE", "Resposta servida do cache", "green");
    return res.json(aiCache.get(key));
  }

  const payload = JSON.stringify({
    model:      model      || "claude-sonnet-4-20250514",
    max_tokens: max_tokens || 1000,
    system:     system     || "",
    messages,
  });

  const options = {
    hostname: "api.anthropic.com",
    path:     "/v1/messages",
    method:   "POST",
    headers: {
      "Content-Type":        "application/json",
      "Content-Length":      Buffer.byteLength(payload),
      "x-api-key":           API_KEY,
      "anthropic-version":   "2023-06-01",
    },
    timeout: 30000,
  };

  const proxyReq = https.request(options, proxyRes => {
    let raw = "";
    proxyRes.on("data", chunk => raw += chunk);
    proxyRes.on("end", () => {
      try {
        let parsed = JSON.parse(raw);

        // Se a IA retornou erro, normalize a mensagem para o frontend.
        if (proxyRes.statusCode !== 200 && parsed?.error?.message) {
          parsed = { error: parsed.error.message, details: parsed };
        }

        // Salva no cache só respostas 200
        if (proxyRes.statusCode === 200) {
          aiCache.set(key, parsed);
          if (aiCache.size > 100) {
            // LRU simples — remove a entrada mais antiga
            aiCache.delete(aiCache.keys().next().value);
          }
        }

        log("AI", `Status ${proxyRes.statusCode}`, proxyRes.statusCode === 200 ? "green" : "yellow");
        res.status(proxyRes.statusCode).json(parsed);
      } catch {
        log("ERRO", "Resposta da API não é JSON válido", "red");
        res.status(502).json({ error: "Resposta inválida da API." });
      }
    });
  });

  proxyReq.on("timeout", () => {
    proxyReq.destroy();
    log("ERRO", "Timeout na chamada à API do Claude", "red");
    res.status(504).json({ error: "A IA demorou demais para responder. Tente novamente." });
  });

  proxyReq.on("error", err => {
    log("ERRO", "Falha na chamada à API: " + err.message, "red");
    res.status(502).json({ error: "Não foi possível conectar à API do Claude." });
  });

  proxyReq.write(payload);
  proxyReq.end();
});

// ════════════════════════════════════════════════════════════════
// ROTA DE DICAS (original, mantida e melhorada)
// ════════════════════════════════════════════════════════════════
app.get("/dicas", apiLimiter, (_req, res) => {
  res.json({
    alimentacao: [
      "Beba pelo menos 2L de água por dia",
      "Priorize proteínas em todas as refeições",
      "Evite ultraprocessados e refrigerantes",
      "Coma frutas e vegetais diariamente",
      "Faça refeições a cada 3-4 horas",
    ],
    exercicios: [
      "10 flexões ao acordar",
      "20 abdominais antes de dormir",
      "15 agachamentos a cada hora sentado",
      "30 min de caminhada por dia",
    ],
    recuperacao: [
      "Durma 7-9 horas por noite",
      "Faça alongamento após treinar",
      "Hidrate-se durante e após o exercício",
    ],
  });
});

// ════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ════════════════════════════════════════════════════════════════
app.get("/health", (_req, res) => {
  res.json({
    status:   "ok",
    uptime:   process.uptime().toFixed(1) + "s",
    apiKey:   API_KEY ? "configurada ✓" : "AUSENTE ✗",
    cacheSize: aiCache.size,
    users:    Object.keys(db.users).length,
    ts:       new Date().toISOString(),
  });
});

// ── 404 para rotas não encontradas ───────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Rota não encontrada." }));

// ── Erros globais ─────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  log("ERRO", err.message, "red");
  res.status(500).json({ error: "Erro interno do servidor." });
});

// ════════════════════════════════════════════════════════════════
// INICIALIZAÇÃO + GRACEFUL SHUTDOWN
// ════════════════════════════════════════════════════════════════
const server = app.listen(PORT, () => {
  console.log("");
  console.log(`${COLORS.cyan}  ██╗  ██╗███████╗ █████╗ ██╗  ████████╗██╗  ██╗██╗   ██╗██████╗ ${COLORS.reset}`);
  console.log(`${COLORS.cyan}  ██║  ██║██╔════╝██╔══██╗██║  ╚══██╔══╝██║  ██║██║   ██║██╔══██╗${COLORS.reset}`);
  console.log(`${COLORS.cyan}  ███████║█████╗  ███████║██║     ██║   ███████║██║   ██║██████╔╝${COLORS.reset}`);
  console.log(`${COLORS.cyan}  ██╔══██║██╔══╝  ██╔══██║██║     ██║   ██╔══██║██║   ██║██╔═══╝ ${COLORS.reset}`);
  console.log(`${COLORS.cyan}  ██║  ██║███████╗██║  ██║███████╗██║   ██║  ██║╚██████╔╝██║     ${COLORS.reset}`);
  console.log(`${COLORS.cyan}  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ${COLORS.reset}`);
  console.log("");
  log("OK",    `Servidor rodando em http://localhost:${PORT}`, "green");
  log("OK",    `Health check:       http://localhost:${PORT}/health`, "green");
  log("INFO",  `API Key: ${API_KEY ? "configurada ✓" : "AUSENTE — adicione no .env ✗"}`, API_KEY ? "green" : "red");
  console.log("");
});

function shutdown(signal) {
  log("INFO", `${signal} recebido. Encerrando...`, "yellow");
  saveDB(db);
  server.close(() => {
    log("OK", "Servidor encerrado com sucesso.", "green");
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000);
}

process.on("SIGINT",  () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("uncaughtException", err => { log("ERRO", "Exceção não tratada: " + err.message, "red"); });
