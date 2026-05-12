import bcrypt from "bcryptjs";
import crypto from "crypto";
import express from "express";
import fs from "fs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import Auction from "../models/Auction.js";
import Bid from "../models/Bid.js";
import Order from "../models/Order.js";
import Payment from "../models/Payment.js";
import Product from "../models/Product.js";
import Report from "../models/Report.js";
import Shipment from "../models/Shipment.js";
import User from "../models/User.js";
import { getIO } from "../socket.js";

const router = express.Router();

// ─── File upload (multer) setup ────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "../../../uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("อัปโหลดได้เฉพาะไฟล์รูปภาพเท่านั้น"));
    }
    cb(null, true);
  },
});

const serverNow = () => new Date();

// OTP in-memory stores (dev only — replace with email service in production)
const otpStore   = new Map(); // email → { otp, expiresAt }
const resetStore = new Map(); // email → { otp, expiresAt }
const OTP_TTL    = 10 * 60 * 1000; // 10 นาที
const genOtp     = () => String(Math.floor(100000 + Math.random() * 900000));
const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || "dev-webhook-secret";
const jwtSecret = process.env.JWT_SECRET || "dev-jwt-secret";
const authCookieName = "auction_token";
const csrfCookieName = "auction_csrf";

const issueToken = (user) => jwt.sign({ sub: String(user._id), role: user.role }, jwtSecret, { expiresIn: "7d" });
const issueCsrfToken = () => crypto.randomBytes(32).toString("hex");

const authCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const csrfCookieOptions = {
  httpOnly: false,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const parseCookies = (cookieHeader = "") =>
  Object.fromEntries(
    cookieHeader
      .split(";")
      .map((pair) => pair.trim())
      .filter(Boolean)
      .map((pair) => {
        const idx = pair.indexOf("=");
        if (idx === -1) return [pair, ""];
        return [pair.slice(0, idx), decodeURIComponent(pair.slice(idx + 1))];
      })
  );

const compareSignature = (provided = "", expected = "") => {
  const a = Buffer.from(String(provided));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

const resolveUser = async (req) => {
  let token = null;

  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) token = auth.slice(7);

  if (!token) {
    const cookies = parseCookies(req.headers.cookie || "");
    token = cookies[authCookieName] || null;
  }

  if (token) {
    try {
      const payload = jwt.verify(token, jwtSecret);
      if (payload?.sub && mongoose.isValidObjectId(payload.sub)) {
        const byToken = await User.findById(payload.sub);
        if (byToken) return byToken;
      }
    } catch {
      return null;
    }
  }

  if (process.env.ALLOW_DEV_USER_HEADER === "true") {
    const headerId = req.headers["x-user-id"];
    if (headerId && mongoose.isValidObjectId(headerId)) {
      const byId = await User.findById(headerId);
      if (byId) return byId;
    }
  }

  return null;
};

const requireAuth = async (req, res, next) => {
  const user = await resolveUser(req);
  if (!user) return res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อนใช้งาน" });
  req.user = user;
  next();
};

const requireAdmin = async (req, res, next) => {
  const user = await resolveUser(req);
  if (!user || user.role !== "ADMIN") return res.status(403).json({ error: "หน้านี้สำหรับผู้ดูแลระบบเท่านั้น" });
  req.user = user;
  next();
};

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const csrfExempt = new Set([
  "/auth/register",
  "/auth/login",
  "/auth/oauth",
  "/auth/logout",
  "/auth/verify-email",
  "/auth/csrf",
  "/auth/send-otp",
  "/auth/verify-otp",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/payments/webhook",
]);

const requireCsrf = (req, res, next) => {
  if (!["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) return next();
  if (csrfExempt.has(req.path)) return next();

  const cookies = parseCookies(req.headers.cookie || "");
  const cookieToken = cookies[csrfCookieName];
  const headerToken = req.headers["x-csrf-token"];

  if (!cookieToken || !headerToken || !compareSignature(headerToken, cookieToken)) {
    return res.status(403).json({ error: "โทเคน CSRF ไม่ถูกต้อง" });
  }

  return next();
};

router.use(requireCsrf);

// POST /upload — อัปโหลดรูปสินค้า (ต้อง login, max 5 ไฟล์, 5MB/ไฟล์)
router.post("/upload", requireAuth, (req, res, next) => {
  upload.array("images", 5)(req, res, (err) => {
    if (err) {
      const msg =
        err.code === "LIMIT_FILE_SIZE" ? "ไฟล์ใหญ่เกิน 5MB" :
        err.code === "LIMIT_FILE_COUNT" ? "อัปโหลดได้สูงสุด 5 ไฟล์" :
        err.message || "อัปโหลดไม่สำเร็จ";
      return res.status(400).json({ error: msg });
    }
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ error: "ไม่พบไฟล์รูปภาพ" });
    const base = `${req.protocol}://${req.get("host")}`;
    const urls = req.files.map((f) => `${base}/uploads/${f.filename}`);
    res.json({ urls });
  });
});


// --- Helpers ---

const calcMinNextBid = (currentBid) => {
  const increment = Math.max(100, Math.floor(currentBid * 0.02));
  return currentBid + increment;
};

const autoUpdateAuctionStatus = async (auction) => {
  const now = serverNow();
  let changed = false;

  if (auction.status === "SCHEDULED" && now >= new Date(auction.startAt)) {
    auction.status = "LIVE";
    changed = true;
  }

  if (["SCHEDULED", "LIVE"].includes(auction.status) && now >= new Date(auction.endAt)) {
    auction.status = "ENDED";
    changed = true;

    const topBid = await Bid.findOne({ auctionId: auction._id }).sort({ amount: -1, createdAt: 1 });
    if (topBid && !auction.winnerId) {
      auction.winnerId = topBid.userId;
      await Order.updateOne(
        { auctionId: auction._id },
        { $setOnInsert: { buyerId: topBid.userId, amount: topBid.amount, status: "PENDING" } },
        { upsert: true }
      );
    }
  }

  if (changed) await auction.save();
  return auction;
};

// --- Health ---

router.get("/health", (req, res) => {
  res.json({ status: "ระบบ backend สำหรับประมูลกำลังทำงานอยู่", serverTime: serverNow().toISOString() });
});

// --- Auth ---

router.get("/auth/csrf", (req, res) => {
  const token = issueCsrfToken();
  res.cookie(csrfCookieName, token, csrfCookieOptions);
  res.json({ csrfToken: token });
});

router.post("/auth/register", async (req, res) => {
  const { firstName, lastName, phone, email, password } = req.body;
  const name = `${String(firstName || "").trim()} ${String(lastName || "").trim()}`.trim();
  if (!firstName || !lastName || !email || !password)
    return res.status(400).json({ error: "กรุณากรอกชื่อ นามสกุล อีเมล และรหัสผ่านให้ครบ" });
  if (password.length < 6)
    return res.status(400).json({ error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" });

  const exists = await User.exists({ email });
  if (exists) return res.status(409).json({ error: "อีเมลนี้ถูกใช้งานแล้ว" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, phone: phone || "", passwordHash, role: "USER", verified: false, provider: "local" });

  const otp = genOtp();
  otpStore.set(email, { otp, expiresAt: Date.now() + OTP_TTL });
  console.log(`[OTP verify] ${email} → ${otp}`);

  res.status(201).json({
    message: "สมัครสมาชิกสำเร็จ กรุณายืนยันอีเมล",
    email,
    devOtp: process.env.NODE_ENV !== "production" ? otp : undefined,
  });
});

router.post("/auth/send-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "กรุณาระบุอีเมล" });
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: "ไม่พบบัญชีที่ใช้อีเมลนี้" });

  const otp = genOtp();
  otpStore.set(email, { otp, expiresAt: Date.now() + OTP_TTL });
  console.log(`[OTP resend] ${email} → ${otp}`);
  res.json({ sent: true, devOtp: process.env.NODE_ENV !== "production" ? otp : undefined });
});

