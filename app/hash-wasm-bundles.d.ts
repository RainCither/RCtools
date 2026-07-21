declare module "hash-wasm/dist/md5.umd.min.js" {
  const bundle: {
    md5: typeof import("hash-wasm").md5;
  };
  export default bundle;
}

declare module "hash-wasm/dist/sha1.umd.min.js" {
  const bundle: {
    sha1: typeof import("hash-wasm").sha1;
  };
  export default bundle;
}

declare module "hash-wasm/dist/sha256.umd.min.js" {
  const bundle: {
    sha256: typeof import("hash-wasm").sha256;
  };
  export default bundle;
}

declare module "hash-wasm/dist/sha512.umd.min.js" {
  const bundle: {
    sha512: typeof import("hash-wasm").sha512;
  };
  export default bundle;
}
