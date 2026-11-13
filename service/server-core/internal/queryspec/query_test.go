package queryspec

import (
	"reflect"
	"strings"
	"testing"
)

var fields = map[string]Column{"IdSeq": {SQL: `d."IdSeq"`, Type: "uuid"}, "label": {SQL: "d.label", Type: "text", Searchable: true}, "key": {SQL: "d.key", Type: "text", Searchable: true}, "enabled": {SQL: "d.enabled", Type: "bool"}}

func TestBoundSearchAndMultiValueFilters(t *testing.T) {
	attack := `x' OR TRUE; DROP TABLE users;--`
	p, e := Build(Request{Search: []string{attack, "50%_"}, Filters: []Filter{{Column: "key", Op: "in", Values: []any{"a", "b"}}, {Column: "enabled", Op: "eq", Values: []any{true}}}, Page: 2, PageSize: 10}, fields, "IdSeq")
	if e != nil {
		t.Fatal(e)
	}
	if strings.Contains(p.Where, attack) || strings.Contains(p.Where, "50%") {
		t.Fatal("values interpolated")
	}
	if p.Offset != 10 || p.Limit != 10 || !strings.Contains(p.Order, `d."IdSeq" ASC`) {
		t.Fatalf("bad plan %#v", p)
	}
	if len(p.Args) != 7 {
		t.Fatal(p.Args)
	}
	if !strings.Contains(p.Args[2].(string), `50\%\_`) {
		t.Fatal(p.Args)
	}
}
func TestRejectInvalidClientIdentifiersAndLimits(t *testing.T) {
	cases := []Request{{Filters: []Filter{{Column: "label;DROP", Op: "eq", Values: []any{"a"}}}}, {Sort: []Sort{{Column: "label", Direction: "desc;drop"}}}, {SearchColumns: []string{"password_hash"}, Search: []string{"a"}}, {Filters: []Filter{{Column: "enabled", Op: "eq", Values: []any{"false"}}}}, {Filters: []Filter{{Column: "IdSeq", Op: "eq", Values: []any{"invalid"}}}}, {Filters: []Filter{{Column: "label", Op: "eq", Values: []any{"a", "b"}}}}, {Filters: []Filter{{Column: "label", Op: "sql", Values: []any{"a"}}}}, {PageSize: 201}, {Page: -1}}
	for _, r := range cases {
		if _, e := Build(r, fields, "IdSeq"); e == nil {
			t.Fatalf("accepted %#v", r)
		}
	}
}
func TestSearchColumnsDoNotMutateCaller(t *testing.T) {
	c := []string{"label", "key"}
	if _, e := Build(Request{SearchColumns: c}, fields, "IdSeq"); e != nil {
		t.Fatal(e)
	}
	if !reflect.DeepEqual(c, []string{"label", "key"}) {
		t.Fatal(c)
	}
}
func TestEmptyAndLiteralWildcardSearch(t *testing.T) {
	p, e := Build(Request{}, fields, "IdSeq")
	if e != nil || p.Where != "TRUE" || p.Page != 1 || p.Limit != 25 {
		t.Fatalf("%#v %v", p, e)
	}
	p, e = Build(Request{Filters: []Filter{{Column: "label", Op: "contains", Values: []any{"100%_"}}}}, fields, "IdSeq")
	if e != nil || p.Args[0] != `%100\%\_%` {
		t.Fatalf("%#v %v", p, e)
	}
}
func TestVietnameseSearch(t *testing.T) {
	columns := map[string]Column{"IdSeq": fields["IdSeq"], "label": {SQL: "d.label", SearchSQL: `"_SYSNormalizeSearch"(d.label)`, Type: "text", Searchable: true}}
	p, e := Build(Request{Search: []string{"BIÊN SOẠN"}}, columns, "IdSeq")
	if e != nil || p.Args[0] != "%bien soan%" || !strings.Contains(p.Where, " LIKE ") {
		t.Fatal(p, e)
	}
	if NormalizeSearch("Đặng Nguyễn") != "dang nguyen" {
		t.Fatal("Vietnamese folding")
	}
}
