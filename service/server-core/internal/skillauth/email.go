package skillauth

import (
	"crypto/rand"
	"crypto/subtle"
	"fmt"
	"net/smtp"
	"os"
	"strings"
)

func newApprovalOTP() (string, error) {
	b := make([]byte, 4)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	n := (uint32(b[0])<<24 | uint32(b[1])<<16 | uint32(b[2])<<8 | uint32(b[3])) % 1000000
	return fmt.Sprintf("%06d", n), nil
}

func approvalOTPMatches(code, expected string) bool {
	actual := digest(code)
	return subtle.ConstantTimeCompare([]byte(actual), []byte(expected)) == 1
}

// SMTP settings are supplied by the deployment environment. Passwords are never
// stored in the account database or included in notification messages.
func sendAccountEmail(to, subject, body string) error {
	addr := strings.TrimSpace(os.Getenv("SKILLHUB_SMTP_ADDR"))
	from := strings.TrimSpace(os.Getenv("SKILLHUB_SMTP_FROM"))
	user := os.Getenv("SKILLHUB_SMTP_USER")
	password := os.Getenv("SKILLHUB_SMTP_PASSWORD")
	if addr == "" || from == "" {
		return fmt.Errorf("SMTP is not configured")
	}
	host := addr
	if i := strings.LastIndex(addr, ":"); i > -1 {
		host = addr[:i]
	}
	var auth smtp.Auth
	if user != "" {
		auth = smtp.PlainAuth("", user, password, host)
	}
	message := "From: " + from + "\r\nTo: " + to + "\r\nSubject: " + subject + "\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n" + body
	return smtp.SendMail(addr, auth, from, []string{to}, []byte(message))
}
