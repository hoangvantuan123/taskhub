package skillauth

import "time"

type RowAuditFields struct {
	IdSeq         string    `json:"IdSeq"`
	CreatedBy     string    `json:"CreatedBy"`
	UpdatedBy     string    `json:"UpdatedBy"`
	CreatedByName string    `json:"CreatedByName"`
	UpdatedByName string    `json:"UpdatedByName"`
	CreatedAt     time.Time `json:"CreatedAt"`
	UpdatedAt     time.Time `json:"UpdatedAt"`
	RowVersion    string    `json:"RowVersion"`
	AuditOrigin   string    `json:"AuditOrigin"`
}

func auditJSON(alias string) string {
	if alias != "" {
		alias += "."
	}
	return `jsonb_build_object('IdSeq',` + alias + `"IdSeq",'CreatedBy',` + alias + `"CreatedBy",'UpdatedBy',` + alias + `"UpdatedBy",'CreatedByName',COALESCE((SELECT COALESCE(creator."Name",creator."Username") FROM "_SYSActorDirectory" actor LEFT JOIN "_USRAccountDirectory" creator ON creator."IdSeq"=actor."AccountSeq" WHERE actor."IdSeq"=` + alias + `"CreatedBy"),'Hệ thống'),'UpdatedByName',COALESCE((SELECT COALESCE(updater."Name",updater."Username") FROM "_SYSActorDirectory" actor LEFT JOIN "_USRAccountDirectory" updater ON updater."IdSeq"=actor."AccountSeq" WHERE actor."IdSeq"=` + alias + `"UpdatedBy"),'Hệ thống'),'CreatedAt',` + alias + `"CreatedAt",'UpdatedAt',` + alias + `"UpdatedAt",'RowVersion',` + alias + `"RowVersion"::text,'AuditOrigin',` + alias + `"AuditOrigin")`
}
