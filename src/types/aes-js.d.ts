/**
 * `aes-js` ships no type declarations and has no maintained @types package.
 * This covers only the small surface used by
 * src/services/supabase/secure-store-adapter.ts.
 */
declare module 'aes-js' {
  export namespace ModeOfOperation {
    class ctr {
      constructor(key: Uint8Array, counter: Counter);
      encrypt(bytes: Uint8Array): Uint8Array;
      decrypt(bytes: Uint8Array): Uint8Array;
    }
  }

  export class Counter {
    constructor(initialValue: number);
  }

  export const utils: {
    utf8: {
      toBytes(text: string): Uint8Array;
      fromBytes(bytes: Uint8Array): string;
    };
    hex: {
      toBytes(hex: string): Uint8Array;
      fromBytes(bytes: Uint8Array): string;
    };
  };
}
