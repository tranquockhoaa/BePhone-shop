const { Brand } = require("../models/index");

class NLPService {
  // ========================
  // Vietnamese Stopwords
  // ========================
  static STOPWORDS = new Set([
    "sản",
    "phẩm",
    "điện",
    "thoại",
    "cho",
    "tôi",
    "cần",
    "mua",
    "tư",
    "vấn",
    "giá",
    "bao",
    "nhiêu",
    "của",
    "và",
    "với",
    "cái",
    "những",
    "model",
    "xin",
    "bạn",
    "giúp",
    "tư vấn",
    "so",
    "sánh",
    "là",
    "được",
    "có",
    "cái",
    "được",
    "trong",
    "từ",
    "đến",
    "thì",
    "mà",
    "hay",
    "hoặc",
    "nhưng",
    "vì",
    "nếu",
    "khi",
    "như",
    "sau",
    "trước",
    "giữa",
    "tới",
    "lúc",
    "lần",
    "cách",
    "được",
    "về",
    "theo",
    "trên",
    "dưới",
    "phía",
    "bên",
    "gần",
    "xa",
    "ngang",
    "cao",
    "thấp",
    "dài",
    "ngắn",
    "to",
    "bé",
    "tốt",
    "xấu",
    "đẹp",
    "xấu",
    "mạnh",
    "yếu",
    "nhanh",
    "chậm",
    "sáng",
    "tối",
    "nóng",
    "lạnh",
    "ấm",
    "lạnh",
  ]);

  // ========================
  // Feature Keywords
  // ========================
  static FEATURE_KEYWORDS = {
    gaming: {
      keywords: [
        "game",
        "chơi game",
        "fps",
        "snapdragon",
        "mediatek",
        "chip",
        "gpu",
        "xử lý",
        "hiệu năng",
        "mạnh mẽ",
        "gaming",
        "đồ họa",
        "frame",
      ],
      weight: 1.5,
    },
    camera: {
      keywords: [
        "camera",
        "chụp",
        "ảnh",
        "zoom",
        "pixel",
        "megapixel",
        "macro",
        "thiên vị",
        "góc rộng",
        "tele",
        "portrait",
        "night",
        "video",
      ],
      weight: 1.5,
    },
    battery: {
      keywords: [
        "pin",
        "mah",
        "dung lượng",
        "sạc",
        "battery",
        "endurance",
        "sạc nhanh",
        "pin lâu",
        "pin khỏe",
        "pin trâu",
      ],
      weight: 1.5,
    },
    display: {
      keywords: [
        "màn hình",
        "lcd",
        "oled",
        "amoled",
        "hz",
        "khz",
        "nits",
        "độ sáng",
        "tần số quét",
      ],
      weight: 1.2,
    },
    design: {
      keywords: [
        "thiết kế",
        "kích thước",
        "weight",
        "trọng lượng",
        "màu sắc",
        "vật liệu",
        "bền",
        "chắc",
      ],
      weight: 1.0,
    },
  };

  // ========================
  // 1. Vietnamese Tokenizer
  // ========================
  static tokenize(text) {
    if (!text || typeof text !== "string") return [];
    return text
      .toLowerCase()
      .replace(/[^\p{L}\d\s]+/gu, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1);
  }

  // ========================
  // 2. Remove Stopwords
  // ========================
  static removeStopwords(tokens) {
    return tokens.filter((t) => !NLPService.STOPWORDS.has(t));
  }

  // ========================
  // 3. Extract Brand Entity
  // ========================
  static async extractBrand(message, allBrands = null) {
    if (!allBrands) {
      try {
        const brands = await Brand.findAll({
          attributes: ["name"],
          where: { status: "ACTIVE" },
        });
        allBrands = brands.map((b) => b.name.toLowerCase());
      } catch {
        return null;
      }
    }

    const lowerMsg = message.toLowerCase();
    for (const brand of allBrands) {
      if (lowerMsg.includes(brand)) {
        return brand;
      }
    }
    return null;
  }