router.post("/auth/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore.get(email);
  if (!record || String(record.otp) !== String(otp) || Date.now() > record.expiresAt)
    return res.status(400).json({ error: "รหัส OTP ไม่ถูกต้องหรือหมดอายุแล้ว" });

  otpStore.delete(email);
  const user = await User.findOneAndUpdate({ email }, { verified: true }, { new: true });
  if (!user) return res.status(404).json({ error: "ไม่พบบัญชีนี้" });

  const token = issueToken(user);
  const csrfToken = issueCsrfToken();
  res.cookie(authCookieName, token, authCookieOptions);
  res.cookie(csrfCookieName, csrfToken, csrfCookieOptions);
  res.json({ message: "ยืนยันอีเมลสำเร็จ", token, csrfToken, user });
});

router.post("/auth/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "กรุณาระบุอีเมล" });
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: "ไม่พบบัญชีที่ใช้อีเมลนี้" });

  const otp = genOtp();
  resetStore.set(email, { otp, expiresAt: Date.now() + OTP_TTL });
  console.log(`[RESET OTP] ${email} → ${otp}`);
  res.json({ sent: true, devOtp: process.env.NODE_ENV !== "production" ? otp : undefined });
});

router.post("/auth/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const record = resetStore.get(email);
  if (!record || String(record.otp) !== String(otp) || Date.now() > record.expiresAt)
    return res.status(400).json({ error: "รหัส OTP ไม่ถูกต้องหรือหมดอายุแล้ว" });
  if (!newPassword || newPassword.length < 6)
    return res.status(400).json({ error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" });

  resetStore.delete(email);
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await User.findOneAndUpdate({ email }, { passwordHash });
  res.json({ message: "รีเซ็ตรหัสผ่านสำเร็จ" });
});

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: "ไม่พบบัญชีผู้ใช้นี้" });

  const ok = user.passwordHash ? await bcrypt.compare(password || "", user.passwordHash) : false;
  if (!ok) return res.status(401).json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });

  const token = issueToken(user);
  const csrfToken = issueCsrfToken();
  res.cookie(authCookieName, token, authCookieOptions);
  res.cookie(csrfCookieName, csrfToken, csrfCookieOptions);
  res.json({ token, csrfToken, user });
});

router.post("/auth/logout", (req, res) => {
  res.clearCookie(authCookieName, { ...authCookieOptions, maxAge: undefined });
  res.clearCookie(csrfCookieName, { ...csrfCookieOptions, maxAge: undefined });
  res.json({ message: "ออกจากระบบสำเร็จ" });
});

