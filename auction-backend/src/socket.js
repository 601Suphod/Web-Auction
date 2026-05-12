import { Server as SocketServer } from 'socket.io';

let io = null;

export function initSocket(httpServer, corsOrigin) {
  io = new SocketServer(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    socket.on('join_auction', (auctionId) => {
      if (typeof auctionId === 'string') socket.join(`auction:${auctionId}`);
    });
    socket.on('leave_auction', (auctionId) => {
      if (typeof auctionId === 'string') socket.leave(`auction:${auctionId}`);
    });
  });

  return io;
}

export function getIO() {
  return io;
}
