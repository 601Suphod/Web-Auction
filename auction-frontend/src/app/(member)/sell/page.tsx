'use client';

import React, { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { apiPost, apiUpload } from '@/lib/api';
import { useToast } from '@/components/providers/AppProviders';

const CATEGORIES = [
  { value: 'electronics', label: '📱 อิเล็กทรอนิกส์' },
  { value: 'camera', label: '📷 กล้องและอุปกรณ์' },
  { value: 'gaming', label: '🎮 เกมและคอนโซล' },
  { value: 'watch', label: '⌚ นาฬิกา' },
  { value: 'fashion', label: '👜 แฟชั่นและเครื่องแต่งกาย' },
  { value: 'audio', label: '🎧 เครื่องเสียง' },
  { value: 'other', label: '📦 อื่นๆ' },
];

// ─── ImageUploader ────────────────────────────────────────────────────────────

interface UploadedImage {
  id: string;
  previewUrl: string;   // object URL for immediate preview
  uploadedUrl: string | null; // URL from server after upload
  uploading: boolean;
  error: string | null;
}

function ImageUploader({
  images,
  onChange,
}: {
  images: UploadedImage[];
  onChange: React.Dispatch<React.SetStateAction<UploadedImage[]>>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArr = Array.from(files).filter((f) => f.type.startsWith('image/'));
      const remaining = 5 - images.length;
      if (remaining <= 0) return;
      const toProcess = fileArr.slice(0, remaining);

      // Create placeholder entries immediately with preview
      const placeholders: UploadedImage[] = toProcess.map((f) => ({
        id: `${Date.now()}-${Math.random()}`,
        previewUrl: URL.createObjectURL(f),
        uploadedUrl: null,
        uploading: true,
        error: null,
      }));

      const next = [...images, ...placeholders];
      onChange(next);

      // Upload each file to the server
      await Promise.all(
        toProcess.map(async (file, i) => {
          const placeholder = placeholders[i];
          try {
            const { urls } = await apiUpload('/upload', [file]);
            onChange((prev: UploadedImage[]) =>
              prev.map((img) =>
                img.id === placeholder.id
                  ? { ...img, uploading: false, uploadedUrl: urls[0] }
                  : img
              )
            );
          } catch (e) {
            onChange((prev: UploadedImage[]) =>
              prev.map((img) =>
                img.id === placeholder.id
                  ? { ...img, uploading: false, error: e instanceof Error ? e.message : 'อัปโหลดไม่สำเร็จ' }
                  : img
              )
            );
          }
        })
      );
    },
    [images, onChange]
  );

  const removeImage = (id: string) => {
    onChange(images.filter((img) => img.id !== id));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) void addFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-3">
      {/* Upload zone */}
      {images.length < 5 && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex w-full flex-col items-center justify-center gap-2 rounded-[18px] border-2 border-dashed px-6 py-8 transition ${
            dragging
              ? 'border-emerald-400/70 bg-emerald-400/8'
              : 'border-white/15 bg-white/3 hover:border-white/30 hover:bg-white/6'
          }`}
        >
          <span className="text-3xl">🖼️</span>
          <p className="text-sm font-medium text-white/70">
            คลิกเพื่อเลือกรูป หรือลากวางที่นี่
          </p>
          <p className="text-xs text-white/35">
            PNG, JPG, WEBP · สูงสุด 5MB/ไฟล์ · เหลือ {5 - images.length} รูป
          </p>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = ''; }}
      />

      {/* Preview grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {images.map((img, i) => (
            <div key={img.id} className="group relative aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.previewUrl}
                alt={`รูปที่ ${i + 1}`}
                className={`h-full w-full rounded-[14px] object-cover transition ${img.uploading ? 'opacity-40' : 'opacity-100'}`}
              />

              {/* First-image badge */}
              {i === 0 && !img.uploading && !img.error && (
                <span className="absolute bottom-1 left-1 rounded-[6px] bg-emerald-400/80 px-1.5 py-0.5 text-[10px] font-semibold text-slate-950">
                  หลัก
                </span>
              )}

              {/* Uploading spinner */}
              {img.uploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-[14px] bg-black/40">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                </div>
              )}

              {/* Error overlay */}
              {img.error && (
                <div className="absolute inset-0 flex items-center justify-center rounded-[14px] bg-rose-900/60 p-1">
                  <p className="text-center text-[10px] text-rose-200">{img.error}</p>
                </div>
              )}

              {/* Remove button */}
              {!img.uploading && (
                <button
                  type="button"
                  onClick={() => removeImage(img.id)}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white/70 opacity-0 transition hover:bg-rose-500/80 hover:text-white group-hover:opacity-100"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SellPage() {
  const router = useRouter();
  const { pushToast } = useToast();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('');
  const [startPrice, setStartPrice] = useState('');
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const uploadedUrls = images
    .filter((img) => img.uploadedUrl && !img.error)
    .map((img) => img.uploadedUrl as string);

  const isUploading = images.some((img) => img.uploading);
  const canSubmit = title.trim() && Number(startPrice) > 0 && !submitting && !isUploading;

  const resetForm = () => {
    setTitle(''); setCategory(''); setDescription('');
    setCondition(''); setStartPrice(''); setImages([]);
  };

  const onSubmit = async () => {
    try {
      setSubmitting(true);
      await apiPost('/products', {
        title: title.trim(),
        description: `${category ? `[${category}] ` : ''}${condition ? `สภาพ: ${condition}\n` : ''}${description}`.trim(),
        startPrice: Number(startPrice),
        images: uploadedUrls,
      });
      setSubmitted(true);
      pushToast({
        tone: 'success',
        title: 'ส่งรายการขายแล้ว',
        description: 'รอ Admin อนุมัติ จากนั้นจะเปิดประมูลอัตโนมัติ',
        action: { label: 'ดูแดชบอร์ด', onClick: () => router.push('/dashboard') },
      });
    } catch (e) {
      pushToast({
        tone: 'error',
        title: 'ส่งรายการไม่สำเร็จ',
        description: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main className="page-bg min-h-screen">
        <Navbar />
        <section className="section-shell flex min-h-[calc(100vh-64px)] items-center justify-center py-10">
          <div className="glass-panel w-full max-w-md rounded-[30px] p-10 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-400/15 text-4xl">
              ✅
            </div>
            <h2 className="mt-6 text-2xl font-bold text-white">ส่งรายการขายแล้ว!</h2>
            <p className="soft-copy mt-3">
              รายการของคุณอยู่ในสถานะ{' '}
              <span className="font-medium text-amber-300">รอการอนุมัติ</span>{' '}
              เมื่อ Admin อนุมัติแล้ว ระบบจะเปิดประมูลให้อัตโนมัติ
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <button
                onClick={() => { setSubmitted(false); resetForm(); }}
                className="primary-btn py-3 text-sm font-semibold"
              >
                ลงขายสินค้าชิ้นอื่น
              </button>
              <button onClick={() => router.push('/dashboard')} className="secondary-btn py-3 text-sm">
                ดูแดชบอร์ด
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page-bg min-h-screen">
      <Navbar />
      <section className="section-shell py-10 lg:py-14">
        <div className="mb-8">
          <span className="status-chip border-amber-300/24 bg-amber-300/10 text-amber-100">สำหรับผู้ขาย</span>
          <h1 className="mt-4 text-4xl font-bold text-white">ลงขายสินค้า</h1>
          <p className="soft-copy mt-2 max-w-xl">
            กรอกข้อมูลสินค้าให้ครบถ้วนเพื่อให้ผู้ซื้อตัดสินใจได้ง่าย รายการจะถูกส่งให้ Admin อนุมัติก่อนเปิดประมูล
          </p>
        </div>

        <div className="mx-auto max-w-2xl">
          <div className="glass-panel rounded-[30px] p-7 lg:p-9">

            {/* ชื่อสินค้า */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/70">
                ชื่อสินค้า <span className="text-rose-400">*</span>
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น iPhone 15 Pro Max 256GB สี Natural Titanium"
                maxLength={120}
                className="field"
              />
              <p className="mt-1 text-right text-xs text-white/30">{title.length}/120</p>
            </div>

            {/* หมวดหมู่ + สภาพ */}
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/70">หมวดหมู่</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="field">
                  <option value="">เลือกหมวดหมู่</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/70">สภาพสินค้า</label>
                <select value={condition} onChange={(e) => setCondition(e.target.value)} className="field">
                  <option value="">เลือกสภาพ</option>
                  <option value="ใหม่มือ 1">ใหม่มือ 1</option>
                  <option value="มือสอง สภาพดีมาก">มือสอง สภาพดีมาก (95%+)</option>
                  <option value="มือสอง สภาพดี">มือสอง สภาพดี (85-95%)</option>
                  <option value="มือสอง สภาพพอใช้">มือสอง สภาพพอใช้</option>
                </select>
              </div>
            </div>

            {/* รายละเอียด */}
            <div className="mt-5">
              <label className="mb-1.5 block text-sm font-medium text-white/70">รายละเอียดสินค้า</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                maxLength={1000}
                placeholder="บอกรายละเอียดสินค้า เช่น สภาพการใช้งาน อุปกรณ์ที่แถมให้ ข้อมูลประกัน ฯลฯ"
                className="field resize-none"
              />
              <p className="mt-1 text-right text-xs text-white/30">{description.length}/1000</p>
            </div>

            {/* ราคาเริ่มต้น */}
            <div className="mt-5">
              <label className="mb-1.5 block text-sm font-medium text-white/70">
                ราคาเริ่มต้น (บาท) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-white/40">฿</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={startPrice}
                  onChange={(e) => setStartPrice(e.target.value)}
                  placeholder="0"
                  className="field pl-8"
                />
              </div>
              {Number(startPrice) > 0 && (
                <p className="mt-1.5 text-xs text-white/40">
                  ตั้งราคาเริ่มต้นที่{' '}
                  <span className="text-white/60">
                    {Number(startPrice).toLocaleString('th-TH')} บาท
                  </span>
                  {' '}— ผู้ซื้อสามารถเสนอราคาสูงกว่านี้ได้
                </p>
              )}
            </div>

            {/* รูปสินค้า */}
            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-white/70">
                รูปสินค้า
                <span className="ml-2 text-xs text-white/35">(สูงสุด 5 รูป)</span>
              </label>
              <ImageUploader images={images} onChange={setImages} />
              {isUploading && (
                <p className="mt-2 text-xs text-amber-300/80">⏳ กำลังอัปโหลดรูป...</p>
              )}
            </div>

            {/* ขั้นตอนหลังลงขาย */}
            <div className="mt-6 rounded-[18px] border border-white/8 bg-white/4 p-4">
              <p className="text-xs font-medium text-white/50">ขั้นตอนหลังลงขาย</p>
              <ol className="mt-2 space-y-1 text-xs text-white/35">
                <li>1. รายการจะอยู่สถานะ "รอการอนุมัติ"</li>
                <li>2. Admin ตรวจสอบและอนุมัติรายการ</li>
                <li>3. ระบบเปิดประมูล 7 วันโดยอัตโนมัติ</li>
                <li>4. เมื่อหมดเวลา ผู้ชนะต้องชำระเงินภายใน 24 ชั่วโมง</li>
              </ol>
            </div>

            <button
              onClick={() => void onSubmit()}
              disabled={!canSubmit}
              className="primary-btn mt-7 w-full py-3.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? 'กำลังส่งรายการ...'
                : isUploading
                ? 'รอรูปอัปโหลดเสร็จ...'
                : 'ส่งรายการขาย'}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
