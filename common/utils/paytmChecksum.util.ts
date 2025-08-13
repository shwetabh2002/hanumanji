/* eslint-disable */
import * as crypto from 'crypto';

export class PaytmChecksum {
  private static iv = '@@@@&&&&####$$$$';

  public static encrypt(input: string, key: string) {
    const cipher = crypto.createCipheriv('AES-128-CBC', key, PaytmChecksum.iv);
    let encrypted = cipher.update(input, 'binary', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
  }
  public static decrypt(encrypted: string, key: string) {
    const decipher = crypto.createDecipheriv(
      'AES-128-CBC',
      key,
      PaytmChecksum.iv,
    );
    let decrypted = decipher.update(encrypted, 'base64', 'binary');
    try {
      decrypted += decipher.final('binary');
    } catch (e) {
      console.log(e);
    }
    return decrypted;
  }
  public static generateSignature(params: any, key: string) {
    if (!['object', 'string'].includes(typeof params)) {
      const error = 'string or object expected, ' + typeof params + ' given.';
      return Promise.reject(error);
    }
    if (typeof params !== 'string') {
      params = PaytmChecksum.getStringByParams(params);
    }
    return PaytmChecksum.generateSignatureByString(params, key);
  }

  public static verifySignature(params: any, key: string, checksum: string) {
    if (!['object', 'string'].includes(typeof params)) {
      const error = 'string or object expected, ' + typeof params + ' given.';
      return Promise.reject(error);
    }
    if (params.hasOwnProperty('CHECKSUMHASH')) {
      delete params.CHECKSUMHASH;
    }
    if (typeof params !== 'string') {
      params = PaytmChecksum.getStringByParams(params);
    }
    return PaytmChecksum.verifySignatureByString(params, key, checksum);
  }

  public static async generateSignatureByString(params: any, key: string) {
    const salt = await PaytmChecksum.generateRandomString(4);
    return PaytmChecksum.calculateChecksum(params, key, salt);
  }

  public static verifySignatureByString(
    params: any,
    key: string,
    checksum: string,
  ) {
    const paytm_hash = PaytmChecksum.decrypt(checksum, key);
    const salt = paytm_hash.substr(paytm_hash.length - 4);
    return paytm_hash === PaytmChecksum.calculateHash(params, salt);
  }

  public static generateRandomString(length: number): Promise<string> {
    return new Promise(function (resolve, reject) {
      crypto.randomBytes((length * 3.0) / 4.0, function (err, buf) {
        if (!err) {
          const salt = buf.toString('base64');
          resolve(salt);
        } else {
          console.log('error occurred in generateRandomString: ' + err);
          reject(err);
        }
      });
    });
  }

  public static getStringByParams(params: any) {
    const data: any = {};
    Object.keys(params)
      .sort()
      .forEach(function (key: string) {
        data[key] =
          params[key] !== null && params[key].toLowerCase() !== null
            ? params[key]
            : '';
      });
    return Object.values(data).join('|');
  }

  public static calculateHash(params: any, salt: string) {
    const finalString = params + '|' + salt;
    return crypto.createHash('sha256').update(finalString).digest('hex') + salt;
  }
  public static calculateChecksum(params: any, key: string, salt: string) {
    const hashString = PaytmChecksum.calculateHash(params, salt);
    return PaytmChecksum.encrypt(hashString, key);
  }
}
