import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMyAchievementsQuery, useMyHistoryQuery } from "../hooks/useEventsQuery";
import { useAuthStore } from "../store/authStore";

function formatDate(value) {
  return new Date(value).toLocaleDateString("pt-BR");
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
  const user = useAuthStore((state) => state.user);
  const { data: historyEvents = [], isLoading, isError } = useMyHistoryQuery(Boolean(user));
  const {
    data: achievements = [],
    isLoading: achievementsLoading,
    isError: achievementsError
  } = useMyAchievementsQuery(Boolean(user));

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
  const filteredHistoryEvents = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return historyEvents;
    return historyEvents.filter((event) =>
      `${event.title} ${event.venue}`.toLowerCase().includes(q)
    );
  }, [historyEvents, historySearch]);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_SEARCH_KEY, historySearch);
    } catch (_error) {
      // no-op
    }
  }, [historySearch]);

  return (
    <section className="screen screen-history history-clean">
      <header className="page-header history-logo-header">
        <div>
          <h2>Meu Historico</h2>
          <p>Seus roles, metas e evolucao.</p>
        </div>
        <img
          src="/assets/brand/logoBase77Gira.svg"
          alt="77Gira"
          className="history-brand-logo"
        />
      </header>

      <h3 className="section-title">Sambas que voce ja foi</h3>
      {!user ? (
        <div className="empty login-gate">
          <p>Seu Historico e suas conquistas aparecem quando voce entra na conta.</p>
          <Link to="/settings" className="inline-login-cta">Entrar agora</Link>
        </div>
      ) : null}
      {user && isLoading ? <p className="empty">Carregando historico...</p> : null}
      {user && isError ? <p className="empty">Nao foi possivel carregar seu historico.</p> : null}
      {user && !isLoading && !isError && historyEvents.length === 0 ? (
        <div className="empty empty-highlight">
          <p>Nenhum evento registrado ainda.</p>
          <small className="meta-line">Quando voce marcar "Eu fui" no Radar, seu historico aparece aqui.</small>
          <Link to="/radar" className="chip">Abrir Meu Radar</Link>
        </div>
      ) : null}
      {user && historyEvents.length > 0 ? (
        <input
          className="search-input"
          placeholder="Buscar por evento ou casa..."
          value={historySearch}
          onChange={(e) => setHistorySearch(e.target.value)}
        />
      ) : null}
      {user && historyEvents.length > 0 && filteredHistoryEvents.length === 0 ? (
        <p className="empty">Nenhum resultado para sua busca.</p>
      ) : null}

      {filteredHistoryEvents.length > 0 ? (
        <div className="clean-cards">
          {filteredHistoryEvents.map((event) => (
            <article key={event.id} className="clean-card">
              <h4>{event.title}</h4>
              <p>{event.venue}</p>
              <small>{formatDate(event.attendedAt)}</small>
            </article>
          ))}
        </div>
      ) : null}

      <h3 className="section-title">Conquistas</h3>
      {user && achievements.length > 0 ? (
        <p className="empty empty-highlight">
          {unlockedCount}/{achievements.length} desbloqueadas - {totalPoints} pts
        </p>
      ) : null}
      {user && achievementsLoading ? <p className="empty">Carregando conquistas...</p> : null}
      {user && achievementsError ? <p className="empty">Nao foi possivel carregar suas conquistas.</p> : null}
      {user && !achievementsLoading && !achievementsError && achievements.length === 0 ? <p className="empty">Nenhuma conquista disponivel ainda.</p> : null}

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
                <small>{item.icon || "trofeu"} desbloqueada</small>
              </article>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}