router.post("/auth/verify-email", async (req, res) => {
  const { email } = req.body;
  const user = await User.findOneAndUpdate({ email }, { verified: true }, { new: true });
  if (!user) return res.status(404).json({ error: "ไม่พบบัญชีผู้ใช้นี้" });
  res.json({ message: "ยืนยันอีเมลสำเร็จ", user });
});

router.post("/auth/oauth", async (req, res) => {
  const { provider, email, name } = req.body;
  if (!["google", "facebook"].includes(provider)) {
    return res.status(400).json({ error: "ยังไม่รองรับผู้ให้บริการนี้" });
  }

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({ name, email, role: "USER", verified: true, provider });
  }
  const token = issueToken(user);
  const csrfToken = issueCsrfToken();
  res.cookie(authCookieName, token, authCookieOptions);
  res.cookie(csrfCookieName, csrfToken, csrfCookieOptions);
  res.json({ token, csrfToken, user });
});

// --- Users ---

router.get("/users/me", requireAuth, async (req, res) => {
  const user = req.user;
  const [bidHistory, wins] = await Promise.all([
    Bid.find({ userId: user._id }).sort({ createdAt: -1 }).limit(20).lean(),
    Auction.find({ winnerId: user._id }).sort({ endAt: -1 }).lean(),
  ]);

  // Enrich wins with product title
  const enrichedWins = await Promise.all(
    wins.map(async (w) => {
      const product = await Product.findById(w.productId).lean();
      return { ...w, id: w._id, product: product ? { id: product._id, title: product.title, images: product.images } : null };
    })
  );

  // Enrich bid history with auction product title
  const enrichedBids = await Promise.all(
    bidHistory.map(async (b) => {
      const auction = await Auction.findById(b.auctionId).lean();
      const product = auction ? await Product.findById(auction.productId).lean() : null;
      return { ...b, id: b._id, productTitle: product?.title || null };
    })
  );

  res.json({
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    address: user.address || "",
    role: user.role,
    verified: user.verified,
    provider: user.provider,
    createdAt: user.createdAt,
    bidHistory: enrichedBids,
    wins: enrichedWins,
  });
});

router.patch("/users/me", requireAuth, async (req, res) => {
  const user = req.user;
  if (req.body.name !== undefined) user.name = String(req.body.name).trim() || user.name;
  if (req.body.phone !== undefined) user.phone = String(req.body.phone).trim();
  if (req.body.address !== undefined) user.address = String(req.body.address).trim();
  await user.save();
  res.json({ id: user._id, name: user.name, email: user.email, phone: user.phone, address: user.address, role: user.role });
});

router.post("/users/me/change-password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res.status(400).json({ error: "กรุณากรอกรหัสผ่านให้ครบ" });
  if (newPassword.length < 6)
    return res.status(400).json({ error: "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร" });

  const user = await User.findById(req.user._id);
  if (!user.passwordHash)
    return res.status(400).json({ error: "บัญชีนี้ไม่ได้ใช้รหัสผ่าน (เข้าสู่ระบบด้วย OAuth)" });

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return res.status(400).json({ error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" });

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
  res.json({ message: "เปลี่ยนรหัสผ่านสำเร็จ" });
});

// --- Products ---

router.get("/products", async (req, res) => {
  const { status, q } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (q) filter.title = { $regex: String(q), $options: "i" };

  const products = await Product.find(filter).sort({ createdAt: -1 }).lean();
  res.json(products.map((p) => ({ ...p, id: p._id })));
});

router.post("/products", requireAuth, async (req, res) => {
  const { title, description, images, startPrice } = req.body;
  const product = await Product.create({
    sellerId: req.user._id,
    title,
    description,
    images: images || [],
    startPrice: Number(startPrice || 0),
    status: "PENDING",
  });

  res.status(201).json({ ...product.toObject(), id: product._id });
});

router.post("/moderation/products/:id", requireAdmin, async (req, res) => {
  const action = String(req.body.action || "").trim().toLowerCase();
  if (!["approve", "reject"].includes(action)) {
    return res.status(400).json({ error: "action ต้องเป็น approve หรือ reject" });
  }
  const status = action === "approve" ? "APPROVED" : "REJECTED";
  const product = await Product.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!product) return res.status(404).json({ error: "ไม่พบรายการสินค้านี้" });

  if (action === "approve") {
    const existingAuction = await Auction.findOne({ productId: product._id });
    if (!existingAuction) {
      const startAt = serverNow();
      const endAt = new Date(startAt.getTime() + 7 * 24 * 60 * 60 * 1000);
      await Auction.create({
        productId: product._id,
        startAt,
        endAt,
        currentBid: product.startPrice,
        status: "LIVE",
      });
    }
  }

  res.json({ ...product.toObject(), id: product._id });
});

// --- Auctions ---

