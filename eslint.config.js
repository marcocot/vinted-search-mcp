import fido from "@fido.id/eslint-config-fido";

export default [
  ...fido.configs.recommended,
  {
    ignores: ["dist/**", "coverage/**", "tests/fixtures/**"],
  },
  {
    files: ["**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["./*", "../*"],
              message:
                "Usa l'alias @/ : gli import relativi si rompono appena un file viene spostato.",
            },
          ],
        },
      ],
    },
  },
];
