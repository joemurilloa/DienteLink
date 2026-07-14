import React from 'react';

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  inline?: boolean;
}

const FeatureGate: React.FC<FeatureGateProps> = ({ children }) => {
  return <>{children}</>;
};

export default FeatureGate;
