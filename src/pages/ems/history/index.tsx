import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Search,
    MapPin,
    Calendar,
    FileText,
    Loader2,
    X,
    Clock,
    CheckCircle2,
    AlertCircle,
    Building2,
    Ambulance,
    User,
} from "lucide-react";
import { historyApi } from "@/api";

interface HistoryItem {
    patient_id: string;
    patient_name: string;
    disease_code: string;
    severity_code: string;
    hospital_name?: string;
    hospital_id?: string;
    completed_at: string;
    status: string;
}

interface TimelineEvent {
    event: string;
    timestamp: string;
    details?: string;
    actor?: string;
}

const severityConfig: Record<string, string> = {
    KTAS_1: "bg-red-500",
    KTAS_2: "bg-orange-500",
    KTAS_3: "bg-slate-400",
    KTAS_4: "bg-slate-300",
    KTAS_5: "bg-slate-200",
    Critical: "bg-red-500",
    Urgent: "bg-orange-500",
    Standard: "bg-slate-400",
};

const severityLabel: Record<string, string> = {
    KTAS_1: "Critical",
    KTAS_2: "Urgent",
    KTAS_3: "Standard",
    KTAS_4: "Low",
    KTAS_5: "Minor",
};

// Timeline Modal Component
interface TimelineModalProps {
    isOpen: boolean;
    onClose: () => void;
    patientId: string | null;
    patientName: string | null;
}

