import { useEffect, useState } from "react";
import { ArrowLeft, ShieldCheck, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { createCommonUser, listCommonUsers, setReservedUsernamePermission } from "../services/adminUsers.service";
import { isReservedUsername, RESERVED_USERNAME_MESSAGE } from "../utils/usernamePolicy";

const EMPTY = { firstName: "", lastName: "", username: "", email: "", phone: "", password: "", canUseReservedBrandUsername: false };

export default function UsersAdminPage() {
  const [form, setForm] = useState(EMPTY);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const reserved = isReservedUsername(form.username);

  async function load(search = query) {
    try { setItems(await listCommonUsers(search)); } catch (error) { setMessage(error?.response?.data?.message || "Não foi possível carregar os usuários."); }
  }
  useEffect(() => { load(""); }, []);

  async function submit(event) {
    event.preventDefault(); setMessage("");
    if (reserved && !form.canUseReservedBrandUsername) { setMessage(RESERVED_USERNAME_MESSAGE); return; }
    setBusy(true);
    try {
      await createCommonUser({ ...form, phone: form.phone.trim() || undefined });
      setForm(EMPTY); setMessage("Usuário comum criado com sucesso."); await load("");
    } catch (error) { setMessage(error?.response?.data?.message || "Não foi possível criar o usuário."); }
    finally { setBusy(false); }
  }

  async function togglePermission(user) {
    try {
      const updated = await setReservedUsernamePermission(user.id, !user.canUseReservedBrandUsername);
      setItems((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (error) { setMessage(error?.response?.data?.message || "Não foi possível alterar a permissão."); }
  }

  return <section className="screen users-admin-screen">
    <header className="account-settings-header"><Link to="/settings" className="account-settings-back"><ArrowLeft size={18}/> Voltar para Configurações</Link><h2>Usuários</h2><p>Crie contas comuns e controle usernames oficiais da marca.</p></header>
    <form className="clean-card users-admin-form" onSubmit={submit}>
      <div className="account-settings-section-title"><UserPlus size={18}/><div><strong>Novo usuário comum</strong><small>A função será sempre Usuário comum, sem privilégios administrativos.</small></div></div>
      <div className="account-form-pair"><input required placeholder="Nome" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })}/><input required placeholder="Sobrenome" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })}/></div>
      <input required minLength="3" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}/>
      {reserved ? <p className="users-reserved-warning">Este username parece oficial. Marque a autorização abaixo para prosseguir.</p> : null}
      <div className="account-form-pair"><input required type="email" placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}/><input placeholder="Telefone (opcional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}/></div>
      <input required minLength="8" type="password" placeholder="Senha provisória (mínimo 8 caracteres)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}/>
      <label className="users-official-check"><input type="checkbox" checked={form.canUseReservedBrandUsername} onChange={(e) => setForm({ ...form, canUseReservedBrandUsername: e.target.checked })}/><span><strong>Autorizar username oficial da marca</strong><small>Permite criar e manter nomes reservados relacionados ao 77gira.</small></span></label>
      <button className="chip active" disabled={busy}>{busy ? "Criando..." : "Criar usuário"}</button>
      {message ? <p className="meta-line" role="status">{message}</p> : null}
    </form>
    <section className="clean-card users-admin-list"><div className="users-admin-search"><input placeholder="Buscar por nome, username ou e-mail" value={query} onChange={(e) => setQuery(e.target.value)}/><button className="chip" type="button" onClick={() => load(query)}>Buscar</button></div>{items.map((user) => <article key={user.id}><span><strong>{user.firstName} {user.lastName}</strong><small>@{user.username} · {user.email}</small></span><button className={`chip ${user.canUseReservedBrandUsername ? "official" : ""}`} type="button" onClick={() => togglePermission(user)}><ShieldCheck size={14}/>{user.canUseReservedBrandUsername ? "Oficial autorizado" : "Autorizar marca"}</button></article>)}</section>
  </section>;
}
