import { prisma } from "../lib/prisma.js";
import { canManageEvent } from "../lib/access.control.js";
import { env } from "../config/env.js";

const TIMEZONE = "America/Sao_Paulo";

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TIMEZONE
  });
}

function formatLongDate(value) {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TIMEZONE
  });
}

function formatShortDate(value) {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TIMEZONE
  });
}

function formatWeekday(value) {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    timeZone: TIMEZONE
  });
}

function formatDayNumber(value) {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleDateString("pt-BR", {
    day: "numeric",
    timeZone: TIMEZONE
  });
}

function formatTime(value) {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIMEZONE
  });
}

function formatHumanTime(value) {
  const time = formatTime(value);
  if (!time) return "";
  const [hour, minute] = time.split(":");
  return minute === "00" ? `${Number(hour)}h` : `${Number(hour)}h${minute}`;
}

function sentenceCase(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function splitLeadingArticle(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(o|a|os|as)\s+(.+)$/i);
  if (!match) return { article: "", name: text };
  return { article: match[1].toLowerCase(), name: match[2].trim() };
}

function inferArticleFromName(name) {
  const { article, name: cleanName } = splitLeadingArticle(name);
  if (article) return article;
  const normalized = cleanName.toLowerCase();
  if (!normalized) return "";
  if (/^(roda|feijoada|noite|turma|resenha|bateria|velha guarda)\b/.test(normalized)) return "a";
  if (/^(samba|pagode|show|baile|terreiro|festival|encontro|projeto)\b/.test(normalized)) return "o";
  if (/^(zona|região|regiao)\b/.test(normalized)) return "a";
  if (/^(centro|bairro)\b/.test(normalized)) return "o";
  return "";
}

function withArticle(name, article) {
  const { article: existingArticle, name: cleanName } = splitLeadingArticle(name);
  if (!cleanName) return "";
  const chosenArticle = String(article || existingArticle || "").trim().toLowerCase();
  return chosenArticle ? `${chosenArticle} ${cleanName}` : cleanName;
}

function withDeRelation(name, article) {
  const { article: existingArticle, name: cleanName } = splitLeadingArticle(name);
  if (!cleanName) return "";
  const chosenArticle = String(article || existingArticle || "").trim().toLowerCase();
  const contractions = {
    o: "do",
    a: "da",
    os: "dos",
    as: "das"
  };
  return `${contractions[chosenArticle] || "de"} ${cleanName}`;
}

function withTimePreposition(time) {
  return time ? `às ${time}` : "em horário a confirmar";
}

function pickLocalName(formal, local) {
  const localText = String(local || "").trim();
  return localText || formal;
}

function priceLabel(event) {
  const parts = [];

  if (event.ticketType === "free") {
    parts.push("Gratuito");
  } else if (event.ticketType === "consumacao") {
    parts.push(event.consumacaoValue ? `Consumação R$ ${event.consumacaoValue}` : "Consumação");
  } else if (event.priceMin && event.priceMax && event.priceMin !== event.priceMax) {
    parts.push(`R$ ${event.priceMin} a R$ ${event.priceMax}`);
  } else if (event.priceMin || event.priceMax) {
    parts.push(`R$ ${event.priceMin || event.priceMax}`);
  } else {
    parts.push("Consulte valores");
  }

  if (event.couvertArtistico) {
    parts.push(`couvert artístico R$ ${event.couvertArtistico}`);
  }

  return parts.join(" + ");
}

function buildRegionGrammar(event, regionMeta) {
  const regionName = event.venue.region || "";
  const fallbackArticle = inferArticleFromName(regionName);
  const regionWithArticle =
    regionMeta?.displayNameWithArticle || withArticle(regionName, regionMeta?.grammarArticle || fallbackArticle);
  const regionWithPreposition =
    regionMeta?.displayNameWithPreposition ||
    (regionName ? `${regionName.toLowerCase().includes("centro") ? "no" : "na"} ${regionName}` : "");

  return {
    regionName,
    regionWithArticle,
    regionWithPreposition
  };
}

