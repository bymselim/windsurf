import packageJson from "../package.json";

/** Tek kaynak: `package.json` → `version` */
export const APP_VERSION: string = packageJson.version;
export const APP_NAME: string = packageJson.name;
