// Shared type definitions for funnel structures
export interface FunnelBlockOption {
  text: string;
  nextBlockId: string | null;
}

export interface FunnelBlock {
  id: string;
  message: string;
  options: FunnelBlockOption[];
}

export interface FunnelStage {
  id: string;
  name: string;
  explanation: string;
  blockIds: string[];
}

export interface FunnelFlow {
  startBlockId: string;
  stages: FunnelStage[];
  blocks: Record<string, FunnelBlock>;
}

export interface Resource {
  id: string;
  type: string;
  name: string;
  link: string;
  code: string;
  category: string;
}

export interface NewResource {
  type: string;
  name: string;
  link: string;
  code: string;
  category: string;
}

export interface Funnel {
  id: string;
  name: string;
  allocation: number;
  resources: Resource[];
  flow: FunnelFlow | null;
  isDeployed: boolean;
  delay: number;
}