router.get("/auctions", async (req, res) => {
  const now = serverNow();

  // Auto-update statuses in bulk (fire-and-forget, ignore errors)
  Promise.all([
    Auction.updateMany({ status: "SCHEDULED", startAt: { $lte: now } }, { $set: { status: "LIVE" } }),
    Auction.updateMany({ status: { $in: ["SCHEDULED", "LIVE"] }, endAt: { $lte: now } }, { $set: { status: "ENDED" } }),
  ]).catch(() => {});

  const { q, status, sort = "latest", page = "1", limit = "9", minPrice, maxPrice } = req.query;

  // Build product filter for text search
  let productIdFilter = null;
  if (q) {
    const matchedProducts = await Product.find({ title: { $regex: String(q), $options: "i" } })
      .select("_id")
      .lean();
    productIdFilter = matchedProducts.map((p) => p._id);
  }

  // Build auction filter
  const auctionFilter = {};
  if (productIdFilter !== null) auctionFilter.productId = { $in: productIdFilter };
  if (status && status !== "ALL" && ["LIVE", "SCHEDULED", "ENDED"].includes(status)) {
    auctionFilter.status = status;
  }
  if (minPrice) {
    const min = Number(minPrice);
    if (!Number.isNaN(min)) auctionFilter.currentBid = { ...auctionFilter.currentBid, $gte: min };
  }
  if (maxPrice) {
    const max = Number(maxPrice);
    if (!Number.isNaN(max)) auctionFilter.currentBid = { ...auctionFilter.currentBid, $lte: max };
  }

  // Sort
  const sortMap = {
    latest: { createdAt: -1 },
    ending: { endAt: 1 },
    price_desc: { currentBid: -1 },
    price_asc: { currentBid: 1 },
  };
  const sortQuery = sortMap[sort] || { createdAt: -1 };

  // Pagination
  const pageNum = toPositiveInt(page, 1);
  const limitNum = clamp(toPositiveInt(limit, 9), 1, 50);

  const total = await Auction.countDocuments(auctionFilter);
  const totalPages = Math.max(1, Math.ceil(total / limitNum));
  const safePage = Math.min(Math.max(pageNum, 1), totalPages);
  const skip = (safePage - 1) * limitNum;

  const auctions = await Auction.find(auctionFilter).sort(sortQuery).skip(skip).limit(limitNum).lean();

  // Load products
  const productIds = auctions.map((a) => a.productId);
  const products = await Product.find({ _id: { $in: productIds } }).lean();
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  // Get bid counts in one aggregate
  const bidCounts = await Bid.aggregate([
    { $match: { auctionId: { $in: auctions.map((a) => a._id) } } },
    { $group: { _id: "$auctionId", count: { $sum: 1 } } },
  ]);
  const bidCountMap = new Map(bidCounts.map((b) => [String(b._id), b.count]));

  const items = auctions.map((a) => {
    const product = productMap.get(String(a.productId));
    return {
      ...a,
      id: a._id,
      product: product ? { ...product, id: product._id } : null,
      bidCount: bidCountMap.get(String(a._id)) || 0,
      minNextBid: calcMinNextBid(a.currentBid),
      serverNow: now.toISOString(),
    };
  });

  res.json({
    items,
    pagination: {
      page: safePage,
      limit: limitNum,
      total,
      totalPages,
      hasPrev: safePage > 1,
      hasNext: safePage < totalPages,
    },
  });
});

router.post("/auctions", requireAdmin, async (req, res) => {
  const { productId, startAt, endAt } = req.body;
  const product = await Product.findOne({ _id: productId, status: "APPROVED" });
  if (!product) return res.status(400).json({ error: "สินค้านี้ยังไม่ได้รับการอนุมัติ" });

  const auction = await Auction.create({ productId, startAt, endAt, currentBid: product.startPrice, status: "SCHEDULED" });
  res.status(201).json({ ...auction.toObject(), id: auction._id });
});

router.get("/auctions/:id", async (req, res) => {
  const auction = await Auction.findById(req.params.id);
  if (!auction) return res.status(404).json({ error: "ไม่พบรายการประมูลนี้" });

  await autoUpdateAuctionStatus(auction);

  const product = await Product.findById(auction.productId).lean();
  const bids = await Bid.find({ auctionId: auction._id }).sort({ createdAt: -1 }).lean();

  const auctionObj = auction.toObject();
  res.json({
    ...auctionObj,
    id: auction._id,
    product: product ? { ...product, id: product._id } : null,
    bids: bids.map((b) => ({ ...b, id: b._id })),
    bidCount: bids.length,
    minNextBid: calcMinNextBid(auction.currentBid),
    serverNow: serverNow().toISOString(),
  });
});

router.post("/auctions/:id/bid", requireAuth, async (req, res) => {
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: "จำนวนเงินที่วางราคาไม่ถูกต้อง" });

  const session = await mongoose.startSession();
  try {
    let response = { status: 500, body: { error: "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ" } };
    let bidEvent = null;

    await session.withTransaction(async () => {
      const auction = await Auction.findById(req.params.id).session(session);
      if (!auction) {
        response = { status: 404, body: { error: "ไม่พบรายการประมูลนี้" } };
        return;
      }

      if (serverNow() > auction.endAt || auction.status === "ENDED") {
        response = { status: 400, body: { error: "รายการประมูลนี้สิ้นสุดแล้ว" } };
        return;
      }

      if (amount <= auction.currentBid) {
        response = {
          status: 400,
          body: { error: `ราคาที่เสนอต้องมากกว่า ${auction.currentBid.toLocaleString("th-TH")} บาท` },
        };
        return;
      }

      const [bid] = await Bid.create([{ auctionId: auction._id, userId: req.user._id, amount }], { session });
      auction.currentBid = amount;
      auction.status = "LIVE";
      await auction.save({ session });

      bidEvent = {
        auctionId: String(auction._id),
        currentBid: auction.currentBid,
        minNextBid: calcMinNextBid(auction.currentBid),
        bid: {
          id: String(bid._id),
          amount: bid.amount,
          userId: String(bid.userId),
          createdAt: bid.createdAt,
        },
      };

      response = {
        status: 201,
        body: {
          message: "วางราคาประมูลสำเร็จ",
          bid: { ...bid.toObject(), id: bid._id },
          currentBid: auction.currentBid,
          minNextBid: calcMinNextBid(auction.currentBid),
        },
      };
    });

    // Emit real-time update to all watchers of this auction
    if (bidEvent) {
      const io = getIO();
      if (io) io.to(`auction:${bidEvent.auctionId}`).emit("bid_placed", bidEvent);
    }

    res.status(response.status).json(response.body);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.endSession();
  }
});

