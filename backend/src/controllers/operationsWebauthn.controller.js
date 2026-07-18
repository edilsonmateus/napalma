import jwt from "jsonwebtoken";
import { generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse } from "@simplewebauthn/server";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import { recordAuditEvent } from "../services/audit.service.js";

const REGISTRATION = "operations_registration";
const CONFIRMATION = "operations_confirmation";
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function webauthnContext() {
  const publicUrl = new URL(env.publicAppUrl);
  const rpID = publicUrl.hostname.replace(/^www\./, "");
  const origins = [env.publicAppUrl, ...(process.env.CORS_ORIGINS || "").split(",")]
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter((value) => {
      try { return new URL(value).hostname.endsWith(rpID); } catch { return false; }
    });
  return { rpID, origins: [...new Set(origins)] };
}

async function saveChallenge(userId, purpose, challenge) {
  return prisma.operationWebAuthnChallenge.upsert({
    where: { userId_purpose: { userId, purpose } },
    create: { userId, purpose, challenge, expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS) },
    update: { challenge, expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS), usedAt: null }
  });
}

async function consumeChallenge(userId, purpose) {
  const item = await prisma.operationWebAuthnChallenge.findUnique({ where: { userId_purpose: { userId, purpose } } });
  if (!item || item.usedAt || item.expiresAt <= new Date()) return null;
  await prisma.operationWebAuthnChallenge.update({ where: { id: item.id }, data: { usedAt: new Date() } });
  return item.challenge;
}

export async function getOperationsWebAuthnStatus(req, res, next) {
  try {
    const count = await prisma.operationWebAuthnCredential.count({ where: { userId: req.user.id } });
    return res.json({ enrolled: count > 0, credentials: count });
  } catch (error) { next(error); }
}

export async function getOperationsRegistrationOptions(req, res, next) {
  try {
    const { rpID } = webauthnContext();
    const credentials = await prisma.operationWebAuthnCredential.findMany({ where: { userId: req.user.id }, select: { credentialId: true, transports: true } });
    const options = await generateRegistrationOptions({
      rpName: "77Gira Operações", rpID,
      userID: new TextEncoder().encode(req.user.id), userName: req.user.email,
      attestationType: "none", supportedAlgorithmIDs: [-7, -257],
      excludeCredentials: credentials.map((credential) => ({ id: credential.credentialId, transports: Array.isArray(credential.transports) ? credential.transports : [] })),
      authenticatorSelection: { residentKey: "preferred", userVerification: "required" },
      preferredAuthenticatorType: "localDevice"
    });
    await saveChallenge(req.user.id, REGISTRATION, options.challenge);
    return res.json(options);
  } catch (error) { next(error); }
}

export async function verifyOperationsRegistration(req, res, next) {
  try {
    const expectedChallenge = await consumeChallenge(req.user.id, REGISTRATION);
    if (!expectedChallenge) return res.status(400).json({ message: "A solicitação biométrica expirou. Inicie novamente." });
    const { rpID, origins } = webauthnContext();
    const verification = await verifyRegistrationResponse({ response: req.body, expectedChallenge, expectedOrigin: origins, expectedRPID: rpID, requireUserVerification: true });
    if (!verification.verified || !verification.registrationInfo) return res.status(400).json({ message: "Não foi possível validar a credencial deste dispositivo." });
    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
    await prisma.operationWebAuthnCredential.upsert({
      where: { credentialId: credential.id },
      create: { userId: req.user.id, credentialId: credential.id, publicKey: Buffer.from(credential.publicKey), counter: credential.counter, transports: credential.transports || [], deviceType: credentialDeviceType, backedUp: credentialBackedUp },
      update: { userId: req.user.id, publicKey: Buffer.from(credential.publicKey), counter: credential.counter, transports: credential.transports || [], deviceType: credentialDeviceType, backedUp: credentialBackedUp }
    });
    await recordAuditEvent({ req, action: "operations.webauthn_registered", subjectType: "operation_webauthn_credential", subjectId: credential.id, metadata: { deviceType: credentialDeviceType, backedUp: credentialBackedUp } });
    return res.json({ verified: true });
  } catch (error) { next(error); }
}

export async function getOperationsConfirmationOptions(req, res, next) {
  try {
    const { rpID } = webauthnContext();
    const credentials = await prisma.operationWebAuthnCredential.findMany({ where: { userId: req.user.id }, select: { credentialId: true, transports: true } });
    if (!credentials.length) return res.status(409).json({ message: "Cadastre a biometria deste dispositivo antes de confirmar ações sensíveis." });
    const options = await generateAuthenticationOptions({ rpID, userVerification: "required", allowCredentials: credentials.map((credential) => ({ id: credential.credentialId, transports: Array.isArray(credential.transports) ? credential.transports : [] })) });
    await saveChallenge(req.user.id, CONFIRMATION, options.challenge);
    return res.json(options);
  } catch (error) { next(error); }
}

export async function verifyOperationsConfirmation(req, res, next) {
  try {
    const expectedChallenge = await consumeChallenge(req.user.id, CONFIRMATION);
    if (!expectedChallenge) return res.status(400).json({ message: "A confirmação biométrica expirou. Tente novamente." });
    const stored = await prisma.operationWebAuthnCredential.findUnique({ where: { credentialId: req.body?.id } });
    if (!stored || stored.userId !== req.user.id) return res.status(400).json({ message: "A credencial não pertence à sua conta operacional." });
    const { rpID, origins } = webauthnContext();
    const verification = await verifyAuthenticationResponse({ response: req.body, expectedChallenge, expectedOrigin: origins, expectedRPID: rpID, credential: { id: stored.credentialId, publicKey: new Uint8Array(stored.publicKey), counter: stored.counter, transports: Array.isArray(stored.transports) ? stored.transports : [] }, requireUserVerification: true });
    if (!verification.verified) return res.status(400).json({ message: "A confirmação biométrica não foi validada." });
    await prisma.operationWebAuthnCredential.update({ where: { id: stored.id }, data: { counter: verification.authenticationInfo.newCounter, lastUsedAt: new Date() } });
    const proof = jwt.sign({ sub: req.user.id, purpose: "operations_sensitive_confirmation" }, env.jwtSecret, { expiresIn: "5m" });
    await recordAuditEvent({ req, action: "operations.webauthn_confirmed", subjectType: "operation_webauthn_credential", subjectId: stored.id, metadata: { purpose: "sensitive_confirmation" } });
    return res.json({ verified: true, proof, expiresInSeconds: 300 });
  } catch (error) { next(error); }
}
