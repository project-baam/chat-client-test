import React, { useState, useEffect, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import axios from "axios";
import {
  Button,
  TextField,
  Paper,
  Typography,
  Box,
  Avatar,
} from "@mui/material";
import { CloudDownload as CloudDownloadIcon } from "@mui/icons-material";
import CustomChatRoomListItem from "./CustomChatRoomListItem";
import config from "./config";
import { ChatEvents } from "./chat-event";
import { User } from "./user";

export enum MessageType {
  TEXT = "text",
  FILE = "file",
  SYSTEM = "system",
}

interface ChatRoom {
  id: string;
  name: string;
  participantsCount: number;
  unreadMessageCount: number;
  lastMessage: string;
  timeAgo: string;
}

interface Message {
  type: MessageType;
  sender?: {
    id: number;
    name: string;
    profileImageUrl?: string | null;
  };
  content?: string | null;
  file?: {
    url: string;
    name: string;
    size: number;
  } | null;
  sentAt: Date;
}

const API_URL = config.apiUrl;
const SOCKET_URL = config.socketUrl;

const renderMessage = (message: Message) => {
  switch (message.type) {
    case MessageType.TEXT:
      return <Typography variant="body1">{message.content}</Typography>;
    case MessageType.FILE:
      return <FileMessage file={message.file} />;
    case MessageType.SYSTEM:
      return (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
          }}
        >
          <Typography variant="caption" color="textSecondary">
            {message.content}
          </Typography>
        </div>
      );
    default:
      return null;
  }
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const FileMessage: React.FC<{ file: Message["file"] }> = ({ file }) => {
  if (!file) return null;

  const handleDownload = () => {
    if (file.url) {
      window.open(file.url, "_blank");
    }
  };

  return (
    <Box>
      <Typography variant="body1">{file.name}</Typography>
      <Typography variant="caption" display="block" gutterBottom>
        {formatFileSize(file.size)}
      </Typography>
      {file.url ? (
        <Button
          variant="outlined"
          size="small"
          startIcon={<CloudDownloadIcon />}
          onClick={handleDownload}
        >
          Download
        </Button>
      ) : (
        <Typography variant="caption" color="error">
          File not available for download
        </Typography>
      )}
    </Box>
  );
};

const MessageItem: React.FC<{ message: Message; isOwnMessage: boolean }> = ({
  message,
  isOwnMessage,
}) => {
  console.log(message, isOwnMessage)
  if (!message) return null;
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: isOwnMessage ? "flex-end" : "flex-start",
        mb: 2,
      }}
    >
      {!isOwnMessage && (
        <Avatar
          src={message.sender?.profileImageUrl || undefined}
          sx={{ mr: 1 }}
        >
          {message.sender?.name}
        </Avatar>
      )}
      <Paper
        sx={{
          p: 1,
          backgroundColor: isOwnMessage ? "primary.light" : "grey.100",
          maxWidth: "70%",
        }}
      >
        {!isOwnMessage && (
          <Typography variant="caption" display="block" gutterBottom>
            {message.sender?.name}
          </Typography>
        )}
        {renderMessage(message)}

        <Typography variant="caption" display="block" align="right">
          {new Date(message.sentAt).toLocaleTimeString()}
        </Typography>
      </Paper>
    </Box>
  );
};

