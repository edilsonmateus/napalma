import "dotenv/config";
import { cleanupExpiredVenueImageAssets } from "../src/services/venueImageCleanup.service.js";
import { prisma } from "../src/lib/prisma.js";

try {
  const result = await cleanupExpiredVenueImageAssets();
  console.info(JSON.stringify({ event: "venue_image_cleanup_complete", ...result }));
} catch (error) {
  console.error(JSON.stringify({ event: "venue_image_cleanup_failed", code: error?.code || "unknown" }));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
