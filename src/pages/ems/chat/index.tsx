import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Building2, Loader2, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { chatApi, type ChatRoomDetailSchema, type ChatMessageSchema } from "@/api";

// WebSocket message types
interface WsOutgoingMessage {
    type: "message";
    sender_id: string;
    sender_type: "ems" | "hospital";
    message: string;
}

interface WsIncomingMessage {
    type: "message" | "system" | "error";
    id?: string;
    sender_id?: string;
    sender_type?: "ems" | "hospital";
    message: string;
    timestamp?: string;
    code?: string;
}

// Get WebSocket URL based on current environment
const getWsUrl = (roomId: string) => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = import.meta.env.VITE_API_BASE_URL?.replace(/^https?:\/\//, "") || window.location.host;
    return `${protocol}//${host}/api/chat/ws/${roomId}`;
};

const ChatPage = () => {
    const [chatRooms, setChatRooms] = useState<ChatRoomDetailSchema[]>([]);
    const [selectedChat, setSelectedChat] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessageSchema[]>([]);
    const [message, setMessage] = useState("");
    const [isLoadingRooms, setIsLoadingRooms] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);

    const socketRef = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const currentUserId = localStorage.getItem("user_id") || "ems_user";
    const currentUserType = (localStorage.getItem("user_type") as "ems" | "hospital") || "ems";

    // Scroll to bottom when new messages arrive
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    // Fetch chat rooms
    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const rooms = await chatApi.getRooms();
                setChatRooms(rooms);
                if (rooms.length > 0 && !selectedChat) {
                    setSelectedChat(rooms[0].id);
                }
            } catch (err) {
                console.error("Failed to fetch chat rooms:", err);
            } finally {
                setIsLoadingRooms(false);
            }
        };
        fetchRooms();
    }, []);

    // Fetch initial messages when room is selected
    useEffect(() => {
        if (!selectedChat) return;

        const fetchMessages = async () => {
            setIsLoadingMessages(true);
            try {
                const msgs = await chatApi.getMessages(selectedChat, 50);
                setMessages(msgs);
            } catch (err) {
                console.error("Failed to fetch messages:", err);
            } finally {
                setIsLoadingMessages(false);
            }
        };
        fetchMessages();
    }, [selectedChat]);

    // WebSocket connection management
    useEffect(() => {
        if (!selectedChat) return;

        const connectWebSocket = () => {
            // Clean up existing connection
            if (socketRef.current) {
                socketRef.current.close();
            }

            const wsUrl = getWsUrl(selectedChat);
            console.log("Connecting to WebSocket:", wsUrl);

            const socket = new WebSocket(wsUrl);
            socketRef.current = socket;

            socket.onopen = () => {
                console.log("WebSocket connected");
                setIsConnected(true);
                setConnectionError(null);
            };

            socket.onmessage = (event) => {
                try {
                    const data: WsIncomingMessage = JSON.parse(event.data);
                    console.log("WebSocket message received:", data);

                    if (data.type === "message" && data.id) {
                        // Regular message from server
                        const newMessage: ChatMessageSchema = {
                            id: data.id,
                            room_id: selectedChat,
                            sender_id: data.sender_id || "",
                            sender_type: data.sender_type || "ems",
                            message: data.message,
                            timestamp: data.timestamp || new Date().toISOString(),
                            is_read: false,
                        };

                        setMessages((prev) => {
                            // Avoid duplicates
                            if (prev.some((m) => m.id === newMessage.id)) {
                                return prev;
                            }
                            return [...prev, newMessage];
                        });
                    } else if (data.type === "system") {
                        // System message (user joined/left)
                        console.log("System message:", data.message);
                    } else if (data.type === "error") {
                        console.error("WebSocket error:", data.message);
                        setConnectionError(data.message);
                    }
                } catch (err) {
                    console.error("Failed to parse WebSocket message:", err);
                }
            };

            socket.onclose = (event) => {
                console.log("WebSocket closed:", event.code, event.reason);
                setIsConnected(false);

                // Attempt to reconnect after 3 seconds (unless intentionally closed)
                if (event.code !== 1000) {
                    reconnectTimeoutRef.current = setTimeout(() => {
                        console.log("Attempting to reconnect...");
                        connectWebSocket();
                    }, 3000);
                }
            };

            socket.onerror = (error) => {
                console.error("WebSocket error:", error);
                setConnectionError("Connection failed");
            };
        };

        connectWebSocket();

        // Cleanup on unmount or room change
        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (socketRef.current) {
                socketRef.current.close(1000, "Room changed or component unmounted");
            }
        };
    }, [selectedChat]);

    const handleSend = () => {
        if (!message.trim() || !selectedChat) return;

        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            // Send via WebSocket
            const wsMessage: WsOutgoingMessage = {
                type: "message",
                sender_id: currentUserId,
                sender_type: currentUserType,
                message: message.trim(),
            };

            socketRef.current.send(JSON.stringify(wsMessage));
            setMessage("");
        } else {
            // Fallback: add locally if WebSocket is not connected
            console.warn("WebSocket not connected, message added locally only");
            const localMessage: ChatMessageSchema = {
                id: `local_${Date.now()}`,
                room_id: selectedChat,
                sender_id: currentUserId,
                sender_type: currentUserType,
                message: message.trim(),
                timestamp: new Date().toISOString(),
                is_read: false,
            };
            setMessages((prev) => [...prev, localMessage]);
            setMessage("");
        }
    };

    const selectedRoom = chatRooms.find((r) => r.id === selectedChat);

    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getRelativeTime = (timestamp: string) => {
        const diff = Date.now() - new Date(timestamp).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return "just now";
        if (minutes < 60) return `${minutes} min ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hr ago`;
        return new Date(timestamp).toLocaleDateString("en-US");
    };

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-slate-900">Chatting</h1>
                <p className="text-slate-500 mt-1">Communicate with hospitals</p>
            </div>

            <div className="grid grid-cols-3 gap-6 h-[calc(100vh-240px)]">
                {/* Chat List */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 border-b border-slate-100">
                        <h2 className="font-medium text-slate-900">Active Chats</h2>
                    </div>
                    {isLoadingRooms ? (
                        <div className="p-8 text-center">
                            <Loader2 className="size-6 text-slate-400 animate-spin mx-auto" />
                        </div>
                    ) : chatRooms.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm">
                            No active chats
                        </div>
                    ) : (
                        <div>
                            {chatRooms.map((room) => {
                                const lastMsg = room.latest_messages?.[0];
                                return (
                                    <button
                                        key={room.id}
                                        onClick={() => setSelectedChat(room.id)}
                                        className={cn(
                                            "w-full p-4 text-left transition-colors border-b border-slate-50",
                                            selectedChat === room.id ? "bg-slate-50" : "hover:bg-slate-50"
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                                                <Building2 className="size-5 text-slate-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <h3 className="font-medium text-slate-900 text-sm truncate">
                                                        Hospital {room.hospital_id}
                                                    </h3>
                                                    <span className="text-xs text-slate-400 flex-shrink-0 ml-2">
                                                        {lastMsg ? getRelativeTime(lastMsg.timestamp) : ""}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 mb-1">Patient: {room.patient_id}</p>
                                                <p className="text-sm text-slate-600 truncate">
                                                    {lastMsg?.message || "No messages yet"}
                                                </p>
                                            </div>
                                            {!room.is_active && (
                                                <span className="bg-slate-200 text-slate-500 text-xs px-2 py-0.5 rounded">
                                                    Closed
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Chat Window */}
                <div className="col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
                    {selectedChat && selectedRoom ? (
                        <>
                            {/* Header */}
                            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h2 className="font-medium text-slate-900">Hospital {selectedRoom.hospital_id}</h2>
                                    <p className="text-sm text-slate-500">Patient: {selectedRoom.patient_id}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isConnected ? (
                                        <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                            <Wifi className="size-3" />
                                            Connected
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                                            <WifiOff className="size-3" />
                                            {connectionError || "Connecting..."}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                                {isLoadingMessages ? (
                                    <div className="flex items-center justify-center h-full">
                                        <Loader2 className="size-6 text-slate-400 animate-spin" />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                                        No messages yet
                                    </div>
                                ) : (
                                    <>
                                        {messages.map((msg) => {
                                            const isOwnMessage =
                                                msg.sender_type === currentUserType ||
                                                msg.sender_id === currentUserId;
                                            return (
                                                <div
                                                    key={msg.id}
                                                    className={cn("flex", isOwnMessage ? "justify-end" : "justify-start")}
                                                >
                                                    <div
                                                        className={cn(
                                                            "max-w-[70%] px-4 py-2.5 rounded-2xl",
                                                            isOwnMessage
                                                                ? "bg-slate-900 text-white rounded-br-md"
                                                                : "bg-white text-slate-900 rounded-bl-md shadow-sm"
                                                        )}
                                                    >
                                                        <p className="text-sm">{msg.message}</p>
                                                        <p
                                                            className={cn(
                                                                "text-xs mt-1",
                                                                isOwnMessage ? "text-slate-400" : "text-slate-400"
                                                            )}
                                                        >
                                                            {formatTime(msg.timestamp)}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div ref={messagesEndRef} />
                                    </>
                                )}
                            </div>

                            {/* Input */}
                            <div className="p-4 border-t border-slate-100 bg-white">
                                <div className="flex gap-2">
                                    <Input
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder={isConnected ? "Type a message..." : "Connecting..."}
                                        disabled={!isConnected}
                                        className="flex-1 h-11 bg-slate-50 border-0 rounded-xl"
                                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                                    />
                                    <Button
                                        onClick={handleSend}
                                        disabled={!isConnected || !message.trim()}
                                        className="h-11 w-11 bg-slate-900 hover:bg-slate-800 rounded-xl disabled:opacity-50"
                                    >
                                        <Send className="size-4" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-400">
                            {isLoadingRooms ? "Loading..." : "Select a chat to start messaging"}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatPage;
