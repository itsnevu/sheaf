export const dynamic = "force-dynamic";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { checkEvmAddress } from "@/lib/address";
import { CHAIN_NAMES, KNOWN_ASSETS, executionMode } from "@/lib/config";
import { fail, handler, json, readJson, requireSession } from "@/lib/http";
import { currentProvider } from "@/lib/providers";

export const GET = handler(async () => {
  const s = await requireSession("batch.view");
  const org = await db.organization.findUniqueOrThrow({ where: { id: s.organizationId } });
  const members = await db.membership.findMany({ where: { organizationId: org.id }, include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: "asc" } });
  return json({
    organization: { id: org.id, name: org.name, slug: org.slug, treasuryAddress: org.treasuryAddress, assetSymbol: org.assetSymbol, assetDecimals: org.assetDecimals, originChainId: org.originChainId, destinationChainId: org.destinationChainId, jitterEnabled: org.jitterEnabled, jitterMaxSeconds: org.jitterMaxSeconds, requireFourEyes: org.requireFourEyes, maxRetries: org.maxRetries },
    members: members.map((m) => ({ id: m.id, userId: m.userId, name: m.user.name, email: m.user.email, role: m.role })),
    mode: executionMode(),
    provider: currentProvider().describe(),
    chains: Object.entries(CHAIN_NAMES).map(([id, name]) => ({ id: Number(id), name, assets: Object.keys(KNOWN_ASSETS[Number(id)] ?? {}) })),
  });
});

const Patch = z.object({
  name: z.string().min(2).max(80).optional(),
  treasuryAddress: z.string().max(80).nullable().optional(),
  assetSymbol: z.string().min(2).max(10).optional(),
  originChainId: z.number().int().optional(),
  destinationChainId: z.number().int().optional(),
  jitterEnabled: z.boolean().optional(),
  jitterMaxSeconds: z.number().int().min(0).max(1800).optional(),
  requireFourEyes: z.boolean().optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
});

export const PATCH = handler(async (req) => {
  const s = await requireSession("settings.edit");
  const body = Patch.parse(await readJson(req));
  const org = await db.organization.findUniqueOrThrow({ where: { id: s.organizationId } });
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name.trim();
  if (body.treasuryAddress !== undefined) {
    if (body.treasuryAddress === null || body.treasuryAddress.trim() === "") data.treasuryAddress = null;
    else {
      const ac = checkEvmAddress(body.treasuryAddress);
      if (!ac.ok) return fail(400, `Treasury address: ${ac.message}`);
      data.treasuryAddress = ac.address;
    }
  }
  const originChainId = body.originChainId ?? org.originChainId;
  const destinationChainId = body.destinationChainId ?? org.destinationChainId;
  const assetSymbol = (body.assetSymbol ?? org.assetSymbol).toUpperCase();
  if (!CHAIN_NAMES[originChainId] || !CHAIN_NAMES[destinationChainId]) return fail(400, "Unknown chain");
  const asset = KNOWN_ASSETS[originChainId]?.[assetSymbol];
  const destAsset = KNOWN_ASSETS[destinationChainId]?.[assetSymbol];
  if (!asset || !destAsset) return fail(400, `${assetSymbol} is not configured on both ${CHAIN_NAMES[originChainId]} and ${CHAIN_NAMES[destinationChainId]}`);
  Object.assign(data, { originChainId, destinationChainId, assetSymbol, assetDecimals: asset.decimals });
  if (body.jitterEnabled !== undefined) data.jitterEnabled = body.jitterEnabled;
  if (body.jitterMaxSeconds !== undefined) data.jitterMaxSeconds = body.jitterMaxSeconds;
  if (body.requireFourEyes !== undefined) data.requireFourEyes = body.requireFourEyes;
  if (body.maxRetries !== undefined) data.maxRetries = body.maxRetries;
  const updated = await db.organization.update({ where: { id: org.id }, data });
  await audit({ organizationId: org.id, actorId: s.userId, actorEmail: s.email, action: "settings.updated", summary: "Organization settings updated", payload: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v])) });
  return json({ ok: true, organization: { name: updated.name, treasuryAddress: updated.treasuryAddress, assetSymbol: updated.assetSymbol, originChainId: updated.originChainId, destinationChainId: updated.destinationChainId, jitterEnabled: updated.jitterEnabled, jitterMaxSeconds: updated.jitterMaxSeconds, requireFourEyes: updated.requireFourEyes, maxRetries: updated.maxRetries } });
});
