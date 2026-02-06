import type { AppInstallation, GitHubApp, AppUsageInfo, UsageFilter } from '../types';

export type InstallationPredicate = (inst: AppInstallation) => boolean;

/**
 * Combines an array of predicates into a single predicate using logical AND.
 * Null/undefined entries are ignored, making it safe to conditionally include filters.
 */
export function composePredicates(
  ...predicates: (InstallationPredicate | null | undefined)[]
): InstallationPredicate {
  const active = predicates.filter(Boolean) as InstallationPredicate[];
  return (inst) => active.every(p => p(inst));
}

/** Matches installations belonging to a specific organization. */
export function byOrg(org: string): InstallationPredicate | null {
  if (!org) return null;
  return (inst) => inst.account.login === org;
}

/** Matches installations for a specific app slug. */
export function byAppSlug(slug: string): InstallationPredicate | null {
  if (!slug) return null;
  return (inst) => inst.app_slug === slug;
}

/** Matches installations whose app is owned by a specific owner. */
export function byAppOwner(
  owner: string,
  apps: Map<string, GitHubApp>,
): InstallationPredicate | null {
  if (!owner) return null;
  return (inst) => {
    const app = apps.get(inst.app_slug);
    return !!app?.owner && app.owner.login === owner;
  };
}

/** Matches installations by their app's usage status. */
export function byUsageStatus(
  filter: UsageFilter,
  getUsageForApp: (slug: string) => AppUsageInfo | undefined,
): InstallationPredicate | null {
  if (filter === 'all') return null;
  return (inst) => {
    const usage = getUsageForApp(inst.app_slug);
    if (filter === 'active') {
      return !!usage && usage.status === 'active';
    }
    // 'inactive' — includes unknown
    return !usage || usage.status !== 'active';
  };
}