// --- System ---

router.post("/system/close-auctions", requireAdmin, async (req, res) => {
  const auctions = await Auction.find({ status: { $ne: "ENDED" }, endAt: { $lte: serverNow() } });
  const closedAuctions = [];

  for (const auction of auctions) {
    const topBid = await Bid.findOne({ auctionId: auction._id }).sort({ amount: -1, createdAt: 1 });
    auction.status = "ENDED";
    auction.winnerId = topBid?.userId || null;
    await auction.save();

    if (topBid) {
      await Order.updateOne(
        { auctionId: auction._id },
        { $setOnInsert: { buyerId: topBid.userId, amount: topBid.amount, status: "PENDING" } },
        { upsert: true }
      );
    }

    closedAuctions.push(String(auction._id));
  }

  res.json({ message: "ปิดการประมูลที่หมดเวลาเรียบร้อย", closedAuctions });
});

// --- Orders ---

router.get("/orders", requireAuth, async (req, res) => {
  const filter = req.user.role === "ADMIN" ? {} : { buyerId: req.user._id };
  const orders = await Order.find(filter).sort({ createdAt: -1 }).lean();

  const enriched = await Promise.all(
    orders.map(async (o) => {
      const auction = await Auction.findById(o.auctionId).lean();
      const product = auction ? await Product.findById(auction.productId).lean() : null;
      const shipment = await Shipment.findOne({ orderId: o._id }).lean();
      return {
        ...o,
        id: o._id,
        product: product ? { ...product, id: product._id } : null,
        auction: auction ? { ...auction, id: auction._id } : null,
        shipment: shipment ? { ...shipment, id: shipment._id } : null,
      };
    })
  );

  res.json(enriched);
});

router.get("/orders/:id", requireAuth, async (req, res) => {
  const order = await Order.findById(req.params.id).lean();
  if (!order) return res.status(404).json({ error: "ไม่พบคำสั่งซื้อนี้" });

  if (req.user.role !== "ADMIN" && String(order.buyerId) !== String(req.user._id))
    return res.status(403).json({ error: "คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้" });

  const auction = await Auction.findById(order.auctionId).lean();
  const product = auction ? await Product.findById(auction.productId).lean() : null;
  const shipment = await Shipment.findOne({ orderId: order._id }).lean();
  const payment = await Payment.findOne({ orderId: order._id }).sort({ createdAt: -1 }).lean();

  res.json({
    ...order,
    id: order._id,
    product: product ? { ...product, id: product._id } : null,
    auction: auction ? { ...auction, id: auction._id } : null,
    shipment: shipment ? { ...shipment, id: shipment._id } : null,
    payment: payment ? { ...payment, id: payment._id } : null,
  });
});

// --- Payments ---

router.post("/payments/checkout", requireAuth, async (req, res) => {
  const { orderId, provider = "stripe" } = req.body;
  const order = await Order.findById(orderId);
  if (!order) return res.status(404).json({ error: "ไม่พบคำสั่งซื้อนี้" });

  if (req.user.role !== "ADMIN" && String(order.buyerId) !== String(req.user._id)) {
    return res.status(403).json({ error: "คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้" });
  }

  const payment = await Payment.create({ orderId: order._id, provider, amount: order.amount, status: "PENDING" });
  res.status(201).json({ checkoutId: String(payment._id), payment: { ...payment.toObject(), id: payment._id } });
});

// User-driven payment confirmation (mock-friendly: no HMAC signature required).
// Marks the user's own pending payment as PAID and the order as PAID.
router.post("/payments/:checkoutId/confirm", requireAuth, async (req, res) => {
  const payment = await Payment.findById(req.params.checkoutId);
  if (!payment) return res.status(404).json({ error: "ไม่พบรายการชำระเงินนี้" });

  const order = await Order.findById(payment.orderId);
  if (!order) return res.status(404).json({ error: "ไม่พบคำสั่งซื้อนี้" });

  if (req.user.role !== "ADMIN" && String(order.buyerId) !== String(req.user._id)) {
    return res.status(403).json({ error: "คุณไม่มีสิทธิ์ชำระเงินรายการนี้" });
  }

  if (payment.status !== "PAID") {
    payment.status = "PAID";
    payment.providerRef = payment.providerRef || `mock_${Date.now()}_${payment._id}`;
    await payment.save();
  }

  if (order.status === "PENDING") {
    order.status = "PAID";
    await order.save();
  }

  res.json({
    message: "ชำระเงินสำเร็จ",
    payment: { ...payment.toObject(), id: payment._id },
    order: { ...order.toObject(), id: order._id },
  });
});

