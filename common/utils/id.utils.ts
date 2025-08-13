import { getTsid } from 'tsid-ts';

export const generatePGId = () => {
  return getTsid().toBigInt().toString();
};
