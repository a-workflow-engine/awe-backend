import * as fs from "fs";
import * as path from "path";

interface AssertionResult {
  title: string;
  status: "passed" | "failed" | "pending" | "skipped";
  duration: number | null;
  failureMessages: string[];
}

interface TestSuiteResult {
  name: string;
  assertionResults: AssertionResult[];
  status: "passed" | "failed";
  startTime: number;
  endTime: number;
}

interface JestResult {
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  testResults: TestSuiteResult[];
  startTime: number;
  success: boolean;
}

const reportJsonPath = path.resolve(process.cwd(), "test-report.json");
const reportMdPath = path.resolve(process.cwd(), "test-report.md");

if (!fs.existsSync(reportJsonPath)) {
  console.error(`Error: test-report.json not found at ${reportJsonPath}`);
  process.exit(1);
}

const raw = fs.readFileSync(reportJsonPath, "utf-8");
const data: JestResult = JSON.parse(raw);

const runDate = new Date(data.startTime).toISOString();
const totalDurationMs = data.testResults.reduce(
  (acc, s) => acc + (s.endTime - s.startTime),
  0,
);
const totalDurationSec = (totalDurationMs / 1000).toFixed(2);

const lines: string[] = [];

lines.push(`# Test Report`);
lines.push(``);
lines.push(`**Run date:** ${runDate}`);
lines.push(`**Total:** ${data.numTotalTests} | **Passed:** ${data.numPassedTests} | **Failed:** ${data.numFailedTests} | **Pending:** ${data.numPendingTests}`);
lines.push(`**Duration:** ${totalDurationSec}s`);
lines.push(``);

for (const suite of data.testResults) {
  const relativePath = path.relative(process.cwd(), suite.name);
  lines.push(`## ${relativePath}`);
  lines.push(``);
  lines.push(`| Test Case | Status | Duration (ms) | Error |`);
  lines.push(`|-----------|--------|---------------|-------|`);

  for (const test of suite.assertionResults) {
    const statusIcon = test.status === "passed" ? "✅" : test.status === "failed" ? "❌" : "⏭";
    const duration = test.duration != null ? String(test.duration) : "-";
    const error =
      test.failureMessages.length > 0
        ? test.failureMessages[0]
            .split("\n")[0]
            .replace(/\|/g, "\\|")
            .replace(/`/g, "'")
            .slice(0, 120)
        : "";
    const title = test.title.replace(/\|/g, "\\|");
    lines.push(`| ${title} | ${statusIcon} ${test.status} | ${duration} | ${error} |`);
  }

  lines.push(``);
}

const markdown = lines.join("\n");
fs.writeFileSync(reportMdPath, markdown, "utf-8");

console.log("\n========================================");
console.log("  Test Report Summary");
console.log("========================================");
console.log(`  Total:   ${data.numTotalTests}`);
console.log(`  Passed:  ${data.numPassedTests}`);
console.log(`  Failed:  ${data.numFailedTests}`);
console.log(`  Pending: ${data.numPendingTests}`);
console.log(`  Status:  ${data.success ? "PASS" : "FAIL"}`);
console.log("========================================");
console.log(`\nReport written to: ${reportMdPath}`);
