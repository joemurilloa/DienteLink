import React from 'react';
import { ProFeature } from '../hooks/useSubscription';

interface FeatureGateProps {
  feature: ProFeature;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  inline?: boolean;
}

/**
 * Wraps a feature that requires an active subscription.
 * TODO: Re-enable gate logic when pricing is ready to launch.
 * Currently passes through all children unconditionally.
 */
const FeatureGate: React.FC<FeatureGateProps> = ({ children }) => {
  // Development mode — all features unlocked
  return <>{children}</>;
};

export default FeatureGate;
