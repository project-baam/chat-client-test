export const ChatEvents = {
  FromClient: {
    SendTextMessage: "sendTextMessage",
    SendFileMessage: "sendFileMessage",
    JoinRoom: "joinRoom",
    LeaveRoom: "leaveRoom",
  },
  FromServer: {
    NewMessage: "newMessage",
    NewMessages: "newMessages",
    Exception: "exception",
  },
};
