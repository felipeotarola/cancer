export const agentModel = "gpt-6-luna";
export const reasoningOptions = [
  { value: "Auto", label: "Auto", description: "Lunas standardnivå (medium)" },
  { value: "none", label: "Ingen", description: "Utan extra resonemang" },
  { value: "low", label: "Låg", description: "Snabbare svar" },
  { value: "medium", label: "Medium", description: "Balans mellan tid och resonemang" },
  { value: "high", label: "Hög", description: "Mer tid att resonera" },
  { value: "xhigh", label: "Extra hög", description: "För mer komplexa frågor" },
  { value: "max", label: "Max", description: "Mest resonemang, längre svarstid" },
] as const;
export function resolveReasoning(value: unknown): string {
  return reasoningOptions.some(option => option.value === value) && value !== 'Auto' ? value as string : 'medium';
}
