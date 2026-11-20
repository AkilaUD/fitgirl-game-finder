/// <reference types="vite/client" />

interface Navigator {
  readonly deviceMemory?: number;
  readonly userAgentData?: { platform?: string };
  readonly gpu?: GPU;
}