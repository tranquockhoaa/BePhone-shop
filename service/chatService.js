const { Op, fn, col, where } = require("sequelize");
const { Product, ProductDetails, Brand } = require("../models/index");
const AppError = require("../utils/appError");
const NLPService = require("./nlpService");
const OpenAI = require("openai");

const openaiConfig = {
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://api.shopaikey.com/v1",
};

const openai = new OpenAI(openaiConfig);

class ChatService {
  // =========================
  // 🧠 1. PHÂN TÍCH INTENT

  // =========================
  // 🔍 2. CHECK PRODUCT QUERY
  // =========================
  static isProductQuery(message) {
    if (!message || typeof message !== "string") return false;
    const lowerMsg = message.toLowerCase();

    const keywords = [
      "sản phẩm",
      "điện thoại",
      "phone",
      "iphone",
      "samsung",
      "xperia",
      "xiaomi",
      "oppo",
      "realme",
      "vivo",
      "giá",
      "mua",
      "tư vấn",
      "so sánh",
      "model",
    ];

    return (
      keywords.some((kw) => lowerMsg.includes(kw)) ||
      /\d+\s?(triệu|tr|k|nghìn)/.test(lowerMsg) ||
      lowerMsg.includes("tầm") ||
      lowerMsg.includes("dưới") ||
      lowerMsg.includes("trên")
    );
  }

