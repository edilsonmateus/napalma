import { useEffect, useRef, useState } from "react";
import { Camera, ChevronRight, Pencil } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import BackLink from "../components/common/BackLink";
import InstitutionalFooter from "../components/layout/InstitutionalFooter";
import LocationBaseCard from "../components/settings/LocationBaseCard";
import { logout } from "../services/auth.service";
import { revokeProfileSessions, updateProfileDetails, updateProfilePassword, uploadProfileAvatar } from "../services/profile.service";
import { getMyArtists } from "../services/artistWorkspace.service";
import { useAuthStore } from "../store/authStore";
import { isReservedUsername, isUsernameSyntaxValid, RESERVED_USERNAME_MESSAGE } from "../utils/usernamePolicy";

export default function AccountSettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const avatarInputRef = useRef(null);
  const { token, refreshToken, user, setAuth, clearAuth } = useAuthStore();
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState("");
  const [artists, setArtists] = useState([]);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileForm, setProfileForm] = useState({ firstName: "", lastName: "", username: "", phone: "", instagramHandle: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [revokePassword, setRevokePassword] = useState("");
  const [revokeBusy, setRevokeBusy] = useState(false);
  const [revokeMessage, setRevokeMessage] = useState("");

  useEffect(() => {
    getMyArtists().then(setArtists).catch(() => setArtists([]));
  }, [user?.id]);

  useEffect(() => {
    setProfileForm({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      username: user?.username || "",
      phone: user?.phone || "",
      instagramHandle: user?.instagramHandle || ""
    });
  }, [user?.id, user?.firstName, user?.lastName, user?.username, user?.phone, user?.instagramHandle]);

  useEffect(() => {
    if (new URLSearchParams(location.search).get("edit") !== "location") return;
    setEditingProfile(true);
    const frame = window.requestAnimationFrame(() => document.getElementById("location-base-editor")?.scrollIntoView({ behavior: "smooth", block: "center" }));
    return () => window.cancelAnimationFrame(frame);
  }, [location.search]);

  async function saveProfile(event) {
    event.preventDefault();
    setProfileBusy(true);
    setProfileMessage("");
    if (profileForm.username !== user.username && !isUsernameSyntaxValid(profileForm.username)) {
      setProfileMessage("Use de 3 a 40 caracteres: letras sem acento, números, ponto, hífen ou underline.");
      setProfileBusy(false);
      return;
    }
    if (profileForm.username !== user.username && isReservedUsername(profileForm.username) && !user.canUseReservedBrandUsername) {
      setProfileMessage(RESERVED_USERNAME_MESSAGE);
      setProfileBusy(false);
      return;
    }
    try {
      const nextUser = await updateProfileDetails({
        ...profileForm,
        firstName: profileForm.firstName.trim(),
        lastName: profileForm.lastName.trim(),
        username: profileForm.username.trim(),
        phone: profileForm.phone.trim() || null,
        instagramHandle: profileForm.instagramHandle.trim() || null
      });
      setAuth({ token, refreshToken, user: nextUser });
      setEditingProfile(false);
      setProfileMessage("Dados pessoais atualizados.");
    } catch (error) {
      setProfileMessage(error?.response?.data?.message || "Não foi possível atualizar seus dados.");
    } finally {
      setProfileBusy(false);
    }
  }

  async function savePassword(event) {
    event.preventDefault();
    setPasswordMessage("");
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage("A confirmação não corresponde à nova senha.");
      return;
    }
    setPasswordBusy(true);
    try {
      await updateProfilePassword({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
      clearAuth();
      navigate("/login?passwordChanged=1", { replace: true });
    } catch (error) {
      setPasswordMessage(error?.response?.data?.message || "Não foi possível alterar sua senha.");
    } finally {
      setPasswordBusy(false);
    }
  }

  async function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setAvatarBusy(true);
    setAvatarMessage("");
    try {
      const nextUser = await uploadProfileAvatar(file);
      setAuth({ token, refreshToken, user: nextUser });
      setAvatarMessage("Foto de perfil atualizada.");
    } catch (error) {
      setAvatarMessage(error?.response?.data?.message || "Não foi possível atualizar a foto.");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleLogout() {
    try {
      if (refreshToken) await logout({ refreshToken });
    } catch (_error) {
      // A sessão local ainda deve ser encerrada se o servidor estiver indisponível.
    }
    clearAuth();
    navigate("/explore", { replace: true });
  }

  async function handleRevokeSessions(event) {
    event.preventDefault();
    setRevokeBusy(true); setRevokeMessage("");
    try {
      const result = await revokeProfileSessions(revokePassword);
      setRevokePassword("");
      setRevokeMessage(result.message);
      clearAuth();
      navigate("/login?securitySessionsRevoked=1", { replace: true });
    } catch (error) {
      setRevokeMessage(error?.response?.data?.message || "Nao foi possivel encerrar as sessoes.");
    } finally { setRevokeBusy(false); }
  }

  if (!user) return null;

  return (
    <section className="settings-screen account-settings-screen">
      <header className="account-settings-header">
        <BackLink to="/settings">Voltar para Configurações</BackLink>
        <h2>Conta e preferências</h2>
        <p>Gerencie sua identidade, localização e informações do 77Gira.</p>
      </header>

      <section className="account-settings-section account-personal-section">
        <div className="account-settings-section-title"><div><strong>Dados pessoais</strong><small>Foto e identidade da sua conta.</small></div><button className={`account-edit-button${editingProfile ? "" : " account-edit-button--icon"}`} type="button" title={editingProfile ? "Fechar edição" : "Editar dados pessoais"} aria-label={editingProfile ? "Fechar edição" : "Editar dados pessoais"} onClick={() => { setEditingProfile((current) => !current); setProfileMessage(""); }}>{editingProfile ? "Fechar edição" : <Pencil size={15} strokeWidth={1.8}/>}</button></div>
        <div className="account-profile-row">
          <div className="settings-avatar-control">
            <input ref={avatarInputRef} className="settings-avatar-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarChange}/>
            <button className="settings-avatar" type="button" disabled={avatarBusy} onClick={() => avatarInputRef.current?.click()} aria-label="Alterar foto de perfil">
              {user.avatarUrl ? <img src={user.avatarUrl} alt=""/> : user.firstName?.[0] || "7"}
            </button>
            <span className="settings-avatar-edit" aria-hidden="true"><Camera size={10}/></span>
          </div>
          <div><strong>{`${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email}</strong><p>{user.email}</p>{avatarMessage ? <small role="status">{avatarMessage}</small> : null}</div>
        </div>
        {editingProfile ? <form className="account-profile-form" onSubmit={saveProfile}>
          <div className="account-form-pair"><label>Nome<input required minLength="2" value={profileForm.firstName} onChange={(event) => setProfileForm({ ...profileForm, firstName: event.target.value })}/></label><label>Sobrenome<input required minLength="2" value={profileForm.lastName} onChange={(event) => setProfileForm({ ...profileForm, lastName: event.target.value })}/></label></div>
          <label>Nome de usuário<input required minLength="3" value={profileForm.username} onChange={(event) => setProfileForm({ ...profileForm, username: event.target.value })}/></label>
          <label>E-mail<input value={user.email} readOnly aria-readonly="true"/><small>A alteração de e-mail será liberada após a confirmação segura por e-mail.</small></label>
          <div className="account-form-pair"><label>Telefone<input value={profileForm.phone} onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })}/></label><label>Instagram<input value={profileForm.instagramHandle} onChange={(event) => setProfileForm({ ...profileForm, instagramHandle: event.target.value })} placeholder="@usuario"/></label></div>
          <div className="form-actions-inline"><button className="chip active" disabled={profileBusy}>{profileBusy ? "Salvando..." : "Salvar dados"}</button><button className="chip" type="button" onClick={() => setEditingProfile(false)}>Cancelar</button></div>
        </form> : null}
        {profileMessage ? <small className="account-form-message" role="status">{profileMessage}</small> : null}
        {editingProfile ? <LocationBaseCard user={user} token={token} refreshToken={refreshToken} setAuth={setAuth}/> : null}
        {editingProfile ? <form className="account-password-form" onSubmit={savePassword}>
          <strong>Alterar senha</strong>
          <p>Ao concluir, todas as sessões abertas serão encerradas.</p>
          <label>Senha atual<input required type="password" autoComplete="current-password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })}/></label>
          <div className="account-form-pair"><label>Nova senha<input required minLength="8" type="password" autoComplete="new-password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })}/></label><label>Confirmar nova senha<input required minLength="8" type="password" autoComplete="new-password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })}/></label></div>
          {passwordMessage ? <small className="account-form-error" role="alert">{passwordMessage}</small> : null}
          <button className="auth-btn" disabled={passwordBusy}>{passwordBusy ? "Alterando..." : "Alterar senha"}</button>
        </form> : null}
      </section>

      <section className="account-settings-section">
        <div className="account-settings-section-title"><div><strong>Perfis e acessos</strong><small>Artistas, casas e ambientes vinculados à sua conta.</small></div></div>
        {artists.map((artist) => <Link className="account-access-row" to={`/artistas/${artist.slug || artist.id}`} key={artist.id}><span><strong>{artist.name}</strong><small>Perfil de artista reivindicado</small></span><ChevronRight size={16}/></Link>)}
        <Link className="settings-link-row" to="/settings">Abrir Hub de Gestão <ChevronRight size={16}/></Link>
      </section>

      <section className="account-settings-section account-session-section">
        <h3>Sessão</h3>
        <button className="auth-btn account-logout-btn" type="button" onClick={handleLogout}>Sair da conta</button>
        <form className="account-session-revoke" onSubmit={handleRevokeSessions}>
          <strong>Encerrar sessões em todos os dispositivos</strong><p>Use se você perdeu um dispositivo ou suspeita de acesso indevido. Será necessário entrar novamente.</p>
          <label>Senha atual<input required type="password" autoComplete="current-password" value={revokePassword} onChange={(event) => setRevokePassword(event.target.value)} /></label>
          {revokeMessage ? <small className="account-form-error" role="alert">{revokeMessage}</small> : null}
          <button className="chip" disabled={revokeBusy}>{revokeBusy ? "Encerrando..." : "Encerrar todas as sessões"}</button>
        </form>
      </section>
      <InstitutionalFooter />
    </section>
  );
}
