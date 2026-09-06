-- Novas posições do Explorar. A migração é somente aditiva: campanhas,
-- criativos, entregas e snapshots comerciais existentes permanecem intactos.
ALTER TYPE "AdSlot" ADD VALUE IF NOT EXISTS 'explore_between_days';
ALTER TYPE "AdSlot" ADD VALUE IF NOT EXISTS 'explore_between_days_carousel';
