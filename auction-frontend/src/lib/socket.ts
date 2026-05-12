import { io, type Socket } from 'socket.io-client';

const SOCKET_URL =
  typeof process !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000/api').replace('/api', '')
    : 'http://localhost:5000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return socket;
}

export function joinAuction(auctionId: string) {
  getSocket().emit('join_auction', auctionId);
}

export function leaveAuction(auctionId: string) {
  getSocket().emit('leave_auction', auctionId);
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
