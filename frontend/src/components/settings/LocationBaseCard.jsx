import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { updateProfileLocation } from "../../services/profile.service";

const maskCep = (value) => {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
};

export default function LocationBaseCard({ user, token, refreshToken, setAuth }) {
  const [form, setForm] = useState({ city: "", neighborhood: "", postalCode: "" });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setForm({
      city: user?.city || "",
      neighborhood: user?.neighborhood || "",
      postalCode: maskCep(user?.postalCode)
    });
  }, [user?.id, user?.city, user?.neighborhood, user?.postalCode]);

  if (!user) return null;
  const complete = Boolean(user.city && user.neighborhood && user.postalCode);

  function changeField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setSaved(false);
    setMessage("");
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setSaved(false);
    setMessage("");
    try {
      const nextUser = await updateProfileLocation(form);
      setAuth({ token, refreshToken, user: nextUser });
      setSaved(true);
      setMessage("Localização-base atualizada.");
    } catch (error) {
      setMessage(error?.response?.data?.message || "Não foi possível salvar sua localização.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="location" className="clean-card settings-location-card">
      <header>
        <span><MapPin size={17}/></span>
        <div>
          <h3>Sua localização-base</h3>
          <p>Cidade, bairro e CEP liberam o Tô na Pista. Não pedimos seu endereço completo.</p>
        </div>
        <em className={complete ? "is-complete" : ""}>{complete ? "Completa" : "Pendente"}</em>
      </header>
      <form onSubmit={submit}>
        <label>
          Cidade
          <input required name="city" maxLength={120} value={form.city} onChange={(event) => changeField("city", event.target.value)} placeholder="Ex.: São Paulo"/>
        </label>
        <label>
          Bairro
          <input required name="neighborhood" maxLength={120} value={form.neighborhood} onChange={(event) => changeField("neighborhood", event.target.value)} placeholder="Ex.: Bela Vista"/>
        </label>
        <label>
          CEP
          <input required name="postalCode" inputMode="numeric" pattern="\d{5}-?\d{3}" value={form.postalCode} onChange={(event) => changeField("postalCode", maskCep(event.target.value))} placeholder="00000-000"/>
        </label>
        <button className={`chip active settings-location-save${saved ? " is-saved" : ""}`} disabled={busy}>
          {busy ? "Salvando..." : saved ? "Localização salva" : "Salvar localização"}
        </button>
      </form>
      {message ? <small className={saved ? "is-success" : ""} role="status">{message}</small> : null}
    </section>
  );
}
