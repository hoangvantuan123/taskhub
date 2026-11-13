package skillauth

import (
	"regexp"
	"testing"
)

func TestApprovalOTPFormatAndMatching(t *testing.T) {
	code, err := newApprovalOTP()
	if err != nil {
		t.Fatal(err)
	}
	if !regexp.MustCompile(`^[0-9]{6}$`).MatchString(code) {
		t.Fatalf("unexpected OTP format %q", code)
	}
	if !approvalOTPMatches(code, digest(code)) {
		t.Fatal("generated code did not match its digest")
	}
	if approvalOTPMatches("000000", digest("different")) {
		t.Fatal("incorrect OTP matched")
	}
}

func TestSendAccountEmailRequiresSMTPConfiguration(t *testing.T) {
	t.Setenv("SKILLHUB_SMTP_ADDR", "")
	t.Setenv("SKILLHUB_SMTP_FROM", "")
	if err := sendAccountEmail("user@example.com", "test", "test"); err == nil {
		t.Fatal("email sent without SMTP configuration")
	}
}
