import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useAddVenueManagerMutation,
  useArtistsQuery,
  useCreateArtistMutation,
  useCreateEventMutation,
  useCreateVenueMutation,
  useDeleteArtistMutation,
  useDeleteEventMutation,
  useDeleteVenueMutation,
  useEventsQuery,
  useRegionsQuery,
  useRemoveVenueManagerMutation,
  useVenueManagerUsersQuery,
  useUpdateArtistMutation,
  useUpdateEventMutation,
  useUpdateVenueMutation,
  useVenueManagersQuery,
  useVenuesQuery
} from "../hooks/useEventsQuery";
import { getArtistById, getEventById, getVenueById } from "../services/events.service";

const initialVenueForm = {
  name: "",
  description: "",
  address: "",
  neighborhood: "",
  region: "",
  city: "Sao Paulo",
  state: "SP",
  imageUrl: ""
};

const initialArtistForm = {
  name: "",
  bio: "",
  imageUrl: "",
  genres: "samba",
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
  ticketUrl: "",
  priceMin: "",
  priceMax: "",
  venueId: "",
  artistName: ""
};

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

export default function VenuesAdminPage() {
  const navigate = useNavigate();
  const [regionFilter, setRegionFilter] = useState("");
  const [editingVenueId, setEditingVenueId] = useState("");
  const [editingArtistId, setEditingArtistId] = useState("");
  const [editingEventId, setEditingEventId] = useState("");
  const [venueForm, setVenueForm] = useState(initialVenueForm);
  const [artistForm, setArtistForm] = useState(initialArtistForm);
  const [eventForm, setEventForm] = useState(initialEventForm);
  const [selectedVenueForManagers, setSelectedVenueForManagers] = useState("");
  const [managerSearch, setManagerSearch] = useState("");
  const [selectedManagerUserId, setSelectedManagerUserId] = useState("");
  const [message, setMessage] = useState("");
  const [venueErrors, setVenueErrors] = useState({});
  const [artistErrors, setArtistErrors] = useState({});
  const [eventErrors, setEventErrors] = useState({});

  const { data: regions = [] } = useRegionsQuery();
  const { data: venues = [], isLoading: venuesLoading } = useVenuesQuery(regionFilter ? { region: regionFilter } : {});
  const { data: artists = [], isLoading: artistsLoading } = useArtistsQuery();
  const { data: events = [], isLoading: eventsLoading } = useEventsQuery(regionFilter ? { region: regionFilter } : {});
  const { data: venueManagers = [], isLoading: managersLoading } = useVenueManagersQuery(selectedVenueForManagers);
  const { data: managerCandidates = [], isLoading: managerCandidatesLoading } = useVenueManagerUsersQuery(managerSearch);

  const createVenueMutation = useCreateVenueMutation();
  const updateVenueMutation = useUpdateVenueMutation();
  const deleteVenueMutation = useDeleteVenueMutation();
  const createArtistMutation = useCreateArtistMutation();
  const updateArtistMutation = useUpdateArtistMutation();
  const deleteArtistMutation = useDeleteArtistMutation();
  const createEventMutation = useCreateEventMutation();
  const updateEventMutation = useUpdateEventMutation();
  const deleteEventMutation = useDeleteEventMutation();
  const addVenueManagerMutation = useAddVenueManagerMutation();
  const removeVenueManagerMutation = useRemoveVenueManagerMutation();

  const isEditingVenue = useMemo(() => Boolean(editingVenueId), [editingVenueId]);
  const isEditingArtist = useMemo(() => Boolean(editingArtistId), [editingArtistId]);
  const isEditingEvent = useMemo(() => Boolean(editingEventId), [editingEventId]);

  function handleVenueChange(event) {
    const { name, value } = event.target;
    setVenueForm((prev) => ({ ...prev, [name]: value }));
    setVenueErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function handleArtistChange(event) {
    const { name, value } = event.target;
    setArtistForm((prev) => ({ ...prev, [name]: value }));
    setArtistErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function handleEventChange(event) {
    const { name, value } = event.target;
    setEventForm((prev) => ({ ...prev, [name]: value }));
    setEventErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function resetVenueForm() {
    setEditingVenueId("");
    setVenueForm(initialVenueForm);
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
  }

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
    if (eventForm.priceMin && eventForm.priceMax && Number(eventForm.priceMax) < Number(eventForm.priceMin)) {
      errors.priceMax = ["Preco maximo deve ser maior ou igual ao minimo."];
    }
    return errors;
  }

  async function handleVenueSubmit(event) {
    event.preventDefault();
    setMessage("");
    setVenueErrors({});

    const payload = { ...venueForm, state: venueForm.state.toUpperCase() };

    try {
      if (isEditingVenue) {
        await updateVenueMutation.mutateAsync({ id: editingVenueId, payload });
        setMessage("Casa atualizada com sucesso.");
      } else {
        await createVenueMutation.mutateAsync(payload);
        setMessage("Casa criada com sucesso.");
      }
      resetVenueForm();
    } catch (error) {
      const parsed = parseApiErrors(error);
      setVenueErrors(parsed.fieldErrors);
      setMessage(parsed.message || "Nao foi possivel salvar a casa.");
    }
  }

  async function handleArtistSubmit(event) {
    event.preventDefault();
    setMessage("");
    setArtistErrors({});

    const payload = {
      ...artistForm,
      genres: artistForm.genres.split(",").map((genre) => genre.trim().toLowerCase()).filter(Boolean),
      bio: artistForm.bio || undefined,
      imageUrl: artistForm.imageUrl || undefined,
      spotifyUrl: artistForm.spotifyUrl || undefined,
      youtubeUrl: artistForm.youtubeUrl || undefined,
      instagramUrl: artistForm.instagramUrl || undefined
    };

    try {
      if (isEditingArtist) {
        await updateArtistMutation.mutateAsync({ id: editingArtistId, payload });
        setMessage("Artista atualizado com sucesso.");
      } else {
        await createArtistMutation.mutateAsync(payload);
        setMessage("Artista criado com sucesso.");
      }
      resetArtistForm();
    } catch (error) {
      const parsed = parseApiErrors(error);
      setArtistErrors(parsed.fieldErrors);
      setMessage(parsed.message || "Nao foi possivel salvar o artista.");
    }
  }

  async function handleVenueEdit(venue) {
    setMessage("Carregando dados completos da casa...");
    setVenueErrors({});

    try {
      const detail = await getVenueById(venue.id);
      setEditingVenueId(detail.id);
      setVenueForm({
        name: detail.name || "",
        description: detail.description || "",
        address: detail.address || "",
        neighborhood: detail.neighborhood || "",
        region: detail.region || "",
        city: detail.city || "",
        state: detail.state || "SP",
        imageUrl: detail.imageUrl || ""
      });
      setMessage("Casa carregada. Edite os campos e salve.");
    } catch (error) {
      setMessage(error?.response?.data?.message || "Nao foi possivel carregar os dados completos da casa.");
    }
  }

  async function handleArtistEdit(artist) {
    setMessage("Carregando dados completos do artista...");
    setArtistErrors({});

    try {
      const detail = await getArtistById(artist.id);
      setEditingArtistId(detail.id);
      setArtistForm({
        name: detail.name || "",
        bio: detail.bio || "",
        imageUrl: detail.imageUrl || "",
        genres: Array.isArray(detail.genres) ? detail.genres.join(", ") : "samba",
        spotifyUrl: detail.spotifyUrl || "",
        youtubeUrl: detail.youtubeUrl || "",
        instagramUrl: detail.instagramUrl || ""
      });
      setMessage("Artista carregado. Edite os campos e salve.");
    } catch (error) {
      setMessage(error?.response?.data?.message || "Nao foi possivel carregar os dados completos do artista.");
    }
  }

  async function handleVenueDelete(venueId) {
    const ok = window.confirm("Deseja excluir esta casa? Essa acao nao pode ser desfeita.");
    if (!ok) return;

    setMessage("");
    try {
      await deleteVenueMutation.mutateAsync(venueId);
      if (editingVenueId === venueId) resetVenueForm();
      setMessage("Casa excluida com sucesso.");
    } catch (error) {
      setMessage(error?.response?.data?.message || "Nao foi possivel excluir a casa.");
    }
  }

  async function handleArtistDelete(artistId) {
    const ok = window.confirm("Deseja excluir este artista?");
    if (!ok) return;

    setMessage("");
    try {
      await deleteArtistMutation.mutateAsync(artistId);
      if (editingArtistId === artistId) resetArtistForm();
      setMessage("Artista excluido com sucesso.");
    } catch (error) {
      setMessage(error?.response?.data?.message || "Nao foi possivel excluir o artista.");
    }
  }

  async function handleEventSubmit(event) {
    event.preventDefault();
    setMessage("");
    setEventErrors({});

    const localErrors = validateEventBeforeSubmit();
    if (Object.keys(localErrors).length > 0) {
      setEventErrors(localErrors);
      setMessage("Revise os campos do evento destacados abaixo.");
      return;
    }

    const payload = {
      ...eventForm,
      tags: eventForm.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      priceMin: eventForm.priceMin ? Number(eventForm.priceMin) : undefined,
      priceMax: eventForm.priceMax ? Number(eventForm.priceMax) : undefined,
      ticketUrl: eventForm.ticketUrl || undefined,
      imageUrl: eventForm.imageUrl || undefined
    };

    try {
      if (eventForm.ticketType === "free") {
        payload.priceMin = undefined;
        payload.priceMax = undefined;
      }

      if (isEditingEvent) {
        await updateEventMutation.mutateAsync({ id: editingEventId, payload });
        setMessage("Evento atualizado com sucesso.");
      } else {
        await createEventMutation.mutateAsync(payload);
        setMessage("Evento criado com sucesso.");
      }
      resetEventForm();
    } catch (error) {
      const parsed = parseApiErrors(error);
      setEventErrors(parsed.fieldErrors);
      setMessage(parsed.message || "Nao foi possivel salvar o evento.");
    }
  }

  async function handleEventEdit(eventItem) {
    setMessage("Carregando dados completos do evento...");
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
        ticketUrl: detail.ticketUrl || "",
        priceMin: detail.priceMin ?? "",
        priceMax: detail.priceMax ?? "",
        venueId: detail.venueId || "",
        artistName: detail.artistName || ""
      });
      setMessage("Evento carregado. Edite os campos e salve.");
    } catch (error) {
      setMessage(error?.response?.data?.message || "Nao foi possivel carregar os dados completos do evento.");
    }
  }

  async function handleEventDelete(eventId) {
    const ok = window.confirm("Deseja excluir este evento?");
    if (!ok) return;

    setMessage("");
    try {
      await deleteEventMutation.mutateAsync(eventId);
      if (editingEventId === eventId) resetEventForm();
      setMessage("Evento excluido com sucesso.");
    } catch (error) {
      setMessage(error?.response?.data?.message || "Nao foi possivel excluir o evento.");
    }
  }

  async function handleAddManager(event) {
    event.preventDefault();
    if (!selectedVenueForManagers || !selectedManagerUserId) {
      setMessage("Selecione a casa e um gestor valido da lista.");
      return;
    }
    setMessage("");
    try {
      await addVenueManagerMutation.mutateAsync({
        venueId: selectedVenueForManagers,
        payload: { userId: selectedManagerUserId }
      });
      setManagerSearch("");
      setSelectedManagerUserId("");
      setMessage("Gestor vinculado com sucesso.");
    } catch (error) {
      setMessage(error?.response?.data?.message || "Nao foi possivel vincular gestor.");
    }
  }

  async function handleRemoveManager(userId) {
    if (!selectedVenueForManagers) return;
    setMessage("");
    try {
      await removeVenueManagerMutation.mutateAsync({
        venueId: selectedVenueForManagers,
        userId
      });
      setMessage("Vinculo removido com sucesso.");
    } catch (error) {
      setMessage(error?.response?.data?.message || "Nao foi possivel remover vinculo.");
    }
  }

  return (
    <section>
      <button className="btn-link" onClick={() => navigate(-1)}>Voltar</button>
      <header className="page-header">
        <h2>Gestao de Casas, Artistas e Eventos</h2>
        <p>Cadastro e manutencao da agenda de samba.</p>
      </header>

      <div className="chip-row">
        <button className={`chip ${regionFilter === "" ? "active" : ""}`} onClick={() => setRegionFilter("")}>Todas</button>
        {regions.map((region) => (
          <button key={region} className={`chip ${regionFilter === region ? "active" : ""}`} onClick={() => setRegionFilter(region)}>
            {region}
          </button>
        ))}
      </div>

      {message ? <p className="empty">{message}</p> : null}

      <h3 className="section-title">Casas</h3>
      <form className="venue-form" onSubmit={handleVenueSubmit}>
        <input name="name" value={venueForm.name} onChange={handleVenueChange} placeholder="Nome da casa" required />
        {venueErrors.name?.[0] ? <p className="field-error">{venueErrors.name[0]}</p> : null}
        <input name="description" value={venueForm.description} onChange={handleVenueChange} placeholder="Descricao" required />
        {venueErrors.description?.[0] ? <p className="field-error">{venueErrors.description[0]}</p> : null}
        <input name="address" value={venueForm.address} onChange={handleVenueChange} placeholder="Endereco" required />
        <input name="neighborhood" value={venueForm.neighborhood} onChange={handleVenueChange} placeholder="Bairro" required />
        <input name="region" value={venueForm.region} onChange={handleVenueChange} placeholder="Regiao" required />
        <input name="city" value={venueForm.city} onChange={handleVenueChange} placeholder="Cidade" required />
        <input name="state" value={venueForm.state} onChange={handleVenueChange} placeholder="UF" maxLength={2} required />
        <input name="imageUrl" value={venueForm.imageUrl} onChange={handleVenueChange} placeholder="URL da imagem" />
        <div className="form-actions-inline">
          <button className="btn-primary" type="submit" disabled={createVenueMutation.isPending || updateVenueMutation.isPending}>
            {isEditingVenue ? "Salvar casa" : "Criar casa"}
          </button>
          {isEditingVenue ? <button type="button" className="chip" onClick={resetVenueForm}>Cancelar</button> : null}
        </div>
      </form>

      {venuesLoading ? <p className="empty">Carregando casas...</p> : null}
      <div className="venue-list">
        {venues.map((venue) => (
          <article key={venue.id} className="venue-card">
            <div>
              <h3>{venue.name}</h3>
              <p className="meta-line">{venue.neighborhood} - {venue.region}</p>
              <p className="meta-line">Eventos vinculados: {venue.eventsCount}</p>
            </div>
            <div className="venue-actions">
              <button className="chip" onClick={() => handleVenueEdit(venue)}>Editar</button>
              <button className="chip" onClick={() => handleVenueDelete(venue.id)} disabled={deleteVenueMutation.isPending}>Excluir</button>
            </div>
          </article>
        ))}
      </div>

      <h3 className="section-title">Gestores por Casa</h3>
      <form className="venue-form" onSubmit={handleAddManager}>
        <select value={selectedVenueForManagers} onChange={(e) => setSelectedVenueForManagers(e.target.value)} required>
          <option value="">Selecione a casa</option>
          {venues.map((venue) => (
            <option key={venue.id} value={venue.id}>{venue.name}</option>
          ))}
        </select>
        <input
          value={managerSearch}
          onChange={(e) => {
            setManagerSearch(e.target.value);
            setSelectedManagerUserId("");
          }}
          placeholder="Buscar gestor por nome, email ou usuario"
          required
        />
        <select
          value={selectedManagerUserId}
          onChange={(e) => setSelectedManagerUserId(e.target.value)}
          required
        >
          <option value="">Selecione o gestor</option>
          {managerCandidates.map((user) => (
            <option key={user.id} value={user.id}>
              {user.firstName} {user.lastName} - {user.email}
            </option>
          ))}
        </select>
        {managerCandidatesLoading ? <p className="empty">Buscando gestores...</p> : null}
        <div className="form-actions-inline">
          <button className="btn-primary" type="submit" disabled={addVenueManagerMutation.isPending}>
            Vincular gestor
          </button>
        </div>
      </form>

      {selectedVenueForManagers && managersLoading ? <p className="empty">Carregando gestores...</p> : null}
      {selectedVenueForManagers ? (
        <div className="venue-list">
          {venueManagers.length === 0 ? <p className="empty">Nenhum gestor vinculado.</p> : null}
          {venueManagers.map((entry) => (
            <article key={entry.id} className="venue-card">
              <div>
                <h3>{entry.user.firstName} {entry.user.lastName}</h3>
                <p className="meta-line">{entry.user.email}</p>
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

      <h3 className="section-title">Artistas</h3>
      <form className="venue-form" onSubmit={handleArtistSubmit}>
        <input name="name" value={artistForm.name} onChange={handleArtistChange} placeholder="Nome do artista" required />
        {artistErrors.name?.[0] ? <p className="field-error">{artistErrors.name[0]}</p> : null}
        <textarea name="bio" value={artistForm.bio} onChange={handleArtistChange} placeholder="Bio" rows={2} />
        <input name="genres" value={artistForm.genres} onChange={handleArtistChange} placeholder="Generos separados por virgula" />
        <input name="imageUrl" type="url" value={artistForm.imageUrl} onChange={handleArtistChange} placeholder="URL da imagem" />
        <input name="spotifyUrl" type="url" value={artistForm.spotifyUrl} onChange={handleArtistChange} placeholder="URL Spotify" />
        <input name="youtubeUrl" type="url" value={artistForm.youtubeUrl} onChange={handleArtistChange} placeholder="URL YouTube" />
        <input name="instagramUrl" type="url" value={artistForm.instagramUrl} onChange={handleArtistChange} placeholder="URL Instagram" />
        <div className="form-actions-inline">
          <button className="btn-primary" type="submit" disabled={createArtistMutation.isPending || updateArtistMutation.isPending}>
            {isEditingArtist ? "Salvar artista" : "Criar artista"}
          </button>
          {isEditingArtist ? <button type="button" className="chip" onClick={resetArtistForm}>Cancelar</button> : null}
        </div>
      </form>

      {artistsLoading ? <p className="empty">Carregando artistas...</p> : null}
      <div className="venue-list">
        {artists.map((artist) => (
          <article key={artist.id} className="venue-card">
            <div>
              <h3>{artist.name}</h3>
              <p className="meta-line">Generos: {artist.genres.join(", ")}</p>
              <p className="meta-line">Eventos vinculados: {artist.eventsCount}</p>
            </div>
            <div className="venue-actions">
              <button className="chip" onClick={() => handleArtistEdit(artist)}>Editar</button>
              <button className="chip" onClick={() => handleArtistDelete(artist.id)} disabled={deleteArtistMutation.isPending}>Excluir</button>
            </div>
          </article>
        ))}
      </div>

      <h3 className="section-title">Eventos</h3>
      <form className="venue-form" onSubmit={handleEventSubmit}>
        <input name="title" value={eventForm.title} onChange={handleEventChange} placeholder="Titulo do evento" required />
        {eventErrors.title?.[0] ? <p className="field-error">{eventErrors.title[0]}</p> : null}
        <input name="artistName" list="artists-list" value={eventForm.artistName} onChange={handleEventChange} placeholder="Artista principal" required />
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
          <option value="feijoada_sambista">Feijoada Sambista</option>
        </select>
        <select name="venueId" value={eventForm.venueId} onChange={handleEventChange} required>
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
        <select name="ticketType" value={eventForm.ticketType} onChange={handleEventChange} required>
          <option value="paid">Pago</option>
          <option value="free">Gratuito</option>
          <option value="consumacao">Consumacao</option>
        </select>
        {eventErrors.ticketType?.[0] ? <p className="field-error">{eventErrors.ticketType[0]}</p> : null}
        <input name="priceMin" type="number" min="0" step="0.01" value={eventForm.priceMin} onChange={handleEventChange} placeholder="Preco minimo" />
        <input name="priceMax" type="number" min="0" step="0.01" value={eventForm.priceMax} onChange={handleEventChange} placeholder="Preco maximo" />
        {eventErrors.priceMax?.[0] ? <p className="field-error">{eventErrors.priceMax[0]}</p> : null}
        <input name="ticketUrl" type="url" value={eventForm.ticketUrl} onChange={handleEventChange} placeholder="URL de ingresso" />
        <input name="imageUrl" type="url" value={eventForm.imageUrl} onChange={handleEventChange} placeholder="URL da imagem" />
        <input name="tags" value={eventForm.tags} onChange={handleEventChange} placeholder="Tags separadas por virgula" />
        <div className="form-actions-inline">
          <button className="btn-primary" type="submit" disabled={createEventMutation.isPending || updateEventMutation.isPending}>
            {isEditingEvent ? "Salvar evento" : "Criar evento"}
          </button>
          {isEditingEvent ? <button type="button" className="chip" onClick={resetEventForm}>Cancelar</button> : null}
        </div>
      </form>

      {eventsLoading ? <p className="empty">Carregando eventos...</p> : null}
      <div className="venue-list">
        {events.map((eventItem) => (
          <article key={eventItem.id} className="venue-card">
            <div>
              <h3>{eventItem.title}</h3>
              <p className="meta-line">{eventItem.artist}</p>
              <p className="meta-line">{eventItem.venue} - {eventItem.region}</p>
            </div>
            <div className="venue-actions">
              <button className="chip" onClick={() => handleEventEdit(eventItem)}>Editar</button>
              <button className="chip" onClick={() => handleEventDelete(eventItem.id)} disabled={deleteEventMutation.isPending}>Excluir</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