function buildKit(event, requestedBy, regionMeta) {
  const artist = event.artists[0]?.artist;
  const artistName = artist?.name || event.title;
  const eventArticle = inferArticleFromName(event.title);
  const eventTitleWithArticle = withArticle(event.title, eventArticle);
  const eventTitleWithDeRelation = withDeRelation(event.title, eventArticle);
  const venueName = event.venue.name;
  const venueWithArticle = event.venue.displayNameWithArticle || withArticle(venueName, event.venue.grammarArticle);
  const venueWithPreposition = event.venue.displayNameWithPreposition || `em ${venueName}`;
  const venueLocalName = event.venue.nickname || venueName;
  const venueLocalWithArticle = pickLocalName(
    venueWithArticle,
    event.venue.nicknameDisplayNameWithArticle || withArticle(event.venue.nickname, event.venue.nicknameGrammarArticle)
  );
  const venueLocalWithPreposition = pickLocalName(
    venueWithPreposition,
    event.venue.nicknameDisplayNameWithPreposition ||
      (event.venue.nickname ? `${event.venue.nicknameGrammarPreposition || "em"} ${event.venue.nickname}` : "")
  );
  const neighborhoodWithPreposition =
    event.venue.neighborhoodDisplayNameWithPreposition ||
    (event.venue.neighborhood ? `em ${event.venue.neighborhood}` : "");
  const { regionName, regionWithArticle, regionWithPreposition } = buildRegionGrammar(event, regionMeta);
  const eventUrl = `${env.publicAppUrl.replace(/\/$/, "")}/events/${event.id}`;
  const date = formatDate(event.startDate);
  const shortDate = formatShortDate(event.startDate);
  const longDate = formatLongDate(event.startDate);
  const weekday = formatWeekday(event.startDate);
  const dayNumber = formatDayNumber(event.startDate);
  const friendlyDateLead = weekday ? `Na próxima ${weekday}` : "Em data a confirmar";
  const startTime = formatTime(event.startDate);
  const endTime = formatTime(event.endDate);
  const humanStartTime = formatHumanTime(event.startDate);
  const startTimeWithPreposition = withTimePreposition(humanStartTime || startTime);
  const price = priceLabel(event);
  const cityState = [event.venue.city, event.venue.state].filter(Boolean).join(" - ");
  const serviceDate = longDate ? sentenceCase(longDate) : date || "Data a confirmar";
  const serviceTime = humanStartTime || startTime || "Horário a confirmar";
  const titleLineRegion = regionWithPreposition || venueWithPreposition;

  const captionShort = [
    `${event.title} ${titleLineRegion} 🎤🥁`,
    "",
    `${friendlyDateLead}, dia ${dayNumber || shortDate || "a confirmar"}, ${eventTitleWithArticle} desembarca ${venueLocalWithPreposition} para mais um dia de samba. Uma roda daquelas: gogó, palma da mão, aquela gelada e gente bonita.`,
    "",
    `O evento começa ${startTimeWithPreposition}. Chama os seus e vem pra essa resenha${regionWithPreposition ? ` ${regionWithPreposition}` : ""}.`,
    "",
    "Serviço:",
    `🗓️ ${serviceDate}`,
    `🕙 ${serviceTime}`,
    `📍 ${venueName}${regionName ? ` (${regionName})` : ""}`,
    `🎫 Ingresso: ${price}`,
    "",
    eventUrl
  ].join("\n");

  const whatsappText = [
    `${event.title} ${venueLocalWithPreposition} 🥁`,
    "",
    `${friendlyDateLead}, dia ${shortDate || "a confirmar"}, a partir ${startTimeWithPreposition}, tem ${event.title}${regionWithPreposition ? ` ${regionWithPreposition}` : ""}. Uma roda com muito samba de raiz.`,
    "",
    "Bora colar? Compartilha essa mensagem com os seus e vamos encostar.",
    "",
    "Confira os detalhes completos no 77Gira:",
    `👉 ${eventUrl}`
  ].join("\n");

  const releaseText = [
    `${venueName} recebe ${eventTitleWithArticle}${weekday && dayNumber ? ` na próxima ${weekday} (${dayNumber})` : ""}`,
    "",
    `${regionWithArticle || regionName || event.venue.city} de ${event.venue.city || "São Paulo"} terá uma nova edição ${eventTitleWithDeRelation}${longDate ? ` no dia ${longDate}` : ""}. O evento acontece ${venueWithPreposition}, com início programado para ${startTimeWithPreposition}.`,
    "",
    event.description ||
      "O projeto apresenta um repertório focado em clássicos do samba de raiz e grandes composições. O ambiente é estruturado para receber o público em um formato de roda de samba bem raiz, valorizando a proximidade entre músicos e frequentadores.",
    "",
    `As apresentações ao vivo se estendem ao longo da noite, reforçando o circuito cultural e de lazer${regionWithPreposition ? ` ${regionWithPreposition}` : ""}.`,
    "",
    "Serviço:",
    "",
    `- Evento: ${event.title}`,
    `- Artista: ${artistName}`,
    `- Data: ${serviceDate}`,
    `- Horário: ${serviceTime}`,
    `- Local: ${venueName}${regionName ? ` - ${regionName}` : ""}${cityState ? `, ${cityState}` : ""}`,
    `- Ingresso: ${price}`,
    `- Link: ${eventUrl}`
  ].join("\n");

  const techSheet = [
    `Evento: ${event.title}`,
    `Artista: ${artistName}`,
    `Casa: ${event.venue.name}`,
    `Região: ${event.venue.region || "-"}`,
    `Cidade: ${cityState || "-"}`,
    `Início: ${date && startTime ? `${date} ${startTime}` : "-"}`,
    `Fim: ${date && endTime ? `${date} ${endTime}` : "-"}`,
    `Preço: ${price}`,
    `Link: ${eventUrl}`
  ].join("\n");

  return {
    source: "77gira",
    workflow: "77first-one-click-kit",
    event: {
      id: event.id,
      title: event.title,
      titleWithArticle: eventTitleWithArticle,
      titleWithDeRelation: eventTitleWithDeRelation,
      artistName,
      description: event.description || "",
      date,
      shortDate,
      longDate,
      weekday,
      startTime,
      startTimeWithPreposition,
      endTime,
      priceLabel: price,
      ticketUrl: event.ticketUrl || "",
      coverImageUrl: event.imageUrl || event.venue.imageUrl || "",
      audienceBadges: event.tags || [],
      eventUrl
    },
    venue: {
      id: event.venue.id,
      name: venueName,
      nickname: event.venue.nickname || "",
      localName: venueLocalName,
      displayNameWithArticle: venueWithArticle,
      displayNameWithPreposition: venueWithPreposition,
      localDisplayNameWithArticle: venueLocalWithArticle,
      localDisplayNameWithPreposition: venueLocalWithPreposition,
      address: event.venue.address || "",
      neighborhood: event.venue.neighborhood || "",
      neighborhoodDisplayNameWithArticle: event.venue.neighborhoodDisplayNameWithArticle || event.venue.neighborhood || "",
      neighborhoodDisplayNameWithPreposition: neighborhoodWithPreposition,
      region: regionName,
      regionDisplayNameWithArticle: regionWithArticle,
      regionDisplayNameWithPreposition: regionWithPreposition,
      city: event.venue.city || "",
      state: event.venue.state || "",
      contactName: event.venue.contactName || "",
      contactPhone: event.venue.contactPhone || ""
    },
    grammar: {
      eventTitleWithArticle,
      eventTitleWithDeRelation,
      venueWithArticle,
      venueWithPreposition,
      venueLocalWithArticle,
      venueLocalWithPreposition,
      neighborhoodWithPreposition,
      regionWithArticle,
      regionWithPreposition,
      startTimeWithPreposition
    },
    requestedBy: {
      id: requestedBy?.id || "",
      name: [requestedBy?.firstName, requestedBy?.lastName].filter(Boolean).join(" ") || requestedBy?.username || "",
      email: requestedBy?.email || "",
      role: requestedBy?.role || ""
    },
    delivery: {
      emailTo: requestedBy?.email || "",
      copyTo: requestedBy?.email || ""
    },
    kit: {
      captionShort,
      whatsappText,
      releaseText,
      techSheet
    },
    generatedAt: new Date().toISOString(),
    timezone: TIMEZONE
  };
}

