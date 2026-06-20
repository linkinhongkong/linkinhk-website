import React from "react";

// Shared "something went wrong, DM us a screenshot" CTA, rendered next to
// errors the user can't fix themselves. Optionally shows a compact diagnostic
// `detail` line (from window.describeError) so the screenshot carries the real
// cause (HTTP status / error type / size / time) for support to investigate.
//   variant="on-dark" — for use on a dark surface (e.g. the match toast).
export function ErrorReportLink({ variant, detail }) {
  const cls = "error-report-link" + (variant === "on-dark" ? " on-dark" : "");
  return (
    <div className={cls}>
      {detail ? <div className="error-detail">錯誤詳情：{detail}</div> : null}
      問題持續?描述一下情況同附上截圖,{" "}
      <a href="https://ig.me/m/linkinhk" target="_blank" rel="noopener noreferrer">
        傳到我哋 IG DM →
      </a>
      <br />我哋會盡快回覆 💜
    </div>
  );
}

export default ErrorReportLink;
