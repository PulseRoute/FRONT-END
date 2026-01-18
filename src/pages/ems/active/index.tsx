import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
    MessageSquare,
    MapPin,
    Clock,
    ChevronRight,
    RefreshCw,
    X,
    Navigation,
    Building2,
    AlertCircle,
    CheckCircle2,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { patientApi, type PatientResponse, type PatientRequestsResponse } from "@/api";

// Fix default marker icon issue in Leaflet
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: () => string })._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom icon for patient location (blue dot)
const patientLocationIcon = L.divIcon({
    className: "patient-location-marker",
    html: `<div style="
        width: 20px;
        height: 20px;
        background: #3b82f6;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.5);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
});

// Status configurations including 'searching' for when matching is pending
const statusConfig = {
    searching: {
        label: "Searching",
        bg: "bg-purple-50",
        text: "text-purple-600",
        dot: "bg-purple-500",
    },
    pending: {
        label: "Pending",
        bg: "bg-amber-50",
        text: "text-amber-600",
        dot: "bg-amber-500",
    },
    accepted: {
        label: "Accepted",
        bg: "bg-emerald-50",
        text: "text-emerald-600",
        dot: "bg-emerald-500",
    },
    en_route: {
        label: "En Route",
        bg: "bg-blue-50",
        text: "text-blue-600",
        dot: "bg-blue-500",
    },
    rejected: {
        label: "Rejected",
        bg: "bg-red-50",
        text: "text-red-600",
        dot: "bg-red-500",
    },
};

const severityConfig: Record<string, { bg: string; text: string }> = {
    KTAS_1: { bg: "bg-red-500", text: "text-white" },
    KTAS_2: { bg: "bg-orange-500", text: "text-white" },
    KTAS_3: { bg: "bg-yellow-500", text: "text-white" },
    KTAS_4: { bg: "bg-green-500", text: "text-white" },
    KTAS_5: { bg: "bg-blue-500", text: "text-white" },
    Critical: { bg: "bg-red-500", text: "text-white" },
    Urgent: { bg: "bg-orange-500", text: "text-white" },
    Standard: { bg: "bg-slate-500", text: "text-white" },
};


// Component to handle map view changes
const MapUpdater = ({ center }: { center: [number, number] | null }) => {
    const map = useMap();
    if (center) {
        map.flyTo(center, 14);
    }
    return null;
};

interface MapModalProps {
    isOpen: boolean;
    onClose: () => void;
    patient: PatientResponse | null;
    onRetryMatch: () => void;
    onSelectHospital: (hospitalId: string) => void;
    isRetrying: boolean;
}

const MapModal = ({
    isOpen,
    onClose,
    patient,
    onRetryMatch,
    onSelectHospital,
    isRetrying,
}: MapModalProps) => {
    const [selectedHospital, setSelectedHospital] = useState<string | null>(null);
    const [mapCenter] = useState<[number, number] | null>(null);

    if (!isOpen || !patient) return null;

    const patientLocation: [number, number] = [
        patient.location.latitude,
        patient.location.longitude,
    ];

    const hospitals = patient.matched_hospitals || [];

    const handleNavigate = (address: string, name: string) => {
        const origin = `${patient.location.latitude},${patient.location.longitude}`;
        const destination = encodeURIComponent(address || name);
        const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
        window.open(url, "_blank");
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">
                            {hospitals.length > 0 ? "병원 선택" : "병원 재매칭"}
                        </h2>
                        <p className="text-sm text-slate-500">
                            {patient.name} · {patient.disease_code} · {patient.severity_code}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="size-5 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex h-[65vh]">
                    {/* Left: Hospital List */}
                    <div className="w-80 border-r overflow-y-auto p-4 space-y-4">
                        {/* Info */}
                        {hospitals.length > 0 ? (
                            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                                <AlertCircle className="size-5 text-blue-600 shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <p className="font-medium text-blue-800">추천 병원 목록</p>
                                    <p className="text-blue-700 mt-1">
                                        ML이 추천한 {hospitals.length}개의 병원이 있습니다
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl">
                                <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <p className="font-medium text-amber-800">매칭된 병원 없음</p>
                                    <p className="text-amber-700 mt-1">
                                        자동 재매칭을 시도하세요
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Retry Match Button */}
                        <Button
                            onClick={onRetryMatch}
                            disabled={isRetrying}
                            className="w-full h-11 bg-blue-500 hover:bg-blue-600 rounded-xl gap-2"
                        >
                            <RefreshCw className={`size-4 ${isRetrying ? "animate-spin" : ""}`} />
                            {isRetrying ? "재매칭 중..." : "자동 재매칭 시도"}
                        </Button>

                        {hospitals.length > 0 && (
                            <>
                                <div className="relative py-2">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-slate-200" />
                                    </div>
                                    <div className="relative flex justify-center">
                                        <span className="bg-white px-3 text-xs text-slate-500">
                                            추천 병원 선택
                                        </span>
                                    </div>
                                </div>

                                {/* Hospital List */}
                                <div className="space-y-2">
                                    {hospitals.map((hospital) => (
                                        <button
                                            key={hospital.hospital_id}
                                            onClick={() => setSelectedHospital(hospital.hospital_id)}
                                            className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                                                selectedHospital === hospital.hospital_id
                                                    ? "border-blue-500 bg-blue-50"
                                                    : "border-slate-200 hover:border-slate-300"
                                            }`}
                                        >
                                            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-emerald-100">
                                                <Building2 className="size-4 text-emerald-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-slate-900 text-sm truncate">
                                                    {hospital.name}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    {hospital.distance_km ? `${hospital.distance_km.toFixed(1)}km` : "거리 정보 없음"}
                                                    {hospital.estimated_time_minutes && ` · ${hospital.estimated_time_minutes}분`}
                                                </p>
                                                {hospital.total_beds && (
                                                    <p className="text-xs text-emerald-600 mt-0.5">
                                                        {hospital.total_beds} beds
                                                    </p>
                                                )}
                                                {hospital.ml_score && (
                                                    <p className="text-xs text-blue-600 mt-0.5">
                                                        추천도: {(hospital.ml_score / 1000).toFixed(1)}
                                                    </p>
                                                )}
                                                {hospital.has_trauma_center && (
                                                    <span className="inline-block text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded mt-1">
                                                        Trauma Center
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Right: Map */}
                    <div className="flex-1 relative">
                        <MapContainer
                            center={patientLocation}
                            zoom={13}
                            className="h-full w-full"
                            style={{ height: "100%", width: "100%" }}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <MapUpdater center={mapCenter} />

                            {/* Patient Location */}
                            <Marker position={patientLocation} icon={patientLocationIcon}>
                                <Popup>
                                    <div className="p-1">
                                        <h3 className="font-semibold text-blue-600">환자 위치</h3>
                                        <p className="text-sm text-slate-700">{patient.name}</p>
                                        <p className="text-xs text-slate-500">
                                            {patient.location.latitude.toFixed(4)},{" "}
                                            {patient.location.longitude.toFixed(4)}
                                        </p>
                                    </div>
                                </Popup>
                            </Marker>
                        </MapContainer>

                        {/* Selected Hospital Info */}
                        {selectedHospital && (
                            <div className="absolute bottom-4 left-4 right-4 bg-white rounded-xl p-4 shadow-lg border border-slate-200">
                                {hospitals.find(h => h.hospital_id === selectedHospital) && (() => {
                                    const hospital = hospitals.find(h => h.hospital_id === selectedHospital)!;
                                    return (
                                        <div>
                                            <h4 className="font-semibold text-slate-900">{hospital.name}</h4>
                                            <p className="text-sm text-slate-500 mt-1">{hospital.address || "주소 정보 없음"}</p>
                                            {hospital.recommendation_reason && (
                                                <p className="text-xs text-blue-600 mt-2">{hospital.recommendation_reason}</p>
                                            )}
                                            {hospital.address && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleNavigate(hospital.address!, hospital.name)}
                                                    className="w-full mt-3 h-9 gap-2"
                                                >
                                                    <Navigation className="size-4" />
                                                    구글 맵으로 네비게이션
                                                </Button>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-5 border-t bg-slate-50">
                    <Button variant="outline" onClick={onClose} className="flex-1 h-11 rounded-xl">
                        취소
                    </Button>
                    <Button
                        onClick={() => selectedHospital && onSelectHospital(selectedHospital)}
                        disabled={!selectedHospital}
                        className="flex-1 h-11 bg-slate-900 hover:bg-slate-800 rounded-xl gap-2"
                    >
                        <Building2 className="size-4" />
                        선택한 병원으로 요청 보내기
                    </Button>
                </div>
            </div>
        </div>
    );
};

// Detail Modal Component
interface DetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    patient: PatientResponse | null;
}

const DetailModal = ({ isOpen, onClose, patient }: DetailModalProps) => {
    const [requestsData, setRequestsData] = useState<PatientRequestsResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || !patient) return;

        const fetchRequests = async () => {
            setIsLoading(true);
            try {
                const data = await patientApi.getRequests(patient.id);
                setRequestsData(data);
            } catch (error) {
                console.error("Failed to fetch patient requests:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRequests();
    }, [isOpen, patient]);

    if (!isOpen || !patient) return null;

    const severity = severityConfig[patient.severity_code] || severityConfig.Standard;

    const getRequestStatusStyle = (status: string) => {
        switch (status) {
            case "pending":
                return "bg-amber-100 text-amber-700";
            case "accepted":
                return "bg-emerald-100 text-emerald-700";
            case "rejected":
                return "bg-red-100 text-red-700";
            case "cancelled":
                return "bg-slate-100 text-slate-500";
            default:
                return "bg-slate-100 text-slate-600";
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            <div className="relative bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Patient Details</h2>
                        <p className="text-sm text-slate-500">{patient.id}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="size-5 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
                    {/* Patient Info */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                            Patient Information
                        </h3>
                        <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-600">Name</span>
                                <span className="font-medium text-slate-900">{patient.name}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-600">Age / Gender</span>
                                <span className="font-medium text-slate-900">
                                    {patient.age}세 / {patient.gender === "M" ? "Male" : "Female"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-600">Disease Code</span>
                                <span className="font-medium text-slate-900">{patient.disease_code}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-600">Severity</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${severity.bg} ${severity.text}`}>
                                    {patient.severity_code}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-600">Location</span>
                                <span className="font-medium text-slate-900 text-sm">
                                    {patient.location.latitude.toFixed(4)}, {patient.location.longitude.toFixed(4)}
                                </span>
                            </div>
                            {patient.vital_signs && (
                                <>
                                    <div className="border-t border-slate-200 pt-3 mt-3">
                                        <span className="text-xs text-slate-500 uppercase">Vital Signs</span>
                                    </div>
                                    {patient.vital_signs.blood_pressure && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-600">Blood Pressure</span>
                                            <span className="font-medium text-slate-900">
                                                {patient.vital_signs.blood_pressure}
                                            </span>
                                        </div>
                                    )}
                                    {patient.vital_signs.pulse && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-600">Pulse</span>
                                            <span className="font-medium text-slate-900">
                                                {patient.vital_signs.pulse} bpm
                                            </span>
                                        </div>
                                    )}
                                    {patient.vital_signs.temperature && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-600">Temperature</span>
                                            <span className="font-medium text-slate-900">
                                                {patient.vital_signs.temperature}°C
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Hospital Requests */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                            Hospital Requests
                        </h3>
                        {isLoading ? (
                            <div className="bg-slate-50 rounded-xl p-8 text-center">
                                <RefreshCw className="size-5 text-slate-400 animate-spin mx-auto" />
                                <p className="text-sm text-slate-500 mt-2">Loading requests...</p>
                            </div>
                        ) : requestsData?.requests && requestsData.requests.length > 0 ? (
                            <div className="space-y-2">
                                {requestsData.requests.map((req: any) => (
                                    <div
                                        key={req.id}
                                        className="bg-slate-50 rounded-xl p-3 flex items-center justify-between"
                                    >
                                        <div>
                                            <p className="font-medium text-slate-900 text-sm">
                                                {req.hospital_name || req.hospital_id}
                                            </p>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                                {req.distance_km && (
                                                    <span>{req.distance_km.toFixed(1)} km</span>
                                                )}
                                                {req.estimated_time_minutes && (
                                                    <span>ETA: {req.estimated_time_minutes} min</span>
                                                )}
                                                {req.ml_score && (
                                                    <span className="text-emerald-600">
                                                        {Math.round(req.ml_score * 100)}% match
                                                    </span>
                                                )}
                                            </div>
                                            {req.rejection_reason && (
                                                <p className="text-xs text-red-500 mt-1">
                                                    Reason: {req.rejection_reason}
                                                </p>
                                            )}
                                        </div>
                                        <span
                                            className={`px-2 py-1 rounded text-xs font-medium capitalize ${getRequestStatusStyle(req.status)}`}
                                        >
                                            {req.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-slate-50 rounded-xl p-4 text-center text-sm text-slate-500">
                                No hospital requests yet
                            </div>
                        )}
                    </div>
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

const ActiveCasesPage = () => {
    const navigate = useNavigate();
    const [activeCases, setActiveCases] = useState<PatientResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedPatient, setSelectedPatient] = useState<PatientResponse | null>(null);
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);
    const [detailPatient, setDetailPatient] = useState<PatientResponse | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // Fetch active cases from API
    useEffect(() => {
        const fetchActiveCases = async () => {
            setIsLoading(true);
            try {
                const response = await patientApi.getPatients();
                setActiveCases(response.patients);
            } catch (error) {
                console.error("Failed to fetch active cases:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchActiveCases();
    }, []);

    const handleRetryMatch = async () => {
        if (!selectedPatient) return;

        setIsRetrying(true);
        try {
            const updatedPatient = await patientApi.retryMatch(selectedPatient.id);
            setActiveCases((prev) =>
                prev.map((c) => (c.id === updatedPatient.id ? updatedPatient : c))
            );
            if (updatedPatient.status !== "searching") {
                setIsMapModalOpen(false);
                setSelectedPatient(null);
            }
        } catch (error) {
            console.error("Retry match failed:", error);
        } finally {
            setIsRetrying(false);
        }
    };

    const handleSelectHospital = async (hospitalId: string) => {
        if (!selectedPatient) return;

        const hospital = selectedPatient.matched_hospitals?.find(h => h.hospital_id === hospitalId);
        if (!hospital) return;

        try {
            await patientApi.createTransferRequest(selectedPatient.id, {
                hospital_id: hospital.hospital_id,
                hospital_name: hospital.name,
                hospital_address: hospital.address || undefined,
                ml_score: hospital.ml_score || undefined,
                distance_km: hospital.distance_km || undefined,
                estimated_time_minutes: hospital.estimated_time_minutes || undefined,
                recommendation_reason: hospital.recommendation_reason || undefined,
                total_beds: hospital.total_beds || undefined,
                has_trauma_center: hospital.has_trauma_center || undefined,
            });

            // Refresh the active cases list
            const response = await patientApi.getPatients();
            setActiveCases(response.patients);

            setIsMapModalOpen(false);
            setSelectedPatient(null);
        } catch (error) {
            console.error("Failed to create transfer request:", error);
            alert("병원 요청 생성에 실패했습니다. 다시 시도해주세요.");
        }
    };

    const handleCompleteTransfer = async (patientId: string) => {
        try {
            const updatedPatient = await patientApi.completeTransfer(patientId);
            // Remove from active cases since it's now transferred
            setActiveCases((prev) => prev.filter((c) => c.id !== updatedPatient.id));
        } catch (error) {
            console.error("Failed to complete transfer:", error);
        }
    };

    const openRetryModal = (patient: PatientResponse) => {
        setSelectedPatient(patient);
        setIsMapModalOpen(true);
    };

    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    if (isLoading) {
        return (
            <div className="max-w-4xl flex items-center justify-center py-20">
                <RefreshCw className="size-6 text-slate-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl">
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-slate-900">Active Cases</h1>
                <p className="text-slate-500 mt-1">
                    {activeCases.length} dispatch(es) in progress
                </p>
            </div>

            <div className="space-y-3">
                {activeCases.map((caseItem) => {
                    const status =
                        statusConfig[caseItem.status as keyof typeof statusConfig] ||
                        statusConfig.pending;
                    const severity =
                        severityConfig[caseItem.severity_code] || severityConfig.Standard;

                    return (
                        <div
                            key={caseItem.id}
                            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                    <div
                                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${severity.bg} ${severity.text}`}
                                    >
                                        {caseItem.severity_code}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-slate-900">
                                                {caseItem.name}
                                            </h3>
                                            <span className="text-slate-300">·</span>
                                            <span className="text-slate-600">
                                                {caseItem.disease_code}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-slate-500">
                                            <span className="flex items-center gap-1.5">
                                                <MapPin className="size-3.5" />
                                                {caseItem.location.latitude.toFixed(4)},{" "}
                                                {caseItem.location.longitude.toFixed(4)}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Clock className="size-3.5" />
                                                {caseItem.age}세 /{" "}
                                                {caseItem.gender === "M" ? "남" : "여"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${status.bg}`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                                    <span className={`text-sm font-medium ${status.text}`}>
                                        {status.label}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                                {/* Show retry/select buttons for searching or pending status */}
                                {(caseItem.status === "searching" || caseItem.status === "pending") && (
                                    <>
                                        <Button
                                            size="sm"
                                            onClick={() => openRetryModal(caseItem)}
                                            className="h-9 bg-purple-600 hover:bg-purple-700 rounded-lg gap-1.5"
                                        >
                                            <RefreshCw className="size-4" />
                                            Retry Match
                                        </Button>
                                        {caseItem.matched_hospitals && caseItem.matched_hospitals.length > 0 && (
                                            <Button
                                                size="sm"
                                                onClick={() => openRetryModal(caseItem)}
                                                className="h-9 bg-blue-600 hover:bg-blue-700 rounded-lg gap-1.5"
                                            >
                                                <Building2 className="size-4" />
                                                Select Hospital
                                            </Button>
                                        )}
                                    </>
                                )}

                                {caseItem.status === "accepted" && (
                                    <>
                                        <Button
                                            size="sm"
                                            onClick={() => navigate("/ems/chat")}
                                            className="h-9 bg-slate-900 hover:bg-slate-800 rounded-lg gap-1.5"
                                        >
                                            <MessageSquare className="size-4" />
                                            Chat
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => handleCompleteTransfer(caseItem.id)}
                                            className="h-9 bg-emerald-600 hover:bg-emerald-700 rounded-lg gap-1.5"
                                        >
                                            <CheckCircle2 className="size-4" />
                                            Complete
                                        </Button>
                                    </>
                                )}

                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                        setDetailPatient(caseItem);
                                        setIsDetailModalOpen(true);
                                    }}
                                    className="h-9 rounded-lg text-slate-600 hover:text-slate-900 gap-1"
                                >
                                    View Details
                                    <ChevronRight className="size-4" />
                                </Button>
                                <span className="ml-auto text-xs text-slate-400">
                                    Dispatched at {formatTime(caseItem.created_at)}
                                </span>
                            </div>
                        </div>
                    );
                })}

                {activeCases.length === 0 && (
                    <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
                        <p className="text-slate-400">No active cases</p>
                    </div>
                )}
            </div>

            {/* Map Modal for Retry Match */}
            <MapModal
                isOpen={isMapModalOpen}
                onClose={() => {
                    setIsMapModalOpen(false);
                    setSelectedPatient(null);
                }}
                patient={selectedPatient}
                onRetryMatch={handleRetryMatch}
                onSelectHospital={handleSelectHospital}
                isRetrying={isRetrying}
            />

            {/* Detail Modal */}
            <DetailModal
                isOpen={isDetailModalOpen}
                onClose={() => {
                    setIsDetailModalOpen(false);
                    setDetailPatient(null);
                }}
                patient={detailPatient}
            />
        </div>
    );
};

export default ActiveCasesPage;
