import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Env } from '@/infra/env/env.schema';
import { EnvService } from '@/infra/env/env.service';
import {
  HuggingFaceInferenceProvider,
  InferenceProviderError,
} from './huggingface-inference.provider';

function makeEnv(overrides: Partial<Env> = {}): EnvService {
  const values: Partial<Env> = {
    HF_API_TOKEN: 'test-token',
    HF_MODEL: 'test/model',
    HF_TIMEOUT_MS: 5000,
    HF_MAX_NEW_TOKENS: 180,
    ...overrides,
  };
  return { get: <K extends keyof Env>(k: K): Env[K] => values[k] as Env[K] } as EnvService;
}

const request = { prompt: 'explain this', maxNewTokens: 180 };

describe('HuggingFaceInferenceProvider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the generated text on success', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { content: '  the answer  ' } }] }),
        { status: 200 },
      ),
    );
    const provider = new HuggingFaceInferenceProvider(makeEnv());

    await expect(provider.generate(request)).resolves.toBe('the answer');
  });

  it('returns reported token usage when present', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: 'hi' } }],
          usage: { prompt_tokens: 12, completion_tokens: 3 },
        }),
        { status: 200 },
      ),
    );
    const provider = new HuggingFaceInferenceProvider(makeEnv());

    await expect(provider.generateResult(request)).resolves.toEqual({
      text: 'hi',
      usage: { promptTokens: 12, completionTokens: 3 },
    });
  });

  it('throws when no token is configured', async () => {
    const provider = new HuggingFaceInferenceProvider(makeEnv({ HF_API_TOKEN: undefined }));
    await expect(provider.generate(request)).rejects.toBeInstanceOf(InferenceProviderError);
  });

  it('throws on a non-ok status', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('nope', { status: 503 }));
    const provider = new HuggingFaceInferenceProvider(makeEnv());
    await expect(provider.generate(request)).rejects.toBeInstanceOf(InferenceProviderError);
  });

  it('throws on an unexpected response shape', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ unexpected: true }), { status: 200 }),
    );
    const provider = new HuggingFaceInferenceProvider(makeEnv());
    await expect(provider.generate(request)).rejects.toBeInstanceOf(InferenceProviderError);
  });

  it('maps an aborted request to a timeout error', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(
      Object.assign(new Error('aborted'), { name: 'AbortError' }),
    );
    const provider = new HuggingFaceInferenceProvider(makeEnv());
    await expect(provider.generate(request)).rejects.toBeInstanceOf(InferenceProviderError);
  });
});
