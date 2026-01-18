import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Clock, ChevronRight, AlertCircle, Navigation, TestTube2, Loader2, Building2 } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { patientApi, type PatientResponse, type MatchedHospitalSchema } from "@/api";

// Test location for development (San Francisco)
const TEST_LOCATION = { lat: 37.7749, lng: -122.4194 };

// Fix default marker icon issue in Leaflet
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: () => string })._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom icon for current location (blue dot)
const currentLocationIcon = L.divIcon({
    className: "current-location-marker",
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

// Custom icon for hospitals (green marker)
const hospitalIcon = L.divIcon({
    className: "hospital-marker",
    html: `<div style="
        width: 32px;
        height: 32px;
        background: #10b981;
        border: 3px solid white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 14px;
    ">H</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
});


// Map controller component for GPS functionality
const LocationControl = ({
    onLocate,
    onTestLocate,
    isLocating,
}: {
    onLocate: () => void;
    onTestLocate: () => void;
    isLocating: boolean;
}) => {
    return (
        <div className="absolute bottom-5 left-5 z-[1000] flex flex-col gap-2">
            <button
                onClick={onLocate}
                disabled={isLocating}
                className="w-10 h-10 bg-white rounded-xl shadow-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors disabled:opacity-50"
                title="Use GPS location"
            >
                <Navigation className={`size-5 text-blue-600 ${isLocating ? "animate-pulse" : ""}`} />
            </button>
            <button
                onClick={onTestLocate}
                className="w-10 h-10 bg-white rounded-xl shadow-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
                title="Use test location (San Francisco)"
            >
                <TestTube2 className="size-5 text-orange-500" />
            </button>
        </div>
    );
};

// Component to handle map view changes
const MapUpdater = ({ center }: { center: [number, number] | null }) => {
    const map = useMap();
    if (center) {
        map.flyTo(center, 14);
    }
    return null;
};


const severityMap: Record<string, string> = {
    Critical: "KTAS_1",
    Urgent: "KTAS_2",
    Standard: "KTAS_3",
};

const DispatchPage = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState<"input" | "hospitals">("input");
    const [patientInfo, setPatientInfo] = useState({
        name: "",
        age: "",
        gender: "M",
        chiefComplaint: "",
        diseaseCode: "",
        severity: "",
    });
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [registeredPatient, setRegisteredPatient] = useState<PatientResponse | null>(null);

    const getLocationAndRegister = async (location: { lat: number; lng: number }) => {
        setIsSubmitting(true);
        try {
            const response = await patientApi.register({
                name: patientInfo.name || "Patient",
                age: parseInt(patientInfo.age) || 30,
                gender: patientInfo.gender,
                disease_code: patientInfo.diseaseCode || "R00",
                severity_code: severityMap[patientInfo.severity] || "KTAS_3",
                location: {
                    latitude: location.lat,
                    longitude: location.lng,
                },
            });
            setRegisteredPatient(response);
            setStep("hospitals");
        } catch (err) {
            setError("Failed to register patient. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // 이미 위치가 있으면 바로 등록
        if (currentLocation) {
            await getLocationAndRegister(currentLocation);
            return;
        }

        // Request GPS permission if no location
        if (!navigator.geolocation) {
            setError("GPS is not supported by this browser. Please use the test location.");
            return;
        }

        setIsLocating(true);
        setIsSubmitting(true);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
                setCurrentLocation(loc);
                setMapCenter([loc.lat, loc.lng]);
                setIsLocating(false);

                // 위치를 가져온 후 바로 등록 진행
                await getLocationAndRegister(loc);
            },
            (geoError) => {
                console.error("Geolocation error:", geoError);
                setIsLocating(false);
                setIsSubmitting(false);

                if (geoError.code === geoError.PERMISSION_DENIED) {
                    setError("Location permission denied. Please allow location access in browser settings or use the test location button below.");
                } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
                    setError("Unable to retrieve location. Please use the test location.");
                } else if (geoError.code === geoError.TIMEOUT) {
                    setError("Location request timed out. Please try again.");
                } else {
                    setError("Error getting location. Please use the test location.");
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    };

    const handleSendRequest = async (hospitalId: string) => {
        if (!registeredPatient) return;

        const hospital = registeredPatient.matched_hospitals?.find(h => h.hospital_id === hospitalId);
        if (!hospital) return;

        try {
            await patientApi.createTransferRequest(registeredPatient.id, {
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
            navigate("/ems/chat");
        } catch (err) {
            console.error("Failed to send request:", err);
            alert("Failed to send request. Please try again.");
        }
    };

    const handleLocate = () => {
        setIsLocating(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
                    setCurrentLocation(loc);
                    setMapCenter([loc.lat, loc.lng]);
                    setIsLocating(false);
                },
                (error) => {
                    console.error("Geolocation error:", error);
                    alert("Could not get your location. Try the test location button.");
                    setIsLocating(false);
                }
            );
        } else {
            alert("Geolocation is not supported by your browser");
            setIsLocating(false);
        }
    };

    const handleTestLocate = () => {
        setCurrentLocation(TEST_LOCATION);
        setMapCenter([TEST_LOCATION.lat, TEST_LOCATION.lng]);
    };

    const handleHospitalClick = (hospital: MatchedHospitalSchema) => {
        if (hospital.latitude != null && hospital.longitude != null) {
            setMapCenter([hospital.latitude, hospital.longitude]);
        }
    };

    return (
        <div className="max-w-6xl">
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-slate-900">Dispatch</h1>
                <p className="text-slate-500 mt-1">Register patient and find matching hospitals</p>
            </div>

            {step === "input" ? (
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                            <AlertCircle className="size-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-slate-900">Patient Information</h2>
                            <p className="text-sm text-slate-500">Enter patient details to find the best hospital</p>
                        </div>
                    </div>

                    <form onSubmit={handleSearch} className="space-y-5">
                        {error && (
                            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-1">
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Patient Name
                                </label>
                                <Input
                                    placeholder="John Doe"
                                    value={patientInfo.name}
                                    onChange={(e) =>
                                        setPatientInfo({ ...patientInfo, name: e.target.value })
                                    }
                                    className="h-12 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-slate-900"
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Age
                                </label>
                                <Input
                                    type="number"
                                    placeholder="45"
                                    value={patientInfo.age}
                                    onChange={(e) =>
                                        setPatientInfo({ ...patientInfo, age: e.target.value })
                                    }
                                    className="h-12 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-slate-900"
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Gender
                                </label>
                                <div className="flex gap-2">
                                    {["M", "F"].map((g) => (
                                        <button
                                            key={g}
                                            type="button"
                                            onClick={() => setPatientInfo({ ...patientInfo, gender: g })}
                                            className={`flex-1 h-12 rounded-xl text-sm font-medium transition-all ${
                                                patientInfo.gender === g
                                                    ? "bg-slate-900 text-white"
                                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                            }`}
                                        >
                                            {g === "M" ? "Male" : "Female"}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Chief Complaint
                            </label>
                            <Input
                                placeholder="e.g., Chest pain, Difficulty breathing"
                                value={patientInfo.chiefComplaint}
                                onChange={(e) =>
                                    setPatientInfo({ ...patientInfo, chiefComplaint: e.target.value })
                                }
                                className="h-12 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-slate-900"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Disease Code (ICD-10)
                            </label>
                            <Input
                                placeholder="e.g., I21.0 (Acute MI)"
                                value={patientInfo.diseaseCode}
                                onChange={(e) =>
                                    setPatientInfo({ ...patientInfo, diseaseCode: e.target.value })
                                }
                                className="h-12 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-slate-900"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Severity Level (KTAS)
                            </label>
                            <div className="flex gap-3">
                                {[
                                    { level: "Critical", color: "red", label: "Critical (KTAS 1)" },
                                    { level: "Urgent", color: "orange", label: "Urgent (KTAS 2)" },
                                    { level: "Standard", color: "slate", label: "Standard (KTAS 3)" },
                                ].map(({ level, color, label }) => (
                                    <button
                                        key={level}
                                        type="button"
                                        onClick={() => setPatientInfo({ ...patientInfo, severity: level })}
                                        className={`flex-1 py-3.5 rounded-xl text-sm font-medium transition-all ${
                                            patientInfo.severity === level
                                                ? color === "red"
                                                    ? "bg-red-500 text-white"
                                                    : color === "orange"
                                                      ? "bg-orange-500 text-white"
                                                      : "bg-slate-900 text-white"
                                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {currentLocation ? (
                            <div className="p-3 bg-blue-50 rounded-xl text-sm text-blue-700 flex items-center justify-between">
                                <span>Current Location: {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}</span>
                                <button
                                    type="button"
                                    onClick={() => setCurrentLocation(null)}
                                    className="text-blue-500 hover:text-blue-700 text-xs underline"
                                >
                                    Reset
                                </button>
                            </div>
                        ) : (
                            <div className="p-3 bg-slate-50 rounded-xl">
                                <p className="text-sm text-slate-600 mb-2">
                                    Location required. Click the button to request GPS permission.
                                </p>
                                <button
                                    type="button"
                                    onClick={handleTestLocate}
                                    className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700"
                                >
                                    <TestTube2 className="size-4" />
                                    Use Test Location (San Francisco)
                                </button>
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={isSubmitting || isLocating}
                            className="w-full h-12 mt-2 bg-slate-900 hover:bg-slate-800 rounded-xl text-[15px] disabled:opacity-50"
                        >
                            {isLocating ? (
                                <>
                                    <Loader2 className="size-4 mr-2 animate-spin" />
                                    Getting Location...
                                </>
                            ) : isSubmitting ? (
                                <>
                                    <Loader2 className="size-4 mr-2 animate-spin" />
                                    Registering...
                                </>
                            ) : (
                                <>
                                    <Search className="size-4 mr-2" />
                                    Register & Find Hospitals
                                </>
                            )}
                        </Button>
                    </form>
                </div>
            ) : (
                <div className="grid grid-cols-5 gap-6 items-start">
                    {/* Hospital List */}
                    <div className="col-span-2">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="font-semibold text-slate-900">Recommended</h2>
                            <button
                                onClick={() => setStep("input")}
                                className="text-sm text-slate-500 hover:text-slate-900"
                            >
                                New Search
                            </button>
                        </div>

                        <div className="max-h-[700px] overflow-y-auto space-y-3 pr-2">
                            {registeredPatient?.matched_hospitals && registeredPatient.matched_hospitals.length > 0 ? (
                                registeredPatient.matched_hospitals.map((hospital) => (
                                <div
                                    key={hospital.hospital_id}
                                    onClick={() => handleHospitalClick(hospital)}
                                    className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="font-semibold text-slate-900">{hospital.name}</h3>
                                            <p className="text-sm text-slate-500 mt-0.5">{hospital.address || "Address not available"}</p>
                                        </div>
                                        {hospital.ml_score && (
                                            <span className="text-sm font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                                                {(hospital.ml_score / 1000).toFixed(1)}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                                        {hospital.distance_km && (
                                            <span className="flex items-center gap-1">
                                                <MapPin className="size-3.5" />
                                                {hospital.distance_km.toFixed(1)} km
                                            </span>
                                        )}
                                        {hospital.estimated_time_minutes && (
                                            <span className="flex items-center gap-1">
                                                <Clock className="size-3.5" />
                                                {hospital.estimated_time_minutes} min
                                            </span>
                                        )}
                                        {hospital.total_beds && (
                                            <span className="text-emerald-600 font-medium">
                                                {hospital.total_beds} beds
                                            </span>
                                        )}
                                    </div>

                                    {hospital.recommendation_reason && (
                                        <div className="mb-4">
                                            <p className="text-xs text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg">
                                                {hospital.recommendation_reason}
                                            </p>
                                        </div>
                                    )}

                                    {hospital.has_trauma_center && (
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-lg font-medium">
                                                Trauma Center
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        <Button
                                            className="flex-1 h-10 bg-slate-900 hover:bg-slate-800 rounded-xl text-sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSendRequest(hospital.hospital_id);
                                            }}
                                        >
                                            Send Request
                                            <ChevronRight className="size-4 ml-1" />
                                        </Button>
                                        {hospital.address && (
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-10 w-10 rounded-xl border-slate-200"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const destination = encodeURIComponent(hospital.address || hospital.name);
                                                    const origin = currentLocation
                                                        ? `${currentLocation.lat},${currentLocation.lng}`
                                                        : "";
                                                    const url = origin
                                                        ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`
                                                        : `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
                                                    window.open(url, "_blank");
                                                }}
                                                title="Navigate with Google Maps"
                                            >
                                                <Navigation className="size-4 text-blue-600" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                ))
                            ) : (
                                <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center">
                                    <p className="text-slate-500">No hospitals found. Please try again.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Map */}
                    <div className="col-span-3 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden relative h-[700px]">
                        <MapContainer
                            center={currentLocation ? [currentLocation.lat, currentLocation.lng] : [37.7649, -122.4394]}
                            zoom={13}
                            className="h-full"
                            style={{ height: "100%" }}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <MapUpdater center={mapCenter} />

                            {/* Current Location Marker */}
                            {currentLocation && (
                                <Marker
                                    position={[currentLocation.lat, currentLocation.lng]}
                                    icon={currentLocationIcon}
                                >
                                    <Popup>
                                        <div className="p-1">
                                            <h3 className="font-semibold text-blue-600">Current Location</h3>
                                            <p className="text-sm text-slate-500">
                                                {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
                                            </p>
                                        </div>
                                    </Popup>
                                </Marker>
                            )}

                            {/* Hospital Markers */}
                            {registeredPatient?.matched_hospitals?.map((hospital) => {
                                if (hospital.latitude == null || hospital.longitude == null) return null;

                                return (
                                    <Marker
                                        key={hospital.hospital_id}
                                        position={[hospital.latitude, hospital.longitude]}
                                        icon={hospitalIcon}
                                        eventHandlers={{
                                            click: () => handleHospitalClick(hospital),
                                        }}
                                    >
                                        <Popup>
                                            <div className="p-1 min-w-[200px]">
                                                <div className="flex items-start justify-between mb-2">
                                                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                                                        <Building2 className="size-4 text-emerald-600" />
                                                        {hospital.name}
                                                    </h3>
                                                    {hospital.ml_score && (
                                                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                                            {(hospital.ml_score / 1000).toFixed(1)}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 mb-2">{hospital.address}</p>
                                                <div className="flex gap-2 text-xs">
                                                    {hospital.distance_km && (
                                                        <span className="text-slate-600">
                                                            {hospital.distance_km.toFixed(1)} km
                                                        </span>
                                                    )}
                                                    {hospital.estimated_time_minutes && (
                                                        <span className="text-slate-600">
                                                            {hospital.estimated_time_minutes} min
                                                        </span>
                                                    )}
                                                    {hospital.total_beds && (
                                                        <span className="text-emerald-600 font-medium">
                                                            {hospital.total_beds} beds
                                                        </span>
                                                    )}
                                                </div>
                                                {hospital.has_trauma_center && (
                                                    <div className="mt-2">
                                                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">
                                                            Trauma Center
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </Popup>
                                    </Marker>
                                );
                            })}
                        </MapContainer>
                        <LocationControl
                            onLocate={handleLocate}
                            onTestLocate={handleTestLocate}
                            isLocating={isLocating}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default DispatchPage;
