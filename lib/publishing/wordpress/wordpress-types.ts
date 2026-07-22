export type WordPressCredentials = {
  username: string;
  applicationPassword: string;
};

export type WordPressConnectionInput = WordPressCredentials & {
  siteUrl: string;
};

export type WordPressConnectionTestResult = {
  success: boolean;
  siteName: string | null;
  siteUrl: string;
  restApiUrl: string;
  userId: number | null;
  userDisplayName: string | null;
  canCreatePosts: boolean;
  warnings: string[];
};

export type WordPressPost = {
  id: number;
  link: string | null;
  status: string;
  slug: string | null;
};

export type WordPressRequest = {
  method?: "GET" | "POST";
  credentials?: WordPressCredentials;
  json?: unknown;
  maxBytes?: number;
};

export type WordPressResponse = {
  status: number;
  url: string;
  headers: Record<string, string>;
  body: string;
};

export type WordPressTransport = (url: string, request?: WordPressRequest) => Promise<WordPressResponse>;
