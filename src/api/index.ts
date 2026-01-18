import apiClient from './client';
import type {
  LoginRequest,
  LoginResponse,
  PatientRegisterRequest,
  PatientResponse,
  PatientRequestsResponse,
  PatientListResponse,
  TransferRequestCreateRequest,
  TransferRequestResponse,
  TransferRequestUpdateRequest,
  ChatRoomDetailSchema,
  ChatMessageSchema,
  HistoryParams,
  HealthCheckResponse,
} from './types';

// ============ Auth API ============

export const authApi = {
  /**
   * 사용자 로그인
   */
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/api/auth/login', data);
    // 토큰 저장
    localStorage.setItem('access_token', response.data.access_token);
    return response.data;
  },

  /**
   * 로그아웃
   */
  logout: () => {
    localStorage.removeItem('access_token');
  },
};

// ============ Patient API ============

export const patientApi = {
  /**
   * 활성 환자 목록 조회 (transferred 제외)
   */
  getPatients: async (): Promise<PatientListResponse> => {
    const response = await apiClient.get<PatientListResponse>('/api/patients');
    return response.data;
  },

  /**
   * 환자 등록 및 자동 병원 매칭
   */
  register: async (data: PatientRegisterRequest): Promise<PatientResponse> => {
    const response = await apiClient.post<PatientResponse>('/api/patients', data);
    return response.data;
  },

  /**
   * 환자의 요청 상태 조회
   */
  getRequests: async (patientId: string): Promise<PatientRequestsResponse> => {
    const response = await apiClient.get<PatientRequestsResponse>(
      `/api/patients/${patientId}/requests`
    );
    return response.data;
  },

  /**
   * ML 매칭 재시도 (status가 searching인 환자만 가능)
   */
  retryMatch: async (patientId: string): Promise<PatientResponse> => {
    const response = await apiClient.post<PatientResponse>(
      `/api/patients/${patientId}/retry-match`
    );
    return response.data;
  },

  /**
   * 특정 병원에 이송 요청 생성
   */
  createTransferRequest: async (
    patientId: string,
    data: TransferRequestCreateRequest
  ): Promise<TransferRequestResponse> => {
    const response = await apiClient.post<TransferRequestResponse>(
      `/api/patients/${patientId}/request`,
      data
    );
    return response.data;
  },

  /**
   * 환자 이송 완료 처리
   */
  completeTransfer: async (patientId: string): Promise<PatientResponse> => {
    const response = await apiClient.post<PatientResponse>(
      `/api/patients/${patientId}/complete`
    );
    return response.data;
  },
};

// ============ Hospital API ============

export const hospitalApi = {
  /**
   * 대기중인 이송 요청 목록 조회
   */
  getPendingRequests: async (): Promise<TransferRequestResponse[]> => {
    const response = await apiClient.get<TransferRequestResponse[]>(
      '/api/hospitals/requests/pending'
    );
    return response.data;
  },
};

// ============ Request API ============

export const requestApi = {
  /**
   * 이송 요청 수락
   */
  accept: async (requestId: string): Promise<TransferRequestResponse> => {
    const response = await apiClient.post<TransferRequestResponse>(
      `/api/requests/${requestId}/accept`
    );
    return response.data;
  },

  /**
   * 이송 요청 거부
   */
  reject: async (
    requestId: string,
    data: TransferRequestUpdateRequest
  ): Promise<TransferRequestResponse> => {
    const response = await apiClient.post<TransferRequestResponse>(
      `/api/requests/${requestId}/reject`,
      data
    );
    return response.data;
  },
};

// ============ History API ============

export const historyApi = {
  /**
   * 완료된 이송 기록 조회
   */
  getHistory: async (params?: HistoryParams) => {
    const response = await apiClient.get('/api/history', { params });
    return response.data;
  },

  /**
   * 환자 이송 타임라인 조회
   */
  getPatientTimeline: async (patientId: string) => {
    const response = await apiClient.get(`/api/history/${patientId}/timeline`);
    return response.data;
  },
};

// ============ Chat API ============

export const chatApi = {
  /**
   * 채팅방 목록 조회
   */
  getRooms: async (): Promise<ChatRoomDetailSchema[]> => {
    const response = await apiClient.get<ChatRoomDetailSchema[]>('/api/chat/rooms');
    return response.data;
  },

  /**
   * 채팅방 메시지 히스토리 조회
   */
  getMessages: async (roomId: string, limit?: number): Promise<ChatMessageSchema[]> => {
    const response = await apiClient.get<ChatMessageSchema[]>(
      `/api/chat/rooms/${roomId}/messages`,
      { params: { limit } }
    );
    return response.data;
  },
};

// ============ Health API ============

export const healthApi = {
  /**
   * 서버 헬스체크
   */
  check: async (): Promise<HealthCheckResponse> => {
    const response = await apiClient.get<HealthCheckResponse>('/health');
    return response.data;
  },
};

// Re-export types
export * from './types';
export { apiClient };