  // ========================
  // 4. Extract Price
  // ========================
  static extractPrice(message) {
    const result = { minPrice: 0, maxPrice: Infinity, extracted: false };
    const msg = message.toLowerCase();

    const parseValue = (numStr, unit) => {
      if (!numStr) return null;
      const n = parseFloat(numStr.replace(/,/g, "."));
      if (isNaN(n)) return null;
      const u = (unit || "").toLowerCase();
      if (u.includes("triệu") || u === "tr" || u === "m") return n * 1_000_000;
      if (u.includes("k") || u.includes("nghìn")) return n * 1_000;
      if (n <= 100) return n * 1_000_000; // default to triệu for small numbers
      return n;
    };

    // Range: "từ 3 đến 6 triệu" or "3-6 triệu"
    const rangeRegex =
      /(từ\s*)?(\d+[\.,]?\d*)\s?(triệu|tr|k|nghìn)?\s*(?:-|–|đến|den|\sto\s)\s*(\d+[\.,]?\d*)\s?(triệu|tr|k|nghìn)?/i;
    const rangeMatch = msg.match(rangeRegex);
    if (rangeMatch) {
      const a = parseValue(rangeMatch[2], rangeMatch[3]);
      const b = parseValue(rangeMatch[4], rangeMatch[5]);
      if (a != null && b != null) {
        result.minPrice = Math.min(a, b);
        result.maxPrice = Math.max(a, b);
        result.extracted = true;
        return result;
      }
    }

    // Under: "dưới 5 triệu"
    const underMatch = msg.match(
      /(dưới|duoi|<)\s*(\d+[\.,]?\d*)\s?(triệu|tr|k|nghìn)?/i,
    );
    if (underMatch) {
      const v = parseValue(underMatch[2], underMatch[3]);
      if (v != null) {
        result.maxPrice = v;
        result.extracted = true;
        return result;
      }
    }

    // Over: "trên 5 triệu"
    const overMatch = msg.match(
      /(trên|hơn|tren|>)\s*(\d+[\.,]?\d*)\s?(triệu|tr|k|nghìn)?/i,
    );
    if (overMatch) {
      const v = parseValue(overMatch[2], overMatch[3]);
      if (v != null) {
        result.minPrice = v;
        result.extracted = true;
        return result;
      }
    }

    // Around: "tầm 5 triệu"
    const aroundMatch = msg.match(
      /(tầm|khoảng|khoang)\s*(\d+[\.,]?\d*)\s?(triệu|tr|k|nghìn)?/i,
    );
    if (aroundMatch) {
      const v = parseValue(aroundMatch[2], aroundMatch[3]);
      if (v != null) {
        result.minPrice = Math.max(0, Math.floor(v - 2000000));
        result.maxPrice = Math.ceil(v + 2000000);
        result.extracted = true;
        return result;
      }
    }

    // Single: "5 triệu"
    const singleMatch = msg.match(/(\d+[\.,]?\d*)\s?(triệu|tr|k|nghìn)?/i);
    if (singleMatch) {
      const v = parseValue(singleMatch[1], singleMatch[2]);
      if (v != null) {
        result.minPrice = Math.max(0, Math.floor(v - 2000000));
        result.maxPrice = Math.ceil(v + 2000000);
        result.extracted = true;
        return result;
      }
    }

    return result;
  }

  // ========================
  // 5. Extract Intent & Features
  // ========================
  static extractIntent(message) {
    const result = { intent: "general", features: [] };
    const lowerMsg = message.toLowerCase();

    for (const [feature, config] of Object.entries(
      NLPService.FEATURE_KEYWORDS,
    )) {
      for (const keyword of config.keywords) {
        if (lowerMsg.includes(keyword)) {
          result.features.push(feature);
          if (!result.intent || result.intent === "general") {
            result.intent = feature;
          }
          break;
        }
      }
    }

    return result;
  }

  // ========================
  // 6. TF-IDF Scorer
  // ========================
  static calculateTFIDF(tokens, documents) {
    const tokenFreq = {};
    tokens.forEach((t) => {
      tokenFreq[t] = (tokenFreq[t] || 0) + 1;
    });

    const docFreq = {};
    documents.forEach((doc) => {
      const docTokens = new Set(NLPService.tokenize(doc));
      docTokens.forEach((t) => {
        if (!NLPService.STOPWORDS.has(t)) {
          docFreq[t] = (docFreq[t] || 0) + 1;
        }
      });
    });

    let tfidfScore = 0;
    const totalDocs = documents.length || 1;

    tokens.forEach((t) => {
      const tf = (tokenFreq[t] || 0) / tokens.length;
      const idf = Math.log(totalDocs / (docFreq[t] || 1));
      tfidfScore += tf * idf;
    });

    return tfidfScore;
  }

  // ========================
  // 7. Score Product by Relevance
  // ========================
  static scoreProductRelevance(product, queryTokens, queryIntent) {
    let score = 0;

    // Product name match: highest weight
    const nameTokens = NLPService.tokenize(product.name || "");
    const nameScore = NLPService.calculateTFIDF(queryTokens, [product.name]);
    score += nameScore * 30;

    // Description match
    let descText = product.description || "";
    if (descText && typeof descText !== "string") {
      try {
        descText = JSON.stringify(descText);
      } catch {
        descText = String(descText);
      }
    }
    descText = String(descText || "").toLowerCase();
    const descScore = NLPService.calculateTFIDF(queryTokens, [descText]);
    score += descScore * 20;

    // Intent match: feature alignment
    if (queryIntent && queryIntent !== "general") {
      const featureKeywords =
        NLPService.FEATURE_KEYWORDS[queryIntent]?.keywords || [];
      for (const kw of featureKeywords) {
        if (nameTokens.some((t) => t.includes(kw)) || descText.includes(kw)) {
          score += 15;
          break;
        }
      }
    }

    // Code/SKU match
    const codeTokens = NLPService.tokenize(product.sku || "");
    const codeScore = NLPService.calculateTFIDF(queryTokens, [product.sku]);
    score += codeScore * 5;

    return Math.max(0, score);
  }

  // ========================
  // 8. Analyze Query (Main Function)
  // ========================
  static async analyzeQuery(message, allBrands = null) {
    if (!message || typeof message !== "string") {
      return {
        brand: null,
        price: { minPrice: 0, maxPrice: Infinity, extracted: false },
        intent: "general",
        features: [],
        tokens: [],
        cleanTokens: [],
      };
    }

    const tokens = NLPService.tokenize(message);
    const cleanTokens = NLPService.removeStopwords(tokens);
    const brand = await NLPService.extractBrand(message, allBrands);
    const price = NLPService.extractPrice(message);
    const { intent, features } = NLPService.extractIntent(message);

    return {
      brand,
      price,
      intent,
      features,
      tokens,
      cleanTokens,
    };
  }
}

module.exports = NLPService;
