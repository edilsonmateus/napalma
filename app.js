const STORAGE_KEY = "palmaDaMao:v2";

const genres = [
  "Samba",
  "Forro",
  "Coco",
  "Zouk",
  "Jazz",
  "Black",
  "Charm",
  "Funk",
  "Rock",
  "Rap",
  "Pagode",
  "Sertanejo",
  "Choro",
  "Maracatu",
  "MPB",
  "Reggae",
  "DJ",
  "Eletronica",
];

const regions = [
  "Todos",
  "Centro",
  "Zona Sul",
  "Zona Norte",
  "Zona Leste",
  "Zona Oeste",
  "Grande Sao Paulo",
];

const seedVenues = [
  {
    id: "venue-1",
    role: "venue",
    name: "Aparelha Luzia",
    email: "contato@aparelhaluzia.com",
    password: "aurora123",
    phone: "(11) 3333-1100",
    neighborhood: "Santa Cecilia",
    region: "Centro",
    city: "Sao Paulo",
    address: "Rua Apa, 123 - Santa Cecilia, Sao Paulo - SP",
    description:
      "Quilombo urbano com programacao de shows, encontros afro-diasporicos e noites de pista.",
    banner:
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1400&q=80",
    active: true,
  },
  {
    id: "venue-2",
    role: "venue",
    name: "Casa de Francisca",
    email: "agenda@casadefrancisca.com",
    password: "terreiro123",
    phone: "(11) 3777-2200",
    neighborhood: "Centro",
    region: "Centro",
    city: "Sao Paulo",
    address: "Largo Sao Francisco, 42 - Centro, Sao Paulo - SP",
    description:
      "Sala musical no centro historico com palco intimista e curadoria focada em encontros musicais brasileiros.",
    banner:
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1400&q=80",
    active: true,
  },
  {
    id: "venue-3",
    role: "venue",
    name: "Blue Note Sao Paulo",
    email: "producao@bluenote.com",
    password: "sintonia123",
    phone: "(11) 3666-4400",
    neighborhood: "Moema",
    region: "Zona Sul",
    city: "Sao Paulo",
    address: "Avenida Pavao, 955 - Moema, Sao Paulo - SP",
    description:
      "Casa elegante para jazz, MPB e encontros de improviso com vista para a noite paulistana.",
    banner:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1400&q=80",
    active: true,
  },
  {
    id: "venue-4",
    role: "venue",
    name: "Galpao Sintonia",
    email: "contato@galpaosintonia.com",
    password: "galpao123",
    phone: "(11) 4555-1900",
    neighborhood: "Barra Funda",
    region: "Zona Oeste",
    city: "Sao Paulo",
    address: "Avenida Marques de Sao Vicente, 1198 - Barra Funda, Sao Paulo - SP",
    description:
      "Espaco amplo para rap, rock, musica eletronica e festivais multiculturais.",
    banner:
      "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1400&q=80",
    active: true,
  },
  {
    id: "venue-5",
    role: "venue",
    name: "CTN",
    email: "contato@ctnsp.com",
    password: "ctn12345",
    phone: "(11) 4888-7600",
    neighborhood: "Limao",
    region: "Zona Norte",
    city: "Sao Paulo",
    address: "Rua Jacofe, 615 - Limao, Sao Paulo - SP",
    description:
      "Centro de tradicoes com forro, festas nordestinas e grandes encontros populares.",
    banner:
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1400&q=80",
    active: true,
  },
  {
    id: "venue-6",
    role: "venue",
    name: "Caster Club",
    email: "contato@casterclub.com",
    password: "caster123",
    phone: "(11) 4999-7788",
    neighborhood: "Vila Formosa",
    region: "Zona Leste",
    city: "Sao Paulo",
    address: "Avenida Joao XXIII, 2400 - Vila Formosa, Sao Paulo - SP",
    description:
      "Noites de pista, funk, charme e festas que vao ate o amanhecer na Zona Leste.",
    banner:
      "https://images.unsplash.com/photo-1566737236500-c8ac43014a8e?auto=format&fit=crop&w=1400&q=80",
    active: true,
  },
  {
    id: "venue-7",
    role: "venue",
    name: "Hit's Show",
    email: "agenda@hitsshow.com",
    password: "hits12345",
    phone: "(11) 4332-0012",
    neighborhood: "Vila Osasco",
    region: "Grande Sao Paulo",
    city: "Osasco",
    address: "Rua Jose Gimenes Gomes, 65 - Osasco - SP",
    description:
      "Casa metropolitana para sertanejo, pagode e shows de grande porte.",
    banner:
      "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=1400&q=80",
    active: true,
  },
];

