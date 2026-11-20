import { reqGpuScore, reqCpuScore, ramGb, storageGb, evaluate as evalSpecs } from './specs';
import type { PcProfile, Game } from './gameTypes';

const pcKey = (pc: PcProfile) => `${pc.gpuScore}|${pc.cpuScore}|${pc.ram}|${pc.freeGb}`;

export function predict(g: Game, pc: PcProfile) {
  if (!g._v) g._v = {};
  const key = pcKey(pc);
  return g._v[key] || (g._v[key] = evalSpecs(g, pc));
}

export function checkField(
  kind: string,
  text: string | undefined,
  pc: PcProfile,
): 'pass' | 'fail' | 'unknown' {
  if (!text) return 'unknown';
  if (kind === 'gpu') {
    const need = reqGpuScore(text);
    return need == null || pc.gpuScore == null ? 'unknown' : pc.gpuScore >= need * 0.95 ? 'pass' : 'fail';
  }
  if (kind === 'cpu') {
    const need = reqCpuScore(text);
    return need == null || pc.cpuScore == null ? 'unknown' : pc.cpuScore >= need * 0.97 ? 'pass' : 'fail';
  }
  if (kind === 'ram') {
    const need = ramGb(text);
    return need == null || pc.ram == null ? 'unknown' : pc.ram >= need ? 'pass' : 'fail';
  }
  if (kind === 'storage') {
    const need = storageGb(text);
    return need == null || pc.freeGb == null ? 'unknown' : pc.freeGb >= need ? 'pass' : 'fail';
  }
  return 'unknown';
}