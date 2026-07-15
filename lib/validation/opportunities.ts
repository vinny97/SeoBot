import { z } from "zod";
export const opportunityStatusSchema=z.enum(["New","Planned","In progress","Waiting for approval","Completed","Dismissed"]);
