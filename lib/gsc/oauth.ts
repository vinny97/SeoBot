import { createHash,randomBytes,timingSafeEqual } from "node:crypto";
export const GSC_READONLY_SCOPE="https://www.googleapis.com/auth/webmasters.readonly";
export function createGscOAuthProof(){const state=randomBytes(32).toString("base64url");const codeVerifier=randomBytes(48).toString("base64url");return{state,stateHash:hashState(state),codeVerifier,codeChallenge:createHash("sha256").update(codeVerifier).digest("base64url")}}
export function hashState(state:string){return createHash("sha256").update(state).digest("hex")}
export function verifyState(state:string,expectedHash:string){const actual=Buffer.from(hashState(state),"hex");const expected=Buffer.from(expectedHash,"hex");return actual.length===expected.length&&timingSafeEqual(actual,expected)}
export type GscProperty={siteUrl:string;permissionLevel:string};
