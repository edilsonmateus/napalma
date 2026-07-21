export function assertDestructiveSeedAllowed(environment = process.env.NODE_ENV) {
  if (String(environment || "").trim().toLowerCase() === "production") {
    throw new Error(
      "Seed destrutivo bloqueado em producao. Use prisma:migrate:deploy e prisma:refresh-demo-events."
    );
  }
}
