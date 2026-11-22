"use strict";

/*
 * CI helper: reads jest-results.json and emits GitHub Actions ::error annotations
 * (visible on the run summary page without opening raw logs) plus a markdown summary.
 * Never prints environment variables or secrets.
 * LOCATION: Backend/scripts/ci-report-jest-failures.js
 */

const fs = require("fs");
const path = require("path");

const resultsPath = path.resolve(process.cwd(), "jest-results.json");

if (!fs.existsSync(resultsPath)) {
    console.log("::error title=Jest results missing::jest-results.json was not produced (jest crashed before reporting).");
    process.exit(0);
}

const results = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
const summaryLines = [
    "## Backend Jest Verification Summary",
    "",
    `- Suites: ${results.numPassedTestSuites} passed / ${results.numFailedTestSuites} failed / ${results.numTotalTestSuites} total`,
    `- Tests: ${results.numPassedTests} passed / ${results.numFailedTests} failed / ${results.numTotalTests} total`,
    ""
];

let emitted = 0;
for (const suite of results.testResults || []) {
    const suiteName = path.basename(suite.name || "unknown-suite");
    if (suite.status === "failed" && (!suite.assertionResults || suite.assertionResults.length === 0)) {
        const msg = String(suite.message || "Suite failed to run").replace(/\r?\n/g, " | ").slice(0, 800);
        console.log(`::error title=Suite failed to run: ${suiteName}::${msg}`);
        summaryLines.push(`- SUITE ERROR \`${suiteName}\`: ${msg}`);
        emitted++;
    }
    for (const t of suite.assertionResults || []) {
        if (t.status === "failed") {
            const msg = (t.failureMessages || []).join(" ").replace(/\u001b\[[0-9;]*m/g, "").replace(/\r?\n/g, " | ").slice(0, 800);
            console.log(`::error title=Jest FAIL ${suiteName}::${t.fullName || t.title} -> ${msg}`);
            summaryLines.push(`- FAIL \`${suiteName}\` — ${t.fullName || t.title}: ${msg}`);
            emitted++;
        }
    }
}

if (emitted === 0) {
    summaryLines.push("- No failing tests recorded.");
}

if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summaryLines.join("\n") + "\n");
}

console.log(`CI report complete. Failure annotations emitted: ${emitted}`);
