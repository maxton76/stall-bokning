import { z } from "zod";
/**
 * Horse validation schema with refinement
 */
export declare const horseSchema: z.ZodObject<
  {
    name: z.ZodString;
    breed: z.ZodOptional<z.ZodString>;
    age: z.ZodOptional<z.ZodNumber>;
    color: z.ZodString;
    gender: z.ZodOptional<
      z.ZodEnum<{
        stallion: "stallion";
        mare: "mare";
        gelding: "gelding";
      }>
    >;
    isExternal: z.ZodBoolean;
    dateOfArrival: z.ZodPipe<
      z.ZodTransform<any, any>,
      z.ZodOptional<z.ZodCoercedDate<unknown>>
    >;
    currentStableId: z.ZodOptional<z.ZodString>;
    usage: z.ZodArray<z.ZodString>;
    horseGroupId: z.ZodOptional<z.ZodString>;
    vaccinationRuleId: z.ZodOptional<z.ZodString>;
    ueln: z.ZodOptional<z.ZodString>;
    chipNumber: z.ZodOptional<z.ZodString>;
    federationNumber: z.ZodOptional<z.ZodString>;
    feiPassNumber: z.ZodOptional<z.ZodString>;
    feiExpiryDate: z.ZodPipe<
      z.ZodTransform<any, any>,
      z.ZodOptional<z.ZodCoercedDate<unknown>>
    >;
    sire: z.ZodOptional<z.ZodString>;
    dam: z.ZodOptional<z.ZodString>;
    damsire: z.ZodOptional<z.ZodString>;
    withersHeight: z.ZodOptional<z.ZodNumber>;
    dateOfBirth: z.ZodPipe<
      z.ZodTransform<any, any>,
      z.ZodOptional<z.ZodCoercedDate<unknown>>
    >;
    studbook: z.ZodOptional<z.ZodString>;
    breeder: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
  },
  z.core.$strip
>;
/**
 * Schema for creating a new horse
 * Omits owner and metadata fields
 */
export declare const createHorseSchema: z.ZodObject<
  {
    name: z.ZodString;
    breed: z.ZodOptional<z.ZodString>;
    age: z.ZodOptional<z.ZodNumber>;
    color: z.ZodString;
    gender: z.ZodOptional<
      z.ZodEnum<{
        stallion: "stallion";
        mare: "mare";
        gelding: "gelding";
      }>
    >;
    isExternal: z.ZodBoolean;
    dateOfArrival: z.ZodPipe<
      z.ZodTransform<any, any>,
      z.ZodOptional<z.ZodCoercedDate<unknown>>
    >;
    currentStableId: z.ZodOptional<z.ZodString>;
    usage: z.ZodArray<z.ZodString>;
    horseGroupId: z.ZodOptional<z.ZodString>;
    vaccinationRuleId: z.ZodOptional<z.ZodString>;
    ueln: z.ZodOptional<z.ZodString>;
    chipNumber: z.ZodOptional<z.ZodString>;
    federationNumber: z.ZodOptional<z.ZodString>;
    feiPassNumber: z.ZodOptional<z.ZodString>;
    feiExpiryDate: z.ZodPipe<
      z.ZodTransform<any, any>,
      z.ZodOptional<z.ZodCoercedDate<unknown>>
    >;
    sire: z.ZodOptional<z.ZodString>;
    dam: z.ZodOptional<z.ZodString>;
    damsire: z.ZodOptional<z.ZodString>;
    withersHeight: z.ZodOptional<z.ZodNumber>;
    dateOfBirth: z.ZodPipe<
      z.ZodTransform<any, any>,
      z.ZodOptional<z.ZodCoercedDate<unknown>>
    >;
    studbook: z.ZodOptional<z.ZodString>;
    breeder: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
  },
  z.core.$strip
>;
/**
 * Schema for updating an existing horse
 * All fields optional
 */
export declare const updateHorseSchema: z.ZodObject<
  {
    name: z.ZodOptional<z.ZodString>;
    breed: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    age: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    color: z.ZodOptional<z.ZodString>;
    gender: z.ZodOptional<
      z.ZodOptional<
        z.ZodEnum<{
          stallion: "stallion";
          mare: "mare";
          gelding: "gelding";
        }>
      >
    >;
    isExternal: z.ZodOptional<z.ZodBoolean>;
    dateOfArrival: z.ZodOptional<
      z.ZodPipe<
        z.ZodTransform<any, any>,
        z.ZodOptional<z.ZodCoercedDate<unknown>>
      >
    >;
    currentStableId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    usage: z.ZodOptional<z.ZodArray<z.ZodString>>;
    horseGroupId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    vaccinationRuleId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    ueln: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    chipNumber: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    federationNumber: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    feiPassNumber: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    feiExpiryDate: z.ZodOptional<
      z.ZodPipe<
        z.ZodTransform<any, any>,
        z.ZodOptional<z.ZodCoercedDate<unknown>>
      >
    >;
    sire: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    dam: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    damsire: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    withersHeight: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    dateOfBirth: z.ZodOptional<
      z.ZodPipe<
        z.ZodTransform<any, any>,
        z.ZodOptional<z.ZodCoercedDate<unknown>>
      >
    >;
    studbook: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    breeder: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    notes: z.ZodOptional<z.ZodOptional<z.ZodString>>;
  },
  z.core.$strip
>;
export type HorseFormData = z.infer<typeof horseSchema>;
//# sourceMappingURL=horse.schema.d.ts.map
