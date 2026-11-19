// Tìm kiếm BM25 nhẹ, không cần cơ sở dữ liệu vector.
// Tiếng Việt: so khớp cả âm tiết lẫn cặp âm tiết liền nhau (vd "cư trú", "thẻ cư"),
// có dấu và không dấu, nên "dang ky cu tru" vẫn tìm ra "đăng ký cư trú".

const strip = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");

export function tokenize(text) {
  const words = strip(text.toLowerCase()).replace(/ß/g, "ss").split(/[^\p{L}\p{N}§]+/u).filter((w) => w.length > 1 || /\d/.test(w));
  const out = [...words];
  for (let i = 0; i + 1 < words.length; i++) out.push(`${words[i]}_${words[i + 1]}`);
  return out;
}

export class Index {
  constructor(docs, { k1 = 1.4, b = 0.75 } = {}) {
    this.docs = docs;
    this.k1 = k1; this.b = b;
    this.tf = docs.map((d) => {
      // Tiêu đề, tóm tắt và từ khóa được nhân trọng số vì chúng mô tả đúng chủ đề.
      const weighted = `${d.title} ${d.title} ${d.title} ${d.summary} ${d.summary} ${d.keywords.join(" ")} ${d.keywords.join(" ")} ${d.body}`;
      const m = new Map();
      for (const t of tokenize(weighted)) m.set(t, (m.get(t) ?? 0) + 1);
      return m;
    });
    this.len = this.tf.map((m) => [...m.values()].reduce((a, b) => a + b, 0));
    this.avg = this.len.reduce((a, b) => a + b, 0) / Math.max(1, docs.length);
    this.df = new Map();
    for (const m of this.tf) for (const t of m.keys()) this.df.set(t, (this.df.get(t) ?? 0) + 1);
  }

  // minScore lọc các bài chỉ trùng một từ lẻ (vd "visa") với câu hỏi.
  search(query, k = 4, minScore = 1.5) {
    const q = [...new Set(tokenize(query))];
    const N = this.docs.length;
    const scores = this.docs.map((d, i) => {
      let s = 0;
      for (const t of q) {
        const f = this.tf[i].get(t);
        if (!f) continue;
        const idf = Math.log(1 + (N - this.df.get(t) + 0.5) / (this.df.get(t) + 0.5));
        s += idf * ((f * (this.k1 + 1)) / (f + this.k1 * (1 - this.b + (this.b * this.len[i]) / this.avg)));
      }
      return { doc: d, score: s };
    });
    return scores.filter((x) => x.score >= minScore).sort((a, b) => b.score - a.score).slice(0, k);
  }
}
