"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { blankProject } from "@/lib/demo/seed";
import type { ProjectState } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { loadProject, saveProject } from "@/lib/data/project-repository";
import { restoreProjectState } from "@/lib/data/local-project";

const STORAGE_KEY = "northstar-demo-project-v1";
type Context = {
  project: ProjectState;
  hydrated: boolean;
  syncError: string;
  update: (patch: Partial<ProjectState>) => void;
  replace: (value: ProjectState) => void;
  reset: () => void;
};
const ProjectContext = createContext<Context | null>(null);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [project, setProject] = useState<ProjectState>(blankProject);
  const [hydrated, setHydrated] = useState(false);
  const [syncError, setSyncError] = useState("");
  useEffect(() => {
    (async () => {
      try {
        const client = createClient();
        if (client) {
          const remote = await loadProject(client);
          if (remote) {
            setProject(remote);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
            return;
          }
        }
        setProject(restoreProjectState(localStorage.getItem(STORAGE_KEY)));
      } catch (error) {
        setSyncError(
          error instanceof Error
            ? error.message
            : "We couldn’t load cloud data. Your local copy is available.",
        );
        setProject(restoreProjectState(localStorage.getItem(STORAGE_KEY)));
      } finally {
        setHydrated(true);
      }
    })();
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    const client = createClient();
    if (!client || !project.website.domain) return;
    const timer = setTimeout(() => {
      saveProject(client, project)
        .then(() => setSyncError(""))
        .catch((error) =>
          setSyncError(
            error instanceof Error
              ? error.message
              : "Cloud sync is temporarily unavailable.",
          ),
        );
    }, 500);
    return () => clearTimeout(timer);
  }, [project, hydrated]);
  const update = useCallback(
    (patch: Partial<ProjectState>) =>
      setProject((p) => ({
        ...p,
        ...patch,
        updatedAt: new Date().toISOString(),
      })),
    [],
  );
  const replace = useCallback((value: ProjectState) => setProject(value), []);
  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setProject({ ...blankProject, updatedAt: new Date().toISOString() });
  }, []);
  const value = useMemo(
    () => ({ project, hydrated, syncError, update, replace, reset }),
    [project, hydrated, syncError, update, replace, reset],
  );
  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
}
export function useProject() {
  const value = useContext(ProjectContext);
  if (!value) throw new Error("useProject must be used inside ProjectProvider");
  return value;
}
