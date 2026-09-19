import { describe, expect, it } from "vitest";
import { parseFlareSolverrSolution } from "@/session/parseFlareSolverrSolution.js";
import { ParseError } from "@/vinted/errors/parseError.js";

const solved = {
  status: "ok",
  message: "Challenge solved!",
  solution: {
    url: "https://www.vinted.it/",
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) Chrome/152.0.0.0",
    cookies: [
      { name: "cf_clearance", value: "clear" },
      { name: "anon_id", value: "anon-1" },
      { name: "access_token_web", value: "token" },
    ],
  },
};

describe("parseFlareSolverrSolution", () => {
  it("builds the session from the solved cookies", () => {
    expect(parseFlareSolverrSolution(solved)).toEqual({
      cookie: "cf_clearance=clear; anon_id=anon-1; access_token_web=token",
      anonId: "anon-1",
      userAgent: "Mozilla/5.0 (X11; Linux x86_64) Chrome/152.0.0.0",
    });
  });

  it("skips malformed cookies", () => {
    const session = parseFlareSolverrSolution({
      ...solved,
      solution: {
        cookies: ["string", { name: "a" }, { name: "b", value: "1" }],
      },
    });

    expect(session).toEqual({ cookie: "b=1", anonId: null, userAgent: null });
  });

  it("reports the FlareSolverr message when the challenge fails", () => {
    expect(() =>
      parseFlareSolverrSolution({
        status: "error",
        message: "Challenge not solved!",
      }),
    ).toThrow(/Challenge not solved/);
  });

  const invalid: [unknown, string][] = [
    [null, "response not an object"],
    [{ status: "error" }, "error without message"],
    [{ status: "ok" }, "no solution block"],
    [{ status: "ok", solution: { cookies: "niente" } }, "cookies not an array"],
    [{ status: "ok", solution: { cookies: [] } }, "no cookie"],
  ];

  it.each(invalid)("raises ParseError: %#, %s", (payload) => {
    expect(() => parseFlareSolverrSolution(payload)).toThrow(ParseError);
  });
});
