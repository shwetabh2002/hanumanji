import { tags } from 'typia';

export type BearerToken = tags.TagBase<{
  kind: 'bearerToken';
  target: 'string';
  value: string;
  validate: `
      (() => {
        const [type, token] = value.split(' ');
        if (type !== 'Bearer' || !token) return false;
        return true;
      })()
    `;
}>;
