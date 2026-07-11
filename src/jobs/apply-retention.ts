import prisma from '@/lib/prisma';
import { getRetentionCutoff, getTenantPlanLimits } from '@/lib/tenant-plan';

/** Advance each cloud website's logical-deletion boundary. Run once per day. */
export async function applyRetentionSweep(now = new Date()) {
  const websites = await prisma.client.website.findMany({
    where: { deletedAt: null, tenantId: { not: null } },
    select: { id: true, retentionCutoffAt: true, tenant: { select: { plan: true } } },
  });

  let updated = 0;
  for (const website of websites) {
    const cutoff = getRetentionCutoff(getTenantPlanLimits(website.tenant?.plan).retentionDays, now);
    if (cutoff && (!website.retentionCutoffAt || website.retentionCutoffAt < cutoff)) {
      await prisma.client.website.update({ where: { id: website.id }, data: { retentionCutoffAt: cutoff } });
      updated += 1;
    }
  }

  return { updated };
}

/** Update retention cutoff for all websites belonging to a tenant when plan changes. */
export async function updateRetentionCutoffForTenant(tenantId: string, plan: string, now = new Date()) {
  const retentionDays = getTenantPlanLimits(plan).retentionDays;
  const newCutoff = getRetentionCutoff(retentionDays, now);

  const websites = await prisma.client.website.findMany({
    where: { deletedAt: null, tenantId },
    select: { id: true, retentionCutoffAt: true },
  });

  let updated = 0;
  for (const website of websites) {
    // If new plan has unlimited retention (null), clear the cutoff
    if (retentionDays === null) {
      if (website.retentionCutoffAt !== null) {
        await prisma.client.website.update({
          where: { id: website.id },
          data: { retentionCutoffAt: null },
        });
        updated += 1;
      }
      continue;
    }

    // If new cutoff is different from current, update it
    // Update when: no cutoff exists, or new cutoff is more restrictive (later date)
    // Also update when upgrading (newCutoff > oldCutoff means more data visible)
    if (!website.retentionCutoffAt || website.retentionCutoffAt.getTime() !== newCutoff.getTime()) {
      await prisma.client.website.update({
        where: { id: website.id },
        data: { retentionCutoffAt: newCutoff },
      });
      updated += 1;
    }
  }

  return { updated, newCutoff };
}

/** Get the effective retention cutoff for a website, considering both plan and reset. */
export async function getWebsiteRetentionCutoff(websiteId: string): Promise<Date | null> {
  const website = await prisma.client.website.findUnique({
    where: { id: websiteId },
    select: { retentionCutoffAt: true, resetAt: true },
  });

  if (!website) return null;

  // resetAt takes precedence if it exists and is later than retentionCutoffAt
  if (website.resetAt && website.retentionCutoffAt) {
    return website.resetAt > website.retentionCutoffAt ? website.resetAt : website.retentionCutoffAt;
  }

  return website.retentionCutoffAt || website.resetAt || null;
}
