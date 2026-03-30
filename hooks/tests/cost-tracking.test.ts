import { describe, test, expect, beforeAll } from "bun:test";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { $ } from "bun";

const PAI_DIR = process.env.PAI_DIR || process.cwd();

describe("Cost Tracking and Dashboard", () => {
  let costBudget: any;
  let financesMd: string;
  let dashboardScript: string;

  beforeAll(() => {
    const costBudgetPath = join(PAI_DIR, "PAI/config/cost-budget.json");
    const financesPath = join(PAI_DIR, "PAI/USER/TELOS/FINANCES.md");
    const dashboardPath = join(PAI_DIR, "config/kitty/scripts/strategic-dashboard.sh");

    expect(existsSync(costBudgetPath)).toBeTrue();
    expect(existsSync(financesPath)).toBeTrue();
    expect(existsSync(dashboardPath)).toBeTrue();

    costBudget = JSON.parse(readFileSync(costBudgetPath, "utf-8"));
    financesMd = readFileSync(financesPath, "utf-8");
    dashboardScript = readFileSync(dashboardPath, "utf-8");
  });

  test("cost-budget.json schema validation", () => {
    // Top-level schema
    expect(costBudget.currency).toBeDefined();
    expect(costBudget.rub_rate).toBeTypeOf("number");

    // Subscriptions
    expect(costBudget.subscriptions).toBeTypeOf("object");
    for (const [name, sub] of Object.entries(costBudget.subscriptions) as any[]) {
      if (name === "GitHub") continue; // special case, just free
      if (name === "Timeweb Cloud") {
        expect(sub.total_rub).toBeTypeOf("number");
        expect(sub.period).toBeDefined();
        continue;
      }
      expect(sub.cost).toBeTypeOf("number");
      expect(sub.currency).toBeDefined();
      expect(sub.period).toBeDefined();
    }

    // API usage
    expect(costBudget.api_usage).toBeTypeOf("object");
    for (const [name, api] of Object.entries(costBudget.api_usage) as any[]) {
      expect(api.key_env).toBeDefined();
      expect(api.billing).toBeDefined();
    }
  });

  test("FINANCES.md structure validation", () => {
    expect(financesMd.length).toBeGreaterThan(0);
    expect(financesMd).toContain("# Finances");

    // Valid markdown - no broken internal references (look for [name](link) syntax but no specific content to avoid hardcoding)
    const brokenLinks = financesMd.match(/\[([^\]]+)\]\(\s*\)/g);
    expect(brokenLinks).toBeNull();
  });

  test("Anthropic section in cost-budget.json has required fields", () => {
    const anthropic = costBudget.api_usage["Anthropic API"];
    expect(anthropic).toBeDefined();

    expect(anthropic.credits_purchased).toBeTypeOf("number");
    expect(anthropic.balance_remaining).toBeTypeOf("number");
    expect(anthropic.total_spent).toBeTypeOf("number");
    expect(anthropic.last_updated).toBeTypeOf("string");

    expect(Array.isArray(anthropic.invoices)).toBeTrue();
    expect(anthropic.invoices.length).toBeGreaterThan(0);

    for (const invoice of anthropic.invoices) {
      expect(invoice.date).toBeDefined();
      expect(invoice.type).toBeDefined();
      expect(invoice.amount).toBeTypeOf("number");
    }
  });

  test("strategic-dashboard.sh jq compatibility with cost-budget.json", async () => {
    const costBudgetPath = join(PAI_DIR, "PAI/config/cost-budget.json");

    // 1. Fixed cost parsing
    const { stdout: fixedOutput } = await $`jq -r '
      (.monthly_summary.fixed_usd // 0) as $fusd |
      (.monthly_summary.fixed_rub_as_usd // 0) as $frusd |
      ($fusd + $frusd) as $total_fixed |
      [$fusd, $frusd, $total_fixed] | @tsv
    ' ${costBudgetPath}`.nothrow();
    expect(fixedOutput.toString().trim()).not.toBe("null");
    expect(fixedOutput.toString().trim().length).toBeGreaterThan(0);

    // 2. Subscription list parsing
    const script = `
      .subscriptions | to_entries[] |
      select(.value.cost > 0 or .value.total_rub > 0) |
      if .value.total_rub then
        "\\(.key)\\t\\(.value.total_rub)₽"
      elif .value.monthly_equiv then
        "\\(.key)\\t$\\(.value.monthly_equiv)/mo"
      else
        "\\(.key)\\t$\\(.value.cost)/\\(.value.period // "mo")"
      end
    `;
    const { stdout: subOutput } = await $`jq -r ${script} ${costBudgetPath}`.nothrow();
    expect(subOutput.toString().trim()).not.toBe("null");
    expect(subOutput.toString().trim().length).toBeGreaterThan(0);

    // 3. Anthropic parsing
    const anthropicScript = `.api_usage["Anthropic API"] | "\\(.balance_remaining // "")\\t\\(.total_spent // "")\\t\\(.last_updated // "")"`;
    const { stdout: anthropicOutput } = await $`jq -r ${anthropicScript} ${costBudgetPath}`.nothrow();
    expect(anthropicOutput.toString().trim()).not.toBe("null");
    expect(anthropicOutput.toString().trim().length).toBeGreaterThan(0);
    expect(anthropicOutput.toString().trim()).not.toBe("\t\t");
  });
});
