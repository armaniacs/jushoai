// Past-version storage fixtures (PBI-283): raw persisted shapes with
// fictitious values, matching the Profile key set of each released version.
// The envelope never had a version before 1.0, so these carry none.
// Key sets verified with `git show <tag>:src/core/types.ts`:
// - 0.1.20 era (commit 40b643a): base fields only, no company fields.
// - v0.1.30: plus companyName, companyDepartment, companyNameKana.
// - v0.1.39: plus jobTitle (schoolGrade/juku came after, on the 1.0 line).
// Address kept the same key set across all three, so one shared shape.
// v0.1.20 has no local tag; the shape comes from the 0.1.20 release commit.

const addressV0120 = {
  id: 'a1', label: '自宅', profileId: '',
  zip: '1000001', prefecture: '東京都', city: '千代田区',
  street: '千代田1-1', building: '',
  country: '', address1: '', address2: '', address3: '', address4: '', postalCode: '',
};

const addressV0130 = {
  id: 'a1', label: '自宅', profileId: 'p1',
  zip: '1000001', prefecture: '東京都', city: '千代田区',
  street: '千代田1-1', building: '千代田ビル101',
  country: '', address1: '', address2: '', address3: '', address4: '', postalCode: '',
};

const addressV0139 = {
  id: 'a1', label: '自宅', profileId: 'p1',
  zip: '1000001', prefecture: '東京都', city: '千代田区',
  street: '千代田1-1', building: '',
  country: '', address1: '', address2: '', address3: '', address4: '', postalCode: '',
};

export const storedV0120: unknown = {
  profiles: [{
    id: 'p1', label: '本人',
    lastName: '山田', firstName: '太郎',
    lastNameKana: 'ヤマダ', firstNameKana: 'タロウ',
    lastNameRomaji: 'Yamada', firstNameRomaji: 'Taro',
    gender: '男性', birthday: '1990-05-07',
    school: '千代田小学校', department: '',
    email: 'taro@example.jp', tel: '09012345678',
  }],
  addresses: [addressV0120],
};

export const storedV0130: unknown = {
  profiles: [{
    id: 'p1', label: '本人',
    lastName: '山田', firstName: '太郎',
    lastNameKana: 'ヤマダ', firstNameKana: 'タロウ',
    lastNameRomaji: 'Yamada', firstNameRomaji: 'Taro',
    gender: '男性', birthday: '1990-05-07',
    school: '千代田小学校', department: '',
    companyName: '千代田商事', companyDepartment: '営業部',
    companyNameKana: 'チヨダショウジ',
    email: 'taro@example.jp', tel: '09012345678',
  }],
  addresses: [addressV0130],
};

export const storedV0139: unknown = {
  profiles: [{
    id: 'p1', label: '本人',
    lastName: '山田', firstName: '太郎',
    lastNameKana: 'ヤマダ', firstNameKana: 'タロウ',
    lastNameRomaji: 'Yamada', firstNameRomaji: 'Taro',
    gender: '男性', birthday: '1990-05-07',
    school: '千代田小学校', department: '',
    companyName: '千代田商事', companyDepartment: '営業部',
    jobTitle: '主任',
    companyNameKana: 'チヨダショウジ',
    email: 'taro@example.jp', tel: '09012345678',
  }],
  addresses: [addressV0139],
};
