// ─── Shared JSON-from-LLM parsing helpers ───────────────
// Used by both document-analysis.service.ts and claim-analysis.service.ts
// so a response cut off by hitting max_tokens (a dangling string, an
// unclosed object/array) can still be recovered instead of failing
// validation outright. String/escape-aware so braces/brackets *inside*
// string values don't throw off the depth count.

/**
 * Strips markdown code fences, extracts the first {...} block if there's
 * stray prose around it, and repairs a truncated tail before parsing.
 * Returns null if nothing usable could be parsed.
 */
export function tryParseJsonObject(raw: string): unknown {
  let candidate = raw.trim();
  const fenced = candidate.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) candidate = fenced[1].trim();

  return tryParseJson(candidate) ?? tryParseJson(candidate.match(/\{[\s\S]*\}/)?.[0] ?? null);
}

function tryParseJson(candidate: string | null): unknown {
  if (!candidate) return null;
  try {
    return JSON.parse(candidate);
  } catch {
    const repaired = repairTruncatedJson(candidate);
    if (!repaired) return null;
    try {
      return JSON.parse(repaired);
    } catch {
      return null;
    }
  }
}

// Recovers from hitting max_tokens mid-generation: closes a dangling
// string literal and any still-open objects/arrays (innermost first),
// dropping a trailing comma if generation stopped right after one.
function repairTruncatedJson(input: string): string | null {
  let inString = false;
  let escapeNext = false;
  const stack: Array<"{" | "["> = [];

  for (const ch of input) {
    if (inString) {
      if (escapeNext) escapeNext = false;
      else if (ch === "\\") escapeNext = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") stack.pop();
  }

  if (!inString && stack.length === 0) return null; // already balanced — nothing to repair

  let repaired = input;
  if (inString) repaired += '"';
  repaired = repaired.replace(/,\s*$/, "");
  for (let i = stack.length - 1; i >= 0; i--) repaired += stack[i] === "{" ? "}" : "]";
  return repaired;
}
