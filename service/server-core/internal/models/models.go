package models

import (
	"time"
)

// ErpConfig defines system ERP connection profiles
type ErpConfig struct {
	Id                 int       `gorm:"column:Id;primaryKey;autoIncrement" json:"id"`
	ConfigKey          string    `gorm:"column:ConfigKey;uniqueIndex;not null" json:"config_key"`
	ConfigName         string    `gorm:"column:ConfigName" json:"config_name"`
	Provider           string    `gorm:"column:Provider" json:"provider"`
	AuthUrl            string    `gorm:"column:AuthUrl" json:"auth_url"`
	BaseApiUrl         string    `gorm:"column:BaseApiUrl" json:"base_api_url"`
	Referer            string    `gorm:"column:Referer" json:"referer"`
	ClientId           string    `gorm:"column:ClientId" json:"client_id"`
	ClientSecret       string    `gorm:"column:ClientSecret" json:"client_secret"`
	DeviceCode         string    `gorm:"column:DeviceCode" json:"device_code"`
	ConnectionName     string    `gorm:"column:ConnectionName" json:"connection_name"`
	GrantType          string    `gorm:"column:GrantType" json:"grant_type"`
	Scope              string    `gorm:"column:Scope" json:"scope"`
	InsecureSkipVerify bool      `gorm:"column:InsecureSkipVerify" json:"insecure_skip_verify"`
	ExtraParams        string    `gorm:"column:ExtraParams" json:"extra_params"`
	IsActive           bool      `gorm:"column:IsActive;default:true" json:"is_active"`
	CreatedAt          time.Time `gorm:"column:CreatedAt" json:"created_at"`
	UpdatedAt          time.Time `gorm:"column:UpdatedAt" json:"updated_at"`
}

// TableName overrides the default table name for ErpConfig
func (ErpConfig) TableName() string {
	return "_DATAHUB_ErpConfig"
}

// ErpEndpoint defines dynamic API query definitions
type ErpEndpoint struct {
	Id          int       `gorm:"column:Id;primaryKey;autoIncrement" json:"id"`
	ConfigKey   string    `gorm:"column:ConfigKey;index" json:"config_key"`
	EndpointKey string    `gorm:"column:EndpointKey;uniqueIndex;not null" json:"endpoint_key"`
	Endpoint    string    `gorm:"column:Endpoint;not null" json:"endpoint"`
	Stn         string    `gorm:"column:Stn" json:"stn"`
	San         string    `gorm:"column:San" json:"san"`
	Alc         string    `gorm:"column:Alc" json:"alc"`
	Ndcn        string    `gorm:"column:Ndcn" json:"ndcn"`
	Nocn        string    `gorm:"column:Nocn" json:"nocn"`
	Necn        string    `gorm:"column:Necn" json:"necn"`
	Nrcn        string    `gorm:"column:Nrcn" json:"nrcn"`
	Fields      string    `gorm:"column:Fields" json:"fields"`
	Description string    `gorm:"column:Description" json:"description"`
	IsActive    bool      `gorm:"column:IsActive;default:true" json:"is_active"`
	CreatedAt   time.Time `gorm:"column:CreatedAt" json:"created_at"`
	UpdatedAt   time.Time `gorm:"column:UpdatedAt" json:"updated_at"`
}

// TableName overrides the default table name for ErpEndpoint
func (ErpEndpoint) TableName() string {
	return "_DATAHUB_ErpEndpoint"
}

// AuditLog tracks external API proxy and auth events
type AuditLog struct {
	Id             int64     `gorm:"column:Id;primaryKey;autoIncrement" json:"id"`
	TraceId        string    `gorm:"column:TraceId;index" json:"trace_id"`
	ConfigKey      string    `gorm:"column:ConfigKey;index" json:"config_key"`
	Username       string    `gorm:"column:Username;index" json:"username"`
	Method         string    `gorm:"column:Method" json:"method"`
	Endpoint       string    `gorm:"column:Endpoint" json:"endpoint"`
	TargetUrl      string    `gorm:"column:TargetUrl" json:"target_url"`
	StatusCode     int       `gorm:"column:StatusCode" json:"status_code"`
	LatencyMs      int64     `gorm:"column:LatencyMs" json:"latency_ms"`
	ClientIp       string    `gorm:"column:ClientIp" json:"client_ip"`
	UserAgent      string    `gorm:"column:UserAgent" json:"user_agent"`
	RequestPayload string    `gorm:"column:RequestPayload" json:"request_payload"`
	ResponseBrief  string    `gorm:"column:ResponseBrief" json:"response_brief"`
	ErrorMessage   string    `gorm:"column:ErrorMessage" json:"error_message"`
	CreatedAt      time.Time `gorm:"column:CreatedAt;default:CURRENT_TIMESTAMP" json:"created_at"`
}