const TimelineModal = ({ isOpen, onClose, patientId, patientName }: TimelineModalProps) => {
    const [timelineData, setTimelineData] = useState<TimelineEvent[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || !patientId) return;

        const fetchTimeline = async () => {
            setIsLoading(true);
            try {
                const data = await historyApi.getPatientTimeline(patientId);
                setTimelineData(data.events || data || []);
            } catch (error) {
                console.error("Failed to fetch timeline:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTimeline();
    }, [isOpen, patientId]);

    if (!isOpen) return null;

    const getEventIcon = (event: string) => {
        const eventLower = event.toLowerCase();
        if (eventLower.includes("register") || eventLower.includes("created")) {
            return <User className="size-4" />;
        }
        if (eventLower.includes("request") || eventLower.includes("sent")) {
            return <Building2 className="size-4" />;
        }
        if (eventLower.includes("accept")) {
            return <CheckCircle2 className="size-4 text-emerald-500" />;
        }
        if (eventLower.includes("reject") || eventLower.includes("cancel")) {
            return <AlertCircle className="size-4 text-red-500" />;
        }
        if (eventLower.includes("dispatch") || eventLower.includes("en_route")) {
            return <Ambulance className="size-4 text-blue-500" />;
        }
        if (eventLower.includes("complete") || eventLower.includes("transfer")) {
            return <CheckCircle2 className="size-4 text-emerald-500" />;
        }
        return <Clock className="size-4" />;
    };

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        return {
            date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            time: date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        };
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            <div className="relative bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Transfer Timeline</h2>
                        <p className="text-sm text-slate-500">{patientName || patientId}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="size-5 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 max-h-[60vh] overflow-y-auto">
                    {isLoading ? (
                        <div className="py-12 text-center">
                            <Loader2 className="size-6 text-slate-400 animate-spin mx-auto" />
                            <p className="text-sm text-slate-500 mt-3">Loading timeline...</p>
                        </div>
                    ) : timelineData.length === 0 ? (
                        <div className="py-12 text-center text-slate-500">
                            No timeline events found
                        </div>
                    ) : (
                        <div className="relative">
                            {/* Timeline line */}
                            <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-slate-200" />

                            {/* Events */}
                            <div className="space-y-4">
                                {timelineData.map((event, index) => {
                                    const { date, time } = formatTimestamp(event.timestamp);
                                    return (
                                        <div key={index} className="relative flex gap-4">
                                            {/* Icon */}
                                            <div className="relative z-10 w-10 h-10 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center shrink-0">
                                                {getEventIcon(event.event)}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 bg-slate-50 rounded-xl p-3 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="font-medium text-slate-900 text-sm">
                                                        {event.event}
                                                    </p>
                                                    <div className="text-right shrink-0">
                                                        <p className="text-xs text-slate-500">{date}</p>
                                                        <p className="text-xs text-slate-400">{time}</p>
                                                    </div>
                                                </div>
                                                {event.details && (
                                                    <p className="text-sm text-slate-600 mt-1">
                                                        {event.details}
                                                    </p>
                                                )}
                                                {event.actor && (
                                                    <p className="text-xs text-slate-400 mt-1">
                                                        by {event.actor}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t bg-slate-50">
                    <Button onClick={onClose} className="w-full h-11 rounded-xl">
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
};

const HistoryPage = () => {
    const [historyData, setHistoryData] = useState<HistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [selectedPatientName, setSelectedPatientName] = useState<string | null>(null);
    const [isTimelineOpen, setIsTimelineOpen] = useState(false);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const data = await historyApi.getHistory({ days: 30, limit: 50 });
                // Handle different response formats
                let items: HistoryItem[] = [];
                if (Array.isArray(data)) {
                    items = data;
                } else if (data && typeof data === "object") {
                    items = data.items || data.records || data.history || [];
                }
                setHistoryData(items);
            } catch (err) {
                console.error("Failed to fetch history:", err);
                setHistoryData([]); // Reset to empty array on error
            } finally {
                setIsLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const filteredData = (historyData || []).filter(
        (item) =>
            item.patient_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.disease_code?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const openTimeline = (patientId: string, patientName: string) => {
        setSelectedPatientId(patientId);
        setSelectedPatientName(patientName);
        setIsTimelineOpen(true);
    };

    return (
        <div className="max-w-4xl">
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-slate-900">History</h1>
                <p className="text-slate-500 mt-1">View completed dispatch records</p>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <Input
                    placeholder="Search by patient ID, name, disease code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-11 pl-11 bg-white border-slate-200 rounded-xl"
                />
            </div>

            {/* History List */}
            {isLoading ? (
                <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
                    <Loader2 className="size-8 text-slate-400 animate-spin mx-auto" />
                    <p className="text-slate-400 mt-4">Loading history...</p>
                </div>
            ) : filteredData.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
                    <p className="text-slate-400">No history records found</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-100">
                    {filteredData.map((item) => {
                        const severityColor = severityConfig[item.severity_code] || "bg-slate-400";
                        const severityText = severityLabel[item.severity_code] || item.severity_code;

                        return (
                            <div
                                key={item.patient_id}
                                className="p-4 flex items-center hover:bg-slate-50 transition-colors cursor-pointer"
                                onClick={() => openTimeline(item.patient_id, item.patient_name)}
                            >
                                <div className={`w-1 h-10 rounded-full ${severityColor} mr-4`} />

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-slate-900">
                                            {item.patient_name}
                                        </span>
                                        <span className="text-slate-300">·</span>
                                        <span className="text-slate-600 truncate">
                                            {item.disease_code}
                                        </span>
                                        <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded">
                                            {severityText}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <MapPin className="size-3.5" />
                                            {item.hospital_name || item.hospital_id || "N/A"}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="size-3.5" />
                                            {new Date(item.completed_at).toLocaleString("en-US")}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
                                        {item.status}
                                    </span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openTimeline(item.patient_id, item.patient_name);
                                        }}
                                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        <FileText className="size-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Timeline Modal */}
            <TimelineModal
                isOpen={isTimelineOpen}
                onClose={() => {
                    setIsTimelineOpen(false);
                    setSelectedPatientId(null);
                    setSelectedPatientName(null);
                }}
                patientId={selectedPatientId}
                patientName={selectedPatientName}
            />
        </div>
    );
};

export default HistoryPage;
