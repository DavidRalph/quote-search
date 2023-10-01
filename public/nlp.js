const NODE = typeof process !== "undefined" && process.release.name === "node";

if (NODE) {
  console.log("Node.js environment detected");
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

  // static model = use.load();
  static model = use.loadQnA();

  /**
   * Generate embeddings for an array of sentences.
   * @param {[String]} lines
   * @returns {[[Float]]} 2D array of embeddings
   */
  static async embed(lines, isQuery = true, batchSize = 100) {
    console.log(`Generating embeddings for ${lines.length} lines...`);
    const model = await NLP.model;
    let emb = [];
    for (let i = 0; i < lines.length; i += batchSize) {
      const batch = lines.slice(i, i + batchSize);
      console.log(`Processing ${i + 1}-${i + batch.length} of ${lines.length}`);

      if (isQuery) {
        emb = emb.concat(
          await (
            await model.embed({ queries: batch, responses: [] })
          ).queryEmbedding.array(),
        );
      } else {
        emb = emb.concat(
          await (
            await model.embed({ queries: [], responses: batch })
          ).responseEmbedding.array(),
        );
      }
    }
    return emb;
  }

  /**
   * Embeds objects with a text key.
   */
  static async embedObjects(objects, textKey) {
    const texts = objects.map((o) => o[textKey]);
    const embeddings = await NLP.embed(texts, false);
    objects.forEach((o, i) => (o.embedding = embeddings[i]));
    return objects;
  }

  /**
   * Ranks target objects with embeddings by similarity to the query.
   * @param {string} query
   * @param {[{embedding: string}]} targets
   * @returns {[{score: Float, target: Object}]}
   */
  static async rank(query, targets, dedupe = true) {
    console.log(`Ranking ${targets.length} items for query...`);
    const queryEmbedding = await NLP.embed([query]);

    const scores = NLP.score(
      queryEmbedding,
      targets.map((t) => t.embedding),
    );

    const ranked = scores
      .map((s, i) => ({ score: s, target: targets[i] }))
      .sort((a, b) => b.score - a.score);

    if (dedupe) {
      const seen = [];
      const unique = [];
      for (let i = 0; i < ranked.length; i++) {
        const target = ranked[i].target;
        const line_numbers = target.line_numbers;
        const intersection = line_numbers.filter((n) => seen.includes(n));
        if (intersection.length === 0) {
          unique.push(ranked[i]);
          seen.push(...line_numbers);
        }
      }
      return unique;
    }

    return ranked;
  }

  static score(queryEmbedding, targetEmbeddings) {
    return Array.from(
      tf.matMul(queryEmbedding, targetEmbeddings, false, true).dataSync(),
    );
  }
}

if (NODE) {
  module.exports = NLP;
}
