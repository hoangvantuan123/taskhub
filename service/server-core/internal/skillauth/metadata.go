package skillauth

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"io"
	"strings"
)

func (s *Server) ipIndex(ip string) string {
	h := hmac.New(sha256.New, s.HistoryKey)
	h.Write([]byte(ip))
	return "h1:" + base64.RawStdEncoding.EncodeToString(h.Sum(nil))
}

func seal(key []byte, plain string) (string, error) {
	block, e := aes.NewCipher(key)
	if e != nil {
		return "", e
	}
	g, e := cipher.NewGCM(block)
	if e != nil {
		return "", e
	}
	nonce := make([]byte, g.NonceSize())
	if _, e = io.ReadFull(rand.Reader, nonce); e != nil {
		return "", e
	}
	return "enc1:" + base64.RawStdEncoding.EncodeToString(g.Seal(nonce, nonce, []byte(plain), []byte("skillhub-login-metadata-v1"))), nil
}
func openMetadata(key []byte, value string) (string, error) {
	if !strings.HasPrefix(value, "enc1:") {
		return "", fmt.Errorf("unencrypted metadata")
	}
	data, e := base64.RawStdEncoding.DecodeString(strings.TrimPrefix(value, "enc1:"))
	if e != nil {
		return "", e
	}
	b, e := aes.NewCipher(key)
	if e != nil {
		return "", e
	}
	g, e := cipher.NewGCM(b)
	if e != nil {
		return "", e
	}
	if len(data) < g.NonceSize() {
		return "", fmt.Errorf("invalid ciphertext")
	}
	plain, e := g.Open(nil, data[:g.NonceSize()], data[g.NonceSize():], []byte("skillhub-login-metadata-v1"))
	return string(plain), e
}

// Encrypt existing metadata in one transaction; never leave a partly migrated row.
func (s *Server) MigrateMetadata(ctx context.Context) error {
	tx, e := s.DB.BeginTxx(ctx, nil)
	if e != nil {
		return e
	}
	defer tx.Rollback()
	for _, table := range []string{`"_USRLoginLog"`, `"_USRSession"`} {
		condition := `"Ip" NOT LIKE 'enc1:%'`
		if table == `"_USRLoginLog"` {
			condition += ` OR "IpKey" IS NULL OR "IpKey" NOT LIKE 'h1:%'`
		}
		rows, e := tx.QueryContext(ctx, `SELECT "Id"::text,"Ip","UserAgent" FROM `+table+` WHERE `+condition)
		if e != nil {
			return e
		}
		type record struct{ id, ip, ua string }
		records := []record{}
		for rows.Next() {
			var r record
			if e = rows.Scan(&r.id, &r.ip, &r.ua); e != nil {
				rows.Close()
				return e
			}
			records = append(records, r)
		}
		e = rows.Err()
		rows.Close()
		if e != nil {
			return e
		}
		for _, r := range records {
			if strings.HasPrefix(r.ip, "enc1:") {
				r.ip, e = openMetadata(s.HistoryKey, r.ip)
				if e != nil {
					return e
				}
				r.ua, e = openMetadata(s.HistoryKey, r.ua)
				if e != nil {
					return e
				}
			}
			ip, e := seal(s.HistoryKey, r.ip)
			if e != nil {
				return e
			}
			ua, e := seal(s.HistoryKey, r.ua)
			if e != nil {
				return e
			}
			query := `UPDATE ` + table + ` SET "Ip"=$2,"UserAgent"=$3 WHERE "Id"::text=$1`
			args := []any{r.id, ip, ua}
			if table == `"_USRLoginLog"` {
				query = `UPDATE "_USRLoginLog" SET "Ip"=$2,"UserAgent"=$3,"IpKey"=$4 WHERE "Id"::text=$1`
				args = append(args, s.ipIndex(r.ip))
			}
			if _, e = tx.ExecContext(ctx, query, args...); e != nil {
				return e
			}
		}
	}
	return tx.Commit()
}
