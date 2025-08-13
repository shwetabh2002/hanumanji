import { NcantoAsset } from '@app/common/interfaces/ncantoAsset.interface';

export interface Explanation {
  level: number;
  message: string;
  originator: string;
  type: string;
}

export interface Recommendation {
  asset: Partial<NcantoAsset>; // Using Partial since the response contains subset of NcantoAsset properties
  businessScore: number;
  engineName: string;
  explanations: Explanation[];
  groupId: string;
  groupSize: number;
  score: number;
}

export interface ContextNames {
  en: string;
}

export interface INcantoResponse {
  contextId: string;
  contextNames: ContextNames;
  recommendations: Recommendation[];
}

export interface INcantoSubscriber {
  characteristics: {
    lifetime: string;
  };
  creationDateTime: string;
  customProperties: {
    subscriptionType: string;
    expiryTime?: string;
  };
  expiryTime?: string;
  lastActivityTime: string;
  profiles?: string[];
  subscriberId: string;
}
