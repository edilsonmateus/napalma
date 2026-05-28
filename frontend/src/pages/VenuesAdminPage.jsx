import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import VerifiedBadge from "../components/common/VerifiedBadge";
import {
  useAddVenueManagerMutation,
  useArtistsQuery,
  useAdminRegionsQuery,
  useCreateArtistMutation,
  useCreateClaimMutation,
  useCreateRegionMutation,
  useClaimsQuery,
  useDecideClaimMutation,
  useCreateEventMutation,
  useCreateVenueManagerUserMutation,
  useCreateVenueMutation,
  useDeleteArtistMutation,
  useDeleteEventMutation,
  useDeleteRegionMutation,
  useDeleteVenueMutation,
  useEventsQuery,
  useRegionsQuery,
  useRemoveVenueManagerMutation,
  useVenueManagerUsersQuery,
  useMyClaimsQuery,
  useRevokeMyVenueAccessMutation,
  useUpdateArtistMutation,
  useUpdateEventMutation,
  useUpdateRegionMutation,
  useUploadImageMutation,
  useUpdateVenueMutation,
  useVenueAdsSummaryQuery,
  useVenueManagersQuery,
  useVenuesQuery
} from "../hooks/useEventsQuery";
import { getArtistById, getEventById, getVenueById } from "../services/events.service";
import { useAuthStore } from "../store/authStore";
import { isAdminRole, isProducerRole, isVenueRole } from "../utils/roles";

const initialVenueForm = {
  name: "",
  goldPartner: false,
  description: "",
  contactName: "",
  contactPhone: "",
  instagramUrl: "",
  address: "",
  neighborhood: "",
  region: "",
  city: "Sao Paulo",
  state: "SP",
  imageUrl: "",
  openDays: ""
};

const initialArtistForm = {
  name: "",
  bio: "",
  contactName: "",
  contactPhone: "",
  imageUrl: "",
  genres: "samba",
  isVerified: false,
  spotifyUrl: "",
  youtubeUrl: "",
  instagramUrl: ""
};

const initialEventForm = {
  title: "",
  description: "",
  imageUrl: "",
  type: "roda_samba",
  tags: "samba",
  startDate: "",
  endDate: "",
  ticketType: "paid",
  status: "draft",
  ticketUrl: "",
  priceMin: "",
  priceMax: "",
  consumacaoValue: "",
  couvertArtistico: "",
  venueId: "",
  artistName: "",
  isRecurring: false,
  recurrenceDays: [],
  recurrenceStartTime: "",
  recurrenceEndTime: "",
  recurrenceUntil: "",
  recurrenceExceptions: ""
};

const publishChecklistModel = [
  { key: "title", label: "Revisei titulo/artista do evento." },
  { key: "schedule", label: "Revisei data e horario (inicio e fim)." },
  { key: "venue", label: "Revisei casa/unidade selecionada." },
  { key: "region", label: "Revisei regiao da casa para o filtro correto." },
  { key: "pricing", label: "Revisei politica de preco e valores." },
  { key: "media", label: "Revisei imagem, descricao e link (se houver)." }
];

const initialManagerForm = {
  firstName: "",
  lastName: "",
  username: "",
  email: "",
  phone: "",
  password: ""
};
const PAGE_SIZE = 6;
const ADMIN_PREFS_KEY = "napalma:admin:prefs";
const RECURRENCE_DAYS = [
  { value: "seg", label: "Seg" },
  { value: "ter", label: "Ter" },
  { value: "qua", label: "Qua" },
  { value: "qui", label: "Qui" },
  { value: "sex", label: "Sex" },
  { value: "sab", label: "Sab" },
  { value: "dom", label: "Dom" }
];
const DEFAULT_CITY_REGIONS = ["Centro", "Zona Norte", "Zona Sul", "Zona Leste", "Zona Oeste"];
const initialRegionForm = {
  name: "",
  city: "Sao Paulo",
  state: "SP",
  sortOrder: "",
  isActive: true
};

