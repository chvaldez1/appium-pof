import { resolve } from 'node:path';
import { projectRoot } from '@config/project-paths.ts';

// Absolute paths keep discovery identical through the root and platform configs.
export const e2eSpecs = {
  appSmoke: resolve(projectRoot, 'tests/native/app-smoke.spec.ts'),
  safariSmoke: resolve(projectRoot, 'tests/mobile-web/safari/safari-smoke.spec.ts'),
  webviewSmoke: resolve(projectRoot, 'tests/hybrid/events/webview-smoke.spec.ts'),
  loginScreen: resolve(projectRoot, 'tests/native/auth/ios/login-screen.spec.ts'),
  organizerNavigation: resolve(projectRoot, 'tests/native/organizer/ios/organizer-navigation.spec.ts'),
  buyerNavigation: resolve(projectRoot, 'tests/hybrid/buyer/ios/buyer-navigation.spec.ts'),
  exploreDiscovery: resolve(projectRoot, 'tests/hybrid/checkout/ios/explore-discovery.spec.ts'),
  publicPurchase: resolve(projectRoot, 'tests/hybrid/checkout/ios/public-purchase.spec.ts'),
} as const;

export function defaultSpecForTarget(target: string): string {
  if (target.endsWith('-webview')) return e2eSpecs.webviewSmoke;
  if (target.endsWith('-app')) return e2eSpecs.appSmoke;
  return e2eSpecs.safariSmoke;
}
