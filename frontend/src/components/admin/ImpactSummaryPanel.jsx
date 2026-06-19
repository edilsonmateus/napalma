import { useEffect, useMemo, useState } from "react";
import { getImpactSummary } from "../../services/analytics.service";

const DEFAULT_METRICS = {
  venueViews: 0,
  eventViews: 0,
  partiuAgora: 0,
  routeClicks: 0,
  radarSaves: 0,
  shares: 0,
  attendanceYes: 0,
  searches: 0,
  regionFilters: 0,
  liveFilters: 0
};

const METRIC_CARDS = [
  { key: "venueViews", label: "Visualizações da casa" },
  { key: "eventViews", label: "Visualizações de eventos" },
  { key: "partiuAgora", label: "Cliques em Partiu Agora" },
  { key: "routeClicks", label: "Rotas abertas" },
  { key: "radarSaves", label: "Salvos no Radar" },
  { key: "shares", label: "Compartilhamentos" },
  { key: "attendanceYes", label: "Presença marcada" },
  { key: "regionFilters", label: "Filtros de região" }
];

function formatProviderName(provider) {
  const names = {
    maps: "Maps",
    google_maps: "Maps",
    waze: "Waze",
    uber: "Uber",
    outros: "Outros"
  };
  return names[provider] || provider;
}

function formatNumber(value) {
  return new Intl.NumberFormat("pt-BR").format(Number(value || 0));
}

function formatPercent(value) {
  return `${Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  })}%`;
}

function formatTierName(tier) {
  const names = {
    basic: "Basic",
    pro: "Pro",
    premium: "Premium"
  };
  return names[tier] || "Basic";
}

