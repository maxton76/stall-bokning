import { z } from "zod";

/**
 * Base horse validation schema (without refinement)
 * CONSOLIDATED from frontend/src/components/HorseFormDialog.tsx (line 36-67)
 */
const baseHorseSchema = z.object({
  name: z.string().min(1, "Horse name is required").max(100),
  breed: z.string().optional(),
  age: z.number().min(0).max(50).optional(),
  color: z.string().min(1, "Color is required"),
  gender: z.enum(["stallion", "mare", "gelding"]).optional(),
  isExternal: z.boolean(),
  dateOfArrival: z.preprocess(
    (val: any) => (val === "" ? undefined : val),
    z.coerce.date().optional(),
  ),
  currentStableId: z.string().optional(),
  usage: z.array(z.string()),
  horseGroupId: z.string().optional(),
  vaccinationRuleId: z.string().optional(),
  ueln: z.string().optional(),
  chipNumber: z.string().optional(),
  federationNumber: z.string().optional(),
  feiPassNumber: z.string().optional(),
  feiExpiryDate: z.preprocess(
    (val: any) => (val === "" ? undefined : val),
    z.coerce.date().optional(),
  ),
  sire: z.string().optional(),
  dam: z.string().optional(),
  damsire: z.string().optional(),
  withersHeight: z.number().min(0).optional(),
  dateOfBirth: z.preprocess(
    (val: any) => (val === "" ? undefined : val),
    z.coerce.date().optional(),
  ),
  studbook: z.string().optional(),
  breeder: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * Horse validation schema with refinement
 */
export const horseSchema = baseHorseSchema.refine(
  (data: any) => data.isExternal || data.dateOfArrival,
  {
    message: "Date of arrival is required for non-external horses",
    path: ["dateOfArrival"],
  },
);

/**
 * Schema for creating a new horse
 * Omits owner and metadata fields
 */
export const createHorseSchema = horseSchema;

/**
 * Schema for updating an existing horse
 * All fields optional
 */
export const updateHorseSchema = baseHorseSchema.partial();

export type HorseFormData = z.infer<typeof horseSchema>;