router.post("/payments/webhook", async (req, res) => {
  const signature = req.headers["x-webhook-signature"];
  const eventId = req.headers["x-event-id"] || req.body.eventId;
  const raw = `${req.body.checkoutId}:${req.body.event}`;
  const expected = crypto.createHmac("sha256", webhookSecret).update(raw).digest("hex");

  if (!compareSignature(signature, expected)) {
    return res.status(401).json({ error: "ลายเซ็น webhook ไม่ถูกต้อง" });
  }

  if (!eventId) return res.status(400).json({ error: "ไม่พบ event id" });

  const payment = await Payment.findById(req.body.checkoutId);
  if (!payment) return res.status(404).json({ error: "ไม่พบรายการชำระเงินนี้" });

  const duplicated = await Payment.exists({ providerRef: String(eventId) });
  if (duplicated) return res.json({ received: true, duplicate: true });

  payment.providerRef = String(eventId);
  if (req.body.event === "payment.succeeded") {
    payment.status = "PAID";
    await Order.findByIdAndUpdate(payment.orderId, { status: "PAID" });
  }

  await payment.save();
  res.json({ received: true, payment: { ...payment.toObject(), id: payment._id } });
});

// --- Shipping ---

router.post("/shipping", requireAdmin, async (req, res) => {
  const { orderId, trackingNumber } = req.body;
  const order = await Order.findById(orderId);
  if (!order) return res.status(404).json({ error: "ไม่พบคำสั่งซื้อนี้" });

  order.status = "SHIPPED";
  await order.save();

  const shipment = await Shipment.findOneAndUpdate(
    { orderId: order._id },
    { trackingNumber, status: "IN_TRANSIT" },
    { upsert: true, new: true }
  );

  res.status(201).json({ ...shipment.toObject(), id: shipment._id });
});

// Public tracking: search by orderId or tracking number (no auth required)
router.get("/tracking/:query", async (req, res) => {
  const q = String(req.params.query || "").trim();
  let shipment = null;
  let order = null;

  // Try as MongoDB ObjectId (orderId)
  if (/^[a-f\d]{24}$/i.test(q)) {
    shipment = await Shipment.findOne({ orderId: q }).lean();
    if (shipment) order = await Order.findById(shipment.orderId).lean();
  }

  // Try by tracking number
  if (!shipment) {
    shipment = await Shipment.findOne({ trackingNumber: q }).lean();
    if (shipment) order = await Order.findById(shipment.orderId).lean();
  }

  if (!shipment) return res.status(404).json({ error: "ไม่พบข้อมูลการจัดส่ง กรุณาตรวจสอบรหัสคำสั่งซื้อหรือเลขพัสดุอีกครั้ง" });

  const auction = order ? await Auction.findById(order.auctionId).lean() : null;
  const product = auction ? await Product.findById(auction.productId).lean() : null;

  res.json({
    shipment: { ...shipment, id: shipment._id },
    order: order ? { ...order, id: order._id } : null,
    product: product ? { id: product._id, title: product.title, images: product.images } : null,
  });
});

router.put("/shipping/:orderId", requireAdmin, async (req, res) => {
  const { status, trackingNumber } = req.body;
  if (!["IN_TRANSIT", "DELIVERED"].includes(status))
    return res.status(400).json({ error: "สถานะไม่ถูกต้อง" });

  const update = { status };
  if (trackingNumber) update.trackingNumber = trackingNumber;

  const shipment = await Shipment.findOneAndUpdate({ orderId: req.params.orderId }, update, { new: true });
  if (!shipment) return res.status(404).json({ error: "ไม่พบข้อมูลการจัดส่ง" });

  if (status === "DELIVERED") {
    await Order.findByIdAndUpdate(req.params.orderId, { status: "DELIVERED" });
  }

  res.json({ ...shipment.toObject(), id: shipment._id });
});

router.get("/shipping/:orderId", requireAuth, async (req, res) => {
  const shipment = await Shipment.findOne({ orderId: req.params.orderId }).lean();
  if (!shipment) return res.status(404).json({ error: "ไม่พบข้อมูลการจัดส่ง" });

  if (req.user.role !== "ADMIN") {
    const order = await Order.findById(req.params.orderId).lean();
    if (!order || String(order.buyerId) !== String(req.user._id)) {
      return res.status(403).json({ error: "คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้" });
    }
  }

  res.json({ ...shipment, id: shipment._id });
});

// --- Reports ---

router.post("/reports", requireAuth, async (req, res) => {
  const report = await Report.create({
    userId: req.user._id,
    targetType: req.body.targetType,
    targetId: req.body.targetId,
    reason: req.body.reason,
  });

  res.status(201).json({ ...report.toObject(), id: report._id });
});

// --- Admin ---

