import { describe, it, expect, vi } from 'vitest';
import { CATEGORIES } from '../../src/core/types';
import {
  PromptApiClassifier, buildPrompt, buildSchema, parseLlmOutput,
} from '../../src/llm/classifier';
import type { LanguageModelStatic } from '../../src/llm/availability';
import { makeMeta } from '../helpers';

const fields = [makeMeta({ id: 'a', label: '姓' }), makeMeta({ id: 'b', name: 'x' })];

describe('buildSchema', () => {
  it('requires every id and constrains values to known categories', () => {
    const schema = buildSchema(fields);
    expect(schema.required).toEqual(['a', 'b']);
    expect(schema.properties.a!.enum).toEqual([...CATEGORIES]);
    expect(schema.additionalProperties).toBe(false);
  });
});

describe('buildPrompt', () => {
  it('contains only field metadata', () => {
    const p = buildPrompt([makeMeta({ id: 'a', label: '姓', value: '佐藤' })]);
    expect(p).toContain('"label":"姓"');
    expect(p).not.toContain('佐藤');
  });
});

describe('parseLlmOutput', () => {
  it('keeps valid categories and drops unknown or malformed entries', () => {
    const m = parseLlmOutput('{"a":"lastName","b":"nonsense"}', fields);
    expect([...m]).toEqual([['a', 'lastName']]);
  });

  it('returns an empty map for invalid JSON', () => {
    expect(parseLlmOutput('not json', fields).size).toBe(0);
    expect(parseLlmOutput('null', fields).size).toBe(0);
  });
});

describe('PromptApiClassifier', () => {
  const makeLm = (promptImpl: () => Promise<string>) => {
    const destroy = vi.fn();
    const prompt = vi.fn(promptImpl);
    const create = vi.fn().mockResolvedValue({ prompt, destroy });
    return { lm: { create } as unknown as LanguageModelStatic, create, prompt, destroy };
  };

  it('classifies through a constrained prompt and destroys the session', async () => {
    const { lm, create, prompt, destroy } = makeLm(async () => '{"a":"lastName","b":"email"}');
    const result = await new PromptApiClassifier(lm).classify(fields);
    expect([...result]).toEqual([['a', 'lastName'], ['b', 'email']]);
    expect(create.mock.calls[0]![0].initialPrompts[0].role).toBe('system');
    expect((prompt.mock.calls[0] as unknown[])[1]).toHaveProperty('responseConstraint');
    expect(destroy).toHaveBeenCalledOnce();
  });

  it('destroys the session even when prompting fails', async () => {
    const { lm, destroy } = makeLm(async () => { throw new Error('boom'); });
    await expect(new PromptApiClassifier(lm).classify(fields)).rejects.toThrow('boom');
    expect(destroy).toHaveBeenCalledOnce();
  });

  it('does not create a session for an empty list', async () => {
    const { lm, create } = makeLm(async () => '{}');
    expect((await new PromptApiClassifier(lm).classify([])).size).toBe(0);
    expect(create).not.toHaveBeenCalled();
  });
});
