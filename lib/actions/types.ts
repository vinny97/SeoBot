export type ActionResult<T=undefined> = {success:true;data:T}|{success:false;error:string;fieldErrors?:Record<string,string[]>};
export function actionError(message="We couldn’t save that change. Please try again."):ActionResult<never>{return{success:false,error:message}}