// TableName overrides the default table name for AuditLog
func (AuditLog) TableName() string {
	return "_DATAHUB_AuditLog"
}

// TokenSession caches authenticated user tokens
type TokenSession struct {
	Id           int64     `gorm:"column:Id;primaryKey;autoIncrement" json:"id"`
	ConfigKey    string    `gorm:"column:ConfigKey;index" json:"config_key"`
	Username     string    `gorm:"column:Username;index" json:"username"`
	AccessToken  string    `gorm:"column:AccessToken" json:"access_token"`
	TokenType    string    `gorm:"column:TokenType" json:"token_type"`
	RefreshToken string    `gorm:"column:RefreshToken" json:"refresh_token"`
	ExpiresIn    int       `gorm:"column:ExpiresIn" json:"expires_in"`
	ExpiresAt    time.Time `gorm:"column:ExpiresAt;index" json:"expires_at"`
	Scope        string    `gorm:"column:Scope" json:"scope"`
	RawResponse  string    `gorm:"column:RawResponse" json:"raw_response"`
	CreatedAt    time.Time `gorm:"column:CreatedAt" json:"created_at"`
	UpdatedAt    time.Time `gorm:"column:UpdatedAt" json:"updated_at"`
}

// TableName overrides the default table name for TokenSession
func (TokenSession) TableName() string {
	return "_DATAHUB_TokenSession"
}

// BravoOAuthTokenResponse represents Bravo OAuth2 token response
type BravoOAuthTokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	Scope        string `json:"scope"`
	Error        string `json:"error"`
	ErrorDesc    string `json:"error_description"`
}

// LoginRequest defines login payload
type LoginRequest struct {
	ConfigKey string `json:"config_key"`
	Username  string `json:"username"`
	Password  string `json:"password"`
}

// LoginResponse defines login output
type LoginResponse struct {
	Success      bool          `json:"success"`
	ConfigKey    string        `json:"config_key"`
	Username     string        `json:"username"`
	AccessToken  string        `json:"access_token"`
	RefreshToken string        `json:"refresh_token"`
	TokenType    string        `json:"token_type"`
	ExpiresIn    int           `json:"expires_in"`
	ExpiresAt    string        `json:"expires_at"`
	Scope        string        `json:"scope"`
	TokenSession *TokenSession `json:"token_session,omitempty"`
}

// ProxyForwardRequest defines ERP request proxying payload
type ProxyForwardRequest struct {
	ConfigKey string            `json:"config_key"`
	Username  string            `json:"username"`
	Method    string            `json:"method"`
	Path      string            `json:"path"`
	Headers   map[string]string `json:"headers"`
	Params    map[string]string `json:"params"`
	Body      interface{}       `json:"body"`
}

// ApiResponse represents unified API response wrapper
type ApiResponse struct {
	Success bool                   `json:"success"`
	Data    interface{}            `json:"data"`
	Meta    map[string]interface{} `json:"meta"`
}

// FactoryRequest represents factory catalog query payload
type FactoryRequest struct {
	ConfigKey   string `json:"config_key"`
	Username    string `json:"username"`
	Token       string `json:"token"`
	FiscalYear  string `json:"fiscal_year"`
	BranchCode  string `json:"branch_code"`
	EndpointKey string `json:"endpoint_key"`
	ApiKey      string `json:"api_key"`
	MenuKey     string `json:"menu_key"`
	Endpoint    string `json:"endpoint"`
}

// OrderSettlementFlatItem represents an order settlement row
type OrderSettlementFlatItem struct {
	ID                    string  `json:"id"`
	WorkingTag            string  `json:"working_tag"`
	StageOrderNo          string  `json:"stage_order_no"`
	ItemCode              string  `json:"item_code"`
	ItemName              string  `json:"item_name"`
	Unit                  string  `json:"unit"`
	DoRequiredQty         float64 `json:"do_required_qty"`
	InitialAdjustQty      float64 `json:"initial_adjust_qty"`
	AdjustedRequiredQty   float64 `json:"adjusted_required_qty"`
	WasteCompensationQty  float64 `json:"waste_compensation_qty"`
	ProductionRequiredQty float64 `json:"production_required_qty"`
	IsSettled             bool    `json:"is_settled"`
	SettlementQty         float64 `json:"settlement_qty"`
	DetailNo              string  `json:"detail_no"`
	BuiltinOrder          int     `json:"builtin_order"`
	WorkStepTypeCode      string  `json:"work_step_type_code"`
	OperationCode         string  `json:"operation_code"`
	OperationName         string  `json:"operation_name"`
	MachineCode           string  `json:"machine_code"`
	MachineName           string  `json:"machine_name"`
	PlannedAchievedQty    float64 `json:"planned_achieved_qty"`
	PlannedProductionQty  float64 `json:"planned_production_qty"`
	StatAchievedQty       float64 `json:"stat_achieved_qty"`
	StatProductionQty     float64 `json:"stat_production_qty"`
	WarehouseReceiptQty   float64 `json:"warehouse_receipt_qty"`
	Status                string  `json:"status"`
	SettledDate           string  `json:"settled_date"`
	Notes                 string  `json:"notes"`
	FactoryName           string  `json:"factory_name"`
	BranchCode            string  `json:"branch_code"`
	EmployeeName          string  `json:"employee_name"`
	DeptName              string  `json:"dept_name"`
	ShiftCode             string  `json:"shift_code"`
	StartTime             string  `json:"start_time"`
	EndTime               string  `json:"end_time"`
	DurationTime          float64 `json:"duration_time"`
	QuantityError         float64 `json:"quantity_error"`
	ItemStructureName     string  `json:"item_structure_name"`
	QTCN                  string  `json:"qtcn"`
}

