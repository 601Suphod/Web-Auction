import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import Auction from "../models/Auction.js";
import Bid from "../models/Bid.js";
import Order from "../models/Order.js";
import Payment from "../models/Payment.js";
import Product from "../models/Product.js";
import Shipment from "../models/Shipment.js";
import User from "../models/User.js";

const ids = {
  // Users
  user:   new mongoose.Types.ObjectId("111111111111111111111111"),
  admin:  new mongoose.Types.ObjectId("222222222222222222222222"),
  buyer1: new mongoose.Types.ObjectId("aaaaaaaaaaaaaaaaaaaaaaaa"),
  buyer2: new mongoose.Types.ObjectId("bbbbbbbbbbbbbbbbbbbbbbbb"),
  buyer3: new mongoose.Types.ObjectId("cccccccccccccccccccccc30"),
  buyer4: new mongoose.Types.ObjectId("cccccccccccccccccccccc40"),
  buyer5: new mongoose.Types.ObjectId("cccccccccccccccccccccc50"),
  // Products — APPROVED (มีการประมูล)
  p01: new mongoose.Types.ObjectId("333333333333333333333333"),
  p02: new mongoose.Types.ObjectId("444444444444444444444444"),
  p03: new mongoose.Types.ObjectId("cccccccccccccccccccccc03"),
  p04: new mongoose.Types.ObjectId("cccccccccccccccccccccc04"),
  p05: new mongoose.Types.ObjectId("cccccccccccccccccccccc05"),
  p06: new mongoose.Types.ObjectId("cccccccccccccccccccccc06"),
  p07: new mongoose.Types.ObjectId("cccccccccccccccccccccc07"),
  p08: new mongoose.Types.ObjectId("cccccccccccccccccccccc08"),
  p09: new mongoose.Types.ObjectId("cccccccccccccccccccccc09"),
  p13: new mongoose.Types.ObjectId("cccccccccccccccccccccc13"),
  // Products — สำหรับ ENDED auctions ใหม่
  p21: new mongoose.Types.ObjectId("cccccccccccccccccccccc21"),
  p22: new mongoose.Types.ObjectId("cccccccccccccccccccccc22"),
  p23: new mongoose.Types.ObjectId("cccccccccccccccccccccc23"),
  p24: new mongoose.Types.ObjectId("cccccccccccccccccccccc24"),
  p25: new mongoose.Types.ObjectId("cccccccccccccccccccccc25"),
  // Products — PENDING (รออนุมัติ)
  p14: new mongoose.Types.ObjectId("cccccccccccccccccccccc14"),
  p15: new mongoose.Types.ObjectId("cccccccccccccccccccccc15"),
  p16: new mongoose.Types.ObjectId("cccccccccccccccccccccc16"),
  p17: new mongoose.Types.ObjectId("cccccccccccccccccccccc17"),
  p18: new mongoose.Types.ObjectId("cccccccccccccccccccccc18"),
  p19: new mongoose.Types.ObjectId("cccccccccccccccccccccc19"),
  p20: new mongoose.Types.ObjectId("cccccccccccccccccccccc20"),
  // Products — REJECTED
  p12: new mongoose.Types.ObjectId("cccccccccccccccccccccc12"),
  // Auctions — เดิม
  a01: new mongoose.Types.ObjectId("555555555555555555555555"),
  a02: new mongoose.Types.ObjectId("dddddddddddddddddddddd02"),
  a03: new mongoose.Types.ObjectId("dddddddddddddddddddddd03"),
  a04: new mongoose.Types.ObjectId("dddddddddddddddddddddd04"),
  a05: new mongoose.Types.ObjectId("dddddddddddddddddddddd05"),
  a06: new mongoose.Types.ObjectId("dddddddddddddddddddddd06"),
  a07: new mongoose.Types.ObjectId("dddddddddddddddddddddd07"),
  a08: new mongoose.Types.ObjectId("dddddddddddddddddddddd08"),
  a09: new mongoose.Types.ObjectId("dddddddddddddddddddddd09"),
  a10: new mongoose.Types.ObjectId("dddddddddddddddddddddd10"),
  // Auctions — ใหม่ (ENDED → สร้าง orders)
  a11: new mongoose.Types.ObjectId("dddddddddddddddddddddd11"),
  a12: new mongoose.Types.ObjectId("dddddddddddddddddddddd12"),
  a13: new mongoose.Types.ObjectId("dddddddddddddddddddddd13"),
  a14: new mongoose.Types.ObjectId("dddddddddddddddddddddd14"),
  a15: new mongoose.Types.ObjectId("dddddddddddddddddddddd15"),
  // Orders
  o01: new mongoose.Types.ObjectId("666666666666666666666666"),
  o02: new mongoose.Types.ObjectId("eeeeeeeeeeeeeeeeeeeeee02"),
  o03: new mongoose.Types.ObjectId("eeeeeeeeeeeeeeeeeeeeee03"),
  o04: new mongoose.Types.ObjectId("eeeeeeeeeeeeeeeeeeeeee04"),
  o05: new mongoose.Types.ObjectId("eeeeeeeeeeeeeeeeeeeeee05"),
  o06: new mongoose.Types.ObjectId("eeeeeeeeeeeeeeeeeeeeee06"),
  o07: new mongoose.Types.ObjectId("eeeeeeeeeeeeeeeeeeeeee07"),
  o08: new mongoose.Types.ObjectId("eeeeeeeeeeeeeeeeeeeeee08"),
};

