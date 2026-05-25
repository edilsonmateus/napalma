import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import bcrypt from "bcryptjs";

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