router.get("/admin/orders", requireAdmin, async (req, res) => {
  const status = String(req.query.status || "ALL").trim().toUpperCase();
  const page = toPositiveInt(req.query.page, 1);
  const limit = clamp(toPositiveInt(req.query.limit, 15), 1, 50);

  const filter = {};
  if (status !== "ALL" && ["PENDING", "PAID", "SHIPPED", "DELIVERED"].includes(status))
    filter.status = status;

  const total = await Order.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const skip = (safePage - 1) * limit;

  const orders = await Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();

  const enriched = await Promise.all(
    orders.map(async (o) => {
      const auction = await Auction.findById(o.auctionId).lean();
      const product = auction ? await Product.findById(auction.productId).lean() : null;
      const shipment = await Shipment.findOne({ orderId: o._id }).lean();
      const buyer = await User.findById(o.buyerId).select("name email").lean();
      return {
        ...o,
        id: o._id,
        product: product ? { id: product._id, title: product.title, images: product.images } : null,
        shipment: shipment ? { ...shipment, id: shipment._id } : null,
        buyer: buyer ? { id: buyer._id, name: buyer.name, email: buyer.email } : null,
      };
    })
  );

  res.json({
    items: enriched,
    pagination: { page: safePage, limit, total, totalPages, hasPrev: safePage > 1, hasNext: safePage < totalPages },
  });
});

