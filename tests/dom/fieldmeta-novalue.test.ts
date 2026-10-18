import { describe, it, expect, beforeEach } from 'vitest';
import { scanFields } from '../../src/dom/scan-fields';
import { targetsFromControls } from '../../src/dom/fill-plan';
import type { Control } from '../../src/dom/scan-fields';
import { META_WIRE_KEYS, parseRequest, toWireMeta } from '../../src/messages';
import { buildPlan } from '../../src/core/planner';
import type { Address, Profile } from '../../src/core/types';
import { makeMeta } from '../helpers';

const profile: Profile = {
  id: 'p1', label: 'メイン',
  lastName: '山田', firstName: '太郎', lastNameKana: 'ヤマダ', firstNameKana: 'タロウ',
  lastNameRomaji: 'Yamada', firstNameRomaji: 'Taro',
  gender: '', birthday: '', school: '', department: '',
  email: 'yamada@example.com', tel: '',
};
const address: Address = {
  id: 'a1', label: '自宅', profileId: '', zip: '', prefecture: '',
  city: '', street: '', building: '',
  country: '', address1: '', address2: '', address3: '', address4: '', postalCode: '',
};

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('PBI-11: LLM送信用はwire型のみで構築される', () => {
  it('toWireMeta は value キーを持たず allow-list キーのみを返す', () => {
    const meta = makeMeta({ id: 'a', value: 'SECRET-INPUT', label: 'メール' });
    const wire = toWireMeta(meta);
    expect(Object.keys(wire).sort()).toEqual([...META_WIRE_KEYS].sort());
    expect('value' in wire).toBe(false);
    expect(JSON.stringify(wire)).not.toContain('SECRET-INPUT');
  });

  it('parseRequest（受信側）はページ既存値を復元せず value を空に戻す', () => {
    const meta = makeMeta({ id: 'a', value: 'SECRET-INPUT', label: 'メール' });
    const r = parseRequest({ type: 'ai-classify', fields: [meta] });
    if (r?.type !== 'ai-classify') throw new Error('unexpected request shape');
    expect(r.fields[0]!.value).toBe('');
    expect(JSON.stringify(r.fields)).not.toContain('SECRET-INPUT');
  });

  it('走査→送信の一連で送信形状に値が混入しない', () => {
    document.body.innerHTML = '<input name="email" value="user@example.com">';
    const scanned = scanFields(document.body);
    // fill 判定用スナップショットとしては保持する（別経路の planner が読む）
    expect(scanned[0]!.meta.value).toBe('user@example.com');
    const wire = toWireMeta(scanned[0]!.meta);
    expect('value' in wire).toBe(false);
    expect(JSON.stringify(wire)).not.toContain('user@example.com');
  });
});

describe('PBI-11: fill判定の既存値参照は別経路で維持される', () => {
  it('入力済み欄はプランで filled として上書き抑止される', () => {
    const filled = buildPlan(
      [{ meta: makeMeta({ id: 'f1', value: '入力済み' }), cls: { category: 'email', confidence: 0.9, source: 'rule' } }],
      { profile, address },
    );
    expect(filled[0]).toMatchObject({ status: 'filled', value: '' });
    const empty = buildPlan(
      [{ meta: makeMeta({ id: 'f1', value: '' }), cls: { category: 'email', confidence: 0.9, source: 'rule' } }],
      { profile, address },
    );
    expect(empty[0]).toMatchObject({ status: 'ok', value: 'yamada@example.com' });
  });

  it('fill 適用時は live DOM 読みで既存値を参照する', () => {
    document.body.innerHTML = '<input name="email" value="user@example.com">';
    const el = document.body.querySelector('input')! as Control;
    const targets = targetsFromControls(
      new Map([['f1', { el }]]),
      (e, v) => { (e as HTMLInputElement).value = v; },
    );
    // スナップショットではなく live の el.value を読む
    expect(targets.get('f1')!.empty).toBe(false);
    el.value = '';
    expect(targets.get('f1')!.empty).toBe(true);
  });
});
