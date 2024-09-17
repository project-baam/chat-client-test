import React from "react";
import {
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Box,
} from "@mui/material";

interface ChatRoom {
  id: string;
  name: string;
  participantsCount: number;
  unreadMessageCount: number;
  lastMessage: string;
  timeAgo: string;
}

interface CustomChatRoomListItemProps {
  room: ChatRoom;
  onJoinRoom: (roomId: string) => void;
}

const CustomChatRoomListItem: React.FC<CustomChatRoomListItemProps> = ({
  room,
  onJoinRoom,
}) => {
  return (
    <ListItem disablePadding>
      <ListItemButton onClick={() => onJoinRoom(room.id)}>
        <Box sx={{ width: "100%" }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="subtitle1" component="div">
              {room.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {room.timeAgo}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {room.lastMessage}
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              참여자: {room.participantsCount}
            </Typography>
            {room.unreadMessageCount > 0 && (
              <Typography variant="caption" color="error">
                새 메시지: {room.unreadMessageCount}
              </Typography>
            )}
          </Box>
        </Box>
      </ListItemButton>
    </ListItem>
  );
};

export default CustomChatRoomListItem;
