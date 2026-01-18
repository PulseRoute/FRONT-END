import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Clock,
    MapPin,
    User,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Loader2,
    Activity,
} from "lucide-react";
import { hospitalApi, requestApi, type TransferRequestResponse } from "@/api";

const severityConfig: Record<string, { bg: string; text: string; label: string }> = {
    KTAS_1: { bg: "bg-red-100", text: "text-red-700", label: "Critical" },
    KTAS_2: { bg: "bg-orange-100", text: "text-orange-700", label: "Urgent" },
    KTAS_3: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Standard" },
    KTAS_4: { bg: "bg-blue-100", text: "text-blue-700", label: "Low" },
    KTAS_5: { bg: "bg-slate-100", text: "text-slate-700", label: "Minor" },
};

const HospitalDashboardPage = () => {
    const [pendingRequests, setPendingRequests] = useState<TransferRequestResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState("");

    const fetchPendingRequests = async () => {
        try {
            const data = await hospitalApi.getPendingRequests();
            setPendingRequests(data);
        } catch (err) {
            console.error("Failed to fetch pending requests:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingRequests();
        // 30초마다 새로고침
        const interval = setInterval(fetchPendingRequests, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleAccept = async (requestId: string) => {
        setProcessingId(requestId);
        try {
            await requestApi.accept(requestId);
            setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
        } catch (err) {
            console.error("Failed to accept request:", err);
            alert("Failed to accept request.");
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (requestId: string) => {
        if (!rejectReason.trim()) {
            alert("Please enter a rejection reason.");
            return;
        }
        setProcessingId(requestId);
        try {
            await requestApi.reject(requestId, {
                status: "rejected",
                rejection_reason: rejectReason,
            });
            setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
            setRejectingId(null);
            setRejectReason("");
        } catch (err) {
            console.error("Failed to reject request:", err);
            alert("Failed to reject request.");
        } finally {
            setProcessingId(null);
        }
    };

    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <div className="max-w-4xl">
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-slate-900">Pending Requests</h1>
                <p className="text-slate-500 mt-1">
                    {pendingRequests.length} transfer request(s) awaiting response
                </p>
            </div>

            {isLoading ? (
                <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
                    <Loader2 className="size-8 text-slate-400 animate-spin mx-auto" />
                    <p className="text-slate-400 mt-4">Loading requests...</p>
                </div>
            ) : pendingRequests.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
                    <CheckCircle className="size-12 text-emerald-400 mx-auto mb-4" />
                    <p className="text-slate-600 font-medium">No pending requests</p>
                    <p className="text-slate-400 text-sm mt-1">All transfer requests have been processed</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {pendingRequests.map((request) => {
                        const severity = severityConfig[request.status] || severityConfig.KTAS_3;

                        return (
                            <div
                                key={request.id}
                                className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                                            <Activity className="size-6 text-slate-600" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold text-slate-900">
                                                    Patient: {request.patient_id}
                                                </h3>
                                                <span
                                                    className={`px-2 py-0.5 rounded text-xs font-medium ${severity.bg} ${severity.text}`}
                                                >
                                                    {severity.label}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <User className="size-3.5" />
                                                    EMS: {request.ems_unit_id}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="size-3.5" />
                                                    {formatTime(request.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {request.ml_score && (
                                        <div className="text-right">
                                            <span className="text-2xl font-bold text-emerald-600">
                                                {Math.round(request.ml_score * 100)}%
                                            </span>
                                            <p className="text-xs text-slate-400">Match Score</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-6 mb-4 py-3 px-4 bg-slate-50 rounded-xl">
                                    {request.distance_km && (
                                        <div className="flex items-center gap-2">
                                            <MapPin className="size-4 text-slate-400" />
                                            <span className="text-sm text-slate-600">
                                                {request.distance_km.toFixed(1)} km
                                            </span>
                                        </div>
                                    )}
                                    {request.estimated_time_minutes && (
                                        <div className="flex items-center gap-2">
                                            <Clock className="size-4 text-slate-400" />
                                            <span className="text-sm text-slate-600">
                                                ETA: {request.estimated_time_minutes} min
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {rejectingId === request.id ? (
                                    <div className="space-y-3">
                                        <Input
                                            placeholder="Enter rejection reason..."
                                            value={rejectReason}
                                            onChange={(e) => setRejectReason(e.target.value)}
                                            className="h-11 bg-slate-50 border-slate-200 rounded-xl"
                                        />
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={() => handleReject(request.id)}
                                                disabled={processingId === request.id}
                                                className="flex-1 h-11 bg-red-500 hover:bg-red-600 rounded-xl"
                                            >
                                                {processingId === request.id ? (
                                                    <Loader2 className="size-4 animate-spin" />
                                                ) : (
                                                    "Confirm Reject"
                                                )}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    setRejectingId(null);
                                                    setRejectReason("");
                                                }}
                                                className="h-11 rounded-xl"
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-3">
                                        <Button
                                            onClick={() => handleAccept(request.id)}
                                            disabled={processingId === request.id}
                                            className="flex-1 h-11 bg-emerald-500 hover:bg-emerald-600 rounded-xl gap-2"
                                        >
                                            {processingId === request.id ? (
                                                <Loader2 className="size-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <CheckCircle className="size-4" />
                                                    Accept
                                                </>
                                            )}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => setRejectingId(request.id)}
                                            disabled={processingId === request.id}
                                            className="flex-1 h-11 rounded-xl gap-2 border-red-200 text-red-600 hover:bg-red-50"
                                        >
                                            <XCircle className="size-4" />
                                            Reject
                                        </Button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default HospitalDashboardPage;
