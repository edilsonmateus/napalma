import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 3333),
  databaseUrl: process.env.DATABASE_URL || "",
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me"
};
