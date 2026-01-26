---
"@constela/runtime": patch
---

fix: make @constela/ai an optional peer dependency

@constela/ai was incorrectly added as a required dependency, causing installation failures for projects that don't use AI features. Now it's an optional peer dependency.