function csvEscape(value) {
  const stringValue = String(value ?? "");
  return `"${stringValue.replaceAll('"', '""')}"`;
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map(csvEscape).join(";")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function ImpactSummaryPanel({
  venueId,
  title = "Impacto 77Gira",
  subtitle = "Entenda como o público está descobrindo, salvando e chegando nos sambas.",
  days = 30
}) {
  const [selectedDays, setSelectedDays] = useState(days);
  const [summary, setSummary] = useState(null);
  const [status, setStatus] = useState("idle");
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    let active = true;
    setStatus("loading");
    getImpactSummary({ days: selectedDays, ...(venueId ? { venueId } : {}) })
      .then((data) => {
        if (!active) return;
        setSummary(data);
        setStatus("success");
      })
      .catch(() => {
        if (!active) return;
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [selectedDays, venueId]);

  const metrics = summary?.metrics || DEFAULT_METRICS;
  const hasData = useMemo(() => Object.values(metrics).some((value) => Number(value) > 0), [metrics]);
  const routeProviders = summary?.routeProviders || [];
  const topEvents = summary?.topEventsDetailed || [];
  const topRegions = summary?.topRegionsDetailed || [];
  const benchmark = summary?.benchmark;
  const benchmarkLeaders = benchmark?.leaders || [];
  const entitlement = summary?.entitlement || {
    effectiveTier: "premium",
    canViewPro: true,
    canViewPremium: true,
    lockedTiers: { pro: false, premium: false }
  };
  const canViewPro = entitlement.canViewPro !== false;
  const canViewPremium = entitlement.canViewPremium !== false;
  const proLock = summary?.locks?.pro;
  const premiumLock = summary?.locks?.premium;
  const reportDate = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date());
  const reportScope = venueId ? "Casa" : "Plataforma";

  const executiveSignals = [
    {
      label: "Descoberta",
      value: metrics.venueViews + metrics.eventViews + metrics.searches + metrics.regionFilters + metrics.liveFilters,
      hint: "pessoas encontrando casas, eventos e filtros"
    },
    {
      label: "Intenção",
      value: metrics.radarSaves,
      hint: "sambas guardados para ir depois"
    },
    {
      label: "Chegada",
      value: metrics.partiuAgora + metrics.routeClicks,
      hint: "cliques em rota e apps de navegação"
    },
    {
      label: "Boca-a-boca",
      value: metrics.shares,
      hint: "eventos compartilhados com outras pessoas"
    }
  ];

  const handleDownloadCsv = () => {
    if (!canViewPremium) return;

    const rows = [
      ["Relatório", title],
      ["Escopo", reportScope],
      ["Período", `${selectedDays} dias`],
      ["Gerado em", reportDate],
      [],
      ["Métrica", "Valor"],
      ...METRIC_CARDS.map((item) => [item.label, metrics[item.key] || 0]),
      ["Buscas", metrics.searches || 0],
      ["Filtros ao vivo", metrics.liveFilters || 0],
      ["Horário de maior interesse", summary?.bestHour?.label || "Sem dados"],
      [],
      ["Eventos que mais puxaram atenção", "Interações", "Casa"],
      ...topEvents.map((event) => [event.title || "Sem título", event.count || 0, event.venue || ""]),
      [],
      ["Rotas abertas por app", "Cliques"],
      ...routeProviders.map((item) => [formatProviderName(item.provider), item.count || 0]),
      [],
      ["Regiões mais filtradas", "Filtros"],
      ...topRegions.map((region) => [region.region || "Sem região", region.count || 0])
    ];

    downloadCsv(`impacto-77gira-${selectedDays}d.csv`, rows);
  };

  const handlePrintReport = () => {
    if (!canViewPremium) return;
    window.print();
  };

  if (status === "loading") {
    return (
      <section className="impact-panel">
        <article className="clean-card">
          <h3>{title}</h3>
          <p className="meta-line">Carregando relatório de impacto...</p>
        </article>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="impact-panel">
        <article className="clean-card danger-zone-card">
          <h3>{title}</h3>
          <p className="meta-line">Não foi possível carregar o Impacto 77Gira agora.</p>
        </article>
      </section>
    );
  }

  return (
    <section className="impact-panel">
      <div className="impact-panel-header">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <div className="impact-toolbar">
          <span className={`impact-tier-badge tier-${entitlement.effectiveTier || "basic"}`}>
            {formatTierName(entitlement.effectiveTier)}
          </span>
          <div className="impact-period-switch">
            {[7, 30, 90].map((option) => (
              <button
                key={option}
                className={selectedDays === option ? "active" : ""}
                type="button"
                onClick={() => setSelectedDays(option)}
              >
                {option}d
              </button>
            ))}
          </div>
          <button
            className="admin-secondary-button"
            type="button"
            onClick={handleDownloadCsv}
            disabled={!canViewPremium}
            title={canViewPremium ? "" : "Disponivel no Impacto Premium"}
          >
            Baixar CSV
          </button>
          <button
            className="admin-secondary-button"
            type="button"
            onClick={() => canViewPremium && setShowReport(true)}
            disabled={!canViewPremium}
            title={canViewPremium ? "" : "Disponivel no Impacto Premium"}
          >
            Ver relatório
          </button>
        </div>
      </div>

      <div className="impact-signal-grid">
        {executiveSignals.map((signal) => (
          <article key={signal.label} className="impact-signal-card">
            <span>{signal.label}</span>
            <strong>{formatNumber(signal.value)}</strong>
            <small>{signal.hint}</small>
          </article>
        ))}
      </div>

      <div className="impact-metric-grid">
        {METRIC_CARDS.map((item) => (
          <article key={item.key} className="clean-card impact-metric-card">
            <h4>{item.label}</h4>
            <p>{formatNumber(metrics[item.key] || 0)}</p>
          </article>
        ))}
      </div>

      {!canViewPro && proLock ? (
        <article className="clean-card impact-locked-card">
          <span className="impact-lock-badge">Pro</span>
          <h4>{proLock.title}</h4>
          <p>{proLock.message}</p>
          {entitlement.upgradeHints?.pro ? <small>{entitlement.upgradeHints.pro}</small> : null}
        </article>
      ) : null}

      <article className={`clean-card impact-benchmark-card ${benchmark?.available ? "" : "is-muted"} ${!canViewPremium ? "is-locked" : ""}`}>
        <div className="impact-benchmark-header">
          <div>
            <span className="impact-section-eyebrow">Benchmark seguro</span>
            <h4>Leitura comparativa sem expor concorrentes</h4>
          </div>
          <span className="impact-pill">
            {premiumLock ? "Premium bloqueado" : benchmark?.available ? benchmark.scope : "Aguardando amostra"}
          </span>
        </div>

        {premiumLock ? (
          <div className="impact-benchmark-warning">
            <strong>{premiumLock.title}</strong>
            <p>{premiumLock.message}</p>
            {entitlement.upgradeHints?.premium ? <small>{entitlement.upgradeHints.premium}</small> : null}
          </div>
        ) : benchmark?.available ? (
          <>
            <div className="impact-benchmark-grid">
              <div>
                <small>Posicao relativa</small>
                <strong>{benchmark.position} de {benchmark.totalComparable}</strong>
              </div>
              <div>
                <small>Percentil</small>
                <strong>Top {formatPercent(benchmark.percentile)}</strong>
              </div>
              <div>
                <small>Share qualificado</small>
                <strong>{formatPercent(benchmark.share)}</strong>
              </div>
              <div>
                <small>Amostra</small>
                <strong>{benchmark.sampleSize} casas</strong>
              </div>
            </div>

            <div className="impact-benchmark-list">
              {benchmarkLeaders.map((item, index) => (
                <div key={`${item.label}-${index}`} className={`impact-benchmark-row ${item.isSelf ? "is-self" : ""}`}>
                  <span>{index + 1}. {item.label}</span>
                  <b>{formatPercent(item.share)}</b>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="impact-benchmark-warning">
            <strong>Benchmark protegido</strong>
            <p>{benchmark?.reason || "Ainda nao ha volume suficiente para uma comparacao segura."}</p>
          </div>
        )}

        <ul className="impact-guardrail-list">
          {(benchmark?.guardrails || []).slice(0, 3).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>

      {!hasData ? (
        <article className="clean-card impact-empty">
          <h4>Ainda estamos formando a leitura</h4>
          <p className="meta-line">
            Assim que o público visitar casas, abrir rotas, salvar eventos no Radar e compartilhar sambas, este painel vira argumento de valor para a operação.
          </p>
        </article>
      ) : null}

      {canViewPro ? (
      <div className="impact-columns">
        <article className="clean-card">
          <h4>Eventos que mais puxaram atenção</h4>
          <div className="impact-list">
            {topEvents.length ? topEvents.map((event) => (
              <div key={event.eventId || event.title} className="impact-row">
                <span>
                  <strong>{event.title}</strong>
                  {event.venue ? <small>{event.venue}</small> : null}
                </span>
                <b>{formatNumber(event.count)}</b>
              </div>
            )) : <p className="meta-line">Nenhum evento ranqueado ainda.</p>}
          </div>
        </article>

        <article className="clean-card">
          <h4>Rotas e intenção de chegada</h4>
          <div className="impact-provider-row">
            {routeProviders.length ? routeProviders.map((item) => (
              <span key={item.provider} className="impact-pill">
                {formatProviderName(item.provider)} · {formatNumber(item.count)}
              </span>
            )) : <span className="impact-pill muted">Sem rotas abertas</span>}
          </div>
          <div className="impact-highlight">
            <small>Horário de maior interesse</small>
            <strong>{summary?.bestHour?.label || "Sem dados"}</strong>
          </div>
        </article>

        <article className="clean-card">
          <h4>Regiões mais filtradas</h4>
          <div className="impact-list">
            {topRegions.length ? topRegions.map((region) => (
              <div key={region.region} className="impact-row">
                <span>{region.region}</span>
                <b>{formatNumber(region.count)}</b>
              </div>
            )) : <p className="meta-line">Nenhuma região filtrada ainda.</p>}
          </div>
        </article>

        <article className="clean-card">
          <h4>Leitura rápida</h4>
          <p className="meta-line">
            {formatNumber(metrics.radarSaves)} salvamentos no Radar, {formatNumber(metrics.shares)} compartilhamentos e {formatNumber(metrics.attendanceYes)} presenças confirmadas.
          </p>
        </article>
      </div>
      ) : null}

      {showReport && canViewPremium ? (
        <div className="impact-report-overlay">
          <article className="impact-report-modal impact-report-print">
            <header className="impact-report-header">
              <div>
                <span>Relatório de valor</span>
                <h2>{title}</h2>
                <p>
                  Período analisado: últimos {selectedDays} dias · Gerado em {reportDate}
                </p>
              </div>
              <button className="admin-icon-button" type="button" onClick={() => setShowReport(false)}>
                Fechar
              </button>
            </header>

            <section className="impact-report-summary">
              <h3>Resumo executivo</h3>
              <p>
                O 77Gira registrou {formatNumber(metrics.venueViews + metrics.eventViews)} visualizações relacionadas a casas e eventos, {formatNumber(metrics.radarSaves)} salvamentos no Radar e {formatNumber(metrics.partiuAgora + metrics.routeClicks)} sinais de deslocamento ou intenção de chegada.
              </p>
              <p>
                Esses dados ajudam a demonstrar presença digital, interesse real do público e força de circulação da programação dentro da cidade.
              </p>
            </section>

            <section className="impact-report-kpis">
              {executiveSignals.map((signal) => (
                <div key={signal.label}>
                  <small>{signal.label}</small>
                  <strong>{formatNumber(signal.value)}</strong>
                  <span>{signal.hint}</span>
                </div>
              ))}
            </section>

            <section className="impact-report-table">
              <h3>Métricas principais</h3>
              <table>
                <tbody>
                  {METRIC_CARDS.map((item) => (
                    <tr key={item.key}>
                      <th>{item.label}</th>
                      <td>{formatNumber(metrics[item.key] || 0)}</td>
                    </tr>
                  ))}
                  <tr>
                    <th>Horário de maior interesse</th>
                    <td>{summary?.bestHour?.label || "Sem dados"}</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section className="impact-report-table">
              <h3>Benchmark seguro</h3>
              {benchmark?.available ? (
                <table>
                  <tbody>
                    <tr>
                      <th>Escopo</th>
                      <td>{benchmark.scope}</td>
                    </tr>
                    <tr>
                      <th>Posicao relativa</th>
                      <td>{benchmark.position} de {benchmark.totalComparable}</td>
                    </tr>
                    <tr>
                      <th>Share qualificado</th>
                      <td>{formatPercent(benchmark.share)}</td>
                    </tr>
                    {benchmarkLeaders.slice(0, 5).map((item, index) => (
                      <tr key={`${item.label}-report-${index}`}>
                        <th>{index + 1}. {item.label}</th>
                        <td>{formatPercent(item.share)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="meta-line">{benchmark?.reason || "Sem amostra suficiente para benchmark seguro."}</p>
              )}
            </section>

            <section className="impact-report-grid">
              <div>
                <h3>Eventos em destaque</h3>
                {topEvents.length ? topEvents.slice(0, 5).map((event) => (
                  <p key={event.eventId || event.title}>
                    <strong>{event.title}</strong>
                    <span>{formatNumber(event.count)} interações</span>
                  </p>
                )) : <p className="meta-line">Sem eventos ranqueados.</p>}
              </div>
              <div>
                <h3>Rotas abertas</h3>
                {routeProviders.length ? routeProviders.map((item) => (
                  <p key={item.provider}>
                    <strong>{formatProviderName(item.provider)}</strong>
                    <span>{formatNumber(item.count)} cliques</span>
                  </p>
                )) : <p className="meta-line">Sem rotas abertas.</p>}
              </div>
            </section>

            <footer className="impact-report-actions">
              <button className="admin-primary-button" type="button" onClick={handlePrintReport}>
                Imprimir / salvar PDF
              </button>
              <button className="admin-secondary-button" type="button" onClick={handleDownloadCsv}>
                Baixar CSV
              </button>
            </footer>
          </article>
        </div>
      ) : null}
    </section>
  );
}
