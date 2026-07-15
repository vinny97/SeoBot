import { blankProject } from "@/lib/demo/seed";
import type { ProjectState } from "@/lib/types";
export function restoreProjectState(serialized:string|null):ProjectState{if(!serialized)return blankProject;try{const value=JSON.parse(serialized) as Partial<ProjectState>;return {...blankProject,...value,website:{...blankProject.website,...value.website},business:{...blankProject.business,...value.business},metadata:{...blankProject.metadata,...value.metadata}}}catch{return blankProject}}
