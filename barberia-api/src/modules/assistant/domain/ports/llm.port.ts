export const LLM_PORT = Symbol('LLM_PORT');

export interface LlmTool {
  name: string;
  description: string;
  /** JSON schema of the arguments. */
  parameters: Record<string, unknown>;
}

export interface LlmToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface LlmResponse {
  text: string | null;
  toolCalls: LlmToolCall[];
}

export interface LlmPort {
  complete(input: { system: string; user: string; tools: LlmTool[] }): Promise<LlmResponse>;
}
