package queryspec

import (
	"encoding/json"
	"fmt"
	"github.com/google/uuid"
	"sort"
	"strconv"
	"strings"
	"time"
)

type Filter struct {
	Column string `json:"column"`
	Op     string `json:"op"`
	Values []any  `json:"values"`
}
type Sort struct {
	Column    string `json:"column"`
	Direction string `json:"direction"`
}
type Request struct {
	Page          int      `json:"page"`
	PageSize      int      `json:"page_size"`
	Search        []string `json:"search"`
	SearchColumns []string `json:"search_columns"`
	Filters       []Filter `json:"filters"`
	Sort          []Sort   `json:"sort"`
}
type Column struct {
	SQL        string
	Searchable bool
	SearchSQL  string
	Type       string
}
type Plan struct {
	Where  string
	Order  string
	Args   []any
	Limit  int
	Offset int
	Page   int
}

func EscapeLike(s string) string {
	return strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(s)
}
func Build(r Request, columns map[string]Column, identity string) (Plan, error) {
	p := Plan{Page: r.Page, Limit: r.PageSize, Args: []any{}}
	if p.Page == 0 {
		p.Page = 1
	}
	if p.Limit == 0 {
		p.Limit = 25
	}
	if p.Page < 1 || p.Page > 100000 || p.Limit < 1 || p.Limit > 200 || len(r.Filters) > 20 || len(r.Search) > 20 || len(r.Sort) > 5 {
		return p, fmt.Errorf("query limits exceeded")
	}
	p.Offset = (p.Page - 1) * p.Limit
	bind := func(v any) string { p.Args = append(p.Args, v); return fmt.Sprintf("$%d", len(p.Args)) }
	conditions := []string{}
	searchColumns := append([]string{}, r.SearchColumns...)
	if len(searchColumns) == 0 {
		for name, c := range columns {
			if c.Searchable {
				searchColumns = append(searchColumns, name)
			}
		}
	}
	if len(searchColumns) > 20 {
		return p, fmt.Errorf("too many search columns")
	}
	// Sort default search columns for deterministic SQL and reusable plans.
	sort.Strings(searchColumns)
	for _, name := range searchColumns {
		c, ok := columns[name]
		if !ok || !c.Searchable {
			return p, fmt.Errorf("column cannot be searched: %s", name)
		}
	}
	searches := []string{}
	for _, term := range r.Search {
		term = strings.TrimSpace(term)
		if term == "" {
			continue
		}
		if len(term) > 256 {
			return p, fmt.Errorf("search value too long")
		}
		parts := []string{}
		for _, name := range searchColumns {
			c := columns[name]
			field := c.SQL
			value := term
			operator := " ILIKE "
			if c.SearchSQL != "" {
				field = c.SearchSQL
				value = NormalizeSearch(value)
				operator = " LIKE "
			}
			parts = append(parts, field+operator+bind("%"+EscapeLike(value)+"%")+` ESCAPE '\'`)
		}
		if len(parts) > 0 {
			searches = append(searches, "("+strings.Join(parts, " OR ")+")")
		}
	}
	if len(searches) > 0 {
		conditions = append(conditions, "("+strings.Join(searches, " OR ")+")")
	}
	for _, f := range r.Filters {
		c, ok := columns[f.Column]
		if !ok {
			return p, fmt.Errorf("unknown filter column: %s", f.Column)
		}
		if len(f.Values) > 100 {
			return p, fmt.Errorf("too many filter values")
		}
		op := strings.ToLower(f.Op)
		if op == "is_null" || op == "not_null" {
			if len(f.Values) != 0 {
				return p, fmt.Errorf("null filter takes no values")
			}
			suffix := " IS NULL"
			if op == "not_null" {
				suffix = " IS NOT NULL"
			}
			conditions = append(conditions, c.SQL+suffix)
			continue
		}
		if len(f.Values) == 0 {
			return p, fmt.Errorf("filter needs values")
		}
		for _, v := range f.Values {
			switch c.Type {
			case "integer":
				valid := false
				switch n := v.(type) {
				case string:
					_, err := strconv.ParseInt(n, 10, 64)
					valid = err == nil
				case float64:
					valid = n == float64(int64(n))
				case json.Number:
					_, err := n.Int64()
					valid = err == nil
				case int, int64:
					valid = true
				}
				if !valid {
					return p, fmt.Errorf("integer required")
				}
			case "timestamp":
				value, ok := v.(string)
				if !ok {
					return p, fmt.Errorf("timestamp required")
				}
				if _, err := time.Parse(time.RFC3339Nano, value); err != nil {
					return p, fmt.Errorf("invalid timestamp")
				}
			case "bool":
				if _, ok := v.(bool); !ok {
					return p, fmt.Errorf("boolean required")
				}
			case "text", "uuid":
				if _, ok := v.(string); !ok {
					return p, fmt.Errorf("string required")
				}
				if c.Type == "uuid" {
					if _, err := uuid.Parse(v.(string)); err != nil {
						return p, fmt.Errorf("invalid UUID")
					}
				}
			default:
				return p, fmt.Errorf("unsupported column type")
			}
		}
		if op == "in" || op == "not_in" {
			args := []string{}
			for _, v := range f.Values {
				args = append(args, bind(v))
			}
			sqlOp := " IN "
			if op == "not_in" {
				sqlOp = " NOT IN "
			}
			conditions = append(conditions, c.SQL+sqlOp+"("+strings.Join(args, ",")+")")
			continue
		}
		if len(f.Values) != 1 {
			return p, fmt.Errorf("operator needs one value")
		}
		operators := map[string]string{"eq": " = ", "neq": " <> ", "gt": " > ", "gte": " >= ", "lt": " < ", "lte": " <= "}
		if sqlOp, ok := operators[op]; ok {
			conditions = append(conditions, c.SQL+sqlOp+bind(f.Values[0]))
			continue
		}
		if (op == "contains" || op == "prefix") && c.Type == "text" {
			value := f.Values[0].(string)
			field, operator := c.SQL, " ILIKE "
			if c.SearchSQL != "" {
				value = NormalizeSearch(value)
				field = c.SearchSQL
				operator = " LIKE "
			}
			v := EscapeLike(value) + "%"
			if op == "contains" {
				v = "%" + v
			}
			conditions = append(conditions, field+operator+bind(v)+` ESCAPE '\'`)
			continue
		}
		return p, fmt.Errorf("unsupported filter operator: %s", op)
	}
	orders := []string{}
	seen := map[string]bool{}
	for _, s := range r.Sort {
		c, ok := columns[s.Column]
		if !ok {
			return p, fmt.Errorf("unknown sort column")
		}
		dir := strings.ToUpper(s.Direction)
		if dir == "" {
			dir = "ASC"
		}
		if dir != "ASC" && dir != "DESC" {
			return p, fmt.Errorf("invalid sort direction")
		}
		if seen[s.Column] {
			return p, fmt.Errorf("duplicate sort column")
		}
		seen[s.Column] = true
		orders = append(orders, c.SQL+" "+dir)
	}
	id, ok := columns[identity]
	if !ok {
		return p, fmt.Errorf("identity missing")
	}
	if !seen[identity] {
		orders = append(orders, id.SQL+" ASC")
	}
	p.Order = strings.Join(orders, ", ")
	p.Where = "TRUE"
	if len(conditions) > 0 {
		p.Where = strings.Join(conditions, " AND ")
	}
	return p, nil
}
