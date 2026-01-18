// PulseRoute API Types
// 응급환자 이송 매칭 시스템 API 타입 정의

// ============ Common ============

export interface LocationSchema {
  latitude: number;
  longitude: number;
}

export interface VitalSignsSchema {
  blood_pressure?: string | null;
  pulse?: number | null;
  temperature?: number | null;
}

export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export interface HTTPValidationError {
  detail?: ValidationError[];
}

// ============ Auth ============

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  user_type: string;
  user_name: string;
}

// ============ Patient ============

export interface MatchedHospitalSchema {
  hospital_id: string;
  name: string;
  address?: string | null;
  ml_score?: number | null;
  distance_km?: number | null;
  estimated_time_minutes?: number | null;
  recommendation_reason?: string | null;
  total_beds?: number | null;
  has_trauma_center?: boolean | null;
}

export interface PatientRegisterRequest {
  name: string;
  age: number;
  gender: string;
  disease_code: string;
  severity_code: string;
  location: LocationSchema;
  vital_signs?: VitalSignsSchema | null;
}

export interface PatientResponse {
  id: string;
  name: string;
  age: number;
  gender: string;
  disease_code: string;
  severity_code: string;
  location: LocationSchema;
  vital_signs?: VitalSignsSchema | null;
  status: string;
  ems_unit_id: string;
  created_at: string;
  matched_hospitals?: MatchedHospitalSchema[] | null;
}

export interface PatientRequestsResponse {
  patient_id: string;
  patient_name: string;
  status: string;
  requests: TransferRequestResponse[];
}

export interface PatientListResponse {
  patients: PatientResponse[];
  total: number;
}

// ============ Transfer Request ============

export interface TransferRequestCreateRequest {
  hospital_id: string;
  hospital_name: string;
  hospital_address?: string | null;
  ml_score?: number | null;
  distance_km?: number | null;
  estimated_time_minutes?: number | null;
  recommendation_reason?: string | null;
  total_beds?: number | null;
  has_trauma_center?: boolean | null;
}

export interface TransferRequestResponse {
  id: string;
  patient_id: string;
  ems_unit_id: string;
  hospital_id: string;
  hospital_name?: string | null;
  hospital_address?: string | null;
  status: string;
  ml_score?: number | null;
  distance_km?: number | null;
  estimated_time_minutes?: number | null;
  recommendation_reason?: string | null;
  total_beds?: number | null;
  has_trauma_center?: boolean | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransferRequestUpdateRequest {
  status: string;
  rejection_reason?: string | null;
}

// ============ Chat ============

export interface ChatMessageSchema {
  id: string;
  room_id: string;
  sender_id: string;
  sender_type: string;
  message: string;
  timestamp: string;
  is_read: boolean;
}

export interface ChatRoomDetailSchema {
  id: string;
  patient_id: string;
  ems_unit_id: string;
  hospital_id: string;
  created_at: string;
  is_active: boolean;
  latest_messages: ChatMessageSchema[];
}

// ============ History ============

export interface HistoryParams {
  days?: number;
  severity_code?: string;
  page?: number;
  limit?: number;
}

// ============ Health ============

export interface HealthCheckResponse {
  status: string;
}
