export interface RegistryEntry {
  url: string;
  file: string | null;
}

export function parseRegistry(md: string): RegistryEntry[];
export function stampRegistry(md: string, url: string, file: string): string;
