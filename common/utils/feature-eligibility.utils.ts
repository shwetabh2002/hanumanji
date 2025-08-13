import { APP_CONFIGS } from '@app/common/configs/app.config';

export interface AppVersionInfo {
  buildNumber?: number;
}

export const isFeatureEligible = (
  featureName: keyof typeof APP_CONFIGS.FEATURE_ELIGIBILITY,
  appInfo: AppVersionInfo,
): boolean => {
  const { buildNumber } = appInfo;

  // Check for general features
  if (featureName in APP_CONFIGS.FEATURE_ELIGIBILITY) {
    return (buildNumber ?? 0) >= APP_CONFIGS.FEATURE_ELIGIBILITY[featureName];
  }

  return false;
};
