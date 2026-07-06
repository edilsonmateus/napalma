import { useEffect, useRef, useState } from "react";

export const CLAIM_LEGAL_VERSION = "CLAIM_RESPONSIBILITY_V1";

export default function ClaimLegalAcknowledgementModal({ open, onCancel, onConfirm }) {
  const [checked, setChecked] = useState(false);
  const [readToEnd, setReadToEnd] = useState(false);
  const dialogRef = useRef(null);
  const copyRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setChecked(false);
    setReadToEnd(false);
    dialogRef.current?.focus();
    const frame = window.requestAnimationFrame(() => {
      const node = copyRef.current;
      if (node && node.scrollHeight <= node.clientHeight + 2) setReadToEnd(true);
    });
    const closeOnEscape = (event) => { if (event.key === "Escape") onCancel(); };
    document.addEventListener("keydown", closeOnEscape);
    return () => { window.cancelAnimationFrame(frame); document.removeEventListener("keydown", closeOnEscape); };
  }, [open, onCancel]);

  if (!open) return null;
  function trackRead(event) {
    const node = event.currentTarget;
    if (node.scrollTop + node.clientHeight >= node.scrollHeight - 12) setReadToEnd(true);
  }

  return <div className="claim-legal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
    <section className="claim-legal-modal" role="dialog" aria-modal="true" aria-labelledby="claimLegalTitle" tabIndex="-1" ref={dialogRef}>
      <header><span>77GIRA · SEGURANÇA DE IDENTIDADE</span><h2 id="claimLegalTitle">DECLARAÇÃO DE RESPONSABILIDADE E LEGITIMIDADE</h2></header>
      <div className="claim-legal-copy" onScroll={trackRead} ref={copyRef}>
        <p>Ao prosseguir, você declara, sob sua responsabilidade, que possui autorização legítima para solicitar a criação, reivindicação, administração ou alteração deste perfil.</p>
        <p>Você confirma ser proprietário, integrante, representante legal, gestor autorizado ou profissional expressamente autorizado pela pessoa, artista, banda, empresa, casa de eventos ou organização relacionada à solicitação.</p>
        <p>É proibido utilizar este recurso para se passar por terceiros, obter acesso indevido, alterar informações sem autorização, desviar contatos comerciais, publicar conteúdo enganoso ou assumir a gestão de uma identidade artística ou empresarial sem legitimidade.</p>
        <p>O 77Gira poderá solicitar documentos e outras evidências, entrar em contato com representantes oficiais, suspender preventivamente acessos e rejeitar ou cancelar solicitações que apresentem inconsistências.</p>
        <p>Informações falsas, documentos adulterados, falsa representação ou tentativa de apropriação indevida poderão resultar em bloqueio da conta, remoção do acesso, preservação dos registros da solicitação e adoção das medidas administrativas ou legais cabíveis.</p>
        <p>O envio desta declaração não garante aprovação. Todas as solicitações estão sujeitas à análise da equipe 77Gira.</p>
        <strong>FIM DA DECLARAÇÃO · VERSÃO {CLAIM_LEGAL_VERSION}</strong>
      </div>
      {!readToEnd ? <p className="claim-legal-read-hint">Role o texto até o final para registrar sua ciência.</p> : null}
      <label className="claim-legal-check"><input type="checkbox" checked={checked} disabled={!readToEnd} onChange={(event) => setChecked(event.target.checked)}/><span>Declaro que li, compreendi e confirmo que possuo legitimidade ou autorização para realizar esta solicitação.</span></label>
      <footer><button type="button" className="claim-legal-cancel" onClick={onCancel}>Cancelar</button><button type="button" className="claim-legal-confirm" disabled={!checked} onClick={() => onConfirm({ accepted: true, version: CLAIM_LEGAL_VERSION })}>Estou ciente e desejo continuar</button></footer>
    </section>
  </div>;
}
