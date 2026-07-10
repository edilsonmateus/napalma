import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getMyPaymentOrder, processMyMockPaymentOrder } from "../services/advertiserPortal.service";

const TERMINAL_STATUSES = new Set(["approved", "rejected", "cancelled", "expired"]);

function money(value, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(Number(value || 0) / 100);
}

function returnUrl(order, status) {
  const base = order?.returnPath || "/workspace/anunciante";
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}payment=${encodeURIComponent(status)}&paymentOrder=${encodeURIComponent(order.id)}`;
}

export default function MockPaymentPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [runtime, setRuntime] = useState(null);
  const [state, setState] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    getMyPaymentOrder(orderId)
      .then((response) => {
        if (!active) return;
        setOrder(response.item);
        setRuntime(response.runtime);
        setState("ready");
        if (TERMINAL_STATUSES.has(response.item.status)) {
          setMessage("Operacao ja processada. Retornando ao workspace...");
          window.setTimeout(() => navigate(returnUrl(response.item, response.item.status), { replace: true }), 900);
        }
      })
      .catch((error) => {
        if (!active) return;
        setState("error");
        setMessage(error?.response?.data?.message || "Nao foi possivel recuperar esta simulacao.");
      });
    return () => { active = false; };
  }, [navigate, orderId]);

  async function finish(outcome) {
    if (!order || state === "processing") return;
    setState("processing");
    setMessage(outcome === "approved" ? "Confirmando com o provedor simulado..." : "Processando resultado de teste...");
    try {
      if (outcome === "approved") {
        await processMyMockPaymentOrder(order.id, "pending");
        setMessage("Pagamento pendente. Aguardando notificacao automatica...");
        await new Promise((resolve) => window.setTimeout(resolve, 1200));
      }
      const response = await processMyMockPaymentOrder(order.id, outcome);
      const updated = response.item;
      setOrder(updated);
      setMessage(updated.status === "approved" ? "Patacos confirmados. Retornando ao 77Gira Ads..." : "Resultado registrado. Retornando ao workspace...");
      window.setTimeout(() => navigate(returnUrl(updated, updated.status), { replace: true }), 1100);
    } catch (error) {
      setState("ready");
      setMessage(error?.response?.data?.message || "A simulacao falhou. Voce pode tentar novamente ou voltar ao workspace.");
    }
  }

  if (state === "loading") return <section className="mock-payment-shell"><div className="mock-payment-card"><strong>Preparando simulacao segura...</strong></div></section>;
  if (state === "error" || !order || !runtime?.available) {
    return (
      <section className="mock-payment-shell">
        <div className="mock-payment-card mock-payment-error">
          <span>77GIRA ADS · AMBIENTE DE TESTE</span>
          <h1>Simulacao indisponivel</h1>
          <p>{message || "Este recurso foi desligado."}</p>
          <button className="btn-secondary" type="button" onClick={() => navigate("/workspace/anunciante", { replace: true })}>Voltar ao workspace</button>
        </div>
      </section>
    );
  }

  return (
    <section className="mock-payment-shell">
      <div className="mock-payment-warning" role="alert">
        <strong>SIMULACAO — NENHUM PAGAMENTO REAL SERA REALIZADO</strong>
        <span>Este ambiente existe exclusivamente para validar a jornada de patacos do 77Gira Ads.</span>
      </div>
      <article className="mock-payment-card">
        <header>
          <img src="/logoads77gira.svg" alt="77Gira Ads" />
          <span>Gateway mock</span>
        </header>
        <div className="mock-payment-merchant">
          <span>Compra simulada para</span>
          <strong>{order.account?.name}</strong>
          {order.campaign?.name ? <small>Campanha: {order.campaign.name}</small> : <small>Saldo geral da conta anunciante</small>}
        </div>
        <div className="mock-payment-summary">
          <div><span>Patacos</span><strong>{order.creditAmount}</strong></div>
          <div><span>Valor ilustrativo</span><strong>{money(order.amountCents, order.currency)}</strong></div>
          <div><span>Referencia</span><small>{order.externalReference}</small></div>
        </div>
        <div className="mock-payment-method">
          <span>Forma simulada</span>
          <strong>Saldo de teste · final 0077</strong>
          <small>Nao informe cartao, senha, CPF ou qualquer dado financeiro real.</small>
        </div>
        {message ? <p className={`mock-payment-message ${state}`}>{message}</p> : null}
        <button className="btn-primary mock-payment-confirm" type="button" disabled={state === "processing"} onClick={() => finish("approved")}>
          {state === "processing" ? "Processando..." : `Simular aprovacao de ${order.creditAmount} patacos`}
        </button>
        <details className="mock-payment-scenarios">
          <summary>Testar outros resultados</summary>
          <p>Use estes cenarios para validar retornos sem movimentar saldo.</p>
          <div>
            <button type="button" disabled={state === "processing"} onClick={() => finish("rejected")}>Simular recusa</button>
            <button type="button" disabled={state === "processing"} onClick={() => finish("cancelled")}>Cancelar e voltar</button>
          </div>
        </details>
      </article>
      <p className="mock-payment-footer">Ambiente isolado · sem captura de dados bancarios · retorno automatico ao 77Gira Ads</p>
    </section>
  );
}
