// deno-lint-ignore-file no-explicit-any

function getRawText(tokens: any[]) {
  let text = "";
  for (const token of tokens) {
    switch (token.type) {
      case "text":
      case "code_inline":
        text += token.content;
        break;
      case "softbreak":
      case "hardbreak":
        text += " ";
        break;
    }
  }
  return text;
}

export default function markdownDigest(md: any, maxLength: number = 200) {
  function getDigest(tokens: any[]): string {
    let result = "";
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type === "paragraph_open") {
        const token = tokens[i + 1];
        if (token?.type === "inline") {
          result += getRawText(token.children);
        }
      }
      if (result.length > maxLength) break;
    }
    return result.slice(0, maxLength);
  }

  md.core.ruler.push("getDigest", function (state: any) {
    const data = state.env.data?.page?.data;
    if (!data) return;
    data.digest = getDigest(state.tokens);
  });
}
