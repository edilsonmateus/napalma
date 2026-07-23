import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppToast from "../components/common/AppToast";
import {
  useMyAchievementsQuery,
  useMyHistoryInfiniteQuery,
  useToggleHistoryMutation
} from "../hooks/useEventsQuery";
import { useAuthStore } from "../store/authStore";

function formatDate(value) {
  return new Date(value).toLocaleDateString("pt-BR");
}

function groupHistoryByMonth(events) {
  const groups = new Map();

  events.forEach((event) => {
    const date = new Date(event.attendedAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const rawLabel = date.toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric"
    });
    const label = rawLabel.replace(/^\p{Ll}/u, (letter) => letter.toLocaleUpperCase("pt-BR"));

    if (!groups.has(key)) groups.set(key, { key, label, events: [] });
    groups.get(key).events.push(event);
  });

  return Array.from(groups.values());
}

const HISTORY_SEARCH_KEY = "napalma:history:search";

function loadHistorySearch() {
  try {
    return localStorage.getItem(HISTORY_SEARCH_KEY) || "";
  } catch (_error) {
    return "";
  }
}

export default function HistoryPage() {
  const [historySearch, setHistorySearch] = useState(loadHistorySearch);
  const [historyQuery, setHistoryQuery] = useState(loadHistorySearch);
  const [toast, setToast] = useState({ text: "", type: "info" });
  const [removingEventId, setRemovingEventId] = useState("");
  const user = useAuthStore((state) => state.user);
  const {
    data: historyData,
    isLoading,
    isError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage
  } = useMyHistoryInfiniteQuery(historyQuery, Boolean(user));
  const {
    data: achievements = [],
    isLoading: achievementsLoading,
    isError: achievementsError
  } = useMyAchievementsQuery(Boolean(user));
  const toggleHistory = useToggleHistoryMutation();

  const historyEvents = useMemo(
    () => historyData?.pages.flatMap((page) => page.items || []) || [],
    [historyData]
  );
  const historySummary = historyData?.pages?.[0]?.summary || {
    totalEvents: 0,
    venueCount: 0,
    artistCount: 0
  };
  const historyGroups = useMemo(
    () => groupHistoryByMonth(historyEvents),
    [historyEvents]
  );
  const unlockedCount = achievements.filter((item) => item.unlocked).length;
  const totalPoints = achievements
    .filter((item) => item.unlocked)
    .reduce((sum, item) => sum + (item.points || 0), 0);

  const blockedSorted = achievements
    .filter((item) => !item.unlocked)
    .sort((a, b) => {
      const aTarget = a.progress?.target || 1;
      const bTarget = b.progress?.target || 1;
      const aRatio = (a.progress?.current || 0) / aTarget;
      const bRatio = (b.progress?.current || 0) / bTarget;
      if (bRatio !== aRatio) return bRatio - aRatio;
      return aTarget - bTarget;
    });

  const unlockedList = achievements.filter((item) => item.unlocked);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_SEARCH_KEY, historySearch);
    } catch (_error) {
      // no-op
    }

    const timer = window.setTimeout(() => {
      setHistoryQuery(historySearch.trim());
    }, 320);

    return () => window.clearTimeout(timer);
  }, [historySearch]);

  async function removeHistoryEvent(event) {
    const confirmed = window.confirm(
      `Remover “${event.title}” do seu Histórico? Suas conquistas já desbloqueadas serão preservadas.`
    );
    if (!confirmed) return;

    try {
      setRemovingEventId(event.eventId);
      setToast({ text: "", type: "info" });
      await toggleHistory.mutateAsync({
        eventId: event.eventId,
        currentlyMarked: true
      });
      setToast({ text: "Evento removido do seu Histórico.", type: "success" });
    } catch (_error) {
      setToast({
        text: "Não foi possível remover este evento agora. Tente novamente.",
        type: "error"
      });
    } finally {
      setRemovingEventId("");
    }
  }

  return (
    <section className="screen screen-history history-clean">
      <header className="page-header">
        <div>
          <h2>Meu Histórico</h2>
          <p>Sua memória de sambas, casas e artistas.</p>
        </div>
      </header>

      {!user ? (
        <div className="empty login-gate">
          <p>Seu Histórico e suas conquistas aparecem quando você entra na conta.</p>
          <Link to="/settings" className="inline-login-cta">Entrar agora</Link>
        </div>
      ) : null}

      {user && isLoading ? <p className="empty">Carregando histórico...</p> : null}
      {user && isError ? (
        <p className="empty">Não foi possível carregar seu histórico. Tente novamente.</p>
      ) : null}

      {user && !isLoading && !isError && historySummary.totalEvents > 0 ? (
        <section className="history-memory-summary" aria-label="Resumo do seu Histórico">
          <article>
            <strong>{historySummary.totalEvents}</strong>
            <span>sambas registrados</span>
          </article>
          <article>
            <strong>{historySummary.venueCount}</strong>
            <span>casas conhecidas</span>
          </article>
          <article>
            <strong>{historySummary.artistCount}</strong>
            <span>artistas na memória</span>
          </article>
        </section>
      ) : null}

      <h3 className="section-title">Sambas que você já foi</h3>
      {user && !isLoading && !isError && historySummary.totalEvents === 0 ? (
        <div className="empty empty-highlight">
          <p>Nenhum evento registrado ainda.</p>
          <small className="meta-line">Quando você marcar “Eu fui” no Radar, seu histórico aparece aqui.</small>
          <Link to="/radar" className="chip">Abrir Meu Radar</Link>
        </div>
      ) : null}

      {user && historySummary.totalEvents > 0 ? (
        <label className="history-search">
          <span className="sr-only">Buscar no Histórico</span>
          <input
            className="search-input"
            placeholder="Buscar em todo o histórico por evento ou casa..."
            value={historySearch}
            onChange={(event) => setHistorySearch(event.target.value)}
          />
        </label>
      ) : null}

      {user && !isLoading && historyQuery && historyEvents.length === 0 ? (
        <p className="empty">Nenhum resultado encontrado em todo o seu Histórico.</p>
      ) : null}

      {historyGroups.length > 0 ? (
        <div className="history-memory-groups">
          {historyGroups.map((group) => (
            <section key={group.key} className="history-memory-group">
              <h4>{group.label}</h4>
              <div className="clean-cards">
                {group.events.map((event) => (
                  <article key={event.id} className="clean-card history-memory-card">
                    <div>
                      <h5>{event.title}</h5>
                      <p>{event.venue}</p>
                      <small>{formatDate(event.attendedAt)}</small>
                    </div>
                    <button
                      type="button"
                      className="history-remove-action"
                      disabled={removingEventId === event.eventId}
                      onClick={() => removeHistoryEvent(event)}
                    >
                      {removingEventId === event.eventId ? "Removendo..." : "Remover"}
                    </button>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {hasNextPage ? (
        <div className="history-load-more">
          <button
            type="button"
            className="chip"
            disabled={isFetchingNextPage}
            onClick={() => fetchNextPage()}
          >
            {isFetchingNextPage ? "Carregando..." : "Carregar históricos anteriores"}
          </button>
        </div>
      ) : null}

      <h3 className="section-title">Conquistas</h3>
      {user && achievements.length > 0 ? (
        <p className="empty empty-highlight">
          {unlockedCount}/{achievements.length} desbloqueadas · {totalPoints} pts
        </p>
      ) : null}
      {user && achievementsLoading ? <p className="empty">Carregando conquistas...</p> : null}
      {user && achievementsError ? <p className="empty">Não foi possível carregar suas conquistas.</p> : null}
      {user && !achievementsLoading && !achievementsError && achievements.length === 0 ? (
        <p className="empty">Nenhuma conquista disponível ainda.</p>
      ) : null}

      {blockedSorted.length > 0 ? (
        <div className="clean-cards">
          {blockedSorted.map((item) => (
            <article key={item.id} className="clean-card achievement">
              <h4>{item.name}</h4>
              <p>{item.description}</p>
              {item.progress ? (
                <>
                  <small>Progresso: {item.progress.current}/{item.progress.target}</small>
                  <div className="progress-track" aria-label={`Progresso da conquista ${item.name}`}>
                    <div
                      className="progress-fill"
                      style={{ width: `${Math.round((item.progress.current / Math.max(item.progress.target, 1)) * 100)}%` }}
                    />
                  </div>
                </>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      {unlockedList.length > 0 ? (
        <details className="achievements-completed">
          <summary>Conquistas desbloqueadas ({unlockedList.length})</summary>
          <div className="clean-cards compact">
            {unlockedList.map((item) => (
              <article key={item.id} className="clean-card unlocked">
                <h4>{item.name}</h4>
                <p>{item.description}</p>
                <small>{item.icon || "troféu"} desbloqueada</small>
              </article>
            ))}
          </div>
        </details>
      ) : null}

      <AppToast toast={toast} onClose={() => setToast({ text: "", type: "info" })} />
    </section>
  );
}
