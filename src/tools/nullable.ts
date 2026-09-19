import { z } from "zod";

// z.literal(null) rather than .nullable(): the other forms collapse into
// {"type":["number","null"]}, which some MCP clients read as a single type and
// then reject. Only this one emits an anyOf of single-typed branches.
export const nullable = <T extends z.ZodTypeAny>(schema: T) =>
  z.union([schema, z.literal(null)]);
