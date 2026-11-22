import { describe, it, expect } from 'vitest';
import { evalMetricsFor, reportLine, aggregate, p, type EvalMetrics, type PinRow } from '../../src/eval/metrics';
import { scanFields } from '../../src/dom/scan-fields';
// The corpus (name → html + per-fixture expectations) comes from the shared
// ledger module (PBI-216): the glob lives there, once, so this file carries
// no second registry and a fixture added via `make addurl` joins without a
// list edit here.
import { corpus } from '../corpus';

// Per-fixture pin table (PBI-215): one row per corpus fixture. Row values are
// copied from the `make eval` reportLine output, never recomputed by hand.
// Rows move only when fixtures or the pipeline change. A drift names its
// fixture, the aggregate is read as the table's sums, and the row diff in git
// is the composition record.
// 現在の内訳は pin 表を見よ。pin のずれは表の該当 fixture 行を同じコミットで
// 編集する。表の diff が世代記録になる。古い基準値の追記はしない。
// unknowns は total - ruleHits で誘導できるため行に載せない（EvalMetrics には残る）。
// PinRow と p() は src/eval/metrics.ts にあり、make eval-pin の生成行と共有する。
const PIN_TABLE: Record<string, PinRow> = {
  '12fc22bc297429.html': p(10, 0, 8, 3, 0),
  '2dd1c663300469.html': p(11, 1, 7, 0, 0),
  '6932.html': p(13, 4, 5, 1, 0),
  'adachi-gakuen-apply.html': p(20, 0, 14, 3, 0),
  'aeon-voice-form.html': p(7, 2, 6, 0, 0),
  'age-decade-select-form.html': p(2, 0, 2, 0, 0),
  'anabuki-general-contact.html': p(4, 3, 2, 2, 0),
  'anabuki-landuse-contact.html': p(9, 4, 1, 4, 0),
  'aoyama-campus-inquiry.html': p(7, 4, 7, 3, 0),
  'aoyama-sagamihara-career.html': p(5, 1, 4, 0, 0),
  'apaman-contact.html': p(9, 0, 7, 0, 0),
  'arakawa-mailform.html': p(4, 0, 3, 0, 0),
  'auhikari-callback-form.html': p(14, 0, 8, 9, 0),
  'axis-inquiry-form.html': p(18, 4, 7, 2, 0),
  'benesse-inquiry-form.html': p(8, 4, 7, 2, 0),
  'brillia-support-contact.html': p(7, 12, 6, 0, 0),
  'brother-inquiry-form.html': p(4, 12, 3, 0, 0),
  'bst-inquire.html': p(14, 13, 10, 0, 0),
  'cigr-ir-contact.html': p(11, 2, 5, 3, 0),
  'contact.html': p(11, 0, 6, 0, 0),
  'demo-ai-ambiguous.html': p(2, 8, 2, 0, 0),
  'demo-registration.html': p(10, 0, 7, 1, 0),
  'demo-request-info.html': p(10, 0, 7, 1, 0),
  'demo-shop-checkout.html': p(10, 0, 7, 1, 0),
  'eikoh-shiryo-form.html': p(3, 2, 2, 0, 6),
  'eishinkan-contact-form.html': p(22, 9, 13, 7, 0),
  'ena-request-form.html': p(17, 7, 11, 3, 4),
  'fukuoka-teian-form.html': p(9, 1, 5, 0, 0),
  'fujita-contact.html': p(10, 1, 6, 0, 0),
  'ff-compliance-hotline-form.html': p(6, 1, 6, 0, 0),
  'ff-csr.html': p(14, 1, 9, 0, 0),
  'ff-procurement-form.html': p(14, 1, 9, 0, 0),
  'ff-webmaster-form.html': p(14, 1, 9, 0, 0),
  'formmailer-anketo-gender.html': p(2, 6, 0, 0, 0),
  'formmailer-raijo-age.html': p(16, 5, 10, 6, 0),
  'forum.html': p(7, 0, 5, 0, 0),
  'furigana-fieldset-form.html': p(4, 0, 4, 0, 0),
  'gender-select-form.html': p(2, 0, 1, 0, 0),
  'gis-intl-admission.html': p(6, 8, 3, 0, 0),
  'hamamatsu-kocho-form.html': p(6, 2, 5, 0, 0),
  'hhp-site-inquiry.html': p(11, 4, 9, 9, 0),
  'hulic-develop-plan.html': p(11, 1, 8, 4, 0),
  'ichishin-contact-form.html': p(24, 11, 16, 17, 0),
  'index-asp.html': p(7, 11, 5, 2, 0),
  'inquiry-html.html': p(12, 0, 7, 2, 0),
  'isi-contact.html': p(5, 7, 4, 0, 0),
  'jiritsu-red-contact-form.html': p(11, 1, 6, 0, 0),
  'jpaa-contact.html': p(9, 2, 7, 3, 0),
  'katakana-fieldset-form.html': p(4, 0, 4, 0, 0),
  'keishin-contact-form.html': p(22, 8, 14, 11, 0),
  'keyence-inquiry-form.html': p(13, 1, 6, 1, 0),
  'kigakuen-briefing.html': p(22, 8, 11, 6, 0),
  'kikkoman-media-form.html': p(3, 6, 3, 3, 0),
  'kikkoman-website-form.html': p(7, 5, 7, 3, 0),
  'kikkoman-works-form.html': p(7, 4, 7, 3, 0),
  'kit-contact-form.html': p(7, 2, 7, 0, 0),
  'kosodate-contact.html': p(4, 3, 4, 0, 0),
  'kubota-engine-contact-form.html': p(9, 4, 5, 1, 0),
  'kumon-annai-form.html': p(10, 7, 8, 7, 0),
  'lasertec-inquiry-form.html': p(15, 2, 8, 9, 0),
  'library-theater-apply.html': p(15, 4, 9, 6, 0),
  'lixil-inquiry-form.html': p(15, 5, 8, 2, 0),
  'mailform.html': p(4, 0, 4, 0, 0),
  'manavis-shiryo-form.html': p(18, 4, 12, 3, 0),
  'meiko-contact-form.html': p(18, 4, 9, 6, 0),
  'mitsubishi-materials-form.html': p(19, 0, 12, 12, 0),
  'mitsui-reform-catalog-form.html': p(20, 9, 8, 11, 0),
  'mitsuihome-sonota-form.html': p(11, 11, 6, 6, 0),
  'mori-webcas-contact.html': p(4, 9, 2, 4, 0),
  'morijuku-contact-form.html': p(9, 1, 7, 1, 0),
  'ngk-contact-form.html': p(7, 1, 4, 0, 0),
  'nishimachi-inquiry.html': p(15, 4, 7, 0, 0),
  'nkanzai-contact.html': p(3, 1, 3, 0, 0),
  'nttud-inquiry.html': p(6, 0, 4, 0, 0),
  'ois-contact.html': p(10, 1, 7, 2, 0),
  'okayama-inquiry-form.html': p(6, 2, 5, 0, 0),
  'opinion-html.html': p(4, 3, 2, 0, 0),
  'openhouse-customer-contact.html': p(11, 1, 7, 0, 0),
  'otsuka-opinion-form.html': p(8, 1, 6, 3, 0),
  'overseas-address-form.html': p(8, 0, 1, 0, 0),
  'overseas-webform-joshibi.html': p(11, 2, 4, 0, 0),
  'proud-procedure-form.html': p(19, 1, 6, 8, 0),
  'profile-fields-form.html': p(5, 0, 3, 0, 0),
  'registration.html': p(15, 4, 8, 0, 0),
  'reinvent-registration-contact.html': p(4, 3, 2, 0, 0),
  'responsepage-aspx.html': p(6, 1, 3, 0, 0),
  'richell-anketo-rating.html': p(0, 7, 0, 0, 0),
  'rinkai-shiryo-form.html': p(10, 4, 7, 1, 0),
  'roman-name-form.html': p(3, 0, 2, 0, 0),
  'sanaru-contact-form.html': p(12, 10, 7, 8, 0),
  'seedome-openschool.html': p(6, 1, 6, 3, 0),
  'sekisui-catalog-request.html': p(12, 19, 8, 4, 4),
  'sekisui-inquiry-form.html': p(15, 4, 10, 7, 3),
  'shichusuimei.html': p(3, 1, 2, 0, 0),
  'shimane-inquiry-form.html': p(3, 2, 2, 0, 0),
  'shozemi-contact-form.html': p(12, 2, 7, 1, 0),
  'single-field-form.html': p(4, 2, 3, 0, 0),
  'smp-openhouse-inquiry.html': p(12, 2, 7, 5, 0),
  'smp-regist-inquiry-form.html': p(11, 2, 6, 4, 0),
  'split-form.html': p(10, 0, 7, 1, 0),
  'sumifu-step-otoiawase.html': p(10, 2, 6, 3, 0),
  'sumitomo-latour-inquiry.html': p(14, 8, 6, 0, 0),
  'sysmex-contact-form.html': p(11, 1, 5, 0, 0),
  'table-form.html': p(13, 0, 8, 9, 0),
  'tokyu-branz-owner-form.html': p(10, 1, 6, 3, 0),
  'tokyu-commercial-form.html': p(14, 8, 5, 4, 0),
  'tokyu-cre-form.html': p(14, 4, 5, 4, 0),
  'tokyu-land-contact-form.html': p(8, 0, 4, 0, 0),
  'tokyu-land-kojin-form.html': p(12, 4, 5, 0, 0),
  'tokyu-land-tenant-form.html': p(10, 5, 5, 0, 0),
  'tomas-trial-form.html': p(14, 7, 9, 6, 5),
  'tonami-luggage-form.html': p(10, 2, 6, 0, 0),
  'toshiba-gx-contact-form.html': p(11, 5, 6, 0, 0),
  'toshin-mendan-form.html': p(21, 3, 7, 2, 4),
  'toshin-shiryo-form.html': p(21, 10, 7, 2, 4),
  'toyoda-gosei-form.html': p(9, 2, 6, 2, 0),
  'try-gakuin-reserve-form.html': p(9, 2, 6, 3, 0),
  'wadakohsan-inquiry.html': p(8, 1, 5, 0, 0),
  'waseda-ac-form.html': p(6, 34, 2, 2, 0),
  'yamada-holdings-contact.html': p(4, 2, 4, 0, 0),
  'yoshinoya-store-form.html': p(9, 2, 5, 3, 0),
  'yotsuya-littleclub-form.html': p(10, 21, 10, 0, 8),
  'yotsuya-nyujuku-form.html': p(22, 3, 13, 4, 0),
  'accretech-7729-contact.html': p(19, 9, 7, 4, 0),
  'achilles-5142-iri.html': p(12, 3, 7, 5, 0),
  'advantest-contact.html': p(5, 2, 3, 0, 0),
  'aeonfin-8570-ir.html': p(6, 1, 6, 0, 0),
  'aisin-7259-investors.html': p(6, 6, 3, 2, 0),
  'ait-9381-ir.html': p(4, 2, 3, 0, 0),
  'ajinomoto-2802-question.html': p(10, 9, 8, 2, 0),
  'asahi-2502-ir.html': p(8, 10, 3, 6, 0),
  'asahi-intecc-7747-contact.html': p(10, 3, 6, 3, 0),
  'asics-7936-contact.html': p(2, 2, 2, 0, 3),
  'astellas-4503-ir.html': p(9, 1, 5, 1, 0),
  'baycurrent-6532-contact.html': p(9, 1, 7, 0, 0),
  'bergearth-contact.html': p(4, 1, 3, 0, 0),
  'bunka-5930-form.html': p(7, 6, 3, 4, 0),
  'capcom-9697-alt.html': p(5, 2, 5, 2, 0),
  'chuetsu-3877-contact.html': p(10, 1, 4, 3, 0),
  'citizen-7762-contact.html': p(11, 3, 6, 8, 0),
  'daido-5471-ask.html': p(6, 2, 3, 0, 0),
  'daiichi-8750-smp.html': p(4, 1, 4, 0, 0),
  'daiichisankyo-4568-contact.html': p(13, 8, 8, 0, 0),
  'denso-6902-investors.html': p(10, 14, 7, 2, 0),
  'dentsu-4324-ir.html': p(4, 4, 3, 2, 0),
  'eneos-5020-inquiry.html': p(14, 0, 10, 3, 3),
  'energia-9504-inquiry.html': p(7, 7, 2, 0, 0),
  'fpp-7388-ir.html': p(11, 0, 8, 0, 0),
  'fujifilmhd-4901-general.html': p(14, 1, 9, 0, 0),
  'fujikura-5803-investor.html': p(8, 0, 5, 0, 0),
  'fujikuracompo-5121-contact.html': p(7, 1, 5, 0, 0),
  'fujimi-5384-survey.html': p(7, 3, 4, 0, 0),
  'fuyo-8424-smp.html': p(7, 3, 4, 1, 0),
  'goldwin-8111-inquiry.html': p(7, 7, 4, 1, 0),
  'gunze-3002-form.html': p(11, 2, 7, 0, 0),
  'hankyu-9042-goiken.html': p(9, 38, 6, 0, 0),
  'haseko-1808-contact.html': p(6, 1, 5, 2, 0),
  'hokto-form.html': p(3, 3, 3, 0, 0),
  'hoya-7741-contact.html': p(9, 2, 4, 3, 0),
  'hulic-3003-ir.html': p(8, 2, 5, 2, 0),
  'idemitsu-5019-spiral.html': p(10, 1, 9, 7, 0),
  'iino-9119-contact.html': p(7, 1, 5, 0, 0),
  'inpex-1605-ir.html': p(7, 1, 4, 0, 0),
  'iwaicosmo-8707-form.html': p(4, 15, 2, 0, 0),
  'jgc-1963-inquiry.html': p(6, 1, 3, 0, 0),
  'jpower-9513-ir.html': p(6, 1, 6, 3, 0),
  'jrcentral-9022-input.html': p(7, 1, 5, 3, 4),
  'kajima-1812-ir.html': p(7, 3, 4, 2, 0),
  'kanpo-7181-request.html': p(11, 2, 6, 2, 0),
  'kawasaki-7012-annual.html': p(8, 8, 5, 0, 0),
  'keyence-price.html': p(14, 22, 7, 1, 0),
  'kikkoman-2801-ir.html': p(6, 7, 4, 2, 0),
  'kline-9107-contact.html': p(6, 0, 5, 0, 0),
  'kobebussan-3038-mail.html': p(7, 2, 3, 0, 0),
  'kobelco-5406-ir.html': p(4, 1, 3, 0, 0),
  'komatsu-6301-inquiry.html': p(4, 7, 3, 0, 0),
  'kubota-6326-inquiry.html': p(11, 3, 6, 1, 0),
  'kurabo-3106-contact.html': p(7, 1, 4, 3, 0),
  'lixil-5938-financial.html': p(10, 5, 6, 0, 6),
  'marubeni-8002-ir.html': p(6, 1, 4, 0, 0),
  'maruichi-5463-inquiry.html': p(8, 3, 6, 2, 0),
  'mcgc-4188-ir.html': p(6, 4, 4, 0, 0),
  'medipal-7459-ir.html': p(7, 2, 6, 2, 0),
  'meiko-9357-inquiry.html': p(5, 2, 3, 0, 0),
  'mitsubishijisho-8802-office.html': p(5, 3, 3, 0, 0),
  'mitsuikinzoku-5706-alt.html': p(10, 1, 6, 1, 0),
  'mizuno-8022-ir.html': p(5, 0, 5, 0, 0),
  'mol-9104-ir.html': p(4, 0, 4, 0, 0),
  'nakanishi-7716-contact.html': p(12, 1, 6, 5, 0),
  'ncoke-3315-contact.html': p(11, 1, 5, 4, 0),
  'ngk-5333-contact.html': p(7, 1, 4, 0, 0),
  'nichireki-5011-inquiry.html': p(5, 1, 3, 0, 0),
  'nichirin-5184-ir.html': p(6, 11, 4, 3, 0),
  'nipponsteel-5401-ir.html': p(7, 0, 3, 0, 0),
  'nissanchem-4021-contact.html': p(12, 2, 4, 2, 0),
  'nittetsukou-1515-smp.html': p(9, 2, 4, 6, 0),
  'nomura-8604-contact.html': p(5, 7, 5, 3, 0),
  'nomura-re-3231-contact.html': p(5, 9, 3, 5, 0),
  'nsuship-9110-contact.html': p(10, 1, 5, 0, 0),
  'ntt-9432-rd.html': p(5, 6, 3, 0, 0),
  'nx-9147-contact.html': p(8, 30, 6, 0, 0),
  'nyk-9101-contact.html': p(9, 1, 5, 0, 0),
  'nyksteel-5480-contact.html': p(8, 4, 4, 1, 0),
  'obayashi-1802-contact.html': p(6, 0, 4, 0, 0),
  'obic-4684-inquiry.html': p(11, 4, 6, 0, 0),
  'oji-3861-ir.html': p(11, 2, 6, 1, 0),
  'okamoto-5122-contact.html': p(10, 1, 5, 2, 0),
  'olympus-7733-contact.html': p(11, 0, 7, 1, 0),
  'ono-4527-contact.html': p(8, 3, 6, 1, 0),
  'openhouse-3288-contact.html': p(11, 1, 7, 0, 0),
  'osakagas-9532-contact.html': p(11, 8, 7, 8, 0),
  'otaki-1663-other.html': p(3, 6, 3, 0, 0),
  'otsukahd-4578-smp.html': p(12, 3, 5, 5, 0),
  'pentaocean-1893-inquiry.html': p(3, 6, 3, 0, 0),
  'ppih-7532-form.html': p(7, 7, 6, 3, 0),
  'rinnai-5947-about.html': p(11, 3, 9, 9, 0),
  'sakata-ir.html': p(11, 1, 6, 0, 0),
  'santen-4536-contact.html': p(11, 6, 6, 2, 0),
  'sanwa-5929-entry.html': p(12, 2, 8, 0, 0),
  'sekisuihouse-1928-mail.html': p(12, 2, 8, 9, 0),
  'shibusawa-9304-contact.html': p(3, 1, 2, 0, 0),
  'shimadzu-7701-contact.html': p(9, 3, 6, 0, 0),
  'shimano-7309-contact.html': p(4, 0, 4, 0, 0),
  'shinetsu-4063-ir.html': p(11, 4, 3, 3, 0),
  'shionogi-4507-fofa.html': p(5, 1, 5, 0, 0),
  'shiseido-4911-alt.html': p(13, 1, 8, 0, 0),
  'shizuoka-inquiry.html': p(3, 3, 3, 0, 0),
  'smc-6273-ir.html': p(8, 0, 5, 0, 0),
  'softbankg-9984-ir.html': p(3, 1, 3, 0, 0),
  'sojitz-2768-contact.html': p(10, 3, 5, 0, 0),
  'sompo-8630-contact.html': p(15, 0, 9, 6, 0),
  'sony-inquiry.html': p(6, 9, 4, 2, 0),
  'starts-8850-ir.html': p(9, 2, 5, 4, 0),
  'sumco-3436-input.html': p(8, 0, 4, 2, 0),
  'sumiseki-1514-contact.html': p(10, 1, 5, 0, 0),
  'sumitomocorp-8053-ir.html': p(9, 0, 6, 0, 0),
  'sumitomoriko-5191-contact.html': p(7, 2, 5, 1, 0),
  'sumitomorubber-5110-smp.html': p(11, 2, 7, 5, 0),
  'sumitomosoko-9303-contact.html': p(3, 7, 1, 1, 0),
  'suntory-2587-contact.html': p(4, 3, 4, 0, 0),
  'suzuki-7269-catalog.html': p(10, 4, 7, 0, 0),
  'taiheiyo-5233-contact.html': p(9, 5, 6, 0, 0),
  'takaratomy-7867-inquiry.html': p(9, 10, 5, 3, 4),
  'tamron-7740-contact.html': p(10, 0, 5, 3, 0),
  'td-8795-contact.html': p(5, 8, 3, 5, 0),
  'tepco-9501-voice.html': p(6, 1, 5, 3, 0),
  'tocalo-3433-agree.html': p(10, 1, 5, 0, 0),
  'toda-1860-smp.html': p(9, 2, 5, 3, 0),
  'tokaicarbon-5301-inquiry.html': p(6, 2, 4, 0, 0),
  'tokaitokyo-8616-contact.html': p(4, 3, 4, 0, 0),
  'tokkai-3708-contact.html': p(9, 0, 5, 0, 0),
  'tokuyfudosanhd-3289-inquiry.html': p(14, 0, 9, 5, 0),
  'tokyocentury-8439-contact.html': p(10, 0, 6, 1, 0),
  'tokyosteel-5423-contact.html': p(6, 2, 4, 0, 0),
  'tosoh-4042-ir.html': p(12, 0, 7, 0, 0),
  'toyo-2875-inquiry.html': p(12, 1, 8, 7, 0),
  'toyota-7203-faq.html': p(5, 23, 2, 1, 0),
  'toyotatsusho-8015-inquiry.html': p(4, 1, 4, 0, 0),
  'toyotires-5105-contact.html': p(3, 0, 2, 0, 0),
  'trancy-9310-contact.html': p(9, 0, 6, 0, 0),
  'uacj-5741-smp.html': p(12, 2, 5, 3, 0),
  'wacoal-3591-contact.html': p(5, 2, 4, 2, 0),
  'world-3612-form.html': p(7, 3, 4, 0, 0),
  'yamaha-7951-inquiry.html': p(13, 0, 5, 1, 0),
  'yamatokogyo-5444-form.html': p(2, 8, 2, 0, 0),
  'yodoko-5451-contact.html': p(12, 0, 6, 1, 0),
  'yokogawa-5911-inquiry.html': p(5, 2, 3, 0, 0),
  'yokohama-5101-inquiry.html': p(8, 11, 4, 0, 5),
  'yukiguni-contact.html': p(9, 1, 6, 0, 0),
  'zensho-7550-hama.html': p(15, 6, 9, 4, 0),
  'atlus-contact.html': p(2, 1, 2, 0, 0),
  'bnfw-works-contact.html': p(6, 1, 6, 0, 0),
  'bones-contact.html': p(5, 0, 5, 0, 0),
  'bunraku-contact.html': p(11, 0, 7, 0, 0),
  'ghiblipark-school-contact.html': p(34, 26, 8, 4, 0),
  'helloproject-lineup-contact.html': p(4, 2, 4, 0, 0),
  'hie-kojin-contact.html': p(6, 16, 2, 0, 0),
  'hilton-nagoya-contact.html': p(4, 2, 4, 0, 0),
  'imperialhotel-contact.html': p(8, 6, 6, 2, 0),
  'inuyama-contact.html': p(3, 0, 3, 0, 0),
  'jimokuji-contact.html': p(3, 3, 3, 0, 0),
  'kanda-coverage-contact.html': p(8, 12, 4, 5, 0),
  'kanko-nagoya-contact.html': p(10, 11, 7, 7, 0),
  'kanze-contact.html': p(2, 9, 2, 0, 0),
  'kasadera-contact.html': p(3, 1, 3, 0, 0),
  'ldh-contact.html': p(9, 1, 8, 4, 0),
  'legoland-contact.html': p(1, 2, 1, 0, 0),
  'masumida-contact.html': p(5, 0, 5, 2, 0),
  'miwa-contact.html': p(3, 1, 3, 0, 0),
  'nagoyaaqua-contact.html': p(3, 0, 3, 0, 0),
  'nagoyatokyu-contact.html': p(10, 4, 9, 3, 0),
  'newotani-banquet-contact.html': p(16, 13, 7, 6, 0),
  'nittaiji-contact.html': p(6, 0, 4, 2, 0),
  'ntj-goiken-contact.html': p(3, 0, 3, 0, 0),
  'palacehotel-contact.html': p(8, 9, 5, 5, 0),
  'prince-nagoya-contact.html': p(2, 10, 2, 2, 0),
  'rakugo-contact.html': p(3, 0, 3, 0, 0),
  'ritz-tokyo-rfp-contact.html': p(8, 10, 3, 1, 0),
  'ryusenji-contact.html': p(7, 6, 7, 5, 0),
  'sarutahiko-contact.html': p(6, 6, 2, 2, 0),
  'sensoji-gokito-contact.html': p(12, 53, 6, 2, 4),
  'skytree-media-contact.html': p(4, 0, 4, 0, 0),
  'tado-contact.html': p(2, 1, 2, 0, 0),
  'tenman-contact.html': p(3, 0, 3, 0, 0),
  'toba-aquarium-contact.html': p(2, 2, 2, 0, 0),
  'toga-contact.html': p(5, 1, 4, 0, 0),
  'tokyodaijingu-yoyaku-contact.html': p(6, 1, 6, 0, 0),
  'tokyotower-contact.html': p(6, 1, 5, 0, 0),
  'toyokawainari-contact.html': p(7, 1, 5, 0, 0),
  'tsukannon-contact.html': p(4, 0, 4, 0, 0),
  'tsushima-contact.html': p(3, 1, 3, 0, 0),
  'yasukuni-dantai-contact.html': p(5, 5, 1, 4, 4),
  'zojoji-contact.html': p(11, 0, 5, 0, 0),
};