  static normalizeQuery(message) {
    if (!message || typeof message !== "string") return "";
    return message
      .toLowerCase()
      .replace(/[^\p{L}\d\s]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  static isBrandListQuery(message) {
    if (!message || typeof message !== "string") return false;
    const m = message.toLowerCase();
    // common Vietnamese phrasings asking which brands are sold
    return (
      /hãng|thương hi?ệu|brand|loại( điện thoại)?|cửa hàng bán|shop bán/.test(
        m,
      ) && /(nào|những|gì|có những|bán)/.test(m)
    );
  }

  static async getAvailableBrands() {
    try {
      const brands = await Brand.findAll({
        attributes: ["name"],
        include: [
          {
            model: Product,
            required: true,
            attributes: [],
          },
        ],
        where: { status: "ACTIVE" },
        group: ["brand_id", "brands.name"],
      });

      return brands.map((b) => b.name).filter(Boolean);
    } catch (error) {
      console.error("Error fetching brands:", error);
      return [];
    }
  }

  static async extractIntent(message) {
    return await NLPService.analyzeQuery(message);
  }

  // =========================
  // 🗄️ 3. QUERY DB THÔNG MINH
  // =========================
  static async searchProducts(message) {
    const analysis = await ChatService.extractIntent(message);
    const { minPrice, maxPrice } = analysis.price;
    const { intent, features } = analysis;
    const brand = analysis.brand;

    const whereClause = [];
    const productDetailConditions = {};

    // Price filtering
    if (minPrice > 0 || maxPrice < Infinity) {
      productDetailConditions.price = {
        [Op.between]: [minPrice, maxPrice],
      };
    }

    if (Object.keys(productDetailConditions).length) {
      whereClause.push(productDetailConditions);
    }

    const searchConditions = [];
    const { cleanTokens } = analysis;

    // Full message search
    searchConditions.push(
      where(fn("lower", col("product.name")), {
        [Op.like]: `%${message}%`,
      }),
    );
    searchConditions.push(
      where(fn("lower", col("product.description")), {
        [Op.like]: `%${message}%`,
      }),
    );

    // Token-based search with clean tokens
    cleanTokens.forEach((token) => {
      searchConditions.push(
        where(fn("lower", col("product.name")), {
          [Op.like]: `%${token}%`,
        }),
      );
      searchConditions.push(
        where(fn("lower", col("product.description")), {
          [Op.like]: `%${token}%`,
        }),
      );
      searchConditions.push(
        where(fn("lower", col("product.sku")), {
          [Op.like]: `%${token}%`,
        }),
      );
    });

    // Brand filtering if extracted
    if (brand) {
      searchConditions.push(
        where(fn("lower", col("product->brand.name")), {
          [Op.like]: `%${brand}%`,
        }),
      );
    }

    // Feature-based filtering
    if (features && features.length > 0) {
      const featurePatterns = {
        gaming: ["snapdragon", "mediatek", "game", "fps", "gpu"],
        camera: ["camera", "chụp", "ảnh", "megapixel", "zoom"],
        battery: ["mah", "pin", "dung lượng", "sạc"],
        display: ["oled", "amoled", "lcd", "hz"],
      };

      features.forEach((feat) => {
        const patterns = featurePatterns[feat] || [];
        patterns.forEach((pattern) => {
          searchConditions.push(
            where(fn("lower", col("product.description")), {
              [Op.like]: `%${pattern}%`,
            }),
          );
        });
      });
    }

    if (searchConditions.length > 0) {
      whereClause.push({ [Op.or]: searchConditions });
    }

    const products = await ProductDetails.findAll({
      where: whereClause.length ? { [Op.and]: whereClause } : {},
      include: [
        {
          model: Product,
          as: "product",
          include: [{ model: Brand, as: "brand" }],
        },
      ],
      limit: 20,
    });

    // Score and rank products client-side for sales assistant suitability
    const idealPrice =
      isFinite(maxPrice) && minPrice > 0 ? (minPrice + maxPrice) / 2 : null;

    const scoreProduct = (detail) => {
      let score = 0;

      // NLP-based relevance scoring
      const relevanceScore = NLPService.scoreProductRelevance(
        detail.product,
        cleanTokens,
        intent,
      );
      score += relevanceScore;

      // Price proximity (up to 50 points)
      if (idealPrice) {
        const diff = Math.abs((detail.price || 0) - idealPrice);
        const pct = Math.max(0, 1 - diff / Math.max(idealPrice, 1));
        score += pct * 50;
      }

      // Discount bonus
      if (detail.discount && Number(detail.discount) > 0) score += 10;

      // In-stock bonus
      if (detail.quantity && Number(detail.quantity) > 0) score += 5;

      return score;
    };

    const scored = products.map((p) => ({ p, score: scoreProduct(p) }));
    scored.sort((a, b) => b.score - a.score);

    const top = scored.slice(0, 3).map((s) => s.p);

    return { products: top, intent };
  }

  // =========================
  // 🧾 4. BUILD CONTEXT
  // =========================
  static buildContext(productDetails, intent = "general") {
    if (!productDetails || productDetails.length === 0)
      return "Không tìm thấy sản phẩm phù hợp.";

    const topPicks = productDetails.slice(0, 2);
    const others = productDetails.slice(2);

    const reasonFor = (detail) => {
      let desc = detail.product?.description || "";
      if (desc && typeof desc !== "string") {
        try {
          desc = JSON.stringify(desc);
        } catch {
          desc = String(desc);
        }
      }
      desc = String(desc || "").toLowerCase();
      if (intent === "gaming" && /snapdragon|game|fps|gpu|mediatek/.test(desc))
        return "Phù hợp chơi game (chip/hiệu năng).";
      if (intent === "camera" && /camera|chụp|ảnh|megapixel|zoom/.test(desc))
        return "Khả năng chụp tốt (camera mạnh).";
      if (intent === "battery" && /mah|pin|dung lượng|sạc/.test(desc))
        return "Pin trâu/dung lượng lớn.";
      if (detail.discount && Number(detail.discount) > 0)
        return `Giảm ${detail.discount} — đáng cân nhắc.`;
      return "Sản phẩm phù hợp với yêu cầu chung.";
    };

    const format = (detail, idx) => {
      const product = detail.product || {};
      return `${idx}. ${product.name || "N/A"} - Giá: ${detail.price ?? "N/A"} - Hãng: ${product.brand?.name || "N/A"} - Mã: ${detail.sku || "N/A"}\n  Lý do: ${reasonFor(detail)}`;
    };

    const parts = [];
    parts.push("Top gợi ý:");
    topPicks.forEach((d, i) => parts.push(format(d, i + 1)));
    if (others.length) {
      parts.push("\nCác lựa chọn khác:");
      others.forEach((d, i) => parts.push(format(d, topPicks.length + i + 1)));
    }

    return parts.join("\n");
  }

  // =========================
  // 🤖 5. MAIN FUNCTION
  // =========================
  static async processMessage(message) {
    try {
      if (!message || typeof message !== "string") {
        throw new AppError("Tin nhắn không hợp lệ", 400);
      }
      // If user asks what brands are sold, return brand list directly
      if (ChatService.isBrandListQuery(message)) {
        const brands = await ChatService.getAvailableBrands();
        if (!brands || brands.length === 0)
          return "Hiện tại shop chưa có thương hiệu nào.";
        return `Hiện tại cửa hàng đang bán: ${brands.join(", ")}`;
      }

      const isProduct = ChatService.isProductQuery(message);
      let context = "";

      if (isProduct) {
        const result = await ChatService.searchProducts(message);
        const { products, intent } = result;
        context = ChatService.buildContext(products, intent);
      }

      const prompt = `
Bạn là nhân viên bán hàng chuyên nghiệp của Mobile Store.

Mục tiêu:
- Nếu có nhiều sản phẩm → chọn ra 1-2 cái tốt nhất
- Giải thích lý do nên mua

Phong cách:
- Tự nhiên, thân thiện
- Ngắn gọn, dễ hiểu

Quy tắc:
- Không bịa sản phẩm
- Chỉ dùng dữ liệu được cung cấp
- Nếu không có sản phẩm → nói rõ
- Không cần hỏi các nhu cầu khác nếu khách hàng không hỏi nói rõ brand nào thì hỏi lại để đưa ra kết quả

${context ? "Sản phẩm:\n" + context : ""}

Khách hỏi: ${message}

Trả lời:
`;

      const response = await openai.responses.create({
        model: "gpt-4o-mini",
        input: prompt,
      });

      const text =
        response.output_text ||
        (Array.isArray(response.output)
          ? response.output
              .map((item) =>
                Array.isArray(item.content)
                  ? item.content.map((c) => c.text || "").join("")
                  : "",
              )
              .join("")
          : "");

      return text.trim();
    } catch (error) {
      console.error("ChatService error:", error);

      if (
        error.message?.includes("API key") ||
        error.message?.includes("api_key")
      ) {
        throw new AppError(
          "API key OpenAI không hợp lệ. Kiểm tra lại .env",
          500,
        );
      }

      if (
        error.message?.toLowerCase().includes("quota") ||
        error.message?.toLowerCase().includes("limit")
      ) {
        throw new AppError("Đã vượt giới hạn OpenAI 😅", 500);
      }

      throw new AppError("Không thể xử lý tin nhắn. Thử lại sau.", 500);
    }
  }

  // =========================
  // 🧰 6. INTERACTIVE TOOL-ENABLED FLOW
  // Assistant may request a `search` action by returning JSON like:
  // { "type": "search", "query": "tìm điện thoại pin lớn 7 triệu" }
  // Or return final answer: { "type":"answer","text":"..." }
  static async processMessageWithTools(message, maxTurns = 2) {
    try {
      if (!message || typeof message !== "string") {
        throw new AppError("Tin nhắn không hợp lệ", 400);
      }

      const systemInstr = `Bạn là trợ lý bán hàng sử dụng dữ liệu từ database. Khi cần tìm sản phẩm trong DB, trả về \nONLY JSON\n với cấu trúc:\n- {"type":"search","query":"<từ khoá tìm kiếm>"} để yêu cầu hệ thống chạy truy vấn DB.\n- Hoặc {"type":"answer","text":"<câu trả lời cho khách>"} nếu đã có câu trả lời.\nKhông xuất thêm text nào khác ngoài JSON.`;

      const callModel = async (inputPrompt) => {
        const resp = await openai.responses.create({
          model: "gpt-4o-mini",
          input: inputPrompt,
        });
        const text =
          resp.output_text ||
          (Array.isArray(resp.output)
            ? resp.output
                .map((item) =>
                  Array.isArray(item.content)
                    ? item.content.map((c) => c.text || "").join("")
                    : "",
                )
                .join("")
            : "");
        return text.trim();
      };

      const extractJSON = (txt) => {
        const match = txt.match(/\{[\s\S]*\}/);
        if (!match) return null;
        try {
          return JSON.parse(match[0]);
        } catch (e) {
          return null;
        }
      };

      // First turn: ask model what to do
      let userPrompt = `${systemInstr}\nKhách hỏi: ${message}`;
      for (let turn = 0; turn < maxTurns; turn++) {
        const modelText = await callModel(userPrompt);
        const parsed = extractJSON(modelText);
        if (!parsed) {
          // If model didn't return JSON, treat the raw text as answer
          return modelText;
        }

        if (parsed.type === "answer" && parsed.text) {
          return parsed.text;
        }

        if (parsed.type === "search" && parsed.query) {
          // Run DB search and provide results back to model
          const { products, intent } = await ChatService.searchProducts(
            parsed.query,
          );
          const context = ChatService.buildContext(products, intent);
          userPrompt = `${systemInstr}\nKết quả tìm kiếm (dữ liệu DB):\n${context}\nKhách hỏi: ${message}\nYêu cầu trước: ${JSON.stringify(parsed)}\nBây giờ hãy trả về JSON cuối cùng {"type":"answer","text":"..."}`;
          continue;
        }

        // Unknown type: return raw
        return modelText;
      }

      throw new AppError(
        "Không thể xử lý hội thoại tương tác. Thử lại sau.",
        500,
      );
    } catch (error) {
      console.error("ChatService interactive error:", error);
      throw new AppError(
        "Không thể xử lý tin nhắn tương tác. Thử lại sau.",
        500,
      );
    }
  }
}

module.exports = ChatService;