const ChatComponent: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [authToken, setAuthToken] = useState<string>("");
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await axios.get(`${API_URL}/user`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        setCurrentUser(response.data);
      } catch (error) {
        console.error("Error fetching user info:", error);
      }
    };

    if (authToken) {
      fetchUserInfo();
    }
  }, [authToken]);

  const connectSocket = useCallback(() => {
    if (authToken) {
      console.log("Attempting to connect socket with token:", authToken);

      const newSocket = io(`${SOCKET_URL}/chat`, {
        auth: { token: authToken },
        transports: ["websocket"],
      });

      newSocket.on("connect", () => {
        console.log("Connected to socket server");
        setIsConnected(true);
      });

      newSocket.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
        setIsConnected(false);
      });

      newSocket.on("disconnect", () => {
        console.log("Disconnected from socket server");
        setIsConnected(false);
      });

      newSocket.on(ChatEvents.FromServer.NewMessage, (message: Message) => {
        console.log("New message:", message);
        setMessages((prevMessages) => [...prevMessages, message]);
      });

      newSocket.on(
        ChatEvents.FromServer.NewMessages,
        (newMessages: Message[]) => {
          console.log("New messages:", newMessages);
          setMessages((prevMessages) => [...prevMessages, ...newMessages]);
        }
      );

      newSocket.on(ChatEvents.FromServer.Exception, (error: any) => {
        console.log("Exception:", error);
      });

      setSocket(newSocket);
    }
  }, [authToken]);

  useEffect(() => {
    connectSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [connectSocket]);

  const fetchChatRooms = async () => {
    try {
      const response = await axios.get(`${API_URL}/chat/rooms`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setChatRooms(response.data.list);
    } catch (error) {
      console.error("Error fetching chat rooms:", error);
    }
  };

  const leaveRoom = useCallback(() => {
    if (socket && currentRoom) {
      console.log(`Leaving room: ${currentRoom}`);
      socket.emit(ChatEvents.FromClient.LeaveRoom, { roomId: currentRoom });
      setCurrentRoom(null);
      setMessages([]);
    }
  }, [socket, currentRoom]);

  const joinRoom = useCallback(
    (roomId: string) => {
      if (socket && roomId) {
        if (currentRoom) {
          leaveRoom();
        }
        console.log(`Joining room: ${roomId}`);
        socket.emit(ChatEvents.FromClient.JoinRoom, { roomId });
        setCurrentRoom(roomId);
        setMessages([]);
      }
    },
    [socket, currentRoom, leaveRoom]
  );

  const sendTextMessage = () => {
    if (socket && inputMessage && currentRoom) {
      console.log("Attempting to send message:", {
        roomId: currentRoom,
        content: inputMessage,
      });

      socket.emit(
        ChatEvents.FromClient.SendTextMessage,
        {
          roomId: currentRoom,
          content: inputMessage,
        },
        (response: any) => {
          console.log("Server acknowledged message:", response);
        }
      );

      setInputMessage("");
    }
  };

  const sendFileMessage = useCallback(() => {
    if (socket && file && currentRoom) {
      console.log("Attempting to send file message:", {
        roomId: currentRoom,
        fileName: file.name,
        fileSize: file.size,
      });

      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target && e.target.result) {
          const arrayBuffer = e.target.result as ArrayBuffer;

          socket.emit(
            ChatEvents.FromClient.SendFileMessage,
            {
              roomId: currentRoom,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
              fileData: arrayBuffer,
            },
            (acknowledgement: any) => {
              console.log("Server acknowledged file message:", acknowledgement);
            }
          );

          setFile(null);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  }, [socket, file, currentRoom]);

  const exitChatApplication = () => {
    if (socket) {
      socket.disconnect();
    }
    setAuthToken("");
    setChatRooms([]);
    setCurrentRoom(null);
    setMessages([]);
    setIsConnected(false);
    setCurrentUser(null);
    console.log("Exited chat application");
  };

  return (
    <Paper sx={{ padding: "20px", maxWidth: "500px", margin: "20px auto" }}>
      <Typography variant="h5">Chat Application</Typography>
      {!isConnected ? (
        <Box>
          <TextField
            label="Auth Token"
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
            fullWidth
            margin="normal"
          />
          <Button onClick={connectSocket} variant="contained" color="primary">
            Connect
          </Button>
        </Box>
      ) : (
        <Box>
          <Button
            onClick={fetchChatRooms}
            variant="contained"
            color="primary"
            sx={{ mr: 1 }}
          >
            채팅방 목록 페이지로 이동(실제로 이동하지는 않음, 이동한 효과만)
          </Button>
          <Button
            onClick={exitChatApplication}
            variant="contained"
            color="secondary"
          >
            채팅방 목록 페이지에서 나가기(실제로 나가지는 않음, 나간 효과만)
          </Button>
          <Box sx={{ maxHeight: 300, overflow: "auto", mb: 2 }}>
            {chatRooms.map((room) => (
              <CustomChatRoomListItem
                key={room.id}
                room={room}
                onJoinRoom={joinRoom}
                isActive={room.id === currentRoom}
              />
            ))}
          </Box>
          {currentRoom && (
            <Box>
              <Typography variant="h6">Current Room: {currentRoom}</Typography>
              <Button onClick={leaveRoom} variant="contained" color="secondary">
                해당 채팅방 나가기
              </Button>
              <Box sx={{ maxHeight: 300, overflow: "auto", mb: 2 }}>
                {messages.map((msg, index) => (
                  <MessageItem
                    key={index}
                    message={msg}
                    isOwnMessage={
                      // msg.type !== MessageType.SYSTEM &&
                      currentUser?.id === msg.sender?.id
                    }
                  />
                ))}
              </Box>
              <TextField
                label="Message"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                fullWidth
                margin="normal"
              />
              <input
                type="file"
                onChange={(e) =>
                  setFile(e.target.files ? e.target.files[0] : null)
                }
                style={{ margin: "10px 0" }}
              />
              <Button
                onClick={sendTextMessage}
                variant="contained"
                color="primary"
                sx={{ mr: 1 }}
              >
                Text 타입 메시지 전송
              </Button>
              <Button
                onClick={sendFileMessage}
                variant="contained"
                color="primary"
              >
                File 타입 메시지 전송
              </Button>
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default ChatComponent;
