const d = require("./forensic-output.json");
d.sheetNames.forEach((n, i) => {
  const s = d.sheets[n];
  const pad = (v, w) => String(v).padStart(w);
  console.log(
    `${pad(i + 1, 2)}. ${n.padEnd(42)} rows=${pad(s.totalRows, 5)} cols=${pad(s.totalCols, 3)} merges=${pad(s.merges.length, 4)}`
  );
});
