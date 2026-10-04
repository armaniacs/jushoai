import type { AiStatus } from '../llm/availability';

export const PROVIDER_KINDS = ['none', 'built-in', 'openai', 'gemini'] as const;
export type ProviderKind = (typeof PROVIDER_KINDS)[number];
export const CLOUD_STATUSES = ['disabled', 'not-configured', 'permission-missing', 'auth-error'] as const;
export type CloudStatus = (typeof CLOUD_STATUSES)[number];
export type AiState = AiStatus | CloudStatus;

export interface OpenAiSettings {
  baseUrl: string;
  model: string;
}

export interface GeminiSettings {
  model: string;
  apiVersion: string;
}

export interface AiSettings {
  provider: ProviderKind;
  openai: OpenAiSettings;
  gemini: GeminiSettings;
}

export interface KeyPresence {
  openai: boolean;
  gemini: boolean;
}

export interface PublicAiSettings extends AiSettings {
  hasKey: KeyPresence;
}

export interface AiStatusInfo {
  status: AiState;
  provider: ProviderKind;
}

export const DEFAULT_AI_SETTINGS: AiSettings = {
  provider: 'none',
  openai: { baseUrl: '', model: '' },
  gemini: { model: '', apiVersion: 'v1beta' },
};

export const OPENAI_PRESETS = [
  { id: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
  { id: 'groq', label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1' },
  { id: 'mistral', label: 'Mistral', baseUrl: 'https://api.mistral.ai/v1' },
  { id: 'ollama', label: 'Ollama', baseUrl: 'http://localhost:11434/v1' },
  { id: 'lm-studio', label: 'LM Studio', baseUrl: 'http://127.0.0.1:1234/v1' },
] as const;

export const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com';
export const GEMINI_ORIGIN = `${GEMINI_BASE_URL}/*`;
