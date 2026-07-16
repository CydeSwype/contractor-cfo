export interface Ports {
  server: number;
  client: number;
}

export function getPorts(name?: string): Ports;
export const PORTS: Ports;