// pin と実測のずれを指標単位で列挙する（fixture 名は呼び出し側で載せる）。
const pinDiff = (pin: PinRow, m: EvalMetrics): string[] => {
  const pairs: Array<[string, number, number]> = [
    ['ruleHits', pin.ruleHits, m.ruleHits],
    ['llmFallbacks', pin.llmFallbacks, m.llmFallbacks],
    ['fillable', pin.fillable, m.fillable],
    ['refineChanged', pin.refineChanged, m.refineChanged],
    ['refineDropped', pin.refineDropped, m.refineDropped],
  ];
  return pairs.filter(([, p, a]) => p !== a).map(([key, p, a]) => `${key} pin=${p} 実測=${a}`);
};

async function metricsFor(html: string): Promise<EvalMetrics> {
  document.body.innerHTML = new DOMParser().parseFromString(html, 'text/html').body.innerHTML;
  return evalMetricsFor(scanFields(document.body).map((f) => f.meta));
}

describe('sample corpus metrics (local, no network)', () => {
  // The corpus-iterating tests run every fixture through the pipeline; at 300+
  // fixtures they sit close to vitest's default 5s timeout and flake on a
  // loaded machine, so they carry an explicit generous timeout.
  it('measures every fixture, prints one short line per fixture, and pins each row', async () => {
    const names = Object.keys(corpus);
    expect(names.length).toBeGreaterThan(0);
    const rows: EvalMetrics[] = [];
    const measured = new Map<string, EvalMetrics>();
    for (const [name, entry] of Object.entries(corpus)) {
      const m = await metricsFor(entry.html);
      rows.push(m);
      measured.set(name, m);
      console.log(reportLine(name, m));
    }
    const agg = aggregate(rows);
    console.log(`[JushoAI eval] aggregate fixtures=${agg.fixtures} fields=${agg.total} ruleHits=${agg.ruleHits} llmFallbacks=${agg.llmFallbacks} fillable=${agg.fillable}`);
    expect(agg.fixtures).toBe(names.length);
    expect(agg.total).toBeGreaterThan(0);

    // pin 表と corpus の一致と、1 行 = 1 fixture の実測照合。ずれは fixture 名で名指す。
    const problems: string[] = [];
    for (const [name, m] of measured) {
      const pin = PIN_TABLE[name];
      const diff = pin ? pinDiff(pin, m) : ['pin 表に行がありません。make eval の fixture 行から 1 行追加する'];
      if (diff.length > 0) problems.push(`${name}: ${diff.join(', ')}`);
    }
    for (const name of Object.keys(PIN_TABLE)) {
      if (!measured.has(name)) {
        problems.push(`${name}: pin 表の行が corpus にありません（fixture を削除したなら行も削除する）`);
      }
    }
    expect(problems, 'pin 表と corpus または実測がずれています。pin 更新か意図しない分類の変化かを fixture に戻って確認する。更新する行は make eval-pin（FIXTURE=<fixture名> で絞り込み）で再生成できる').toEqual([]);

    // 集計は pin 表の合計として読む。magic number は pin 表の行にしか置かない。
    const pinRows = Object.values(PIN_TABLE);
    const pinSum = (pick: (r: PinRow) => number) => pinRows.reduce((acc, r) => acc + pick(r), 0);
    const rowSum = (pick: (m: EvalMetrics) => number) => rows.reduce((acc, m) => acc + pick(m), 0);
    // pinDiff の一致検査が先に失敗するため、この 5 つは失敗としては論理的に到達しない。pin 表の合計としての誘導と文書化の役割
    expect(agg.ruleHits, 'pin 表の合計と実測がずれています').toBe(pinSum((r) => r.ruleHits));
    expect(agg.llmFallbacks, 'pin 表の合計と実測がずれています').toBe(pinSum((r) => r.llmFallbacks));
    expect(agg.fillable, 'pin 表の合計と実測がずれています').toBe(pinSum((r) => r.fillable));
    expect(rowSum((m) => m.refineChanged), 'pin 表の合計と実測がずれています').toBe(pinSum((r) => r.refineChanged));
    expect(rowSum((m) => m.refineDropped), 'pin 表の合計と実測がずれています').toBe(pinSum((r) => r.refineDropped));
  }, 60_000);

  it('keeps page content out of every report line', async () => {
    const lines: string[] = [];
    for (const [name, entry] of Object.entries(corpus)) {
      const m = await metricsFor(entry.html);
      lines.push(reportLine(name, m));
    }
    const report = lines.join('\n');
    // Fixture file names are fine; page-controlled strings (labels, values,
    // field ids from the real forms) must never enter a line.
    for (const forbidden of ['山田', '太郎', '千代田', 'formAttendee', 'field_46']) {
      expect(report, forbidden).not.toContain(forbidden);
    }
    for (const line of lines) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(200);
    }
  }, 60_000);

  it('never reaches the network: metrics run rule-only', async () => {
    // evalMetricsFor uses the rule-only pipeline (classifyRulePipelineWithTrace)
    // and buildPlan only — no classifier, no fetch. The assertion pins the rule
    // fallback count as measurable without an LLM: every fixture reports a
    // fallback count without any network dependency by construction.
    const m = await metricsFor('<input name="last_name"><input type="tel" name="xyz">');
    expect(m.total).toBe(2);
    expect(m.llmFallbacks).toBe(1);
  });
});