// OrderSettlementRequest defines order settlement query parameters
type OrderSettlementRequest struct {
	ConfigKey     string      `json:"config_key"`
	Username      string      `json:"username"`
	Token         string      `json:"token"`
	FiscalYear    string      `json:"fiscal_year"`
	BranchCode    string      `json:"branch_code"`
	FromDate      string      `json:"from_date"`
	ToDate        string      `json:"to_date"`
	UserId        interface{} `json:"user_id"`
	LangId        interface{} `json:"lang_id"`
	FactoryId     interface{} `json:"factory_id"`
	FactoryIdTT   interface{} `json:"factory_id_tt"`
	Stt_LTT       string      `json:"stt_ltt"`
	ItemId        interface{} `json:"item_id"`
	DeptId        interface{} `json:"dept_id"`
	StageOrderNo  string      `json:"stage_order_no"`
	ItemCode      string      `json:"item_code"`
	ItemName      string      `json:"item_name"`
	OperationCode string      `json:"operation_code"`
	Status        string      `json:"status"`
	FactoryName   string      `json:"factory_name"`
	Page          int         `json:"page"`
	PageSize      int         `json:"page_size"`
}

// OrderSettlementResponse represents order settlement query output
type OrderSettlementResponse struct {
	Items      []OrderSettlementFlatItem `json:"items"`
	TotalCount int                       `json:"total_count"`
	Page       int                       `json:"page"`
	PageSize   int                       `json:"page_size"`
	HasMore    bool                      `json:"has_more"`
	Latency    int64                     `json:"latency"`
}

// WorkProcessDetail maps child detail rows
type WorkProcessDetail struct {
	Detail map[string]interface{}   `json:"detail"`
	Steps  []map[string]interface{} `json:"steps"`
}

// WorkProcessItem contains Master and associated Details
type WorkProcessItem struct {
	Master  map[string]interface{} `json:"master"`
	Details []WorkProcessDetail    `json:"details"`
}

// WorkProcessRequest defines work process query parameters
type WorkProcessRequest struct {
	ConfigKey       string                 `json:"config_key"`
	Username        string                 `json:"username"`
	Token           string                 `json:"token"`
	FiscalYear      string                 `json:"fiscal_year"`
	BranchCode      string                 `json:"branch_code"`
	DocNo           string                 `json:"doc_no"`
	StageOrderNo    string                 `json:"stage_order_no"`
	WorkProcessCode string                 `json:"work_process_code"`
	ProductTypeName string                 `json:"product_type_name"`
	FactoryName     string                 `json:"factory_name"`
	CustomerName    string                 `json:"customer_name"`
	Description     string                 `json:"description"`
	ItemCode        string                 `json:"item_code"`
	ItemCodes       []string               `json:"item_codes"`
	ItemName        string                 `json:"item_name"`
	ItemNames       []string               `json:"item_names"`
	Unit            string                 `json:"unit"`
	EndpointKey     string                 `json:"endpoint_key"`
	ApiKey          string                 `json:"api_key"`
	MenuKey         string                 `json:"menu_key"`
	Endpoint        string                 `json:"endpoint"`
	Page            int                    `json:"page"`
	PageSize        int                    `json:"page_size"`
	IncludeRaw      bool                   `json:"include_raw"`
	ColumnFilters   map[string]interface{} `json:"column_filters"`
	RawSSE          []interface{}          `json:"raw_sse"`
}

// WorkProcessResult defines the aggregated work process result
type WorkProcessResult struct {
	DocNo       string                 `json:"doc_no"`
	TotalMaster int                    `json:"total_master"`
	TotalDetail int                    `json:"total_detail"`
	TotalSteps  int                    `json:"total_steps"`
	TotalCount  int                    `json:"total_count"`
	Page        int                    `json:"page"`
	PageSize    int                    `json:"page_size"`
	HasMore     bool                   `json:"has_more"`
	Data        []WorkProcessItem      `json:"data"`
	Raw         map[string]interface{} `json:"raw,omitempty"`
}
