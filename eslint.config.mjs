// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import stylistic from '@stylistic/eslint-plugin';
import globals from 'globals';

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.{js,jsx,ts,tsx}'],
        ignores: ['gulpfile.js'],
        plugins: {
            react,
            '@stylistic': stylistic,
        },
        languageOptions: {
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
            globals: {
                ...globals.browser,
            },
        },
        rules: {
            "@stylistic/object-curly-spacing": ["warn", "always"],
            "@typescript-eslint/adjacent-overload-signatures": "off",
            "@typescript-eslint/ban-types": ["error", {
                "types": {
                    "{}": false
                },
                "extendDefaults": true
            }],
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/explicit-module-boundary-types": "off",
            "@typescript-eslint/indent": ["error", 2, {
                "MemberExpression": 0,
                "SwitchCase": 1
            }],
            "@typescript-eslint/no-empty-function": ["error", { "allow": ["arrowFunctions"] }],
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-invalid-void-type": ["error", { "allowInGenericTypeArguments": true }],
            "@typescript-eslint/no-namespace": "off",
            "@typescript-eslint/no-unused-vars": ["error", {
                "vars": "all",
                "args": "none"
            }],
            "@typescript-eslint/no-use-before-define": "off",
            "@typescript-eslint/prefer-interface": "off",
            //"react/no-access-state-in-setstate": "error", (requires restructuring of "app.tsx")
            "react/no-direct-mutation-state": "error",
            "react/no-render-return-value": "error",
            "react/no-string-refs": "error",
            "react/no-unescaped-entities": ["error", {"forbid": [{
                    "char": ">",
                    "alternatives": ["&gt;"]
                }, {
                    "char": "}",
                    "alternatives": ["&#125;"]
                }]}],
            "react/no-unused-prop-types": "error",
            "react/no-unused-state": "error",
            "react/react-in-jsx-scope": "off",
            "react/display-name": "off",
            "curly": ["error", "all"],
            "eol-last": "error",
            "for-direction": "error",
            "getter-return": "error",
            "keyword-spacing": "error",
            "no-compare-neg-zero": "error",
            "no-cond-assign": "error",
            "no-constant-condition": ["error", { "checkLoops": false }],
            "no-control-regex": "off",
            "no-debugger": "error",
            "no-delete-var": "error",
            "no-dupe-args": "error",
            "no-dupe-keys": "error",
            "no-duplicate-case": "error",
            "no-empty": "error",
            "no-empty-character-class": "error",
            "no-empty-pattern": "error",
            "no-ex-assign": "error",
            "no-extra-boolean-cast": "error",
            "no-extra-semi": "error",
            "no-func-assign": "error",
            "no-global-assign": "error",
            "no-inner-declarations": "off",
            "no-invalid-regexp": "error",
            "no-irregular-whitespace": "error",
            "no-mixed-spaces-and-tabs": "error",
            "no-obj-calls": "error",
            "no-octal": "error",
            "no-prototype-builtins": "error",
            "no-redeclare": "off",
            "@typescript-eslint/no-redeclare": "error",
            "no-regex-spaces": "error",
            "no-self-assign": "error",
            "no-shadow-restricted-names": "error",
            "no-spaced-func": "error",
            "no-sparse-arrays": "error",
            "no-trailing-spaces": "error",
            "no-unexpected-multiline": "error",
            "no-unreachable": "error",
            "no-unsafe-finally": "error",
            "no-unsafe-negation": "error",
            "no-unused-labels": "error",
            "no-useless-catch": "error",
            "no-useless-escape": "error",
            "no-whitespace-before-property": "error",
            "no-with": "error",
            "quotes": ["error", "single"],
            //"require-atomic-updates": "error", (requires restructuring of "recursiveDirectory()")
            "semi": ["error", "always"],
            "space-before-blocks": "error",
            "space-unary-ops": "error",
            "spaced-comment": "error",
            "use-isnan": "error",
            "valid-typeof": "error",
            "wrap-iife": "error",
            "yoda": "error",
        }
    }
);
