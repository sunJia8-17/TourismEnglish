function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text) {
  const n = normalize(text);
  return n ? n.split(" ") : [];
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j += 1) dp[j] = j;
  for (let i = 1; i <= m; i += 1) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j += 1) {
      const tmp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return dp[n];
}

function gradeDictation(answer, input) {
  const target = tokens(answer);
  const typed = tokens(input);
  if (!target.length) {
    return { accuracy: 0, empty: true };
  }
  if (!typed.length) {
    return { accuracy: 0, empty: true };
  }
  const distance = levenshtein(target, typed);
  const accuracy = Math.max(0, Math.round((1 - distance / target.length) * 100));
  return { accuracy, empty: false };
}

module.exports = {
  gradeDictation,
  normalize
};
