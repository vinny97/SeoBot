export class DataLayerError extends Error{constructor(public readonly operation:string,cause?:unknown){super(`We couldn’t ${operation}. Your answers are still saved on this device.`);this.name="DataLayerError";this.cause=cause}}
export function databaseError(operation:string,error:unknown){if(error)throw new DataLayerError(operation,error)}