router.get("/admin/overview", requireAdmin, async (req, res) => {
  const [
    totalUsers,
    totalOrders,
    totalReports,
    pendingProducts,
    liveAuctions,
    totalAuctions,
    paidOrders,
    shippedOrders,
    pendingPayments,
    recentOrders,
    revenue,
  ] = await Promise.all([
    User.countDocuments(),
    Order.countDocuments(),
    Report.countDocuments(),
    Product.find({ status: "PENDING" }).sort({ createdAt: -1 }).limit(5).lean(),
    Auction.countDocuments({ status: "LIVE" }),
    Auction.countDocuments(),
    Order.countDocuments({ status: "PAID" }),
    Order.countDocuments({ status: "SHIPPED" }),
    Payment.countDocuments({ status: "AWAITING_VERIFICATION" }),
    Order.find({ status: { $in: ["PAID", "SHIPPED", "DELIVERED"] } })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    Order.aggregate([
      { $match: { status: { $in: ["PAID", "SHIPPED", "DELIVERED"] } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  // Enrich recent orders with product title
  const enrichedOrders = await Promise.all(
    recentOrders.map(async (o) => {
      const auction = await Auction.findById(o.auctionId).lean();
      const product = auction ? await Product.findById(auction.productId).lean() : null;
      const buyer = await User.findById(o.buyerId).select("name").lean();
      return {
        id: o._id,
        status: o.status,
        amount: o.amount,
        createdAt: o.createdAt,
        productTitle: product?.title || "ไม่ทราบสินค้า",
        buyerName: buyer?.name || "-",
      };
    })
  );

  res.json({
    stats: {
      totalUsers,
      totalOrders,
      totalReports,
      pendingProducts: pendingProducts.length,
      liveAuctions,
      totalAuctions,
      paidOrders,
      shippedOrders,
      pendingPayments,
      totalRevenue: revenue[0]?.total || 0,
    },
    pendingProducts: pendingProducts.map((p) => ({ ...p, id: p._id })),
    recentOrders: enrichedOrders,
  });
});

router.get("/admin/products", requireAdmin, async (req, res) => {
  const q = String(req.query.q || "").trim();
  const status = String(req.query.status || "ALL").trim().toUpperCase();
  const sort = String(req.query.sort || "latest").trim();
  const page = toPositiveInt(req.query.page, 1);
  const limit = clamp(toPositiveInt(req.query.limit, 10), 1, 50);

  const filter = {};
  if (q) filter.title = { $regex: q, $options: "i" };
  if (status !== "ALL" && ["PENDING", "APPROVED", "REJECTED"].includes(status)) {
    filter.status = status;
  }

  let sortQuery = { createdAt: -1 };
  if (sort === "oldest") sortQuery = { createdAt: 1 };
  if (sort === "price_desc") sortQuery = { startPrice: -1 };
  if (sort === "price_asc") sortQuery = { startPrice: 1 };
  if (sort === "title_asc") sortQuery = { title: 1 };
  if (sort === "title_desc") sortQuery = { title: -1 };

  const total = await Product.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const skip = (safePage - 1) * limit;

  const items = await Product.find(filter).sort(sortQuery).skip(skip).limit(limit).lean();

  res.json({
    items: items.map((p) => ({ ...p, id: p._id })),
    pagination: {
      page: safePage,
      limit,
      total,
      totalPages,
      hasPrev: safePage > 1,
      hasNext: safePage < totalPages,
    },
  });
});

// --- Seller Dashboard ---

router.get("/seller/dashboard", requireAuth, async (req, res) => {
  const page = toPositiveInt(req.query.page, 1);
  const limit = clamp(toPositiveInt(req.query.limit, 10), 1, 50);

  const products = await Product.find({ sellerId: req.user._id }).sort({ createdAt: -1 }).lean();
  const productIds = products.map((p) => p._id);
  const auctions = await Auction.find({ productId: { $in: productIds } }).lean();

  const approvedIds = products.filter((p) => p.status === "APPROVED").map((p) => String(p._id));
  const soldAuctions = auctions.filter((a) => a.status === "ENDED" && a.winnerId);
  const grossRevenue = await Order.aggregate([
    { $match: { auctionId: { $in: soldAuctions.map((a) => a._id) }, status: { $in: ["PAID", "SHIPPED", "DELIVERED"] } } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  const total = products.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const skip = (safePage - 1) * limit;

  res.json({
    summary: {
      totalListings: total,
      liveAuctions: auctions.filter((a) => a.status === "LIVE").length,
      soldListings: soldAuctions.length,
      grossRevenue: grossRevenue[0]?.total || 0,
    },
    products: products.slice(skip, skip + limit).map((p) => ({ ...p, id: p._id })),
    auctions: auctions.map((a) => {
      const prod = products.find((p) => String(p._id) === String(a.productId));
      return { ...a, id: a._id, product: prod ? { ...prod, id: prod._id } : null };
    }),
    pagination: {
      page: safePage,
      limit,
      total,
      totalPages,
      hasPrev: safePage > 1,
      hasNext: safePage < totalPages,
    },
  });
});

// --- Mock Payment (ใช้สำหรับ dev — ไม่ต้องมี webhook signature) ---

router.post("/orders/:id/pay", requireAuth, async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: "ไม่พบคำสั่งซื้อ" });

  if (req.user.role !== "ADMIN" && String(order.buyerId) !== String(req.user._id))
    return res.status(403).json({ error: "คุณไม่มีสิทธิ์ชำระเงินรายการนี้" });

  if (order.status !== "PENDING")
    return res.status(400).json({ error: "คำสั่งซื้อนี้ไม่ได้อยู่ในสถานะรอชำระเงิน" });

  // Delete any previous FAILED payment for this order so user can retry
  await Payment.deleteMany({ orderId: order._id, status: "FAILED" });

  const { method = "bank", slipNote = "" } = req.body;
  const payment = await Payment.create({
    orderId: order._id,
    provider: method,
    amount: order.amount,
    status: "AWAITING_VERIFICATION",
    slipNote: String(slipNote).trim(),
    providerRef: `ref_${Date.now()}_${order._id}`,
  });

  order.status = "AWAITING_VERIFICATION";
  await order.save();

  res.json({
    message: "ส่งหลักฐานการชำระเงินแล้ว กรุณารอ Admin ตรวจสอบ",
    payment: { ...payment.toObject(), id: payment._id },
    order: { ...order.toObject(), id: order._id },
  });
});

// --- Admin Payments ---

router.get("/admin/payments", requireAdmin, async (req, res) => {
  const status = String(req.query.status || "AWAITING_VERIFICATION").toUpperCase();
  const page = toPositiveInt(req.query.page, 1);
  const limit = clamp(toPositiveInt(req.query.limit, 20), 1, 50);

  const filter = {};
  if (status !== "ALL" && ["PENDING", "AWAITING_VERIFICATION", "PAID", "FAILED"].includes(status))
    filter.status = status;

  const total = await Payment.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const skip = (safePage - 1) * limit;

  const payments = await Payment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();

  const enriched = await Promise.all(
    payments.map(async (p) => {
      const order = await Order.findById(p.orderId).lean();
      const auction = order ? await Auction.findById(order.auctionId).lean() : null;
      const product = auction ? await Product.findById(auction.productId).lean() : null;
      const buyer = order ? await User.findById(order.buyerId).select("name email phone").lean() : null;
      return {
        ...p,
        id: p._id,
        order: order ? { id: order._id, status: order.status, amount: order.amount } : null,
        product: product ? { id: product._id, title: product.title, images: product.images } : null,
        buyer: buyer ? { id: buyer._id, name: buyer.name, email: buyer.email, phone: buyer.phone } : null,
      };
    })
  );

  res.json({
    items: enriched,
    pagination: { page: safePage, limit, total, totalPages, hasPrev: safePage > 1, hasNext: safePage < totalPages },
  });
});

router.post("/admin/payments/:id/approve", requireAdmin, async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) return res.status(404).json({ error: "ไม่พบรายการชำระเงิน" });
  if (payment.status !== "AWAITING_VERIFICATION")
    return res.status(400).json({ error: "รายการนี้ไม่ได้รอการตรวจสอบ" });

  payment.status = "PAID";
  await payment.save();

  const order = await Order.findByIdAndUpdate(payment.orderId, { status: "PAID" }, { new: true });

  res.json({ message: "อนุมัติการชำระเงินสำเร็จ", payment: { ...payment.toObject(), id: payment._id }, order: order ? { ...order.toObject(), id: order._id } : null });
});

router.post("/admin/payments/:id/reject", requireAdmin, async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) return res.status(404).json({ error: "ไม่พบรายการชำระเงิน" });
  if (payment.status !== "AWAITING_VERIFICATION")
    return res.status(400).json({ error: "รายการนี้ไม่ได้รอการตรวจสอบ" });

  const reason = String(req.body.reason || "").trim();
  payment.status = "FAILED";
  payment.rejectedReason = reason;
  await payment.save();

  // Revert order to PENDING so buyer can try again
  await Order.findByIdAndUpdate(payment.orderId, { status: "PENDING" });

  res.json({ message: "ปฏิเสธการชำระเงินแล้ว ผู้ซื้อสามารถชำระใหม่ได้", payment: { ...payment.toObject(), id: payment._id } });
});

export default router;
