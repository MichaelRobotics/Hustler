import React from 'react';
import { LoadingOverlay } from './LoadingOverlay';
import type { LoadingState } from '../types';

interface LoadingScreenProps {
  loadingState: LoadingState;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ loadingState }) => {
  return <LoadingOverlay loadingState={loadingState} />;
};