export const seedData = async () => {
  // ใช้ o04 เป็นตัวตรวจสอบ seed รุ่นใหม่
  if (await Order.exists({ _id: ids.o04 })) {
    console.log("[seed] skipped (already seeded v2)");
    return;
  }

  const now = Date.now();
  const ph = await bcrypt.hash("password123", 10);

  // ─── Users ────────────────────────────────────────────────────────────────
  const usersData = [
    { _id: ids.user,   name: "Demo User",          email: "user@auction.dev",   passwordHash: ph, role: "USER",  verified: true,  phone: "081-234-5678", address: "123 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110" },
    { _id: ids.admin,  name: "Admin",               email: "admin@auction.dev",  passwordHash: ph, role: "ADMIN", verified: true,  phone: "02-000-0000",  address: "สำนักงานใหญ่ AuctionHub" },
    { _id: ids.buyer1, name: "สมชาย ประมูลเก่ง",   email: "buyer1@auction.dev", passwordHash: ph, role: "USER",  verified: true,  phone: "089-111-2222", address: "456 ถ.นิมมานเหมินทร์ ต.สุเทพ อ.เมือง จ.เชียงใหม่ 50200" },
    { _id: ids.buyer2, name: "สมหญิง ราคาดี",      email: "buyer2@auction.dev", passwordHash: ph, role: "USER",  verified: true,  phone: "092-333-4444", address: "789 ถ.มิตรภาพ ต.ในเมือง อ.เมือง จ.ขอนแก่น 40000" },
    { _id: ids.buyer3, name: "สมปอง ชอบประมูล",    email: "buyer3@auction.dev", passwordHash: ph, role: "USER",  verified: true,  phone: "083-555-6666", address: "321 ถ.เพชรเกษม แขวงบางแค เขตบางแค กรุงเทพฯ 10160" },
    { _id: ids.buyer4, name: "วิไล ซื้อของออนไลน์", email: "buyer4@auction.dev", passwordHash: ph, role: "USER",  verified: true,  phone: "064-777-8888", address: "654 ถ.ราชดำเนิน ต.หน้าเมือง อ.เมือง จ.ฉะเชิงเทรา 24000" },
    { _id: ids.buyer5, name: "อนันต์ นักสะสม",     email: "buyer5@auction.dev", passwordHash: ph, role: "USER",  verified: false, phone: "098-999-0000", address: "987 ถ.พระรามสอง แขวงแสมดำ เขตบางขุนเทียน กรุงเทพฯ 10150" },
  ];
  for (const u of usersData) {
    await User.updateOne({ email: u.email }, { $setOnInsert: u }, { upsert: true });
  }

  // ─── Products ──────────────────────────────────────────────────────────────
  const productsData = [
    // APPROVED — Live auctions
    { _id: ids.p01, sellerId: ids.user,   status: "APPROVED", startPrice: 25000, title: "iPhone 15 Pro Max 256GB Natural Titanium", description: "[electronics] สภาพ: มือสอง สภาพดีมาก (95%+)\nแบตเตอรี่ 96% มีกล่องและอุปกรณ์ครบ ประกันศูนย์เหลือ 6 เดือน", images: ["https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800"] },
    { _id: ids.p02, sellerId: ids.user,   status: "APPROVED", startPrice: 65000, title: "MacBook Pro M3 16\" 18GB RAM 512GB", description: "[electronics] สภาพ: มือสอง สภาพดีมาก (95%+)\nซื้อมา 3 เดือน ใช้งานเบา สภาพเหมือนใหม่ ประกันศูนย์ไทยเหลือ 21 เดือน", images: ["https://images.unsplash.com/photo-1517336714739-489689fd1ca8?w=800"] },
    { _id: ids.p03, sellerId: ids.user,   status: "APPROVED", startPrice: 8000,  title: "Sony WH-1000XM5 หูฟัง Noise Canceling", description: "[audio] สภาพ: ใหม่มือ 1\nของใหม่ยังไม่แกะซีล ซื้อสำรองไว้แต่ไม่ได้ใช้ มีใบเสร็จจาก Sony Thailand", images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800"] },
    { _id: ids.p04, sellerId: ids.buyer1, status: "APPROVED", startPrice: 55000, title: "Canon EOS R6 Mark II Body Only", description: "[camera] สภาพ: มือสอง สภาพดีมาก (95%+)\nShutter count 4,200 ใช้งานไม่หนัก สภาพดีมาก อุปกรณ์ครบทุกชิ้น", images: ["https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800"] },
    { _id: ids.p05, sellerId: ids.buyer1, status: "APPROVED", startPrice: 14000, title: "PS5 Slim Disc Edition + 2 เกม", description: "[gaming] สภาพ: มือสอง สภาพดีมาก (95%+)\nซื้อมา 5 เดือน แถม God of War Ragnarök และ Spider-Man 2", images: ["https://images.unsplash.com/photo-1607853202273-797f1c22a38e?w=800"] },
    { _id: ids.p06, sellerId: ids.user,   status: "APPROVED", startPrice: 29000, title: "iPad Pro M4 11\" 256GB Wi-Fi สีดำ", description: "[electronics] สภาพ: ใหม่มือ 1\nใหม่ยังซีลอยู่ ซื้อมาจาก Apple Store Thailand พร้อมใบเสร็จ", images: ["https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800"] },
    { _id: ids.p07, sellerId: ids.user,   status: "APPROVED", startPrice: 18000, title: "DJI Mini 4 Pro Fly More Combo Plus", description: "[electronics] สภาพ: มือสอง สภาพดีมาก (95%+)\nบินไปแค่ 3 ครั้ง อุปกรณ์ครบชุด ND Filter กระเป๋าสะพาย", images: ["https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800"] },
    { _id: ids.p08, sellerId: ids.buyer1, status: "APPROVED", startPrice: 5000,  title: "AirPods Pro รุ่น 2 (USB-C) พร้อมเคส", description: "[audio] สภาพ: มือสอง สภาพดี (85-95%)\nใช้งานน้อย แบตเตอรี่ยังดีมาก ตัดเสียงทำงานปกติ", images: ["https://images.unsplash.com/photo-1588423771073-b8903fead85c?w=800"] },
    { _id: ids.p09, sellerId: ids.user,   status: "APPROVED", startPrice: 9000,  title: "Nintendo Switch OLED สีขาว ครบชุด", description: "[gaming] สภาพ: มือสอง สภาพดีมาก (95%+)\nสภาพดีมาก จอ OLED ไม่มีรอยขีดข่วน Joy-Con ครบ 2 อัน", images: ["https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=800"] },
    { _id: ids.p13, sellerId: ids.buyer2, status: "APPROVED", startPrice: 7500,  title: "Fujifilm X-T5 Body + เลนส์ 18-55mm", description: "[camera] สภาพ: มือสอง สภาพดีมาก (95%+)\nShutter count 2,100 สภาพ 98% อุปกรณ์ครบ ประกันเหลือ 8 เดือน", images: ["https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800"] },
    // APPROVED — สำหรับ ENDED auctions ใหม่
    { _id: ids.p21, sellerId: ids.buyer3, status: "APPROVED", startPrice: 28000, title: "Dell XPS 15 9530 Core i9 32GB RTX 4060", description: "[electronics] สภาพ: มือสอง สภาพดีมาก (95%+)\nซื้อมา 8 เดือน สภาพสวยมาก แรม 32GB SSD 1TB ประกัน Dell On-Site เหลือ 16 เดือน", images: ["https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800"] },
    { _id: ids.p22, sellerId: ids.buyer4, status: "APPROVED", startPrice: 32000, title: "Garmin Fenix 7X Pro Solar Sapphire", description: "[watch] สภาพ: มือสอง สภาพดีมาก (95%+)\nใช้งานแค่ 2 เดือน สภาพดีมาก สายซิลิโคนสำรอง มีกล่อง", images: ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"] },
    { _id: ids.p23, sellerId: ids.buyer5, status: "APPROVED", startPrice: 75000, title: "Leica Q3 Full Frame Compact", description: "[camera] สภาพ: มือสอง สภาพดีมาก (95%+)\nShutter count 890 สภาพเหมือนใหม่ มีกล่อง ประกันศูนย์เหลือ 14 เดือน", images: ["https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800"] },
    { _id: ids.p24, sellerId: ids.buyer1, status: "APPROVED", startPrice: 42000, title: "Sony A7 IV Body + Battery Grip", description: "[camera] สภาพ: มือสอง สภาพดีมาก (95%+)\nShutter count 6,400 สภาพดีมาก มี Battery Grip แท้ กล่องครบ", images: ["https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800"] },
    { _id: ids.p25, sellerId: ids.buyer2, status: "APPROVED", startPrice: 19000, title: "Apple Watch Ultra 2 Titanium Black", description: "[watch] สภาพ: มือสอง สภาพดีมาก (95%+)\nซื้อมา 4 เดือน ใส่ไม่บ่อย สายเพิ่มเติม 2 เส้น กล่องครบ", images: ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"] },
    // REJECTED
    { _id: ids.p12, sellerId: ids.buyer1, status: "REJECTED", startPrice: 15000, title: "Xbox Series X + Game Pass 3 เดือน", description: "[gaming] สภาพ: มือสอง สภาพพอใช้\nสภาพดี ใช้งานประมาณ 1 ปี ไม่มีรอยขีดข่วน", images: ["https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=800"] },
    // PENDING — รออนุมัติ (7 รายการ)
    { _id: ids.p14, sellerId: ids.buyer3, status: "PENDING", startPrice: 38000, title: "Samsung Galaxy S24 Ultra 256GB Titanium Black", description: "[electronics] สภาพ: มือสอง สภาพดีมาก (95%+)\nซื้อมา 2 เดือน สภาพเหมือนใหม่ มีฟิล์มติดมา เคสแถม ประกันศูนย์ Samsung เหลือ 10 เดือน", images: ["https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800"] },
    { _id: ids.p15, sellerId: ids.buyer4, status: "PENDING", startPrice: 62000, title: "Nikon Z6 III Body พร้อม FTZ II Adapter", description: "[camera] สภาพ: ใหม่มือ 1\nซื้อจากตัวแทนจำหน่ายอย่างเป็นทางการ ยังไม่แกะกล่อง มีใบเสร็จและประกันศูนย์ Nikon 2 ปี", images: ["https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800"] },
    { _id: ids.p16, sellerId: ids.buyer2, status: "PENDING", startPrice: 28000, title: "Apple Watch Ultra 2 Titanium Natural + Satin Strap", description: "[watch] สภาพ: มือสอง สภาพดีมาก (95%+)\nซื้อมา 1 เดือน เปลี่ยนรุ่น สายแถม 3 เส้น กล่องและอุปกรณ์ครบ", images: ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"] },
    { _id: ids.p17, sellerId: ids.buyer3, status: "PENDING", startPrice: 45000, title: "Sony A7C II + เลนส์ 28-60mm Kit", description: "[camera] สภาพ: มือสอง สภาพดีมาก (95%+)\nShutter count 1,200 สภาพดีมาก มีเลนส์ Kit แถม กล่องและอุปกรณ์ครบ", images: ["https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800"] },
    { _id: ids.p18, sellerId: ids.buyer4, status: "PENDING", startPrice: 6500,  title: "Bose QuietComfort 45 Wireless สีดำ", description: "[audio] สภาพ: มือสอง สภาพดีมาก (95%+)\nซื้อมา 6 เดือน ใช้งานเบา ยังตัดเสียงได้ดีเยี่ยม มีเคสผ้า กล่องครบ", images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800"] },
    { _id: ids.p19, sellerId: ids.buyer5, status: "PENDING", startPrice: 85000, title: "LG OLED evo C4 65\" 4K 120Hz Smart TV 2024", description: "[other] สภาพ: มือสอง สภาพดีมาก (95%+)\nซื้อมา 5 เดือน ใช้น้อยมาก ไม่มีรอยใด ประกันศูนย์ LG เหลือ 19 เดือน รีโมทและสาย HDMI แถม", images: ["https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800"] },
    { _id: ids.p20, sellerId: ids.buyer3, status: "PENDING", startPrice: 18500, title: "Dyson V15 Detect Absolute Extra", description: "[other] สภาพ: มือสอง สภาพดีมาก (95%+)\nซื้อมา 7 เดือน ดูดฝุ่นดีมาก ไส้กรองล้างแล้ว อุปกรณ์เสริมครบชุด กล่องเดิม", images: ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800"] },
  ];
  for (const p of productsData) {
    await Product.updateOne({ _id: p._id }, { $setOnInsert: p }, { upsert: true });
  }

  // ─── Auctions ──────────────────────────────────────────────────────────────
  const auctionsData = [
    // LIVE
    { _id: ids.a01, productId: ids.p01, startAt: new Date(now - 3*3600000),        endAt: new Date(now + 2*3600000),        currentBid: 32000, status: "LIVE" },
    { _id: ids.a02, productId: ids.p02, startAt: new Date(now - 2*3600000),        endAt: new Date(now + 5*3600000),        currentBid: 72000, status: "LIVE" },
    { _id: ids.a03, productId: ids.p03, startAt: new Date(now - 1*3600000),        endAt: new Date(now + 18*3600000),       currentBid: 9500,  status: "LIVE" },
    { _id: ids.a04, productId: ids.p04, startAt: new Date(now - 6*3600000),        endAt: new Date(now + 70*3600000),       currentBid: 60000, status: "LIVE" },
    { _id: ids.a05, productId: ids.p05, startAt: new Date(now - 4*3600000),        endAt: new Date(now + 24*3600000),       currentBid: 17500, status: "LIVE" },
    // SCHEDULED
    { _id: ids.a06, productId: ids.p06, startAt: new Date(now + 2*3600000),        endAt: new Date(now + 9*86400000),       currentBid: 29000, status: "SCHEDULED" },
    { _id: ids.a07, productId: ids.p07, startAt: new Date(now + 6*3600000),        endAt: new Date(now + 7*86400000),       currentBid: 18000, status: "SCHEDULED" },
    // ENDED เดิม
    { _id: ids.a08, productId: ids.p08, startAt: new Date(now - 10*86400000), endAt: new Date(now - 3*86400000),  currentBid: 6200,  status: "ENDED", winnerId: ids.buyer2 },
    { _id: ids.a09, productId: ids.p09, startAt: new Date(now - 14*86400000), endAt: new Date(now - 7*86400000),  currentBid: 11000, status: "ENDED", winnerId: ids.buyer1 },
    { _id: ids.a10, productId: ids.p13, startAt: new Date(now - 5*86400000),  endAt: new Date(now - 1*86400000),  currentBid: 9200,  status: "ENDED", winnerId: ids.user },
    // ENDED ใหม่ — สร้าง orders หลายสถานะ
    { _id: ids.a11, productId: ids.p21, startAt: new Date(now - 9*86400000),  endAt: new Date(now - 2*86400000),  currentBid: 31500, status: "ENDED", winnerId: ids.buyer3 },
    { _id: ids.a12, productId: ids.p22, startAt: new Date(now - 11*86400000), endAt: new Date(now - 4*86400000),  currentBid: 38000, status: "ENDED", winnerId: ids.buyer4 },
    { _id: ids.a13, productId: ids.p23, startAt: new Date(now - 13*86400000), endAt: new Date(now - 6*86400000),  currentBid: 89000, status: "ENDED", winnerId: ids.buyer5 },
    { _id: ids.a14, productId: ids.p24, startAt: new Date(now - 15*86400000), endAt: new Date(now - 8*86400000),  currentBid: 47500, status: "ENDED", winnerId: ids.buyer2 },
    { _id: ids.a15, productId: ids.p25, startAt: new Date(now - 20*86400000), endAt: new Date(now - 13*86400000), currentBid: 22000, status: "ENDED", winnerId: ids.buyer1 },
  ];
  for (const a of auctionsData) {
    await Auction.updateOne({ _id: a._id }, { $setOnInsert: a }, { upsert: true });
  }

  // ─── Bids ──────────────────────────────────────────────────────────────────
  if (!(await Bid.exists({ auctionId: ids.a02 }))) {
    await Bid.insertMany([
      { auctionId: ids.a01, userId: ids.buyer1, amount: 27000, createdAt: new Date(now - 150*60000) },
      { auctionId: ids.a01, userId: ids.buyer2, amount: 29000, createdAt: new Date(now - 90*60000) },
      { auctionId: ids.a01, userId: ids.user,   amount: 31000, createdAt: new Date(now - 45*60000) },
      { auctionId: ids.a01, userId: ids.buyer1, amount: 32000, createdAt: new Date(now - 20*60000) },
      { auctionId: ids.a02, userId: ids.user,   amount: 67000, createdAt: new Date(now - 100*60000) },
      { auctionId: ids.a02, userId: ids.buyer2, amount: 69000, createdAt: new Date(now - 60*60000) },
      { auctionId: ids.a02, userId: ids.buyer1, amount: 72000, createdAt: new Date(now - 30*60000) },
      { auctionId: ids.a03, userId: ids.buyer1, amount: 8500,  createdAt: new Date(now - 50*60000) },
      { auctionId: ids.a03, userId: ids.user,   amount: 9000,  createdAt: new Date(now - 35*60000) },
      { auctionId: ids.a03, userId: ids.buyer2, amount: 9500,  createdAt: new Date(now - 15*60000) },
      { auctionId: ids.a04, userId: ids.user,   amount: 56000, createdAt: new Date(now - 300*60000) },
      { auctionId: ids.a04, userId: ids.buyer2, amount: 58000, createdAt: new Date(now - 200*60000) },
      { auctionId: ids.a04, userId: ids.buyer1, amount: 60000, createdAt: new Date(now - 120*60000) },
      { auctionId: ids.a05, userId: ids.buyer2, amount: 14500, createdAt: new Date(now - 200*60000) },
      { auctionId: ids.a05, userId: ids.user,   amount: 16000, createdAt: new Date(now - 130*60000) },
      { auctionId: ids.a05, userId: ids.buyer1, amount: 17500, createdAt: new Date(now - 80*60000) },
      { auctionId: ids.a08, userId: ids.user,   amount: 5200,  createdAt: new Date(now - 10*86400000 + 1800000) },
      { auctionId: ids.a08, userId: ids.buyer1, amount: 5700,  createdAt: new Date(now - 10*86400000 + 3600000) },
      { auctionId: ids.a08, userId: ids.buyer2, amount: 6200,  createdAt: new Date(now - 10*86400000 + 7200000) },
      { auctionId: ids.a09, userId: ids.buyer2, amount: 9200,  createdAt: new Date(now - 13*86400000) },
      { auctionId: ids.a09, userId: ids.user,   amount: 10000, createdAt: new Date(now - 12*86400000) },
      { auctionId: ids.a09, userId: ids.buyer1, amount: 11000, createdAt: new Date(now - 12*86400000 + 3600000) },
      { auctionId: ids.a11, userId: ids.buyer4, amount: 29000, createdAt: new Date(now - 8*86400000) },
      { auctionId: ids.a11, userId: ids.buyer5, amount: 30000, createdAt: new Date(now - 7*86400000) },
      { auctionId: ids.a11, userId: ids.buyer3, amount: 31500, createdAt: new Date(now - 6*86400000) },
      { auctionId: ids.a12, userId: ids.buyer3, amount: 33000, createdAt: new Date(now - 10*86400000) },
      { auctionId: ids.a12, userId: ids.buyer5, amount: 35000, createdAt: new Date(now - 9*86400000) },
      { auctionId: ids.a12, userId: ids.buyer4, amount: 38000, createdAt: new Date(now - 8*86400000) },
      { auctionId: ids.a13, userId: ids.buyer3, amount: 76000, createdAt: new Date(now - 12*86400000) },
      { auctionId: ids.a13, userId: ids.buyer4, amount: 82000, createdAt: new Date(now - 11*86400000) },
      { auctionId: ids.a13, userId: ids.buyer5, amount: 89000, createdAt: new Date(now - 10*86400000) },
      { auctionId: ids.a14, userId: ids.buyer3, amount: 43000, createdAt: new Date(now - 14*86400000) },
      { auctionId: ids.a14, userId: ids.buyer5, amount: 45000, createdAt: new Date(now - 13*86400000) },
      { auctionId: ids.a14, userId: ids.buyer2, amount: 47500, createdAt: new Date(now - 12*86400000) },
      { auctionId: ids.a15, userId: ids.buyer3, amount: 20000, createdAt: new Date(now - 19*86400000) },
      { auctionId: ids.a15, userId: ids.buyer4, amount: 21000, createdAt: new Date(now - 18*86400000) },
      { auctionId: ids.a15, userId: ids.buyer1, amount: 22000, createdAt: new Date(now - 17*86400000) },
    ], { ordered: false }).catch(() => {});
  }

  // ─── Orders ────────────────────────────────────────────────────────────────
  const ordersData = [
    // เดิม
    { _id: ids.o01, auctionId: ids.a08, buyerId: ids.buyer2, amount: 6200,  status: "PAID",                  createdAt: new Date(now - 3*86400000) },
    { _id: ids.o02, auctionId: ids.a09, buyerId: ids.buyer1, amount: 11000, status: "SHIPPED",               createdAt: new Date(now - 7*86400000) },
    { _id: ids.o03, auctionId: ids.a10, buyerId: ids.user,   amount: 9200,  status: "PENDING",               createdAt: new Date(now - 1*86400000) },
    // ใหม่ — หลากหลายสถานะ
    { _id: ids.o04, auctionId: ids.a11, buyerId: ids.buyer3, amount: 31500, status: "AWAITING_VERIFICATION", createdAt: new Date(now - 2*86400000) },
    { _id: ids.o05, auctionId: ids.a12, buyerId: ids.buyer4, amount: 38000, status: "AWAITING_VERIFICATION", createdAt: new Date(now - 4*86400000) },
    { _id: ids.o06, auctionId: ids.a13, buyerId: ids.buyer5, amount: 89000, status: "AWAITING_VERIFICATION", createdAt: new Date(now - 6*86400000) },
    { _id: ids.o07, auctionId: ids.a14, buyerId: ids.buyer2, amount: 47500, status: "PAID",                  createdAt: new Date(now - 8*86400000) },
    { _id: ids.o08, auctionId: ids.a15, buyerId: ids.buyer1, amount: 22000, status: "DELIVERED",             createdAt: new Date(now - 13*86400000) },
  ];
  for (const o of ordersData) {
    await Order.updateOne({ _id: o._id }, { $setOnInsert: o }, { upsert: true });
  }

  // ─── Payments ──────────────────────────────────────────────────────────────
  const paymentsData = [
    // เดิม
    { orderId: ids.o01, provider: "bank",      amount: 6200,  status: "PAID",                  providerRef: "mock_seed_001", slipNote: "" },
    // ใหม่ — AWAITING_VERIFICATION (3 รายการ รอตรวจสอบ)
    { orderId: ids.o04, provider: "promptpay", amount: 31500, status: "AWAITING_VERIFICATION",  providerRef: `ref_${now}_o04`, slipNote: "โอนแล้วเมื่อ 10:32 น. ผ่าน KBank Mobile" },
    { orderId: ids.o05, provider: "bank",      amount: 38000, status: "AWAITING_VERIFICATION",  providerRef: `ref_${now}_o05`, slipNote: "โอนเข้า KBank เลข ref 202405100012 วันที่ 10/05/2026" },
    { orderId: ids.o06, provider: "card",      amount: 89000, status: "AWAITING_VERIFICATION",  providerRef: `ref_${now}_o06`, slipNote: "" },
    // PAID
    { orderId: ids.o07, provider: "bank",      amount: 47500, status: "PAID",                   providerRef: "mock_seed_007", slipNote: "โอนเงินเข้า SCB เรียบร้อย" },
    { orderId: ids.o08, provider: "promptpay", amount: 22000, status: "PAID",                   providerRef: "mock_seed_008", slipNote: "" },
  ];
  for (const p of paymentsData) {
    await Payment.updateOne({ orderId: p.orderId }, { $setOnInsert: p }, { upsert: true });
  }

  // ─── Shipments ─────────────────────────────────────────────────────────────
  const shipmentsData = [
    { orderId: ids.o02, trackingNumber: "TH9876543210",  status: "IN_TRANSIT" },
    { orderId: ids.o08, trackingNumber: "EF112233445TH", status: "DELIVERED"  },
    // o07 = PAID (ยังไม่จัดส่ง) → ไม่มี shipment จนกว่า admin จะใส่เลข
  ];
  for (const s of shipmentsData) {
    await Shipment.updateOne({ orderId: s.orderId }, { $setOnInsert: s }, { upsert: true });
  }

  console.log("[seed] done — v2 data inserted");
};

export const seedIds = Object.fromEntries(Object.entries(ids).map(([k, v]) => [k, String(v)]));
