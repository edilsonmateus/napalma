import { getPrivacyRetentionPreview } from "../src/services/privacyRetention.service.js";
import { prisma } from "../src/lib/prisma.js";

try {
  console.log(JSON.stringify(await getPrivacyRetentionPreview(), null, 2));
} finally {
  await prisma.$disconnect();
}
