import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import bcrypt from "bcryptjs";
import { isReservedUsername, isUsernameSyntaxValid, RESERVED_USERNAME_MESSAGE } from "../utils/usernamePolicy.js";

const querySchema = z.object({
  q: z.string().trim().min(1).optional()
});

const createProducerSchema = z.object({
  firstName: z.string().trim().min(2),
  lastName: z.string().trim().min(2),
  username: z.string().trim().min(3),
  email: z.string().email(),
  phone: z.string().trim().min(8).optional(),
  password: z.string().min(6)
});

const createCommonUserSchema = createProducerSchema.extend({
  password: z.string().min(8).max(128),
  canUseReservedBrandUsername: z.boolean().optional().default(false)
});
const permissionSchema = z.object({ canUseReservedBrandUsername: z.boolean() });
const userIdSchema = z.object({ id: z.string().uuid() });
const adminUserSelect = {
  id: true, email: true, username: true, firstName: true, lastName: true, phone: true,
  role: true, canUseReservedBrandUsername: true, reservedUsernameGrantedByUserId: true,
  reservedUsernameGrantedAt: true, createdAt: true
};

export async function listCommonUsers(req, res, next) {
  try {
    const { q } = querySchema.parse(req.query);
    const items = await prisma.user.findMany({
      where: {
        role: "attendee",
        ...(q ? { OR: [
          { email: { contains: q, mode: "insensitive" } },
          { username: { contains: q, mode: "insensitive" } },
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } }
        ] } : {})
      },
      select: adminUserSelect,
      orderBy: { createdAt: "desc" },
      take: 50
    });
    return res.json({ items });
  } catch (error) { return next(error); }
}

export async function createCommonUser(req, res, next) {
  try {
    const data = createCommonUserSchema.parse(req.body || {});
    const email = data.email.toLowerCase();
    if (!isUsernameSyntaxValid(data.username)) return res.status(400).json({ error: "invalid_username", message: "Use de 3 a 40 caracteres: letras sem acento, números, ponto, hífen ou underline." });
    const reserved = isReservedUsername(data.username);
    if (reserved && !data.canUseReservedBrandUsername) {
      return res.status(409).json({ error: "reserved_username", message: RESERVED_USERNAME_MESSAGE });
    }
    const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username: data.username }] }, select: { id: true } });
    if (existing) return res.status(409).json({ error: "user_already_exists", message: "Já existe usuário com esse e-mail ou username." });
    const passwordHash = await bcrypt.hash(data.password, 10);
    const officialPermission = Boolean(data.canUseReservedBrandUsername);
    const user = await prisma.user.create({
      data: {
        email, username: data.username, firstName: data.firstName, lastName: data.lastName,
        phone: data.phone || null, passwordHash, role: "attendee",
        canUseReservedBrandUsername: officialPermission,
        reservedUsernameGrantedByUserId: officialPermission ? req.user.id : null,
        reservedUsernameGrantedAt: officialPermission ? new Date() : null
      },
      select: adminUserSelect
    });
    return res.status(201).json({ item: user });
  } catch (error) { return next(error); }
}

export async function setReservedUsernamePermission(req, res, next) {
  try {
    const { id } = userIdSchema.parse(req.params);
    const { canUseReservedBrandUsername } = permissionSchema.parse(req.body || {});
    const current = await prisma.user.findFirst({ where: { id, role: "attendee" }, select: { id: true, username: true } });
    if (!current) return res.status(404).json({ error: "user_not_found", message: "Usuário comum não encontrado." });
    if (!canUseReservedBrandUsername && isReservedUsername(current.username)) {
      return res.status(409).json({ error: "reserved_username_in_use", message: "Troque o username oficial desta conta antes de remover a autorização da marca." });
    }
    const user = await prisma.user.update({
      where: { id },
      data: {
        canUseReservedBrandUsername,
        reservedUsernameGrantedByUserId: canUseReservedBrandUsername ? req.user.id : null,
        reservedUsernameGrantedAt: canUseReservedBrandUsername ? new Date() : null
      },
      select: adminUserSelect
    });
    return res.json({ item: user });
  } catch (error) { return next(error); }
}

export async function listProducerUsers(req, res, next) {
  try {
    const { q } = querySchema.parse(req.query);
    const items = await prisma.user.findMany({
      where: {
        role: "producer",
        ...(q
          ? {
              OR: [
                { email: { contains: q, mode: "insensitive" } },
                { username: { contains: q, mode: "insensitive" } },
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } }
              ]
            }
          : {})
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      take: 20
    });

    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function createProducerUser(req, res, next) {
  try {
    const data = createProducerSchema.parse(req.body);
    const email = data.email.toLowerCase();

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username: data.username }]
      },
      select: { id: true }
    });

    if (existing) {
      return res.status(409).json({
        error: "user_already_exists",
        message: "Ja existe usuario com esse email ou username."
      });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        passwordHash,
        role: "producer"
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        createdAt: true
      }
    });

    res.status(201).json({ item: user });
  } catch (error) {
    next(error);
  }
}

export const createVenueManagerUser = createProducerUser;