const seedEvents = [
  {
    id: "event-1",
    venueId: "venue-1",
    title: "BaianaSystem",
    artist: "BaianaSystem",
    genres: ["Samba", "Reggae", "Eletronica"],
    price: "R$ 60",
    startsAt: "2026-05-22T20:00",
    endsAt: "2026-05-22T23:00",
    description:
      "Energia baiana, groove pesado e guitarrada em uma noite para cantar e dancar sem pausa.",
    banner:
      "https://images.unsplash.com/photo-1501612780327-45045538702b?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "event-2",
    venueId: "venue-2",
    title: "Samba de Roda e Pagode",
    artist: "Helena Prado Quarteto",
    genres: ["Samba", "Pagode", "MPB"],
    price: "R$ 48",
    startsAt: "2026-05-24T21:00",
    endsAt: "2026-05-24T23:30",
    description:
      "Roda com convidados, repertorio afetivo e ares de centro historico em horario nobre.",
    banner:
      "https://images.unsplash.com/photo-1507874457470-272b3c8d8ee2?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "event-3",
    venueId: "venue-3",
    title: "Noite Clara de Jazz",
    artist: "Lia Campos Trio",
    genres: ["Jazz", "MPB"],
    price: "R$ 70",
    startsAt: "2026-05-25T20:30",
    endsAt: "2026-05-25T23:00",
    description:
      "Improviso elegante, voz aveludada e repertorio brasileiro em clima de clube noturno.",
    banner:
      "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "event-4",
    venueId: "venue-4",
    title: "Frequencia SP",
    artist: "Rima Norte + DJ Lys",
    genres: ["Rap", "DJ", "Eletronica"],
    price: "R$ 55",
    startsAt: "2026-05-29T22:30",
    endsAt: "2026-05-30T03:00",
    description:
      "Encontro de beats, poesia de rua, convidados surpresa e pista aberta madrugada adentro.",
    banner:
      "https://images.unsplash.com/photo-1508973379184-7517410fb0bc?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "event-5",
    venueId: "venue-5",
    title: "Forro no Quintal",
    artist: "Trio Pe de Serra",
    genres: ["Forro", "MPB"],
    price: "R$ 32",
    startsAt: "2026-05-26T18:30",
    endsAt: "2026-05-26T22:00",
    description:
      "Sanfona, zabumba e triangulo em formato de baile aberto com clima de arraial urbano.",
    banner:
      "https://images.unsplash.com/photo-1504609813442-a8924e83f76e?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "event-6",
    venueId: "venue-6",
    title: "Connection Night",
    artist: "DJ Nay e convidados",
    genres: ["Funk", "Charm", "Black"],
    price: "R$ 40",
    startsAt: "2026-05-27T23:00",
    endsAt: "2026-05-28T04:00",
    description:
      "Noite de pista com setlist quente, luz baixa e energia de madrugada na Zona Leste.",
    banner:
      "https://images.unsplash.com/photo-1571266028243-d220c9a19bdf?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "event-7",
    venueId: "venue-7",
    title: "Sextou Metropolitana",
    artist: "Banda Recanto + DJ Duda",
    genres: ["Sertanejo", "Pagode", "DJ"],
    price: "R$ 45",
    startsAt: "2026-05-30T21:30",
    endsAt: "2026-05-31T02:30",
    description:
      "Mistura de palco ao vivo e pista com foco em quem cruza a cidade atras de um role grande.",
    banner:
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1400&q=80",
  },
];

const seedNotifications = [
  {
    id: "note-1",
    title: "Check-in sugerido",
    body: "Parece que voce esta perto da Aparelha Luzia. Se for hoje, vale marcar presenca no historico.",
  },
  {
    id: "note-2",
    title: "Lembrete do Radar",
    body: "BaianaSystem comeca hoje as 20:00. Seu radar ja esta armado.",
  },
  {
    id: "note-3",
    title: "Conquista destravada",
    body: "Voce ganhou o selo Explorador do Centro por visitar diferentes casas na regiao.",
  },
];

const seedState = {
  session: null,
  users: [
    {
      id: "user-1",
      role: "user",
      name: "Lia Campos",
      email: "lia@demo.com",
      password: "123456",
      phone: "(11) 99999-0101",
      age: 31,
      city: "Sao Paulo",
      preferences: ["Samba", "Jazz", "MPB", "Rap"],
      savedEventIds: ["event-1"],
      historyEventIds: ["event-2", "event-3", "event-5"],
      notifications: seedNotifications,
    },
  ],
  masters: [
    {
      id: "master-1",
      role: "master",
      name: "Administrador Master",
      email: "master@palmadamao.app",
      password: "master123",
    },
  ],
  venues: seedVenues,
  events: seedEvents,
};

let state = loadState();
let authMode = "login";
let viewState = { name: "explore", region: "Todos" };

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  const base = stored ? JSON.parse(stored) : structuredClone(seedState);
  const normalized = normalizeState(base);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

function normalizeState(input) {
  const next = structuredClone(input || {});
  next.users = (next.users && next.users.length ? next.users : seedState.users).map((user, index) => ({
    savedEventIds: [],
    historyEventIds: [],
    notifications: index === 0 ? structuredClone(seedNotifications) : [],
    ...user,
  }));
  next.masters = next.masters && next.masters.length ? next.masters : structuredClone(seedState.masters);
  next.venues = mergeById(seedVenues, next.venues || []).map((venue) => ({
    active: true,
    region: inferRegion(venue),
    city: "Sao Paulo",
    ...venue,
  }));
  next.events = mergeById(seedEvents, next.events || []);
  next.session = next.session || null;
  return next;
}

function mergeById(seedItems, currentItems) {
  const currentMap = new Map((currentItems || []).map((item) => [item.id, item]));
  const merged = seedItems.map((item) => ({ ...item, ...(currentMap.get(item.id) || {}) }));
  const extras = (currentItems || []).filter((item) => !seedItems.some((seed) => seed.id === item.id));
  return [...merged, ...extras];
}

