const date=(value:Date)=>value.toISOString().slice(0,10);

export function gscSyncWindow(type:"initial"|"daily",now=new Date()){
  const end=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()-1));
  const start=new Date(end);
  start.setUTCDate(start.getUTCDate()-(type==="initial"?89:9));
  return{startDate:date(start),endDate:date(end)};
}
