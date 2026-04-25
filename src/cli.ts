#!/usr/bin/env node
import { runPkgClaim } from "./app.ts";

const exitCode = await runPkgClaim(process.argv.slice(2));
process.exit(exitCode);
