import type { JobRunner } from "@/lib/providers/types";

// Demonstration runner: deterministic output, no autonomous SEO work is performed.
export const demoOnboardingJobRunner: JobRunner = {
  async run(job) { return { success: true, output: { demo: true, jobType: job.type } }; },
};
