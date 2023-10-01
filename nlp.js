const NODE = typeof process !== "undefined" && process.release.name === "node";

if (NODE) {
  console.log("Node.js environment detected");
  require("@tensorflow/tfjs");
  require("@tensorflow/tfjs-node");
  // var is needed here to hoist, in browser this is already declared
  var use = require("@tensorflow-models/universal-sentence-encoder");
} else {
  console.log("Not running in a Node.js environment");
}

/**
 * Static class for scoring similarity and identifying matches in arrays of strings.
 * Similarity is calculated as the dot product of Universal Sentence Encoder embeddings.
 */
class NLP {
  constructor() {}

  static model = use.load();

  /**
   * Generate embeddings for an array of sentences.
   * @param {[String]} lines
   * @returns {[[Float]]} 2D array of embeddings
   */
  static async embed(lines, batchSize = 100) {
    console.log(`Generating embeddings for ${lines.length} lines...`);
    const model = await NLP.model;
    let emb = [];
    for (let i = 0; i < lines.length; i += batchSize) {
      const batch = lines.slice(i, i + batchSize);
      console.log(`Processing ${i + 1}-${i + batch.length} of ${lines.length}`);
      const batchEmb = await (await model.embed(batch)).array();
      emb = emb.concat(batchEmb);
    }
    return emb;
  }

  /**
   * Embeds objects with a text key.
   */
  static async embedObjects(objects, textKey) {
    const texts = objects.map((o) => o[textKey]);
    const embeddings = await NLP.embed(texts);
    objects.forEach((o, i) => (o.embedding = embeddings[i]));
    return objects;
  }

  static async filterMeaningful(objects, threshold = 0.4) {
    // return (await NLP.rank(" ", objects)).map((r) => ({
    //   score: r.score,
    //   text: r.target.text,
    // }));
    console.log(`Filtering ${objects.length} items for meaningfulness...`);
    const queryEmbedding = (await NLP.embed([" "]))[0];
    const scores = objects.map((o) =>
      NLP._dotProduct(queryEmbedding, o.embedding),
    );
    const keep = [];
    for (let i = 0; i < objects.length; i++) {
      if (scores[i] < threshold) {
        keep.push(objects[i]);
      }
    }
    console.log(`Kept ${keep.length} items.`);
    return keep;
  }

  /**
   * Ranks target objects with embeddings by similarity to the query.
   * @param {string} query
   * @param {[{embedding: string}]} targets
   * @returns {[{score: Float, target: Object}]}
   */
  static async rank(query, targets) {
    console.log(`Ranking ${targets.length} items for query...`);
    const queryEmbedding = (await NLP.embed([query]))[0];
    const scores = targets.map((t) =>
      NLP._dotProduct(queryEmbedding, t.embedding),
    );
    const ranked = scores
      .map((s, i) => ({ score: s, target: targets[i] }))
      .sort((a, b) => b.score - a.score);
    return ranked;
  }

  /**
   * Calculate the dot product of two vector arrays.
   */
  static _dotProduct = (xs, ys) => {
    const sum = (xs) => (xs ? xs.reduce((a, b) => a + b, 0) : undefined);
    return xs.length === ys.length
      ? sum(NLP._zipWith((a, b) => a * b, xs, ys))
      : undefined;
  };

  /**
   * zipWith :: (a -> b -> c) -> [a] -> [b] -> [c]
   */
  static _zipWith = (f, xs, ys) => {
    const ny = ys.length;
    return (xs.length <= ny ? xs : xs.slice(0, ny)).map((x, i) => f(x, ys[i]));
  };
}

if (NODE) {
  module.exports = NLP;
}
