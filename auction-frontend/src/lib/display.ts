export function formatCurrency(value: number) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateTime(value: string | undefined | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function translateRole(role: string) {
  switch (role) {
    case 'ADMIN':
      return 'ผู้ดูแลระบบ';
    case 'USER':
      return 'สมาชิก';
    default:
      return role;
  }
}

export function translateStatus(status: string) {
  switch (status) {
    case 'LIVE':
      return 'กำลังประมูล';
    case 'ENDED':
      return 'ปิดประมูลแล้ว';
    case 'SCHEDULED':
      return 'กำลังจะเริ่ม';
    case 'PENDING':
      return 'รอชำระเงิน';
    case 'AWAITING_VERIFICATION':
      return 'รอตรวจสอบ';
    case 'FAILED':
      return 'ไม่อนุมัติ';
    case 'APPROVED':
      return 'อนุมัติแล้ว';
    case 'REJECTED':
      return 'ไม่อนุมัติ';
    case 'PAID':
      return 'ชำระเงินแล้ว';
    case 'SHIPPED':
      return 'จัดส่งแล้ว';
    case 'IN_TRANSIT':
      return 'กำลังขนส่ง';
    case 'DELIVERED':
      return 'ส่งถึงแล้ว';
    case 'CANCELLED':
      return 'ยกเลิก';
    default:
      return status;
  }
}
