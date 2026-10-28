// Quy ước commit: Conventional Commits
// Dạng: type(scope): mô tả   ví dụ  feat(public-web): them trang danh sach xe
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'chore', 'docs', 'test', 'refactor', 'build', 'ci', 'perf', 'style', 'revert'],
    ],
    'subject-case': [0], // cho phép tiếng Việt, không ép hoa/thường
    'header-max-length': [2, 'always', 100],
  },
};
