import type { KanaKind } from './types';

// Strips the 例: prefix that sample placeholders start with; shared with classify-rules.
export const stripExample = (s: string) => s.replace(/^例[)）:：]?/, '').trim();

const FULL = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンァィゥェォッャュョー・';
const HALF = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝｧｨｩｪｫｯｬｭｮｰ･';
const FULL_TO_HALF = new Map([...FULL].map((c, i) => [c, HALF[i]]));

export function toKatakana(s: string): string {
  return s.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
}

export function toHiragana(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

// NFD splits voiced kana into base + combining mark, which maps onto half-width base + ﾞ/ﾟ.
export function toHalfKatakana(s: string): string {
  return [...s.normalize('NFD')]
    .map((c) => (c === '゙' ? 'ﾞ' : c === '゚' ? 'ﾟ' : (FULL_TO_HALF.get(c) ?? c)))
    .join('');
}

export function formatKana(katakana: string, kind: KanaKind): string {
  if (kind === 'hiragana') return toHiragana(katakana);
  if (kind === 'halfKatakana') return toHalfKatakana(katakana);
  return katakana;
}

export function detectNameSeparator(placeholder: string): string {
  const p = stripExample(placeholder);
  if (p.includes('　')) return '　';
  if (p.includes(' ')) return ' ';
  if (/^[぀-ヿ一-鿿]{2,}$/.test(p)) return '';
  return ' ';
}

export const joinName = (last: string, first: string, sep: string) => `${last}${sep}${first}`;

// 4-digit area codes with the domestic 0 prefix. 10-digit numbers starting with these are
// 4-2-4; without this table a 3-3-4 fallback would split e.g. 小樽 0134-32-1234 incorrectly.
// Sourced from the 総務省 area code table (1-4 digits, 4 being the longest since 2006).
const AREA4 = new Set([
  '0123', '0124', '0125', '0126', '0133', '0134', '0135', '0136', '0137', '0138', '0139',
  '0142', '0143', '0144', '0145', '0146', '0152', '0153', '0154', '0155', '0156', '0157', '0158',
  '0162', '0163', '0164', '0165', '0166', '0167',
  '0172', '0173', '0174', '0175', '0176', '0178', '0179',
  '0182', '0183', '0184', '0185', '0186', '0187',
  '0191', '0192', '0193', '0194', '0195', '0197', '0198',
  '0220', '0223', '0224', '0225', '0226', '0228', '0229',
  '0233', '0234', '0235', '0237', '0238',
  '0240', '0241', '0242', '0243', '0244', '0246', '0247', '0248',
  '0250', '0254', '0255', '0256', '0257', '0258', '0259',
  '0260', '0261', '0263', '0264', '0265', '0266', '0267', '0268', '0269',
  '0270', '0274', '0276', '0277', '0278', '0279',
  '0280', '0282', '0283', '0284', '0285', '0287', '0288', '0289',
  '0291', '0293', '0294', '0295', '0296', '0297', '0299',
  '0428', '0436', '0438',
  '0460', '0463', '0465', '0466', '0467', '0470', '0475', '0476', '0478', '0479', '0480',
  '0493', '0494', '0495', '0499',
  '0531', '0532', '0536', '0537', '0538', '0539', '0544', '0545', '0547', '0548',
  '0550', '0551', '0553', '0554', '0555', '0556', '0557', '0558',
  '0561', '0562', '0563', '0564', '0565', '0566', '0567', '0568', '0569',
  '0572', '0573', '0574', '0575', '0576', '0577', '0578',
  '0581', '0584', '0585', '0586', '0587',
  '0594', '0595', '0596', '0597', '0598', '0599',
  '0721', '0725',
  '0735', '0736', '0737', '0738', '0739', '0740',
  '0742', '0744', '0745', '0746', '0747', '0748', '0749',
  '0761', '0763', '0765', '0766', '0767', '0768',
  '0770', '0771', '0772', '0773', '0774', '0776', '0778', '0779',
  '0790', '0791', '0794', '0795', '0796', '0797', '0799',
  '0820', '0823', '0824', '0826', '0827', '0829',
  '0833', '0834', '0835', '0836', '0837', '0838',
  '0845', '0846', '0847',
  '0852', '0853', '0854', '0855', '0856', '0857', '0858', '0859',
  '0863', '0865', '0866', '0867', '0868', '0869',
  '0875', '0877', '0879',
  '0880', '0883', '0884', '0885', '0887', '0889',
  '0892', '0893', '0894', '0895', '0896', '0897', '0898',
  '0920', '0930', '0940',
  '0942', '0943', '0944', '0946', '0947', '0948', '0949',
  '0950', '0952', '0954', '0955', '0956', '0957', '0959',
  '0964', '0965', '0966', '0967', '0968', '0969',
  '0972', '0973', '0974', '0977', '0978', '0979',
  '0980', '0982', '0983', '0984', '0985', '0986', '0987',
  '0993', '0994', '0995', '0996', '0997',
]);

export function splitTel(d: string): string[] {
  if (/^0(120|800)/.test(d) && d.length === 10) return [d.slice(0, 4), d.slice(4, 7), d.slice(7)];
  if (d.length === 11) return [d.slice(0, 3), d.slice(3, 7), d.slice(7)];
  if (/^0[36]/.test(d)) return [d.slice(0, 2), d.slice(2, 6), d.slice(6)];
  if (d.length === 10 && AREA4.has(d.slice(0, 4))) return [d.slice(0, 4), d.slice(4, 6), d.slice(6)];
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6)];
}

export const splitZip = (d: string): [string, string] => [d.slice(0, 3), d.slice(3)];

export function wantsHyphen(
  placeholder: string,
  maxLength: number | null,
  kind: 'tel' | 'zip',
): boolean {
  if (/[-‐－−]/.test(placeholder)) return true;
  if (maxLength !== null) return maxLength >= (kind === 'tel' ? 13 : 8);
  return false;
}
