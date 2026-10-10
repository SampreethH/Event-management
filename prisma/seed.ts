/**
 * Syncs the code catalog (src/lib/domain/catalog.ts) into Postgres and creates
 * demo hubs + stock so SOS availability works locally. Idempotent.
 *   npm run db:seed
 */
import { ItemCategory, PrismaClient } from "@prisma/client";
import { CATALOG, DECOR_KITS } from "../src/lib/domain/catalog";

const prisma = new PrismaClient();

const CATEGORY: Record<string, ItemCategory> = {
  sleeve: "SLEEVE",
  ribbon: "RIBBON",
  snack: "SNACK",
  cake: "CAKE",
  confectionery: "CONFECTIONERY",
  favor: "FAVOR",
};

async function main() {
  // One transaction so the RLS context below applies to every statement (pooled connections).
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT set_config('app.role', 'SYSTEM', true)`;

    for (const item of CATALOG) {
      const data = {
        category: CATEGORY[item.category]!,
        name: item.name,
        description: item.blurb,
        pricePaise: item.price,
        eggless: item.eggless,
        vegan: item.vegan,
        glutenFree: item.glutenFree,
        containsNuts: item.containsNuts,
        meta: { color: item.color, accent: item.accent ?? null, express: Boolean(item.express) },
      };
      await tx.catalogItem.upsert({ where: { id: item.id }, create: { id: item.id, ...data }, update: data });
      await tx.inventoryItem.upsert({
        where: { catalogItemId: item.id },
        create: { catalogItemId: item.id, sku: item.id.toUpperCase(), onHand: 400, reorderAt: 60 },
        update: {},
      });
    }

    for (const kit of DECOR_KITS) {
      const data = {
        name: kit.name,
        description: kit.blurb,
        pricePaise: kit.price,
        setupMinutes: kit.setupMinutes,
        footprintW: kit.footprint.w,
        footprintD: kit.footprint.d,
        footprintH: kit.footprint.h,
      };
      await tx.decorKit.upsert({ where: { id: kit.id }, create: { id: kit.id, ...data }, update: data });
    }

    // Demo hubs — replace with real geofences.
    const hubs = [
      { name: "Indiranagar", hubLat: 12.9719, hubLng: 77.6412, pincodes: ["560038", "560008", "560071", "560017"] },
      { name: "Koramangala", hubLat: 12.9352, hubLng: 77.6245, pincodes: ["560034", "560095", "560047", "560030"] },
    ];
    const express = CATALOG.filter((i) => i.express);
    for (const hub of hubs) {
      const zone =
        (await tx.serviceZone.findFirst({ where: { name: hub.name } })) ??
        (await tx.serviceZone.create({ data: { ...hub, radiusKm: 7, opensAt: 9, closesAt: 23 } }));
      for (const item of express) {
        const inv = await tx.inventoryItem.findUniqueOrThrow({ where: { catalogItemId: item.id } });
        await tx.zoneStock.upsert({
          where: { zoneId_inventoryId: { zoneId: zone.id, inventoryId: inv.id } },
          create: { zoneId: zone.id, inventoryId: inv.id, available: 80 },
          update: { available: 80 },
        });
      }
    }

    console.log(`Seeded ${CATALOG.length} catalog items, ${DECOR_KITS.length} decor kits, ${hubs.length} SOS hubs.`);
  }, { timeout: 120_000 });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
