export type Lake = {
  id: number;
  name: string;
  state: string;
  geometry: string;
  area_km2: number;
  shoreline_length_km: number;
};

export type ConfidenceFactors = {
  cloud_quality: number;
  shoreline_risk: number;
  model_agreement: number;
  data_age: number;
  label_quality: number;
  observation_quality: number;
  model_quality: number;
  domain_quality: number;
  time_quality: number;
};

export type Prediction = {
  id: number;
  lake_id: number;
  scene_id: number;
  generated_at: string;
  bloom_probability: number;
  confidence_score: number;
  confidence_factors_json: ConfidenceFactors & {
    features?: Record<string, number>;
  };
  model_version: string;
  label:
    | "Probable bloom, high confidence"
    | "Probable bloom, guarded confidence"
    | "Possible bloom"
    | "Bloom unlikely, high confidence"
    | "Not enough reliable information";
};

export type PredictionExplanation = Prediction & {
  confidence_factors: ConfidenceFactors;
  explanation: string[];
  screening_notice: string;
  advisory: {
    label: string;
    url: string;
  };
};

export type ReportPayload = {
  lake_id: number;
  lat: number;
  lon: number;
  photo_url?: string | null;
  visual_category: string;
  notes?: string | null;
};

export type CitizenReport = ReportPayload & {
  id: number;
  submitted_at: string;
  review_status: "pending" | "approved" | "rejected" | string;
};

export type CurrentModel = {
  model_version: string;
  model_type: string;
  purpose: string;
  limitations: string[];
  features: string[];
};

const defaultBaseUrl =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL
    : "http://127.0.0.1:8000";

export class LakeBloomApi {
  constructor(private readonly baseUrl = defaultBaseUrl) {}

  async listLakes(): Promise<Lake[]> {
    return this.get("/lakes");
  }

  async getLake(lakeId: number): Promise<Lake> {
    return this.get(`/lakes/${lakeId}`);
  }

  async getLatestPrediction(lakeId: number): Promise<Prediction> {
    return this.get(`/lakes/${lakeId}/latest`);
  }

  async getPredictionHistory(lakeId: number): Promise<Prediction[]> {
    return this.get(`/lakes/${lakeId}/history`);
  }

  async explainPrediction(predictionId: number): Promise<PredictionExplanation> {
    return this.get(`/predictions/${predictionId}/explain`);
  }

  async submitReport(payload: ReportPayload): Promise<CitizenReport> {
    return this.request("/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  async getCurrentModel(): Promise<CurrentModel> {
    return this.get("/models/current");
  }

  private async get<T>(path: string): Promise<T> {
    return this.request(path);
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, init);
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Lake Bloom API ${response.status}: ${detail}`);
    }
    return response.json() as Promise<T>;
  }
}

export const lakeBloomApi = new LakeBloomApi();
