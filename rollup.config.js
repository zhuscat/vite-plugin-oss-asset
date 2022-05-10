import pkg from "./package.json";

export default {
  input: "index.js",
  external: [
    ...Object.keys(pkg.dependencies),
    "fs",
    "path",
    "crypto"
  ],
  output: [
    { file: pkg.main, format: "cjs", exports: "named" },
    { file: pkg.module, format: "es" },
  ],
};