function clean77FirstText(value) {
  return String(value || "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function normalizeWebhookKit(data, fallbackPayload) {
  const source = data?.kit && typeof data.kit === "object" ? data.kit : data || {};
  const fallbackKit = fallbackPayload.kit;

  return {
    captionShort: clean77FirstText(source.captionShort || source.caption || source.legendaCurta || fallbackKit.captionShort),
    whatsappText: clean77FirstText(source.whatsappText || source.whatsapp || source.textoWhatsapp || fallbackKit.whatsappText),
    releaseText: clean77FirstText(source.releaseText || source.release || source.releaseImprensa || source.textoRelease || fallbackKit.releaseText),
    techSheet: clean77FirstText(source.techSheet || source.fichaTecnica || fallbackKit.techSheet)
  };
}

async function requestWebhookKit(payload) {
  if (!env.firstWebhookUrl) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.firstWebhookTimeoutMs);

  try {
    const response = await fetch(env.firstWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!response.ok) {
      return {
        error: "webhook_failed",
        status: response.status
      };
    }

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json()
      : { releaseText: await response.text() };

    return {
      kit: normalizeWebhookKit(data, payload),
      raw: data
    };
  } catch (error) {
    return {
      error: error.name === "AbortError" ? "webhook_timeout" : "webhook_error"
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function request77FirstKit(req, res, next) {
  try {
    const { id } = req.params;
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        venue: {
          include: {
            managerAccesses: { select: { userId: true } },
            producerAccesses: { select: { producerId: true } }
          }
        },
        artists: {
          include: {
            artist: {
              include: {
                producerAccesses: { select: { producerId: true } }
              }
            }
          },
          orderBy: { order: "asc" }
        }
      }
    });

    if (!event) {
      return res.status(404).json({ error: "event_not_found", message: "Evento não encontrado." });
    }

    if (!canManageEvent(req.user, event)) {
      return res.status(403).json({ error: "forbidden", message: "Você não pode gerar kit deste evento." });
    }

    const regionMeta = event.venue.region
      ? await prisma.region.findFirst({
          where: {
            name: event.venue.region,
            city: event.venue.city,
            state: event.venue.state
          }
        })
      : null;

    const payload = buildKit(event, req.user, regionMeta);
    const webhookResult = await requestWebhookKit(payload);

    const kit = webhookResult?.kit || payload.kit;
    const source = webhookResult?.kit ? "webhook" : "fallback";

    return res.status(200).json({
      status: "ready",
      source,
      message: source === "webhook" ? "Kit 77First pronto." : "Kit 77First pronto com texto base.",
      payload: {
        ...payload,
        kit
      },
      webhook: webhookResult?.error ? { error: webhookResult.error, status: webhookResult.status } : undefined
    });
  } catch (error) {
    next(error);
  }
}

