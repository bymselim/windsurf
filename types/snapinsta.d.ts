declare module "snapinsta" {
  export type SnapLink = {
    url: string;
    mime: string;
    idx?: number;
  };

  export interface SnapinstaApi {
    getLinks: (url: string) => Promise<SnapLink[]>;
  }

  const snapinsta: SnapinstaApi;
  export default snapinsta;
}