function inferRegion(venue) {
  if (venue.region) return venue.region;
  const neighborhood = (venue.neighborhood || "").toLowerCase();
  if (["santa cecilia", "bixiga", "centro", "republica"].includes(neighborhood)) return "Centro";
  if (["moema", "santo amaro"].includes(neighborhood)) return "Zona Sul";
  if (["limao", "santana", "vila maria"].includes(neighborhood)) return "Zona Norte";
  if (["vila formosa", "vila carmosina"].includes(neighborhood)) return "Zona Leste";
  if (["pinheiros", "barra funda"].includes(neighborhood)) return "Zona Oeste";
  return "Grande Sao Paulo";
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function currentUser() {
  if (!state.session) return null;
  return [...state.users, ...state.venues, ...state.masters].find((item) => item.id === state.session.id);
}

function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[char];
  });
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatShortDate(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
  }).format(new Date(value));
}

function formatTime(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function isEventVisible(event) {
  const expiresAt = new Date(event.endsAt).getTime() + 60 * 60 * 1000;
  return expiresAt >= Date.now();
}

function upcomingEvents() {
  return state.events
    .filter(isEventVisible)
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
}

function visibleEventsForUser(user) {
  return upcomingEvents().filter((event) => {
    const venue = getVenue(event.venueId);
    return venue && venue.active && eventMatchesUser(event, user);
  });
}

function eventMatchesUser(event, user) {
  return event.genres.some((genre) => (user.preferences || []).includes(genre));
}

function getVenue(id) {
  return state.venues.find((venue) => venue.id === id);
}

function getEvent(id) {
  return state.events.find((event) => event.id === id);
}

function venueEvents(venueId, user = null) {
  return upcomingEvents().filter((event) => {
    if (event.venueId !== venueId) return false;
    return user ? eventMatchesUser(event, user) : true;
  });
}

function venuesForUser(user, region = "Todos") {
  const matchingIds = new Set(visibleEventsForUser(user).map((event) => event.venueId));
  return state.venues
    .filter((venue) => venue.active && matchingIds.has(venue.id))
    .filter((venue) => region === "Todos" || venue.region === region)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function mount(html) {
  document.querySelector("#app").innerHTML = html;
}

function setScreen(next) {
  viewState = {
    region: next.region || viewState.region || "Todos",
    ...next,
  };
  render();
}

function openProfile() {
  setScreen({ name: "profile", from: { ...viewState } });
}

function openNotifications() {
  setScreen({ name: "notifications", from: { ...viewState } });
}

function goBack(fallback = { name: "explore", region: viewState.region || "Todos" }) {
  if (viewState.from) {
    viewState = { ...viewState.from };
    render();
    return;
  }
  setScreen(fallback);
}

function openExplore() {
  setScreen({ name: "explore", region: viewState.region || "Todos" });
}

function openRadar() {
  setScreen({ name: "radar", region: viewState.region || "Todos" });
}

function openHistory() {
  setScreen({ name: "history", region: viewState.region || "Todos" });
}

function setRegionFilter(region) {
  setScreen({ name: "explore", region });
}

function userHeader(title, showWordmark = false) {
  const user = currentUser();
  return `
    <header class="user-header">
      <div class="header-side">
        ${
          showWordmark
            ? `<div class="wordmark">palma</div>`
            : `<button class="top-button small" onclick="goBack()">&lt; Voltar</button>`
        }
      </div>
      <div class="page-title">${escapeHtml(title)}</div>
      <div class="header-side end header-actions">
        <button class="top-button small hide-mobile" onclick="openNotifications()">Avisos</button>
        <button class="avatar-button" onclick="openProfile()"><span class="avatar-dot">${escapeHtml(initials(user.name))}</span></button>
      </div>
    </header>
  `;
}

function bottomNav(active) {
  return `
    <nav class="bottom-nav">
      <button class="nav-button ${active === "explore" ? "active" : ""}" onclick="openExplore()">
        <span>E</span>
        <strong>Explorar</strong>
      </button>
      <button class="nav-button ${active === "radar" ? "active" : ""}" onclick="openRadar()">
        <span>R</span>
        <strong>Meu Radar</strong>
      </button>
      <button class="nav-button ${active === "history" ? "active" : ""}" onclick="openHistory()">
        <span>H</span>
        <strong>Historico</strong>
      </button>
    </nav>
  `;
}

function userPage({ title, content, activeTab = "explore", withNav = true, showWordmark = false }) {
  mount(`
    <div class="app-shell user-shell">
      ${userHeader(title, showWordmark)}
      <main class="user-content">${content}</main>
      ${withNav ? bottomNav(activeTab) : ""}
    </div>
  `);
}

function adminPage({ title, content, actions = "" }) {
  mount(`
    <div class="app-shell admin-shell">
      <header class="user-header">
        <div class="header-side"><div class="wordmark">palma</div></div>
        <div class="page-title">${escapeHtml(title)}</div>
        <div class="header-side end">${actions}</div>
      </header>
      <main class="user-content">${content}</main>
    </div>
  `);
}

function render() {
  const person = currentUser();
  if (!person) return renderAuth();
  if (person.role === "user") return renderUser();
  if (person.role === "venue") return renderVenueAdmin(person);
  return renderMaster();
}

function renderAuth() {
  mount(`
    <div class="auth-screen">
      <div class="auth-wrap">
        <section class="auth-copy">
          <p class="auth-logo">palma</p>
          <h2>Roles, shows, pistas, bares e palcos que combinam com voce.</h2>
          <p>Entre, selecione seus estilos e receba uma agenda cultural de Sao Paulo com curadoria no clima das referencias que voce trouxe.</p>
        </section>
        <section class="auth-panel">
          <div class="tabs">
            <button class="tab-button ${authMode === "login" ? "active" : ""}" onclick="switchAuthMode('login')">Entrar</button>
            <button class="tab-button ${authMode === "signup" ? "active" : ""}" onclick="switchAuthMode('signup')">Criar conta</button>
          </div>
          ${authMode === "login" ? loginForm() : signupForm()}
        </section>
      </div>
    </div>
  `);
}

function switchAuthMode(mode) {
  authMode = mode;
  renderAuth();
}

function loginForm() {
  return `
    <form onsubmit="login(event)" class="spacer-top">
      <div class="form-grid">
        <div class="field full">
          <label>Email</label>
          <input name="email" type="email" required value="lia@demo.com" />
        </div>
        <div class="field full">
          <label>Senha</label>
          <input name="password" type="password" required value="123456" />
        </div>
        <div class="field full">
          <label>Perfil de acesso</label>
          <select name="role">
            <option value="user">Usuario</option>
            <option value="venue">Casa de evento</option>
            <option value="master">Administrador master</option>
          </select>
        </div>
      </div>
      <div class="form-actions spacer-top">
        <button class="primary-button" type="submit">Login</button>
      </div>
      <div class="notice-block">
        <div class="notice-copy">Teste rapido: usuario lia@demo.com / 123456, casa contato@aparelhaluzia.com / aurora123, master master@palmadamao.app / master123.</div>
      </div>
    </form>
  `;
}

function signupForm() {
  return `
    <form onsubmit="signup(event)" class="spacer-top">
      <div class="form-grid">
        <div class="field">
          <label>Nome</label>
          <input name="name" required />
        </div>
        <div class="field">
          <label>Email</label>
          <input name="email" type="email" required />
        </div>
        <div class="field">
          <label>Senha</label>
          <input name="password" type="password" required minlength="6" />
        </div>
        <div class="field">
          <label>Telefone</label>
          <input name="phone" required />
        </div>
        <div class="field">
          <label>Idade</label>
          <input name="age" type="number" min="13" required />
        </div>
        <div class="field">
          <label>Cidade</label>
          <input name="city" required value="Sao Paulo" />
        </div>
        <div class="field full">
          <label>Qual role voce gosta?</label>
          <div class="genre-grid">${genreCheckboxes()}</div>
        </div>
      </div>
      <div class="form-actions spacer-top">
        <button class="primary-button" type="submit">Criar e entrar</button>
      </div>
    </form>
  `;
}

function genreCheckboxes(selected = []) {
  return genres
    .map(
      (genre) => `
        <label class="choice-chip">
          <input type="checkbox" name="genres" value="${escapeHtml(genre)}" ${selected.includes(genre) ? "checked" : ""} />
          <span>${escapeHtml(genre)}</span>
        </label>
      `
    )
    .join("");
}

function login(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const role = form.get("role");
  const collection = role === "user" ? state.users : role === "venue" ? state.venues : state.masters;
  const account = collection.find(
    (item) => item.email === form.get("email") && item.password === form.get("password")
  );
  if (!account) {
    alert("Login ou senha invalidos.");
    return;
  }
  state.session = { id: account.id, role: account.role };
  viewState = { name: role === "user" ? "explore" : "dashboard", region: "Todos" };
  saveState();
  render();
}

function signup(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const preferences = form.getAll("genres");
  if (!preferences.length) {
    alert("Selecione pelo menos um estilo musical.");
    return;
  }
  const email = form.get("email");
  const exists = [...state.users, ...state.venues, ...state.masters].some((item) => item.email === email);
  if (exists) {
    alert("Este email ja esta cadastrado.");
    return;
  }
  const user = {
    id: uid("user"),
    role: "user",
    name: form.get("name"),
    email,
    password: form.get("password"),
    phone: form.get("phone"),
    age: Number(form.get("age")),
    city: form.get("city"),
    preferences,
    savedEventIds: [],
    historyEventIds: [],
    notifications: [],
  };
  state.users.push(user);
  state.session = { id: user.id, role: "user" };
  viewState = { name: "explore", region: "Todos" };
  saveState();
  render();
}

function logout() {
  state.session = null;
  viewState = { name: "explore", region: "Todos" };
  authMode = "login";
  saveState();
  render();
}

function renderUser() {
  const user = currentUser();
  if (viewState.name === "venue") return renderVenueDetail(viewState.id, user);
  if (viewState.name === "event") return renderEventDetail(viewState.id, user, viewState.venueId);
  if (viewState.name === "profile") return renderProfile(user);
  if (viewState.name === "notifications") return renderNotifications(user);
  if (viewState.name === "radar") return renderRadar(user);
  if (viewState.name === "history") return renderHistory(user);
  return renderExplore(user);
}

function renderExplore(user) {
  const region = viewState.region || "Todos";
  const venues = venuesForUser(user, region);
  const featuredEvent = visibleEventsForUser(user)[0];
  userPage({
    title: region === "Todos" ? "Explorar" : region,
    showWordmark: true,
    activeTab: "explore",
    content: `
      <section class="section-intro">
        <div>
          <p class="section-kicker">Hoje, ${escapeHtml(formatShortDate(Date.now()))}</p>
          <h2>${region === "Todos" ? "Descubra roles por data e estilo" : `Roles pela ${escapeHtml(region)}`}</h2>
          <p class="section-copy">Casas, bares e pistas aparecem conforme seus estilos: ${(user.preferences || []).slice(0, 4).map(escapeHtml).join(", ")}.</p>
        </div>
        <button class="map-button" onclick="showMapHint()">Ver no mapa</button>
      </section>
      <div class="filters-row">
        ${regions
          .map(
            (item) => `
              <button class="region-chip ${item === region ? "active" : ""}" onclick="setRegionFilter('${item}')">
                ${escapeHtml(item)}
              </button>
            `
          )
          .join("")}
      </div>
      ${
        featuredEvent
          ? `
            <section class="ad-block">
              <p class="ad-label">Publicidade</p>
              <div class="ad-banner" style="background-image:url('${escapeHtml(featuredEvent.banner)}')"></div>
            </section>
          `
          : ""
      }
      <section class="list-stack">
        ${
          venues.length
            ? venues.map((venue) => venueRow(venue, user)).join("")
            : `<div class="empty-state"><h3 class="block-title">Nada por aqui ainda</h3><p class="empty-copy">Troque a regiao ou ajuste seus estilos para abrir mais possibilidades.</p></div>`
        }
      </section>
    `,
  });
}

function venueRow(venue, user) {
  const nextEvent = venueEvents(venue.id, user)[0];
  return `
    <article class="venue-row">
      <div class="venue-thumb" style="background-image:url('${escapeHtml(venue.banner)}')"></div>
      <div class="venue-copy">
        <h3>${escapeHtml(venue.name)}</h3>
        <p>${escapeHtml(`${venue.neighborhood} - ${venue.region}`)}</p>
        <p>${escapeHtml(venue.address)}</p>
        ${
          nextEvent
            ? `<div class="venue-meta"><span>${escapeHtml(nextEvent.artist)}</span><span>${escapeHtml(formatTime(nextEvent.startsAt))}</span><span>${escapeHtml(nextEvent.price)}</span></div>`
            : ""
        }
      </div>
      <button class="venue-arrow" onclick="openVenue('${venue.id}')">&gt;</button>
    </article>
  `;
}

function openVenue(venueId) {
  setScreen({
    name: "venue",
    id: venueId,
    from: { name: "explore", region: viewState.region || "Todos" },
  });
}

function renderVenueDetail(venueId, user) {
  const venue = getVenue(venueId);
  const events = venueEvents(venueId, user);
  userPage({
    title: venue.name,
    withNav: false,
    content: `
      <section class="detail-hero" style="background-image:url('${escapeHtml(venue.banner)}')">
        <div class="detail-card tight">
          <div class="detail-grid">
            <div>
              <h3>${escapeHtml(venue.name)}</h3>
              <p>${escapeHtml(venue.address)}</p>
              <p class="detail-copy">${escapeHtml(venue.description)}</p>
            </div>
            <button class="map-button" onclick="showMapHint()">Mapa</button>
          </div>
        </div>
      </section>
      <section class="spacer-top">
        <h3 class="block-title">Proximos eventos</h3>
        <div class="event-stack spacer-top">
          ${
            events.length
              ? events.map((event) => eventRow(event, venue.id)).join("")
              : `<div class="empty-state"><p class="empty-copy">Nenhum evento futuro combina com os estilos do seu perfil.</p></div>`
          }
        </div>
      </section>
    `,
  });
}

function eventRow(event, venueId) {
  return `
    <article class="event-row">
      <div class="event-copy">
        <h3>${escapeHtml(event.title)}</h3>
        <p>${escapeHtml(event.artist)}</p>
        <div class="event-inline">
          <span>${escapeHtml(formatShortDate(event.startsAt))}</span>
          <span>${escapeHtml(`${formatTime(event.startsAt)} - ${formatTime(event.endsAt)}`)}</span>
          <span>${escapeHtml(event.price)}</span>
        </div>
      </div>
      <button class="event-arrow" onclick="openEvent('${event.id}', '${venueId}')">&gt;</button>
    </article>
  `;
}

function openEvent(eventId, venueId) {
  setScreen({
    name: "event",
    id: eventId,
    venueId,
    from: { name: "venue", id: venueId, region: viewState.region || "Todos" },
  });
}

function renderEventDetail(eventId, user, venueId) {
  const event = getEvent(eventId);
  const venue = getVenue(event.venueId);
  const inRadar = (user.savedEventIds || []).includes(event.id);
  userPage({
    title: venue.name,
    withNav: false,
    content: `
      <section class="detail-hero" style="background-image:url('${escapeHtml(event.banner)}')">
        <div class="detail-card">
          <div class="detail-grid">
            <div>
              <h3>${escapeHtml(event.title)}</h3>
              <p>${escapeHtml(event.artist)}</p>
              <div class="detail-meta">
                <span>${escapeHtml(formatDateTime(event.startsAt))}</span>
                <span>${escapeHtml(`${formatTime(event.startsAt)} - ${formatTime(event.endsAt)}`)}</span>
              </div>
              <p>${escapeHtml(venue.name)} - ${escapeHtml(venue.address)}</p>
              <p class="detail-copy">${escapeHtml(event.description)}</p>
              <div class="genre-grid">${event.genres.map((genre) => `<span class="tag-pill active">${escapeHtml(genre)}</span>`).join("")}</div>
            </div>
            <div class="price-badge">${escapeHtml(event.price)}</div>
          </div>
        </div>
      </section>
      <div class="form-actions spacer-top">
        <button class="${inRadar ? "accent-button" : "accent-button"}" onclick="toggleRadar('${event.id}')">
          ${inRadar ? "Marcado no seu Radar" : "Acho Que Eu Vou"}
        </button>
        <a class="secondary-button" href="https://wa.me/?text=${encodeURIComponent(`${event.title} - ${venue.name} - ${formatDateTime(event.startsAt)}`)}" target="_blank" rel="noreferrer">Compartilhar</a>
      </div>
      <p class="notice-copy">Toque para marcar ou desmarcar este evento no seu radar.</p>
    `,
  });
}

function renderProfile(user) {
  userPage({
    title: "Configuracoes",
    withNav: false,
    content: `
      <section class="profile-hero">
        <div class="avatar-large">${escapeHtml(initials(user.name))}</div>
        <div>
          <h3>${escapeHtml(user.name)}</h3>
          <p>${escapeHtml(user.email)}</p>
          <p>${escapeHtml(user.phone)} - ${escapeHtml(user.city)}</p>
        </div>
      </section>
      <section class="settings-list">
        <article class="settings-card">
          <div>
            <h3>Privacidade</h3>
            <p>Controle sobre email, notificacoes e visibilidade das suas preferencias.</p>
          </div>
          <div class="settings-arrow">&gt;</div>
        </article>
        <article class="settings-card">
          <div>
            <h3>Ajuda</h3>
            <p>Dicas de uso, acesso e suporte rapido para o seu perfil cultural.</p>
          </div>
          <div class="settings-arrow">&gt;</div>
        </article>
      </section>
      <section class="form-panel spacer-top">
        <h3 class="block-title">Minhas informacoes</h3>
        <form onsubmit="updateProfile(event)" class="spacer-top">
          <div class="form-grid">
            <div class="field">
              <label>Nome</label>
              <input name="name" value="${escapeHtml(user.name)}" required />
            </div>
            <div class="field">
              <label>Telefone</label>
              <input name="phone" value="${escapeHtml(user.phone)}" required />
            </div>
            <div class="field">
              <label>Idade</label>
              <input name="age" type="number" value="${user.age}" required />
            </div>
            <div class="field">
              <label>Cidade</label>
              <input name="city" value="${escapeHtml(user.city)}" required />
            </div>
            <div class="field full">
              <label>Qual role voce gosta?</label>
              <div class="genre-grid">${genreCheckboxes(user.preferences || [])}</div>
            </div>
          </div>
          <div class="form-actions spacer-top">
            <button class="primary-button" type="submit">Salvar perfil</button>
            <button class="ghost-button" type="button" onclick="logout()">Sair</button>
          </div>
        </form>
      </section>
    `,
  });
}

function updateProfile(event) {
  event.preventDefault();
  const user = currentUser();
  const form = new FormData(event.target);
  const preferences = form.getAll("genres");
  if (!preferences.length) {
    alert("Selecione pelo menos um estilo musical.");
    return;
  }
  Object.assign(user, {
    name: form.get("name"),
    phone: form.get("phone"),
    age: Number(form.get("age")),
    city: form.get("city"),
    preferences,
  });
  pushNotification(user, "Perfil atualizado", "Suas preferencias foram salvas e a agenda ja refletiu esse gosto.");
  saveState();
  setScreen({ name: "explore", region: viewState.region || "Todos" });
}

function renderNotifications(user) {
  userPage({
    title: "Notificacoes",
    withNav: false,
    content: `
      <section class="section-intro">
        <div>
          <h2>Notificacoes</h2>
          <p class="section-copy">Lembretes, check-ins sugeridos e pequenos avisos do seu circuito cultural.</p>
        </div>
        <button class="ghost-button" onclick="goBack()">Fechar</button>
      </section>
      <section class="notification-stack">
        ${
          (user.notifications || []).length
            ? user.notifications
                .map(
                  (note) => `
                    <article class="notification-card">
                      <h3>${escapeHtml(note.title)}</h3>
                      <p>${escapeHtml(note.body)}</p>
                    </article>
                  `
                )
                .join("")
            : `<div class="empty-state"><p class="empty-copy">Nenhuma notificacao por enquanto.</p></div>`
        }
      </section>
    `,
  });
}

function renderRadar(user) {
  const savedEvents = (user.savedEventIds || []).map(getEvent).filter(Boolean);
  userPage({
    title: "Meu Radar",
    activeTab: "radar",
    content: `
      <section class="section-intro">
        <div>
          <h2>Meu Radar</h2>
          <p class="section-copy">Seus eventos salvos para nao deixar passar batido.</p>
        </div>
        <button class="map-button" onclick="showMapHint()">Ver no mapa</button>
      </section>
      ${
        savedEvents.length
          ? `
            <section class="event-stack">
              ${savedEvents.map((event) => radarRow(event)).join("")}
            </section>
          `
          : `
            <section class="empty-state">
              <h3 class="block-title">Radar vazio</h3>
              <p class="empty-copy">Nenhum evento marcado ainda. Explore e toque em "Acho Que Eu Vou".</p>
            </section>
          `
      }
    `,
  });
}

function radarRow(event) {
  const venue = getVenue(event.venueId);
  return `
    <article class="event-row">
      <div class="event-copy">
        <h3>${escapeHtml(event.title)}</h3>
        <p>${escapeHtml(venue.name)}</p>
        <div class="event-inline">
          <span>${escapeHtml(formatDateTime(event.startsAt))}</span>
          <span>${escapeHtml(event.price)}</span>
        </div>
      </div>
      <button class="event-arrow" onclick="openEvent('${event.id}', '${venue.id}')">&gt;</button>
    </article>
  `;
}

function renderHistory(user) {
  const historyEvents = (user.historyEventIds || []).map(getEvent).filter(Boolean);
  userPage({
    title: "Meu Historico",
    activeTab: "history",
    content: `
      <section class="section-intro">
        <div>
          <h2>Linha do tempo de check-ins</h2>
          <p class="section-copy">Um historico leve dos roles que ja passaram pelo seu caminho.</p>
        </div>
      </section>
      <section class="event-stack">
        ${
          historyEvents.length
            ? historyEvents.map((event) => historyRow(event)).join("")
            : `<div class="empty-state"><p class="empty-copy">Seu historico ainda esta em branco.</p></div>`
        }
      </section>
      <section class="spacer-top">
        <h3 class="block-title">Minhas conquistas</h3>
        <div class="achievement-grid">
          ${achievementCard("Explorador do Centro", "Visitou 5 locais diferentes na regiao central.", "")}
          ${achievementCard("Sextou!", "Tres sextas seguidas em algum show marcado no radar.", "teal")}
          ${achievementCard("Radar afiado", "Ja marcou 10 eventos para nao perder nada.", "teal")}
          ${achievementCard("Primeiro check-in", "Seu primeiro role confirmado entrou para a memoria do app.", "gold")}
        </div>
      </section>
    `,
  });
}

function historyRow(event) {
  const venue = getVenue(event.venueId);
  return `
    <article class="history-card">
      <div class="history-thumb" style="background-image:url('${escapeHtml(event.banner)}')"></div>
      <div>
        <h3>${escapeHtml(venue.name)}</h3>
        <p>${escapeHtml(formatDateTime(event.startsAt))}</p>
      </div>
      <div class="history-actions">
        <button class="secondary-button" onclick="openEvent('${event.id}', '${venue.id}')">Ver</button>
        <button class="danger-button" onclick="removeHistoryEvent('${event.id}')">Apagar</button>
      </div>
    </article>
  `;
}

function achievementCard(title, body, tone) {
  return `
    <article class="achievement-card ${tone}">
      <div class="achievement-eyebrow"></div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(body)}</p>
    </article>
  `;
}

function toggleRadar(eventId) {
  const user = currentUser();
  const saved = new Set(user.savedEventIds || []);
  const event = getEvent(eventId);
  if (saved.has(eventId)) {
    saved.delete(eventId);
    pushNotification(user, "Radar atualizado", `Voce removeu ${event.title} do seu radar.`);
  } else {
    saved.add(eventId);
    pushNotification(user, "Radar atualizado", `Agora ${event.title} esta salvo no seu radar.`);
  }
  user.savedEventIds = [...saved];
  saveState();
  render();
}

function removeHistoryEvent(eventId) {
  const user = currentUser();
  user.historyEventIds = (user.historyEventIds || []).filter((id) => id !== eventId);
  saveState();
  render();
}

function pushNotification(user, title, body) {
  user.notifications = [{ id: uid("note"), title, body }, ...(user.notifications || [])].slice(0, 8);
}

function showMapHint() {
  alert("Mapa interativo entra na proxima fase. Por enquanto a interface ja prepara esse fluxo.");
}

function renderVenueAdmin(venue) {
  const events = state.events
    .filter((event) => event.venueId === venue.id)
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
  adminPage({
    title: venue.name,
    actions: `<button class="ghost-button small" onclick="logout()">Sair</button>`,
    content: `
      <section class="dashboard-intro">
        <div>
          <h2>${escapeHtml(venue.name)}</h2>
          <p class="section-copy">Painel da casa com a mesma atmosfera do app, agora voltado a cadastro e agenda.</p>
        </div>
        <span class="status ${venue.active ? "active" : "paused"}">${venue.active ? "Ativa" : "Desligada"}</span>
      </section>
      <section class="panel-grid">
        <article class="panel">
          <h3>Dados da casa</h3>
          <form onsubmit="updateVenue(event)" class="spacer-top">
            <div class="form-grid">
              <div class="field"><label>Nome</label><input name="name" value="${escapeHtml(venue.name)}" required /></div>
              <div class="field"><label>Telefone</label><input name="phone" value="${escapeHtml(venue.phone)}" required /></div>
              <div class="field"><label>Email</label><input name="email" type="email" value="${escapeHtml(venue.email)}" required /></div>
              <div class="field"><label>Senha</label><input name="password" type="password" value="${escapeHtml(venue.password)}" required minlength="6" /></div>
              <div class="field"><label>Bairro</label><input name="neighborhood" value="${escapeHtml(venue.neighborhood)}" required /></div>
              <div class="field"><label>Regiao</label><select name="region">${regions.filter((item) => item !== "Todos").map((item) => `<option value="${item}" ${venue.region === item ? "selected" : ""}>${item}</option>`).join("")}</select></div>
              <div class="field full"><label>Endereco</label><input name="address" value="${escapeHtml(venue.address)}" required /></div>
              <div class="field full"><label>Banner URL</label><input name="banner" value="${escapeHtml(venue.banner)}" required /></div>
              <div class="field full"><label>Descricao</label><textarea name="description" required>${escapeHtml(venue.description)}</textarea></div>
            </div>
            <div class="form-actions spacer-top"><button class="primary-button" type="submit">Salvar casa</button></div>
          </form>
        </article>
        <article class="panel">
          <h3>Novo evento</h3>
          <form onsubmit="createEvent(event)" class="spacer-top">
            <div class="form-grid">
              <div class="field"><label>Nome do evento</label><input name="title" required /></div>
              <div class="field"><label>Artista</label><input name="artist" required /></div>
              <div class="field"><label>Inicio</label><input name="startsAt" type="datetime-local" required /></div>
              <div class="field"><label>Termino</label><input name="endsAt" type="datetime-local" required /></div>
              <div class="field"><label>Valor</label><input name="price" placeholder="R$ 40" required /></div>
              <div class="field full"><label>Banner URL</label><input name="banner" required /></div>
              <div class="field full"><label>Estilos</label><div class="genre-grid">${genreCheckboxes()}</div></div>
              <div class="field full"><label>Descricao</label><textarea name="description" required></textarea></div>
            </div>
            <div class="form-actions spacer-top"><button class="accent-button" type="submit">Cadastrar evento</button></div>
          </form>
        </article>
      </section>
      <section class="panel spacer-top">
        <h3>Eventos cadastrados</h3>
        <div class="event-stack spacer-top">
          ${events.length ? events.map(adminEventRow).join("") : `<div class="empty-state"><p class="empty-copy">Nenhum evento cadastrado.</p></div>`}
        </div>
      </section>
    `,
  });
}

function adminEventRow(event) {
  const expired = !isEventVisible(event);
  return `
    <article class="event-row">
      <div class="event-copy">
        <h3>${escapeHtml(event.title)}</h3>
        <p>${escapeHtml(event.artist)}</p>
        <div class="event-inline">
          <span>${escapeHtml(formatDateTime(event.startsAt))}</span>
          <span>${expired ? "Expirado" : "Visivel"}</span>
          <span>${escapeHtml(event.price)}</span>
        </div>
      </div>
      <div class="status ${expired ? "paused" : "active"}">${expired ? "Encerrado" : "Ativo"}</div>
    </article>
  `;
}

function updateVenue(event) {
  event.preventDefault();
  const venue = currentUser();
  const form = new FormData(event.target);
  Object.assign(venue, {
    name: form.get("name"),
    phone: form.get("phone"),
    email: form.get("email"),
    password: form.get("password"),
    neighborhood: form.get("neighborhood"),
    region: form.get("region"),
    address: form.get("address"),
    banner: form.get("banner"),
    description: form.get("description"),
  });
  saveState();
  render();
}

function createEvent(event) {
  event.preventDefault();
  const venue = currentUser();
  const form = new FormData(event.target);
  const selectedGenres = form.getAll("genres");
  if (!selectedGenres.length) {
    alert("Selecione pelo menos um estilo.");
    return;
  }
  if (new Date(form.get("endsAt")) <= new Date(form.get("startsAt"))) {
    alert("O termino precisa ser depois do inicio.");
    return;
  }
  state.events.push({
    id: uid("event"),
    venueId: venue.id,
    title: form.get("title"),
    artist: form.get("artist"),
    genres: selectedGenres,
    price: form.get("price"),
    startsAt: form.get("startsAt"),
    endsAt: form.get("endsAt"),
    description: form.get("description"),
    banner: form.get("banner"),
  });
  saveState();
  render();
}

function renderMaster() {
  adminPage({
    title: "Master",
    actions: `<button class="ghost-button small" onclick="logout()">Sair</button>`,
    content: `
      <section class="dashboard-intro">
        <div>
          <h2>Controle de casas</h2>
          <p class="section-copy">Visualize todas as casas e desligue a exibicao quando a regra de negocio pedir.</p>
        </div>
      </section>
      <section class="panel">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Casa</th>
                <th>Contato</th>
                <th>Endereco</th>
                <th>Status</th>
                <th>Acao</th>
              </tr>
            </thead>
            <tbody>
              ${state.venues.map(masterVenueRow).join("")}
            </tbody>
          </table>
        </div>
      </section>
    `,
  });
}

function masterVenueRow(venue) {
  return `
    <tr>
      <td><strong>${escapeHtml(venue.name)}</strong><br>${escapeHtml(`${venue.neighborhood} - ${venue.region}`)}</td>
      <td>${escapeHtml(venue.phone)}<br>${escapeHtml(venue.email)}</td>
      <td>${escapeHtml(venue.address)}</td>
      <td><span class="status ${venue.active ? "active" : "paused"}">${venue.active ? "Ativa" : "Desligada"}</span></td>
      <td>
        <button class="${venue.active ? "danger-button" : "primary-button"}" onclick="toggleVenue('${venue.id}')">
          ${venue.active ? "Desligar" : "Ativar"}
        </button>
      </td>
    </tr>
  `;
}

function toggleVenue(venueId) {
  const venue = getVenue(venueId);
  venue.active = !venue.active;
  saveState();
  render();
}

window.addEventListener("storage", () => {
  state = loadState();
  render();
});

render();
