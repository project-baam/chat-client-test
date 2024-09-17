import React, { useState, useEffect, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import axios from "axios";
import { Button, TextField, List, Paper, Typography, Box } from "@mui/material";
import CustomChatRoomListItem from "./CustomChatRoomListItem";
import config from "./config";
import { ChatEvents } from "./chat-event";

export enum MessageType {
  TEXT = "text",
  FILE = "file",
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
  sender: {
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

const ChatComponentWith: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [authToken, setAuthToken] = useState<string>("");
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

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

      console.log("Message emit completed");

      // 소켓 상태 확인
      console.log("Socket connected:", socket.connected);
      console.log("Socket id:", socket.id);

      setInputMessage("");
    } else {
      console.error("Cannot send message:", {
        socketConnected: !!socket,
        inputMessage,
        currentRoom,
      });
    }
  };

  const sendFileMessage = useCallback(() => {
    if (socket && file && currentRoom) {
      console.log("Attempting to send file message:", {
        roomId: currentRoom,
        fileName: file.name,
        fileSize: file.size,
      });

      console.log("File:", file);
      // File을 ArrayBuffer로 변환
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target && e.target.result) {
          const arrayBuffer = e.target.result as ArrayBuffer;

          // Socket.IO를 통해 파일 데이터 전송
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
    } else {
      console.error("Cannot send file message:", {
        socketConnected: !!socket,
        fileSelected: !!file,
        currentRoom,
      });
      console.log("socket", socket);
      console.log(file);
      console.log(currentRoom);
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
              <Box sx={{ maxHeight: 200, overflow: "auto", mb: 2 }}>
                {messages.map((msg, index) => (
                  <Typography key={index}>
                    {msg.type === MessageType.TEXT
                      ? `${msg.sender.name}: ${msg.content}`
                      : `${msg.sender.name}: ${msg.file?.name}`}
                  </Typography>
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

export default ChatComponentWith;
