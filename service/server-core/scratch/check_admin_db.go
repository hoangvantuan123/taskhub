package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/url"
	"os"

	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

type AdminUser struct {
	Id       string `db:"Id"`
	IdSeq    string `db:"IdSeq"`
	Username string `db:"Username"`
	Name     string `db:"Name"`
	Role     string `db:"Role"`
	Enabled  bool   `db:"Enabled"`
}

type ModuleInfo struct {
	Key     string `db:"Key"`
	Label   string `db:"Label"`
	Actions string `db:"Actions"`
	Enabled bool   `db:"Enabled"`
}

func main() {
	_ = godotenv.Load(".env")
	user := os.Getenv("POSTGRES_USER")
	pass := os.Getenv("POSTGRES_PASSWORD")
	port := os.Getenv("POSTGRES_PORT")
	if port == "" {
		port = "5432"
	}
	dbName := os.Getenv("POSTGRES_DB")
	if dbName == "" {
		dbName = "skillhub"
	}

	conn := &url.URL{
		Scheme:   "postgres",
		User:     url.UserPassword(user, pass),
		Host:     net.JoinHostPort("localhost", port),
		Path:     dbName,
		RawQuery: "sslmode=disable",
	}

	db, err := sqlx.Connect("postgres", conn.String())
	if err != nil {
		log.Fatalf("❌ Không thể kết nối cơ sở dữ liệu PostgreSQL: %v\n", err)
	}
	defer db.Close()
	ctx := context.Background()

	fmt.Println("====================================================")
	fmt.Println("🔍 KIỂM TRA PHÂN QUYỀN TÀI KHOẢN ADMIN TRONG DATABASE")
	fmt.Println("====================================================")

	// 1. Danh sách tài khoản admin
	var admins []AdminUser
	err = db.SelectContext(ctx, &admins, `SELECT "Id", "IdSeq", "Username", "Name", "Role", "Enabled" FROM "_USRAccountDirectory" WHERE "Role"='admin'`)
	if err != nil {
		log.Fatalf("Lỗi truy vấn tài khoản admin: %v\n", err)
	}
	fmt.Printf("✅ Số tài khoản Admin trong DB: %d\n", len(admins))
	for _, a := range admins {
		fmt.Printf("   - [%s] %s (Id: %s, Enabled: %v)\n", a.Username, a.Name, a.Id, a.Enabled)
	}

	// 2. Danh sách tất cả Module và Actions
	var modules []ModuleInfo
	err = db.SelectContext(ctx, &modules, `SELECT "Key", "Label", "Actions"::text, "Enabled" FROM "_SECPermissionDirectory" ORDER BY "Key"`)
	if err != nil {
		log.Fatalf("Lỗi truy vấn modules: %v\n", err)
	}
	fmt.Printf("\n✅ Tổng số Modules đã đăng ký trong DB: %d\n", len(modules))

	totalActions := 0
	type PermPair struct {
		Module string
		Action string
	}
	var allPerms []PermPair

	for _, m := range modules {
		var acts []string
		_ = json.Unmarshal([]byte(m.Actions), &acts)
		totalActions += len(acts)
		for _, a := range acts {
			allPerms = append(allPerms, PermPair{Module: m.Key, Action: a})
		}
		fmt.Printf("   • %-18s (%-25s): %v\n", m.Key, m.Label, acts)
	}
	fmt.Printf("   => Tổng cộng: %d permissions\n", totalActions)

	// 3. Kiểm tra và GÁN ĐẦY ĐỦ QUYỀN TRONG DB cho từng Admin
	fmt.Println("\n🔹 Đồng bộ phân quyền trực tiếp vào bảng _SECAccountPermission...")
	tx, err := db.BeginTxx(ctx, nil)
	if err != nil {
		log.Fatalf("Lỗi khởi tạo transaction: %v\n", err)
	}
	defer tx.Rollback()

	insertedTotal := 0
	for _, a := range admins {
		userInserted := 0
		for _, p := range allPerms {
			res, err := tx.ExecContext(ctx, `
				INSERT INTO "_SECAccountPermission"("UserId", "ModuleKey", "Action")
				VALUES ($1, $2, $3)
				ON CONFLICT DO NOTHING
			`, a.Id, p.Module, p.Action)
			if err != nil {
				log.Fatalf("Lỗi gán quyền %s:%s cho user %s: %v\n", p.Module, p.Action, a.Username, err)
			}
			n, _ := res.RowsAffected()
			if n > 0 {
				userInserted++
				insertedTotal++
			}
		}

		var countInDb int
		_ = tx.GetContext(ctx, &countInDb, `SELECT count(*) FROM "_SECAccountPermission" WHERE "UserId"=$1`, a.Id)
		fmt.Printf("   ✅ Tài khoản [%s]: Đã có %d / %d quyền trong bảng _SECAccountPermission (Vừa thêm mới: %d)\n",
			a.Username, countInDb, totalActions, userInserted)
	}

	if err := tx.Commit(); err != nil {
		log.Fatalf("Lỗi commit transaction: %v\n", err)
	}

	// 4. Kiểm tra nhóm quyền admin_full
	_, _ = db.ExecContext(ctx, `
		INSERT INTO "_SECGroupDirectory"("Key", "Label", "Description")
		VALUES ('admin_full', 'Quản trị viên toàn quyền hệ thống', 'Sở hữu toàn bộ quyền quản trị 17 module')
		ON CONFLICT DO NOTHING
	`)
	for _, p := range allPerms {
		_, _ = db.ExecContext(ctx, `
			INSERT INTO "_SECGroupPermission"("GroupKey", "ModuleKey", "Action")
			VALUES ('admin_full', $1, $2)
			ON CONFLICT DO NOTHING
		`, p.Module, p.Action)
	}

	// Gán admin vào nhóm admin_full trong _SECGroupMember
	for _, a := range admins {
		_, _ = db.ExecContext(ctx, `
			INSERT INTO "_SECGroupMember"("GroupKey", "UserId")
			VALUES ('admin_full', $1)
			ON CONFLICT DO NOTHING
		`, a.Id)
	}

	fmt.Println("\n====================================================")
	fmt.Printf("🎉 HOÀN TẤT ĐỒNG BỘ: Đã nạp đầy đủ %d quyền cho các tài khoản Admin vào DB!\n", totalActions)
	fmt.Println("====================================================")
}

