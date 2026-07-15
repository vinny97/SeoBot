"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { blankProject } from "@/lib/demo/seed";
import type { ProjectState } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { loadProject, saveProject } from "@/lib/data/project-repository";

const STORAGE_KEY = "northstar-demo-project-v1";
type Context = { project: ProjectState; hydrated:boolean; update:(patch:Partial<ProjectState>)=>void; replace:(value:ProjectState)=>void; reset:()=>void };
const ProjectContext = createContext<Context | null>(null);

export function ProjectProvider({children}:{children:React.ReactNode}) {
  const [project,setProject] = useState<ProjectState>(blankProject);
  const [hydrated,setHydrated] = useState(false);
  useEffect(()=>{ (async()=>{try { const client=createClient();if(client){const remote=await loadProject(client);if(remote){setProject(remote);localStorage.setItem(STORAGE_KEY,JSON.stringify(remote));return}}const saved=localStorage.getItem(STORAGE_KEY); if(saved) setProject({...blankProject,...JSON.parse(saved)}); } catch {const saved=localStorage.getItem(STORAGE_KEY);if(saved)try{setProject({...blankProject,...JSON.parse(saved)})}catch{}}finally{setHydrated(true)}})(); },[]);
  useEffect(()=>{ if(!hydrated)return;localStorage.setItem(STORAGE_KEY,JSON.stringify(project));const client=createClient();if(!client||!project.website.domain)return;const timer=setTimeout(()=>{saveProject(client,project).catch(error=>console.error("Project sync failed",error))},500);return()=>clearTimeout(timer); },[project,hydrated]);
  const update=useCallback((patch:Partial<ProjectState>)=>setProject(p=>({...p,...patch,updatedAt:new Date().toISOString()})),[]);
  const replace=useCallback((value:ProjectState)=>setProject(value),[]);
  const reset=useCallback(()=>{localStorage.removeItem(STORAGE_KEY);setProject({...blankProject,updatedAt:new Date().toISOString()});},[]);
  const value=useMemo(()=>({project,hydrated,update,replace,reset}),[project,hydrated,update,replace,reset]);
  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}
export function useProject(){const value=useContext(ProjectContext);if(!value)throw new Error("useProject must be used inside ProjectProvider");return value;}