function loadAdminPrefs() {
  try {
    const raw = localStorage.getItem(ADMIN_PREFS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (_error) {
    return {};
  }
}

function parseApiErrors(error) {
  const fieldErrors = error?.response?.data?.details?.fieldErrors || {};
  const first = Object.values(fieldErrors).flat()[0] || error?.response?.data?.message || "Erro inesperado.";
  return { fieldErrors, message: first };
}

function toLocalDateTimeInput(value) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function formatPreviewDateTime(value) {
  if (!value) return "Data e hora";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Data e hora";
  return parsed.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function parseTagList(rawValue) {
  return String(rawValue || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export default function VenuesAdminPage() {
  const prefs = loadAdminPrefs();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const [regionFilter, setRegionFilter] = useState(prefs.regionFilter || "");
  const [editingVenueId, setEditingVenueId] = useState("");
  const [editingArtistId, setEditingArtistId] = useState("");
  const [editingEventId, setEditingEventId] = useState("");
  const [venueForm, setVenueForm] = useState(initialVenueForm);
  const [artistForm, setArtistForm] = useState(initialArtistForm);
  const [eventForm, setEventForm] = useState(initialEventForm);
  const [selectedVenueForManagers, setSelectedVenueForManagers] = useState("");
  const [managerForm, setManagerForm] = useState(initialManagerForm);
  const [managerSearch, setManagerSearch] = useState("");
  const [selectedManagerUserId, setSelectedManagerUserId] = useState("");
  const [venueEditJustification, setVenueEditJustification] = useState("");
  const [claimViewFilter, setClaimViewFilter] = useState("all");
  const [houseClaimTargetId, setHouseClaimTargetId] = useState("");
  const [houseClaimJustification, setHouseClaimJustification] = useState("");
  const [houseClaimResponsibleName, setHouseClaimResponsibleName] = useState("");
  const [houseClaimResponsiblePhone, setHouseClaimResponsiblePhone] = useState("");
  const [houseClaimDocument, setHouseClaimDocument] = useState("");
  const [houseClaimRelationship, setHouseClaimRelationship] = useState("");
  const [houseClaimOfficialEmail, setHouseClaimOfficialEmail] = useState("");
  const [houseClaimOfficialInstagram, setHouseClaimOfficialInstagram] = useState("");
  const [houseClaimOfficialWebsite, setHouseClaimOfficialWebsite] = useState("");
  const [cancellationTarget, setCancellationTarget] = useState(null);
  const [reactivationTarget, setReactivationTarget] = useState(null);
  const [toast, setToast] = useState({ text: "", type: "info" });
  const [venueErrors, setVenueErrors] = useState({});
  const [artistErrors, setArtistErrors] = useState({});
  const [eventErrors, setEventErrors] = useState({});
  const [venueSearch, setVenueSearch] = useState(prefs.venueSearch || "");
  const [artistSearch, setArtistSearch] = useState(prefs.artistSearch || "");
  const [eventSearch, setEventSearch] = useState(prefs.eventSearch || "");
  const [venueSort, setVenueSort] = useState(prefs.venueSort || "recent");
  const [artistSort, setArtistSort] = useState(prefs.artistSort || "recent");
  const [eventSort, setEventSort] = useState(prefs.eventSort || "recent");
  const [eventTimeFilter, setEventTimeFilter] = useState(prefs.eventTimeFilter || "all");
  const [houseActiveVenueId, setHouseActiveVenueId] = useState("");
  const [venuePage, setVenuePage] = useState(1);
  const [artistPage, setArtistPage] = useState(1);
  const [eventPage, setEventPage] = useState(1);
  const [regionForm, setRegionForm] = useState(initialRegionForm);
  const [editingRegionId, setEditingRegionId] = useState("");
  const [uploadingTarget, setUploadingTarget] = useState("");
  const [publishReviewOpen, setPublishReviewOpen] = useState(false);
  const [publishChecks, setPublishChecks] = useState(() =>
    Object.fromEntries(publishChecklistModel.map((item) => [item.key, false]))
  );

  function showToast(text, forcedType) {
    if (!text) {
      setToast({ text: "", type: "info" });
      return;
    }
    const normalized = String(text).toLowerCase();
    const autoType = normalized.includes("nao foi possivel")
      || normalized.includes("revise")
      || normalized.includes("sem permissao")
      || normalized.includes("voce nao pode")
      || normalized.includes("forbidden")
      || normalized.includes("erro")
      ? "error"
      : text.includes("Carregando")
        ? "info"
        : "success";
    setToast({ text, type: forcedType || autoType });
  }

  const isHouseRole = isVenueRole(user?.role);
  const { data: regions = [] } = useRegionsQuery();
  const { data: venues = [], isLoading: venuesLoading } = useVenuesQuery(regionFilter ? { region: regionFilter } : {});
  const { data: publicVenues = [] } = useVenuesQuery({ scope: "public" });
  const { data: adminRegions = [] } = useAdminRegionsQuery({ includeInactive: "true" }, isAdminRole(user?.role));
  const { data: artists = [], isLoading: artistsLoading } = useArtistsQuery();
  const eventsQueryFilters = useMemo(
    () => ({
      ...(regionFilter ? { region: regionFilter } : {}),
      ...(user ? { includeDrafts: "true" } : {})
    }),
    [regionFilter, user]
  );
  const { data: events = [], isLoading: eventsLoading } = useEventsQuery(eventsQueryFilters);
  const { data: houseAdsSummary, isLoading: houseAdsLoading } = useVenueAdsSummaryQuery({ days: 30 }, isHouseRole);
  const { data: venueManagers = [], isLoading: managersLoading } = useVenueManagersQuery(selectedVenueForManagers);
  const { data: managerCandidates = [], isLoading: managerCandidatesLoading } = useVenueManagerUsersQuery(managerSearch);

  const createVenueMutation = useCreateVenueMutation();
  const updateVenueMutation = useUpdateVenueMutation();
  const deleteVenueMutation = useDeleteVenueMutation();
  const createArtistMutation = useCreateArtistMutation();
  const updateArtistMutation = useUpdateArtistMutation();
  const deleteArtistMutation = useDeleteArtistMutation();
  const createEventMutation = useCreateEventMutation();
  const createClaimMutation = useCreateClaimMutation();
  const updateEventMutation = useUpdateEventMutation();
  const deleteEventMutation = useDeleteEventMutation();
  const addVenueManagerMutation = useAddVenueManagerMutation();
  const createVenueManagerUserMutation = useCreateVenueManagerUserMutation();
  const removeVenueManagerMutation = useRemoveVenueManagerMutation();
  const revokeMyVenueAccessMutation = useRevokeMyVenueAccessMutation();
  const decideClaimMutation = useDecideClaimMutation();
  const createRegionMutation = useCreateRegionMutation();
  const updateRegionMutation = useUpdateRegionMutation();
  const deleteRegionMutation = useDeleteRegionMutation();
  const uploadImageMutation = useUploadImageMutation();
  const { data: claims = [], isLoading: claimsLoading } = useClaimsQuery(undefined, user?.role === "admin");
  const { data: myClaims = [], isLoading: myClaimsLoading } = useMyClaimsQuery(Boolean(user));

  const isEditingVenue = useMemo(() => Boolean(editingVenueId), [editingVenueId]);
  const isEditingArtist = useMemo(() => Boolean(editingArtistId), [editingArtistId]);
  const isEditingEvent = useMemo(() => Boolean(editingEventId), [editingEventId]);
  const isProducer = isProducerRole(user?.role);
  const canManageCatalog = isAdminRole(user?.role) || isProducerRole(user?.role);
  const canManageProducers = isAdminRole(user?.role) || isHouseRole;
  const isAdmin = isAdminRole(user?.role);
  const houseVenues = useMemo(() => (isHouseRole ? venues : []), [isHouseRole, venues]);
  const houseActiveVenue = useMemo(() => {
    if (!isHouseRole) return null;
    return houseVenues.find((venue) => venue.id === houseActiveVenueId) || houseVenues[0] || null;
  }, [isHouseRole, houseVenues, houseActiveVenueId]);
  const filteredVenues = useMemo(() => {
    const q = venueSearch.trim().toLowerCase();
    if (!q) return venues;
    return venues.filter((item) => `${item.name} ${item.neighborhood} ${item.region}`.toLowerCase().includes(q));
  }, [venues, venueSearch]);
  const filteredArtists = useMemo(() => {
    const q = artistSearch.trim().toLowerCase();
    if (!q) return artists;
    return artists.filter((item) => item.name.toLowerCase().includes(q));
  }, [artists, artistSearch]);
  const filteredEvents = useMemo(() => {
    const q = eventSearch.trim().toLowerCase();
    const base = q
      ? events.filter((item) => `${item.title} ${item.artist} ${item.venue}`.toLowerCase().includes(q))
      : events;
    const baseByHouse = isHouseRole && houseActiveVenue
      ? base.filter((item) => item.venue === houseActiveVenue.name)
      : base;
    const scoped = isHouseRole ? baseByHouse : base;
    if (eventTimeFilter === "all") return scoped;
    const now = Date.now();
    return scoped.filter((item) => {
      const startsAt = new Date(item.startsAt || item.startDate || 0).getTime();
      return eventTimeFilter === "upcoming" ? startsAt >= now : startsAt < now;
    });
  }, [events, eventSearch, eventTimeFilter, isHouseRole, houseActiveVenue]);
  const activeSection = searchParams.get("section") || "overview";
  const effectiveSection = activeSection;
  const showOverview = effectiveSection === "overview";
  const showVenues = canManageCatalog && effectiveSection === "venues";
  const showManagers = canManageProducers && effectiveSection === "managers";
  const showArtists = canManageCatalog && effectiveSection === "artists";
  const houseCanOperate = !isHouseRole || Boolean(houseActiveVenue);
  const showEvents = effectiveSection === "events" && houseCanOperate;
  const showEventsBlocked = effectiveSection === "events" && !houseCanOperate;
  const showClaims = isAdmin && effectiveSection === "claims";
  const showAdminRegions = isAdmin && effectiveSection === "regions";
  const showHouseClaims = isHouseRole && effectiveSection === "claims";
  const showHouseProfile = isHouseRole && effectiveSection === "profile";
  const isHouseProgramacaoClean = isHouseRole && showEvents && searchParams.get("layout") === "clean";

  useEffect(() => {
    if (showEvents) return;
    setPublishReviewOpen(false);
    setReactivationTarget(null);
    setCancellationTarget(null);
  }, [showEvents]);

  const sortedVenues = useMemo(() => {
    const list = [...filteredVenues];
    if (venueSort === "az") return list.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [filteredVenues, venueSort]);
  const sortedArtists = useMemo(() => {
    const list = [...filteredArtists];
    if (artistSort === "az") return list.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [filteredArtists, artistSort]);
  const sortedEvents = useMemo(() => {
    const list = [...filteredEvents];
    if (eventSort === "az") return list.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
    return list.sort((a, b) => new Date(b.startsAt || b.startDate || 0).getTime() - new Date(a.startsAt || a.startDate || 0).getTime());
  }, [filteredEvents, eventSort]);
  const venueTotalPages = Math.max(1, Math.ceil(sortedVenues.length / PAGE_SIZE));
  const artistTotalPages = Math.max(1, Math.ceil(sortedArtists.length / PAGE_SIZE));
  const eventTotalPages = Math.max(1, Math.ceil(sortedEvents.length / PAGE_SIZE));
  const pagedVenues = sortedVenues.slice((venuePage - 1) * PAGE_SIZE, venuePage * PAGE_SIZE);
  const pagedArtists = sortedArtists.slice((artistPage - 1) * PAGE_SIZE, artistPage * PAGE_SIZE);
  const pagedEvents = sortedEvents.slice((eventPage - 1) * PAGE_SIZE, eventPage * PAGE_SIZE);
  const totalManagers = venueManagers.length;
  const pendingClaimsCount = claims.filter((claim) => claim.status === "pending").length;
  const filteredClaims = useMemo(() => {
    if (claimViewFilter === "all") return claims;
    if (claimViewFilter === "pending_updates") {
      return claims.filter((claim) => claim.status === "pending" && claim.requestType === "venue_update");
    }
    if (claimViewFilter === "pending_ownership") {
      return claims.filter((claim) => claim.status === "pending" && claim.requestType === "ownership");
    }
    return claims;
  }, [claimViewFilter, claims]);
  const houseDisplayName = isHouseRole
    ? houseActiveVenue
      ? houseActiveVenue.name
      : venues.length > 1
        ? `${venues.length} casas vinculadas`
        : "Sua casa"
    : "";
  const houseClaimOptions = useMemo(() => {
    if (!isHouseRole) return [];
    const managedIds = new Set((houseVenues || []).map((venue) => venue.id));
    return (publicVenues || []).filter((venue) => !managedIds.has(venue.id));
  }, [isHouseRole, houseVenues, publicVenues]);
  const venueRegionOptions = useMemo(() => {
    const merged = new Set([
      ...DEFAULT_CITY_REGIONS,
      ...regions,
      venueForm.region || ""
    ]);
    return Array.from(merged)
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }, [regions, venueForm.region]);
  const isEditingRegion = Boolean(editingRegionId);
  const houseEvents = useMemo(() => {
    if (!isHouseRole || !houseActiveVenue) return [];
    return events
      .filter((item) => item.venue === houseActiveVenue.name)
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [isHouseRole, houseActiveVenue, events]);
  const houseTodayEventsCount = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();
    return houseEvents.filter((event) => {
      const start = new Date(event.startsAt);
      return start.getFullYear() === y && start.getMonth() === m && start.getDate() === d;
    }).length;
  }, [houseEvents]);
  const houseUpcomingEvents = useMemo(() => {
    const now = Date.now();
    return houseEvents.filter((event) => new Date(event.startsAt).getTime() >= now).slice(0, 6);
  }, [houseEvents]);
  const pendingMyHouseClaims = useMemo(
    () => myClaims.filter((claim) => claim.targetType === "venue" && claim.status === "pending").length,
    [myClaims]
  );
  const previewVenue = venues.find((venue) => venue.id === eventForm.venueId) || houseActiveVenue || null;
  const previewPriceLabel = eventForm.ticketType === "free"
    ? "Gratuito"
    : eventForm.ticketType === "consumacao"
      ? "Consumacao"
      : eventForm.priceMin || eventForm.priceMax
        ? `R$ ${eventForm.priceMin || eventForm.priceMax}`
        : "Consulte valores";
  const roleHeader = useMemo(() => {
    if (isAdminRole(user?.role)) {
      return {
        title: "Administracao Geral de Casas, Artistas e Eventos",
        subtitle: "Voce pode operar toda a base da plataforma.",
        badge: "Perfil ativo: ADMIN"
      };
    }
    if (isProducerRole(user?.role)) {
      return {
        title: "Gestao de Casas, Artistas e Eventos do Produtor",
        subtitle: "Voce edita somente carteira aprovada e reivindicacoes.",
        badge: "Perfil ativo: PRODUTOR"
      };
    }
    return {
      title: "Gestao de Agenda da Casa",
      subtitle: houseDisplayName
        ? `Unidade ativa: ${houseDisplayName}. Aqui voce cuida da agenda, produtores e dados da sua casa.`
        : "Para operar a agenda, primeiro solicite acesso a uma filial cadastrada.",
      badge: "Perfil ativo: CASA"
    };
  }, [houseDisplayName, user?.role]);

  useEffect(() => {
    setVenuePage(1);
  }, [venueSearch, regionFilter, venueSort]);
  useEffect(() => {
    setArtistPage(1);
  }, [artistSearch, artistSort]);
  useEffect(() => {
    setEventPage(1);
  }, [eventSearch, regionFilter, eventSort, eventTimeFilter]);
  useEffect(() => {
    if (isHouseRole && !searchParams.get("section")) {
      setSearchParams({ section: "overview" });
    }
  }, [isHouseRole, searchParams, setSearchParams]);
  useEffect(() => {
    if (isHouseRole) return;
    if (!searchParams.get("section") && prefs.section) {
      setSearchParams({ section: prefs.section === "all" ? "overview" : prefs.section });
    }
  }, [searchParams, setSearchParams, prefs.section, isHouseRole]);
  useEffect(() => {
    try {
      localStorage.setItem(
        ADMIN_PREFS_KEY,
        JSON.stringify({
          section: effectiveSection,
          regionFilter,
          venueSearch,
          artistSearch,
          eventSearch,
          venueSort,
          artistSort,
          eventSort,
          eventTimeFilter
        })
      );
    } catch (_error) {
      // no-op
    }
  }, [effectiveSection, regionFilter, venueSearch, artistSearch, eventSearch, venueSort, artistSort, eventSort, eventTimeFilter]);
  useEffect(() => {
    if (!isHouseRole || eventForm.venueId || venues.length === 0) return;
    setEventForm((prev) => ({ ...prev, venueId: venues[0].id }));
  }, [isHouseRole, eventForm.venueId, venues]);
  useEffect(() => {
    if (!isHouseRole || houseVenues.length === 0) return;
    if (!houseActiveVenueId) {
      setHouseActiveVenueId(houseVenues[0].id);
      return;
    }
    const stillValid = houseVenues.some((venue) => venue.id === houseActiveVenueId);
    if (!stillValid) {
      setHouseActiveVenueId(houseVenues[0].id);
    }
  }, [isHouseRole, houseVenues, houseActiveVenueId]);
  useEffect(() => {
    if (!isHouseRole || !houseActiveVenue?.id) return;
    setEventForm((prev) => ({ ...prev, venueId: houseActiveVenue.id }));
  }, [isHouseRole, houseActiveVenue?.id]);
  useEffect(() => {
    if (!isHouseRole || !houseActiveVenue?.id) return;
    setSelectedVenueForManagers(houseActiveVenue.id);
  }, [isHouseRole, houseActiveVenue?.id]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key.toLowerCase() === "/" && !e.ctrlKey && !e.metaKey) {
        const el = document.querySelector(".search-input");
        if (el) {
          e.preventDefault();
          el.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function downloadCsv(filename, headers, rows) {
    const esc = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const content = [headers.map(esc).join(","), ...rows.map((row) => row.map(esc).join(","))].join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
  function exportVenuesCsv() {
    downloadCsv("casas.csv", ["Nome", "Bairro", "Regiao", "Eventos"], filteredVenues.map((v) => [v.name, v.neighborhood, v.region, v.eventsCount]));
    showToast("CSV de casas exportado.");
  }
  function exportArtistsCsv() {
    downloadCsv("artistas.csv", ["Nome", "Generos", "Eventos"], filteredArtists.map((a) => [a.name, (a.genres || []).join(" | "), a.eventsCount]));
    showToast("CSV de artistas exportado.");
  }
  function exportEventsCsv() {
    downloadCsv("eventos.csv", ["Titulo", "Artista", "Casa", "Regiao", "Inicio"], filteredEvents.map((e) => [e.title, e.artist, e.venue, e.region, e.startsAt || e.startDate]));
    showToast("CSV de eventos exportado.");
  }
  useEffect(() => {
    if (!toast.text) return undefined;
    const timer = setTimeout(() => setToast({ text: "", type: "info" }), 2400);
    return () => clearTimeout(timer);
  }, [toast.text]);

  function handleVenueChange(event) {
    const { name, value, type, checked } = event.target;
    const nextValue = type === "checkbox" ? checked : value;
    setVenueForm((prev) => ({ ...prev, [name]: nextValue }));
    setVenueErrors((prev) => ({ ...prev, [name]: undefined }));
  }
  function clearAdminFilters() {
    setRegionFilter("");
    setVenueSearch("");
    setArtistSearch("");
    setEventSearch("");
    setVenueSort("recent");
    setArtistSort("recent");
    setEventSort("recent");
    setEventTimeFilter("all");
    setVenuePage(1);
    setArtistPage(1);
    setEventPage(1);
    showToast("Filtros limpos.");
  }

  function handleArtistChange(event) {
    const { name, value, type, checked } = event.target;
    const nextValue = type === "checkbox" ? checked : value;
    setArtistForm((prev) => ({ ...prev, [name]: nextValue }));
    setArtistErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function handleEventChange(event) {
    const { name, value, type, checked, options } = event.target;
    if (name === "recurrenceDays") {
      const values = Array.from(options)
        .filter((option) => option.selected)
        .map((option) => option.value);
      setEventForm((prev) => ({ ...prev, recurrenceDays: values }));
      setEventErrors((prev) => ({ ...prev, recurrenceDays: undefined }));
      return;
    }

    if (name === "isRecurring" && !checked) {
      setEventForm((prev) => ({
        ...prev,
        isRecurring: false,
        recurrenceDays: [],
        recurrenceStartTime: "",
        recurrenceEndTime: "",
        recurrenceUntil: "",
        recurrenceExceptions: ""
      }));
      setEventErrors((prev) => ({ ...prev, recurrenceDays: undefined }));
      return;
    }

    const nextValue = type === "checkbox" ? checked : value;
    setEventForm((prev) => ({ ...prev, [name]: nextValue }));
    setEventErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function toggleRecurrenceDay(day) {
    setEventForm((prev) => {
      const currentDays = Array.isArray(prev.recurrenceDays) ? prev.recurrenceDays : [];
      const nextDays = currentDays.includes(day)
        ? currentDays.filter((item) => item !== day)
        : [...currentDays, day];
      return {
        ...prev,
        isRecurring: nextDays.length > 0 || prev.isRecurring,
        recurrenceDays: nextDays
      };
    });
    setEventErrors((prev) => ({ ...prev, recurrenceDays: undefined }));
  }

  function hasEventTag(tag) {
    return parseTagList(eventForm.tags).includes(tag);
  }

  function toggleEventTag(tag) {
    setEventForm((prev) => {
      const tags = parseTagList(prev.tags);
      const next = tags.includes(tag)
        ? tags.filter((item) => item !== tag)
        : [...tags, tag];
      return { ...prev, tags: next.join(", ") };
    });
  }

  function resetVenueForm() {
    setEditingVenueId("");
    setVenueForm(initialVenueForm);
    setVenueEditJustification("");
    setVenueErrors({});
  }

  function resetArtistForm() {
    setEditingArtistId("");
    setArtistForm(initialArtistForm);
    setArtistErrors({});
  }

  function resetEventForm() {
    setEditingEventId("");
    setEventForm(initialEventForm);
    setEventErrors({});
    setPublishReviewOpen(false);
    setPublishChecks(Object.fromEntries(publishChecklistModel.map((item) => [item.key, false])));
  }

  function togglePublishCheck(key) {
    setPublishChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const publishChecklistDone = useMemo(
    () => publishChecklistModel.every((item) => publishChecks[item.key]),
    [publishChecks]
  );

  function validateEventBeforeSubmit() {
    const errors = {};
    if (!eventForm.venueId) errors.venueId = ["Selecione uma casa."];
    if (!eventForm.startDate) errors.startDate = ["Informe o horario de inicio."];
    if (!eventForm.endDate) errors.endDate = ["Informe o horario de termino."];
    if (eventForm.startDate && eventForm.endDate && new Date(eventForm.endDate) <= new Date(eventForm.startDate)) {
      errors.endDate = ["Termino precisa ser depois do inicio."];
    }
    if (eventForm.ticketType === "free" && (eventForm.priceMin || eventForm.priceMax)) {
      errors.ticketType = ["Evento gratuito nao deve ter preco."];
    }
    if (eventForm.ticketType === "consumacao" && eventForm.consumacaoValue && Number(eventForm.consumacaoValue) < 0) {
      errors.consumacaoValue = ["Consumacao minima nao pode ser negativa."];
    }
    if (eventForm.priceMin && eventForm.priceMax && Number(eventForm.priceMax) < Number(eventForm.priceMin)) {
      errors.priceMax = ["Preco maximo deve ser maior ou igual ao minimo."];
    }
    if (eventForm.isRecurring && (!Array.isArray(eventForm.recurrenceDays) || eventForm.recurrenceDays.length === 0)) {
      errors.recurrenceDays = ["Selecione ao menos um dia da semana."];
    }
    return errors;
  }

  async function handleVenueSubmit(event) {
    event.preventDefault();
    showToast("");
    setVenueErrors({});

    const payload = {
      ...venueForm,
      contactName: venueForm.contactName || undefined,
      contactPhone: venueForm.contactPhone || undefined,
      instagramUrl: venueForm.instagramUrl || undefined,
      state: venueForm.state.toUpperCase()
    };
    payload.openDays = venueForm.openDays
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    try {
      if (!isAdmin && isEditingVenue) {
        if (!venueEditJustification.trim() || venueEditJustification.trim().length < 5) {
          showToast("Justificativa obrigatoria (min 5 caracteres) para enviar ao admin.", "error");
          return;
        }
        const current = venues.find((item) => item.id === editingVenueId) || {};
        const diff = {};
        const trackKeys = [
          "name",
          "description",
          "contactName",
          "contactPhone",
          "instagramUrl",
          "address",
          "neighborhood",
          "region",
          "city",
          "state",
          "imageUrl",
          "openDays"
        ];
        for (const key of trackKeys) {
          const nextValue = key === "openDays" ? payload.openDays : (payload[key] ?? "");
          const prevValue = key === "openDays" ? (current.openDays || []) : (current[key] ?? "");
          if (JSON.stringify(nextValue) !== JSON.stringify(prevValue)) {
            diff[key] = nextValue;
          }
        }
        if (Object.keys(diff).length === 0) {
          showToast("Nenhuma alteracao detectada para enviar ao admin.", "info");
          return;
        }
        await createClaimMutation.mutateAsync({
          targetType: "venue",
          requestType: "venue_update",
          venueId: editingVenueId,
          justification: venueEditJustification.trim(),
          requestedChanges: diff
        });
        showToast("Solicitacao de alteracao enviada para aprovacao do admin.");
        resetVenueForm();
        return;
      }
      if (isEditingVenue) {
        await updateVenueMutation.mutateAsync({ id: editingVenueId, payload });
        showToast("Casa atualizada com sucesso.");
      } else {
        await createVenueMutation.mutateAsync(payload);
        showToast("Casa criada com sucesso.");
      }
      resetVenueForm();
    } catch (error) {
      const parsed = parseApiErrors(error);
      setVenueErrors(parsed.fieldErrors);
      showToast(parsed.message || "Nao foi possivel salvar a casa.");
    }
  }

  async function handleArtistSubmit(event) {
    event.preventDefault();
    showToast("");
    setArtistErrors({});

    const payload = {
      ...artistForm,
      genres: artistForm.genres.split(",").map((genre) => genre.trim().toLowerCase()).filter(Boolean),
      isVerified: Boolean(artistForm.isVerified),
      bio: artistForm.bio || undefined,
      contactName: artistForm.contactName || undefined,
      contactPhone: artistForm.contactPhone || undefined,
      imageUrl: artistForm.imageUrl || undefined,
      spotifyUrl: artistForm.spotifyUrl || undefined,
      youtubeUrl: artistForm.youtubeUrl || undefined,
      instagramUrl: artistForm.instagramUrl || undefined
    };

    try {
      if (isEditingArtist) {
        const updated = await updateArtistMutation.mutateAsync({ id: editingArtistId, payload });
        setArtistForm({
          name: updated.name || "",
          bio: updated.bio || "",
          contactName: updated.contactName || "",
          contactPhone: updated.contactPhone || "",
          imageUrl: updated.imageUrl || "",
          genres: Array.isArray(updated.genres) ? updated.genres.join(", ") : "samba",
          isVerified: Boolean(updated.isVerified),
          spotifyUrl: updated.spotifyUrl || "",
          youtubeUrl: updated.youtubeUrl || "",
          instagramUrl: updated.instagramUrl || ""
        });
        showToast("Artista atualizado com sucesso.");
      } else {
        await createArtistMutation.mutateAsync(payload);
        showToast("Artista criado com sucesso.");
        resetArtistForm();
      }
    } catch (error) {
      const parsed = parseApiErrors(error);
      setArtistErrors(parsed.fieldErrors);
      showToast(parsed.message || "Nao foi possivel salvar o artista.");
    }
  }

  async function handleVenueEdit(venue) {
    showToast("Carregando dados completos da casa...");
    setVenueErrors({});

    try {
      const detail = await getVenueById(venue.id);
      setEditingVenueId(detail.id);
      setVenueForm({
        name: detail.name || "",
        goldPartner: Boolean(detail.goldPartner),
        description: detail.description || "",
        contactName: detail.contactName || "",
        contactPhone: detail.contactPhone || "",
        instagramUrl: detail.instagramUrl || "",
        address: detail.address || "",
        neighborhood: detail.neighborhood || "",
        region: detail.region || "",
        city: detail.city || "",
        state: detail.state || "SP",
        imageUrl: detail.imageUrl || "",
        openDays: Array.isArray(detail.openDays) ? detail.openDays.join(", ") : ""
      });
      setVenueEditJustification("");
      showToast("Casa carregada. Edite os campos e salve.");
    } catch (error) {
      showToast(error?.response?.data?.message || "Nao foi possivel carregar os dados completos da casa.");
    }
  }

  async function handleArtistEdit(artist) {
    showToast("Carregando dados completos do artista...");
    setArtistErrors({});

    try {
      const detail = await getArtistById(artist.id);
      setEditingArtistId(detail.id);
      setArtistForm({
        name: detail.name || "",
        bio: detail.bio || "",
        contactName: detail.contactName || "",
        contactPhone: detail.contactPhone || "",
        imageUrl: detail.imageUrl || "",
        genres: Array.isArray(detail.genres) ? detail.genres.join(", ") : "samba",
        isVerified: Boolean(detail.isVerified),
        spotifyUrl: detail.spotifyUrl || "",
        youtubeUrl: detail.youtubeUrl || "",
        instagramUrl: detail.instagramUrl || ""
      });
      showToast("Artista carregado. Edite os campos e salve.");
    } catch (error) {
      showToast(error?.response?.data?.message || "Nao foi possivel carregar os dados completos do artista.");
    }
  }

  async function handleVenueDelete(venueId) {
    const ok = window.confirm(
      isProducer
        ? "Deseja remover esta casa da sua carteira?"
        : "Deseja excluir esta casa? Essa acao nao pode ser desfeita."
    );
    if (!ok) return;

    showToast("");
    try {
      await deleteVenueMutation.mutateAsync(venueId);
      if (editingVenueId === venueId) resetVenueForm();
      showToast(isProducer ? "Casa removida da sua carteira." : "Casa excluida com sucesso.");
    } catch (error) {
      showToast(error?.response?.data?.message || "Nao foi possivel excluir a casa.");
    }
  }

  async function handleArtistDelete(artistId) {
    const ok = window.confirm("Deseja excluir este artista?");
    if (!ok) return;

    showToast("");
    try {
      await deleteArtistMutation.mutateAsync(artistId);
      if (editingArtistId === artistId) resetArtistForm();
      showToast("Artista excluido com sucesso.");
    } catch (error) {
      showToast(error?.response?.data?.message || "Nao foi possivel excluir o artista.");
    }
  }

  async function persistEvent(nextStatus = "draft") {
    showToast("");
    setEventErrors({});

    const localErrors = validateEventBeforeSubmit();
    if (Object.keys(localErrors).length > 0) {
      setEventErrors(localErrors);
      showToast("Revise os campos do evento destacados abaixo.");
      return;
    }

    const payload = {
      ...eventForm,
      status: nextStatus,
      artistName: eventForm.artistName?.trim() ? eventForm.artistName.trim() : undefined,
      tags: eventForm.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      priceMin: eventForm.priceMin ? Number(eventForm.priceMin) : undefined,
      priceMax: eventForm.priceMax ? Number(eventForm.priceMax) : undefined,
      consumacaoValue: eventForm.consumacaoValue ? Number(eventForm.consumacaoValue) : undefined,
      couvertArtistico: eventForm.couvertArtistico ? Number(eventForm.couvertArtistico) : undefined,
      ticketUrl: eventForm.ticketUrl || undefined,
      imageUrl: eventForm.imageUrl || undefined,
      isRecurring: Boolean(eventForm.isRecurring),
      recurrenceDays: eventForm.isRecurring ? eventForm.recurrenceDays : [],
      recurrenceStartTime: eventForm.isRecurring ? (eventForm.recurrenceStartTime || undefined) : undefined,
      recurrenceEndTime: eventForm.isRecurring ? (eventForm.recurrenceEndTime || undefined) : undefined,
      recurrenceUntil: eventForm.isRecurring && eventForm.recurrenceUntil
        ? new Date(`${eventForm.recurrenceUntil}T23:59:59`)
        : undefined,
      recurrenceExceptions: eventForm.isRecurring
        ? eventForm.recurrenceExceptions
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
          .map((item) => new Date(`${item}T00:00:00`))
          .filter((date) => !Number.isNaN(date.getTime()))
        : []
    };

    try {
      if (eventForm.ticketType === "free") {
        payload.priceMin = undefined;
        payload.priceMax = undefined;
      }
      if (eventForm.ticketType !== "consumacao") {
        payload.consumacaoValue = undefined;
      }

      if (isEditingEvent) {
        await updateEventMutation.mutateAsync({ id: editingEventId, payload });
        showToast(nextStatus === "confirmed" ? "Evento publicado com sucesso." : "Rascunho atualizado com sucesso.");
      } else {
        await createEventMutation.mutateAsync(payload);
        showToast(nextStatus === "confirmed" ? "Evento publicado com sucesso." : "Rascunho salvo com sucesso.");
      }
      resetEventForm();
      return true;
    } catch (error) {
      const parsed = parseApiErrors(error);
      setEventErrors(parsed.fieldErrors);
      showToast(parsed.message || "Nao foi possivel salvar o evento.", "error");
      return false;
    }
  }

  async function handleEventSubmit(event) {
    event.preventDefault();
    await persistEvent("draft");
  }

  function openPublishReview() {
    const localErrors = validateEventBeforeSubmit();
    if (Object.keys(localErrors).length > 0) {
      setEventErrors(localErrors);
      showToast("Revise os campos do evento destacados abaixo.");
      return;
    }
    setPublishChecks(Object.fromEntries(publishChecklistModel.map((item) => [item.key, false])));
    setPublishReviewOpen(true);
  }

  async function confirmPublishEvent() {
    if (!publishChecklistDone) return;
    const ok = await persistEvent("confirmed");
    if (ok) {
      setPublishReviewOpen(false);
    }
  }

  async function handleEventEdit(eventItem) {
    showToast("Carregando dados completos do evento...");
    setEventErrors({});

    try {
      const detail = await getEventById(eventItem.id);
      setEditingEventId(detail.id);
      setEventForm({
        title: detail.title || "",
        description: detail.description || "",
        imageUrl: detail.imageUrl || "",
        type: detail.type || "roda_samba",
        tags: Array.isArray(detail.tags) ? detail.tags.join(", ") : "samba",
        startDate: toLocalDateTimeInput(detail.startDate),
        endDate: toLocalDateTimeInput(detail.endDate),
        ticketType: detail.ticketType || "paid",
        status: detail.status || "draft",
        ticketUrl: detail.ticketUrl || "",
        priceMin: detail.priceMin ?? "",
        priceMax: detail.priceMax ?? "",
        consumacaoValue: detail.consumacaoValue ?? "",
        couvertArtistico: detail.couvertArtistico ?? "",
        venueId: detail.venueId || "",
        artistName: detail.artistName || "",
        isRecurring: Boolean(detail.isRecurring),
        recurrenceDays: detail.recurrenceDays || [],
        recurrenceStartTime: detail.recurrenceStartTime || "",
        recurrenceEndTime: detail.recurrenceEndTime || "",
        recurrenceUntil: detail.recurrenceUntil
          ? new Date(detail.recurrenceUntil).toISOString().slice(0, 10)
          : "",
        recurrenceExceptions: Array.isArray(detail.recurrenceExceptions)
          ? detail.recurrenceExceptions.map((value) => new Date(value).toISOString().slice(0, 10)).join(", ")
          : ""
      });
      showToast("Evento carregado. Edite os campos e salve.");
    } catch (error) {
      showToast(error?.response?.data?.message || "Nao foi possivel carregar os dados completos do evento.");
    }
  }

  async function handleEventDelete(eventId) {
    const ok = window.confirm("Deseja excluir este evento?");
    if (!ok) return;

    showToast("");
    try {
      await deleteEventMutation.mutateAsync(eventId);
      if (editingEventId === eventId) resetEventForm();
      showToast("Evento excluido com sucesso.");
    } catch (error) {
      showToast(error?.response?.data?.message || "Nao foi possivel excluir o evento.");
    }
  }

  async function cancelOccurrenceDate(eventItem, targetDate) {
    const trimmed = targetDate.trim();

    const nextExceptions = Array.from(
      new Set([
        ...((eventItem.recurrenceExceptions || []).map((value) => new Date(value).toISOString().slice(0, 10))),
        trimmed
      ])
    );

    try {
      await updateEventMutation.mutateAsync({
        id: eventItem.id,
        payload: {
          recurrenceExceptions: nextExceptions.map((value) => new Date(`${value}T00:00:00`))
        }
      });
      showToast(`Data ${trimmed} cancelada na serie.`);
      setCancellationTarget(null);
    } catch (error) {
      showToast(error?.response?.data?.message || "Nao foi possivel cancelar esta data.");
    }
  }

  function handleCancelOccurrence(eventItem) {
    const suggested = (eventItem.startsAt || "").slice(0, 10);
    setCancellationTarget({
      id: eventItem.id,
      title: eventItem.title,
      selectedDate: /^\d{4}-\d{2}-\d{2}$/.test(suggested) ? suggested : "",
      recurrenceExceptions: eventItem.recurrenceExceptions || []
    });
  }

  async function reactivateOccurrenceDate(eventItem, targetDate) {
    const currentExceptions = (eventItem.recurrenceExceptions || [])
      .map((value) => new Date(value).toISOString().slice(0, 10));
    const nextExceptions = currentExceptions.filter((value) => value !== targetDate);
    try {
      await updateEventMutation.mutateAsync({
        id: eventItem.id,
        payload: {
          recurrenceExceptions: nextExceptions.map((value) => new Date(`${value}T00:00:00`))
        }
      });
      showToast(`Data ${targetDate} reativada na serie.`);
      setReactivationTarget((prev) => {
        if (!prev || prev.id !== eventItem.id) return null;
        const updatedDates = (prev.dates || []).filter((date) => date !== targetDate);
        return updatedDates.length > 0 ? { ...prev, dates: updatedDates } : null;
      });
    } catch (error) {
      showToast(error?.response?.data?.message || "Nao foi possivel reativar esta data.");
    }
  }

  function handleReactivateOccurrence(eventItem) {
    const currentExceptions = (eventItem.recurrenceExceptions || [])
      .map((value) => new Date(value).toISOString().slice(0, 10))
      .sort();

    if (currentExceptions.length === 0) {
      showToast("Este evento nao possui datas canceladas.");
      return;
    }

    setReactivationTarget({
      id: eventItem.id,
      title: eventItem.title,
      dates: currentExceptions
    });
  }

  async function handleAddManager(event) {
    event.preventDefault();
    if (!selectedVenueForManagers || !selectedManagerUserId) {
      showToast("Selecione a casa e um produtor valido da lista.");
      return;
    }
    showToast("");
    try {
      await addVenueManagerMutation.mutateAsync({
        venueId: selectedVenueForManagers,
        payload: { userId: selectedManagerUserId }
      });
      setManagerSearch("");
      setSelectedManagerUserId("");
      showToast("Produtor vinculado com sucesso.");
    } catch (error) {
      showToast(error?.response?.data?.message || "Nao foi possivel vincular produtor.");
    }
  }

  function handleManagerFormChange(event) {
    const { name, value } = event.target;
    setManagerForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleCreateManager(event) {
    event.preventDefault();
    try {
      await createVenueManagerUserMutation.mutateAsync({
        firstName: managerForm.firstName,
        lastName: managerForm.lastName,
        username: managerForm.username,
        email: managerForm.email,
        phone: managerForm.phone || undefined,
        password: managerForm.password
      });
      setManagerForm(initialManagerForm);
      setManagerSearch("");
      setSelectedManagerUserId("");
      showToast("Produtor criado com sucesso.");
    } catch (error) {
      showToast(error?.response?.data?.message || "Nao foi possivel criar produtor.");
    }
  }

  async function handleRemoveManager(userId) {
    if (!selectedVenueForManagers) return;
    showToast("");
    try {
      await removeVenueManagerMutation.mutateAsync({
        venueId: selectedVenueForManagers,
        userId
      });
      showToast("Vinculo removido com sucesso.");
    } catch (error) {
      showToast(error?.response?.data?.message || "Nao foi possivel remover vinculo.");
    }
  }

  async function handleClaimDecision(claimId, status) {
    try {
      await decideClaimMutation.mutateAsync({
        id: claimId,
        payload: { status }
      });
      showToast(status === "approved" ? "Reivindicacao aprovada." : "Reivindicacao rejeitada.");
    } catch (error) {
      showToast(error?.response?.data?.message || "Nao foi possivel decidir a reivindicacao.");
    }
  }

  function resetRegionForm() {
    setRegionForm(initialRegionForm);
    setEditingRegionId("");
  }

  function handleRegionFormChange(event) {
    const { name, value, type, checked } = event.target;
    setRegionForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  function handleRegionEdit(item) {
    setEditingRegionId(item.id);
    setRegionForm({
      name: item.name || "",
      city: item.city || "Sao Paulo",
      state: item.state || "SP",
      sortOrder: item.sortOrder ?? "",
      isActive: Boolean(item.isActive)
    });
  }

  async function handleRegionSubmit(event) {
    event.preventDefault();
    showToast("");
    const payload = {
      name: regionForm.name.trim(),
      city: regionForm.city.trim() || "Sao Paulo",
      state: (regionForm.state || "SP").trim().toUpperCase(),
      sortOrder: regionForm.sortOrder === "" ? 0 : Number(regionForm.sortOrder),
      isActive: Boolean(regionForm.isActive)
    };
    try {
      if (editingRegionId) {
        await updateRegionMutation.mutateAsync({ id: editingRegionId, payload });
        showToast("Regiao atualizada com sucesso.");
      } else {
        await createRegionMutation.mutateAsync(payload);
        showToast("Regiao criada com sucesso.");
      }
      resetRegionForm();
    } catch (error) {
      showToast(error?.response?.data?.message || "Nao foi possivel salvar a regiao.");
    }
  }

  async function handleRegionDelete(regionItem) {
    if ((regionItem?.venuesCount || 0) > 0) {
      showToast("Regiao com casas vinculadas nao pode ser excluida.", "error");
      return;
    }
    const ok = window.confirm("Deseja excluir esta regiao?");
    if (!ok) return;
    showToast("");
    try {
      await deleteRegionMutation.mutateAsync(regionItem.id);
      if (editingRegionId === regionItem.id) resetRegionForm();
      showToast("Regiao excluida com sucesso.");
    } catch (error) {
      showToast(error?.response?.data?.message || "Nao foi possivel excluir a regiao.");
    }
  }

  async function handleImageUpload(event, target) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    showToast("");
    setUploadingTarget(target);
    try {
      const folder = target === "venue" ? "venues" : target === "artist" ? "artists" : "events";
      const nameHint = target === "venue" ? venueForm.name : target === "artist" ? artistForm.name : eventForm.title;
      const uploaded = await uploadImageMutation.mutateAsync({
        file,
        folder,
        name: nameHint || file.name
      });
      if (target === "venue") {
        setVenueForm((prev) => ({ ...prev, imageUrl: uploaded.url || prev.imageUrl }));
      } else if (target === "artist") {
        setArtistForm((prev) => ({ ...prev, imageUrl: uploaded.url || prev.imageUrl }));
      } else {
        setEventForm((prev) => ({ ...prev, imageUrl: uploaded.url || prev.imageUrl }));
      }
      showToast("Imagem enviada com sucesso.");
    } catch (error) {
      showToast(error?.response?.data?.message || "Nao foi possivel enviar a imagem.");
    } finally {
      setUploadingTarget("");
    }
  }

  async function handleRevokeMyHouseAccess(venueId, venueName) {
    const ok = window.confirm(
      `Deseja abrir mao da filial "${venueName}"? Voce perdera acesso imediato a esta unidade.`
    );
    if (!ok) return;
    showToast("");
    try {
      await revokeMyVenueAccessMutation.mutateAsync(venueId);
      if (houseActiveVenueId === venueId) {
        setHouseActiveVenueId("");
      }
      showToast("Acesso da filial revogado com sucesso.");
    } catch (error) {
      showToast(error?.response?.data?.message || "Nao foi possivel revogar este acesso.");
    }
  }

  async function handleHouseOwnershipClaimSubmit(event) {
    event.preventDefault();
    showToast("");
    if (!houseClaimTargetId) {
      showToast("Selecione a filial para solicitar acesso.", "error");
      return;
    }
    try {
      await createClaimMutation.mutateAsync({
        targetType: "venue",
        requestType: "ownership",
        venueId: houseClaimTargetId,
        justification: houseClaimJustification.trim(),
        responsibleName: houseClaimResponsibleName.trim(),
        responsiblePhone: houseClaimResponsiblePhone.trim(),
        claimantDocument: houseClaimDocument.trim(),
        relationshipRole: houseClaimRelationship.trim(),
        officialEmail: houseClaimOfficialEmail.trim() || undefined,
        officialInstagram: houseClaimOfficialInstagram.trim() || undefined,
        officialWebsite: houseClaimOfficialWebsite.trim() || undefined
      });
      showToast("Reivindicacao enviada. Aguarde aprovacao do admin.");
      setHouseClaimTargetId("");
      setHouseClaimJustification("");
      setHouseClaimResponsibleName("");
      setHouseClaimResponsiblePhone("");
      setHouseClaimDocument("");
      setHouseClaimRelationship("");
      setHouseClaimOfficialEmail("");
      setHouseClaimOfficialInstagram("");
      setHouseClaimOfficialWebsite("");
    } catch (error) {
      showToast(error?.response?.data?.message || "Nao foi possivel enviar reivindicacao.", "error");
    }
  }

  function startHouseProfileEdit() {
    if (!houseActiveVenue) return;
    setEditingVenueId(houseActiveVenue.id);
    setVenueForm({
      name: houseActiveVenue.name || "",
      goldPartner: Boolean(houseActiveVenue.goldPartner),
      description: houseActiveVenue.description || "",
      contactName: houseActiveVenue.contactName || "",
      contactPhone: houseActiveVenue.contactPhone || "",
      instagramUrl: houseActiveVenue.instagramUrl || "",
      address: houseActiveVenue.address || "",
      neighborhood: houseActiveVenue.neighborhood || "",
      region: houseActiveVenue.region || "",
      city: houseActiveVenue.city || "Sao Paulo",
      state: houseActiveVenue.state || "SP",
      imageUrl: houseActiveVenue.imageUrl || "",
      openDays: (houseActiveVenue.openDays || []).join(", ")
    });
    setSearchParams({ section: "profile" });
  }

  return (
    <section>
      <button className="btn-link" onClick={() => navigate(-1)}>Voltar</button>
      <header className="page-header admin-page-header">
        <div className="admin-page-header-main">
          <h2>{roleHeader.title}</h2>
          <p>{roleHeader.subtitle}</p>
          <div className="role-session-wrap">
            <div className="role-session-badge">{roleHeader.badge}</div>
            <span className="role-live-indicator" aria-label="Perfil ativo ao vivo">LIVE</span>
          </div>
          {isHouseRole ? <p className="meta-line"><strong>Casa:</strong> {houseDisplayName}</p> : null}
          {isHouseRole && houseVenues.length > 1 ? (
            <div className="house-selector-wrap">
              <label htmlFor="house-active-select" className="meta-line"><strong>Unidade ativa</strong></label>
              <select
                id="house-active-select"
                value={houseActiveVenueId}
                onChange={(e) => setHouseActiveVenueId(e.target.value)}
              >
                {houseVenues.map((venue) => (
                  <option key={venue.id} value={venue.id}>{venue.name}</option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
        <img src="/assets/brand/icon_mono_77Gira.svg" alt="77Gira" className="admin-page-icon" />
      </header>

      {toast.text ? <p className={`toast toast-${toast.type}`}>{toast.text}</p> : null}

      {!isHouseRole ? (
        <div className="ads-layout">
          <aside className="ads-sidebar">
            <button className={`chip ${activeSection === "overview" ? "active" : ""}`} onClick={() => setSearchParams({ section: "overview" })}>
              Visao Geral
            </button>
            {canManageCatalog ? <button className={`chip ${activeSection === "venues" ? "active" : ""}`} onClick={() => setSearchParams({ section: "venues" })}>Casas</button> : null}
            {canManageCatalog ? <button className={`chip ${activeSection === "artists" ? "active" : ""}`} onClick={() => setSearchParams({ section: "artists" })}>Artistas</button> : null}
            {isAdmin ? <button className={`chip ${activeSection === "regions" ? "active" : ""}`} onClick={() => setSearchParams({ section: "regions" })}>Regioes</button> : null}
            {isAdmin ? <button className={`chip ${activeSection === "managers" ? "active" : ""}`} onClick={() => setSearchParams({ section: "managers" })}>Produtores</button> : null}
            {isAdmin ? <button className={`chip ${activeSection === "claims" ? "active" : ""}`} onClick={() => setSearchParams({ section: "claims" })}>Reivindicacoes</button> : null}
            <button className={`chip ${activeSection === "events" ? "active" : ""}`} onClick={() => setSearchParams({ section: "events" })}>Eventos</button>
            <button className="chip" onClick={clearAdminFilters}>Limpar filtros</button>
          </aside>
          <div className="ads-content">
            <div className="chip-row admin-filter-row">
              <button className={`chip ${regionFilter === "" ? "active" : ""}`} onClick={() => setRegionFilter("")}>Todas</button>
              {regions.map((region) => (
                <button key={region} className={`chip ${regionFilter === region ? "active" : ""}`} onClick={() => setRegionFilter(region)}>
                  {region}
                </button>
              ))}
            </div>

            <div className="admin-kpis">
              {showVenues ? <article className="clean-card"><h4>Casas</h4><p>{filteredVenues.length}</p></article> : null}
              {showArtists ? <article className="clean-card"><h4>Artistas</h4><p>{filteredArtists.length}</p></article> : null}
              {showEvents ? <article className="clean-card"><h4>Eventos</h4><p>{filteredEvents.length}</p></article> : null}
              {showManagers ? <article className="clean-card"><h4>Produtores</h4><p>{totalManagers}</p></article> : null}
              {showClaims ? <article className="clean-card"><h4>Reivindicacoes</h4><p>{pendingClaimsCount} pendentes</p></article> : null}
              {showAdminRegions ? <article className="clean-card"><h4>Regioes</h4><p>{adminRegions.length}</p></article> : null}
              {showOverview ? <article className="clean-card"><h4>Casas</h4><p>{filteredVenues.length}</p></article> : null}
              {showOverview ? <article className="clean-card"><h4>Artistas</h4><p>{filteredArtists.length}</p></article> : null}
              {showOverview ? <article className="clean-card"><h4>Eventos</h4><p>{filteredEvents.length}</p></article> : null}
              {showOverview ? <article className="clean-card"><h4>Reivindicacoes</h4><p>{pendingClaimsCount} pendentes</p></article> : null}
            </div>
            {showOverview ? (
              <article className="clean-card admin-overview-card">
                <h4>Visao Geral</h4>
                <p className="meta-line">Use o menu lateral para abrir Casas, Artistas, Produtores, Reivindicacoes e Eventos sem rolagem infinita.</p>
              </article>
            ) : null}
          </div>
        </div>
      ) : isHouseProgramacaoClean ? (
        <div className="ads-content">
          <div className="admin-kpis">
            <article className="clean-card"><h4>Eventos</h4><p>{filteredEvents.length}</p></article>
          </div>
        </div>
      ) : (
        <div className="ads-layout">
          <aside className="ads-sidebar">
            <button className={`chip ${activeSection === "overview" ? "active" : ""}`} onClick={() => setSearchParams({ section: "overview" })}>
              Visao Geral
            </button>
            <button className={`chip ${activeSection === "events" ? "active" : ""}`} onClick={() => setSearchParams({ section: "events" })}>
              Eventos
            </button>
            <button className={`chip ${activeSection === "profile" ? "active" : ""}`} onClick={() => setSearchParams({ section: "profile" })}>
              Dados da Casa
            </button>
            <button className={`chip ${activeSection === "managers" ? "active" : ""}`} onClick={() => setSearchParams({ section: "managers" })}>
              Produtores
            </button>
            <button className={`chip ${activeSection === "claims" ? "active" : ""}`} onClick={() => setSearchParams({ section: "claims" })}>
              Solicitar Acesso
            </button>
            <button className="chip" onClick={clearAdminFilters}>Limpar filtros</button>
          </aside>
          <div className="ads-content">
            <div className="admin-kpis">
              {showOverview ? <article className="clean-card"><h4>Casa em foco</h4><p>{houseDisplayName || "Sem unidade ativa"}</p></article> : null}
              {showOverview ? <article className="clean-card"><h4>Eventos da casa</h4><p>{houseEvents.length}</p></article> : null}
              {showOverview ? <article className="clean-card"><h4>Hoje</h4><p>{houseTodayEventsCount} evento(s)</p></article> : null}
              {showOverview ? <article className="clean-card"><h4>Solicitacoes</h4><p>{pendingMyHouseClaims} pendente(s)</p></article> : null}
              {showOverview ? <article className="clean-card"><h4>Impressoes (30d)</h4><p>{houseAdsSummary?.summary?.impressions ?? 0}</p></article> : null}
              {showOverview ? <article className="clean-card"><h4>Cliques (30d)</h4><p>{houseAdsSummary?.summary?.clicks ?? 0}</p></article> : null}
              {showOverview ? <article className="clean-card"><h4>CTR (30d)</h4><p>{houseAdsSummary?.summary?.ctr ?? 0}%</p></article> : null}
              {showEvents && !isHouseProgramacaoClean ? <article className="clean-card"><h4>Eventos</h4><p>{filteredEvents.length}</p></article> : null}
              {showHouseProfile ? <article className="clean-card"><h4>Dados da Casa</h4><p>{houseDisplayName || "Sem unidade ativa"}</p></article> : null}
              {showManagers ? <article className="clean-card"><h4>Produtores</h4><p>{totalManagers}</p></article> : null}
              {showHouseClaims ? <article className="clean-card"><h4>Solicitacoes</h4><p>{myClaims.filter((c) => c.status === "pending").length} pendentes</p></article> : null}
            </div>
            {showEvents && !isHouseProgramacaoClean ? <div className="admin-content-divider" /> : null}
          </div>
        </div>
      )}

      <div className={`admin-section-stack${isHouseRole ? " house-section-stack" : ""}${isHouseRole && (showOverview || showEvents) ? " no-divider" : ""}${isHouseProgramacaoClean ? " house-events-focus" : ""}`}>
      {showOverview && isHouseRole ? (
        <>
          {!houseActiveVenue ? (
            <p className="empty">Sem filial aprovada. Abra "Solicitar Acesso" no menu lateral para liberar a operacao.</p>
          ) : null}
          {houseActiveVenue ? (
            <>
              {houseAdsLoading ? <p className="empty">Carregando metricas de anuncios...</p> : null}
            </>
          ) : null}
        </>
      ) : null}

      {showVenues && isProducer ? (
        <article className="danger-zone-card">
          <h3>Zona de Perigo</h3>
          <p className="meta-line">Remova uma casa da sua carteira sem apagar a casa da plataforma.</p>
          {venues.length === 0 ? (
            <p className="empty">Nenhuma casa vinculada para revogar.</p>
          ) : (
            <div className="danger-zone-list">
              {venues.map((venue) => (
                <div key={`danger-producer-${venue.id}`} className="danger-zone-item">
                  <span>{venue.name} - {venue.region}</span>
                  <button
                    type="button"
                    className="chip chip-danger"
                    onClick={() => handleVenueDelete(venue.id)}
                    disabled={deleteVenueMutation.isPending}
                  >
                    Abrir mao da casa
                  </button>
                </div>
              ))}
            </div>
          )}
        </article>
      ) : null}
      {showVenues ? <h3 className="section-title">Casas</h3> : null}
      {showVenues && canManageCatalog ? <form className="venue-form" onSubmit={handleVenueSubmit}>
        <input name="name" value={venueForm.name} onChange={handleVenueChange} placeholder="Nome da casa" required />
        {venueErrors.name?.[0] ? <p className="field-error">{venueErrors.name[0]}</p> : null}
        <input name="description" value={venueForm.description} onChange={handleVenueChange} placeholder="Descricao" required />
        {venueErrors.description?.[0] ? <p className="field-error">{venueErrors.description[0]}</p> : null}
        <input name="contactName" value={venueForm.contactName} onChange={handleVenueChange} placeholder="Responsavel da casa (opcional)" />
        <input name="contactPhone" value={venueForm.contactPhone} onChange={handleVenueChange} placeholder="Telefone da casa (opcional)" />
        <input name="instagramUrl" value={venueForm.instagramUrl} onChange={handleVenueChange} placeholder="Instagram da casa (URL, opcional)" />
        <input name="address" value={venueForm.address} onChange={handleVenueChange} placeholder="Endereco" required />
        <input name="neighborhood" value={venueForm.neighborhood} onChange={handleVenueChange} placeholder="Bairro" required />
        <select name="region" value={venueForm.region} onChange={handleVenueChange} required>
          <option value="">Regiao</option>
          {venueRegionOptions.map((regionName) => (
            <option key={`region-option-create-${regionName}`} value={regionName}>
              {regionName}
            </option>
          ))}
        </select>
        <input name="city" value={venueForm.city} onChange={handleVenueChange} placeholder="Cidade" required />
        <input name="state" value={venueForm.state} onChange={handleVenueChange} placeholder="UF" maxLength={2} required />
        <input name="imageUrl" value={venueForm.imageUrl} onChange={handleVenueChange} placeholder="URL da imagem" />
        <label className="checkbox-inline">
          <input
            type="checkbox"
            name="goldPartner"
            checked={Boolean(venueForm.goldPartner)}
            onChange={handleVenueChange}
          />
          Casa Gold Partner
        </label>
        <label className="meta-line">
          Upload da imagem da casa (JPG, PNG ou WebP, ate 5MB)
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => handleImageUpload(event, "venue")}
            disabled={uploadingTarget === "venue"}
          />
        </label>
        {uploadingTarget === "venue" ? <p className="meta-line">Enviando imagem...</p> : null}
        <input
          name="openDays"
          value={venueForm.openDays}
          onChange={handleVenueChange}
          placeholder="Dias de funcionamento (ex: Seg, Qua, Sex, Sab)"
        />
        {!isAdmin && isEditingVenue ? (
          <textarea
            value={venueEditJustification}
            onChange={(e) => setVenueEditJustification(e.target.value)}
            placeholder="Justificativa obrigatoria para enviar alteracoes ao admin"
            rows={2}
            required
          />
        ) : null}
        <div className="form-actions-inline">
          <button
            className="btn-primary"
            type="submit"
            disabled={createVenueMutation.isPending || updateVenueMutation.isPending || (isProducer && !isEditingVenue)}
          >
            {isEditingVenue
              ? (isAdmin ? "Salvar casa" : "Enviar para aprovacao")
              : isAdmin
                ? "Criar casa"
                : "Selecione uma casa para editar"}
          </button>
          {isEditingVenue ? <button type="button" className="chip" onClick={resetVenueForm}>Cancelar</button> : null}
        </div>
      </form> : null}

      {showVenues && venuesLoading ? <p className="empty">Carregando casas...</p> : null}
      {showVenues ? <div className="admin-list-header">
        <strong>Casas cadastradas ({filteredVenues.length})</strong>
        <div className="admin-actions-row admin-filter-row">
          <button className="chip" onClick={exportVenuesCsv}>Exportar CSV</button>
        </div>
        <select value={venueSort} onChange={(e) => setVenueSort(e.target.value)}>
          <option value="recent">Mais recentes</option>
          <option value="az">A-Z</option>
        </select>
        <input
          className="search-input"
          placeholder="Buscar casa por nome, bairro ou regiao..."
          value={venueSearch}
          onChange={(e) => setVenueSearch(e.target.value)}
        />
      </div> : null}
      {showVenues && !venuesLoading && filteredVenues.length === 0 ? (
        <p className="empty">Nenhuma casa encontrada para esta busca. <button className="btn-link" onClick={clearAdminFilters}>Limpar filtros</button></p>
      ) : null}
      {showVenues ? <div className="venue-list admin-entity-grid">
        {pagedVenues.map((venue) => (
          <article key={venue.id} className="venue-card">
            <div>
              <h3>{venue.name}</h3>
              <p className="meta-line">{venue.neighborhood} - {venue.region}</p>
              <p className="meta-line">Eventos vinculados: {venue.eventsCount}</p>
              {venue.contactName ? <p className="meta-line">Responsavel: {venue.contactName}</p> : null}
              {venue.contactPhone ? <p className="meta-line">Telefone: {venue.contactPhone}</p> : null}
              {Array.isArray(venue.openDays) && venue.openDays.length > 0 ? (
                <p className="meta-line">Funciona: {venue.openDays.join(", ")}</p>
              ) : null}
            </div>
            <div className="venue-actions">
              <button className="chip" onClick={() => handleVenueEdit(venue)}>Editar</button>
              <button className="chip" onClick={() => handleVenueDelete(venue.id)} disabled={deleteVenueMutation.isPending}>
                {isProducer ? "Remover da carteira" : "Excluir"}
              </button>
            </div>
          </article>
        ))}
      </div> : null}
      {showVenues && venueTotalPages > 1 ? (
        <div className="pagination-row">
          <button className="chip" onClick={() => setVenuePage((p) => Math.max(1, p - 1))} disabled={venuePage === 1}>Anterior</button>
          <small className="meta-line">Pagina {venuePage} de {venueTotalPages}</small>
          <button className="chip" onClick={() => setVenuePage((p) => Math.min(venueTotalPages, p + 1))} disabled={venuePage === venueTotalPages}>Proxima</button>
        </div>
      ) : null}

      {showManagers ? <h3 className="section-title">Produtores por Casa</h3> : null}
      {showManagers && canManageProducers ? <form className="venue-form" onSubmit={handleCreateManager}>
        <input
          name="firstName"
          value={managerForm.firstName}
          onChange={handleManagerFormChange}
          placeholder="Nome do produtor"
          required
        />
        <input
          name="lastName"
          value={managerForm.lastName}
          onChange={handleManagerFormChange}
          placeholder="Sobrenome do produtor"
          required
        />
        <input
          name="username"
          value={managerForm.username}
          onChange={handleManagerFormChange}
          placeholder="Usuario de acesso"
          required
        />
        <input
          name="email"
          type="email"
          value={managerForm.email}
          onChange={handleManagerFormChange}
          placeholder="Email do produtor"
          required
        />
        <input
          name="phone"
          value={managerForm.phone}
          onChange={handleManagerFormChange}
          placeholder="Telefone do produtor (opcional)"
        />
        <input
          name="password"
          type="password"
          value={managerForm.password}
          onChange={handleManagerFormChange}
          placeholder="Senha provisoria (min 6)"
          required
        />
        <div className="form-actions-inline">
          <button className="btn-primary" type="submit" disabled={createVenueManagerUserMutation.isPending}>
            {createVenueManagerUserMutation.isPending ? "Criando..." : "Criar produtor"}
          </button>
        </div>
      </form> : null}
      {showManagers && canManageProducers ? <form className="venue-form" onSubmit={handleAddManager}>
        {!isHouseRole ? (
          <select value={selectedVenueForManagers} onChange={(e) => setSelectedVenueForManagers(e.target.value)} required>
            <option value="">Selecione a casa</option>
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>{venue.name}</option>
            ))}
          </select>
        ) : (
          <input value={houseDisplayName || "Sua casa"} disabled readOnly />
        )}
        <input
          value={managerSearch}
          onChange={(e) => {
            setManagerSearch(e.target.value);
            setSelectedManagerUserId("");
          }}
          placeholder="Buscar produtor por nome, email ou usuario"
          required
        />
        <select
          value={selectedManagerUserId}
          onChange={(e) => setSelectedManagerUserId(e.target.value)}
          required
        >
          <option value="">Selecione o produtor</option>
          {managerCandidates.map((user) => (
            <option key={user.id} value={user.id}>
              {user.firstName} {user.lastName} - {user.email}
            </option>
          ))}
        </select>
        {managerCandidatesLoading ? <p className="empty">Buscando produtores...</p> : null}
        <div className="form-actions-inline">
          <button className="btn-primary" type="submit" disabled={addVenueManagerMutation.isPending}>
            Vincular produtor
          </button>
        </div>
      </form> : null}

      {showManagers && selectedVenueForManagers && managersLoading ? <p className="empty">Carregando produtores...</p> : null}
      {showManagers && selectedVenueForManagers ? (
        <div className="venue-list">
          {venueManagers.length === 0 ? <p className="empty">Nenhum produtor vinculado.</p> : null}
          {venueManagers.map((entry) => (
            <article key={entry.id} className="venue-card">
              <div>
                <h3>{entry.user.firstName} {entry.user.lastName}</h3>
                <p className="meta-line">{entry.user.email}</p>
                {entry.user.phone ? <p className="meta-line">Telefone: {entry.user.phone}</p> : null}
                <p className="meta-line">Perfil: {entry.user.role}</p>
              </div>
              <div className="venue-actions">
                <button
                  className="chip"
                  onClick={() => handleRemoveManager(entry.user.id)}
                  disabled={removeVenueManagerMutation.isPending}
                >
                  Remover
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {showClaims ? <h3 className="section-title">Reivindicacoes de produtores e casas</h3> : null}
      {showClaims ? (
        <div className="admin-actions-row">
          <button className={`chip ${claimViewFilter === "all" ? "active" : ""}`} onClick={() => setClaimViewFilter("all")}>Todas</button>
          <button className={`chip ${claimViewFilter === "pending_updates" ? "active" : ""}`} onClick={() => setClaimViewFilter("pending_updates")}>
            Pendentes de alteracao
          </button>
          <button className={`chip ${claimViewFilter === "pending_ownership" ? "active" : ""}`} onClick={() => setClaimViewFilter("pending_ownership")}>
            Pendentes de carteira
          </button>
        </div>
      ) : null}
      {showClaims && claimsLoading ? <p className="empty">Carregando reivindicacoes...</p> : null}
      {showClaims && !claimsLoading && filteredClaims.length === 0 ? <p className="empty">Nenhuma reivindicacao no filtro atual.</p> : null}
      {showClaims ? (
        <div className="venue-list">
          {filteredClaims.map((claim) => (
            <article key={claim.id} className={`venue-card claim-card claim-status-${claim.status}`}>
              <div>
                <h3>{claim.targetType === "venue" ? "Casa" : "Artista"}: {claim.venue?.name || claim.artist?.name}</h3>
                <p className="meta-line">Produtor: {claim.requestedBy?.name || claim.requestedBy?.email}</p>
                <p className="meta-line">Tipo: {claim.requestType === "venue_update" ? "Alteracao de dados da casa" : "Reivindicacao de carteira"}</p>
                <p className="meta-line">Status: {claim.status}</p>
                {claim.venue?.contactName ? <p className="meta-line">Responsavel da casa: {claim.venue.contactName}</p> : null}
                {claim.venue?.contactPhone ? <p className="meta-line">Telefone da casa: {claim.venue.contactPhone}</p> : null}
                {claim.justification ? <p className="meta-line">Motivo: {claim.justification}</p> : null}
                {claim.requestType === "ownership" ? (
                  <div className="claim-evidence-block">
                    <p className="meta-line"><strong>Atencao: validar prova de propriedade antes de aprovar.</strong></p>
                    {claim.evidence?.responsibleName ? <p className="meta-line">Responsavel legal: {claim.evidence.responsibleName}</p> : null}
                    {claim.evidence?.responsiblePhone ? <p className="meta-line">Telefone do solicitante: {claim.evidence.responsiblePhone}</p> : null}
                    {claim.evidence?.claimantDocument ? <p className="meta-line">Documento (CNPJ/CPF): {claim.evidence.claimantDocument}</p> : null}
                    {claim.evidence?.relationshipRole ? <p className="meta-line">Vinculo declarado: {claim.evidence.relationshipRole}</p> : null}
                    {claim.evidence?.officialEmail ? <p className="meta-line">Email oficial: {claim.evidence.officialEmail}</p> : null}
                    {claim.evidence?.officialInstagram ? <p className="meta-line">Instagram oficial: {claim.evidence.officialInstagram}</p> : null}
                    {claim.evidence?.officialWebsite ? <p className="meta-line">Site oficial: {claim.evidence.officialWebsite}</p> : null}
                  </div>
                ) : null}
                {claim.requestType === "venue_update" && claim.requestedChanges ? (
                  <p className="meta-line">Resumo da alteracao: {Object.keys(claim.requestedChanges).join(", ")}</p>
                ) : null}
              </div>
              {claim.status === "pending" ? (
                <div className="venue-actions">
                  <button className="chip" onClick={() => handleClaimDecision(claim.id, "approved")} disabled={decideClaimMutation.isPending}>Aprovar</button>
                  <button className="chip" onClick={() => handleClaimDecision(claim.id, "rejected")} disabled={decideClaimMutation.isPending}>Rejeitar</button>
                </div>
              ) : (
                <div className="venue-actions">
                  <small className="meta-line">{claim.reviewedBy?.name || "Decidido"}</small>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : null}

      {showAdminRegions ? <h3 className="section-title">Regioes</h3> : null}
      {showAdminRegions ? (
        <p className="meta-line">Gerencie as regioes que alimentam filtros de cidade e cadastro de casas.</p>
      ) : null}
      {showAdminRegions ? (
        <article className="danger-zone-card">
          <h3>Zonas cadastradas</h3>
          <p className="meta-line">Hover vermelho apenas nas zonas sem casas vinculadas (prontas para exclusao).</p>
          <div className="region-demo-grid">
            {adminRegions.map((item) => {
              const isDeletable = (item.venuesCount || 0) === 0;
              return (
                <button
                  key={`region-demo-${item.id}`}
                  type="button"
                  className={`region-demo-chip ${isDeletable ? "is-deletable" : "is-locked"}`}
                  onClick={() => (isDeletable && !item.readOnly ? handleRegionDelete(item) : null)}
                  title={
                    item.readOnly
                      ? "Regiao legada: crie uma regiao oficial para gerenciar exclusao."
                      : isDeletable
                        ? "Pronta para exclusao"
                        : "Com casas vinculadas"
                  }
                >
                  <span>{item.name}</span>
                  {isDeletable && !item.readOnly ? <strong>x</strong> : null}
                </button>
              );
            })}
          </div>
        </article>
      ) : null}
      {showAdminRegions ? (
        <form className="venue-form" onSubmit={handleRegionSubmit}>
          <input
            name="name"
            value={regionForm.name}
            onChange={handleRegionFormChange}
            placeholder="Regiao"
            required
          />
          <input
            name="city"
            value={regionForm.city}
            onChange={handleRegionFormChange}
            placeholder="Cidade"
            required
          />
          <input
            name="state"
            value={regionForm.state}
            onChange={handleRegionFormChange}
            placeholder="UF"
            maxLength={2}
            required
          />
          <input
            name="sortOrder"
            type="number"
            min="0"
            value={regionForm.sortOrder}
            onChange={handleRegionFormChange}
            placeholder="Ordem"
          />
          <label className="meta-line form-checkbox-inline">
            <input
              type="checkbox"
              name="isActive"
              checked={Boolean(regionForm.isActive)}
              onChange={handleRegionFormChange}
            />
            Regiao ativa
          </label>
          <div className="form-actions-inline">
            <button
              className="btn-primary"
              type="submit"
              disabled={createRegionMutation.isPending || updateRegionMutation.isPending}
            >
              {isEditingRegion ? "Salvar regiao" : "Criar regiao"}
            </button>
            {isEditingRegion ? (
              <button type="button" className="chip" onClick={resetRegionForm}>
                Cancelar
              </button>
            ) : null}
          </div>
        </form>
      ) : null}
      {showAdminRegions ? (
        <div className="venue-list admin-entity-grid">
          {adminRegions.map((item) => (
            <article
              key={item.id}
              className={`venue-card region-admin-card ${(item.venuesCount || 0) === 0 ? "is-deletable" : "is-locked"}`}
            >
              <div>
                <h3>{item.name}</h3>
                <p className="meta-line">{item.city} - {item.state}</p>
                <p className="meta-line">Ordem: {item.sortOrder}</p>
                <p className="meta-line">Status: {item.isActive ? "Ativa" : "Inativa"}</p>
                <p className="meta-line">Casas vinculadas: {item.venuesCount || 0}</p>
                {item.readOnly ? <p className="meta-line">Origem: legado (vinda das casas cadastradas)</p> : null}
                {item.source === "base" ? <p className="meta-line">Origem: base padrao da cidade (somente leitura)</p> : null}
              </div>
              <div className="venue-actions">
                <button className="chip" onClick={() => handleRegionEdit(item)} disabled={Boolean(item.readOnly)}>Editar</button>
                <button
                  className="chip"
                  onClick={() => handleRegionDelete(item)}
                  disabled={Boolean(item.readOnly) || deleteRegionMutation.isPending || (item.venuesCount || 0) > 0}
                  title={
                    item.readOnly
                      ? "Regiao legada: cadastre em Regioes para editar/excluir."
                      : (item.venuesCount || 0) > 0
                        ? "Remova as casas vinculadas antes de excluir."
                        : "Excluir regiao"
                  }
                >
                  Excluir
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {showHouseProfile ? <h3 className="section-title">{`Dados da casa - ${houseDisplayName || "sem unidade ativa"}`}</h3> : null}
      {showHouseProfile ? (
        <p className="meta-line">Confira os dados publicados da sua casa. Para ajustar qualquer campo, envie uma solicitacao para aprovacao do admin.</p>
      ) : null}
      {showHouseProfile && !houseActiveVenue ? (
        <p className="empty">Nenhuma filial aprovada para esta conta. Solicite acesso na aba "Solicitar Acesso".</p>
      ) : null}
      {showHouseProfile && houseActiveVenue ? (
        <>
          <article className="clean-card">
            <p className="meta-line"><strong>Nome:</strong> {houseActiveVenue.name}</p>
            <p className="meta-line"><strong>Responsavel:</strong> {houseActiveVenue.contactName || "Nao informado"}</p>
            <p className="meta-line"><strong>Telefone:</strong> {houseActiveVenue.contactPhone || "Nao informado"}</p>
            <p className="meta-line"><strong>Instagram:</strong> {houseActiveVenue.instagramUrl || "Nao informado"}</p>
            <p className="meta-line"><strong>Endereco:</strong> {houseActiveVenue.address}</p>
            <p className="meta-line"><strong>Bairro/Regiao:</strong> {houseActiveVenue.neighborhood} - {houseActiveVenue.region}</p>
            <p className="meta-line"><strong>Cidade:</strong> {houseActiveVenue.city} - {houseActiveVenue.state}</p>
            <p className="meta-line"><strong>Funcionamento:</strong> {(houseActiveVenue.openDays || []).join(", ") || "Nao informado"}</p>
            <div className="form-actions-inline">
              <button className="chip" type="button" onClick={startHouseProfileEdit}>Solicitar alteracao de dados</button>
            </div>
          </article>
          <article className="danger-zone-card">
            <h3>Zona de Perigo</h3>
            <p className="meta-line">Se necessario, abra mao da propriedade desta filial na sua conta.</p>
            <div className="danger-zone-list">
              <div className="danger-zone-item">
                <span>{houseActiveVenue.name} - {houseActiveVenue.region}</span>
                <button
                  type="button"
                  className="chip chip-danger"
                  onClick={() => handleRevokeMyHouseAccess(houseActiveVenue.id, houseActiveVenue.name)}
                  disabled={revokeMyVenueAccessMutation.isPending}
                >
                  Abrir mao da filial
                </button>
              </div>
            </div>
          </article>
          {isEditingVenue ? (
            <form className="venue-form" onSubmit={handleVenueSubmit}>
              <input name="name" value={venueForm.name} onChange={handleVenueChange} placeholder="Nome da casa" required />
              <input name="description" value={venueForm.description} onChange={handleVenueChange} placeholder="Descricao" required />
              <input name="contactName" value={venueForm.contactName} onChange={handleVenueChange} placeholder="Responsavel da casa" />
              <input name="contactPhone" value={venueForm.contactPhone} onChange={handleVenueChange} placeholder="Telefone da casa" />
              <input name="instagramUrl" value={venueForm.instagramUrl} onChange={handleVenueChange} placeholder="Instagram (URL)" />
              <input name="address" value={venueForm.address} onChange={handleVenueChange} placeholder="Endereco" required />
              <input name="neighborhood" value={venueForm.neighborhood} onChange={handleVenueChange} placeholder="Bairro" required />
              <select name="region" value={venueForm.region} onChange={handleVenueChange} required>
                <option value="">Regiao</option>
                {venueRegionOptions.map((regionName) => (
                  <option key={`region-option-edit-${regionName}`} value={regionName}>
                    {regionName}
                  </option>
                ))}
              </select>
              <input name="city" value={venueForm.city} onChange={handleVenueChange} placeholder="Cidade" required />
              <input name="state" value={venueForm.state} onChange={handleVenueChange} placeholder="UF" maxLength={2} required />
              <input name="imageUrl" value={venueForm.imageUrl} onChange={handleVenueChange} placeholder="URL da imagem" />
              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  name="goldPartner"
                  checked={Boolean(venueForm.goldPartner)}
                  onChange={handleVenueChange}
                />
                Casa Gold Partner
              </label>
              <label className="meta-line">
                Upload da imagem da casa (JPG, PNG ou WebP, ate 5MB)
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => handleImageUpload(event, "venue")}
                  disabled={uploadingTarget === "venue"}
                />
              </label>
              {uploadingTarget === "venue" ? <p className="meta-line">Enviando imagem...</p> : null}
              <input name="openDays" value={venueForm.openDays} onChange={handleVenueChange} placeholder="Dias de funcionamento (ex: Seg, Qua, Sex, Sab)" />
              <textarea
                value={venueEditJustification}
                onChange={(e) => setVenueEditJustification(e.target.value)}
                placeholder="Explique por que esta alteracao e necessaria (obrigatorio)"
                rows={2}
                required
              />
              <div className="form-actions-inline">
                <button className="btn-primary" type="submit" disabled={createClaimMutation.isPending}>Enviar solicitacao</button>
                <button type="button" className="chip" onClick={resetVenueForm}>Cancelar</button>
              </div>
            </form>
          ) : null}
        </>
      ) : null}

      {showHouseClaims ? <h3 className="section-title">Solicitar acesso a filial</h3> : null}
      {showHouseClaims ? (
        <p className="meta-line">Escolha a filial cadastrada no NaPalma e envie comprovacao de vinculo. O admin vai revisar e aprovar.</p>
      ) : null}
      {showHouseClaims ? (
        <form className="venue-form" onSubmit={handleHouseOwnershipClaimSubmit}>
          <select value={houseClaimTargetId} onChange={(e) => setHouseClaimTargetId(e.target.value)} required>
            <option value="">Selecione a filial que voce quer operar</option>
            {houseClaimOptions.map((venue) => (
              <option key={venue.id} value={venue.id}>{venue.name} - {venue.region}</option>
            ))}
          </select>
          <input value={houseClaimResponsibleName} onChange={(e) => setHouseClaimResponsibleName(e.target.value)} placeholder="Nome do responsavel legal" required />
          <input value={houseClaimResponsiblePhone} onChange={(e) => setHouseClaimResponsiblePhone(e.target.value)} placeholder="Telefone de contato" required />
          <input value={houseClaimDocument} onChange={(e) => setHouseClaimDocument(e.target.value)} placeholder="CNPJ/CPF do solicitante" required />
          <input value={houseClaimRelationship} onChange={(e) => setHouseClaimRelationship(e.target.value)} placeholder="Vinculo com a filial (socio, diretor, representante...)" required />
          <textarea value={houseClaimJustification} onChange={(e) => setHouseClaimJustification(e.target.value)} placeholder="Justificativa da solicitacao (ex: sou responsavel pela agenda e operacao da casa)" rows={2} required />
          <input type="email" value={houseClaimOfficialEmail} onChange={(e) => setHouseClaimOfficialEmail(e.target.value)} placeholder="Email oficial (opcional)" />
          <input value={houseClaimOfficialInstagram} onChange={(e) => setHouseClaimOfficialInstagram(e.target.value)} placeholder="Instagram oficial (opcional)" />
          <input type="url" value={houseClaimOfficialWebsite} onChange={(e) => setHouseClaimOfficialWebsite(e.target.value)} placeholder="Site oficial (opcional)" />
          <button className="btn-primary" type="submit" disabled={createClaimMutation.isPending}>
            {createClaimMutation.isPending ? "Enviando..." : "Enviar solicitacao de acesso"}
          </button>
        </form>
      ) : null}
      {showHouseClaims && houseClaimOptions.length === 0 ? (
        <p className="empty">No momento nao ha novas filiais disponiveis para esta conta.</p>
      ) : null}
      {showHouseClaims && myClaimsLoading ? <p className="empty">Carregando suas solicitacoes...</p> : null}
      {showHouseClaims ? (
        <div className="venue-list">
          {myClaims
            .filter((claim) => claim.targetType === "venue")
            .map((claim) => (
              <article key={claim.id} className={`venue-card claim-card claim-status-${claim.status}`}>
                <div>
                  <h3>Filial: {claim.venue?.name || "Casa"}</h3>
                  <p className="meta-line">Status: {claim.status}</p>
                  <p className="meta-line">Tipo: {claim.requestType === "ownership" ? "Reivindicacao de propriedade" : "Alteracao de dados"}</p>
                  {claim.justification ? <p className="meta-line">Justificativa: {claim.justification}</p> : null}
                </div>
                <small className="meta-line">{new Date(claim.createdAt).toLocaleString("pt-BR")}</small>
              </article>
            ))}
        </div>
      ) : null}

      {showArtists ? <h3 className="section-title">Artistas</h3> : null}
      {showArtists && canManageCatalog ? <form className="venue-form" onSubmit={handleArtistSubmit}>
        <input name="name" value={artistForm.name} onChange={handleArtistChange} placeholder="Nome do artista" required />
        {artistErrors.name?.[0] ? <p className="field-error">{artistErrors.name[0]}</p> : null}
        <textarea name="bio" value={artistForm.bio} onChange={handleArtistChange} placeholder="Bio" rows={2} />
        <input name="contactName" value={artistForm.contactName} onChange={handleArtistChange} placeholder="Responsavel do artista (opcional)" />
        <input name="contactPhone" value={artistForm.contactPhone} onChange={handleArtistChange} placeholder="Telefone do artista (opcional)" />
        <input name="genres" value={artistForm.genres} onChange={handleArtistChange} placeholder="Generos separados por virgula" />
        {isAdmin ? (
          <label className="meta-line form-checkbox-inline">
            <input
              type="checkbox"
              name="isVerified"
              checked={Boolean(artistForm.isVerified)}
              onChange={handleArtistChange}
            />
            Perfil oficial verificado
          </label>
        ) : null}
        <input name="imageUrl" type="url" value={artistForm.imageUrl} onChange={handleArtistChange} placeholder="URL da imagem" />
        <label className="meta-line">
          Upload da imagem do artista (JPG, PNG ou WebP, ate 5MB)
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => handleImageUpload(event, "artist")}
            disabled={uploadingTarget === "artist"}
          />
        </label>
        {uploadingTarget === "artist" ? <p className="meta-line">Enviando imagem...</p> : null}
        <input name="spotifyUrl" type="url" value={artistForm.spotifyUrl} onChange={handleArtistChange} placeholder="URL Spotify" />
        <input name="youtubeUrl" type="url" value={artistForm.youtubeUrl} onChange={handleArtistChange} placeholder="URL YouTube" />
        <input name="instagramUrl" type="url" value={artistForm.instagramUrl} onChange={handleArtistChange} placeholder="URL Instagram" />
        <div className="form-actions-inline">
          <button
            className="btn-primary"
            type="submit"
            disabled={createArtistMutation.isPending || updateArtistMutation.isPending || (isProducer && !isEditingArtist)}
          >
            {isEditingArtist ? "Salvar artista" : isAdmin ? "Criar artista" : "Selecione um artista para editar"}
          </button>
          {isEditingArtist ? <button type="button" className="chip" onClick={resetArtistForm}>Cancelar</button> : null}
        </div>
      </form> : null}

      {showArtists && artistsLoading ? <p className="empty">Carregando artistas...</p> : null}
      {showArtists ? <div className="admin-list-header">
        <strong>Artistas cadastrados ({filteredArtists.length})</strong>
        <div className="admin-actions-row">
          <button className="chip" onClick={exportArtistsCsv}>Exportar CSV</button>
        </div>
        <select value={artistSort} onChange={(e) => setArtistSort(e.target.value)}>
          <option value="recent">Mais recentes</option>
          <option value="az">A-Z</option>
        </select>
        <input
          className="search-input"
          placeholder="Buscar artista por nome..."
          value={artistSearch}
          onChange={(e) => setArtistSearch(e.target.value)}
        />
      </div> : null}
      {showArtists && !artistsLoading && filteredArtists.length === 0 ? (
        <p className="empty">Nenhum artista encontrado para esta busca. <button className="btn-link" onClick={clearAdminFilters}>Limpar filtros</button></p>
      ) : null}
      {showArtists ? <div className="venue-list admin-entity-grid">
        {pagedArtists.map((artist) => (
          <article key={artist.id} className="venue-card">
            <div>
              <h3>{artist.name}</h3>
              {artist.isVerified ? (
                <p className="meta-line artist-inline-with-badge">
                  <span>Perfil oficial verificado</span>
                  <VerifiedBadge className="artist-verified-dot" title="Artista verificado" />
                </p>
              ) : null}
              <p className="meta-line">Generos: {artist.genres.join(", ")}</p>
              {artist.contactName ? <p className="meta-line">Responsavel: {artist.contactName}</p> : null}
              {artist.contactPhone ? <p className="meta-line">Telefone: {artist.contactPhone}</p> : null}
              <p className="meta-line">Eventos vinculados: {artist.eventsCount}</p>
            </div>
            <div className="venue-actions">
              <button className="chip" onClick={() => handleArtistEdit(artist)}>Editar</button>
              <button className="chip" onClick={() => handleArtistDelete(artist.id)} disabled={deleteArtistMutation.isPending}>Excluir</button>
            </div>
          </article>
        ))}
      </div> : null}
      {showArtists && artistTotalPages > 1 ? (
        <div className="pagination-row">
          <button className="chip" onClick={() => setArtistPage((p) => Math.max(1, p - 1))} disabled={artistPage === 1}>Anterior</button>
          <small className="meta-line">Pagina {artistPage} de {artistTotalPages}</small>
          <button className="chip" onClick={() => setArtistPage((p) => Math.min(artistTotalPages, p + 1))} disabled={artistPage === artistTotalPages}>Proxima</button>
        </div>
      ) : null}

      {showEventsBlocked ? (
        <p className="empty">Sua conta ainda nao tem filial aprovada. Abra "Solicitar Acesso", envie os dados de comprovacao e aguarde aprovacao do admin.</p>
      ) : null}
      {showEvents ? <h3 className="section-title">{isHouseRole ? `Eventos da casa - ${houseDisplayName}` : "Eventos"}</h3> : null}
      {showEvents && (!isHouseRole || !isHouseProgramacaoClean) ? (
        <article className="venue-card">
          <div>
            <h3>Previa do card</h3>
            <h3>{eventForm.title?.trim() || "Titulo do evento"}</h3>
            {eventForm.artistName?.trim() ? (
              <p className="meta-line artist-inline-with-badge">
                <span>{eventForm.artistName.trim()}</span>
              </p>
            ) : null}
            <p className="meta-line">{previewVenue?.name || "Casa"} - {previewVenue?.region || "Regiao"}</p>
            <p className="meta-line">{formatPreviewDateTime(eventForm.startDate)}</p>
            <p className="meta-line">{previewPriceLabel}</p>
          </div>
        </article>
      ) : null}
      {showEvents && (!isHouseRole || !isHouseProgramacaoClean) ? <form className="venue-form" onSubmit={handleEventSubmit}>
        <input
          name="title"
          value={eventForm.title}
          onChange={handleEventChange}
          placeholder="Titulo do evento (ou artista, se for show solo)"
          required
        />
        {eventErrors.title?.[0] ? <p className="field-error">{eventErrors.title[0]}</p> : null}
        <input name="artistName" list="artists-list" value={eventForm.artistName} onChange={handleEventChange} placeholder="Artista principal (opcional)" />
        <datalist id="artists-list">
          {artists.map((artist) => (
            <option key={artist.id} value={artist.name} />
          ))}
        </datalist>
        {eventErrors.artistName?.[0] ? <p className="field-error">{eventErrors.artistName[0]}</p> : null}
        <textarea name="description" value={eventForm.description} onChange={handleEventChange} placeholder="Descricao" rows={3} required />
        {eventErrors.description?.[0] ? <p className="field-error">{eventErrors.description[0]}</p> : null}
        <select name="type" value={eventForm.type} onChange={handleEventChange} required>
          <option value="roda_samba">Roda de Samba</option>
          <option value="pagode">Pagode</option>
          <option value="gafieira">Gafieira</option>
          <option value="samba_rock">Samba Rock</option>
          <option value="feijoada_sambista">Samba com Feijoada</option>
        </select>
        <select
          name="venueId"
          value={eventForm.venueId}
          onChange={handleEventChange}
          required
          disabled={isHouseRole}
        >
          <option value="">Selecione a casa</option>
          {venues.map((venue) => (
            <option key={venue.id} value={venue.id}>{venue.name}</option>
          ))}
        </select>
        {eventErrors.venueId?.[0] ? <p className="field-error">{eventErrors.venueId[0]}</p> : null}
        <input name="startDate" type="datetime-local" value={eventForm.startDate} onChange={handleEventChange} required />
        {eventErrors.startDate?.[0] ? <p className="field-error">{eventErrors.startDate[0]}</p> : null}
        <input name="endDate" type="datetime-local" value={eventForm.endDate} onChange={handleEventChange} required />
        {eventErrors.endDate?.[0] ? <p className="field-error">{eventErrors.endDate[0]}</p> : null}
        <label className="meta-line form-checkbox-inline">
          <input
            type="checkbox"
            name="isRecurring"
            checked={Boolean(eventForm.isRecurring)}
            onChange={handleEventChange}
          />
          Evento recorrente semanal
        </label>
        {eventForm.isRecurring ? (
          <div className="recurrence-panel">
            <small className="meta-line">
              {eventForm.recurrenceDays.length > 0
                ? `Recorrencia ativa: ${eventForm.recurrenceDays.join(", ")}`
                : "Selecione os dias da semana para repetir o evento."}
            </small>
            <div className="chip-row recurrence-day-row">
              {RECURRENCE_DAYS.map((day) => {
                const active = eventForm.recurrenceDays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    className={`chip recurrence-day-chip ${active ? "active" : ""}`}
                    onClick={() => toggleRecurrenceDay(day.value)}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
            {eventErrors.recurrenceDays?.[0] ? <p className="field-error">{eventErrors.recurrenceDays[0]}</p> : null}
            <div className="date-row">
              <input
                type="time"
                name="recurrenceStartTime"
                value={eventForm.recurrenceStartTime}
                onChange={handleEventChange}
                placeholder="Inicio recorrente"
              />
              <input
                type="time"
                name="recurrenceEndTime"
                value={eventForm.recurrenceEndTime}
                onChange={handleEventChange}
                placeholder="Fim recorrente"
              />
            </div>
            <input
              type="date"
              name="recurrenceUntil"
              value={eventForm.recurrenceUntil}
              onChange={handleEventChange}
              placeholder="Recorrencia ate"
            />
            <input
              name="recurrenceExceptions"
              value={eventForm.recurrenceExceptions}
              onChange={handleEventChange}
              placeholder="Datas sem evento (AAAA-MM-DD, separadas por virgula)"
            />
          </div>
        ) : null}
        <select name="ticketType" value={eventForm.ticketType} onChange={handleEventChange} required>
          <option value="paid">Pago</option>
          <option value="free">Gratuito</option>
          <option value="consumacao">Consumacao</option>
        </select>
        {eventErrors.ticketType?.[0] ? <p className="field-error">{eventErrors.ticketType[0]}</p> : null}
        <input name="priceMin" type="number" min="0" step="0.01" value={eventForm.priceMin} onChange={handleEventChange} placeholder="Preco minimo" />
        <input name="priceMax" type="number" min="0" step="0.01" value={eventForm.priceMax} onChange={handleEventChange} placeholder="Preco maximo" />
        {eventErrors.priceMax?.[0] ? <p className="field-error">{eventErrors.priceMax[0]}</p> : null}
        {eventForm.ticketType === "consumacao" ? (
          <input
            name="consumacaoValue"
            type="number"
            min="0"
            step="0.01"
            value={eventForm.consumacaoValue}
            onChange={handleEventChange}
            placeholder="Consumacao minima (opcional)"
          />
        ) : null}
        {eventErrors.consumacaoValue?.[0] ? <p className="field-error">{eventErrors.consumacaoValue[0]}</p> : null}
        <input
          name="couvertArtistico"
          type="number"
          min="0"
          step="0.01"
          value={eventForm.couvertArtistico}
          onChange={handleEventChange}
          placeholder="Couvert artistico (opcional)"
        />
        <input name="ticketUrl" type="url" value={eventForm.ticketUrl} onChange={handleEventChange} placeholder="URL de ingresso" />
        <input name="imageUrl" type="url" value={eventForm.imageUrl} onChange={handleEventChange} placeholder="URL da imagem" />
        <label className="meta-line">
          Upload da imagem do evento (JPG, PNG ou WebP, ate 5MB)
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => handleImageUpload(event, "event")}
            disabled={uploadingTarget === "event"}
          />
        </label>
        {uploadingTarget === "event" ? <p className="meta-line">Enviando imagem...</p> : null}
        <div className="audience-tag-panel">
          <small className="meta-line">Sinalizacoes do evento</small>
          <div className="chip-row recurrence-day-row">
            <button
              type="button"
              className={`chip recurrence-day-chip ${hasEventTag("samba_familiar") ? "active" : ""}`}
              onClick={() => toggleEventTag("samba_familiar")}
            >
              Samba Familiar
            </button>
            <button
              type="button"
              className={`chip recurrence-day-chip ${hasEventTag("kids_friendly") ? "active" : ""}`}
              onClick={() => toggleEventTag("kids_friendly")}
            >
              Kids Friendly
            </button>
          </div>
        </div>
        <input name="tags" value={eventForm.tags} onChange={handleEventChange} placeholder="Outras tags (opcional), separadas por virgula" />
        <div className="form-actions-inline">
          <button className="chip" type="submit" disabled={createEventMutation.isPending || updateEventMutation.isPending}>
            {isEditingEvent ? "Salvar rascunho" : "Criar rascunho"}
          </button>
          <button
            className="btn-primary publish-warning-btn"
            type="button"
            onClick={openPublishReview}
            disabled={createEventMutation.isPending || updateEventMutation.isPending}
          >
            Publicar evento
          </button>
          {isEditingEvent ? <button type="button" className="chip" onClick={resetEventForm}>Cancelar</button> : null}
        </div>
      </form> : null}
      {showEvents && publishReviewOpen ? (
        <div className="publish-review-overlay" role="dialog" aria-modal="true">
          <div className="publish-review-modal">
            <h4>Revisao obrigatoria antes de publicar</h4>
            <p className="meta-line">
              Marque todos os itens para liberar a publicacao deste evento.
            </p>
            <div className="publish-review-summary">
              <p><strong>Titulo:</strong> {eventForm.title || "-"}</p>
              <p><strong>Casa:</strong> {previewVenue?.name || "-"}</p>
              <p><strong>Inicio:</strong> {formatPreviewDateTime(eventForm.startDate)}</p>
              <p><strong>Fim:</strong> {formatPreviewDateTime(eventForm.endDate)}</p>
              <p><strong>Preco:</strong> {previewPriceLabel}</p>
            </div>
            <div className="publish-review-checks">
              {publishChecklistModel.map((item) => (
                <label key={item.key} className="publish-check-item">
                  <input
                    type="checkbox"
                    checked={Boolean(publishChecks[item.key])}
                    onChange={() => togglePublishCheck(item.key)}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
            <div className="form-actions-inline">
              <button type="button" className="chip" onClick={() => setPublishReviewOpen(false)}>
                Voltar
              </button>
              <button
                type="button"
                className="btn-primary publish-warning-btn"
                disabled={!publishChecklistDone || createEventMutation.isPending || updateEventMutation.isPending}
                onClick={confirmPublishEvent}
              >
                Publicar agora
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showEvents && eventsLoading ? <p className="empty">Carregando eventos...</p> : null}
      {showEvents ? <div className="admin-list-header">
        <strong>{isHouseRole ? `Agenda da casa - ${houseDisplayName} (${filteredEvents.length})` : `Eventos cadastrados (${filteredEvents.length})`}</strong>
        <div className="admin-actions-row">
          <button className={`chip ${eventTimeFilter === "all" ? "active" : ""}`} onClick={() => setEventTimeFilter("all")}>Todos</button>
          <button className={`chip ${eventTimeFilter === "upcoming" ? "active" : ""}`} onClick={() => setEventTimeFilter("upcoming")}>Futuros</button>
          <button className={`chip ${eventTimeFilter === "past" ? "active" : ""}`} onClick={() => setEventTimeFilter("past")}>Passados</button>
          {!isHouseRole ? <button className="chip" onClick={exportEventsCsv}>Exportar CSV</button> : null}
        </div>
        {!isHouseRole ? <select value={eventSort} onChange={(e) => setEventSort(e.target.value)}>
          <option value="recent">Mais recentes</option>
          <option value="az">A-Z</option>
        </select> : null}
        <input
          className="search-input"
          placeholder={isHouseRole ? "Buscar evento ou artista..." : "Buscar evento, artista ou casa..."}
          value={eventSearch}
          onChange={(e) => setEventSearch(e.target.value)}
        />
      </div> : null}
      {showEvents && !eventsLoading && filteredEvents.length === 0 ? (
        <p className="empty">Nenhum evento encontrado para esta busca. <button className="btn-link" onClick={clearAdminFilters}>Limpar filtros</button></p>
      ) : null}
      {showEvents ? <div className="venue-list admin-entity-grid">
        {pagedEvents.map((eventItem) => (
          <article key={eventItem.id} className="venue-card">
            <div>
              {isHouseRole ? <small className="live-status live-status-live">Unidade ativa</small> : null}
              <h3>{eventItem.title}</h3>
              <p className="meta-line artist-inline-with-badge">
                <span>{eventItem.artist}</span>
                {eventItem.artistVerified ? <VerifiedBadge className="artist-verified-dot" title="Artista verificado" /> : null}
              </p>
              <p className="meta-line">{eventItem.venue} - {eventItem.region}</p>
              <p className={`meta-line ${eventItem.status === "draft" ? "status-draft" : "live-status-live"}`}>
                {eventItem.status === "draft" ? "Rascunho" : "Publicado"}
              </p>
              {eventItem.isRecurring ? (
                <p className="meta-line">Recorrente: {(eventItem.recurrenceDays || []).join(", ") || "semanal"}</p>
              ) : null}
            </div>
            <div className="venue-actions">
              <button className="chip" onClick={() => handleEventEdit(eventItem)}>Editar</button>
              {eventItem.isRecurring ? (
                <button className="chip" onClick={() => handleCancelOccurrence(eventItem)}>
                  Cancelar data
                </button>
              ) : null}
              {eventItem.isRecurring ? (
                <button className="chip" onClick={() => handleReactivateOccurrence(eventItem)}>
                  Reativar data
                </button>
              ) : null}
              <button className="chip" onClick={() => handleEventDelete(eventItem.id)} disabled={deleteEventMutation.isPending}>Excluir</button>
            </div>
          </article>
        ))}
      </div> : null}
      {showEvents && eventTotalPages > 1 ? (
        <div className="pagination-row">
          <button className="chip" onClick={() => setEventPage((p) => Math.max(1, p - 1))} disabled={eventPage === 1}>Anterior</button>
          <small className="meta-line">Pagina {eventPage} de {eventTotalPages}</small>
          <button className="chip" onClick={() => setEventPage((p) => Math.min(eventTotalPages, p + 1))} disabled={eventPage === eventTotalPages}>Proxima</button>
        </div>
      ) : null}
      </div>

      {showEvents && reactivationTarget ? (
        <div className="modal-backdrop" onClick={() => setReactivationTarget(null)}>
          <article className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Reativar data da serie</h3>
            <p className="meta-line"><strong>{reactivationTarget.title}</strong></p>
            <p className="meta-line">Selecione uma data cancelada para reativar:</p>
            <div className="chip-row">
              {reactivationTarget.dates.map((dateValue) => (
                <button
                  key={dateValue}
                  className="chip"
                  onClick={() => reactivateOccurrenceDate({ id: reactivationTarget.id, recurrenceExceptions: reactivationTarget.dates }, dateValue)}
                >
                  {dateValue}
                </button>
              ))}
            </div>
            <div className="form-actions-inline">
              <button className="chip" onClick={() => setReactivationTarget(null)}>Fechar</button>
            </div>
          </article>
        </div>
      ) : null}
      {showEvents && cancellationTarget ? (
        <div className="modal-backdrop" onClick={() => setCancellationTarget(null)}>
          <article className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Cancelar data da serie</h3>
            <p className="meta-line"><strong>{cancellationTarget.title}</strong></p>
            <p className="meta-line">Selecione a data desta edicao que nao vai acontecer.</p>
            <input
              type="date"
              value={cancellationTarget.selectedDate}
              onChange={(event) => setCancellationTarget((prev) => ({ ...prev, selectedDate: event.target.value }))}
            />
            <div className="form-actions-inline">
              <button
                className="btn-primary"
                onClick={() => {
                  const value = cancellationTarget.selectedDate?.trim() || "";
                  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                    showToast("Formato invalido. Use AAAA-MM-DD.");
                    return;
                  }
                  cancelOccurrenceDate(cancellationTarget, value);
                }}
              >
                Confirmar cancelamento
              </button>
              <button className="chip" onClick={() => setCancellationTarget(null)}>Fechar</button>
            </div>
          </article>
        </div>
      ) : null}
    </section>
  );
}



